'use client'

import { Star } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Project, ProjectEvaluation } from '@/lib/types'

interface ProjectEvaluationDialogProps {
  project: Project | null
  evaluation: ProjectEvaluation | null
  loading: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Perguntas abertas nunca viram estrela, mesmo que a resposta seja um número.
const OPEN_QUESTION_REGEX =
    /sugest|coment|observa|elogio|cr[ií]tic|depoimento/i

function formatAnswer(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  if (Array.isArray(value)) {
    return value.join(', ')
  }

  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não'
  }

  return String(value)
}

// Extrai o número da pergunta: "05. O projeto..." -> 5
function getQuestionNumber(question: string): number | null {
  const match = question.trim().match(/^(\d{1,2})\s*[.\-)]/)
  return match ? Number(match[1]) : null
}

// Retorna a nota (1 a 5) se a resposta deve virar estrela, senão null
function getRating(question: string, answer: unknown): number | null {
  if (getQuestionNumber(question) === null) return null
  if (OPEN_QUESTION_REGEX.test(question)) return null

  const text = formatAnswer(answer).trim()
  if (!/^[1-5]$/.test(text)) return null

  return Number(text)
}

function RatingStars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${
            index < value
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-muted-foreground'
          }`}
        />
      ))}

      <span className="ml-1 text-sm font-medium">{value}/5</span>
    </div>
  )
}

export function ProjectEvaluationDialog({
  project,
  evaluation,
  loading,
  open,
  onOpenChange,
}: ProjectEvaluationDialogProps) {
  const answers = evaluation?.answers
    ? Object.entries(evaluation.answers)
        .filter(
          ([question]) =>
            !/id do projeto|project id|projectid/i.test(question)
        )
        // Perguntas sem número (nome, carimbo) ficam no topo, na ordem original;
        // as numeradas vêm em ordem crescente. O sort do JS é estável.
        .sort(([a], [b]) => {
          const na = getQuestionNumber(a)
          const nb = getQuestionNumber(b)
          if (na === null && nb === null) return 0
          if (na === null) return -1
          if (nb === null) return 1
          return na - nb
        })
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            Avaliação: {project?.marca || 'Projeto'}
          </DialogTitle>

          <DialogDescription>
            {project?.cidade || 'Avaliação enviada pelo cliente'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : !evaluation ? (
          <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Este projeto ainda não possui uma avaliação respondida.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="text-xs text-muted-foreground">
                Respondido em
              </p>

              <p className="font-medium">
                {new Date(evaluation.submitted_at).toLocaleString('pt-BR')}
              </p>

              {evaluation.respondent_email && (
                <>
                  <p className="mt-3 text-xs text-muted-foreground">
                    E-mail
                  </p>

                  <p className="font-medium">
                    {evaluation.respondent_email}
                  </p>
                </>
              )}
            </div>

            <div className="divide-y rounded-lg border">
              {answers.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  Nenhuma resposta encontrada.
                </p>
              ) : (
                answers.map(([question, answer]) => {
                  const rating = getRating(question, answer)

                  return (
                    <div key={question} className="space-y-2 p-4">
                      <p className="text-sm font-medium">{question}</p>

                      {rating !== null ? (
                        <RatingStars value={rating} />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {formatAnswer(answer)}
                        </p>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}