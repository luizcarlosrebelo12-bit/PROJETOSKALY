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
    name: name.length > 10 ? name.substring(0, 10) + '...' : name,
    fullName: name,
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
        fontSize={11}
        fontWeight="bold"
      >
        {`${(percent).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-3 sm:p-4">
      <h3 className="mb-3 text-center text-sm font-semibold text-foreground sm:text-base">
        Por Arquiteto
      </h3>
      <div className="flex flex-col items-center gap-3 sm:gap-4">
        <div className="h-36 w-36 sm:h-44 sm:w-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={55}
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
        <div className="flex max-w-full flex-wrap justify-center gap-2 text-xs sm:text-sm">
          {data.slice(0, 4).map((item, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <div 
                className="h-3 w-3 shrink-0 rounded-full" 
                style={{ backgroundColor: item.color }} 
              />
              <span className="truncate text-foreground">
                {item.name}: <strong>{item.value}</strong>
              </span>
            </div>
          ))}
        </div>
        {data.length > 4 && (
          <div className="text-xs text-muted-foreground">
            +{data.length - 4} outros
          </div>
        )}
      </div>
    </div>
  )
}
