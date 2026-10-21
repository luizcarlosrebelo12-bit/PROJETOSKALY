'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateTag } from 'next/cache'

import type {
  ProjectFormData,
  EvaluationFormData,
  EntradaOrigem,
  ProjectEvaluation,
} from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers de rollover automático de mês
// ---------------------------------------------------------------------------
async function pagamentosFinaisPorMes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  year: number
): Promise<number[]> {
  const { data } = await supabase
    .from('pagamentos_finais_mes')
    .select('month, valor')
    .eq('user_id', userId)
    .eq('year', year)

  const meses = Array(12).fill(0) as number[]
  data?.forEach((r) => {
    const i = r.month - 1
    if (i >= 0 && i < 12) meses[i] += Number(r.valor) || 0
  })
  return meses
}

function isCurrentCalendarMonth(year: number, month: number) {
  const now = new Date()
  return year === now.getFullYear() && month === now.getMonth() + 1
}

async function rolloverPendingProjects(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  year: number,
  month: number
) {
  const { error } = await supabase
    .from('projects')
    .update({ year, month, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_evaluation', false)
    .neq('andamento', 'ENTREGUE')
    .or(`year.lt.${year},and(year.eq.${year},month.lt.${month})`)

  if (error) {
    console.error('Error rolling over pending projects:', error)
  }
}

// ---------------------------------------------------------------------------
// Projetos "de verdade" (mês a mês)
// ---------------------------------------------------------------------------

export async function getProjects(year: number, month: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  if (isCurrentCalendarMonth(year, month)) {
    await rolloverPendingProjects(supabase, user.id, year, month)
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('month', month)
    .eq('is_evaluation', false)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching projects:', error)
    return []
  }

  return data || []
}

export async function getProject(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    console.error('Error fetching project:', error)
    return null
  }

  return data
}

export async function createProject(year: number, month: number, formData: ProjectFormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const semEntrada = !!formData.entrada_sem

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      year,
      month,
      marca: formData.marca,
      cidade: formData.cidade,
      data_inicio: formData.data_inicio || null,
      data_final: formData.data_final || null,
      modalidade: formData.modalidade,
      arquiteto: formData.arquiteto,
      valor: formData.valor,
      andamento: formData.andamento,
      entrada_valor: semEntrada ? null : formData.entrada_valor,
      entrada_data: semEntrada ? null : (formData.entrada_data || null),
      entrada_obs: semEntrada ? null : formData.entrada_obs,
      entrada_origem: formData.entrada_origem || 'EIXO',
      entrada_sem: semEntrada,
      is_evaluation: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating project:', error)
    throw new Error('Erro ao criar projeto')
  }

  if (data) {
    await supabase.from('folders').insert({
      user_id: user.id,
      project_id: data.id,
      parent_id: null,
      nome: 'Projeto Oficial',
      is_oficial: true,
    })
  }

  revalidateTag('projects', 'max')
}

export async function updateProject(id: string, formData: ProjectFormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const semEntrada = !!formData.entrada_sem

  const { error } = await supabase
    .from('projects')
    .update({
      marca: formData.marca,
      cidade: formData.cidade,
      data_inicio: formData.data_inicio || null,
      data_final: formData.data_final || null,
      modalidade: formData.modalidade,
      arquiteto: formData.arquiteto,
      valor: formData.valor,
      andamento: formData.andamento,
      entrada_valor: semEntrada ? null : formData.entrada_valor,
      entrada_data: semEntrada ? null : (formData.entrada_data || null),
      entrada_obs: semEntrada ? null : formData.entrada_obs,
      entrada_origem: formData.entrada_origem || 'EIXO',
      entrada_sem: semEntrada,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error updating project:', error)
    throw new Error('Erro ao atualizar projeto')
  }

  revalidateTag('projects', 'max')
}

export async function deleteProject(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting project:', error)
    throw new Error('Erro ao excluir projeto')
  }

  revalidateTag('projects', 'max')
}

