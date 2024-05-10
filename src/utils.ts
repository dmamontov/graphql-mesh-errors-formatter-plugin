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
