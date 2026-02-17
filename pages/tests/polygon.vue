<template>
    <div class="container mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold mb-6">EURUSD 15min Chart</h1>
        
        <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {{ error }}
        </div>
        
        <div v-if="loading" class="text-center py-8">
            <p class="text-lg">Chargement des données...</p>
        </div>
        
        <div ref="chartContainer" class="w-full" style="height: 600px;"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { createChart, ColorType, CandlestickSeries, LineSeries, type ISeriesApi, createSeriesMarkers } from 'lightweight-charts'

const colorMode = useColorMode()
 
// Refs
const chartContainer = ref<HTMLElement | null>(null)
const loading = ref(true)
const error = ref('')

// Configuration Polygon.io
const FOREX_PAIR = 'C:EURUSD'
const EntryTime = '2025-10-14T10:00:00Z'
const ExitTime = '2025-10-15T14:00:00Z'

const isDark = computed(() => colorMode.value === 'dark')

// Protection de la page - redirection avant le rendu
definePageMeta({
    middleware: (to, from) => {
        const config = useRuntimeConfig()
        if (!config.public.debugMode) {
            return navigateTo('/')
        }
    }
})

let chart: ReturnType<typeof createChart> | null = null
let candlestickSeries: ISeriesApi<'Candlestick'> | null = null
let tradeLine: ISeriesApi<'Line'> | null = null

// Fonction pour récupérer les données de Polygon.io
async function fetchForexData() {
    try {
        loading.value = true
        error.value = ''

        const config = useRuntimeConfig()
        const POLYGON_API_KEY = config.public.polygonApiKey
        
        console.log(POLYGON_API_KEY)

        // Calculer les dates (derniers 7 jours pour avoir suffisamment de données)
        const to = new Date()
        const from = new Date()
        from.setDate(from.getDate() - 7)
        
        const fromStr = from.toISOString().split('T')[0]
        const toStr = to.toISOString().split('T')[0]
        
        // Créer une clé de cache basée sur les paramètres de la requête
        const cacheKey = `forex_${FOREX_PAIR}_${fromStr}_${toStr}_15min`
        
        // Vérifier si les données sont en cache
        const cachedData = localStorage.getItem(cacheKey)
        if (cachedData) {
            try {
                const parsed = JSON.parse(cachedData)
                // Vérifier que le cache n'est pas trop vieux (max 1 heure)
                const cacheAge = Date.now() - parsed.timestamp
                if (cacheAge < 3600000) { // 1 heure en millisecondes
                    console.log('Données chargées depuis le cache')
                    loading.value = false
                    return parsed.data
                }
            } catch (e) {
                // Cache corrompu, on continue avec la requête
                console.warn('Cache corrompu, rechargement des données')
            }
        }
        
        // URL de l'API Polygon pour les données forex
        const url = `https://api.polygon.io/v2/aggs/ticker/${FOREX_PAIR}/range/15/minute/${fromStr}/${toStr}?adjusted=true&sort=asc&limit=50000&apiKey=${POLYGON_API_KEY}`
        
        console.log('Fetching data from:', url)
        
        const response = await fetch(url)
        
        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        
        if (!data.results || data.results.length === 0) {
            throw new Error('Aucune donnée disponible pour cette période')
        }
        
        // Transformer les données pour lightweight-charts
        // Pas besoin d'ajouter de décalage, le navigateur gère automatiquement le fuseau horaire
        const chartData = data.results.map((bar: any) => ({
            time: Math.floor(bar.t / 1000), // Convertir milliseconds en secondes
            open: bar.o,
            high: bar.h,
            low: bar.l,
            close: bar.c
        }))
        
        console.log(`${chartData.length} barres chargées`)
        
        // Sauvegarder dans le cache
        try {
            localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                data: chartData
            }))
            console.log('Données mises en cache')
        } catch (e) {
            console.warn('Impossible de mettre en cache (localStorage plein?)')
        }
        
        return chartData
        
    } catch (err: any) {
        console.error('Erreur lors du chargement des données:', err)
        error.value = err.message || 'Erreur lors du chargement des données'
        return []
    } finally {
        loading.value = false
    }
}

// Fonction pour obtenir les couleurs selon le mode
function getChartColors() {
    return {
        background: isDark.value ? '#1e1e1e' : '#ffffff',
        textColor: isDark.value ? '#d1d5db' : '#333',
        gridColor: isDark.value ? '#2d2d2d' : '#e1e1e1',
        upColor: isDark.value ? '#22c55e' : '#26a69a',
        downColor: isDark.value ? '#ef4444' : '#ef5350',
        lineColor: isDark.value ? '#3b82f6' : '#2196F3',
    }
}

// Fonction pour mettre à jour les couleurs du graphique
function updateChartColors() {
    if (!chart || !candlestickSeries) return
    
    const colors = getChartColors()
    
    chart.applyOptions({
        layout: {
            background: { type: ColorType.Solid, color: colors.background },
            textColor: colors.textColor,
        },
        grid: {
            vertLines: { color: colors.gridColor },
            horzLines: { color: colors.gridColor },
        },
    })
    
    candlestickSeries.applyOptions({
        upColor: colors.upColor,
        downColor: colors.downColor,
        wickUpColor: colors.upColor,
        wickDownColor: colors.downColor,
    })
    
    // Mettre à jour la couleur de la ligne de trade si elle existe
    if (tradeLine) {
        tradeLine.applyOptions({
            color: colors.lineColor,
        })
    }
}

