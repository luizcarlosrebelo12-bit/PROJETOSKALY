'use client'

import { useState, useEffect, useCallback } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EvaluationTable } from '@/components/evaluation-table'
import { EvaluationBrandChart } from '@/components/evaluation-brand-chart'
import { getEvaluationProjects } from '@/app/actions/projects'
import { useHideValues } from '@/components/hide-values-provider'
import type { Project } from '@/lib/types'

export default function AvaliacaoPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { hideValues, toggleHideValues } = useHideValues()

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
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">Projetos em Avaliação</h1>
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
            <p className="text-xs text-muted-foreground">
              Prospecções em andamento. Confirme o fechamento para lançar no mês certo.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 p-4 md:p-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            <EvaluationBrandChart projects={projects} />
            <EvaluationTable projects={projects} onRefresh={fetchData} hideValues={hideValues} />
          </>
        )}
      </main>
    </>
  )
}