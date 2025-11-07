import { z } from 'zod';

export const createQuizSchema = z.object({
  title: z.string().min(3),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  timeLimit: z.number().int().positive(),
  startTime: z.string().datetime().optional().nullable(),
  endTime: z.string().datetime().optional().nullable(),
  published: z.boolean().optional()
});

export const addQuestionSchema = z.object({
  questionType: z.enum(['mcq', 'short_answer', 'true_false']),
  questionText: z.string().min(3),
  points: z.number().int().positive(),
  difficulty: z.string().max(50).optional().nullable(),
  tags: z.string().max(255).optional().nullable(),
  options: z
    .array(
      z.object({
        optionText: z.string().min(1),
        isCorrect: z.boolean(),
        feedback: z.string().max(255).optional().nullable()
      })
    )
    .optional()
    .superRefine((opts, ctx) => {
      if (!opts) return;
      const hasCorrect = opts.some((opt) => opt.isCorrect);
      if (!hasCorrect) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one option must be correct' });
      }
    })
});

export const publishQuizSchema = z.object({
  published: z.boolean()
});

export const assignQuizSchema = z
  .object({
    studentId: z.number().int().positive().optional(),
    studentEmail: z.string().email().optional(),
    dueDate: z.string().datetime().optional().nullable()
  })
  .refine((data) => data.studentId !== undefined || data.studentEmail !== undefined, {
    message: 'Provide either studentId or studentEmail',
    path: ['studentId']
  });
