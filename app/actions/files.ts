'use server'

import { createClient } from '@/lib/supabase/server'
import { del } from '@vercel/blob'

/* ============ PASTAS ============ */

export async function getFolders(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

export async function createFolder(projectId: string, nome: string, parentId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  // Remove os blobs dos arquivos e imagens dentro da pasta (e subpastas via cascade no DB,
  // mas precisamos limpar os blobs). Buscamos os pathnames primeiro.
  const { data: files } = await supabase
    .from('files')
    .select('pathname')
    .eq('user_id', user.id)
    .eq('folder_id', id)

  const { data: images } = await supabase
    .from('images_3d')
    .select('pathname')
    .eq('user_id', user.id)
    .eq('folder_id', id)

  const pathnames = [
    ...(files || []).map((f) => f.pathname),
    ...(images || []).map((i) => i.pathname),
  ]
  if (pathnames.length > 0) {
    try {
      await del(pathnames)
    } catch (e) {
      console.error('Error deleting blobs:', e)
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

/* ============ ARQUIVOS ============ */

export async function getFiles(projectId: string, folderId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

  const { data, error } = await query.order('data_upload', { ascending: false })

  if (error) {
    console.error('Error fetching files:', error)
    return []
  }
  return data || []
}

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

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

export async function moveFile(id: string, folderId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { error } = await supabase
    .from('files')
    .update({ folder_id: folderId })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error moving file:', error)
    throw new Error('Erro ao mover arquivo')
  }
}

export async function deleteFile(id: string, pathname: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  try {
    await del(pathname)
  } catch (e) {
    console.error('Error deleting blob:', e)
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

/* ============ IMAGENS 3D ============ */

export async function getImages(projectId: string, folderId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching images:', error)
    return []
  }
  return data || []
}

export async function saveImageMetadata(params: {
  projectId: string
  folderId: string | null
  nome: string
  pathname: string
  tamanho: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

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

export async function deleteImage(id: string, pathname: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  try {
    await del(pathname)
  } catch (e) {
    console.error('Error deleting blob:', e)
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

/* ============ IMAGE FOLDERS (galeria) ============ */

export async function getImageFolders(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Reaproveita a tabela folders. Diferenciamos galeria por prefixo no nome? 
  // Não — usamos a mesma estrutura de pastas, mas imagens podem ir em qualquer pasta.
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

/* ============ DRIVERS (todos os ZIPs de todos os projetos, por ano) ============ */

export async function getAllZipFiles(year: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // !inner garante que o filtro em projects.year realmente restrinja as linhas
  // retornadas (sem !inner, o Supabase só filtraria o objeto embutido, não a linha).
  const { data, error } = await supabase
    .from('files')
    .select('*, projects!inner(marca, cidade, year, month)')
    .eq('user_id', user.id)
    .eq('tipo', 'zip')
    .eq('projects.year', year)
    .order('data_upload', { ascending: false })

  if (error) {
    console.error('Error fetching zip files:', error)
    return []
  }

  return data || []
}