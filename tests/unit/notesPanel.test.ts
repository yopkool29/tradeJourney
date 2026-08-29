import { describe, expect, it } from 'vitest'
import { KnownNoteMetadataSchema } from '~/schema/note'

describe('Notes panel metadata', () => {
	it('keeps AI notes compatible with standard note metadata', () => {
		expect(KnownNoteMetadataSchema.parse({ subtitle: 'Analyse IA' })).toEqual({ subtitle: 'Analyse IA' })
	})
})