export async function getYearSummary(year: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('projects')
    .select('month, valor, andamento')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('is_evaluation', false)

  if (error) {
    console.error('Error fetching year summary:', error)
    return []
  }

  const summary = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    total: 0,
    count: 0,
  }))

  data?.forEach((project) => {
    const monthIndex = project.month - 1
    if (project.andamento === 'ENTREGUE') {
      summary[monthIndex].total += Number(project.valor) || 0
    }
    summary[monthIndex].count += 1
  })

  const pfMes = await pagamentosFinaisPorMes(supabase, user.id, year)
  summary.forEach((m, i) => {
    m.total += pfMes[i]
  })

  return summary
}

export async function getYearStats(year: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('is_evaluation', false)

  if (error) {
    console.error('Error fetching year stats:', error)
    return null
  }

  const pfMes = await pagamentosFinaisPorMes(supabase, user.id, year)
  const totalPagamentosFinais = pfMes.reduce((a, b) => a + b, 0)

  if (!data || data.length === 0) {
    return {
      totalProjects: 0,
      totalValue: 0,
      totalPagamentosFinais,
      receitaTotal: totalPagamentosFinais,
      mediaMensal: totalPagamentosFinais / 12,
      avgDays: 0,
      byBrand: [] as { name: string; value: number; percent: number }[],
      byArchitect: [] as { name: string; value: number; percent: number }[],
      monthly: [] as {
        month: number
        projetos: number
        valorProjetos: number
        pagamentosFinais: number
        totalRecebido: number
        entregues: number
      }[],
    }
  }

  const brandCount: Record<string, number> = {}
  data.forEach((p) => {
    const marca = p.marca || 'Não definida'
    brandCount[marca] = (brandCount[marca] || 0) + 1
  })
  const byBrand = Object.entries(brandCount)
    .map(([name, value]) => ({
      name,
      value,
      percent: Math.round((value / data.length) * 100),
    }))
    .sort((a, b) => b.value - a.value)

  const architectCount: Record<string, number> = {}
  data.forEach((p) => {
    const arquiteto = p.arquiteto || 'Não definido'
    architectCount[arquiteto] = (architectCount[arquiteto] || 0) + 1
  })
  const byArchitect = Object.entries(architectCount)
    .map(([name, value]) => ({
      name,
      value,
      percent: Math.round((value / data.length) * 100),
    }))
    .sort((a, b) => b.value - a.value)

  let totalDays = 0
  let countWithDays = 0
  data.forEach((p) => {
    if (p.data_inicio && p.data_final) {
      const start = new Date(p.data_inicio)
      const end = new Date(p.data_final)
      let days = 0
      const current = new Date(start)
      while (current <= end) {
        const dayOfWeek = current.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          days++
        }
        current.setDate(current.getDate() + 1)
      }
      totalDays += days
      countWithDays++
    }
  })
  const avgDays = countWithDays > 0 ? Math.round(totalDays / countWithDays) : 0

  const monthly = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    projetos: 0,
    valorProjetos: 0,
    pagamentosFinais: 0,
    totalRecebido: 0,
    entregues: 0,
  }))

  data.forEach((p) => {
    const idx = p.month - 1
    if (idx < 0 || idx > 11) return
    monthly[idx].projetos += 1
    monthly[idx].valorProjetos += Number(p.valor) || 0
    if (p.andamento === 'ENTREGUE') {
      monthly[idx].entregues += 1
    }
  })

  monthly.forEach((m, i) => {
    m.pagamentosFinais = pfMes[i]
    m.totalRecebido = m.valorProjetos + pfMes[i]
  })

  const totalValue = data.reduce((sum, p) => sum + (Number(p.valor) || 0), 0)
  const receitaTotal = totalValue + totalPagamentosFinais

  return {
    totalProjects: data.length,
    totalValue,
    totalPagamentosFinais,
    receitaTotal,
    mediaMensal: receitaTotal / 12,
    avgDays,
    byBrand,
    byArchitect,
    monthly,
  }
}

