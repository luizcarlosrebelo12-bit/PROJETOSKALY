import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Verifica o usuário logado
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Corpo enviado pelo @vercel/blob/client
    const body = (await request.json()) as HandleUploadBody

    const jsonResponse = await handleUpload({
      body,
      request,

      /*
       * Esta função é chamada quando o navegador
       * solicita autorização para iniciar o upload.
       */
      onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
        console.log('=== BLOB: GERANDO TOKEN ===')
        console.log('Usuário:', user.id)
        console.log('Arquivo:', pathname)
        console.log('Multipart:', multipart)

        return {
          // Permite os tipos de arquivo utilizados pelo sistema.
          // application/octet-stream cobre ZIP, RAR e formatos
          // que o navegador não identifica corretamente.
          allowedContentTypes: [
            'application/pdf',

            // Microsoft Word
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

            // Microsoft Excel
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

            // Microsoft PowerPoint
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',

            // Imagens
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',

            // Texto / CSV
            'text/plain',
            'text/csv',

            // Compactados
            'application/zip',
            'application/x-zip-compressed',
            'application/x-rar-compressed',
            'application/vnd.rar',

            // Caso o navegador envie como genérico
            'application/octet-stream',
          ],

          /*
           * Arquivos podem ter até 500 MB.
           *
           * O upload é feito diretamente pelo navegador
           * para o Vercel Blob, então não passa pelo
           * limite de payload da Server Function.
           */
          maximumSizeInBytes: 500 * 1024 * 1024,

          // Evita colisão de nomes
          addRandomSuffix: true,

          /*
           * Guardamos o usuário no token para podermos
           * identificar quem iniciou o upload.
           */
          tokenPayload: JSON.stringify({
            userId: user.id,
            clientPayload: clientPayload ?? null,
          }),
        }
      },

      /*
       * Chamado depois que o Blob termina o upload.
       *
       * O metadata do arquivo é salvo separadamente
       * pelo FilesManager através de saveFileMetadata().
       */
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('=== BLOB: UPLOAD CONCLUÍDO ===')
        console.log('URL:', blob.url)
        console.log('Pathname:', blob.pathname)

        try {
          if (tokenPayload) {
            const parsed = JSON.parse(tokenPayload)

            console.log('Usuário do upload:', parsed.userId)
          }
        } catch (error) {
          console.error(
            'Erro ao ler tokenPayload do upload:',
            error
          )
        }
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('=== ERRO API /api/upload ===')
    console.error(error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro desconhecido ao enviar arquivo',
      },
      { status: 400 }
    )
  }
}