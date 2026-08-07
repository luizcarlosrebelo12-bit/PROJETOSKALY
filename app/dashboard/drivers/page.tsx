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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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

  // Agrupa por marca e mantém cada grupo ordenado do mais recente pro mais antigo
  const groupedByBrand = useMemo(() => {
    const groups: Record<string, ProjectFile[]> = {}

    projectFiles.forEach((file) => {
      const marca = file.projects?.marca || 'Sem marca'
      if (!groups[marca]) groups[marca] = []
      groups[marca].push(file)
    })

    // Cada grupo já vem ordenado (a query já traz decrescente), mas garantimos aqui também
    Object.keys(groups).forEach((marca) => {
      groups[marca].sort(
        (a, b) => new Date(b.data_upload).getTime() - new Date(a.data_upload).getTime()
      )
    })

    // Ordena as marcas pelo arquivo mais recente de cada uma (marca com upload mais novo primeiro)
    return Object.entries(groups).sort(([, filesA], [, filesB]) => {
      const latestA = new Date(filesA[0].data_upload).getTime()
      const latestB = new Date(filesB[0].data_upload).getTime()
      return latestB - latestA
    })
  }, [projectFiles])

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-foreground">Drivers</h1>
            <span className="text-sm text-muted-foreground">
              {projectFiles.length} {projectFiles.length === 1 ? 'arquivo' : 'arquivos'}
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
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : projectFiles.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center sm:p-8">
            <HardDrive className="mx-auto h-10 w-10 text-muted-foreground sm:h-12 sm:w-12" />
            <h2 className="mt-3 text-lg font-semibold text-foreground sm:mt-4 sm:text-xl">
              Nenhum arquivo em {year}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-base">
              Os arquivos enviados nas pastas dos projetos deste ano aparecerão aqui, agrupados por marca.
            </p>
          </div>
        ) : (
          groupedByBrand.map(([marca, files]) => (
            <Card key={marca} className="p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground sm:text-lg">{marca}</h2>
                <span className="text-xs text-muted-foreground sm:text-sm">
                  {files.length} {files.length === 1 ? 'arquivo' : 'arquivos'}
                </span>
              </div>
              <ul className="divide-y">
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
            </Card>
          ))
        )}
      </main>
    </>
  )
}