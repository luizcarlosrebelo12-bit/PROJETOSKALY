export type ProjectStatus = 
  | 'REUNIÃO' 
  | 'LEVANTAMENTO' 
  | 'LAYOUT' 
  | 'DESENVOLVIMENTO' 
  | 'ENTREGUE' 
  | 'PENDENTE'

export interface Project {
  id: string
  user_id: string
  year: number
  month: number
  marca: string | null
  cidade: string | null
  data_inicio: string | null
  data_final: string | null
  modalidade: string | null
  arquiteto: string | null
  valor: number
  andamento: ProjectStatus
  pagamento_final_valor: number | null
  pagamento_final_data: string | null
  pagamento_final_obs: string | null
  // NOVO: marca se o registro ainda é uma prospecção (aba "Avaliação")
  // ou se já é um projeto de verdade, lançado num mês.
  is_evaluation: boolean
  created_at: string
  updated_at: string
}

export interface ProjectFormData {
  marca: string
  cidade: string
  data_inicio: string
  data_final: string
  modalidade: string
  arquiteto: string
  valor: number
  andamento: ProjectStatus
  pagamento_final_valor: number | null
  pagamento_final_data: string | null
  pagamento_final_obs: string | null
}

// NOVO: formulário simplificado usado na aba "Projetos em Avaliação".
// Não tem datas/andamento/pagamento porque isso só passa a existir
// quando o fechamento é confirmado.
export interface EvaluationFormData {
  marca: string
  cidade: string
  modalidade: string
  arquiteto: string
  valor: number
}

export interface Folder {
  id: string
  user_id: string
  project_id: string
  parent_id: string | null
  nome: string
  is_oficial: boolean
  created_at: string
}

export interface FileItem {
  id: string
  user_id: string
  project_id: string
  folder_id: string | null
  nome: string
  pathname: string
  tipo: string | null
  tamanho: number | null
  responsavel: string | null
  observacoes: string | null
  data_upload: string
}

export interface Image3D {
  id: string
  user_id: string
  project_id: string
  folder_id: string | null
  nome: string
  pathname: string
  tamanho: number | null
  created_at: string
}

export interface MonthFinancial {
  month: number
  valorProjetos: number
  pagamentosFinais: number
  totalRecebido: number
  projetosEntregues: number
  pagamentosRecebidos: number
  totalProjetos: number
}

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export const MONTHS_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
]

export const STATUS_OPTIONS: ProjectStatus[] = [
  'REUNIÃO',
  'LEVANTAMENTO', 
  'LAYOUT',
  'DESENVOLVIMENTO',
  'ENTREGUE',
  'PENDENTE'
]

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  'REUNIÃO': 'bg-blue-100 text-blue-800',
  'LEVANTAMENTO': 'bg-yellow-100 text-yellow-800',
  'LAYOUT': 'bg-orange-100 text-orange-800',
  'DESENVOLVIMENTO': 'bg-purple-100 text-purple-800',
  'ENTREGUE': 'bg-green-100 text-green-800',
  'PENDENTE': 'bg-red-100 text-red-800',
}

export const DOC_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip']
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']