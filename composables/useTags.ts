import { z } from 'zod'
import { TagGroupSchema } from '~/schema/tagGroup'
import { TagSchema } from '~/schema/tag'

import type { TagGroupType, CreateTagGroupType, UpdateTagGroupType } from '~/schema/tagGroup'
import type { CreateTagType, UpdateTagType } from '~/schema/tag'

export interface TagStyle {
    backgroundColor: string;
    color?: string;
}

export const useTags = () => {
    const dbStateStore = useDbStateStore()
    
    const getTagStyle = (tag: { color?: string | null; dark_fg_reverse?: boolean }): TagStyle => ({
        backgroundColor: tag.color || '#333',
        ...(tag.dark_fg_reverse ? { color: '#fff' } : {})
    })

    // Charger tous les groupes et tags depuis l'API
    const fetchGroups = async () => {
        const result = await $fetch('/api/tags')

        dbStateStore.tagGroups = z.array(TagGroupSchema).parse(result)

        return dbStateStore.tagGroups
    }

    const createGroup = async (group: CreateTagGroupType) => {
        const result = await $fetch('/api/tags', {
            method: 'POST',
            body: group
        })
        await fetchGroups()
        return TagGroupSchema.parse(result)
    }

    const updateGroup = async (group: UpdateTagGroupType) => {
        const result = await $fetch(`/api/tags/${group.id}`, {
            method: 'PATCH',
            body: group
        })
        await fetchGroups()
        return TagGroupSchema.parse(result)
    }

    const deleteGroup = async (id: number, deleteAssoc: boolean = false) => {
        const result = await $fetch(`/api/tags/${id}`, {
            method: 'DELETE',
            body: { deleteAssoc }
        })
        await fetchGroups()
        return result
    }

    // Créer un tag dans un groupe
    const createTag = async (groupId: number, tag: CreateTagType) => {
        const result = await $fetch(`/api/tags/${groupId}/tags`, {
            method: 'POST',
            body: tag
        })
        await fetchGroups()
        return TagSchema.parse(result)
    }

    // Modifier un tag
    const updateTag = async (groupId: number, tagId: number, tag: UpdateTagType) => {
        const result = await $fetch(`/api/tags/${groupId}/${tagId}`, {
            method: 'PATCH',
            body: tag
        })
        await fetchGroups()
        return TagSchema.parse(result)
    }

    // Supprimer un tag
    const deleteTag = async (groupId: number, tagId: number, deleteAssoc: boolean = false) => {
        const result = await $fetch(`/api/tags/${groupId}/${tagId}`, {
            method: 'DELETE',
            body: { deleteAssoc }
        })
        await fetchGroups()
        return result
    }

    // Réordonner les groupes en mettant à jour metadata.order pour chaque groupe
    const reorderGroups = async (orderedGroups: TagGroupType[]) => {
        await Promise.all(
            orderedGroups.map((group, index) =>
                $fetch(`/api/tags/${group.id}`, {
                    method: 'PATCH',
                    body: { order: index }
                })
            )
        )
    }

    const tagGroups = computed(() => dbStateStore.tagGroups)

    return {
        tagGroups,
        getTagById: dbStateStore.getTagById,
        fetchGroups,
        createGroup,
        updateGroup,
        deleteGroup,
        createTag,
        updateTag,
        deleteTag,
        reorderGroups,
        getTagStyle
    }
}
