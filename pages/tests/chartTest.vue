<template>
    <div class="p-8">
        <h1 class="text-2xl font-bold mb-4">Chart.js Fill Test</h1>

        <div class="mb-4 flex gap-2 flex-wrap">
            <button v-for="action in actions" :key="action.name" @click="action.handler"
                class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                {{ action.name }}
            </button>
        </div>

        <div class="bg-white p-4 rounded shadow" style="height: 400px;">
            <Line ref="chartRef" :data="chartData" :options="chartOptions" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { Line } from 'vue-chartjs'
import type { ChartOptions } from 'chart.js'

const chartRef = ref()

// Génération de données aléatoires
const generateData = () => {
    const data = []
    for (let i = 0; i < 8; i++) {
        data.push(Math.floor(Math.random() * 200) - 100) // Entre -100 et 100
    }
    return data
}

const generateLabels = () => {
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']
}

// Données du graphique
const chartData = ref({
    labels: generateLabels(),
    datasets: [
        {
            label: 'Dataset',
            data: generateData(),
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            fill: false as boolean | string | number | object,
            tension: 0
        }
    ]
})

// Options du graphique
const chartOptions = ref<ChartOptions>({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: true
        },
        title: {
            display: true,
            text: () => 'Fill: ' + (chartData.value.datasets[0].fill || 'false')
        },
        filler: {
            propagate: false
        }
    },
    interaction: {
        intersect: false
    },
    scales: {
        y: {
            beginAtZero: true
        }
    }
})

// Actions pour tester différents modes de fill
const actions = [
    {
        name: 'Fill: false (default)',
        handler: () => {
            if (chartRef.value?.chart) {
                chartData.value.datasets[0].fill = false
                chartRef.value.chart.update()
            }
        }
    },
    {
        name: 'Fill: origin',
        handler: () => {
            if (chartRef.value?.chart) {
                chartData.value.datasets[0].fill = 'origin'
                chartRef.value.chart.update()
            }
        }
    },
    {
        name: 'Fill: start',
        handler: () => {
            if (chartRef.value?.chart) {
                chartData.value.datasets.forEach(x => {
                    x.fill = 'start';
                });
                // chartData.value.datasets[0].fill = 'start'
                chartRef.value.chart.update()
            }
        }
    },
    {
        name: 'Fill: end',
        handler: () => {
            if (chartRef.value?.chart) {
                chartData.value.datasets[0].fill = 'end'
                chartRef.value.chart.update()
            }
        }
    },
    {
        name: 'Randomize',
        handler: () => {
            if (chartRef.value?.chart) {
                chartData.value.datasets[0].data = generateData()
                chartRef.value.chart.update()
            }
        }
    },
    {
        name: 'Smooth',
        handler: () => {
            if (chartRef.value?.chart) {
                const currentTension = chartData.value.datasets[0].tension || 0
                chartData.value.datasets[0].tension = currentTension === 0 ? 0.4 : 0
                chartRef.value.chart.update()
            }
        }
    }
]

definePageMeta({
	middleware: (to, from) => {
		const config = useRuntimeConfig()
		if (!config.public.debugMode) {
			return navigateTo('/login')
		}
	},
})
</script>
