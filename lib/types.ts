export type ProjectStatus = 
  | 'REUNIÃO' 
  | 'LEVANTAMENTO' 
  | 'LAYOUT' 
  | 'DESENVOLVIMENTO' 
  | 'ORÇAMENTOS'
  | 'PAGAMENTOS'
  | 'ENTREGUE' 
  | 'PENDENTE'

export type EvaluationStage = 
  | 'STAND BY' 
  | 'ANÁLISE DE PONTO' 
  | 'CONTRATO DE LOCAÇÃO' 
  | 'BUSCA POR PONTO'

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

  // Entrada = quando o valor cai na conta (independe do status do projeto)
  entrada_valor: number | null
  entrada_data: string | null
  entrada_obs: string | null

  pagamento_final_valor: number | null
  pagamento_final_data: string | null
  pagamento_final_obs: string | null

  // Marca se o registro ainda é uma prospecção
  // ou se já é um projeto de verdade, lançado num mês.
  is_evaluation: boolean

  // Etiqueta usada só enquanto o projeto está em avaliação
  evaluation_stage: EvaluationStage | null

  // Cor escolhida pelo usuário, usada na barra do gráfico "Por Marca"
  cor: string | null

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

  // Entrada = quando o valor cai na conta (independe do status do projeto)
  entrada_valor: number | null
  entrada_data: string | null
  entrada_obs: string | null

  pagamento_final_valor: number | null
  pagamento_final_data: string | null
  pagamento_final_obs: string | null
}

// Formulário simplificado usado na aba "Projetos em Avaliação".
export interface EvaluationFormData {
  marca: string
  cidade: string
  modalidade: string
  arquiteto: string
  valor: number
  evaluation_stage: EvaluationStage
  cor: string
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
  'ORÇAMENTOS',
  'PAGAMENTOS',
  'ENTREGUE',
  'PENDENTE'
]

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  'REUNIÃO': 'bg-blue-100 text-blue-800',
  'LEVANTAMENTO': 'bg-yellow-100 text-yellow-800',
  'LAYOUT': 'bg-orange-100 text-orange-800',
  'DESENVOLVIMENTO': 'bg-purple-100 text-purple-800',
  'ORÇAMENTOS': 'bg-cyan-100 text-cyan-800',
  'PAGAMENTOS': 'bg-indigo-100 text-indigo-800',
  'ENTREGUE': 'bg-green-100 text-green-800',
  'PENDENTE': 'bg-red-100 text-red-800',
}

export const EVALUATION_STAGES: EvaluationStage[] = [
  'STAND BY',
  'ANÁLISE DE PONTO',
  'CONTRATO DE LOCAÇÃO',
  'BUSCA POR PONTO',
]

export const EVALUATION_STAGE_COLORS: Record<EvaluationStage, string> = {
  'STAND BY': 'bg-gray-100 text-gray-800',
  'ANÁLISE DE PONTO': 'bg-blue-100 text-blue-800',
  'CONTRATO DE LOCAÇÃO': 'bg-purple-100 text-purple-800',
  'BUSCA POR PONTO': 'bg-orange-100 text-orange-800',
}

// Paleta de sugestão rápida pro seletor de cor do projeto em avaliação
export const COLOR_PALETTE = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f97316', '#84cc16',
  '#ef4444', '#14b8a6', '#6366f1', '#d946ef',
]

export const DOC_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip']
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']