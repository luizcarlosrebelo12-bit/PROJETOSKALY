'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import type { Project } from '@/lib/types'

interface StatusChartProps {
  projects: Project[]
}

export function StatusChart({ projects }: StatusChartProps) {
  if (projects.length === 0) {
    return null
  }

  const entregues = projects.filter(p => p.andamento === 'ENTREGUE').length
  const pendentes = projects.length - entregues

  const percentEntregues = Math.round((entregues / projects.length) * 100)
  const percentPendentes = Math.round((pendentes / projects.length) * 100)

  const data = [
    { name: 'Entregues', value: entregues, color: '#22c55e', percent: percentEntregues },
    { name: 'Pendentes', value: pendentes, color: '#f59e0b', percent: percentPendentes },
  ].filter(d => d.value > 0)

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

    if (percent < 0.05) return null

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
    <div className="rounded-lg border bg-card p-3 sm:p-4">
      <h3 className="mb-3 text-center text-sm font-semibold text-foreground sm:text-base">
        Status dos Projetos
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
        <div className="flex flex-wrap justify-center gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-foreground">
              Entregues: <strong>{entregues}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-amber-500" />
            <span className="text-foreground">
              Pendentes: <strong>{pendentes}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
