import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol') || 'btc'
    console.log('🎯 Historical Data API接收到symbol参数:', symbol)

    // 获取 R2 基础 URL
    const r2BaseUrl = process.env.R2_PUBLIC_BASE
    const projectRoot = process.cwd().replace('/web', '')
    
    // 数据源优先级：R2 > 本地文件 > Mock数据
    let historicalData = null
    
    // 1. 尝试从 R2 读取
    if (r2BaseUrl) {
      try {
        const r2Url = `${r2BaseUrl}/data/${symbol}_cache.parquet`
        console.log('🌐 尝试从 R2 读取历史数据:', r2Url)
        
        const response = await fetch(r2Url, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        
        if (response.ok) {
          const data = await response.arrayBuffer()
          historicalData = {
            data: Buffer.from(data),
            source: 'R2',
            format: 'parquet'
          }
          console.log('✅ 从 R2 成功读取历史数据')
        } else {
          console.log('⚠️ R2 历史数据读取失败，状态码:', response.status)
        }
      } catch (r2Error) {
        const msg = r2Error instanceof Error ? r2Error.message : String(r2Error)
        console.log('⚠️ R2 历史数据读取异常:', msg)
      }
    }
    
    // 2. 如果 R2 失败，尝试本地文件
    if (!historicalData) {
      const dataFile = path.join(projectRoot, 'data', `${symbol}_cache.parquet`)
      
      try {
        const fileData = await fs.readFile(dataFile)
        historicalData = {
          data: fileData,
          source: 'local',
          format: 'parquet'
        }
        console.log('✅ 从本地文件成功读取历史数据')
      } catch (localError) {
        const msg = localError instanceof Error ? localError.message : String(localError)
        console.log('⚠️ 本地历史数据读取失败:', msg)
      }
    }
    
    // 3. 如果都失败，返回错误
    if (!historicalData) {
      return NextResponse.json({ 
        error: 'Failed to load historical data',
        message: `No historical data available for ${symbol}`
      }, { status: 404 })
    }
    
    return NextResponse.json(historicalData)
    
  } catch (error) {
    console.error('❌ Historical Data API 错误:', error)
    return NextResponse.json({ error: 'Failed to load historical data' }, { status: 500 })
  }
}