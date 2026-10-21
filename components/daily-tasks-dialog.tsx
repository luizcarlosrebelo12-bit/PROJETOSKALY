'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import type { DailyTask } from '@/lib/types'

const ARCHITECTS = ['KALY', 'NATI', 'GIOVANA']
const DEFAULT_ARCHITECT = 'KALY'
const OTHER = '__other'
const KEEP_DAYS = 60
const TIMEOUT_MS = 15000

const selectClass =
  'h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground'

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const cleanText = (text: string) => text.trim().slice(0, 200)
const cleanArchitect = (a: string) => a.trim().toUpperCase().slice(0, 30) || DEFAULT_ARCHITECT

/** Nunca deixa uma chamada pendurada para sempre. */
function withTimeout<T>(p: PromiseLike<T>, ms = TIMEOUT_MS): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Tempo esgotado. Verifique a conexão.')), ms),
    ),
  ])
}

type DbError = { code?: string; message: string }

const fmtError = (prefix: string, error: DbError) =>
  `${prefix} (${error.code ?? 'erro'}: ${error.message})`

export function DailyTasksDialog() {
  // cliente do Supabase no navegador (sem passar pela fila de Server Actions)
  const supabase = useMemo(() => createClient(), [])

  const [open, setOpen] = useState(false)
  const [today, setToday] = useState(() => toISO(new Date()))
  const [date, setDate] = useState(() => toISO(new Date()))
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [olderPending, setOlderPending] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // controla qual requisição é a mais recente (descarta respostas atrasadas)
  const reqId = useRef(0)

  // novo
  const [newText, setNewText] = useState('')
  const [newArch, setNewArch] = useState(DEFAULT_ARCHITECT)
  const [newOther, setNewOther] = useState('')

  // edição
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editArch, setEditArch] = useState(DEFAULT_ARCHITECT)
  const [editOther, setEditOther] = useState('')

  // ---------------------------------------------------------------------
  // Leitura
  // ---------------------------------------------------------------------

  const loadDay = useCallback(async () => {
    const id = ++reqId.current
    try {
      const [tasksRes, olderRes] = await withTimeout(
        Promise.all([
          supabase
            .from('daily_tasks')
            .select('*')
            .eq('task_date', date)
            .order('created_at', { ascending: true }),
          supabase
            .from('daily_tasks')
            .select('id', { count: 'exact', head: true })
            .eq('done', false)
            .lt('task_date', date),
        ]),
      )
      if (id !== reqId.current) return // chegou atrasada, descarta

      if (tasksRes.error) {
        console.error('loadDay:', tasksRes.error)
        setError(fmtError('Não foi possível carregar as tarefas.', tasksRes.error))
        return
      }
      setTasks((tasksRes.data ?? []) as DailyTask[])
      setOlderPending(olderRes.count ?? 0)
    } catch (e) {
      console.error(e)
      if (id === reqId.current) {
        setError(e instanceof Error ? e.message : 'Não foi possível carregar as tarefas.')
      }
    }
  }, [supabase, date])

  const loadBadge = useCallback(async () => {
    try {
      const { count, error: err } = await withTimeout(
        supabase
          .from('daily_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('done', false)
          .lte('task_date', today),
      )
      if (err) {
        console.error('loadBadge:', err)
        return
      }
      setPendingCount(count ?? 0)
    } catch (e) {
      console.error(e)
    }
  }, [supabase, today])

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

  // limpeza (> 60 dias): só uma vez ao abrir, sem travar o resto
  useEffect(() => {
    if (!open) return
    const limit = new Date()
    limit.setDate(limit.getDate() - KEEP_DAYS)
    Promise.resolve(
      supabase.from('daily_tasks').delete().lt('task_date', toISO(limit)),
    ).catch(console.error)
  }, [open, supabase])

  // carrega o dia ao abrir e ao trocar de data
  useEffect(() => {
    if (open) loadDay()
  }, [open, loadDay])

  // ---------------------------------------------------------------------
  // Escrita
  // ---------------------------------------------------------------------

  const resolveArch = (sel: string, other: string) =>
    sel === OTHER ? other.trim().toUpperCase() || DEFAULT_ARCHITECT : sel

  /** Executa uma operação; fn devolve a mensagem de erro (ou null se deu certo). */
  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true)
    try {
      const msg = await fn()
      setError(msg)
      await refresh()
      return !msg
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Erro de conexão. Tente novamente.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const addTask = async () => {
    if (busy) return
    const text = cleanText(newText)
    if (!text) {
      setError('Digite a tarefa.')
      return
    }
    const architect = cleanArchitect(resolveArch(newArch, newOther))

    const ok = await run(async () => {
      const { error: err } = await withTimeout(
        supabase.from('daily_tasks').insert({ text, task_date: date, architect }),
      )
      return err ? fmtError('Não foi possível adicionar a tarefa.', err) : null
    })

    if (ok) {
      setNewText('')
      setNewArch(DEFAULT_ARCHITECT)
      setNewOther('')
    }
  }

  const toggle = async (t: DailyTask) => {
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))
    await run(async () => {
      const { error: err } = await withTimeout(
        supabase.from('daily_tasks').update({ done: !t.done }).eq('id', t.id),
      )
      return err ? fmtError('Não foi possível atualizar a tarefa.', err) : null
    })
  }

  const startEdit = (t: DailyTask) => {
    setEditId(t.id)
    setEditText(t.text)
    const known = ARCHITECTS.includes(t.architect)
    setEditArch(known ? t.architect : OTHER)
    setEditOther(known ? '' : t.architect)
  }

  const saveEdit = async () => {
    if (busy) return
    const text = cleanText(editText)
    if (!editId || !text) return
    const id = editId
    const architect = cleanArchitect(resolveArch(editArch, editOther))

    const ok = await run(async () => {
      const { error: err } = await withTimeout(
        supabase.from('daily_tasks').update({ text, architect }).eq('id', id),
      )
      return err ? fmtError('Não foi possível salvar a edição.', err) : null
    })
    if (ok) setEditId(null)
  }

  const remove = async (t: DailyTask) => {
    if (!confirm('Excluir esta tarefa?')) return
    await run(async () => {
      const { error: err } = await withTimeout(
        supabase.from('daily_tasks').delete().eq('id', t.id),
      )
      return err ? fmtError('Não foi possível excluir a tarefa.', err) : null
    })
  }

  const moveOlderHere = () =>
    run(async () => {
      const { error: err } = await withTimeout(
        supabase
          .from('daily_tasks')
          .update({ task_date: date })
          .eq('done', false)
          .lt('task_date', date),
      )
      return err ? fmtError('Não foi possível mover as pendentes.', err) : null
    })

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
          setError(null)
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
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => shift(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[190px] text-center font-semibold capitalize">{label}</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => shift(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDate(toISO(new Date()))}
            >
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
            <Button type="button" onClick={addTask} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              Adicionar
            </Button>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {olderPending > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
              <span>{olderPending} pendente(s) de dias anteriores</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 border-amber-500 text-amber-500"
                onClick={moveOlderHere}
                disabled={busy}
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
                  <Button type="button" size="sm" onClick={saveEdit} disabled={busy}>
                    Salvar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditId(null)}
                  >
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
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => startEdit(t)}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
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