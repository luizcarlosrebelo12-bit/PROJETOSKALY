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
     * IMPORTANTE:
     * Os arquivos atualmente são enviados para o Vercel Blob
     * com access: 'public'.
     *
     * Portanto, o get() também precisa usar access: 'public'.
     */
    const result = await get(pathname, {
      access: 'public',
      ifNoneMatch:
        request.headers.get('if-none-match') ?? undefined,
    })

    if (!result) {
      return new NextResponse('Not found', {
        status: 404,
      })
    }

    /*
     * Resposta 304:
     * o navegador já possui a versão mais recente.
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

    const headers: Record<string, string> = {
      'Content-Type':
        result.blob.contentType || 'application/octet-stream',

      ETag: result.blob.etag,

      'Cache-Control': 'private, no-cache',
    }

    /*
     * Quando ?download=1 estiver presente,
     * força o navegador a baixar o arquivo.
     */
    if (download) {
      const filename =
        pathname.split('/').pop() || 'arquivo'

      /*
       * Fallback ASCII para navegadores que tenham
       * dificuldade com caracteres especiais.
       *
       * Exemplo:
       * JUNDIAÍ.pdf
       * vira:
       * JUNDIA_.pdf
       *
       * O filename* mantém o nome original em UTF-8.
       */
      const asciiName = filename
        .replace(/[^\x20-\x7E]/g, '_')
        .replace(/"/g, '')

      headers['Content-Disposition'] =
        `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    }

    return new NextResponse(result.stream, {
      headers,
    })
  } catch (error) {
    console.error('Error serving file:', error)

    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    )
  }
}