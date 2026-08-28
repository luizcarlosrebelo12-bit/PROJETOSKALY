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
  // NOVO: entrada = quando o valor cai na conta (independe do status do projeto)
  entrada_valor: number | null
  entrada_data: string | null
  entrada_obs: string | null
  pagamento_final_valor: number | null
  pagamento_final_data: string | null
  pagamento_final_obs: string | null
  is_evaluation: boolean
  evaluation_stage: EvaluationStage | null
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
  entrada_valor: number | null
  entrada_data: string | null
  entrada_obs: string | null
  pagamento_final_valor: number | null
  pagamento_final_data: string | null
  pagamento_final_obs: string | null
}