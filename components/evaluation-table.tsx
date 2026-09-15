'use client'

import { useState, useMemo } from 'react'
import { Pencil, Trash2, CheckCircle2, Plus, Filter, X } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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

// Colunas que recebem filtro estilo Excel
const FILTERABLE_FIELDS = ['marca', 'cidade', 'modalidade', 'arquiteto', 'evaluation_stage'] as const
type FilterableField = (typeof FILTERABLE_FIELDS)[number]

type Filters = Record<FilterableField, string[]>

const EMPTY_FILTERS: Filters = {
  marca: [],
  cidade: [],
  modalidade: [],
  arquiteto: [],
  evaluation_stage: [],
}

function getFieldValue(project: Project, field: FilterableField): string {
  const value = project[field]
  return value ? String(value) : '-'
}

interface ColumnFilterHeaderProps {
  label: string
  field: FilterableField
  projects: Project[]
  selected: string[]
  onChange: (field: FilterableField, values: string[]) => void
  align?: 'left' | 'right'
}

function ColumnFilterHeader({
  label,
  field,
  projects,
  selected,
  onChange,
  align = 'left',
}: ColumnFilterHeaderProps) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const uniqueValues = useMemo(() => {
    const set = new Set<string>()
    projects.forEach((p) => set.add(getFieldValue(p, field)))
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [projects, field])

  const filteredValues = useMemo(
    () => uniqueValues.filter((v) => v.toLowerCase().includes(search.toLowerCase())),
    [uniqueValues, search]
  )

  const isActive = selected.length > 0

  const toggleValue = (value: string) => {
    if (selected.includes(value)) {
      onChange(field, selected.filter((v) => v !== value))
    } else {
      onChange(field, [...selected, value])
    }
  }

  const selectAll = () => onChange(field, filteredValues)
  const clearAll = () => onChange(field, [])

  return (
    <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
      <span>{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`rounded p-0.5 transition-colors hover:bg-muted ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`}
            title={`Filtrar ${label}`}
          >
            <Filter className={`h-3.5 w-3.5 ${isActive ? 'fill-primary' : ''}`} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 h-8"
          />
          <div className="mb-2 flex items-center justify-between px-1 text-xs">
            <button onClick={selectAll} className="text-primary hover:underline">
              Selecionar tudo
            </button>
            <button onClick={clearAll} className="text-muted-foreground hover:underline">
              Limpar
            </button>
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {filteredValues.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">Nenhum valor encontrado</p>
            ) : (
              filteredValues.map((value) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted"
                >
                  <Checkbox
                    checked={selected.includes(value)}
                    onCheckedChange={() => toggleValue(value)}
                  />
                  <span className="truncate">{value}</span>
                </label>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function EvaluationTable({ projects, onRefresh, hideValues }: EvaluationTableProps) {
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [confirmingProject, setConfirmingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)

  const handleFilterChange = (field: FilterableField, values: string[]) => {
    setFilters((prev) => ({ ...prev, [field]: values }))
  }

  const hasActiveFilters = FILTERABLE_FIELDS.some((f) => filters[f].length > 0)

  const clearAllFilters = () => setFilters(EMPTY_FILTERS)

  const filteredProjects = useMemo(() => {
    return projects.filter((project) =>
      FILTERABLE_FIELDS.every((field) => {
        const selected = filters[field]
        if (selected.length === 0) return true
        return selected.includes(getFieldValue(project, field))
      })
    )
  }, [projects, filters])

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            {filteredProjects.length}{' '}
            {filteredProjects.length === 1 ? 'projeto em avaliação' : 'projetos em avaliação'}
          </h2>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 px-2 text-xs">
              <X className="mr-1 h-3 w-3" />
              Limpar filtros
            </Button>
          )}
        </div>
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
              <TableHead>
                <ColumnFilterHeader
                  label="Marca"
                  field="marca"
                  projects={projects}
                  selected={filters.marca}
                  onChange={handleFilterChange}
                />
              </TableHead>
              <TableHead>
                <ColumnFilterHeader
                  label="Cidade"
                  field="cidade"
                  projects={projects}
                  selected={filters.cidade}
                  onChange={handleFilterChange}
                />
              </TableHead>
              <TableHead>
                <ColumnFilterHeader
                  label="Modalidade"
                  field="modalidade"
                  projects={projects}
                  selected={filters.modalidade}
                  onChange={handleFilterChange}
                />
              </TableHead>
              <TableHead>
                <ColumnFilterHeader
                  label="Arquiteto"
                  field="arquiteto"
                  projects={projects}
                  selected={filters.arquiteto}
                  onChange={handleFilterChange}
                />
              </TableHead>
              <TableHead>
                <ColumnFilterHeader
                  label="Etiqueta"
                  field="evaluation_stage"
                  projects={projects}
                  selected={filters.evaluation_stage}
                  onChange={handleFilterChange}
                />
              </TableHead>
              <TableHead className="text-right">Valor Estimado</TableHead>
              <TableHead className="w-[160px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {projects.length === 0
                    ? 'Nenhum projeto em avaliação no momento'
                    : 'Nenhum projeto corresponde aos filtros aplicados'}
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((project) => (
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
        {filteredProjects.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            {projects.length === 0
              ? 'Nenhum projeto em avaliação no momento'
              : 'Nenhum projeto corresponde aos filtros aplicados'}
          </div>
        ) : (
          filteredProjects.map((project) => (
            <div key={project.id} className="rounded-lg border bg-card p-4 space-y-3">
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