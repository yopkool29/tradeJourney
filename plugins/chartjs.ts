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
  BarController
} from 'chart.js'
import DataLabels from 'chartjs-plugin-datalabels'

export default defineNuxtPlugin(() => {
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
    
    // Plugins
    DataLabels
  )

  // Configuration globale pour corriger le flou des graphiques
  // Forcer le devicePixelRatio à 2 pour garantir des graphiques nets sur tous les écrans
  if (import.meta.client) {
    Chart.defaults.devicePixelRatio = 2
  }
})