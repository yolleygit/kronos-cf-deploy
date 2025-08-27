import { NextRequest, NextResponse } from 'next/server'

// Unified dashboard data route for Node (build-time/runtime) on Pages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = (searchParams.get('symbol') || 'btc').toLowerCase()

    const r2Base = process.env.R2_PUBLIC_BASE || ''

    // 1) Try R2 structured record first (if configured)
    if (r2Base) {
      try {
        const r2Url = `${r2Base.replace(/\/$/, '')}/records/latest_${symbol}.json`
        const resp = await fetch(r2Url)
        if (resp.ok) {
          const raw = await resp.json()
          const data = {
            lastUpdated: raw.timestamp,
            currentPrice: raw.prediction_results?.current_price || 0,
            config: {
              forecast_horizon: raw.data_config?.forecast_horizon || 8,
              num_samples: raw.sampling_config?.num_samples || 30,
              volatility_window: raw.data_config?.volatility_window || 8
            },
            metrics: raw.raw_metrics || {},
            formatted: raw.formatted_metrics || {},
            validation: raw.validation || null,
            source: 'R2'
          }
          return NextResponse.json(data, {
            headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
          })
        }
      } catch {
        // ignore and fall through to static
      }
    }

    // 2) Fallback to static file inside public
    try {
      const url = new URL('/data/dashboard.json', request.nextUrl.origin)
      const resp = await fetch(url.toString())
      if (resp.ok) {
        const fallbackJson = await resp.json()
        return NextResponse.json({ ...fallbackJson, source: 'static' })
      }
    } catch {
      // ignore and fall through to mock
    }

    // 3) Final fallback: mock
    const mock = {
      lastUpdated: new Date().toISOString(),
      currentPrice: symbol === 'eth' ? 3200 : 64250,
      config: { forecast_horizon: 8, num_samples: 30, volatility_window: 8 },
      metrics: { 'upside_0.5%_prob': 0.73, 'confidence_score': 0.82 },
      formatted: { 'upside_0.5%_prob': '73.0%', 'confidence_score': '82.0%' },
      validation: null,
      source: 'mock'
    }
    return NextResponse.json(mock)
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 })
  }
}