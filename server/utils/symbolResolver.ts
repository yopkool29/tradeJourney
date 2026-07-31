// Helpers partagés pour la résolution de symboles et alias
// Utilisé par importService, config-symbols, account, TradingSymbols, etc.

export interface WithCustomFields {
	customFields?: Array<{ key: string; value: string | null }> | null
	aliases?: string | null
}

export interface WithMetadata {
	metadata?: unknown
	aliases?: string | null
}

// Extrait la valeur d'un customField par sa clé
export const getCustomFieldValue = (customFields: Array<{ key: string; value: string | null }> | null | undefined, key: string): string | null => {
	return customFields?.find(f => f.key === key)?.value ?? null
}

// Récupère les aliases d'une entité (symbole ou compte)
// Priorité : metadata.customFields → champ aliases CSV
export const getAliases = (entity: WithMetadata): string => {
	const metadata = entity.metadata as Record<string, unknown> | null
	const customFields = metadata?.customFields as Array<{ key: string; value: string | null }> | null | undefined
	return getCustomFieldValue(customFields, 'aliases') ?? entity.aliases ?? ''
}

// Récupère les aliases sous forme de tableau normalisé (uppercase, trim)
export const getAliasList = (entity: WithMetadata): string[] => {
	const aliasStr = getAliases(entity)
	if (!aliasStr) return []
	return aliasStr.split(',').map(a => a.trim().toUpperCase()).filter(a => a.length > 0)
}

// Vérifie si un nom correspond à un alias (exact ou wildcard avec suffixe *)
export const matchesAlias = (name: string, aliases: string[]): boolean => {
	const normalizedName = name.toUpperCase()
	if (aliases.includes(normalizedName)) return true
	return aliases.some(alias => {
		if (alias.endsWith('*')) {
			return normalizedName.startsWith(alias.slice(0, -1))
		}
		return false
	})
}
