'use client'

import { useState, useEffect, useCallback } from 'react'
import { MonthSelector } from '@/components/month-selector'
import { ProjectTable } from '@/components/project-table'
import { YearSummary } from '@/components/year-summary'
import { StatusChart } from '@/components/status-chart'
import { ArchitectChart } from '@/components/architect-chart'
import { getProjects, getYearSummary } from '@/app/actions/projects'
import type { Project } from '@/lib/types'

export default function DashboardPage() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [projects, setProjects] = useState<Project[]>([])
  const [summary, setSummary] = useState<{ month: number; total: number; count: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
          <MonthSelector year={year} month={month} onChange={handleMonthChange} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 p-4 md:p-6">
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
    </>
  )
}