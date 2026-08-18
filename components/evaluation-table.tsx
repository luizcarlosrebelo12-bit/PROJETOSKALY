'use client'

import { useState } from 'react'
import { Pencil, Trash2, CheckCircle2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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
import type { Project, EvaluationStage } from '@/lib/types'
import { EVALUATION_STAGE_COLORS } from '@/lib/types'
import { deleteProject } from '@/app/actions/projects'
import { EvaluationDialog } from './evaluation-dialog'
import { ConfirmClosureDialog } from './confirm-closure-dialog'

interface EvaluationTableProps {
  projects: Project[]
  onRefresh: () => void
  hideValues: boolean
}

export function EvaluationTable({ projects, onRefresh, hideValues }: EvaluationTableProps) {
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [confirmingProject, setConfirmingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const formatCurrency = (value: number) => {
    if (hideValues) return 'R$ ••••'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const handleDelete = async () => {
    if (!deletingProject) return
    setIsDeleting(true)
    try {
      await deleteProject(deletingProject.id)
      onRefresh()
    } catch (error) {
      console.error('Error deleting evaluation project:', error)
    } finally {
      setIsDeleting(false)
      setDeletingProject(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {projects.length}{' '}
          {projects.length === 1 ? 'projeto em avaliação' : 'projetos em avaliação'}
        </h2>
        <Button onClick={() => { setEditingProject(null); setIsDialogOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Projeto em Avaliação
        </Button>
      </div>

      {/* ===== TABELA — visível apenas no desktop ===== */}
      <div className="hidden rounded-lg border bg-card overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[28px]"></TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Modalidade</TableHead>
              <TableHead>Arquiteto</TableHead>
              <TableHead>Etiqueta</TableHead>
              <TableHead className="text-right">Valor Estimado</TableHead>
              <TableHead className="w-[160px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Nenhum projeto em avaliação no momento
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: project.cor || '#94a3b8' }}
                      title="Cor no gráfico"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{project.marca || '-'}</TableCell>
                  <TableCell>{project.cidade || '-'}</TableCell>
                  <TableCell>{project.modalidade || '-'}</TableCell>
                  <TableCell>{project.arquiteto || '-'}</TableCell>
                  <TableCell>
                    {project.evaluation_stage ? (
                      <Badge
                        className={EVALUATION_STAGE_COLORS[project.evaluation_stage as EvaluationStage]}
                      >
                        {project.evaluation_stage}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(project.valor))}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Confirmar fechamento"
                        onClick={() => setConfirmingProject(project)}
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditingProject(project); setIsDialogOpen(true) }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingProject(project)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ===== CARDS — visível apenas no mobile ===== */}
      <div className="space-y-3 md:hidden">
        {projects.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            Nenhum projeto em avaliação no momento
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="rounded-lg border bg-card p-4 space-y-3">
              {/* Cabeçalho do card */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <div
                    className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: project.cor || '#94a3b8' }}
                    title="Cor no gráfico"
                  />
                  <div>
                    <h3 className="font-semibold text-foreground">{project.marca || '-'}</h3>
                    <p className="text-sm text-muted-foreground">{project.cidade || '-'}</p>
                  </div>
                </div>
                {project.evaluation_stage && (
                  <Badge
                    className={EVALUATION_STAGE_COLORS[project.evaluation_stage as EvaluationStage]}
                  >
                    {project.evaluation_stage}
                  </Badge>
                )}
              </div>

              {/* Grid de informações */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm border-t pt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Modalidade</p>
                  <p className="font-medium">{project.modalidade || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Arquiteto</p>
                  <p className="font-medium">{project.arquiteto || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Valor Estimado</p>
                  <p className="font-medium">{formatCurrency(Number(project.valor))}</p>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end gap-1 border-t pt-3">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Confirmar fechamento"
                  onClick={() => setConfirmingProject(project)}
                >
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setEditingProject(project); setIsDialogOpen(true) }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeletingProject(project)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <EvaluationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        project={editingProject}
        onSuccess={() => {
          setIsDialogOpen(false)
          setEditingProject(null)
          onRefresh()
        }}
      />

      <ConfirmClosureDialog
        project={confirmingProject}
        onOpenChange={(open) => { if (!open) setConfirmingProject(null) }}
        onSuccess={() => {
          setConfirmingProject(null)
          onRefresh()
        }}
      />

      <AlertDialog open={!!deletingProject} onOpenChange={() => setDeletingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o projeto em avaliação &quot;{deletingProject?.marca}&quot;?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}