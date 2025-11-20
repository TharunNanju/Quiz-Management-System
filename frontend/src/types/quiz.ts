import type { UserRole } from './auth';

export interface Quiz {
  quizId: number;
  creatorId: number;
  title: string;
  description: string | null;
  category: string | null;
  timeLimit: number;
  startTime: string | null;
  endTime: string | null;
  published: boolean;
  createdAt: string;
}

export type QuestionType = 'mcq' | 'short_answer' | 'true_false';

export interface Question {
  questionId: number;
  quizId: number;
  questionType: QuestionType;
  questionText: string;
  points: number;
  difficulty: string | null;
  tags: string | null;
}

export interface Option {
  optionId: number;
  questionId: number;
  optionText: string;
  isCorrect: boolean;
  feedback: string | null;
}

export interface QuestionWithOptions extends Question {
  options: Option[];
}

export interface QuizDetail extends Quiz {
  questions: QuestionWithOptions[];
}

export interface QuizAnalytics {
  averageScore: number;
  attemptCount: number;
  completionRate: number;
}

export interface Assignment {
  assignmentId: number;
  quizId: number;
  studentId: number;
  dueDate: string | null;
  status: 'assigned' | 'completed' | 'overdue';
  createdAt: string;
}

export interface Attempt {
  attemptId: number;
  studentId: number;
  quizId: number;
  startTime: string;
  endTime: string | null;
  score: number | null;
  status: 'in_progress' | 'submitted' | 'graded';
}

export interface AttemptDetail {
  attempt: Attempt;
  quiz: QuizDetail;
  responses: ResponseRecord[];
}

export interface QuizAttemptSummary {
  attemptId: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  startTime: string;
  endTime: string | null;
  status: Attempt['status'];
  score: number | null;
}

export interface ResponseRecord {
  responseId: number;
  attemptId: number;
  questionId: number;
  selectedOptionId: number | null;
  responseText: string | null;
  isCorrect: boolean | null;
  awardedPoints: number | null;
}

export type RoleGuard = Extract<UserRole, 'student' | 'teacher' | 'admin'>;
