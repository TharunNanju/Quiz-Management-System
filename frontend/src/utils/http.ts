import axios, { type AxiosError } from 'axios';

export const getErrorMessage = (error: unknown, fallback = 'Something went wrong') => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return axiosError.response?.data?.message ?? axiosError.message ?? fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};
