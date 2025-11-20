import { z } from 'zod';
export const submitAttemptSchema = z.object({
    responses: z
        .array(z.object({
        questionId: z.number().int().positive(),
        selectedOptionId: z.number().int().positive().optional().nullable(),
        responseText: z.string().max(2000).optional().nullable()
    }))
});
