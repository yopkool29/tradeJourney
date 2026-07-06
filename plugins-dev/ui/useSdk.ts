import type { TJPluginSdk } from '../../type/plugin'

export const useSdk = (): TJPluginSdk => {
	const sdk = (window as unknown as { __TJ_SDK__?: TJPluginSdk }).__TJ_SDK__
	if (!sdk) {
		throw new Error('Plugin SDK not initialized. Make sure the plugin is loaded through the plugin system.')
	}
	return sdk
}
