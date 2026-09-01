'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Wallet,
  TrendingUp,
  DollarSign,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  getYearStats,
  getEntradaSummary,
  getPagamentoFinalSummary,
} from '@/app/actions/projects'
import { useHideValues } from '@/components/hide-values-provider'
import { EntradaChart } from '@/components/entrada-chart'
import { PagamentoFinalChart } from '@/components/pagamento-final-chart'
import { DetalhamentoTable } from '@/components/detalhamento-table'

interface ProjetoDetalhe {
  marca: string
  cidade: string
  valor: number
  data: string
}

interface MonthSummary {
  month: number
  count: number
  total: number
  projetos: ProjetoDetalhe[]
}

interface YearStats {
  totalProjects: number
  totalValue: number
  totalPagamentosFinais: number
  receitaTotal: number
  mediaMensal: number
}

export default function FinanceiroPage() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [stats, setStats] = useState<YearStats | null>(null)
  const [entradaSummary, setEntradaSummary] = useState<MonthSummary[]>([])
  const [pagamentoSummary, setPagamentoSummary] = useState<MonthSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { hideValues, toggleHideValues } = useHideValues()

  const currentMonth = new Date().getMonth() + 1

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year])

  async function fetchData() {
    setIsLoading(true)
    try {
      const [statsData, entradaData, pagamentoData] = await Promise.all([
        getYearStats(year),
        getEntradaSummary(year),
        getPagamentoFinalSummary(year),
      ])
      setStats(statsData)
      setEntradaSummary(entradaData)
      setPagamentoSummary(pagamentoData)
    } catch (error) {
      console.error('Error fetching financeiro data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    if (hideValues) return 'R$ ••••'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Lista achatada, ordenada da entrada mais recente pra mais antiga
  const entradaList = entradaSummary
    .flatMap((m) => m.projetos)
    .sort((a, b) => (a.data < b.data ? 1 : -1))

  const pagamentoList = pagamentoSummary
    .flatMap((m) => m.projetos)
    .sort((a, b) => (a.data < b.data ? 1 : -1))

  const entradaChartSummary = entradaSummary.map((m) => ({
    month: m.month,
    count: m.count,
    total: m.total,
  }))

  const pagamentoChartSummary = pagamentoSummary.map((m) => ({
    month: m.month,
    count: m.count,
    total: m.total,
  }))

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground">Financeiro</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleHideValues}
              title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
            >
              {hideValues ? (
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Eye className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
          </div>
          <div className="flex items-center gap-1 rounded-lg border bg-background px-1 py-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setYear(year - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-16 text-center text-base font-semibold text-foreground">
              {year}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setYear(year + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 p-4 sm:space-y-6 md:p-6">
        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs sm:gap-2 sm:text-sm">
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            Voltar
          </Button>
        </Link>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : !stats || stats.totalProjects === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center sm:p-8">
            <Wallet className="mx-auto h-10 w-10 text-muted-foreground sm:h-12 sm:w-12" />
            <h2 className="mt-3 text-lg font-semibold text-foreground sm:mt-4 sm:text-xl">
              Nenhum dado financeiro em {year}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-base">
              Não há projetos cadastrados para este ano.
            </p>
          </div>
        ) : (
          <>
            {/* Cards de resumo */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <Card className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground sm:text-sm">Valor em Projetos</span>
                  <Layers className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4" />
                </div>
                <div className="mt-1 text-lg font-bold text-foreground sm:text-2xl">
                  {formatCurrency(stats.totalValue)}
                </div>
              </Card>
              <Card className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground sm:text-sm">Entradas Recebidas</span>
                  <DollarSign className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4" />
                </div>
                <div className="mt-1 text-lg font-bold text-foreground sm:text-2xl">
                  {formatCurrency(entradaList.reduce((sum, p) => sum + p.valor, 0))}
                </div>
              </Card>
              <Card className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground sm:text-sm">Pagamentos Finais</span>
                  <Wallet className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4" />
                </div>
                <div className="mt-1 text-lg font-bold text-foreground sm:text-2xl">
                  {formatCurrency(stats.totalPagamentosFinais)}
                </div>
              </Card>
              <Card className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground sm:text-sm">Receita Total</span>
                  <TrendingUp className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4" />
                </div>
                <div className="mt-1 text-lg font-bold text-foreground sm:text-2xl">
                  {formatCurrency(stats.receitaTotal)}
                </div>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              <EntradaChart
                summary={entradaChartSummary}
                currentMonth={currentMonth}
                hideValues={hideValues}
              />
              <PagamentoFinalChart
                summary={pagamentoChartSummary}
                currentMonth={currentMonth}
                hideValues={hideValues}
              />
            </div>

            {/* Detalhamento de entradas */}
            <DetalhamentoTable
              title="Detalhamento de Entradas"
              data={entradaList}
              emptyMessage={`Nenhuma entrada registrada em ${year}`}
              formatCurrency={formatCurrency}
            />

            {/* Detalhamento de pagamentos finais */}
            <DetalhamentoTable
              title="Detalhamento de Pagamentos Finais"
              data={pagamentoList}
              emptyMessage={`Nenhum pagamento final recebido em ${year}`}
              formatCurrency={formatCurrency}
            />
          </>
        )}
      </main>
    </>
  )
}