'use client'

import { Bell } from 'lucide-react'
import { MONTHS } from '@/lib/types'

interface YearSummaryProps {
  summary: { month: number; total: number; count: number }[]
  currentMonth: number
  onMonthClick: (month: number) => void
  hideValues?: boolean
  mesesPendentes?: number[]
}

export function YearSummary({
  summary,
  currentMonth,
  onMonthClick,
  hideValues = false,
  mesesPendentes = [],
}: YearSummaryProps) {
  const formatCurrency = (value: number) => {
    if (hideValues) return 'R$ ••••••'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const yearTotal = summary.reduce((sum, m) => sum + m.total, 0)
  const totalProjects = summary.reduce((sum, m) => sum + m.count, 0)

  return (
    <div className="rounded-lg border bg-card p-4 sm:p-6">
      <h3 className="mb-4 text-sm font-medium text-muted-foreground">Resumo Anual</h3>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
        {summary.map((item) => {
          const temPendencia = mesesPendentes.includes(item.month)
          return (
            <button
              key={item.month}
              onClick={() => onMonthClick(item.month)}
              title={temPendencia ? 'Tem projeto(s) sem entrada lançada' : undefined}
              className={`relative rounded-lg p-2 text-center transition-colors hover:bg-accent ${
                item.month === currentMonth ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              {temPendencia && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm">
                  <Bell className="h-2.5 w-2.5" fill="currentColor" />
                </span>
              )}
              <div className="text-xs font-medium">{MONTHS[item.month - 1].slice(0, 3)}</div>
              <div className="mt-1 text-xs">
                {item.count > 0 ? (
                  <>
                    <span className="font-semibold">{item.count}</span>
                    <span className="text-muted-foreground"> proj</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
      <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-sm text-muted-foreground">Total de Projetos: </span>
          <span className="font-semibold">{totalProjects}</span>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Faturamento Anual: </span>
          <span className="font-semibold text-primary">{formatCurrency(yearTotal)}</span>
        </div>
      </div>
    </div>
  )
}