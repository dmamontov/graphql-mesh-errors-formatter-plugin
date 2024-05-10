import { GraphQLError } from 'graphql';
import { useApolloServerErrors } from '@envelop/apollo-server-errors';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { type MeshPlugin, type MeshPluginOptions } from '@graphql-mesh/types';
import { type ErrorsFormatterConfig } from './types';
import { convertType } from './utils';

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

                let newError = Object.assign({}, result);

                const match = newError.message.match(/^(\d+)\s([A-Z_]+):\s(.*)$/);
                if (match) {
                    newError = new GraphQLError(match[3], {
                        nodes: newError.nodes,
                        source: newError.source,
                        positions: newError.positions,
                        path: newError.path,
                        extensions: {
                            ...newError.extensions,
                            code: match[2],
                        },
                    });
                }

                if (source?.formatters) {
                    for (const formatter of source.formatters) {
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

                        const extensions = newError.extensions;
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

                            extensions.context = context;
                        }

                        newError = new GraphQLError(newMessage, {
                            nodes: newError.nodes,
                            source: newError.source,
                            positions: newError.positions,
                            path: newError.path,
                            extensions,
                        });
                    }
                }

                setResult(newError);
            };
        },
    };
}
