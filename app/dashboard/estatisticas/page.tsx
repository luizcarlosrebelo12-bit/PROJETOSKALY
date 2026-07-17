'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LogOut, Moon, Sun, ChevronLeft, ChevronRight, Calendar, Users, Building2, Clock } from 'lucide-react'
import { useTheme } from 'next-themes'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getYearStats } from '@/app/actions/projects'
import { createClient } from '@/lib/supabase/client'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#84cc16', '#ef4444', '#14b8a6']

interface YearStats {
  totalProjects: number
  totalValue: number
  byBrand: { name: string; value: number; percent: number }[]
  byArchitect: { name: string; value: number; percent: number }[]
  avgDays: number
}

export default function EstatisticasPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [stats, setStats] = useState<YearStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
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
    fetchStats()
  }, [year])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const truncateName = (name: string, max: number = 10) => {
    return name.length > max ? name.substring(0, max) + '...' : name
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
        fontSize={11}
        fontWeight="bold"
      >
        {`${(percent).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Image
              src="/logo.png"
              alt="KM Logo"
              width={36}
              height={36}
              className="rounded-lg sm:h-10 sm:w-10"
            />
            <div>
              <h1 className="text-sm font-bold text-foreground sm:text-lg">Estatisticas</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">KM Arquitetura</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <div className="flex items-center gap-0.5 rounded-lg border bg-background px-1 py-0.5 sm:gap-1 sm:px-2 sm:py-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 sm:h-7 sm:w-7"
                onClick={() => setYear(year - 1)}
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <span className="min-w-12 text-center text-sm font-semibold text-foreground sm:min-w-16 sm:text-base">
                {year}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 sm:h-7 sm:w-7"
                onClick={() => setYear(year + 1)}
              >
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
            {mounted && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 sm:h-9 sm:w-9"
                onClick={toggleTheme} 
                title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={handleLogout} title="Sair">
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 p-3 sm:space-y-6 sm:p-4">
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
              Nao ha projetos cadastrados para este ano.
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
                  <span className="text-xs text-muted-foreground sm:text-sm">Media Dias</span>
                  <Clock className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4" />
                </div>
                <div className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{stats.avgDays}</div>
              </Card>
            </div>

            {/* Graficos de Pizza */}
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              {/* Por Marca */}
              <Card className="p-3 sm:p-4">
                <h3 className="mb-3 text-center text-sm font-semibold text-foreground sm:text-base">
                  Por Marca
                </h3>
                <div className="flex flex-col items-center gap-3">
                  <div className="h-36 w-36 sm:h-44 sm:w-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.byBrand}
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={55}
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
                  <div className="flex max-w-full flex-wrap justify-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
                    {stats.byBrand.slice(0, 5).map((item, index) => (
                      <div key={index} className="flex items-center gap-1">
                        <div 
                          className="h-2.5 w-2.5 shrink-0 rounded-full sm:h-3 sm:w-3" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                        />
                        <span className="text-foreground">
                          {truncateName(item.name, 8)}: <strong>{item.value}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                  {stats.byBrand.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{stats.byBrand.length - 5} outras
                    </span>
                  )}
                </div>
              </Card>

              {/* Por Arquiteto */}
              <Card className="p-3 sm:p-4">
                <h3 className="mb-3 text-center text-sm font-semibold text-foreground sm:text-base">
                  Por Arquiteto
                </h3>
                <div className="flex flex-col items-center gap-3">
                  <div className="h-36 w-36 sm:h-44 sm:w-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.byArchitect}
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={55}
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
                  <div className="flex max-w-full flex-wrap justify-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
                    {stats.byArchitect.slice(0, 5).map((item, index) => (
                      <div key={index} className="flex items-center gap-1">
                        <div 
                          className="h-2.5 w-2.5 shrink-0 rounded-full sm:h-3 sm:w-3" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                        />
                        <span className="text-foreground">
                          {truncateName(item.name, 8)}: <strong>{item.value}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                  {stats.byArchitect.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{stats.byArchitect.length - 5} outros
                    </span>
                  )}
                </div>
              </Card>
            </div>

            {/* Grafico de barras - Quantidade por marca */}
            <Card className="p-3 sm:p-4">
              <h3 className="mb-3 text-center text-sm font-semibold text-foreground sm:text-base">
                Projetos por Marca
              </h3>
              <div className="h-56 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={stats.byBrand.map(b => ({ ...b, shortName: truncateName(b.name, 8) }))} 
                    layout="vertical" 
                    margin={{ left: 5, right: 15, top: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} />
                    <YAxis 
                      type="category" 
                      dataKey="shortName" 
                      width={65} 
                      stroke="var(--muted-foreground)"
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value} projeto(s)`, 'Quantidade']}
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                        borderRadius: 'var(--radius)',
                        fontSize: '11px',
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
    </div>
  )
}
