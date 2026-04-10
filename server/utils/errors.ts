import { createError as h3CreateError } from 'h3';
import type { H3Error } from 'h3';

export type AppErrorParams = {
    statusCode?: number
    message?: string
    error?: unknown
    tag?: string
    data?: Record<string, unknown>
}

export const extractErrorData = (error: unknown): Record<string, unknown> => {
    if (!error || typeof error !== 'object') {
        return {};
    }

    // Cas où l'erreur a une propriété data
    if ('data' in error) {
        const errorData = error.data;

        // Si data est un objet, on l'utilise directement
        if (errorData && typeof errorData === 'object') {
            // Si data contient lui-même une propriété data (double imbrication), on l'aplatit
            if ('data' in errorData && errorData.data && typeof errorData.data === 'object') {
                return { ...errorData, ...errorData.data };
            }
            return { ...errorData };
        }
    }

    return {};
}

export const createAppError = (params: AppErrorParams): H3Error => {
    const { message, data = {}, error, tag, ...rest } = params;

    // Extraire les données de l'erreur précédente en évitant les imbrications
    const errorData = extractErrorData(error);

    // Fusionner les données
    const enhancedData = { ...errorData, ...data };

    // Ajouter le tag directement au premier niveau
    if (tag) {
        enhancedData.tag = tag;
    }

    // Préserver le message d'origine dans les données
    if (error && typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
        enhancedData.originalMessage = error.message;
    }

    // Simplifier la propagation du message
    const finalMessage = message ||
        (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ?
            error.message : undefined);

    return h3CreateError({
        ...rest,
        message: finalMessage,
        data: enhancedData
    });
}