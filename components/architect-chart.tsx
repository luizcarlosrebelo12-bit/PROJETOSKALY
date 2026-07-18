'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import type { Project } from '@/lib/types'

interface ArchitectChartProps {
  projects: Project[]
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#84cc16']

export function ArchitectChart({ projects }: ArchitectChartProps) {
  if (projects.length === 0) {
    return null
  }

  // Agrupa projetos por arquiteto
  const architectCount: Record<string, number> = {}
  projects.forEach((project) => {
    const arquiteto = project.arquiteto || 'Sem definir'
    architectCount[arquiteto] = (architectCount[arquiteto] || 0) + 1
  })

  const data = Object.entries(architectCount).map(([name, value], index) => ({
    name,
    value,
    color: COLORS[index % COLORS.length],
    percent: Math.round((value / projects.length) * 100),
  }))

  // Ordena por quantidade (maior primeiro)
  data.sort((a, b) => b.value - a.value)

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
    cx: number
    cy: number
    midAngle: number
    innerRadius: number
    outerRadius: number
    percent: number
  }) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    if (percent < 0.08) return null

    return (
      <text
        x={x}
        y={y}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-4 sm:p-6">
      <h3 className="mb-4 text-center text-sm font-semibold text-foreground sm:text-base">
        Por Arquiteto
      </h3>
      <div className="flex flex-col items-center gap-4">
        <div className="mx-auto aspect-square w-full max-w-[220px] sm:max-w-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="45%"
                outerRadius="80%"
                paddingAngle={3}
                dataKey="value"
                label={renderLabel}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex w-full flex-wrap justify-center gap-x-4 gap-y-2 text-xs sm:text-sm">
          {data.slice(0, 6).map((item, index) => (
            <div key={index} className="flex max-w-full items-center gap-1.5" title={item.name}>
              <div
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="max-w-[160px] truncate text-foreground sm:max-w-[200px]">
                {item.name}: <strong>{item.value}</strong>
              </span>
            </div>
          ))}
        </div>
        {data.length > 6 && (
          <div className="text-xs text-muted-foreground">
            +{data.length - 6} outros
          </div>
        )}
      </div>
    </div>
  )
}