import { z } from 'zod';

export const nameFormatRefine = (schema: z.ZodString) => schema.refine(val => /^[\p{L}\p{N}_\s]+$/u.test(val), {
    params: { i18n: 'zodI18n.validation.name_format' }
})