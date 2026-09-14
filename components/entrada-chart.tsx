'use client'

import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { MONTHS_SHORT } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Ajuste este tipo conforme o nome real dos campos no seu banco/tipo Entrada.
// origem_entrada: 'EIXO' | 'OUTROS' | 'EU' | 'EIXO-OUTROS'
export interface EntradaRecord {
  data_entrada: string // formato ISO 'YYYY-MM-DD' (ajuste se for diferente)
  valor_entrada: number
  origem_entrada: string
}

const ORIGENS = ['EIXO', 'OUTROS', 'EU', 'EIXO-OUTROS'] as const

interface EntradaChartProps {
  entradas: EntradaRecord[]
  currentMonth: number
  hideValues?: boolean
}

// Tick customizado usando classe do Tailwind (fill-foreground),
// que resolve corretamente a cor certa em cada tema.
function AxisTick({ x, y, payload, textAnchor = 'middle', dy = 8 }: any) {
  return (
    <text
      x={x}
      y={y}
      dy={dy}
      textAnchor={textAnchor}
      className="fill-foreground text-[11px]"
    >
      {payload.value}
    </text>
  )
}

function YAxisTick({ x, y, payload }: any) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" className="fill-foreground text-[10px]">
      {payload.value}
    </text>
  )
}

function getMonthFromDate(dateStr: string): number {
  // Espera 'YYYY-MM-DD'. Se seu campo vier em outro formato (ex: dd/mm/yyyy),
  // ajuste esta função.
  const [, month] = dateStr.split('-')
  return Number(month)
}

export function EntradaChart({ entradas, currentMonth, hideValues = false }: EntradaChartProps) {
  const [origemFiltro, setOrigemFiltro] = useState<string>('todas')

  const entradasFiltradas = useMemo(() => {
    if (origemFiltro === 'todas') return entradas
    return entradas.filter((e) => e.origem_entrada === origemFiltro)
  }, [entradas, origemFiltro])

  const summary = useMemo(() => {
    const base = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      count: 0,
      total: 0,
    }))

    for (const entrada of entradasFiltradas) {
      const month = getMonthFromDate(entrada.data_entrada)
      if (month >= 1 && month <= 12) {
        base[month - 1].count += 1
        base[month - 1].total += entrada.valor_entrada
      }
    }

    return base
  }, [entradasFiltradas])

  const hasData = summary.some((m) => m.count > 0)

  const formatCurrency = (value: number) => {
    if (hideValues) return 'R$ ••••'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatCurrencyCompact = (value: number) => {
    if (hideValues) return '••••'
    if (value === 0) return 'R$ 0'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }

  const data = summary.map((m) => ({
    name: MONTHS_SHORT[m.month - 1],
    count: m.count,
    total: m.total,
    isCurrent: m.month === currentMonth,
  }))

  const monthsWithEntrada = data.filter((m) => m.count > 0)

  const totalCount = summary.reduce((sum, m) => sum + m.count, 0)
  const totalValue = summary.reduce((sum, m) => sum + m.total, 0)

  const filtroSelect = (
    <Select value={origemFiltro} onValueChange={setOrigemFiltro}>
      <SelectTrigger className="h-8 w-[150px] text-xs">
        <SelectValue placeholder="Origem" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todas">Todas</SelectItem>
        {ORIGENS.map((origem) => (
          <SelectItem key={origem} value={origem}>
            {origem}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  if (!hasData) {
    return (
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground sm:text-base">
            Entradas por Mês
          </h3>
          {filtroSelect}
        </div>
        <p className="py-10 text-center text-sm text-muted-foreground">
          {origemFiltro === 'todas'
            ? 'Nenhuma entrada registrada ainda'
            : `Nenhuma entrada com origem "${origemFiltro}"`}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground sm:text-base">
          Entradas por Mês
        </h3>
        {filtroSelect}
      </div>
      <div className="h-[180px] w-full sm:h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 8 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={<AxisTick />}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={<YAxisTick />}
              tickFormatter={formatCurrencyCompact}
              width={48}
            />
            <Tooltip
              cursor={{ fill: 'var(--muted-foreground)', opacity: 0.1 }}
              wrapperStyle={{ zIndex: 50, outline: 'none' }}
              formatter={(value: number, name: string, item: any) => {
                const count = item?.payload?.count ?? 0
                return [`${formatCurrency(value)} · ${count} projeto(s)`, 'Entradas']
              }}
              labelFormatter={(label) => `Mês: ${label}`}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                backgroundColor: 'var(--popover)',
                color: 'var(--popover-foreground)',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              }}
              labelStyle={{ color: 'var(--popover-foreground)', marginBottom: 4 }}
              itemStyle={{ color: 'var(--popover-foreground)' }}
            />
            <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={28}>
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