export async function getMonthlyFinancials(year: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('projects')
    .select('month, valor, andamento')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('is_evaluation', false)

  if (error) {
    console.error('Error fetching financials:', error)
    return []
  }

  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    valorProjetos: 0,
    pagamentosFinais: 0,
    totalRecebido: 0,
    projetosEntregues: 0,
    pagamentosRecebidos: 0,
    totalProjetos: 0,
  }))

  data?.forEach((p) => {
    const idx = p.month - 1
    if (idx < 0 || idx > 11) return
    months[idx].totalProjetos += 1
    months[idx].valorProjetos += Number(p.valor) || 0
    if (p.andamento === 'ENTREGUE') {
      months[idx].projetosEntregues += 1
    }
  })

  const pfMes = await pagamentosFinaisPorMes(supabase, user.id, year)
  months.forEach((m, i) => {
    m.pagamentosFinais = pfMes[i]
    m.pagamentosRecebidos = pfMes[i] > 0 ? 1 : 0
    m.totalRecebido = m.valorProjetos + pfMes[i]
  })

  return months
}

export async function getAvailableYears() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('projects')
    .select('year')
    .eq('user_id', user.id)

  if (error || !data) return []

  const years = Array.from(new Set(data.map((d) => d.year))).sort((a, b) => b - a)
  return years
}

export async function deleteYear(year: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('is_evaluation', false)

  if (error) {
    console.error('Error deleting year:', error)
    throw new Error('Erro ao excluir o ano')
  }

  revalidateTag('projects', 'max')
}

// ---------------------------------------------------------------------------
// Entradas (pagamento inicial que cai na conta)
// ---------------------------------------------------------------------------

// Agrupa por mês em que a ENTRADA foi paga (usa entrada_data, não o
// year/month do projeto) — assim "quantos projetos tiveram entrada em
// agosto" bate certinho mesmo que o projeto esteja lançado em outro mês.
// Aceita um filtro opcional de origem (EIXO, OUTROS, EU, EIXO-OUTROS);
// se não for informado, traz todas as origens somadas.
export async function getEntradaSummary(year: number, origem?: EntradaOrigem) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('projects')
    .select('marca, cidade, entrada_valor, entrada_data, entrada_origem')
    .eq('user_id', user.id)
    .eq('is_evaluation', false)
    .not('entrada_data', 'is', null)

  if (origem) {
    query = query.eq('entrada_origem', origem)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching entrada summary:', error)
    return []
  }

  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    count: 0,
    total: 0,
    projetos: [] as { marca: string; cidade: string; valor: number; data: string; origem?: string }[],
  }))

  data?.forEach((p) => {
    if (!p.entrada_data) return
    const [entradaYear, entradaMonth] = p.entrada_data.split('-').map(Number)
    if (entradaYear !== year) return
    const idx = entradaMonth - 1
    if (idx < 0 || idx > 11) return
    months[idx].count += 1
    months[idx].total += Number(p.entrada_valor) || 0
    months[idx].projetos.push({
      marca: p.marca || '-',
      cidade: p.cidade || '-',
      valor: Number(p.entrada_valor) || 0,
      data: p.entrada_data,
      origem: p.entrada_origem || undefined,
    })
  })

  return months
}

// Busca as entradas "cruas" do ano (uma linha por projeto com entrada
// lançada), sem agrupar por mês — usado pelo EntradaChart, que agora
// filtra e agrupa por origem no próprio componente (client-side).
export async function getEntradasRaw(year: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('projects')
    .select('entrada_data, entrada_valor, entrada_origem')
    .eq('user_id', user.id)
    .eq('is_evaluation', false)
    .not('entrada_data', 'is', null)

  if (error) {
    console.error('Error fetching entradas raw:', error)
    return []
  }

  return (data || [])
    .filter((p) => {
      if (!p.entrada_data) return false
      const [entradaYear] = p.entrada_data.split('-').map(Number)
      return entradaYear === year
    })
    .map((p) => ({
      entrada_data: p.entrada_data as string,
      entrada_valor: Number(p.entrada_valor) || 0,
      entrada_origem: p.entrada_origem,
    }))
}

