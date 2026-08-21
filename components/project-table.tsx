'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, Plus, FolderOpen } from 'lucide-react'
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
import type { Project, ProjectStatus } from '@/lib/types'
import { STATUS_COLORS } from '@/lib/types'
import { ProjectDialog } from './project-dialog'
import { deleteProject } from '@/app/actions/projects'
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

interface ProjectTableProps {
  projects: Project[]
  year: number
  month: number
  onRefresh: () => void
  hideValues?: boolean
}

// Calcula dias úteis entre duas datas (excluindo sábados e domingos)
function calculateBusinessDays(startDate: string | null, endDate: string | null): number | null {
  if (!startDate || !endDate) return null

  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')

  if (end < start) return null

  let count = 0
  const current = new Date(start)

  while (current <= end) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}

export function ProjectTable({ projects, year, month, onRefresh, hideValues = false }: ProjectTableProps) {
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const formatCurrency = (value: number) => {
    if (hideValues) return 'R$ ••••••'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Corrigido para evitar problema de timezone
  const formatDate = (date: string | null) => {
    if (!date) return '-'
    const [year, month, day] = date.split('-')
    return `${day}/${month}/${year}`
  }

  // Versão curta (sem ano) para a coluna Período, que já convive com o seletor de ano no topo
  const formatDateShort = (date: string | null) => {
    if (!date) return '-'
    const [, month, day] = date.split('-')
    return `${day}/${month}`
  }

  const handleDelete = async () => {
    if (!deletingProject) return
    setIsDeleting(true)
    try {
      await deleteProject(deletingProject.id)
      onRefresh()
    } catch (error) {
      console.error('Error deleting project:', error)
    } finally {
      setIsDeleting(false)
      setDeletingProject(null)
    }
  }

  // Total do Mês agora só considera projetos com andamento === 'ENTREGUE'
  const totalValue = projects.reduce(
    (sum, p) => sum + (p.andamento === 'ENTREGUE' ? Number(p.valor) : 0),
    0
  )
  const totalPagamentoFinal = projects.reduce(
    (sum, p) => sum + (p.andamento === 'ENTREGUE' ? Number(p.pagamento_final_valor) || 0 : 0),
    0
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {projects.length} {projects.length === 1 ? 'projeto' : 'projetos'}
        </h2>
        <Button onClick={() => { setEditingProject(null); setIsDialogOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Projeto
        </Button>
      </div>

      {/* ===== TABELA — visível apenas no desktop ===== */}
      <div className="hidden rounded-lg border bg-card overflow-x-auto md:block">
        <Table className="w-full table-fixed text-xs">
          <colgroup>
            <col className="w-[3%]" />   {/* N */}
            <col className="w-[10%]" />  {/* Marca */}
            <col className="w-[11%]" />  {/* Cidade */}
            <col className="w-[15%]" />  {/* Período (Início → Final) */}
            <col className="w-[5%]" />   {/* Dias Úteis */}
            <col className="w-[9%]" />   {/* Modalidade */}
            <col className="w-[9%]" />   {/* Arquiteto */}
            <col className="w-[10%]" />  {/* Valor */}
            <col className="w-[10%]" />  {/* Pag. Final */}
            <col className="w-[10%]" />  {/* Andamento */}
            <col className="w-[8%]" />   {/* Ações */}
          </colgroup>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="px-2 py-2">N</TableHead>
              <TableHead className="px-2 py-2">Marca</TableHead>
              <TableHead className="px-2 py-2">Cidade</TableHead>
              <TableHead className="px-2 py-2">Período</TableHead>
              <TableHead className="px-2 py-2">Dias</TableHead>
              <TableHead className="px-2 py-2">Modalidade</TableHead>
              <TableHead className="px-2 py-2">Arquiteto</TableHead>
              <TableHead className="px-2 py-2 text-right">Valor</TableHead>
              <TableHead className="px-2 py-2 text-right">Pag. Final</TableHead>
              <TableHead className="px-2 py-2">Andamento</TableHead>
              <TableHead className="px-2 py-2">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                  Nenhum projeto cadastrado neste mês
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project, index) => {
                const businessDays = calculateBusinessDays(project.data_inicio, project.data_final)
                return (
                  <TableRow key={project.id}>
                    <TableCell className="px-2 py-2 font-medium">{index + 1}</TableCell>
                    <TableCell className="px-2 py-2 truncate" title={project.marca || '-'}>
                      {project.marca || '-'}
                    </TableCell>
                    <TableCell className="px-2 py-2 truncate" title={project.cidade || '-'}>
                      {project.cidade || '-'}
                    </TableCell>
                    <TableCell
                      className="px-2 py-2 whitespace-nowrap"
                      title={`${formatDate(project.data_inicio)} → ${formatDate(project.data_final)}`}
                    >
                      {formatDateShort(project.data_inicio)} → {formatDateShort(project.data_final)}
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      {businessDays !== null ? (
                        <span className="font-medium">{businessDays}d</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="px-2 py-2 truncate" title={project.modalidade || '-'}>
                      {project.modalidade || '-'}
                    </TableCell>
                    <TableCell className="px-2 py-2 truncate" title={project.arquiteto || '-'}>
                      {project.arquiteto || '-'}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-right font-medium whitespace-nowrap">
                      {formatCurrency(Number(project.valor))}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-right font-medium whitespace-nowrap">
                      {project.andamento === 'ENTREGUE' && project.pagamento_final_valor
                        ? formatCurrency(Number(project.pagamento_final_valor))
                        : '-'}
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <Badge className={`${STATUS_COLORS[project.andamento as ProjectStatus]} text-[9px] px-1.5 py-0.5 font-medium`}>
                        {project.andamento}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-1 py-2">
                      <div className="flex items-center gap-0.5">
                        <Link href={`/dashboard/projeto/${project.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Arquivos e Imagens 3D">
                            <FolderOpen className="h-3.5 w-3.5 text-primary" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => { setEditingProject(project); setIsDialogOpen(true) }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setDeletingProject(project)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
            {projects.length > 0 && (
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell colSpan={7} className="px-2 py-2 text-right">
                  Total do Mês:
                </TableCell>
                <TableCell className="px-2 py-2 text-right">
                  {formatCurrency(totalValue)}
                </TableCell>
                <TableCell className="px-2 py-2 text-right">
                  {formatCurrency(totalPagamentoFinal)}
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ===== CARDS — visível apenas no mobile ===== */}
      <div className="space-y-3 md:hidden">
        {projects.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            Nenhum projeto cadastrado neste mês
          </div>
        ) : (
          <>
            {projects.map((project, index) => {
              const businessDays = calculateBusinessDays(project.data_inicio, project.data_final)
              return (
                <div key={project.id} className="rounded-lg border bg-card p-4 space-y-3">
                  {/* Cabeçalho do card */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">#{index + 1}</p>
                      <h3 className="font-semibold text-foreground">{project.marca || '-'}</h3>
                      <p className="text-sm text-muted-foreground">{project.cidade || '-'}</p>
                    </div>
                    <Badge className={STATUS_COLORS[project.andamento as ProjectStatus]}>
                      {project.andamento}
                    </Badge>
                  </div>

                  {/* Grid de informações */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm border-t pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Início</p>
                      <p className="font-medium">{formatDate(project.data_inicio)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Final</p>
                      <p className="font-medium">{formatDate(project.data_final)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Dias Úteis</p>
                      <p className="font-medium">
                        {businessDays !== null ? `${businessDays} dias` : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Modalidade</p>
                      <p className="font-medium">{project.modalidade || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Arquiteto</p>
                      <p className="font-medium">{project.arquiteto || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor</p>
                      <p className="font-medium">{formatCurrency(Number(project.valor))}</p>
                    </div>
                    {project.andamento === 'ENTREGUE' && project.pagamento_final_valor && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Pag. Final</p>
                        <p className="font-medium">
                          {formatCurrency(Number(project.pagamento_final_valor))}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center justify-end gap-1 border-t pt-3">
                    <Link href={`/dashboard/projeto/${project.id}`}>
                      <Button variant="ghost" size="icon" title="Arquivos e Imagens 3D">
                        <FolderOpen className="h-4 w-4 text-primary" />
                      </Button>
                    </Link>
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
              )
            })}

            {/* Total do mês no mobile */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
              <div className="flex justify-between text-sm font-semibold">
                <span>Total do Mês:</span>
                <span>{formatCurrency(totalValue)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span>Pag. Final:</span>
                <span>{formatCurrency(totalPagamentoFinal)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      <ProjectDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        project={editingProject}
        year={year}
        month={month}
        onSuccess={() => {
          setIsDialogOpen(false)
          setEditingProject(null)
          onRefresh()
        }}
      />

      <AlertDialog open={!!deletingProject} onOpenChange={() => setDeletingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o projeto &quot;{deletingProject?.marca}&quot;? 
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