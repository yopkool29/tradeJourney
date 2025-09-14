import type { ProviderGetImage } from '@nuxt/image';
import { createOperationsGenerator } from '#image';

const operationsGenerator = createOperationsGenerator();

export const getImage: ProviderGetImage = (
    src,
    { modifiers = {}, baseUrl } = {},
) => {


    baseUrl = `/api/image?path=${encodeURIComponent(src.toString())}`

    const operations = operationsGenerator(modifiers);

    const final =  baseUrl +  (operations ? '&' + operations : '')

    return {
        url: final,
    };
};