import { z } from 'zod'
import { TagGroupSchema } from '~/schema/tagGroup'
import { TagSchema } from '~/schema/tag'

import type { TagGroupType, CreateTagGroupType, UpdateTagGroupType } from '~/schema/tagGroup'
import type { CreateTagType, UpdateTagType } from '~/schema/tag'

export interface TagStyle {
    backgroundColor: string;
    color?: string;
}

export function useTags() {
    const tagGroups = ref<TagGroupType[]>([])
    
    /**
     * Retourne le style CSS pour un tag en fonction de ses propriétés
     * @param tag Le tag contenant les propriétés color et dark_fg_reverse
     * @returns Un objet de style CSS
     */
    const getTagStyle = (tag: { color?: string | null; dark_fg_reverse?: boolean }): TagStyle => ({
        backgroundColor: tag.color || '#333',
        ...(tag.dark_fg_reverse ? { color: '#fff' } : {})
    })

    // Charger tous les groupes et tags depuis l'API
    const fetchGroups = async () => {
        const result = await $fetch('/api/tags')

        tagGroups.value = z.array(TagGroupSchema).parse(result)

        return tagGroups.value
    }

    const createGroup = async (group: CreateTagGroupType) => {
        const result = await $fetch('/api/tags', {
            method: 'POST',
            body: group
        })
        return TagGroupSchema.parse(result)
    }

    const updateGroup = async (group: UpdateTagGroupType) => {
        const result = await $fetch(`/api/tags/${group.id}`, {
            method: 'PATCH',
            body: group
        })
        return TagGroupSchema.parse(result)
    }

    const deleteGroup = async (id: number, deleteAssoc: boolean = false) => {
        return await $fetch(`/api/tags/${id}`, {
            method: 'DELETE',
            body: { deleteAssoc }
        })
    }

    // Créer un tag dans un groupe
    const createTag = async (groupId: number, tag: CreateTagType) => {
        const result = await $fetch(`/api/tags/${groupId}/tags`, {
            method: 'POST',
            body: tag
        })
        return TagSchema.parse(result)
    }

    // Modifier un tag
    const updateTag = async (groupId: number, tagId: number, tag: UpdateTagType) => {
        const result = await $fetch(`/api/tags/${groupId}/${tagId}`, {
            method: 'PATCH',
            body: tag
        })
        return TagSchema.parse(result)
    }

    // Supprimer un tag
    const deleteTag = async (groupId: number, tagId: number, deleteAssoc: boolean = false) => {
        return await $fetch(`/api/tags/${groupId}/${tagId}`, {
            method: 'DELETE',
            body: { deleteAssoc }
        })
    }

    return {
        tagGroups,
        fetchGroups,
        createGroup,
        updateGroup,
        deleteGroup,
        createTag,
        updateTag,
        deleteTag,
        getTagStyle
    }
}
