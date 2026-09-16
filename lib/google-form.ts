// Troque pelo ID real do seu formulário (fica na URL: .../forms/d/e/SEU_FORM_ID/viewform)
const FORM_BASE_URL = 'https://docs.google.com/forms/d/e/SEU_FORM_ID/viewform'

// Troque pelo "entry.XXXXXXX" da pergunta "ID do Projeto".
// Pra descobrir: no formulário, Enviar → ícone de link → "Copiar link pré-preenchido",
// preencha um valor de teste em "ID do Projeto" e veja o parâmetro gerado no link.
const PROJECT_ID_ENTRY = 'entry.123456789'

export function getFormularioLink(projectId: string) {
  const params = new URLSearchParams({ [PROJECT_ID_ENTRY]: projectId })
  return `${FORM_BASE_URL}?${params.toString()}`
}