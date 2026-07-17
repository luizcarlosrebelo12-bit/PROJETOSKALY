'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { LogOut, Moon, Sun, BarChart3 } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { MonthSelector } from '@/components/month-selector'
import { ProjectTable } from '@/components/project-table'
import { YearSummary } from '@/components/year-summary'
import { StatusChart } from '@/components/status-chart'
import { ArchitectChart } from '@/components/architect-chart'
import { getProjects, getYearSummary } from '@/app/actions/projects'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Project } from '@/lib/types'

export default function DashboardPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [projects, setProjects] = useState<Project[]>([])
  const [summary, setSummary] = useState<{ month: number; total: number; count: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [projectsData, summaryData] = await Promise.all([
        getProjects(year, month),
        getYearSummary(year),
      ])
      setProjects(projectsData)
      setSummary(summaryData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear)
    setMonth(newMonth)
  }

  const handleMonthClick = (clickedMonth: number) => {
    setMonth(clickedMonth)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="KM Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <div>
              <h1 className="text-lg font-bold text-foreground">Gestão de Projetos</h1>
              <p className="text-xs text-muted-foreground">Kalyandra M. Moura - Arquitetura</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <MonthSelector year={year} month={month} onChange={handleMonthChange} />
            <Link href="/dashboard/estatisticas">
              <Button variant="outline" size="sm" className="hidden gap-2 md:flex" title="Estatísticas Anuais">
                <BarChart3 className="h-4 w-4" />
                Estatísticas
              </Button>
              <Button variant="ghost" size="icon" className="md:hidden" title="Estatísticas Anuais">
                <BarChart3 className="h-5 w-5" />
              </Button>
            </Link>
            {mounted && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleTheme} 
                title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-4">
        <YearSummary 
          summary={summary} 
          currentMonth={month} 
          onMonthClick={handleMonthClick} 
        />

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            <ProjectTable
              projects={projects}
              year={year}
              month={month}
              onRefresh={fetchData}
            />
            <div className="grid gap-6 lg:grid-cols-2">
              <StatusChart projects={projects} />
              <ArchitectChart projects={projects} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
