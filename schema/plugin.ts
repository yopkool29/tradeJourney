import { z } from 'zod'

export const TJPluginManifestSchema = z.object({
	id: z.string(),
	name: z.string(),
	version: z.string(),
	description: z.string(),
})

export type TJPluginManifestType = z.output<typeof TJPluginManifestSchema>
