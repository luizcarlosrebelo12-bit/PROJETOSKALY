'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { MONTHS_SHORT } from '@/lib/types'

interface EntradaChartProps {
  summary: { month: number; count: number; total: number }[]
  currentMonth: number
  hideValues?: boolean
}

export function EntradaChart({ summary, currentMonth, hideValues = false }: EntradaChartProps) {
  const hasData = summary.some((m) => m.count > 0)

  if (!hasData) {
    return (
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <h3 className="mb-4 text-center text-sm font-semibold text-foreground sm:text-base">
          Entradas por Mês
        </h3>
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma entrada registrada ainda
        </p>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    if (hideValues) return 'R$ ••••'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const data = summary.map((m) => ({
    name: MONTHS_SHORT[m.month - 1],
    count: m.count,
    total: m.total,
    isCurrent: m.month === currentMonth,
  }))

  // Só os meses com entrada, pra lista abaixo do gráfico
  const monthsWithEntrada = data.filter((m) => m.count > 0)

  const totalCount = summary.reduce((sum, m) => sum + m.count, 0)
  const totalValue = summary.reduce((sum, m) => sum + m.total, 0)

  return (
    <div className="rounded-lg border bg-card p-4 sm:p-6">
      <h3 className="mb-4 text-center text-sm font-semibold text-foreground sm:text-base">
        Entradas por Mês
      </h3>
      <div className="h-[180px] w-full sm:h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted-foreground))', opacity: 0.1 }}
              wrapperStyle={{ zIndex: 50, outline: 'none' }}
              formatter={(value: number, name: string) =>
                name === 'count' ? [`${value} projeto(s)`, 'Entradas'] : [formatCurrency(value), 'Total']
              }
              labelFormatter={(label) => `Mês: ${label}`}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                backgroundColor: 'hsl(var(--popover))',
                color: 'hsl(var(--popover-foreground))',
                border: '1px solid hsl(var(--border))',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              }}
              labelStyle={{ color: 'hsl(var(--popover-foreground))', marginBottom: 4 }}
              itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isCurrent ? '#3b82f6' : '#93c5fd'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Lista dos valores por mês — evita sobreposição de texto em cima das barras */}
      {!hideValues && (
        <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 border-t pt-2 text-[11px] text-muted-foreground">
          {monthsWithEntrada.map((m) => (
            <span key={m.name}>
              <strong className="text-foreground">{m.name}:</strong> {formatCurrency(m.total)}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs sm:gap-4 sm:text-sm">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 shrink-0 rounded-full bg-blue-500" />
          <span className="text-foreground">
            Total do ano: <strong>{totalCount}</strong> entradas
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-foreground">
            Valor total: <strong>{formatCurrency(totalValue)}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}