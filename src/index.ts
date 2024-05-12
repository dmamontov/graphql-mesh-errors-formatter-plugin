// eslint-disable-next-line import/namespace,import/no-extraneous-dependencies
import { constantCase } from 'change-case';
import { GraphQLError } from 'graphql';
import { useApolloServerErrors } from '@envelop/apollo-server-errors';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { type MeshPlugin, type MeshPluginOptions } from '@graphql-mesh/types';
import { type ErrorsFormatterConfig } from './types';
import { convertType, modifyError } from './utils';

export default function useErrorsFormatter(
    options: MeshPluginOptions<ErrorsFormatterConfig>,
): MeshPlugin<any> {
    const enabled =
        typeof options.enabled === 'string'
            ? stringInterpolator.parse(options.enabled, { env: process.env }) === 'true'
            : options.enabled;

    if (!enabled) {
        return {};
    }

    return {
        onPluginInit({ addPlugin }) {
            addPlugin(useApolloServerErrors());
        },
        onFetch() {
            return async ({ response }) => {
                if (response.status >= 400) {
                    const body = await response.text();
                    let message = response.statusText;
                    let context: Record<string, any>;

                    try {
                        context = JSON.parse(body);
                    } catch {
                        if (body && body.length > 0) {
                            message = body;
                        }

                        context = {
                            message,
                        };
                    }

                    throw new GraphQLError(message, {
                        extensions: {
                            code: constantCase(response.statusText),
                            context,
                        },
                    });
                }
            };
        },
        onDelegate(payload) {
            const source = options.sources.find(
                source =>
                    source.sourceName === payload.sourceName &&
                    source.typeName === payload.typeName &&
                    source.fields.includes(payload.fieldName),
            );

            return ({ result, setResult }) => {
                if (!(result instanceof GraphQLError)) {
                    return;
                }

                let newError = result;

                const match = newError.message.match(/^(\d+)\s([A-Z_]+):\s(.*)$/);
                if (match) {
                    newError = modifyError(newError, match[3], {
                        ...newError?.extensions,
                        code: match[2],
                    });
                }

                if (source?.formatters) {
                    for (const formatter of source.formatters) {
                        if (newError?.extensions?.context) {
                            const originalContext: any = newError.extensions.context;
                            if (
                                formatter.messageKey &&
                                Object.keys(originalContext).includes(formatter.messageKey)
                            ) {
                                newError = modifyError(
                                    newError,
                                    originalContext[formatter.messageKey],
                                    newError.extensions,
                                );
                            }

                            if (
                                formatter.codeKey &&
                                Object.keys(originalContext).includes(formatter.codeKey)
                            ) {
                                newError = modifyError(newError, newError.message, {
                                    ...newError?.extensions,
                                    code: originalContext[formatter.codeKey],
                                });
                            }
                        }

                        const match = newError.message.match(new RegExp(formatter.match));
                        if (!match) {
                            continue;
                        }

                        const replacer = (str: string): string => {
                            return str.replaceAll(/\$(\d+)/g, (fullMatch, number) => {
                                return match[number] || fullMatch;
                            });
                        };

                        let newMessage = newError.message;
                        if (formatter.message) {
                            newMessage = replacer(formatter.message);
                        }

                        const extensions: Record<string, any> = newError.extensions;
                        if (formatter.code) {
                            extensions.code = formatter.code;
                        }

                        if (formatter.context) {
                            const context = Object.assign({}, formatter.context);

                            for (const key in context) {
                                if (typeof context[key] === 'string') {
                                    context[key] = convertType(replacer(context[key]));
                                }
                            }

                            extensions.context = {
                                ...extensions?.context,
                                context,
                            };
                        }

                        newError = modifyError(newError, newMessage, extensions);
                    }
                }

                if (newError.extensions) {
                    newError = modifyError(
                        newError,
                        newError.message,
                        Object.keys(newError.extensions).reduce(
                            (newObj: Record<string, any>, key) => {
                                if (['code', 'context'].includes(key)) {
                                    newObj[key] = newError.extensions[key];
                                }
                                return newObj;
                            },
                            {},
                        ),
                    );
                }

                setResult(newError);
            };
        },
    };
}
