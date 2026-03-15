import axios from "axios";

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError(error)) {
        const apiMessage = (error.response?.data as { message?: string } | undefined)?.message;
        return apiMessage ?? fallback;
    }

    return fallback;
};

const asPositiveNumber = (value: unknown): number | null => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.ceil(parsed);
};

export const getRetryAfterSeconds = (error: unknown): number | null => {
    if (!axios.isAxiosError(error)) return null;

    const headerValue = error.response?.headers?.["retry-after"];
    const retryFromHeader = asPositiveNumber(Array.isArray(headerValue) ? headerValue[0] : headerValue);
    if (retryFromHeader) return retryFromHeader;

    const detailsRetryAfter = (error.response?.data as {
        error?: {
            details?: {
                retryAfterSeconds?: number | string;
            };
        };
    } | undefined)?.error?.details?.retryAfterSeconds;

    return asPositiveNumber(detailsRetryAfter);
};

export const buildRateLimitMessage = (fallback: string, retryAfterSeconds: number | null) => {
    if (!retryAfterSeconds) return fallback;
    return `${fallback} Try again in ${retryAfterSeconds}s.`;
};