// Retorna os meses (do ano/mês do PROJETO, não da entrada) que têm pelo
// menos um projeto com a entrada ainda NÃO informada — ou seja, sem
// ENTRADA_DATA lançada e sem o "NÃO TEM entrada" marcado. Mesmo critério
// dos selos da tabela (verde = entrada lançada, cinza = sem entrada).
// Usado pra acender o sininho de alerta no Resumo Anual.
export async function getMesesComEntradaFaltando(year: number): Promise<number[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('projects')
    .select('month, entrada_data, entrada_sem')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('is_evaluation', false)

  if (error) {
    console.error('Error fetching meses com entrada faltando:', error)
    return []
  }

  const meses = new Set<number>()
  data?.forEach((p) => {
    if (!p.entrada_data && !p.entrada_sem) {
      meses.add(p.month)
    }
  })

  return Array.from(meses).sort((a, b) => a - b)
}

// Agrupa o VALOR das entradas por marca (não contagem de projetos) —
// usado no gráfico "Entradas por Marca" nas Estatísticas, pra ver quem
// pagou mais em entrada, não só quem tem mais projetos. Usa entrada_data,
// mesmo critério da getEntradaSummary, pra ficar consistente.
export async function getEntradaByBrand(year: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('projects')
    .select('marca, entrada_valor, entrada_data')
    .eq('user_id', user.id)
    .eq('is_evaluation', false)
    .not('entrada_data', 'is', null)

  if (error) {
    console.error('Error fetching entrada by brand:', error)
    return []
  }

  const byBrand: Record<string, number> = {}

  data?.forEach((p) => {
    if (!p.entrada_data) return
    const [entradaYear] = p.entrada_data.split('-').map(Number)
    if (entradaYear !== year) return
    const marca = p.marca || 'Não definida'
    byBrand[marca] = (byBrand[marca] || 0) + (Number(p.entrada_valor) || 0)
  })

  return Object.entries(byBrand)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

// Busca todos os valores de entrada já lançados pra uma marca (usado no
// project-dialog pra avisar quando um valor novo destoa muito da média
// histórica dessa marca). Ignora entradas nulas/zeradas e, opcionalmente,
// exclui o próprio projeto sendo editado (pra não comparar o valor com
// ele mesmo).
export async function getEntradaValoresPorMarca(
  marca: string,
  excludeProjectId?: string
): Promise<number[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('projects')
    .select('id, entrada_valor')
    .eq('user_id', user.id)
    .eq('is_evaluation', false)
    .ilike('marca', marca)
    .not('entrada_valor', 'is', null)

  if (excludeProjectId) {
    query = query.neq('id', excludeProjectId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching entrada valores por marca:', error)
    return []
  }

  return (data || [])
    .map((row) => Number(row.entrada_valor))
    .filter((v) => !isNaN(v) && v > 0)
}

// Agrupa por mês em que o PAGAMENTO FINAL foi recebido (usa
// pagamento_final_data, não o year/month do projeto) — mesmo padrão
// da getEntradaSummary, mas só considera projetos ENTREGUES.
export async function getPagamentoFinalSummary(year: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('pagamentos_finais_mes')
    .select('valor, data_recebimento, month')
    .eq('user_id', user.id)
    .eq('year', year)

  if (error) {
    console.error('Error fetching pagamento final summary:', error)
    return []
  }

  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    count: 0,
    total: 0,
    projetos: [] as { marca: string; cidade: string; valor: number; data: string }[],
  }))

  data?.forEach((r) => {
    // usa o mês da data de recebimento, se existir; senão o mês lançado
    const idx = r.data_recebimento
      ? Number(r.data_recebimento.split('-')[1]) - 1
      : r.month - 1
    if (idx < 0 || idx > 11) return
    if (r.data_recebimento && Number(r.data_recebimento.split('-')[0]) !== year) return
    const valor = Number(r.valor) || 0
    if (valor <= 0) return
    months[idx].count += 1
    months[idx].total += valor
  })

  return months
}

