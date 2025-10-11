import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GlassCardV2 } from '../ui/GlassCardV2'
import { BadgeV2 } from '../ui/BadgeV2'
import { 
  Activity, 
  Users, 
  Clock, 
  Zap, 
  TrendingUp, 
  TrendingDown,
  Globe,
  Server,
  Database,
  Cpu
} from 'lucide-react'
import { realTimeAnalytics } from '@/lib/realTimeAnalytics'

interface RealTimeDashboardProps {
  className?: string
}

export const RealTimeDashboard: React.FC<RealTimeDashboardProps> = ({ className = '' }) => {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [trends, setTrends] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const updateDashboard = () => {
      const data = realTimeAnalytics.getDashboardData()
      const trendData = realTimeAnalytics.getPerformanceTrends('1h')
      
      setDashboardData(data)
      setTrends(trendData)
      setIsLoading(false)
    }

    // Update immediately
    updateDashboard()

    // Update every 5 seconds
    const interval = setInterval(updateDashboard, 5000)

    return () => clearInterval(interval)
  }, [])

  if (isLoading || !dashboardData) {
    return (
      <GlassCardV2 className={className}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--accent))]"></div>
        </div>
      </GlassCardV2>
    )
  }

  const { performance, usage, health } = dashboardData

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[hsl(var(--text))]">Real-Time Analytics</h2>
        <BadgeV2 
          variant={health.status === 'healthy' ? 'success' : health.status === 'warning' ? 'warning' : 'destructive'}
          className="flex items-center gap-2"
        >
          <Activity className="w-4 h-4" />
          {health.status.toUpperCase()}
        </BadgeV2>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Average Scan Time"
          value={`${performance.averageScanTime.toFixed(0)}ms`}
          icon={<Clock className="w-5 h-5" />}
          trend={performance.averageScanTime < 1000 ? 'up' : 'down'}
          color="text-[hsl(var(--accent))]"
        />
        
        <MetricCard
          title="Success Rate"
          value={`${(performance.successRate * 100).toFixed(1)}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={performance.successRate > 0.95 ? 'up' : 'down'}
          color="text-[hsl(var(--success))]"
        />
        
        <MetricCard
          title="Cache Hit Rate"
          value={`${(performance.cacheHitRate * 100).toFixed(1)}%`}
          icon={<Database className="w-5 h-5" />}
          trend={performance.cacheHitRate > 0.8 ? 'up' : 'down'}
          color="text-[hsl(var(--warning))]"
        />
        
        <MetricCard
          title="Active Users"
          value={usage.activeUsers.toString()}
          icon={<Users className="w-5 h-5" />}
          trend="up"
          color="text-[hsl(var(--accent))]"
        />
      </div>

      {/* Performance Trends */}
      <GlassCardV2>
        <h3 className="text-lg font-semibold text-[hsl(var(--text))] mb-4">Performance Trends (1h)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TrendChart
            title="Scan Time"
            data={trends.scanTime}
            color="hsl(var(--accent))"
            unit="ms"
          />
          <TrendChart
            title="Success Rate"
            data={trends.successRate}
            color="hsl(var(--success))"
            unit="%"
            isPercentage
          />
          <TrendChart
            title="Cache Hit Rate"
            data={trends.cacheHitRate}
            color="hsl(var(--warning))"
            unit="%"
            isPercentage
          />
        </div>
      </GlassCardV2>

      {/* System Health & Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCardV2>
          <h3 className="text-lg font-semibold text-[hsl(var(--text))] mb-4">System Health</h3>
          <div className="space-y-4">
            <HealthMetric
              label="Error Rate"
              value={`${(performance.errorRate * 100).toFixed(2)}%`}
              status={performance.errorRate < 0.01 ? 'good' : performance.errorRate < 0.05 ? 'warning' : 'critical'}
            />
            <HealthMetric
              label="Scans per Minute"
              value={usage.scansPerMinute.toFixed(1)}
              status="good"
            />
            <HealthMetric
              label="Last Update"
              value={new Date(health.lastUpdate).toLocaleTimeString()}
              status="good"
            />
          </div>
        </GlassCardV2>

        <GlassCardV2>
          <h3 className="text-lg font-semibold text-[hsl(var(--text))] mb-4">Top Providers</h3>
          <div className="space-y-3">
            {performance.topProviders.map((provider: any, index: number) => (
              <ProviderMetric
                key={provider.provider}
                name={provider.provider}
                count={provider.count}
                rank={index + 1}
              />
            ))}
          </div>
        </GlassCardV2>
      </div>

      {/* Regional Distribution */}
      <GlassCardV2>
        <h3 className="text-lg font-semibold text-[hsl(var(--text))] mb-4">Regional Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {usage.topRegions.map((region: any, index: number) => (
            <RegionCard
              key={region.region}
              region={region.region}
              count={region.count}
              rank={index + 1}
            />
          ))}
        </div>
      </GlassCardV2>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  icon: React.ReactNode
  trend: 'up' | 'down'
  color: string
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, trend, color }) => {
  return (
    <GlassCardV2>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[hsl(var(--muted))]">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className="flex items-center gap-2">
          {icon}
          <motion.div
            animate={{ rotate: trend === 'up' ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-[hsl(var(--success))]" />
            ) : (
              <TrendingDown className="w-4 h-4 text-[hsl(var(--danger))]" />
            )}
          </motion.div>
        </div>
      </div>
    </GlassCardV2>
  )
}

interface TrendChartProps {
  title: string
  data: Array<{ timestamp: number; value: number }>
  color: string
  unit: string
  isPercentage?: boolean
}

const TrendChart: React.FC<TrendChartProps> = ({ title, data, color, unit, isPercentage = false }) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[hsl(var(--muted))]">No data available</p>
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1

  return (
    <div>
      <h4 className="text-sm font-medium text-[hsl(var(--text))] mb-2">{title}</h4>
      <div className="h-20 flex items-end gap-1">
        {data.map((point, index) => {
          const height = ((point.value - minValue) / range) * 100
          return (
            <motion.div
              key={index}
              className="bg-current rounded-sm"
              style={{ 
                width: `${100 / data.length}%`,
                height: `${height}%`,
                backgroundColor: color
              }}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-xs text-[hsl(var(--muted))] mt-2">
        <span>{isPercentage ? `${(minValue * 100).toFixed(0)}${unit}` : `${minValue.toFixed(0)}${unit}`}</span>
        <span>{isPercentage ? `${(maxValue * 100).toFixed(0)}${unit}` : `${maxValue.toFixed(0)}${unit}`}</span>
      </div>
    </div>
  )
}

interface HealthMetricProps {
  label: string
  value: string
  status: 'good' | 'warning' | 'critical'
}

const HealthMetric: React.FC<HealthMetricProps> = ({ label, value, status }) => {
  const statusColors = {
    good: 'text-[hsl(var(--success))]',
    warning: 'text-[hsl(var(--warning))]',
    critical: 'text-[hsl(var(--danger))]'
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[hsl(var(--text))]">{label}</span>
      <span className={`text-sm font-medium ${statusColors[status]}`}>{value}</span>
    </div>
  )
}

interface ProviderMetricProps {
  name: string
  count: number
  rank: number
}

const ProviderMetric: React.FC<ProviderMetricProps> = ({ name, count, rank }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center text-white text-xs font-bold">
          {rank}
        </div>
        <span className="text-sm text-[hsl(var(--text))]">{name}</span>
      </div>
      <span className="text-sm font-medium text-[hsl(var(--muted))]">{count}</span>
    </div>
  )
}

interface RegionCardProps {
  region: string
  count: number
  rank: number
}

const RegionCard: React.FC<RegionCardProps> = ({ region, count, rank }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-[hsl(var(--glass))] rounded-lg border border-[hsl(var(--glass-border))]">
      <div className="flex items-center gap-3">
        <Globe className="w-4 h-4 text-[hsl(var(--accent))]" />
        <span className="text-sm font-medium text-[hsl(var(--text))]">{region}</span>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-[hsl(var(--text))]">{count}</div>
        <div className="text-xs text-[hsl(var(--muted))]">#{rank}</div>
      </div>
    </div>
  )
}
