export declare function tryCatch<TData>(promise: Promise<TData>): Promise<{
    data: Awaited<TData>;
    error?: undefined;
} | {
    error: any;
    data?: undefined;
}>;
