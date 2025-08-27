import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol') || 'btc'
    console.log('🎯 Dashboard API接收到symbol参数:', symbol)

    // 获取 R2 基础 URL
    const r2BaseUrl = process.env.R2_PUBLIC_BASE
    const projectRoot = process.cwd().replace('/web', '')
    
    // 数据源优先级：R2 > 本地文件 > Mock数据
    let dashboardData = null
    
    // 1. 尝试从 R2 读取
    if (r2BaseUrl) {
      try {
        const r2Url = `${r2BaseUrl}/records/latest_${symbol}.json`
        console.log('🌐 尝试从 R2 读取:', r2Url)
        
        const response = await fetch(r2Url, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        
        if (response.ok) {
          const rawData = await response.json()
          dashboardData = {
            lastUpdated: rawData.timestamp,
            currentPrice: rawData.prediction_results?.current_price || 0,
            config: {
              forecast_horizon: rawData.data_config?.forecast_horizon || 8,
              num_samples: rawData.sampling_config?.num_samples || 30,
              volatility_window: rawData.data_config?.volatility_window || 8
            },
            metrics: rawData.raw_metrics || {},
            formatted: rawData.formatted_metrics || {},
            validation: rawData.validation || null,
            source: 'R2'
          }
          console.log('✅ 从 R2 成功读取数据')
        } else {
          console.log('⚠️ R2 读取失败，状态码:', response.status)
        }
      } catch (r2Error) {
        console.log('⚠️ R2 读取异常:', r2Error.message)
      }
    }
    
    // 2. 如果 R2 失败，尝试本地文件
    if (!dashboardData) {
      const recordsFile = path.join(projectRoot, 'records', `latest_${symbol}.json`)
      const fallbackPath = path.join(process.cwd(), 'public', 'data', 'dashboard.json')
      
      try {
        const recordsData = await fs.readFile(recordsFile, 'utf8')
        const rawData = JSON.parse(recordsData)
        
        dashboardData = {
          lastUpdated: rawData.timestamp,
          currentPrice: rawData.prediction_results?.current_price || 0,
          config: {
            forecast_horizon: rawData.data_config?.forecast_horizon || 8,
            num_samples: rawData.sampling_config?.num_samples || 30,
            volatility_window: rawData.data_config?.volatility_window || 8
          },
          metrics: rawData.raw_metrics || {},
          formatted: rawData.formatted_metrics || {},
          validation: rawData.validation || null,
          source: 'local'
        }
        console.log('✅ 从本地文件成功读取数据')
        
      } catch (recordsError) {
        try {
          const jsonData = await fs.readFile(fallbackPath, 'utf8')
          const data = JSON.parse(jsonData)
          dashboardData = { ...data, source: 'fallback' }
          console.log('✅ 从备用文件成功读取数据')
        } catch (fallbackError) {
          console.log('⚠️ 所有数据源都失败，使用 Mock 数据')
        }
      }
    }
    
    // 3. 如果都失败，使用 Mock 数据
    if (!dashboardData) {
      dashboardData = {
        lastUpdated: new Date().toISOString(),
        currentPrice: symbol === 'btc' ? 64250 : 3200,
        config: {
          forecast_horizon: 8,
          num_samples: 30,
          volatility_window: 8
        },
        metrics: {
          'upside_0.5%_prob': 0.73,
          'confidence_score': 0.82
        },
        formatted: {
          'upside_0.5%_prob': '73.0%',
          'confidence_score': '82.0%'
        },
        validation: null,
        source: 'mock'
      }
    }
    
    return NextResponse.json(dashboardData)
    
  } catch (error) {
    console.error('❌ Dashboard API 错误:', error)
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 })
  }
}