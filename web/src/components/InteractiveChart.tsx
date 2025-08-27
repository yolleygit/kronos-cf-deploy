import React, { useState, useEffect, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Bar
} from 'recharts'
import { formatCurrency, formatDateTime } from '../utils'
import dataSourceService from '../services/dataSourceService'

interface ChartDataPoint {
  timestamp: string
  historicalPrice?: number
  meanPrediction?: number
  predictionUpper?: number
  predictionLower?: number
  volume?: number
  currentPrice?: number
  isForecast: boolean
}

interface InteractiveChartProps {
  data: ChartDataPoint[]
  forecastStartTime: string
  currentPrice: number
  config?: {
    forecast_horizon: number
    num_samples: number
  }
  symbol?: string
}

export default function InteractiveChart({ 
  data, 
  forecastStartTime, 
  currentPrice,
  config = { forecast_horizon: 4, num_samples: 30 },
  symbol = 'btc'
}: InteractiveChartProps) {
  const [timeRange, setTimeRange] = useState<'24h' | '48h' | '72h' | 'full'>('24h')
  const [showVolume, setShowVolume] = useState(false)
  const [showPredictionRange, setShowPredictionRange] = useState(false)
  const [realData, setRealData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [internalSymbol, setInternalSymbol] = useState(symbol || 'btc') // 内部状态管理
  
  // 缩放和拖拽状态
  const [zoomDomain, setZoomDomain] = useState<{left?: string | number, right?: string | number} | null>(null)
  const [refAreaLeft, setRefAreaLeft] = useState<string | number>('')
  const [refAreaRight, setRefAreaRight] = useState<string | number>('')
  const [isZooming, setIsZooming] = useState(false)
  
  // Y轴手动控制
  const [manualYAxis, setManualYAxis] = useState(false)
  const [yAxisMin, setYAxisMin] = useState<number | null>(null)
  const [yAxisMax, setYAxisMax] = useState<number | null>(null)
  
  // 预测倒计时
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  
  // 使用父组件传入的symbol或内部状态
  const activeSymbol = symbol || internalSymbol

  // 当父组件symbol改变时，同步内部状态
  useEffect(() => {
    if (symbol && symbol !== internalSymbol) {
      console.log('📊 图表接收到父组件symbol变化:', symbol)
      setInternalSymbol(symbol)
    }
  }, [symbol, internalSymbol])

  // 移除事件监听器，现在只使用父组件传入的symbol

  // 获取真实数据
  useEffect(() => {
    async function fetchRealData() {
      try {
        setLoading(true)
        console.log('📊 开始获取真实图表数据...', { activeSymbol })
        
        const chartData = await dataSourceService.getChartData(activeSymbol)
        
        // 转换历史数据格式
        const historicalPoints: ChartDataPoint[] = chartData.historicalData.map(item => ({
          timestamp: item.timestamp,
          historicalPrice: item.close,
          volume: item.volume,
          isForecast: false
        }))
        
        // 使用真实预测数据 (从 predictions_raw 获取)
        const predictionPoints: ChartDataPoint[] = chartData.predictionData.map((pred: any) => ({
          timestamp: pred.timestamp,
          meanPrediction: pred.meanPrediction,
          predictionUpper: pred.predictionUpper,
          predictionLower: pred.predictionLower,
          isForecast: true
        }))
        
        const combinedData = [...historicalPoints, ...predictionPoints]
        console.log('✅ 真实数据加载完成:', {
          历史点数: historicalPoints.length,
          预测点数: predictionPoints.length,
          预测开始时间: chartData.forecastStartTime
        })
        
        setRealData(combinedData)
        setError(null)
      } catch (err) {
        console.error('❌ 获取图表数据失败:', err)
        setError(err instanceof Error ? err.message : '数据加载失败')
      } finally {
        setLoading(false)
      }
    }
    
    fetchRealData()
  }, [activeSymbol]) // 使用内部activeSymbol状态

  // 预测倒计时更新
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0)
      const timeDiff = nextHour.getTime() - now.getTime()
      
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)
      
      setTimeRemaining(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }
    
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    
    return () => clearInterval(interval)
  }, [])

  // 使用真实数据，如果加载失败则使用传入的data作为后备
  const chartData = realData.length > 0 ? realData : data || []

  const filteredData = useMemo(() => {
    if (timeRange === 'full' || chartData.length === 0) return chartData
    
    const now = new Date()
    const hours = timeRange === '24h' ? 24 : timeRange === '48h' ? 48 : 72
    const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000)
    
    return chartData.filter(d => new Date(d.timestamp) >= cutoff)
  }, [chartData, timeRange])

  const formatTooltipValue = (value: any, name: string) => {
    if (name.includes('价格') || name.includes('预测') || name.includes('Price') || name.includes('Prediction')) {
      // 只显示整数价格，去掉小数
      return [`$${Math.round(value).toLocaleString()}`, name]
    }
    if (name.includes('交易量') || name.includes('Volume')) {
      return [`${Math.round(value).toLocaleString()}`, name]
    }
    return [value, name]
  }

  const formatTooltipLabel = (label: string) => {
    const date = new Date(label)
    // 格式化为：MM/DD HH:00
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    return `${month}/${day} ${hour}:00`
  }

  // 缩放处理函数
  const handleMouseDown = (e: any) => {
    if (e && e.activeLabel) {
      setRefAreaLeft(e.activeLabel)
      setIsZooming(true)
    }
  }

  const handleMouseMove = (e: any) => {
    if (isZooming && e && e.activeLabel) {
      setRefAreaRight(e.activeLabel)
    }
  }

  const handleMouseUp = () => {
    if (isZooming && refAreaLeft && refAreaRight && refAreaLeft !== refAreaRight) {
      // 确保左边界小于右边界
      const left = refAreaLeft
      const right = refAreaRight
      
      setZoomDomain({
        left: left < right ? left : right,
        right: left < right ? right : left
      })
    }
    
    setRefAreaLeft('')
    setRefAreaRight('')
    setIsZooming(false)
  }

  // 重置缩放
  const resetZoom = () => {
    setZoomDomain(null)
    setRefAreaLeft('')
    setRefAreaRight('')
    setIsZooming(false)
  }

  // 获取缩放范围内的数据
  const getZoomedData = () => {
    if (!zoomDomain || !zoomDomain.left || !zoomDomain.right) {
      return filteredData
    }
    
    const startTime = new Date(zoomDomain.left).getTime()
    const endTime = new Date(zoomDomain.right).getTime()
    
    return filteredData.filter(d => {
      const timestamp = new Date(d.timestamp).getTime()
      return timestamp >= startTime && timestamp <= endTime
    })
  }

  // 获取Y轴的自适应范围 - 按100为单位对齐网格
  const getYAxisDomain = () => {
    // 如果用户手动设置了Y轴范围
    if (manualYAxis && yAxisMin !== null && yAxisMax !== null) {
      // 手动模式下，直接使用用户设置的精确值
      return [yAxisMin, yAxisMax]
    }
    
    const zoomedData = getZoomedData()
    if (zoomedData.length === 0) return [4000, 5000] // 默认范围
    
    let minPrice = Infinity
    let maxPrice = -Infinity
    
    zoomedData.forEach(d => {
      // 检查历史价格
      if (d.historicalPrice && d.historicalPrice > 0) {
        minPrice = Math.min(minPrice, d.historicalPrice)
        maxPrice = Math.max(maxPrice, d.historicalPrice)
      }
      
      // 检查预测价格
      if (d.meanPrediction && d.meanPrediction > 0) {
        minPrice = Math.min(minPrice, d.meanPrediction)
        maxPrice = Math.max(maxPrice, d.meanPrediction)
      }
      
      // 检查预测上下限
      if (d.predictionUpper && d.predictionUpper > 0) {
        maxPrice = Math.max(maxPrice, d.predictionUpper)
      }
      if (d.predictionLower && d.predictionLower > 0) {
        minPrice = Math.min(minPrice, d.predictionLower)
      }
    })
    
    if (minPrice === Infinity || maxPrice === -Infinity) {
      return [4000, 5000]
    }
    
    // 按100为单位对齐的智能范围计算
    const range = maxPrice - minPrice
    const margin = Math.max(range * 0.08, 200) // 8%边距，至少200的缓冲区
    
    // 向下对齐到100的倍数作为最小值
    const alignedMin = Math.floor((minPrice - margin) / 100) * 100
    // 向上对齐到100的倍数作为最大值  
    const alignedMax = Math.ceil((maxPrice + margin) / 100) * 100
    
    return [alignedMin, alignedMax]
  }

  // 计算价格差值和百分比
  const getPriceDifference = () => {
    if (!chartData || chartData.length === 0) return null
    
    const historicalData = chartData.filter(d => d.historicalPrice && !d.isForecast)
    const predictionData = chartData.filter(d => d.meanPrediction && d.isForecast)
    
    if (historicalData.length === 0 || predictionData.length === 0) return null
    
    const latestHistorical = historicalData[historicalData.length - 1]
    const firstPrediction = predictionData[0]
    const lastPrediction = predictionData[predictionData.length - 1]
    
    if (!latestHistorical.historicalPrice || !firstPrediction.meanPrediction || !lastPrediction.meanPrediction) {
      return null
    }
    
    const currentPrice = latestHistorical.historicalPrice
    const firstPredPrice = firstPrediction.meanPrediction
    const lastPredPrice = lastPrediction.meanPrediction
    
    const shortTermDiff = firstPredPrice - currentPrice
    const longTermDiff = lastPredPrice - currentPrice
    
    const shortTermPercent = (shortTermDiff / currentPrice) * 100
    const longTermPercent = (longTermDiff / currentPrice) * 100
    
    return {
      current: currentPrice,
      shortTerm: {
        price: firstPredPrice,
        diff: shortTermDiff,
        percent: shortTermPercent
      },
      longTerm: {
        price: lastPredPrice,
        diff: longTermDiff,
        percent: longTermPercent
      }
    }
  }

  // 获取X轴的domain
  const getXAxisDomain = (): [string, string] => {
    if (zoomDomain && zoomDomain.left && zoomDomain.right) {
      return [String(zoomDomain.left), String(zoomDomain.right)]
    }
    return ['dataMin', 'dataMax']
  }

  // 加载状态
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">正在加载图表数据...</p>
          </div>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-red-500 text-2xl mb-4">⚠️</div>
            <p className="text-red-600 dark:text-red-400 mb-2">数据加载失败</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      {/* Chart Controls */}
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-4">
            交互式价格预测图表 - {activeSymbol.toUpperCase()}
            <span className="text-lg font-mono text-green-500 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-lg">
              📱 {timeRemaining}
            </span>
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            {config.forecast_horizon}小时预测 • {config.num_samples}次采样 • 可拖拽缩放
          </p>
          
          {/* 价格差值显示 */}
          {(() => {
            const priceDiff = getPriceDifference()
            if (!priceDiff) return null
            
            return (
              <div className="grid grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">当前价格</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">
                    ${Math.round(priceDiff.current).toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">1H预测</p>
                  <div className="text-sm font-mono">
                    <span className="text-gray-900 dark:text-white">
                      ${Math.round(priceDiff.shortTerm.price).toLocaleString()}
                    </span>
                    <br />
                    <span className={`text-xs ${
                      priceDiff.shortTerm.diff >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {priceDiff.shortTerm.diff >= 0 ? '+' : ''}${Math.round(priceDiff.shortTerm.diff).toLocaleString()} 
                      ({priceDiff.shortTerm.percent >= 0 ? '+' : ''}{priceDiff.shortTerm.percent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">24H预测</p>
                  <div className="text-sm font-mono">
                    <span className="text-gray-900 dark:text-white">
                      ${Math.round(priceDiff.longTerm.price).toLocaleString()}
                    </span>
                    <br />
                    <span className={`text-xs ${
                      priceDiff.longTerm.diff >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {priceDiff.longTerm.diff >= 0 ? '+' : ''}${Math.round(priceDiff.longTerm.diff).toLocaleString()} 
                      ({priceDiff.longTerm.percent >= 0 ? '+' : ''}{priceDiff.longTerm.percent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>
            )
          })()}

        </div>
        
        {/* Time Range Selector */}
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {(['24h', '48h', '72h', 'full'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {range === 'full' ? '全部' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle Controls */}
      <div className="flex flex-wrap gap-4 mb-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showVolume}
            onChange={e => setShowVolume(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">显示交易量</span>
        </label>
        
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showPredictionRange}
            onChange={e => setShowPredictionRange(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">显示预测区间</span>
        </label>

        {/* TradingView风格缩放控制 */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">📊 专业模式</span>
            {zoomDomain ? (
              <button
                onClick={resetZoom}
                className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md"
              >
                🔄 重置视图
              </button>
            ) : (
              <span className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                拖拽框选放大区域
              </span>
            )}
          </div>
        </div>

        {/* Y轴手动控制 */}
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={manualYAxis}
              onChange={e => setManualYAxis(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">手动Y轴</span>
          </label>
          
          {manualYAxis && (
            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="最小值"
                value={yAxisMin || ''}
                onChange={e => setYAxisMin(e.target.value ? parseFloat(e.target.value) : null)}
                className="w-20 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <span className="text-xs text-gray-500">-</span>
              <input
                type="number"
                placeholder="最大值"
                value={yAxisMax || ''}
                onChange={e => setYAxisMax(e.target.value ? parseFloat(e.target.value) : null)}
                className="w-20 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={() => {
                  setManualYAxis(false)
                  setYAxisMin(null)
                  setYAxisMax(null)
                }}
                className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                重置
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Chart */}
      <div className="space-y-4">
        {/* Main Price Chart */}
        <ResponsiveContainer width="100%" height={600}>
          <LineChart
            data={filteredData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <CartesianGrid strokeDasharray="1 1" stroke="#374151" opacity={0.2} />
            
            <XAxis
              dataKey="timestamp"
              domain={getXAxisDomain()}
              type="category"
              allowDataOverflow
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickFormatter={(value) => {
                const date = new Date(value)
                return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`
              }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            
            <YAxis
              domain={getYAxisDomain()}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickFormatter={(value) => `$${Math.round(value).toLocaleString()}`}
              allowDataOverflow
              interval="preserveStartEnd"
              tickCount={8}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '8px',
                color: '#F9FAFB'
              }}
              formatter={formatTooltipValue}
              labelFormatter={formatTooltipLabel}
            />
            
            <Legend />

            {/* Historical Price Line */}
            <Line
              type="monotone"
              dataKey="historicalPrice"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              name="历史价格"
              connectNulls={false}
            />

            {/* Mean Prediction Line */}
            <Line
              type="monotone"
              dataKey="meanPrediction"
              stroke="#F59E0B"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="平均预测"
              connectNulls={false}
            />

            {/* Prediction Upper Line */}
            {showPredictionRange && (
              <Line
                type="monotone"
                dataKey="predictionUpper"
                stroke="#F59E0B"
                strokeWidth={1}
                strokeOpacity={0.6}
                dot={false}
                name="预测上限"
                connectNulls={false}
              />
            )}

            {/* Prediction Lower Line */}
            {showPredictionRange && (
              <Line
                type="monotone"
                dataKey="predictionLower"
                stroke="#F59E0B"
                strokeWidth={1}
                strokeOpacity={0.6}
                dot={false}
                name="预测下限"
                connectNulls={false}
              />
            )}

            {/* Current Price Reference Line */}
            {currentPrice > 0 && (
              <ReferenceLine
                y={currentPrice}
                stroke="#EF4444"
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{ value: `当前价格: ${formatCurrency(currentPrice)}`, position: "right" }}
              />
            )}

            {/* Forecast Start Line */}
            <ReferenceLine
              x={(() => {
                const now = new Date()
                const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0)
                return nextHour.toISOString()
              })()}
              stroke="#6B7280"
              strokeDasharray="2 2"
              strokeWidth={1}
              label={{ value: "预测开始", position: "left" }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Volume Chart (separate chart) */}
        {showVolume && (
          <ResponsiveContainer width="100%" height={100}>
            <ComposedChart
              data={filteredData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 10, fill: '#6B7280' }}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getMonth() + 1}/${date.getDate()}`
                }}
              />
              
              <YAxis
                tick={{ fontSize: 10, fill: '#6B7280' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />

              <Bar
                dataKey="volume"
                fill="#6366F1"
                opacity={0.6}
                name="交易量"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart Info */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        💡 提示: 鼠标悬停查看详细数值 • 使用时间范围按钮切换视图 • 可通过复选框控制图层显示
      </div>
    </div>
  )
}