import { GraphQLError } from 'graphql';

export const convertType = (value?: any): any => {
    if (typeof value === 'string') {
        if (value === '') {
            return undefined;
        } else if (value === 'null') {
            return null;
        } else if (value === 'true' || value === 'false') {
            return value === 'true';
        } else if (!isNaN(Number(value))) {
            return Number(value);
        }

        return value;
    }

    return value;
};

export const modifyError = (
    original: GraphQLError,
    message: string,
    extensions?: any,
): GraphQLError => {
    return new GraphQLError(message, {
        nodes: original.nodes,
        source: original.source,
        positions: original.positions,
        path: original.path,
        extensions: extensions || {},
    });
};
