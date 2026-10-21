import { get } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const pathname = searchParams.get('pathname')
  const filename = searchParams.get('filename') ?? 'arquivo'

  if (!pathname) {
    return NextResponse.json({ error: 'pathname ausente' }, { status: 400 })
  }

  const result = await get(pathname, { access: 'private' })

  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
  }

  return new Response(result.stream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}