'use client'

import { useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { MONTHS } from '@/lib/types'
import { getPagamentoFinalMes, savePagamentoFinalMes } from '@/app/actions/projects'

interface Props {
  year: number
  month: number
  hideValues?: boolean
  onSaved?: () => void
}

interface Registro {
  valor: number
  data_recebimento: string | null
  obs: string | null
}

export function PagamentoFinalMes({ year, month, hideValues = false, onSaved }: Props) {
  const [registro, setRegistro] = useState<Registro | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [valor, setValor] = useState('')
  const [data, setData] = useState('')
  const [obs, setObs] = useState('')

  useEffect(() => {
    let cancelled = false
    setRegistro(null)
    getPagamentoFinalMes(year, month)
      .then((r) => {
        if (!cancelled) setRegistro(r as Registro | null)
      })
      .catch((e) => console.error('Erro ao buscar pagamento final do mês:', e))
    return () => {
      cancelled = true
    }
  }, [year, month])

  const formatCurrency = (v: number) => {
    if (hideValues) return 'R$ ••••••'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  }

  const abrir = () => {
    setValor(registro?.valor ? String(registro.valor) : '')
    setData(registro?.data_recebimento ?? '')
    setObs(registro?.obs ?? '')
    setOpen(true)
  }

  const salvar = async () => {
    setSaving(true)
    try {
      await savePagamentoFinalMes(year, month, {
        valor: Number(valor.replace(',', '.')) || 0,
        data: data || null,
        obs: obs.trim() || null,
      })
      const atualizado = await getPagamentoFinalMes(year, month)
      setRegistro(atualizado as Registro | null)
      setOpen(false)
      onSaved?.()
    } catch (e) {
      console.error('Erro ao salvar pagamento final:', e)
    } finally {
      setSaving(false)
    }
  }

  const temValor = !!registro && Number(registro.valor) > 0

  return (
    <>
      <Button variant="outline" onClick={abrir} title={`Pagamento final de ${MONTHS[month - 1]}`}>
        <Wallet className="mr-2 h-4 w-4" />
        {temValor
          ? `Pag. Final: ${formatCurrency(Number(registro!.valor))}`
          : 'Pag. Final do Mês'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Pagamento Final de {MONTHS[month - 1]} / {year}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pf-valor">Valor Recebido (R$)</Label>
                <Input
                  id="pf-valor"
                  type="number"
                  step="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pf-data">Data do Recebimento</Label>
                <Input
                  id="pf-data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-obs">Observações</Label>
              <Textarea
                id="pf-obs"
                placeholder="Ex: Bônus de entrega"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}