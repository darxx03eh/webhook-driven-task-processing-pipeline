import axios from "axios";

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError(error)) {
        const apiMessage = (error.response?.data as { message?: string } | undefined)?.message;
        return apiMessage ?? fallback;
    }

    return fallback;
};
