export const runtime = 'edge'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const symbol = (url.searchParams.get('symbol') || 'btc').toLowerCase()

    const r2Base = process.env.R2_PUBLIC_BASE || ''
    let data: any | null = null

    // 1) 优先从 R2 读取结构化 records 数据
    if (r2Base) {
      const r2Url = `${r2Base.replace(/\/$/, '')}/records/latest_${symbol}.json`
      try {
        const resp = await fetch(r2Url, { cf: { cacheTtl: 60, cacheEverything: true } as any })
        if (resp.ok) {
          const raw = await resp.json()
          data = {
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
        }
      } catch (_) {
        // ignore and fallback
      }
    }

    // 2) 退回到静态文件（web/public/data/dashboard.json）
    if (!data) {
      try {
        const staticUrl = new URL('/data/dashboard.json', url.origin)
        const resp = await fetch(staticUrl.toString(), { cf: { cacheTtl: 60, cacheEverything: true } as any })
        if (resp.ok) {
          const fallbackJson = await resp.json()
          data = { ...fallbackJson, source: 'static' }
        }
      } catch (_) {
        // ignore and fallback to mock
      }
    }

    // 3) 最后的兜底：mock 数据
    if (!data) {
      data = {
        lastUpdated: new Date().toISOString(),
        currentPrice: symbol === 'eth' ? 3200 : 64250,
        config: { forecast_horizon: 8, num_samples: 30, volatility_window: 8 },
        metrics: { 'upside_0.5%_prob': 0.73, 'confidence_score': 0.82 },
        formatted: { 'upside_0.5%_prob': '73.0%', 'confidence_score': '82.0%' },
        validation: null,
        source: 'mock'
      }
    }

    return new Response(JSON.stringify(data), {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to load dashboard data' }), { status: 500 })
  }
}