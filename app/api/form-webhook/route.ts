import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Endpoint chamado pelo Google Apps Script quando o formulário é enviado.
// Configure no .env: FORM_WEBHOOK_SECRET=algum_segredo_forte
// (e certifique-se de ter SUPABASE_SERVICE_ROLE_KEY no ambiente também).

export async function POST(request: NextRequest) {
  // 1. Confere o segredo compartilhado — só o Apps Script deve conseguir chamar isso
  const secret = request.headers.get('x-webhook-secret')
  if (secret !== process.env.FORM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    project_id?: string
    answers?: Record<string, unknown>
    submitted_at?: string
    respondent_email?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { project_id, answers, submitted_at, respondent_email } = body

  if (!project_id || !answers) {
    return NextResponse.json(
      { error: 'project_id e answers são obrigatórios' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // 2. Confirma que o projeto existe e pega o user_id dono dele
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, user_id')
    .eq('id', project_id)
    .single()

  if (projectError || !project) {
    return NextResponse.json(
      { error: 'Projeto não encontrado', project_id },
      { status: 404 }
    )
  }

  // 3. Grava a resposta vinculada ao projeto
  // IMPORTANTE: a tabela é `project_evaluations` — é dela que
  // getProjectEvaluation() lê (veja app/actions/projects.ts).
  // Antes estava gravando em `form_responses`, uma tabela que
  // nada mais no app lê, por isso as avaliações "sumiam".
  const { error: upsertError } = await supabase
    .from('project_evaluations')
    .upsert(
      {
        project_id: project.id,
        user_id: project.user_id,
        answers,
        respondent_email: respondent_email ?? null,
        submitted_at: submitted_at ?? new Date().toISOString(),
      },
      { onConflict: 'project_id' }
    )

  if (upsertError) {
    console.error('Error inserting project evaluation:', upsertError)
    return NextResponse.json({ error: 'Erro ao gravar resposta' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}