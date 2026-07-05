interface PolygonBar {
  t: number
  o: number
  h: number
  l: number
  c: number
}

interface PolygonResponse {
  results: PolygonBar[]
}

interface ResponseData {
  time: number
  open: number
  high: number
  low: number
  close: number
}

interface ErrorResponse {
  statusCode: number
  message: string
}

// Map a timeframe code (1, 5, 15, 60) to Polygon range path segments.
// 60 minutes is expressed as 1 hour to match Polygon's accepted timespans.
const timeframeToRange = (tf: string): { multiplier: number, timespan: string } => {
  const tfNum = Number(tf)
  if (tfNum === 60) return { multiplier: 1, timespan: 'hour' }
  return { multiplier: tfNum, timespan: 'minute' }
}

export default defineEventHandler(async (event) => {
  const { pair, from, to, tf } = getQuery(event)
  const config = useRuntimeConfig()

  const { multiplier, timespan } = timeframeToRange((tf as string) || '15')

  const url = `https://api.polygon.io/v2/aggs/ticker/${pair}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${config.public.polygonApiKey}`

  try {
    const data = await $fetch<PolygonResponse>(url)
    return {
      success: true,
      data: (data.results || []).map(bar => ({
        time: Math.floor(bar.t / 1000),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c
      })) as ResponseData[]
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Polygon API error'
    } as ErrorResponse)
  }
})
