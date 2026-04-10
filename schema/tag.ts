import { z } from 'zod'
import { nameFormatRefine } from './index'

export const TagSchema = z.object({
    id: z.number(),
    name: nameFormatRefine(z.string().min(3).max(64)),
    // name: z.string().min(3).max(32),
    color: z.string().optional().nullable().transform((val) => val === null ? undefined : val),
    dark_fg_reverse: z.boolean().default(false),
    description: z.string().optional().refine(
        val => val === undefined || val === '' || val.length > 3,
        {
            params: { i18n: 'zodI18n.validation.tag.description_min' }
        }
    ),
    metadata: z.preprocess(
        val => {
            if (!val) return null;
            if (typeof val === 'string') {
                try {
                    return JSON.parse(val);
                } catch {
                    return null;
                }
            }
            return val;
        },
        z.any().nullable().optional()
    ),
})

export type TagType = z.output<typeof TagSchema>

export const CreateTagSchema = TagSchema.omit({ id: true })

export type CreateTagType = z.output<typeof CreateTagSchema>

export const UpdateTagSchema = TagSchema.partial().required({ id: true })

export type UpdateTagType = z.output<typeof UpdateTagSchema>
