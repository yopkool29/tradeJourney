(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, global['hello-plugin'] = factory());
})(this, (function () {
	'use strict';

	const plugin = {
		id: 'hello-plugin',
		install(sdk) {
			sdk.ui.registerModal({
				id: 'hello-plugin-modal',
				title: 'Hello depuis le plugin !',
				message: 'Ce plugin a été chargé dynamiquement sans rebuild de TradeJourney.',
				onClose() {
					sdk.ui.toast.success('Hello Plugin fermé !');
				},
			});

			sdk.ui.registerAction({
				id: 'hello-plugin-open',
				label: 'Hello Plugin',
				icon: 'i-heroicons-sparkles',
				run() {
					sdk.ui.openModal('hello-plugin-modal');
				},
			});

			console.log('[hello-plugin] installed via TJ SDK');
		},
	};

	return plugin;
}));
