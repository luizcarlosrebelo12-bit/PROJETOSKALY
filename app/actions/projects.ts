'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateTag } from 'next/cache'
import type { ProjectFormData, EvaluationFormData } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers de rollover automático de mês
// ---------------------------------------------------------------------------

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

  const isEntregue = formData.andamento === 'ENTREGUE'

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
      entrada_valor: formData.entrada_valor,
      entrada_data: formData.entrada_data || null,
      entrada_obs: formData.entrada_obs,
      pagamento_final_valor: isEntregue ? formData.pagamento_final_valor : null,
      pagamento_final_data: isEntregue ? (formData.pagamento_final_data || null) : null,
      pagamento_final_obs: isEntregue ? formData.pagamento_final_obs : null,
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

  const isEntregue = formData.andamento === 'ENTREGUE'

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
      entrada_valor: formData.entrada_valor,
      entrada_data: formData.entrada_data || null,
      entrada_obs: formData.entrada_obs,
      pagamento_final_valor: isEntregue ? formData.pagamento_final_valor : null,
      pagamento_final_data: isEntregue ? (formData.pagamento_final_data || null) : null,
      pagamento_final_obs: isEntregue ? formData.pagamento_final_obs : null,
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

  if (!data || data.length === 0) {
    return {
      totalProjects: 0,
      totalValue: 0,
      totalPagamentosFinais: 0,
      receitaTotal: 0,
      mediaMensal: 0,
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
      monthly[idx].pagamentosFinais += Number(p.pagamento_final_valor) || 0
    }
    monthly[idx].totalRecebido = monthly[idx].valorProjetos + monthly[idx].pagamentosFinais
  })

  const totalValue = data.reduce((sum, p) => sum + (Number(p.valor) || 0), 0)
  const totalPagamentosFinais = data.reduce(
    (sum, p) => sum + (p.andamento === 'ENTREGUE' ? Number(p.pagamento_final_valor) || 0 : 0),
    0
  )
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
    .select('month, valor, andamento, pagamento_final_valor')
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
      const pf = Number(p.pagamento_final_valor) || 0
      months[idx].pagamentosFinais += pf
      if (pf > 0) months[idx].pagamentosRecebidos += 1
    }
    months[idx].totalRecebido = months[idx].valorProjetos + months[idx].pagamentosFinais
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
export async function getEntradaSummary(year: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('projects')
    .select('marca, cidade, entrada_valor, entrada_data')
    .eq('user_id', user.id)
    .eq('is_evaluation', false)
    .not('entrada_data', 'is', null)

  if (error) {
    console.error('Error fetching entrada summary:', error)
    return []
  }

  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    count: 0,
    total: 0,
    projetos: [] as { marca: string; cidade: string; valor: number; data: string }[],
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
    })
  })

  return months
}

// Agrupa por mês em que o PAGAMENTO FINAL foi recebido (usa
// pagamento_final_data, não o year/month do projeto) — mesmo padrão
// da getEntradaSummary, mas só considera projetos ENTREGUES.
export async function getPagamentoFinalSummary(year: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('projects')
    .select('marca, cidade, pagamento_final_valor, pagamento_final_data')
    .eq('user_id', user.id)
    .eq('is_evaluation', false)
    .eq('andamento', 'ENTREGUE')
    .not('pagamento_final_data', 'is', null)

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

  data?.forEach((p) => {
    if (!p.pagamento_final_data) return
    const [pfYear, pfMonth] = p.pagamento_final_data.split('-').map(Number)
    if (pfYear !== year) return
    const idx = pfMonth - 1
    if (idx < 0 || idx > 11) return
    months[idx].count += 1
    months[idx].total += Number(p.pagamento_final_valor) || 0
    months[idx].projetos.push({
      marca: p.marca || '-',
      cidade: p.cidade || '-',
      valor: Number(p.pagamento_final_valor) || 0,
      data: p.pagamento_final_data,
    })
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