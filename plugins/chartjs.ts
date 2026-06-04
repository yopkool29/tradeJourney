import { 
  Chart, 
  Title, 
  Tooltip, 
  Legend, 
  BarElement, 
  CategoryScale, 
  LinearScale,
  ArcElement,
  PointElement,
  LineElement,
  LineController,
  BarController,
  Filler
} from 'chart.js'
import DataLabels from 'chartjs-plugin-datalabels'
import CrosshairPlugin from 'chartjs-plugin-crosshair'

export default defineNuxtPlugin(() => {
	const safeCrosshairPlugin = {
		id: 'crosshair',
		afterInit: (...args: any[]) => (CrosshairPlugin as any).afterInit?.apply(CrosshairPlugin, args),
		afterEvent: (...args: any[]) => {
			if (!(args[0] as any)?.crosshair) return
			return (CrosshairPlugin as any).afterEvent?.apply(CrosshairPlugin, args)
		},
		afterDraw: (...args: any[]) => {
			if (!(args[0] as any)?.crosshair) return
			return (CrosshairPlugin as any).afterDraw?.apply(CrosshairPlugin, args)
		},
		beforeTooltipDraw: (...args: any[]) => {
			if (!(args[0] as any)?.crosshair) return
			return (CrosshairPlugin as any).beforeTooltipDraw?.apply(CrosshairPlugin, args)
		},
		afterDestroy: (...args: any[]) => (CrosshairPlugin as any).afterDestroy?.apply(CrosshairPlugin, args),
	}

  // Enregistrement des composants de base
  Chart.register(
    // Éléments de base
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    PointElement,
    LineElement,

    // Contrôleurs
    LineController,
    BarController,

    // Autres composants
    Title,
    Tooltip,
    Legend,
    Filler,

    // Plugins
    DataLabels,
    safeCrosshairPlugin
  )

  // Configuration globale pour corriger le flou des graphiques
  if (import.meta.client) {
    Chart.defaults.devicePixelRatio = 2
  }
})