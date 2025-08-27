import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol') || 'btc'
    console.log('🎯 Prediction Data API接收到symbol参数:', symbol)

    // 获取 R2 基础 URL
    const r2BaseUrl = process.env.R2_PUBLIC_BASE
    const projectRoot = process.cwd().replace('/web', '')
    
    // 数据源优先级：R2 > 本地文件 > Mock数据
    let predictionData = null
    
    // 1. 尝试从 R2 读取
    if (r2BaseUrl) {
      try {
        const r2Url = `${r2BaseUrl}/predictions_raw/latest_${symbol}_close.csv`
        console.log('🌐 尝试从 R2 读取预测数据:', r2Url)
        
        const response = await fetch(r2Url, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        
        if (response.ok) {
          const csvText = await response.text()
          predictionData = {
            data: csvText,
            source: 'R2'
          }
          console.log('✅ 从 R2 成功读取预测数据')
        } else {
          console.log('⚠️ R2 预测数据读取失败，状态码:', response.status)
        }
      } catch (r2Error) {
        console.log('⚠️ R2 预测数据读取异常:', r2Error.message)
      }
    }
    
    // 2. 如果 R2 失败，尝试本地文件
    if (!predictionData) {
      const predictionFile = path.join(projectRoot, 'predictions_raw', 'latest', `${symbol}_latest_close.csv`)
      
      try {
        const csvData = await fs.readFile(predictionFile, 'utf8')
        predictionData = {
          data: csvData,
          source: 'local'
        }
        console.log('✅ 从本地文件成功读取预测数据')
      } catch (localError) {
        console.log('⚠️ 本地预测数据读取失败:', localError.message)
      }
    }
    
    // 3. 如果都失败，返回错误
    if (!predictionData) {
      return NextResponse.json({ 
        error: 'Failed to load prediction data',
        message: `No prediction data available for ${symbol}`
      }, { status: 404 })
    }
    
    return NextResponse.json(predictionData)
    
  } catch (error) {
    console.error('❌ Prediction Data API 错误:', error)
    return NextResponse.json({ error: 'Failed to load prediction data' }, { status: 500 })
  }
}