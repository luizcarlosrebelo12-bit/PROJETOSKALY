import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pathname = request.nextUrl.searchParams.get('pathname')
  const download = request.nextUrl.searchParams.get('download') === '1'

  if (!pathname) {
    return NextResponse.json({ error: 'Missing pathname' }, { status: 400 })
  }

  let url: URL

  try {
    url = new URL(pathname)
  } catch {
    // Arquivo antigo (ex: /uploads/...) salvo antes da migração para o Blob
    return NextResponse.json(
      {
        error:
          'Arquivo antigo não encontrado no armazenamento. Envie o arquivo novamente.',
      },
      { status: 404 },
    )
  }

  // Segurança: só redireciona para o Vercel Blob
  if (
    url.protocol !== 'https:' ||
    !url.hostname.endsWith('.blob.vercel-storage.com')
  ) {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
  }

  // ?download=1 faz o Blob responder com Content-Disposition: attachment
  if (download) {
    url.searchParams.set('download', '1')
  }

  return NextResponse.redirect(url, 307)
}