import { z } from 'zod'
import { nameFormatRefine } from './index'

// Primitives Zod réutilisables across tous les schémas

// ID numérique (entier positif)
export const idField = z.number().int().positive()

// Date acceptée en string ISO ou Date
export const dateOrStringField = z.string().or(z.date())

// Date acceptée en string ISO ou Date, transformée en Date
export const dateField = dateOrStringField.transform(val => new Date(val))

// String nullable et optionnelle
export const nullableOptionalString = z.string().nullable().optional()

// Tableau d'IDs (entiers positifs)
export const idArrayField = z.array(z.number())

// Nom avec validation de format (lettres, chiffres, _, -, espaces)
export const nameField = (min: number, max: number) => nameFormatRefine(z.string().min(min).max(max))
