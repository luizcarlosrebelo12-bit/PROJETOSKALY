'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, Users, Building2, Clock, Trash2 } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getYearStats, deleteYear } from '@/app/actions/projects'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#84cc16', '#ef4444', '#14b8a6']

interface YearStats {
  totalProjects: number
  totalValue: number
  byBrand: { name: string; value: number; percent: number }[]
  byArchitect: { name: string; value: number; percent: number }[]
  avgDays: number
}

export default function EstatisticasPage() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [stats, setStats] = useState<YearStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year])

  async function fetchStats() {
    setIsLoading(true)
    try {
      const data = await getYearStats(year)
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteYear = async () => {
    if (confirmText !== String(year)) return
    setIsDeleting(true)
    try {
      await deleteYear(year)
      await fetchStats()
    } catch (error) {
      console.error('Error deleting year:', error)
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setConfirmText('')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

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
    <>
      <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <h1 className="text-lg font-bold text-foreground">Estatísticas</h1>
          <div className="flex items-center gap-2">
            {stats && stats.totalProjects > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-destructive/40 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive sm:gap-2 sm:text-sm"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                Excluir Ano
              </Button>
            )}
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
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground sm:h-12 sm:w-12" />
            <h2 className="mt-3 text-lg font-semibold text-foreground sm:mt-4 sm:text-xl">Nenhum projeto em {year}</h2>
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
                  <span className="text-xs text-muted-foreground sm:text-sm">Projetos</span>
                  <Building2 className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4" />
                </div>
                <div className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{stats.totalProjects}</div>
              </Card>
              <Card className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground sm:text-sm">Valor Total</span>
                  <Calendar className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4" />
                </div>
                <div className="mt-1 text-lg font-bold text-foreground sm:text-2xl">
                  {formatCurrency(stats.totalValue)}
                </div>
              </Card>
              <Card className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground sm:text-sm">Arquitetos</span>
                  <Users className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4" />
                </div>
                <div className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{stats.byArchitect.length}</div>
              </Card>
              <Card className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground sm:text-sm">Média Dias</span>
                  <Clock className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4" />
                </div>
                <div className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{stats.avgDays}</div>
              </Card>
            </div>

            {/* Gráficos de Pizza */}
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              {/* Por Marca */}
              <Card className="p-4 sm:p-6">
                <h3 className="mb-4 text-center text-sm font-semibold text-foreground sm:text-base">
                  Por Marca
                </h3>
                <div className="flex flex-col items-center gap-4">
                  <div className="mx-auto aspect-square w-full max-w-[220px] sm:max-w-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.byBrand}
                          cx="50%"
                          cy="50%"
                          innerRadius="45%"
                          outerRadius="80%"
                          paddingAngle={3}
                          dataKey="value"
                          label={renderLabel}
                          labelLine={false}
                        >
                          {stats.byBrand.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex w-full flex-wrap justify-center gap-x-4 gap-y-2 text-xs sm:text-sm">
                    {stats.byBrand.slice(0, 6).map((item, index) => (
                      <div key={index} className="flex max-w-full items-center gap-1.5" title={item.name}>
                        <div
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="max-w-[160px] truncate text-foreground sm:max-w-[200px]">
                          {item.name}: <strong>{item.value}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                  {stats.byBrand.length > 6 && (
                    <span className="text-xs text-muted-foreground">
                      +{stats.byBrand.length - 6} outras
                    </span>
                  )}
                </div>
              </Card>

              {/* Por Arquiteto */}
              <Card className="p-4 sm:p-6">
                <h3 className="mb-4 text-center text-sm font-semibold text-foreground sm:text-base">
                  Por Arquiteto
                </h3>
                <div className="flex flex-col items-center gap-4">
                  <div className="mx-auto aspect-square w-full max-w-[220px] sm:max-w-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.byArchitect}
                          cx="50%"
                          cy="50%"
                          innerRadius="45%"
                          outerRadius="80%"
                          paddingAngle={3}
                          dataKey="value"
                          label={renderLabel}
                          labelLine={false}
                        >
                          {stats.byArchitect.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex w-full flex-wrap justify-center gap-x-4 gap-y-2 text-xs sm:text-sm">
                    {stats.byArchitect.slice(0, 6).map((item, index) => (
                      <div key={index} className="flex max-w-full items-center gap-1.5" title={item.name}>
                        <div
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="max-w-[160px] truncate text-foreground sm:max-w-[200px]">
                          {item.name}: <strong>{item.value}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                  {stats.byArchitect.length > 6 && (
                    <span className="text-xs text-muted-foreground">
                      +{stats.byArchitect.length - 6} outros
                    </span>
                  )}
                </div>
              </Card>
            </div>

            {/* Gráfico de barras - Quantidade por marca */}
            <Card className="p-4 sm:p-6">
              <h3 className="mb-4 text-center text-sm font-semibold text-foreground sm:text-base">
                Projetos por Marca
              </h3>
              <div className="h-64 sm:h-80 lg:h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.byBrand}
                    layout="vertical"
                    margin={{ left: 5, right: 20, top: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      stroke="var(--muted-foreground)"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value} projeto(s)`, 'Quantidade']}
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                        borderRadius: 'var(--radius)',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </>
        )}
      </main>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) setConfirmText('')
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir todos os dados de {year}?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai apagar <strong>permanentemente</strong> todos os projetos de {year} do banco de dados,
              junto com as pastas, arquivos e imagens 3D vinculados a eles. Essa ação libera espaço no banco,
              mas <strong>não pode ser desfeita</strong>.
              <br />
              <br />
              Para confirmar, digite <strong>{year}</strong> abaixo:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={String(year)}
            autoComplete="off"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteYear}
              disabled={isDeleting || confirmText !== String(year)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir tudo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}