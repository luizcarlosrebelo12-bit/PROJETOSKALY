'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateTag } from 'next/cache'
import type { ProjectFormData } from '@/lib/types'

export async function getProjects(year: number, month: number) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('month', month)
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
      pagamento_final_valor: isEntregue ? formData.pagamento_final_valor : null,
      pagamento_final_data: isEntregue ? (formData.pagamento_final_data || null) : null,
      pagamento_final_obs: isEntregue ? formData.pagamento_final_obs : null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating project:', error)
    throw new Error('Erro ao criar projeto')
  }

  // Cria automaticamente a pasta "Projeto Oficial"
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
    .select('month, valor')
    .eq('user_id', user.id)
    .eq('year', year)

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
    summary[monthIndex].total += Number(project.valor) || 0
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

  // Por marca
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

  // Por arquiteto
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

  // Média de dias úteis
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

  // Relatório mensal
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

  // Exclui todos os projetos do ano. As tabelas folders, files e images_3d
  // possuem ON DELETE CASCADE, então serão removidas automaticamente.
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('user_id', user.id)
    .eq('year', year)

  if (error) {
    console.error('Error deleting year:', error)
    throw new Error('Erro ao excluir o ano')
  }

  revalidateTag('projects', 'max')
}
