'use server'

import { createClient } from '@/lib/supabase/server'
import { del } from '@vercel/blob'

/* =========================================================
   PASTAS
   ========================================================= */

export async function getFolders(projectId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', user.id)
    .eq('project_id', projectId)
    .order('is_oficial', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching folders:', error)
    return []
  }

  return data || []
}

export async function createFolder(
  projectId: string,
  nome: string,
  parentId: string | null
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Não autenticado')
  }

  const { error } = await supabase.from('folders').insert({
    user_id: user.id,
    project_id: projectId,
    parent_id: parentId,
    nome,
    is_oficial: false,
  })

  if (error) {
    console.error('Error creating folder:', error)
    throw new Error('Erro ao criar pasta')
  }
}

export async function renameFolder(id: string, nome: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Não autenticado')
  }

  const { error } = await supabase
    .from('folders')
    .update({ nome })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error renaming folder:', error)
    throw new Error('Erro ao renomear pasta')
  }
}

export async function deleteFolder(id: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Não autenticado')
  }

  /*
   * Busca arquivos da pasta
   */
  const { data: files } = await supabase
    .from('files')
    .select('pathname')
    .eq('user_id', user.id)
    .eq('folder_id', id)

  /*
   * Busca imagens 3D da pasta
   */
  const { data: images } = await supabase
    .from('images_3d')
    .select('pathname')
    .eq('user_id', user.id)
    .eq('folder_id', id)

  const pathnames = [
    ...(files || []).map((file) => file.pathname),
    ...(images || []).map((image) => image.pathname),
  ].filter(Boolean)

  /*
   * Exclui os objetos do Blob.
   */
  if (pathnames.length > 0) {
    try {
      await del(pathnames)
    } catch (error) {
      /*
       * Se algum arquivo antigo não existir no Blob,
       * não impede a exclusão da pasta no Supabase.
       */
      console.error('Error deleting blobs:', error)
    }
  }

  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting folder:', error)
    throw new Error('Erro ao excluir pasta')
  }
}

/* =========================================================
   ARQUIVOS
   ========================================================= */

export async function getFiles(
  projectId: string,
  folderId: string | null
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  let query = supabase
    .from('files')
    .select('*')
    .eq('user_id', user.id)
    .eq('project_id', projectId)

  if (folderId === null) {
    query = query.is('folder_id', null)
  } else {
    query = query.eq('folder_id', folderId)
  }

  const { data, error } = await query.order(
    'data_upload',
    { ascending: false }
  )

  if (error) {
    console.error('Error fetching files:', error)
    return []
  }

  return data || []
}

/*
 * IMPORTANTE:
 *
 * O upload NÃO é mais feito aqui.
 *
 * Agora:
 *
 * navegador
 *    ↓
 * @vercel/blob/client
 *    ↓
 * /api/upload
 *    ↓
 * Vercel Blob
 *
 * Depois que o Blob retorna a URL,
 * o FilesManager chama saveFileMetadata().
 */

/* =========================================================
   SALVAR METADATA
   ========================================================= */

export async function saveFileMetadata(params: {
  projectId: string
  folderId: string | null
  nome: string
  pathname: string
  tipo: string
  tamanho: number
  responsavel: string
  observacoes: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Não autenticado')
  }

  const { error } = await supabase.from('files').insert({
    user_id: user.id,
    project_id: params.projectId,
    folder_id: params.folderId,
    nome: params.nome,
    pathname: params.pathname,
    tipo: params.tipo,
    tamanho: params.tamanho,
    responsavel: params.responsavel || null,
    observacoes: params.observacoes || null,
  })

  if (error) {
    console.error('Error saving file metadata:', error)
    throw new Error('Erro ao salvar arquivo')
  }
}

/* =========================================================
   MOVER ARQUIVO
   ========================================================= */

export async function moveFile(
  id: string,
  folderId: string | null
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Não autenticado')
  }

  const { error } = await supabase
    .from('files')
    .update({
      folder_id: folderId,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error moving file:', error)
    throw new Error('Erro ao mover arquivo')
  }
}

/* =========================================================
   EXCLUIR ARQUIVO
   ========================================================= */

export async function deleteFile(
  id: string,
  pathname: string
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Não autenticado')
  }

  /*
   * Tenta excluir do Blob.
   *
   * Arquivos antigos /uploads/... podem não existir
   * no Blob. Nesse caso, seguimos para excluir o
   * registro do Supabase.
   */
  if (pathname) {
    try {
      await del(pathname)
    } catch (error) {
      console.error('Error deleting blob:', error)
    }
  }

  const { error } = await supabase
    .from('files')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting file:', error)
    throw new Error('Erro ao excluir arquivo')
  }
}

/* =========================================================
   IMAGENS 3D
   ========================================================= */

export async function getImages(
  projectId: string,
  folderId: string | null
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  let query = supabase
    .from('images_3d')
    .select('*')
    .eq('user_id', user.id)
    .eq('project_id', projectId)

  if (folderId === null) {
    query = query.is('folder_id', null)
  } else {
    query = query.eq('folder_id', folderId)
  }

  const { data, error } = await query.order(
    'created_at',
    { ascending: false }
  )

  if (error) {
    console.error('Error fetching images:', error)
    return []
  }

  return data || []
}

/* =========================================================
   SALVAR IMAGEM 3D
   ========================================================= */

export async function saveImageMetadata(params: {
  projectId: string
  folderId: string | null
  nome: string
  pathname: string
  tamanho: number
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Não autenticado')
  }

  const { error } = await supabase.from('images_3d').insert({
    user_id: user.id,
    project_id: params.projectId,
    folder_id: params.folderId,
    nome: params.nome,
    pathname: params.pathname,
    tamanho: params.tamanho,
  })

  if (error) {
    console.error('Error saving image metadata:', error)
    throw new Error('Erro ao salvar imagem')
  }
}

/* =========================================================
   EXCLUIR IMAGEM 3D
   ========================================================= */

export async function deleteImage(
  id: string,
  pathname: string
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Não autenticado')
  }

  if (pathname) {
    try {
      await del(pathname)
    } catch (error) {
      console.error('Error deleting blob:', error)
    }
  }

  const { error } = await supabase
    .from('images_3d')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting image:', error)
    throw new Error('Erro ao excluir imagem')
  }
}

/* =========================================================
   PASTAS DE IMAGENS / GALERIA
   ========================================================= */

export async function getImageFolders(projectId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', user.id)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching image folders:', error)
    return []
  }

  return data || []
}

/* =========================================================
   DRIVERS
   ========================================================= */

export async function getAllProjectFiles(year: number) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('files')
    .select(
      '*, projects!inner(marca, cidade, year, month)'
    )
    .eq('user_id', user.id)
    .eq('projects.year', year)
    .order('data_upload', { ascending: false })

  if (error) {
    console.error('Error fetching project files:', error)
    return []
  }

  return data || []
}