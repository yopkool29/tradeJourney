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

interface CrosshairChart extends Chart {
	crosshair?: unknown;
}

interface CrosshairPluginHooks {
	afterInit?: (chart: CrosshairChart, ...args: unknown[]) => void;
	afterEvent?: (chart: CrosshairChart, ...args: unknown[]) => void;
	afterDraw?: (chart: CrosshairChart, ...args: unknown[]) => void;
	beforeTooltipDraw?: (chart: CrosshairChart, ...args: unknown[]) => boolean | undefined;
	afterDestroy?: (chart: CrosshairChart, ...args: unknown[]) => void;
}

const crosshairPlugin = CrosshairPlugin as CrosshairPluginHooks;

export default defineNuxtPlugin(() => {
	const safeCrosshairPlugin = {
		id: 'crosshair',
		afterInit: (chart: CrosshairChart, ...args: unknown[]) => crosshairPlugin.afterInit?.(chart, ...args),
		afterEvent: (chart: CrosshairChart, ...args: unknown[]) => {
			if (!chart.crosshair) return;
			return crosshairPlugin.afterEvent?.(chart, ...args);
		},
		afterDraw: (chart: CrosshairChart, ...args: unknown[]) => {
			if (!chart.crosshair) return;
			return crosshairPlugin.afterDraw?.(chart, ...args);
		},
		beforeTooltipDraw: (chart: CrosshairChart, ...args: unknown[]) => {
			if (!chart.crosshair) return;
			return crosshairPlugin.beforeTooltipDraw?.(chart, ...args);
		},
		afterDestroy: (chart: CrosshairChart, ...args: unknown[]) => {
			if (!chart.crosshair) return;
			return crosshairPlugin.afterDestroy?.(chart, ...args);
		},
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