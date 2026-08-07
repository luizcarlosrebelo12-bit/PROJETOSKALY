'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { FileArchive, Download, FolderOpen, HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getAllZipFiles } from '@/app/actions/files'

interface ZipFile {
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

export default function DriversPage() {
  const [zipFiles, setZipFiles] = useState<ZipFile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchZips() {
      setIsLoading(true)
      try {
        const data = await getAllZipFiles()
        setZipFiles(data as ZipFile[])
      } catch (error) {
        console.error('Error fetching zip files:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchZips()
  }, [])

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
    const groups: Record<string, ZipFile[]> = {}

    zipFiles.forEach((file) => {
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
  }, [zipFiles])

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <h1 className="text-lg font-bold text-foreground">Drivers</h1>
          <span className="text-sm text-muted-foreground">
            {zipFiles.length} {zipFiles.length === 1 ? 'arquivo' : 'arquivos'}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 p-4 md:p-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : zipFiles.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center sm:p-8">
            <HardDrive className="mx-auto h-10 w-10 text-muted-foreground sm:h-12 sm:w-12" />
            <h2 className="mt-3 text-lg font-semibold text-foreground sm:mt-4 sm:text-xl">
              Nenhum arquivo ZIP encontrado
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-base">
              Os arquivos ZIP enviados nos projetos aparecerão aqui, agrupados por marca.
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
                    <FileArchive className="h-5 w-5 shrink-0 text-muted-foreground" />
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