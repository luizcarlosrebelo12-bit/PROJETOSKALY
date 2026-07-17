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

export function ProjectTable({ projects, year, month, onRefresh }: ProjectTableProps) {
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const formatCurrency = (value: number) => {
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

  const totalValue = projects.reduce((sum, p) => sum + Number(p.valor), 0)
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

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[50px]">N</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Final</TableHead>
              <TableHead>Dias Úteis</TableHead>
              <TableHead>Modalidade</TableHead>
              <TableHead>Arquiteto</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Pag. Final</TableHead>
              <TableHead>Andamento</TableHead>
              <TableHead className="w-[130px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                  Nenhum projeto cadastrado neste mês
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project, index) => {
                const businessDays = calculateBusinessDays(project.data_inicio, project.data_final)
                return (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{project.marca || '-'}</TableCell>
                    <TableCell>{project.cidade || '-'}</TableCell>
                    <TableCell>{formatDate(project.data_inicio)}</TableCell>
                    <TableCell>{formatDate(project.data_final)}</TableCell>
                    <TableCell>
                      {businessDays !== null ? (
                        <span className="font-medium">{businessDays} dias</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{project.modalidade || '-'}</TableCell>
                    <TableCell>{project.arquiteto || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(project.valor))}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {project.andamento === 'ENTREGUE' && project.pagamento_final_valor
                        ? formatCurrency(Number(project.pagamento_final_valor))
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[project.andamento as ProjectStatus]}>
                        {project.andamento}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
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
                    </TableCell>
                  </TableRow>
                )
              })
            )}
            {projects.length > 0 && (
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell colSpan={8} className="text-right">
                  Total do Mês:
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totalValue)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totalPagamentoFinal)}
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            )}
          </TableBody>
        </Table>
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
