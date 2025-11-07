import { addQuestionSchema, assignQuizSchema, createQuizSchema, publishQuizSchema } from '../validators/quiz.validator.js';
import { addQuestionToQuiz, assignQuiz, createQuizForTeacher, getQuizAnalytics, getQuizDetail, listQuizzesForUser, publishQuiz } from '../services/quiz.service.js';
export const createQuiz = async (req, res) => {
    const payload = createQuizSchema.parse({
        ...req.body,
        timeLimit: Number(req.body.timeLimit)
    });
    const quiz = await createQuizForTeacher(req.user.id, payload);
    res.status(201).json({ status: 'success', data: quiz });
};
export const listQuizzes = async (req, res) => {
    const { category } = req.query;
    const quizzes = await listQuizzesForUser({
        userId: req.user.id,
        role: req.user.role,
        category: category ?? undefined
    });
    res.json({ status: 'success', data: quizzes });
};
export const getQuiz = async (req, res) => {
    const quizId = Number(req.params.quizId || req.params.id);
    const quiz = await getQuizDetail(quizId);
    if (!quiz) {
        return res.status(404).json({ status: 'error', message: 'Quiz not found' });
    }
    res.json({ status: 'success', data: quiz });
};
export const addQuestion = async (req, res) => {
    const quizId = Number(req.params.quizId || req.params.id);
    const payload = addQuestionSchema.parse({
        ...req.body,
        points: Number(req.body.points)
    });
    const question = await addQuestionToQuiz({ ...payload, quizId });
    res.status(201).json({ status: 'success', data: question });
};
export const togglePublish = async (req, res) => {
    const quizId = Number(req.params.quizId || req.params.id);
    const { published } = publishQuizSchema.parse(req.body);
    await publishQuiz(quizId, published);
    res.json({ status: 'success', data: { quizId, published } });
};
export const assign = async (req, res) => {
    const quizId = Number(req.params.quizId || req.params.id);
    const payload = assignQuizSchema.parse({
        studentId: Number(req.body.studentId),
        dueDate: req.body.dueDate ?? null
    });
    const assignment = await assignQuiz(quizId, payload.studentId, payload.dueDate ? new Date(payload.dueDate) : null);
    res.status(201).json({ status: 'success', data: assignment });
};
export const analytics = async (req, res) => {
    const quizId = Number(req.params.quizId || req.params.id);
    const data = await getQuizAnalytics(quizId);
    res.json({ status: 'success', data });
};
