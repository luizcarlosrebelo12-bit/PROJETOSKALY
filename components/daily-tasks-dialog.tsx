'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckSquare, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getDailyTasks,
  getPendingCount,
  addDailyTask,
  toggleDailyTask,
  updateDailyTask,
  deleteDailyTask,
  moveOlderPendingToDate,
  cleanupOldDailyTasks,
} from '@/app/actions/daily-tasks'
import type { DailyTask } from '@/lib/types'

const ARCHITECTS = ['KALY', 'NATI', 'GIOVANA']
const DEFAULT_ARCHITECT = 'KALY'
const OTHER = '__other'
const KEEP_DAYS = 60

const selectClass =
  'h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground'

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function DailyTasksDialog() {
  const [open, setOpen] = useState(false)
  const [today, setToday] = useState(() => toISO(new Date()))
  const [date, setDate] = useState(() => toISO(new Date()))
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [olderPending, setOlderPending] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // novo
  const [newText, setNewText] = useState('')
  const [newArch, setNewArch] = useState(DEFAULT_ARCHITECT)
  const [newOther, setNewOther] = useState('')

  // edição
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editArch, setEditArch] = useState(DEFAULT_ARCHITECT)
  const [editOther, setEditOther] = useState('')

  const loadDay = useCallback(async () => {
    const res = await getDailyTasks(date)
    setTasks(res.tasks)
    setOlderPending(res.olderPending)
  }, [date])

  const loadBadge = useCallback(async () => {
    setPendingCount(await getPendingCount(today))
  }, [today])

  const refresh = useCallback(async () => {
    await Promise.all([loadDay(), loadBadge()])
  }, [loadDay, loadBadge])

  // atualiza "hoje" caso a página fique aberta na virada do dia
  useEffect(() => {
    const t = toISO(new Date())
    if (t !== today) setToday(t)
  }, [open, today])

  // bolinha do ícone ao montar
  useEffect(() => {
    loadBadge()
  }, [loadBadge])

  // ao abrir: limpa > 60 dias (reforço do cron) e carrega
  useEffect(() => {
    if (!open) return
    cleanupOldDailyTasks().then(refresh)
  }, [open, refresh])

  // ao trocar de dia
  useEffect(() => {
    if (open) loadDay()
  }, [date, open, loadDay])

  const resolveArch = (sel: string, other: string) =>
    sel === OTHER ? other.trim().toUpperCase() || DEFAULT_ARCHITECT : sel

  const run = async (fn: () => Promise<{ error?: string }>) => {
    const res = await fn()
    setError(res.error ?? null)
    await refresh()
    return !res.error
  }

  const addTask = async () => {
    const text = newText.trim()
    if (!text) return
    const ok = await run(() =>
      addDailyTask({ text, date, architect: resolveArch(newArch, newOther) }),
    )
    if (ok) {
      setNewText('')
      setNewArch(DEFAULT_ARCHITECT)
      setNewOther('')
    }
  }

  const toggle = async (t: DailyTask) => {
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))
    await run(() => toggleDailyTask(t.id, !t.done))
  }

  const startEdit = (t: DailyTask) => {
    setEditId(t.id)
    setEditText(t.text)
    const known = ARCHITECTS.includes(t.architect)
    setEditArch(known ? t.architect : OTHER)
    setEditOther(known ? '' : t.architect)
  }

  const saveEdit = async () => {
    const text = editText.trim()
    if (!editId || !text) return
    const id = editId
    const ok = await run(() =>
      updateDailyTask(id, { text, architect: resolveArch(editArch, editOther) }),
    )
    if (ok) setEditId(null)
  }

  const remove = async (t: DailyTask) => {
    if (!confirm('Excluir esta tarefa?')) return
    await run(() => deleteDailyTask(t.id))
  }

  const moveOlderHere = () => run(() => moveOlderPendingToDate(date))

  const shift = (n: number) => {
    const d = fromISO(date)
    d.setDate(d.getDate() + n)
    setDate(toISO(d))
    setEditId(null)
    setError(null)
  }

  const done = tasks.filter((t) => t.done).length
  const pct = tasks.length ? (done / tasks.length) * 100 : 0
  const label = fromISO(date).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="relative"
        onClick={() => {
          setDate(toISO(new Date()))
          setOpen(true)
        }}
        aria-label="Tarefas do dia"
        title="Tarefas do dia"
      >
        <CheckSquare className="h-5 w-5" />
        {pendingCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-black">
            {pendingCount}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tarefas do dia</DialogTitle>
          </DialogHeader>

          {/* navegação de dias */}
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shift(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[190px] text-center font-semibold capitalize">{label}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shift(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDate(toISO(new Date()))}>
              Hoje
            </Button>
          </div>

          {/* adicionar */}
          <div className="flex flex-wrap gap-2">
            <Input
              className="min-w-[180px] flex-1"
              placeholder="Nova tarefa..."
              maxLength={200}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
            />
            <select
              className={selectClass}
              value={newArch}
              onChange={(e) => setNewArch(e.target.value)}
              aria-label="Arquiteta"
            >
              {ARCHITECTS.map((a) => (
                <option key={a}>{a}</option>
              ))}
              <option value={OTHER}>Outra...</option>
            </select>
            {newArch === OTHER && (
              <Input
                className="w-28"
                placeholder="Nome"
                value={newOther}
                onChange={(e) => setNewOther(e.target.value)}
              />
            )}
            <Button onClick={addTask}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar
            </Button>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {olderPending > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
              <span>{olderPending} pendente(s) de dias anteriores</span>
              <Button
                variant="outline"
                size="sm"
                className="h-6 border-amber-500 text-amber-500"
                onClick={moveOlderHere}
              >
                Trazer para este dia
              </Button>
            </div>
          )}

          {/* progresso */}
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>
                {done}/{tasks.length} concluídas
              </span>
              <span>{tasks.length ? Math.round(pct) + '%' : ''}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded bg-muted">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* lista */}
          <div className="max-h-[40vh] space-y-2 overflow-auto">
            {tasks.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma tarefa neste dia.
              </p>
            )}
            {tasks.map((t) =>
              editId === t.id ? (
                <div key={t.id} className="flex flex-wrap gap-2 rounded-md border p-2">
                  <Input
                    className="min-w-[150px] flex-1"
                    value={editText}
                    maxLength={200}
                    autoFocus
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  />
                  <select
                    className={selectClass}
                    value={editArch}
                    onChange={(e) => setEditArch(e.target.value)}
                    aria-label="Arquiteta"
                  >
                    {ARCHITECTS.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                    <option value={OTHER}>Outra...</option>
                  </select>
                  {editArch === OTHER && (
                    <Input
                      className="w-28"
                      placeholder="Nome"
                      value={editOther}
                      onChange={(e) => setEditOther(e.target.value)}
                    />
                  )}
                  <Button size="sm" onClick={saveEdit}>
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditId(null)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div key={t.id} className="flex items-center gap-2 rounded-md border p-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-green-500"
                    checked={t.done}
                    onChange={() => toggle(t)}
                    aria-label="Concluir"
                  />
                  <span
                    className={`flex-1 break-words ${t.done ? 'text-muted-foreground line-through' : ''}`}
                  >
                    {t.text}
                  </span>
                  <span className="rounded bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
                    {t.architect}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => startEdit(t)}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:text-red-500"
                    onClick={() => remove(t)}
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ),
            )}
          </div>

          <p className="text-center text-[11px] text-muted-foreground">
            Tarefas são apagadas automaticamente após {KEEP_DAYS} dias.
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}