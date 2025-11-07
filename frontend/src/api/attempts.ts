import { api, type ApiResponse } from './client';
import type { Attempt, AttemptDetail } from '../types/quiz';

export const startAttempt = async (quizId: number): Promise<Attempt> => {
  const response = await api.post<ApiResponse<Attempt>>(`/attempts/quiz/${quizId}`);
  return response.data.data;
};

export interface SubmitAttemptPayload {
  attemptId: number;
  responses: Array<{
    questionId: number;
    selectedOptionId?: number | null;
    responseText?: string | null;
  }>;
}

export const submitAttempt = async (payload: SubmitAttemptPayload): Promise<Attempt> => {
  const response = await api.patch<ApiResponse<Attempt>>(`/attempts/${payload.attemptId}`, {
    responses: payload.responses
  });
  return response.data.data;
};

export const getAttempt = async (attemptId: number): Promise<AttemptDetail> => {
  const response = await api.get<ApiResponse<AttemptDetail>>(`/attempts/${attemptId}`);
  return response.data.data;
};
