<template>
	<div class="container mx-auto px-4 py-8">
		<h1 class="text-2xl font-bold mb-6">Test ApexCharts PnL Bar Chart</h1>
		<!-- <div class="w-full" style="height: 400px;">
			<PnlBarChartApex />
		</div> -->
		<h2 class="text-xl font-bold mt-8 mb-4">Raw ApexChart</h2>
		<div class="w-full overflow-hidden">
			<apexchart
				type="bar"
				:options="rawChartOptions"
				:series="rawChartSeries"
				width="100%"
				height="400px"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import PnlBarChartApex from '~/components/dashboard/charts2/PnlBarChartApex.vue'

const dataStore = useDataStore()

// Données fictives pour tester le chart
dataStore.lastTrades = [
	{ id: 1, openDate: '2025-01-01', closeDate: '2025-01-02', symbol: 'EURUSD', type: 'buy', lot: 1, openPrice: 1.05, closePrice: 1.06, profit: 100, netProfit: 90, accountId: 1, active: true, commission: 0, swap: 0 },
	{ id: 2, openDate: '2025-01-03', closeDate: '2025-01-04', symbol: 'GBPUSD', type: 'sell', lot: 1, openPrice: 1.25, closePrice: 1.24, profit: -50, netProfit: -60, accountId: 1, active: true, commission: 0, swap: 0 },
	{ id: 3, openDate: '2025-01-05', closeDate: '2025-01-06', symbol: 'USDJPY', type: 'buy', lot: 1, openPrice: 150, closePrice: 151, profit: 200, netProfit: 180, accountId: 1, active: true, commission: 0, swap: 0 },
	{ id: 4, openDate: '2025-01-07', closeDate: '2025-01-08', symbol: 'AUDUSD', type: 'sell', lot: 1, openPrice: 0.65, closePrice: 0.64, profit: -30, netProfit: -40, accountId: 1, active: true, commission: 0, swap: 0 },
	{ id: 5, openDate: '2025-01-09', closeDate: '2025-01-10', symbol: 'EURGBP', type: 'buy', lot: 1, openPrice: 0.85, closePrice: 0.86, profit: 150, netProfit: 140, accountId: 1, active: true, commission: 0, swap: 0 },
	{ id: 6, openDate: '2025-01-11', closeDate: '2025-01-12', symbol: 'USDCAD', type: 'sell', lot: 1, openPrice: 1.35, closePrice: 1.36, profit: -80, netProfit: -90, accountId: 1, active: true, commission: 0, swap: 0 },
	{ id: 7, openDate: '2025-01-13', closeDate: '2025-01-14', symbol: 'EURJPY', type: 'buy', lot: 1, openPrice: 160, closePrice: 162, profit: 300, netProfit: 280, accountId: 1, active: true, commission: 0, swap: 0 },
	{ id: 8, openDate: '2025-01-15', closeDate: '2025-01-16', symbol: 'GBPJPY', type: 'sell', lot: 1, openPrice: 190, closePrice: 189, profit: 120, netProfit: 110, accountId: 1, active: true, commission: 0, swap: 0 },
	{ id: 9, openDate: '2025-01-17', closeDate: '2025-01-18', symbol: 'NZDUSD', type: 'buy', lot: 1, openPrice: 0.60, closePrice: 0.59, profit: -40, netProfit: -50, accountId: 1, active: true, commission: 0, swap: 0 },
	{ id: 10, openDate: '2025-01-19', closeDate: '2025-01-20', symbol: 'EURCHF', type: 'sell', lot: 1, openPrice: 0.95, closePrice: 0.96, profit: -60, netProfit: -70, accountId: 1, active: true, commission: 0, swap: 0 },
] as any

const canvasHeight = 400

const rawChartSeries = ref([{
	name: 'P&L',
	data: [
		{ x: '#1', y: 100, fillColor: '#22c55e' },
		{ x: '#2', y: -50, fillColor: '#ef4444' },
		{ x: '#3', y: 200, fillColor: '#22c55e' },
		{ x: '#4', y: -30, fillColor: '#ef4444' },
		{ x: '#5', y: 150, fillColor: '#22c55e' },
		{ x: '#6', y: -80, fillColor: '#ef4444' },
		{ x: '#7', y: 300, fillColor: '#22c55e' },
		{ x: '#8', y: 120, fillColor: '#22c55e' },
		{ x: '#9', y: -40, fillColor: '#ef4444' },
		{ x: '#10', y: -60, fillColor: '#ef4444' },
	]
}])

const rawChartOptions = ref({
	chart: {
		type: 'bar',
		height: 200,
		animations: { enabled: false },
	},
	plotOptions: {
		bar: {
			borderRadius: 4,
			borderRadiusApplication: 'end',
			columnWidth: '85%',
		}
	},
	dataLabels: { enabled: false },
	legend: { show: false },
	xaxis: {
		labels: { style: { fontSize: '10px' } },
	},
	grid: {
		padding: { bottom: 10 }
	}
})

definePageMeta({
	middleware: (to, from) => {
		const config = useRuntimeConfig()
		if (!config.public.debugMode) {
			return navigateTo('/login')
		}
	},
})
</script>
