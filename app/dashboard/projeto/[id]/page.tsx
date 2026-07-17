'use client'

import { use } from 'react'
import { FilesManager } from '@/components/files-manager'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ id: string }> | { id: string }
}

export default function ProjetoDetalhesPage({ params }: PageProps) {
  const resolvedParams = params instanceof Promise ? use(params) : params
  const projectId = resolvedParams.id

  // Definimos um e-mail de fallback padrão para o responsável
  const userEmail = "admin@empresa.com"

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      {/* Cabeçalho com botão para voltar ao painel principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link href="/dashboard" passHref>
            <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Voltar para o Painel
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Documentos & Arquivos do Projeto
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie plantas, imagens 3D, PDFs de contratos e anexos deste projeto.
          </p>
        </div>
      </div>

      {/* Caixa do Gerenciador de Arquivos conectado ao ID correto */}
      <div className="border rounded-xl bg-card p-4 md:p-6 shadow-sm">
        <FilesManager projectId={projectId} userEmail={userEmail} />
      </div>
    </div>
  )
}