import { calculatePnlTimeseries } from '../../services/analyticsMetrics'
import {
	analyticsTimeseriesQuerySchema,
	handleAnalyticsError,
	loadAnalyticsTrades,
	parseAnalyticsQuery,
	type AnalyticsTimeseriesQuery,
} from '../../services/analyticsApi'
import { getApiContext } from '../../utils/apiHelpers'

export default defineEventHandler(async (event) => {
	try {
		const query = parseAnalyticsQuery<AnalyticsTimeseriesQuery>(analyticsTimeseriesQuerySchema, getQuery(event))
		const { prisma } = await getApiContext(event)
		const trades = await loadAnalyticsTrades(prisma, query)
		return calculatePnlTimeseries(trades, query.mode, query.interval)
	} catch (error) {
		return handleAnalyticsError(error, 'api.analytics.pnl_timeseries.error')
	}
})
