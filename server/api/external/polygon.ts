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

export default defineEventHandler(async (event) => {
  const { pair, from, to } = getQuery(event)
  const config = useRuntimeConfig()
  
  const url = `https://api.polygon.io/v2/aggs/ticker/${pair}/range/15/minute/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${config.polygonApiKey}`
  
  try {
    const data = await $fetch<PolygonResponse>(url)
    return {
      success: true,
      data: data.results.map(bar => ({
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
      message: 'Erreur Polygon API'
    } as ErrorResponse)
  }
})
