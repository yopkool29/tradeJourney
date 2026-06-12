declare module 'nuxt/schema' {
	interface AppConfigInput {
		charts: {
			chartjs: boolean;
			options: {
				canvasHeight: number;
				barPercentage: number;
				borderRadius: number;
				tension: number;
				pointRadius: number;
				winrate: {
					max: number;
					format: (value: number) => string;
				};
				pnlBarChart: {
					maxTrades: number;
				};
				tickerChart: {
					maxTickers: number;
				};
			};
		};
	}
}

export {};
