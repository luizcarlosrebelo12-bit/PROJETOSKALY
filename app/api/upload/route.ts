import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody

    const jsonResponse = await handleUpload({
      body,
      request,

      // Chamado quando o navegador pede autorização para enviar.
      // A checagem de login fica AQUI, porque o callback de
      // "upload concluído" vem da Vercel, sem cookies de sessão.
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const supabase = await createClient()

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          throw new Error('Sessão expirada. Faça login novamente.')
        }

        console.log('BLOB: gerando token', { user: user.id, pathname })

        return {
          allowedContentTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'text/plain',
            'text/csv',
            'application/zip',
            'application/x-zip-compressed',
            'application/x-rar-compressed',
            'application/vnd.rar',
            'application/octet-stream',
          ],
          maximumSizeInBytes: 500 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: user.id,
            clientPayload: clientPayload ?? null,
          }),
        }
      },

      onUploadCompleted: async ({ blob }) => {
        console.log('BLOB: upload concluído', blob.url)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('ERRO API /api/upload:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro desconhecido ao enviar arquivo',
      },
      { status: 400 },
    )
  }
}