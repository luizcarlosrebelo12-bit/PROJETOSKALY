'use client'

import { useState, useEffect, useCallback } from 'react'
import { Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react'
import { ProjectTable } from '@/components/project-table'
import { YearSummary } from '@/components/year-summary'
import { StatusChart } from '@/components/status-chart'
import { ArchitectChart } from '@/components/architect-chart'
import { Button } from '@/components/ui/button'
import { getProjects, getYearSummary } from '@/app/actions/projects'
import { useHideValues } from '@/components/hide-values-provider'
import type { Project } from '@/lib/types'

export default function DashboardPage() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [projects, setProjects] = useState<Project[]>([])
  const [summary, setSummary] = useState<{ month: number; total: number; count: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { hideValues, toggleHideValues } = useHideValues()

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

  const handleMonthClick = (clickedMonth: number) => {
    setMonth(clickedMonth)
  }

  const handleToday = () => {
    const now = new Date()
    setYear(now.getFullYear())
    setMonth(now.getMonth() + 1)
  }

  const isCurrentMonth =
    year === new Date().getFullYear() && month === new Date().getMonth() + 1

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
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

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border bg-background px-1 py-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setYear((y) => y - 1)}
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
                onClick={() => setYear((y) => y + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              disabled={isCurrentMonth}
            >
              Hoje
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 p-4 md:p-6">
        <YearSummary
          summary={summary}
          currentMonth={month}
          onMonthClick={handleMonthClick}
          hideValues={hideValues}
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
              hideValues={hideValues}
            />
            <div className="grid gap-6 lg:grid-cols-2">
              <StatusChart projects={projects} />
              <ArchitectChart projects={projects} />
            </div>
          </>
        )}
      </main>
    </>
  )
}