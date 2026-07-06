import { z } from 'zod'

export const TJPluginManifestSchema = z.object({
	id: z.string(),
	name: z.string(),
	version: z.string(),
	description: z.string(),
	isUploaded: z.boolean().optional(),
	isDev: z.boolean().optional(),
})

export type TJPluginManifestType = z.output<typeof TJPluginManifestSchema>
