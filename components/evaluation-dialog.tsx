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
import { createEvaluationProject, updateEvaluationProject } from '@/app/actions/projects'
import { EVALUATION_STAGES, COLOR_PALETTE } from '@/lib/types'
import type { Project, EvaluationFormData, EvaluationStage } from '@/lib/types'

interface EvaluationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project | null
  onSuccess: () => void
}

const EMPTY_FORM: EvaluationFormData = {
  marca: '',
  cidade: '',
  modalidade: '',
  arquiteto: '',
  valor: 0,
  evaluation_stage: 'STAND BY',
  cor: COLOR_PALETTE[0],
}

export function EvaluationDialog({ open, onOpenChange, project, onSuccess }: EvaluationDialogProps) {
  const [formData, setFormData] = useState<EvaluationFormData>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (project) {
      setFormData({
        marca: project.marca || '',
        cidade: project.cidade || '',
        modalidade: project.modalidade || '',
        arquiteto: project.arquiteto || '',
        valor: Number(project.valor) || 0,
        evaluation_stage: (project.evaluation_stage as EvaluationStage) || 'STAND BY',
        cor: project.cor || COLOR_PALETTE[0],
      })
    } else {
      setFormData(EMPTY_FORM)
    }
  }, [project, open])

  const handleSubmit = async () => {
    setIsSaving(true)
    try {
      if (project) {
        await updateEvaluationProject(project.id, formData)
      } else {
        await createEvaluationProject(formData)
      }
      onSuccess()
    } catch (error) {
      console.error('Error saving evaluation project:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {project ? 'Editar Projeto em Avaliação' : 'Novo Projeto em Avaliação'}
          </DialogTitle>
          <DialogDescription>
            Cadastre a prospecção. Quando o fechamento for confirmado, o projeto entra
            automaticamente no mês certo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="marca">Marca</Label>
            <Input
              id="marca"
              value={formData.marca}
              onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cidade">Cidade</Label>
            <Input
              id="cidade"
              value={formData.cidade}
              onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="modalidade">Modalidade</Label>
              <Input
                id="modalidade"
                value={formData.modalidade}
                onChange={(e) => setFormData({ ...formData, modalidade: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="arquiteto">Arquiteto</Label>
              <Input
                id="arquiteto"
                value={formData.arquiteto}
                onChange={(e) => setFormData({ ...formData, arquiteto: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="valor">Valor Estimado</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: Number(e.target.value) })}
            />
          </div>

          <div className="grid gap-2">
            <Label>Etiqueta</Label>
            <Select
              value={formData.evaluation_stage}
              onValueChange={(v) => setFormData({ ...formData, evaluation_stage: v as EvaluationStage })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVALUATION_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Cor no gráfico</Label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, cor: color })}
                  className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    formData.cor === color ? 'border-foreground' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Cor ${color}`}
                />
              ))}
              <input
                type="color"
                value={formData.cor}
                onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                className="h-7 w-9 cursor-pointer rounded border bg-transparent p-0.5"
                title="Escolher outra cor"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !formData.marca}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}