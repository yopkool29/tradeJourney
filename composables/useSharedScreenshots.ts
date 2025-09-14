import { useState } from '#app'
import { useTrades } from './useTrades'

// Interface pour représenter un screenshot (nouveau ou existant)
export interface ScreenshotItem {
    id?: number
    url: string
    file?: File
    isNew: boolean
}

// Créer un état partagé pour les screenshots
export function useSharedScreenshots(maxScreenshots = 3) {
    // Utiliser useState pour créer un état partagé
    const screenshots = useState<ScreenshotItem[]>('screenshots', () => [])
    const initialScreenshotIds = useState<number[]>('initialScreenshotIds', () => [])
    const { uploadMultipleScreenshots } = useTrades()
    
    // Ajouter un nouveau screenshot à partir d'un fichier
    const addScreenshot = (file: File) => {
        if (screenshots.value.length >= maxScreenshots) {
            return false
        }
        
        const url = URL.createObjectURL(file)
        screenshots.value.push({
            url,
            file,
            isNew: true
        })
        
        return true
    }
    
    // Gérer l'upload de fichiers depuis un input
    const handleFileUpload = (event: Event) => {
        const input = event.target as HTMLInputElement
        if (!input.files || input.files.length === 0) return
        
        const remainingSlots = maxScreenshots - screenshots.value.length
        if (remainingSlots <= 0) return
        
        const filesToAdd = Array.from(input.files).slice(0, remainingSlots)
        
        filesToAdd.forEach(file => {
            addScreenshot(file)
        })
        
        // Réinitialiser l'input pour permettre de sélectionner à nouveau les mêmes fichiers
        // input.value = ''
    }
    
    // Supprimer un screenshot par son index
    const removeScreenshot = (index: number) => {
        const screenshot = screenshots.value[index]
        
        // Si c'est un nouveau screenshot avec une URL d'objet, libérer la ressource
        if (screenshot.isNew && screenshot.url.startsWith('blob:')) {
            URL.revokeObjectURL(screenshot.url)
        }
        
        screenshots.value.splice(index, 1)
    }
    
    // Initialiser avec des screenshots existants
    const initializeScreenshots = (existingScreenshots: { id: number, url: string }[]) => {
        // Nettoyer les screenshots existants
        screenshots.value.forEach(s => {
            if (s.isNew && s.url.startsWith('blob:')) {
                URL.revokeObjectURL(s.url)
            }
        })
        
        // Réinitialiser les tableaux
        screenshots.value = []
        initialScreenshotIds.value = []
        
        // Ajouter les screenshots existants
        if (existingScreenshots && existingScreenshots.length > 0) {
            existingScreenshots.forEach(s => {
                screenshots.value.push({
                    id: s.id,
                    url: s.url,
                    isNew: false
                })
                initialScreenshotIds.value.push(s.id)
            })
        }
    }
    
    // Nettoyer les ressources lors de la destruction du composant
    const cleanup = () => {
        screenshots.value.forEach(screenshot => {
            if (screenshot.isNew && screenshot.url.startsWith('blob:')) {
                URL.revokeObjectURL(screenshot.url)
            }
        })
        screenshots.value = []
        initialScreenshotIds.value = []
    }
    
    // Préparer les données pour la mise à jour d'un trade
    const prepareForUpdate = () => {
        // Extraire les screenshots existants à conserver
        return screenshots.value
            .filter(s => !s.isNew && s.id !== undefined)
            .map(s => ({ id: s.id as number, url: s.url }))
    }
    
    // Uploader les nouveaux screenshots après création/mise à jour d'un trade
    const uploadNewScreenshots = async (tradeId: number) => {
        const newFiles = screenshots.value
            .filter(s => s.isNew && s.file)
            .map(s => s.file!)
        
        if (newFiles.length > 0) {
            await uploadMultipleScreenshots(tradeId, newFiles)
        }
    }
    
    return {
        screenshots,
        initialScreenshotIds,
        addScreenshot,
        handleFileUpload,
        removeScreenshot,
        initializeScreenshots,
        cleanup,
        prepareForUpdate,
        uploadNewScreenshots,
        maxScreenshots
    }
}
