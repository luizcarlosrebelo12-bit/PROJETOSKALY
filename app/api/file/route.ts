import { type NextRequest, NextResponse } from 'next/server'
import { get } from '@vercel/blob'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const rawPathname = request.nextUrl.searchParams.get('pathname')
    const download = request.nextUrl.searchParams.get('download')

    if (!rawPathname) {
      return NextResponse.json(
        { error: 'Missing pathname' },
        { status: 400 }
      )
    }

    /*
     * CORREÇÃO: Se o pathname salvo no banco for uma URL completa do Vercel Blob
     * (ex: https://xxx.public.blob.vercel-storage.com/arquivo.zip), 
     * precisamos extrair apenas o caminho relativo ou a chave que o get() espera,
     * ou usar diretamente se suportado. No Vercel Blob, a função get() aceita 
     * a URL completa ou o pathname relativo dependendo da versão, mas tratar 
     * a URL garante compatibilidade absoluta.
     */
    let blobIdentifier = rawPathname

    if (rawPathname.startsWith('http://') || rawPathname.startsWith('https://')) {
      try {
        const urlObj = new URL(rawPathname)
        // Remove a barra inicial para obter o pathname correto do blob (ex: "pasta/arquivo.zip")
        blobIdentifier = urlObj.pathname.startsWith('/') 
          ? urlObj.pathname.substring(1) 
          : urlObj.pathname
      } catch {
        blobIdentifier = rawPathname
      }
    }

    const result = await get(blobIdentifier, {
      access: 'public',
      ifNoneMatch:
        request.headers.get('if-none-match') ?? undefined,
    })

    /*
     * Se o arquivo não foi encontrado, tenta buscar usando a URL completa diretamente caso o SDK aceite
     */
    let finalResult = result
    if (!finalResult && blobIdentifier !== rawPathname) {
      try {
        finalResult = await get(rawPathname, {
          access: 'public',
        })
      } catch {
        // Ignora e mantém o erro original
      }
    }

    if (!finalResult) {
      return new NextResponse('Arquivo não encontrado', {
        status: 404,
      })
    }

    if (finalResult.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: finalResult.blob.etag,
          'Cache-Control': 'private, no-cache',
        },
      })
    }

    if (finalResult.statusCode !== 200 || !finalResult.stream) {
      return new NextResponse('Arquivo não disponível', {
        status: 404,
      })
    }

    let filename = 'arquivo'

    try {
      const blobUrl = new URL(rawPathname)
      const lastPart = blobUrl.pathname.split('/').pop()

      if (lastPart) {
        filename = decodeURIComponent(lastPart)
      }
    } catch {
      const lastPart = rawPathname.split('/').pop()

      if (lastPart) {
        try {
          filename = decodeURIComponent(lastPart)
        } catch {
          filename = lastPart
        }
      }
    }

    const headers: Record<string, string> = {
      'Content-Type':
        finalResult.blob.contentType || 'application/octet-stream',

      ETag: finalResult.blob.etag,

      'Cache-Control': 'private, no-cache',

      'Content-Length': String(finalResult.blob.size ?? 0),
    }

    if (download === '1') {
      const asciiName = filename
        .replace(/[^\x20-\x7E]/g, '_')
        .replace(/"/g, '')

      headers['Content-Disposition'] =
        `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    } else {
      headers['Content-Disposition'] = 'inline'
    }

    return new NextResponse(finalResult.stream, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('ERRO API /api/file:', error)

    return NextResponse.json(
      {
        error: 'Failed to serve file',
        message:
          error instanceof Error
            ? error.message
            : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}