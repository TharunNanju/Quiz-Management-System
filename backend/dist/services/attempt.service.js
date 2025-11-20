import { createAttempt, getAttemptById, listResponsesForAttempt, recordResponse, submitAttempt } from '../repositories/attempt.repository.js';
import { getQuizWithQuestions } from '../repositories/quiz.repository.js';
import { withTransaction } from '../utils/db.js';
export const startAttempt = async (studentId, quizId) => {
    return createAttempt(studentId, quizId);
};
export const submitAttemptWithResponses = async (attemptId, responses) => {
    return withTransaction(async (conn) => {
        for (const response of responses) {
            await recordResponse(attemptId, response.questionId, {
                selectedOptionId: response.selectedOptionId ?? null,
                responseText: response.responseText ?? null
            }, conn);
        }
        const attempt = await submitAttempt(attemptId, conn);
        return attempt;
    });
};
export const getAttemptDetail = async (attemptId) => {
    const attempt = await getAttemptById(attemptId);
    if (!attempt)
        return null;
    const responses = await listResponsesForAttempt(attemptId);
    const quiz = await getQuizWithQuestions(attempt.quizId);
    return { attempt, responses, quiz };
};
