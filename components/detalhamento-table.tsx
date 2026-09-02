'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Search, Filter, X } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface ProjetoDetalhe {
  marca: string
  cidade: string
  valor: number
  data: string
}

interface DetalhamentoTableProps {
  title: string
  data: ProjetoDetalhe[]
  emptyMessage: string
  formatCurrency: (value: number) => string
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

// Dropdown de filtro estilo Excel (checkbox por valor único da coluna)
function ColumnFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: string[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
}) {
  const [open, setOpen] = useState(false)
  const active = selected.size > 0

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`ml-1 rounded p-0.5 hover:bg-muted ${active ? 'text-primary' : 'text-muted-foreground'}`}
        title={`Filtrar ${label}`}
      >
        <Filter className="h-3 w-3" fill={active ? 'currentColor' : 'none'} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-md border bg-popover p-2 text-left shadow-lg">
            <div className="mb-1 flex justify-between gap-2 border-b pb-1 text-[11px]">
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => onChange(new Set())}
              >
                Selecionar tudo
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:underline"
                onClick={() => onChange(new Set(options))}
              >
                Limpar
              </button>
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {options.map((opt) => {
                const isChecked = selected.size === 0 || selected.has(opt)
                return (
                  <label
                    key={opt}
                    className="flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-xs hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (selected.size === 0) {
                          onChange(new Set(options.filter((o) => o !== opt)))
                        } else {
                          const next = new Set(selected)
                          if (next.has(opt)) {
                            next.delete(opt)
                          } else {
                            next.add(opt)
                          }
                          onChange(next)
                        }
                      }}
                      className="h-3 w-3"
                    />
                    <span className="truncate text-foreground">{opt}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </>
      )}
    </span>
  )
}

export function DetalhamentoTable({ title, data, emptyMessage, formatCurrency }: DetalhamentoTableProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [monthFilter, setMonthFilter] = useState('todos')
  const [projetoFilter, setProjetoFilter] = useState<Set<string>>(new Set())
  const [cidadeFilter, setCidadeFilter] = useState<Set<string>>(new Set())

  const projetoOptions = useMemo(
    () => Array.from(new Set(data.map((p) => p.marca))).sort(),
    [data]
  )
  const cidadeOptions = useMemo(
    () => Array.from(new Set(data.map((p) => p.cidade))).sort(),
    [data]
  )
  const monthOptions = useMemo(
    () =>
      Array.from(new Set(data.map((p) => parseInt(p.data.split('-')[1], 10)))).sort(
        (a, b) => a - b
      ),
    [data]
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return data.filter((p) => {
      if (projetoFilter.size > 0 && !projetoFilter.has(p.marca)) return false
      if (cidadeFilter.size > 0 && !cidadeFilter.has(p.cidade)) return false
      if (monthFilter !== 'todos' && p.data.split('-')[1] !== monthFilter) return false
      if (term) {
        const matchesNome =
          p.marca.toLowerCase().includes(term) || p.cidade.toLowerCase().includes(term)
        const matchesData = formatDate(p.data).includes(term)
        if (!matchesNome && !matchesData) return false
      }
      return true
    })
  }, [data, search, monthFilter, projetoFilter, cidadeFilter])

  const hasActiveFilters =
    search.trim() !== '' ||
    monthFilter !== 'todos' ||
    projetoFilter.size > 0 ||
    cidadeFilter.size > 0

  const clearFilters = () => {
    setSearch('')
    setMonthFilter('todos')
    setProjetoFilter(new Set())
    setCidadeFilter(new Set())
  }

  const total = filtered.reduce((sum, p) => sum + p.valor, 0)

  return (
    <Card className="overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between p-4 text-left sm:p-6"
      >
        <h3 className="text-sm font-semibold text-foreground sm:text-base">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {data.length} {data.length === 1 ? 'registro' : 'registros'}
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="border-t p-4 sm:p-6">
          {data.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="relative min-w-[180px] flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome ou data (ex: 20/07)"
                    className="w-full rounded-md border bg-background py-1.5 pl-8 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  />
                </div>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="rounded-md border bg-background px-2 py-1.5 text-xs sm:text-sm"
                >
                  <option value="todos">Todos os meses</option>
                  {monthOptions.map((m) => (
                    <option key={m} value={String(m).padStart(2, '0')}>
                      {MESES[m - 1]}
                    </option>
                  ))}
                </select>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" /> Limpar filtros
                  </button>
                )}
                {/* Filtros de coluna (Projeto/Cidade) no mobile, já que a tabela
                    vira cards e esses botões não aparecem mais nos <th>. */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground sm:hidden">
                  <span className="inline-flex items-center">
                    Projeto
                    <ColumnFilter
                      label="Projeto"
                      options={projetoOptions}
                      selected={projetoFilter}
                      onChange={setProjetoFilter}
                    />
                  </span>
                  <span className="inline-flex items-center">
                    Cidade
                    <ColumnFilter
                      label="Cidade"
                      options={cidadeOptions}
                      selected={cidadeFilter}
                      onChange={setCidadeFilter}
                    />
                  </span>
                </div>
              </div>

              {filtered.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum resultado para os filtros aplicados
                </p>
              ) : (
                <>
                  {/* ===================================================== */}
                  {/* MOBILE: lista em cards, sem scroll horizontal          */}
                  {/* ===================================================== */}
                  <div className="space-y-2 sm:hidden">
                    {filtered.map((p, i) => (
                      <div
                        key={i}
                        className="rounded-md border bg-background p-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-foreground">{p.marca}</span>
                          <span className="whitespace-nowrap font-semibold text-foreground">
                            {formatCurrency(p.valor)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{p.cidade}</span>
                          <span className="whitespace-nowrap">{formatDate(p.data)}</span>
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 flex justify-between border-t pt-2 text-xs text-muted-foreground">
                      <span>
                        {filtered.length} de {data.length} registro(s)
                      </span>
                      <span className="font-semibold text-foreground">
                        Total: {formatCurrency(total)}
                      </span>
                    </div>
                  </div>

                  {/* ===================================================== */}
                  {/* DESKTOP: tabela original, intocada                    */}
                  {/* ===================================================== */}
                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="py-2 pr-4 font-medium">
                            <span className="inline-flex items-center">
                              Projeto
                              <ColumnFilter
                                label="Projeto"
                                options={projetoOptions}
                                selected={projetoFilter}
                                onChange={setProjetoFilter}
                              />
                            </span>
                          </th>
                          <th className="py-2 pr-4 font-medium">
                            <span className="inline-flex items-center">
                              Cidade
                              <ColumnFilter
                                label="Cidade"
                                options={cidadeOptions}
                                selected={cidadeFilter}
                                onChange={setCidadeFilter}
                              />
                            </span>
                          </th>
                          <th className="py-2 pr-4 font-medium">Data</th>
                          <th className="py-2 text-right font-medium">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((p, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-2 pr-4 text-foreground">{p.marca}</td>
                            <td className="py-2 pr-4 text-muted-foreground">{p.cidade}</td>
                            <td className="py-2 pr-4 text-muted-foreground">{formatDate(p.data)}</td>
                            <td className="py-2 text-right font-medium text-foreground">
                              {formatCurrency(p.valor)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-3 flex justify-end gap-4 border-t pt-2 text-xs text-muted-foreground sm:text-sm">
                      <span>
                        {filtered.length} de {data.length} registro(s)
                      </span>
                      <span className="font-semibold text-foreground">
                        Total: {formatCurrency(total)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  )
}