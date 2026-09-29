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
    const pathname = request.nextUrl.searchParams.get('pathname')
    const download = request.nextUrl.searchParams.get('download')

    if (!pathname) {
      return NextResponse.json(
        { error: 'Missing pathname' },
        { status: 400 }
      )
    }

    /*
     * Os arquivos atuais estão no Vercel Blob como PUBLIC.
     *
     * O get() aceita tanto pathname quanto URL completa.
     * Aqui usamos exatamente o valor salvo no banco.
     */
    const result = await get(pathname, {
      access: 'public',
      ifNoneMatch:
        request.headers.get('if-none-match') ?? undefined,
    })

    /*
     * Se o arquivo não foi encontrado.
     */
    if (!result) {
      return new NextResponse('Arquivo não encontrado', {
        status: 404,
      })
    }

    /*
     * Se o navegador já possui a versão atual.
     */
    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          'Cache-Control': 'private, no-cache',
        },
      })
    }

    /*
     * Segurança extra:
     * somente aceitamos resposta 200.
     */
    if (result.statusCode !== 200 || !result.stream) {
      return new NextResponse('Arquivo não disponível', {
        status: 404,
      })
    }

    /*
     * Nome original do arquivo.
     *
     * Como pathname pode ser uma URL completa:
     *
     * https://xxxxx.public.blob.vercel-storage.com/arquivo.pdf
     *
     * pegamos somente a parte final.
     */
    let filename = 'arquivo'

    try {
      const blobUrl = new URL(pathname)
      const lastPart = blobUrl.pathname.split('/').pop()

      if (lastPart) {
        filename = decodeURIComponent(lastPart)
      }
    } catch {
      /*
       * Caso pathname não seja uma URL,
       * tenta tratar como caminho normal.
       */
      const lastPart = pathname.split('/').pop()

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
        result.blob.contentType || 'application/octet-stream',

      ETag: result.blob.etag,

      'Cache-Control': 'private, no-cache',

      'Content-Length': String(result.blob.size ?? 0),
    }

    /*
     * Download:
     * força o navegador a salvar o arquivo.
     */
    if (download === '1') {
      const asciiName = filename
        .replace(/[^\x20-\x7E]/g, '_')
        .replace(/"/g, '')

      headers['Content-Disposition'] =
        `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    } else {
      /*
       * Visualização:
       * permite que PDF/imagem/etc. sejam abertos no navegador.
       */
      headers['Content-Disposition'] = 'inline'
    }

    return new NextResponse(result.stream, {
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