// Initialiser le graphique
async function initChart() {
    if (!chartContainer.value) return
    
    const colors = getChartColors()
    
    // Créer le graphique
    chart = createChart(chartContainer.value, {
        layout: {
            background: { type: ColorType.Solid, color: colors.background },
            textColor: colors.textColor,
        },
        width: chartContainer.value.clientWidth,
        height: 600,
        timeScale: {
            timeVisible: true,
            secondsVisible: false,
        },
        grid: {
            vertLines: {
                color: colors.gridColor,
            },
            horzLines: {
                color: colors.gridColor,
            },
        },
        crosshair: {
            mode: 1, // Normal crosshair mode
        },
    })
    
    // Ajouter la série de chandeliers
    candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: colors.upColor,
        downColor: colors.downColor,
        borderVisible: false,
        wickUpColor: colors.upColor,
        wickDownColor: colors.downColor,
    })
    
    // Charger les données
    const data = await fetchForexData()
    
    if (data.length > 0 && candlestickSeries) {
        candlestickSeries.setData(data)
        
        // Ajouter les marqueurs de trade avec les données réelles
        addTradeMarkers(data)
        
        // Ajouter la ligne de connexion du trade avec les données réelles
        addTradeLine(data)
        
        // Ajuster la vue pour afficher toutes les données
        chart.timeScale().fitContent()
    }
    
    // Gérer le redimensionnement
    const handleResize = () => {
        if (chart && chartContainer.value) {
            chart.applyOptions({
                width: chartContainer.value.clientWidth,
            })
        }
    }
    
    window.addEventListener('resize', handleResize)
    
    // Nettoyer l'écouteur lors du démontage
    onUnmounted(() => {
        window.removeEventListener('resize', handleResize)
        if (chart) {
            chart.remove()
        }
    })
}

// Ajouter les marqueurs de trade (achat et vente)
function addTradeMarkers(data: any[]) {
    if (!candlestickSeries || data.length < 20) return
    
    // Définir vos horaires de trade (en heure UTC)
    // Si vous voulez 10h00 affiché (UTC+2), utilisez 08:00:00Z (UTC)
    // Si vous voulez 14h00 affiché (UTC+2), utilisez 12:00:00Z (UTC)
    const entryTimestamp = Math.floor(new Date(EntryTime).getTime() / 1000)
    const exitTimestamp = Math.floor(new Date(ExitTime).getTime() / 1000)
    
    // Trouver les bougies les plus proches de ces horaires
    let entryIndex = data.findIndex(bar => bar.time >= entryTimestamp)
    let exitIndex = data.findIndex(bar => bar.time >= exitTimestamp)
    
    // Si non trouvé, utiliser des positions par défaut
    if (entryIndex === -1) entryIndex = Math.floor(data.length * 0.25)
    if (exitIndex === -1) exitIndex = Math.floor(data.length * 0.75)
    
    const entryTime = data[entryIndex].time as any
    const exitTime = data[exitIndex].time as any
    
    const markers = [
        {
            time: entryTime,
            position: 'belowBar' as const,
            color: '#2196F3',
            shape: 'arrowUp' as const,
            text: 'BUY',
        },
        {
            time: exitTime,
            position: 'aboveBar' as const,
            color: '#e91e63',
            shape: 'arrowDown' as const,
            text: 'SELL',
        },
    ]
    
    // Use createSeriesMarkers to add markers to the series
    createSeriesMarkers(candlestickSeries, markers)
}

// Ajouter une ligne pour connecter les deux points du trade
function addTradeLine(data: any[]) {
    if (!chart || !candlestickSeries || data.length < 20) return
    
    // Utiliser les mêmes horaires que les marqueurs (en heure UTC)
    const entryTimestamp = Math.floor(new Date(EntryTime).getTime() / 1000)
    const exitTimestamp = Math.floor(new Date(ExitTime).getTime() / 1000)
    
    // Trouver les bougies les plus proches de ces horaires
    let entryIndex = data.findIndex(bar => bar.time >= entryTimestamp)
    let exitIndex = data.findIndex(bar => bar.time >= exitTimestamp)
    
    // Si non trouvé, utiliser des positions par défaut
    if (entryIndex === -1) entryIndex = Math.floor(data.length * 0.25)
    if (exitIndex === -1) exitIndex = Math.floor(data.length * 0.75)
    
    // S'assurer que les deux index sont différents
    if (entryIndex === exitIndex) {
        exitIndex = Math.min(entryIndex + 1, data.length - 1)
    }
    
    const entryTime = data[entryIndex].time as any
    const exitTime = data[exitIndex].time as any
    
    // Vérifier que les timestamps sont différents (requis par lightweight-charts)
    if (entryTime === exitTime) {
        console.warn('Les timestamps d\'entrée et de sortie sont identiques, ligne non tracée')
        return
    }
    
    // Utiliser les prix réels des données
    const entryPrice = data[entryIndex].close
    const exitPrice = data[exitIndex].close
    
    // Créer une série de ligne pour connecter les deux points
    const colors = getChartColors()
    tradeLine = chart.addSeries(LineSeries, {
        color: colors.lineColor,
        lineWidth: 2,
        lineStyle: 2, // Dashed line
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
    })
    
    // Ajouter les deux points
    tradeLine.setData([
        { time: entryTime, value: entryPrice },
        { time: exitTime, value: exitPrice },
    ])
}

// Initialiser au montage du composant
onMounted(() => {
    initChart()
})

// Watcher pour détecter les changements de mode dark/light
watch(() => colorMode.value, () => {
    updateChartColors()
})
</script>

<style scoped>
/* Styles additionnels si nécessaire */
</style>
