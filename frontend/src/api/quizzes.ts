import { api, type ApiResponse } from './client';
import type {
  Quiz,
  QuizDetail,
  QuizAnalytics,
  QuestionType,
  Assignment,
  Question
} from '../types/quiz';

export interface ListQuizParams {
  category?: string;
}

export interface CreateQuizPayload {
  title: string;
  description?: string | null;
  category?: string | null;
  timeLimit: number;
  startTime?: string | null;
  endTime?: string | null;
  published?: boolean;
}

export interface QuestionOptionInput {
  optionText: string;
  isCorrect: boolean;
  feedback?: string | null;
}

export interface AddQuestionPayload {
  questionType: QuestionType;
  questionText: string;
  points: number;
  difficulty?: string | null;
  tags?: string | null;
  options?: QuestionOptionInput[];
}

export interface AssignQuizPayload {
  studentId?: number;
  studentEmail?: string;
  dueDate?: string | null;
}

export const listQuizzes = async (params?: ListQuizParams): Promise<Quiz[]> => {
  const response = await api.get<ApiResponse<Quiz[]>>('/quizzes', { params });
  return response.data.data;
};

export const createQuiz = async (payload: CreateQuizPayload): Promise<Quiz> => {
  const response = await api.post<ApiResponse<Quiz>>('/quizzes', payload);
  return response.data.data;
};

export const getQuiz = async (quizId: number): Promise<QuizDetail> => {
  const response = await api.get<ApiResponse<QuizDetail>>(`/quizzes/${quizId}`);
  return response.data.data;
};

export const addQuestion = async (quizId: number, payload: AddQuestionPayload): Promise<Question> => {
  const response = await api.post<ApiResponse<Question>>(`/quizzes/${quizId}/questions`, payload);
  return response.data.data;
};

export const togglePublish = async (quizId: number, published: boolean): Promise<void> => {
  await api.patch<ApiResponse<{ quizId: number; published: boolean }>>(`/quizzes/${quizId}/publish`, {
    published
  });
};

export const assignQuiz = async (quizId: number, payload: AssignQuizPayload): Promise<Assignment> => {
  const response = await api.post<ApiResponse<Assignment>>(`/quizzes/${quizId}/assignments`, payload);
  return response.data.data;
};

export const getQuizAnalytics = async (quizId: number): Promise<QuizAnalytics> => {
  const response = await api.get<ApiResponse<QuizAnalytics>>(`/quizzes/${quizId}/analytics`);
  return response.data.data;
};
