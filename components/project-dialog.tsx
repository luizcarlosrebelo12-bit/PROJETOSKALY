'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Project, ProjectFormData, ProjectStatus } from '@/lib/types'
import { STATUS_OPTIONS } from '@/lib/types'
import { createProject, updateProject, getEntradaValoresPorMarca } from '@/app/actions/projects'

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project | null
  year: number
  month: number
  onSuccess: () => void
}

const emptyForm: ProjectFormData = {
  marca: '',
  cidade: '',
  data_inicio: '',
  data_final: '',
  modalidade: '',
  arquiteto: '',
  valor: 0,
  andamento: 'REUNIÃO',
  entrada_valor: null,
  entrada_data: null,
  entrada_obs: null,
  pagamento_final_valor: null,
  pagamento_final_data: null,
  pagamento_final_obs: null,
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

// Considera "muito diferente" se o valor estiver abaixo de 40% da média
// ou acima de 2,5x a média das entradas anteriores da mesma marca.
// Ajuste esses dois números se quiser um filtro mais ou menos sensível.
const LIMITE_INFERIOR = 0.4
const LIMITE_SUPERIOR = 2.5

function getEntradaDeviationWarning(valor: number, historico: number[]): string | null {
  if (historico.length === 0) return null

  const media = historico.reduce((sum, v) => sum + v, 0) / historico.length
  if (media <= 0) return null

  const min = Math.min(...historico)
  const max = Math.max(...historico)

  if (valor < media * LIMITE_INFERIOR || valor > media * LIMITE_SUPERIOR) {
    return `O valor de ${formatBRL(valor)} está bem diferente das entradas anteriores dessa marca (média de ${formatBRL(media)}, variando de ${formatBRL(min)} a ${formatBRL(max)}). Tem certeza que é esse o valor?`
  }

  return null
}

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  year,
  month,
  onSuccess,
}: ProjectDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<ProjectFormData>(emptyForm)

  // Histórico de valores de entrada da mesma marca, pra comparação
  const [entradaHistorico, setEntradaHistorico] = useState<number[]>([])
  const [entradaWarning, setEntradaWarning] = useState<string | null>(null)
  const [entradaConfirmada, setEntradaConfirmada] = useState(false)

  useEffect(() => {
    if (project) {
      setFormData({
        marca: project.marca || '',
        cidade: project.cidade || '',
        data_inicio: project.data_inicio || '',
        data_final: project.data_final || '',
        modalidade: project.modalidade || '',
        arquiteto: project.arquiteto || '',
        valor: Number(project.valor) || 0,
        andamento: project.andamento,
        entrada_valor: project.entrada_valor != null ? Number(project.entrada_valor) : null,
        entrada_data: project.entrada_data || null,
        entrada_obs: project.entrada_obs || null,
        pagamento_final_valor: project.pagamento_final_valor != null ? Number(project.pagamento_final_valor) : null,
        pagamento_final_data: project.pagamento_final_data || null,
        pagamento_final_obs: project.pagamento_final_obs || null,
      })
    } else {
      setFormData(emptyForm)
    }
    setEntradaWarning(null)
    setEntradaConfirmada(false)
  }, [project, open])

  // Busca o histórico de entradas da marca digitada (com debounce simples)
  useEffect(() => {
    if (!open || !formData.marca.trim()) {
      setEntradaHistorico([])
      return
    }

    const timeout = setTimeout(async () => {
      try {
        const valores = await getEntradaValoresPorMarca(formData.marca.trim(), project?.id)
        setEntradaHistorico(valores)
      } catch (error) {
        console.error('Erro ao buscar histórico de entrada da marca:', error)
      }
    }, 400)

    return () => clearTimeout(timeout)
  }, [formData.marca, open, project?.id])

  // Sempre que o valor da entrada ou o histórico mudam, revalida o aviso
  // e cancela uma eventual confirmação já dada pra um valor anterior.
  useEffect(() => {
    setEntradaConfirmada(false)
    if (formData.entrada_valor != null && formData.entrada_valor > 0) {
      setEntradaWarning(getEntradaDeviationWarning(formData.entrada_valor, entradaHistorico))
    } else {
      setEntradaWarning(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.entrada_valor, entradaHistorico])

  const isEntregue = formData.andamento === 'ENTREGUE'

  const saveProject = async () => {
    setIsLoading(true)
    try {
      if (project) {
        await updateProject(project.id, formData)
      } else {
        await createProject(year, month, formData)
      }
      onSuccess()
    } catch (error) {
      console.error('Error saving project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Se tem aviso de valor destoante e ainda não foi confirmado, para aqui
    // e deixa o aviso visível pro usuário confirmar ou corrigir.
    if (entradaWarning && !entradaConfirmada) {
      return
    }

    await saveProject()
  }

  const handleConfirmarEntrada = async () => {
    setEntradaConfirmada(true)
    await saveProject()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {project ? 'Editar Projeto' : 'Novo Projeto'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="marca">Marca</Label>
              <Input
                id="marca"
                value={formData.marca}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                placeholder="Nome da marca"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                placeholder="Cidade do projeto"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="data_inicio">Data de Início</Label>
              <Input
                id="data_inicio"
                type="date"
                value={formData.data_inicio}
                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_final">Data Final</Label>
              <Input
                id="data_final"
                type="date"
                value={formData.data_final}
                onChange={(e) => setFormData({ ...formData, data_final: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="modalidade">Modalidade</Label>
              <Input
                id="modalidade"
                value={formData.modalidade}
                onChange={(e) => setFormData({ ...formData, modalidade: e.target.value })}
                placeholder="Tipo de projeto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arquiteto">Arquiteto</Label>
              <Input
                id="arquiteto"
                value={formData.arquiteto}
                onChange={(e) => setFormData({ ...formData, arquiteto: e.target.value })}
                placeholder="Nome do arquiteto"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="andamento">Andamento</Label>
              <Select
                value={formData.andamento}
                onValueChange={(value: ProjectStatus) => setFormData({ ...formData, andamento: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Entrada — independe do status, pode ser lançada a qualquer momento.
              Valor próprio, diferente do Valor do projeto acima. */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-foreground">Entrada</h3>
              <span className="text-xs text-muted-foreground">
                Valor que caiu na conta como entrada do projeto
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entrada_valor">Valor da Entrada (R$)</Label>
                <Input
                  id="entrada_valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.entrada_valor ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      entrada_valor: e.target.value === '' ? null : parseFloat(e.target.value),
                    })
                  }
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entrada_data">Data da Entrada</Label>
                <Input
                  id="entrada_data"
                  type="date"
                  value={formData.entrada_data ?? ''}
                  onChange={(e) =>
                    setFormData({ ...formData, entrada_data: e.target.value || null })
                  }
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="entrada_obs">Observações</Label>
              <Textarea
                id="entrada_obs"
                value={formData.entrada_obs ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, entrada_obs: e.target.value || null })
                }
                placeholder="Ex: 50% de entrada via PIX"
                rows={2}
              />
            </div>

            {/* Aviso de valor destoante da média da marca — só aparece quando necessário */}
            {entradaWarning && (
              <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-amber-800 dark:text-amber-300 sm:text-sm">
                      {entradaWarning}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEntradaWarning(null)}
                      >
                        Vou corrigir
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleConfirmarEntrada}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Salvando...' : 'Confirmar mesmo assim'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pagamento Final */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Pagamento Final</h3>
              {!isEntregue && (
                <span className="text-xs text-muted-foreground">
                  Disponível apenas quando ENTREGUE
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pf_valor">Valor Recebido (R$)</Label>
                <Input
                  id="pf_valor"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!isEntregue}
                  value={formData.pagamento_final_valor ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pagamento_final_valor: e.target.value === '' ? null : parseFloat(e.target.value),
                    })
                  }
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pf_data">Data do Recebimento</Label>
                <Input
                  id="pf_data"
                  type="date"
                  disabled={!isEntregue}
                  value={formData.pagamento_final_data ?? ''}
                  onChange={(e) =>
                    setFormData({ ...formData, pagamento_final_data: e.target.value || null })
                  }
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="pf_obs">Observações</Label>
              <Textarea
                id="pf_obs"
                disabled={!isEntregue}
                value={formData.pagamento_final_obs ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, pagamento_final_obs: e.target.value || null })
                }
                placeholder="Ex: Bônus de entrega"
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || (!!entradaWarning && !entradaConfirmada)}>
              {isLoading ? 'Salvando...' : project ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}