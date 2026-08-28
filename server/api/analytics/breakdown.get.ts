import { calculateAnalyticsBreakdown } from '../../services/analyticsMetrics'
import {
	analyticsBreakdownQuerySchema,
	handleAnalyticsError,
	loadAnalyticsTrades,
	parseAnalyticsQuery,
	type AnalyticsBreakdownQuery,
} from '../../services/analyticsApi'
import { getApiContext } from '../../utils/apiHelpers'

export default defineEventHandler(async (event) => {
	try {
		const query = parseAnalyticsQuery<AnalyticsBreakdownQuery>(analyticsBreakdownQuerySchema, getQuery(event))
		const { prisma } = await getApiContext(event)
		const trades = await loadAnalyticsTrades(prisma, query)
		return calculateAnalyticsBreakdown(trades, query.mode, query.dimension)
	} catch (error) {
		return handleAnalyticsError(error, 'api.analytics.breakdown.error')
	}
})