// ---------------------------------------------------------------------------
// Projetos em Avaliação (prospecção / aba "Avaliando sala")
// ---------------------------------------------------------------------------

export async function getEvaluationProjects() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_evaluation', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching evaluation projects:', error)
    return []
  }

  return data || []
}

export async function getEvaluationCount() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count, error } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_evaluation', true)

  if (error) {
    console.error('Error counting evaluation projects:', error)
    return 0
  }

  return count || 0
}

export async function createEvaluationProject(formData: EvaluationFormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const now = new Date()

  const { error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      marca: formData.marca,
      cidade: formData.cidade,
      modalidade: formData.modalidade,
      arquiteto: formData.arquiteto,
      valor: formData.valor,
      andamento: 'REUNIÃO',
      is_evaluation: true,
      evaluation_stage: formData.evaluation_stage,
      cor: formData.cor,
    })

  if (error) {
    console.error('Error creating evaluation project:', error)
    throw new Error('Erro ao criar projeto em avaliação')
  }

  revalidateTag('projects', 'max')
}

export async function updateEvaluationProject(id: string, formData: EvaluationFormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { error } = await supabase
    .from('projects')
    .update({
      marca: formData.marca,
      cidade: formData.cidade,
      modalidade: formData.modalidade,
      arquiteto: formData.arquiteto,
      valor: formData.valor,
      evaluation_stage: formData.evaluation_stage,
      cor: formData.cor,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('is_evaluation', true)

  if (error) {
    console.error('Error updating evaluation project:', error)
    throw new Error('Erro ao atualizar projeto em avaliação')
  }

  revalidateTag('projects', 'max')
}

export async function confirmEvaluationProject(
  id: string,
  year: number,
  month: number,
  dataInicio?: string
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('projects')
    .update({
      is_evaluation: false,
      evaluation_stage: null,
      year,
      month,
      data_inicio: dataInicio || null,
      andamento: 'LEVANTAMENTO',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('is_evaluation', true)
    .select()
    .single()

  if (error) {
    console.error('Error confirming evaluation project:', error)
    throw new Error('Erro ao confirmar fechamento do projeto')
  }

  if (data) {
    await supabase.from('folders').insert({
      user_id: user.id,
      project_id: data.id,
      parent_id: null,
      nome: 'Projeto Oficial',
      is_oficial: true,
    })
  }

  revalidateTag('projects', 'max')
}

export async function getProjectEvaluation(
  projectId: string
): Promise<ProjectEvaluation | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('project_evaluations')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar avaliação:', error)
    throw new Error('Erro ao buscar avaliação')
  }

  return data as ProjectEvaluation | null
}

// Retorna os IDs de todos os projetos do usuário que já têm avaliação
// respondida — usado pra pintar a estrela cheia na tabela sem precisar
// buscar avaliação por avaliação.
export async function getEvaluatedProjectIds(): Promise<string[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('project_evaluations')
    .select('project_id')
    .eq('user_id', user.id)

  if (error) {
    console.error('Error fetching evaluated project ids:', error)
    return []
  }

  return (data || []).map((row) => row.project_id)
}

// ---------------------------------------------------------------------------
// Estatísticas (somente projetos ENTREGUES + soma das entradas)
// ---------------------------------------------------------------------------

// Estatísticas da página /estatisticas:
// - Projetos, Por Marca, Por Arquiteto e Média Dias: só projetos ENTREGUES
// - totalEntradas: soma de TODAS as entradas lançadas no ano (por entrada_data)
// - totalGeral: quantidade de projetos do ano (qualquer status), usado só
//   para decidir se o botão "Excluir Ano" aparece
export async function getEstatisticasEntregues(year: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [entreguesRes, entradasRes, totalRes] = await Promise.all([
    supabase
      .from('projects')
      .select('marca, arquiteto, data_inicio, data_final')
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('is_evaluation', false)
      .eq('andamento', 'ENTREGUE'),
    supabase
      .from('projects')
      .select('entrada_valor')
      .eq('user_id', user.id)
      .eq('is_evaluation', false)
      .not('entrada_data', 'is', null)
      .gte('entrada_data', `${year}-01-01`)
      .lte('entrada_data', `${year}-12-31`),
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('is_evaluation', false),
  ])

  if (entreguesRes.error || entradasRes.error) {
    console.error(
      'Error fetching estatisticas entregues:',
      entreguesRes.error ?? entradasRes.error
    )
    return null
  }

  const entregues = entreguesRes.data ?? []
  const totalEntradas = (entradasRes.data ?? []).reduce(
    (sum, p) => sum + (Number(p.entrada_valor) || 0),
    0
  )
  const totalGeral = totalRes.count ?? 0

  // Por marca
  const brandCount: Record<string, number> = {}
  entregues.forEach((p) => {
    const marca = p.marca || 'Não definida'
    brandCount[marca] = (brandCount[marca] || 0) + 1
  })
  const byBrand = Object.entries(brandCount)
    .map(([name, value]) => ({
      name,
      value,
      percent: Math.round((value / entregues.length) * 100),
    }))
    .sort((a, b) => b.value - a.value)

  // Por arquiteto
  const architectCount: Record<string, number> = {}
  entregues.forEach((p) => {
    const arquiteto = p.arquiteto || 'Não definido'
    architectCount[arquiteto] = (architectCount[arquiteto] || 0) + 1
  })
  const byArchitect = Object.entries(architectCount)
    .map(([name, value]) => ({
      name,
      value,
      percent: Math.round((value / entregues.length) * 100),
    }))
    .sort((a, b) => b.value - a.value)

  // Média de dias úteis
  let totalDays = 0
  let countWithDays = 0
  entregues.forEach((p) => {
    if (p.data_inicio && p.data_final) {
      const start = new Date(p.data_inicio)
      const end = new Date(p.data_final)
      let days = 0
      const current = new Date(start)
      while (current <= end) {
        const dayOfWeek = current.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) days++
        current.setDate(current.getDate() + 1)
      }
      totalDays += days
      countWithDays++
    }
  })
  const avgDays = countWithDays > 0 ? Math.round(totalDays / countWithDays) : 0

  return {
    totalProjects: entregues.length,
    totalGeral,
    totalEntradas,
    avgDays,
    byBrand,
    byArchitect,
  }
}

// ---------------------------------------------------------------------------
// Pagamento final do MÊS (um valor por mês, não por projeto)
// ---------------------------------------------------------------------------

export async function getPagamentoFinalMes(year: number, month: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('pagamentos_finais_mes')
    .select('valor, data_recebimento, obs')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()

  if (error) {
    console.error('Error fetching pagamento final do mês:', error)
    return null
  }

  return data
}

export async function savePagamentoFinalMes(
  year: number,
  month: number,
  dados: { valor: number; data: string | null; obs: string | null }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  // Tudo vazio = remove o lançamento do mês
  if (!dados.valor && !dados.data && !dados.obs) {
    const { error } = await supabase
      .from('pagamentos_finais_mes')
      .delete()
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('month', month)
    if (error) throw new Error('Erro ao remover pagamento final')
  } else {
    const { error } = await supabase
      .from('pagamentos_finais_mes')
      .upsert(
        {
          user_id: user.id,
          year,
          month,
          valor: dados.valor || 0,
          data_recebimento: dados.data || null,
          obs: dados.obs || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,year,month' }
      )
    if (error) {
      console.error('Error saving pagamento final do mês:', error)
      throw new Error('Erro ao salvar pagamento final')
    }
  }

  revalidateTag('projects', 'max')
}