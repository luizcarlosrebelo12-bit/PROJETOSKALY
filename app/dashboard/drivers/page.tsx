'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  FileArchive,
  FileText,
  FileImage,
  FileSpreadsheet,
  Download,
  FolderOpen,
  HardDrive,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getAllProjectFiles } from '@/app/actions/files'

interface ProjectFile {
  id: string
  nome: string
  pathname: string
  tipo: string
  tamanho: number | null
  responsavel: string | null
  observacoes: string | null
  data_upload: string
  project_id: string
  folder_id: string | null
  projects: {
    marca: string | null
    cidade: string | null
    year: number
    month: number
  } | null
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const SHEET_EXTENSIONS = ['xls', 'xlsx', 'csv']
const ARCHIVE_EXTENSIONS = ['zip', 'rar']

function FileTypeIcon({ tipo }: { tipo: string }) {
  const ext = tipo.toLowerCase()
  if (ARCHIVE_EXTENSIONS.includes(ext)) {
    return <FileArchive className="h-5 w-5 shrink-0 text-amber-500" />
  }
  if (IMAGE_EXTENSIONS.includes(ext)) {
    return <FileImage className="h-5 w-5 shrink-0 text-purple-500" />
  }
  if (SHEET_EXTENSIONS.includes(ext)) {
    return <FileSpreadsheet className="h-5 w-5 shrink-0 text-emerald-500" />
  }
  return <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
}

export default function DriversPage() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [openBrands, setOpenBrands] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchFiles() {
      setIsLoading(true)
      try {
        const data = await getAllProjectFiles(year)
        setProjectFiles(data as ProjectFile[])
      } catch (error) {
        console.error('Error fetching project files:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchFiles()
  }, [year])

  // Fecha todos os grupos de novo ao trocar de ano
  useEffect(() => {
    setOpenBrands(new Set())
  }, [year])

  const toggleBrand = (marca: string) => {
    setOpenBrands((prev) => {
      const next = new Set(prev)
      if (next.has(marca)) {
        next.delete(marca)
      } else {
        next.add(marca)
      }
      return next
    })
  }

  // Mesma lógica de resolução de URL usada no files-manager.tsx
  const getFileUrl = (pathname: string) => {
    if (!pathname) return '#'
    if (pathname.startsWith('http://') || pathname.startsWith('https://')) {
      return pathname
    }
    if (pathname.includes('uploads/')) {
      return pathname.startsWith('/') ? pathname : `/${pathname}`
    }
    return `/uploads/${pathname}`
  }

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  // Filtra por nome do arquivo OU pela data (aceita formatos tipo "20/07", "20/07/2026", "julho")
  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return projectFiles

    return projectFiles.filter((file) => {
      const nameMatch = file.nome.toLowerCase().includes(query)
      const dateMatch = formatDate(file.data_upload).toLowerCase().includes(query)
      return nameMatch || dateMatch
    })
  }, [projectFiles, search])

  // Agrupa por marca e mantém cada grupo ordenado do mais recente pro mais antigo
  const groupedByBrand = useMemo(() => {
    const groups: Record<string, ProjectFile[]> = {}

    filteredFiles.forEach((file) => {
      const marca = file.projects?.marca || 'Sem marca'
      if (!groups[marca]) groups[marca] = []
      groups[marca].push(file)
    })

    Object.keys(groups).forEach((marca) => {
      groups[marca].sort(
        (a, b) => new Date(b.data_upload).getTime() - new Date(a.data_upload).getTime()
      )
    })

    return Object.entries(groups).sort(([, filesA], [, filesB]) => {
      const latestA = new Date(filesA[0].data_upload).getTime()
      const latestB = new Date(filesB[0].data_upload).getTime()
      return latestB - latestA
    })
  }, [filteredFiles])

  // Enquanto o usuário busca, mostra os grupos com resultado já abertos automaticamente
  const isSearching = search.trim().length > 0

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-foreground">Drivers</h1>
            <span className="text-sm text-muted-foreground">
              {filteredFiles.length} {filteredFiles.length === 1 ? 'arquivo' : 'arquivos'}
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-lg border bg-background px-1 py-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setYear((y) => y - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-16 text-center text-base font-semibold text-foreground">
              {year}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setYear((y) => y + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 p-4 md:p-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome do arquivo ou data (ex: 20/07/2026)"
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center sm:p-8">
            <HardDrive className="mx-auto h-10 w-10 text-muted-foreground sm:h-12 sm:w-12" />
            <h2 className="mt-3 text-lg font-semibold text-foreground sm:mt-4 sm:text-xl">
              {isSearching ? 'Nenhum arquivo encontrado' : `Nenhum arquivo em ${year}`}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-base">
              {isSearching
                ? 'Tente buscar por outro nome ou outra data.'
                : 'Os arquivos enviados nas pastas dos projetos deste ano aparecerão aqui, agrupados por marca.'}
            </p>
          </div>
        ) : (
          groupedByBrand.map(([marca, files]) => {
            const isOpen = isSearching || openBrands.has(marca)
            return (
              <Card key={marca} className="overflow-hidden p-0">
                <button
                  onClick={() => toggleBrand(marca)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/50 sm:p-6"
                >
                  <h2 className="text-base font-semibold text-foreground sm:text-lg">{marca}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground sm:text-sm">
                      {files.length} {files.length === 1 ? 'arquivo' : 'arquivos'}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>
                {isOpen && (
                  <ul className="divide-y border-t px-4 sm:px-6">
                    {files.map((file) => (
                      <li key={file.id} className="flex items-center gap-3 py-3">
                        <FileTypeIcon tipo={file.tipo} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{file.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(file.data_upload)} · {formatSize(file.tamanho)}
                            {file.projects?.cidade ? ` · ${file.projects.cidade}` : ''}
                            {file.responsavel ? ` · ${file.responsavel}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Link href={`/dashboard/projeto/${file.project_id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Abrir projeto">
                              <FolderOpen className="h-4 w-4 text-primary" />
                            </Button>
                          </Link>
                          <a href={getFileUrl(file.pathname)} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Baixar">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )
          })
        )}
      </main>
    </>
  )
}