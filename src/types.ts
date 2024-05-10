export type RootType = 'Query' | 'Mutation';

export interface ErrorsFormatterConfig {
    enabled: boolean | string;
    sources: ErrorsFormatterSourcesConfig[];
}

export interface ErrorsFormatterSourcesConfig {
    sourceName: string;
    typeName: RootType;
    fields: string[];
    formatters: ErrorsFormatterSourcesFormattersConfig[];
}

export interface ErrorsFormatterSourcesFormattersConfig {
    match: string;
    message?: string;
    code?: string;
    context?: Record<string, any>;
}
