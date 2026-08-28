import { calculateAnalyticsSummary } from '../../services/analyticsMetrics'
import {
	analyticsBaseQuerySchema,
	handleAnalyticsError,
	loadAnalyticsTrades,
	parseAnalyticsQuery,
	type AnalyticsBaseQuery,
} from '../../services/analyticsApi'
import { getApiContext } from '../../utils/apiHelpers'

export default defineEventHandler(async (event) => {
	try {
		const query = parseAnalyticsQuery<AnalyticsBaseQuery>(analyticsBaseQuerySchema, getQuery(event))
		const { prisma } = await getApiContext(event)
		const trades = await loadAnalyticsTrades(prisma, query)
		return calculateAnalyticsSummary(trades, query.mode)
	} catch (error) {
		return handleAnalyticsError(error, 'api.analytics.summary.error')
	}
})
