'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { confirmEvaluationProject } from '@/app/actions/projects'
import { MONTHS } from '@/lib/types'
import type { Project } from '@/lib/types'

interface ConfirmClosureDialogProps {
  project: Project | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ConfirmClosureDialog({ project, onOpenChange, onSuccess }: ConfirmClosureDialogProps) {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [dataInicio, setDataInicio] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (project) {
      const now = new Date()
      setYear(now.getFullYear())
      setMonth(now.getMonth() + 1)
      setDataInicio('')
    }
  }, [project])

  if (!project) return null

  const handleConfirm = async () => {
    setIsSaving(true)
    try {
      await confirmEvaluationProject(project.id, year, month, dataInicio || undefined)
      onSuccess()
    } catch (error) {
      console.error('Error confirming closure:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={!!project} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Fechamento</DialogTitle>
          <DialogDescription>
            &quot;{project.marca}&quot; vai sair de Avaliação e entrar direto na tabela de
            projetos do mês escolhido.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Mês de início</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="year">Ano</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="data_inicio">Data de início (opcional)</Label>
            <Input
              id="data_inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isSaving}>
            {isSaving ? 'Confirmando...' : 'Confirmar Fechamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}