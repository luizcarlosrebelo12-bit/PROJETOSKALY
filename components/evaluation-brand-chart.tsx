'use client'

import type { Project } from '@/lib/types'
import { COLOR_PALETTE } from '@/lib/types'

interface EvaluationBrandChartProps {
  projects: Project[]
}

export function EvaluationBrandChart({ projects }: EvaluationBrandChartProps) {
  if (projects.length === 0) {
    return null
  }

  // Agrupa por marca, contando quantos projetos e guardando a cor
  // escolhida no cadastro (usa a cor do primeiro projeto daquela marca).
  const grouped = new Map<string, { count: number; color: string }>()
  projects.forEach((project, index) => {
    const marca = project.marca || 'Não definida'
    const color = project.cor || COLOR_PALETTE[index % COLOR_PALETTE.length]
    const existing = grouped.get(marca)
    if (existing) {
      existing.count += 1
    } else {
      grouped.set(marca, { count: 1, color })
    }
  })

  const data = Array.from(grouped.entries())
    .map(([name, { count, color }]) => ({ name, count, color }))
    .sort((a, b) => b.count - a.count)

  const maxCount = Math.max(...data.map((d) => d.count))
  const MAX_BAR_HEIGHT = 160

  return (
    <div className="rounded-lg border bg-card p-4 sm:p-6">
      <h3 className="mb-6 text-center text-sm font-semibold text-foreground sm:text-base">
        Projetos por Marca (em avaliação)
      </h3>
      <div className="flex items-end justify-center gap-4 overflow-x-auto pb-2 sm:gap-6">
        {data.map((item) => {
          const barHeight = Math.max(
            32,
            (item.count / maxCount) * MAX_BAR_HEIGHT
          )
          return (
            <div key={item.name} className="flex shrink-0 flex-col items-center" style={{ width: 76 }}>
              {/* "pin" no topo, estilo bandeirinha */}
              <div className="mb-1 flex flex-col items-center">
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-bold text-white shadow-sm"
                  style={{ backgroundColor: item.color }}
                >
                  {item.count}
                </span>
                <div
                  className="mt-0.5 h-2 w-0.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              </div>

              {/* barra em formato de bandeirinha (topo arredondado, base em ponta) */}
              <div
                className="w-9 shadow-sm sm:w-11"
                style={{
                  height: barHeight,
                  backgroundColor: item.color,
                  borderTopLeftRadius: '9999px',
                  borderTopRightRadius: '9999px',
                  clipPath: 'polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)',
                }}
              />

              {/* nome da marca embaixo */}
              <span
                className="mt-2 max-w-[76px] truncate text-center text-xs font-medium text-foreground"
                title={item.name}
              >
                {item.name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}