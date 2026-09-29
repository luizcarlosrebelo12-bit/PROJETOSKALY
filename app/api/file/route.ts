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

    // Os arquivos atuais estão armazenados como PUBLIC no Vercel Blob.
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

    // Arquivo não sofreu alteração desde a última requisição.
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

    // Força o download quando ?download=1 estiver presente.
    if (download) {
      const filename =
        pathname.split('/').pop() || 'arquivo'

      // Fallback para nomes com caracteres especiais.
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