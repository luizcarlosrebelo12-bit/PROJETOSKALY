'use client'

import { useState, useEffect, useCallback } from 'react'
import { EvaluationTable } from '@/components/evaluation-table'
import { getEvaluationProjects } from '@/app/actions/projects'
import type { Project } from '@/lib/types'

export default function AvaliacaoPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getEvaluationProjects()
      setProjects(data)
    } catch (error) {
      console.error('Error fetching evaluation projects:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
        <div className="px-4 py-3 md:px-6">
          <h1 className="text-lg font-bold text-foreground">Projetos em Avaliação</h1>
          <p className="text-xs text-muted-foreground">
            Prospecções em andamento. Confirme o fechamento para lançar no mês certo.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 p-4 md:p-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <EvaluationTable projects={projects} onRefresh={fetchData} />
        )}
      </main>
    </>
  )
}