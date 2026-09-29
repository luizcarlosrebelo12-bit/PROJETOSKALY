'use server'

import { createClient } from '@/lib/supabase/server'
import type { DailyTask } from '@/lib/types'

// ---------------------------------------------------------------------------
// Constantes e helpers (não exportar daqui: arquivos 'use server' só exportam
// funções async)
// ---------------------------------------------------------------------------

const KEEP_DAYS = 60
const DEFAULT_ARCHITECT = 'KALY'
const SESSION_ERROR = 'Sessão expirada. Faça login novamente.'

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

function cleanText(text: string) {
  return text.trim().slice(0, 200)
}

function cleanArchitect(architect: string) {
  return architect.trim().toUpperCase().slice(0, 30) || DEFAULT_ARCHITECT
}

/** Cria o client e já verifica se existe usuário logado. */
async function getAuthedClient() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

/** Tarefas de um dia + quantas pendentes existem em dias anteriores a ele. */
export async function getDailyTasks(
  date: string,
): Promise<{ tasks: DailyTask[]; olderPending: number }> {
  if (!isISODate(date)) return { tasks: [], olderPending: 0 }
  const { supabase, user } = await getAuthedClient()

  if (!user) {
    console.error('getDailyTasks: sem usuário na sessão')
    return { tasks: [], olderPending: 0 }
  }

  const [{ data, error }, { count }] = await Promise.all([
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
  ])

  if (error) {
    console.error('getDailyTasks:', error)
    return { tasks: [], olderPending: 0 }
  }
  return { tasks: (data as DailyTask[]) ?? [], olderPending: count ?? 0 }
}

/** Total de pendentes até hoje (bolinha do ícone). */
export async function getPendingCount(today: string): Promise<number> {
  if (!isISODate(today)) return 0
  const { supabase, user } = await getAuthedClient()

  if (!user) {
    console.error('getPendingCount: sem usuário na sessão')
    return 0
  }

  const { count, error } = await supabase
    .from('daily_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('done', false)
    .lte('task_date', today)

  if (error) {
    console.error('getPendingCount:', error)
    return 0
  }
  return count ?? 0
}

// ---------------------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------------------

export async function addDailyTask(input: {
  text: string
  date: string
  architect: string
}): Promise<{ error?: string }> {
  const text = cleanText(input.text)
  if (!text) return { error: 'Digite a tarefa.' }
  if (!isISODate(input.date)) return { error: 'Data inválida.' }

  const { supabase, user } = await getAuthedClient()
  if (!user) return { error: SESSION_ERROR }

  const { error } = await supabase.from('daily_tasks').insert({
    text,
    task_date: input.date,
    architect: cleanArchitect(input.architect),
  })

  if (error) {
    console.error('addDailyTask:', error)
    // TEMPORÁRIO: mostra o código/mensagem real na tela para diagnosticar.
    // Depois de descobrir a causa, troque por: 'Não foi possível adicionar a tarefa.'
    return {
      error: `Não foi possível adicionar a tarefa. (${error.code}: ${error.message})`,
    }
  }
  return {}
}

export async function toggleDailyTask(
  id: string,
  done: boolean,
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return { error: SESSION_ERROR }

  const { error } = await supabase.from('daily_tasks').update({ done }).eq('id', id)

  if (error) {
    console.error('toggleDailyTask:', error)
    return { error: 'Não foi possível atualizar a tarefa.' }
  }
  return {}
}

export async function updateDailyTask(
  id: string,
  input: { text: string; architect: string },
): Promise<{ error?: string }> {
  const text = cleanText(input.text)
  if (!text) return { error: 'Digite a tarefa.' }

  const { supabase, user } = await getAuthedClient()
  if (!user) return { error: SESSION_ERROR }

  const { error } = await supabase
    .from('daily_tasks')
    .update({ text, architect: cleanArchitect(input.architect) })
    .eq('id', id)

  if (error) {
    console.error('updateDailyTask:', error)
    return { error: 'Não foi possível salvar a edição.' }
  }
  return {}
}

export async function deleteDailyTask(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return { error: SESSION_ERROR }

  const { error } = await supabase.from('daily_tasks').delete().eq('id', id)

  if (error) {
    console.error('deleteDailyTask:', error)
    return { error: 'Não foi possível excluir a tarefa.' }
  }
  return {}
}

/** Move todas as pendentes de dias anteriores para o dia informado. */
export async function moveOlderPendingToDate(date: string): Promise<{ error?: string }> {
  if (!isISODate(date)) return { error: 'Data inválida.' }

  const { supabase, user } = await getAuthedClient()
  if (!user) return { error: SESSION_ERROR }

  const { error } = await supabase
    .from('daily_tasks')
    .update({ task_date: date })
    .eq('done', false)
    .lt('task_date', date)

  if (error) {
    console.error('moveOlderPendingToDate:', error)
    return { error: 'Não foi possível mover as pendentes.' }
  }
  return {}
}

/** Apaga tarefas com mais de 60 dias (reforço do pg_cron). */
export async function cleanupOldDailyTasks(): Promise<void> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return

  const limit = new Date()
  limit.setDate(limit.getDate() - KEEP_DAYS)

  const { error } = await supabase
    .from('daily_tasks')
    .delete()
    .lt('task_date', toISO(limit))

  if (error) console.error('cleanupOldDailyTasks:', error)
}