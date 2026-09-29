'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { upload } from '@vercel/blob/client'
import {
  Folder,
  FolderPlus,
  Upload,
  FileText,
  Trash2,
  Pencil,
  Download,
  Eye,
  ChevronRight,
  Home,
  Lock,
  MoreVertical,
  FolderInput,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { DOC_EXTENSIONS } from '@/lib/types'

import type {
  Folder as FolderType,
  FileItem,
} from '@/lib/types'

import {
  getFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  getFiles,
  saveFileMetadata,
  deleteFile,
  moveFile,
} from '@/app/actions/files'

/* =========================================================
   FORMATOS PERMITIDOS
   ========================================================= */

const ALLOWED_EXTENSIONS = [
  ...DOC_EXTENSIONS,

  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',

  'ppt',
  'pptx',

  'txt',
  'csv',

  'zip',
  'rar',
]

const ACCEPT_ATTRIBUTES = ALLOWED_EXTENSIONS
  .map((ext) => `.${ext}`)
  .join(',')

/* =========================================================
   PROPS
   ========================================================= */

interface FilesManagerProps {
  projectId: string
  userEmail: string
}

/* =========================================================
   URL DOS ARQUIVOS
   ========================================================= */

/*
 * Arquivos novos:
 *
 * pathname = URL do Vercel Blob
 *
 * Exemplo:
 *
 * https://xxxxx.public.blob.vercel-storage.com/arquivo.zip
 *
 * Como o Blob é público, podemos usar a própria URL.
 *
 * Arquivos antigos /uploads/... continuam sendo enviados
 * para /api/file para compatibilidade.
 */

const getFileUrl = (
  pathname: string,
  download = false
) => {
  if (!pathname) return '#'

  /*
   * Se for visualização pura e for URL do Vercel Blob,
   * podemos retornar direto. Mas se for download, 
   * passamos pela API para forçar o Content-Disposition (download real).
   */
  if (
    !download &&
    (pathname.startsWith('http://') ||
     pathname.startsWith('https://'))
  ) {
    return pathname
  }

  const params = new URLSearchParams({
    pathname,
  })

  if (download) {
    params.set('download', '1')
  }

  return `/api/file?${params.toString()}`
}

/* =========================================================
   COMPONENTE
   ========================================================= */

export function FilesManager({
  projectId,
  userEmail,
}: FilesManagerProps) {
  const [folders, setFolders] = useState<FolderType[]>([])
  const [files, setFiles] = useState<FileItem[]>([])

  const [currentFolder, setCurrentFolder] =
    useState<FolderType | null>(null)

  const [isLoading, setIsLoading] =
    useState(true)

  /* =====================================================
     PASTAS
     ===================================================== */

  const [newFolderOpen, setNewFolderOpen] =
    useState(false)

  const [newFolderName, setNewFolderName] =
    useState('')

  const [renamingFolder, setRenamingFolder] =
    useState<FolderType | null>(null)

  const [renameValue, setRenameValue] =
    useState('')

  const [deletingFolder, setDeletingFolder] =
    useState<FolderType | null>(null)

  /* =====================================================
     ARQUIVOS
     ===================================================== */

  const [deletingFile, setDeletingFile] =
    useState<FileItem | null>(null)

  const [movingFile, setMovingFile] =
    useState<FileItem | null>(null)

  const [moveTarget, setMoveTarget] =
    useState<string>('root')

  /* =====================================================
     UPLOAD
     ===================================================== */

  const [uploadOpen, setUploadOpen] =
    useState(false)

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null)

  const [uploadResponsavel, setUploadResponsavel] =
    useState(userEmail)

  const [uploadObs, setUploadObs] =
    useState('')

  const [isUploading, setIsUploading] =
    useState(false)

  const [uploadProgress, setUploadProgress] =
    useState(0)

  const [uploadError, setUploadError] =
    useState('')

  const fileInputRef =
    useRef<HTMLInputElement>(null)

  /* =====================================================
     CARREGAR DADOS
     ===================================================== */

  const loadData = useCallback(async () => {
    setIsLoading(true)

    try {
      const [
        foldersData,
        filesData,
      ] = await Promise.all([
        getFolders(projectId),
        getFiles(
          projectId,
          currentFolder?.id ?? null
        ),
      ])

      setFolders(foldersData)
      setFiles(filesData)
    } catch (error) {
      console.error(
        'Erro carregando arquivos:',
        error
      )
    } finally {
      setIsLoading(false)
    }
  }, [
    projectId,
    currentFolder,
  ])

  useEffect(() => {
    loadData()
  }, [loadData])

  /* =====================================================
     SUBPASTAS
     ===================================================== */

  const childFolders = folders.filter(
    (folder) =>
      folder.parent_id ===
      (currentFolder?.id ?? null)
  )

  /* =====================================================
     FORMATAÇÕES
     ===================================================== */

  const formatSize = (
    bytes: number | null
  ) => {
    if (!bytes) return '-'

    if (bytes < 1024) {
      return `${bytes} B`
    }

    if (bytes < 1024 * 1024) {
      return `${(
        bytes / 1024
      ).toFixed(0)} KB`
    }

    if (bytes < 1024 * 1024 * 1024) {
      return `${(
        bytes /
        (1024 * 1024)
      ).toFixed(1)} MB`
    }

    return `${(
      bytes /
      (1024 * 1024 * 1024)
    ).toFixed(2)} GB`
  }

  const formatDate = (
    date: string
  ) => {
    return new Date(
      date
    ).toLocaleDateString(
      'pt-BR'
    )
  }

  /* =====================================================
     CRIAR PASTA
     ===================================================== */

  const handleCreateFolder =
    async () => {
      if (!newFolderName.trim()) {
        return
      }

      try {
        await createFolder(
          projectId,
          newFolderName.trim(),
          currentFolder?.id ?? null
        )

        setNewFolderName('')
        setNewFolderOpen(false)

        await loadData()
      } catch (error) {
        console.error(
          'Erro ao criar pasta:',
          error
        )
      }
    }

  /* =====================================================
     RENOMEAR PASTA
     ===================================================== */

  const handleRename =
    async () => {
      if (
        !renamingFolder ||
        !renameValue.trim()
      ) {
        return
      }

      try {
        await renameFolder(
          renamingFolder.id,
          renameValue.trim()
        )

        setRenamingFolder(null)
        setRenameValue('')

        await loadData()
      } catch (error) {
        console.error(
          'Erro ao renomear pasta:',
          error
        )
      }
    }

  /* =====================================================
     EXCLUIR PASTA
     ===================================================== */

  const handleDeleteFolder =
    async () => {
      if (!deletingFolder) {
        return
      }

      try {
        await deleteFolder(
          deletingFolder.id
        )

        setDeletingFolder(null)

        await loadData()
      } catch (error) {
        console.error(
          'Erro ao excluir pasta:',
          error
        )
      }
    }

  /* =====================================================
     EXCLUIR ARQUIVO
     ===================================================== */

  const handleDeleteFile =
    async () => {
      if (!deletingFile) {
        return
      }

      try {
        await deleteFile(
          deletingFile.id,
          deletingFile.pathname
        )

        setDeletingFile(null)

        await loadData()
      } catch (error) {
        console.error(
          'Erro ao excluir arquivo:',
          error
        )
      }
    }

  /* =====================================================
     MOVER ARQUIVO
     ===================================================== */

  const handleMoveFile =
    async () => {
      if (!movingFile) {
        return
      }

      try {
        await moveFile(
          movingFile.id,
          moveTarget === 'root'
            ? null
            : moveTarget
        )

        setMovingFile(null)

        await loadData()
      } catch (error) {
        console.error(
          'Erro ao mover arquivo:',
          error
        )
      }
    }

  /* =====================================================
     SELECIONAR ARQUIVO
     ===================================================== */

  const handleSelectFile = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0]

    if (!file) {
      return
    }

    const ext =
      file.name
        .split('.')
        .pop()
        ?.toLowerCase() || ''

    if (
      !ALLOWED_EXTENSIONS.includes(
        ext
      )
    ) {
      setUploadError(
        'Formato não permitido. Formatos suportados: PDF, Word, Excel, PowerPoint, Imagens (PNG, JPG, JPEG, WEBP, GIF), ZIP, RAR, TXT e CSV.'
      )

      setSelectedFile(null)

      return
    }

    setUploadError('')
    setSelectedFile(file)
    setUploadProgress(0)
  }

  /* =====================================================
     UPLOAD DIRETO PARA VERCEL BLOB
     ===================================================== */

  const handleUpload =
    async () => {
      if (!selectedFile) {
        return
      }

      setIsUploading(true)
      setUploadError('')
      setUploadProgress(0)

      try {
        const ext =
          selectedFile.name
            .split('.')
            .pop()
            ?.toLowerCase() || ''

        console.log(
          '=== INICIANDO UPLOAD ==='
        )

        console.log(
          'Arquivo:',
          selectedFile.name
        )

        console.log(
          'Tamanho:',
          selectedFile.size
        )

        console.log(
          'Tipo:',
          selectedFile.type
        )

        /*
         * Agora o arquivo vai diretamente
         * do navegador para o Vercel Blob.
         */
        const blob = await upload(
          selectedFile.name,
          selectedFile,
          {
            access: 'public',

            handleUploadUrl:
              '/api/upload',

            /*
             * Identifica o projeto e usuário
             * durante a geração do token.
             */
            clientPayload: JSON.stringify({
              projectId,
              userEmail,
              folderId:
                currentFolder?.id ?? null,
            }),

            /*
             * Para arquivos grandes, usa multipart.
             */
            multipart: true,

            /*
             * Progresso visual.
             */
            onUploadProgress: (
              event
            ) => {
              setUploadProgress(
                Math.round(
                  event.percentage
                )
              )
            },
          }
        )

        console.log(
          '=== UPLOAD BLOB CONCLUÍDO ==='
        )

        console.log(
          'URL:',
          blob.url
        )

        console.log(
          'Pathname:',
          blob.pathname
        )

        /*
         * Agora que o arquivo realmente
         * está no Blob, salvamos somente
         * os dados dele no Supabase.
         */
        await saveFileMetadata({
          projectId,

          folderId:
            currentFolder?.id ??
            null,

          nome:
            selectedFile.name,

          /*
           * IMPORTANTE:
           * guardamos a URL real do Blob.
           */
          pathname: blob.url,

          tipo: ext,

          tamanho:
            selectedFile.size,

          responsavel:
            uploadResponsavel,

          observacoes:
            uploadObs,
        })

        console.log(
          '=== METADATA SALVO ==='
        )

        setSelectedFile(null)
        setUploadObs('')
        setUploadProgress(100)

        setUploadOpen(false)

        if (fileInputRef.current) {
          fileInputRef.current.value =
            ''
        }

        await loadData()
      } catch (error) {
        console.error(
          '=== ERRO NO UPLOAD ===',
          error
        )

        let message =
          'Erro ao enviar o ficheiro. Tente novamente.'

        if (
          error instanceof Error &&
          error.message
        ) {
          message =
            error.message
        }

        setUploadError(message)
      } finally {
        setIsUploading(false)
      }
    }

  /* =====================================================
     INTERFACE
     ===================================================== */

  return (
    <div className="space-y-4">

      {/* =================================================
          TOPO
          ================================================= */}

      <div className="flex flex-wrap items-center justify-between gap-3">

        <div className="flex items-center gap-1 text-sm">

          <button
            onClick={() =>
              setCurrentFolder(null)
            }
            className="flex items-center gap-1 rounded px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Home className="h-4 w-4" />
            Raiz
          </button>

          {currentFolder && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />

              <span className="flex items-center gap-1 rounded px-2 py-1 font-medium text-foreground">

                {currentFolder.is_oficial && (
                  <Lock className="h-3 w-3" />
                )}

                {currentFolder.nome}

              </span>
            </>
          )}

        </div>

        <div className="flex gap-2">

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setNewFolderOpen(true)
            }
          >
            <FolderPlus className="mr-1.5 h-4 w-4" />
            Nova Pasta
          </Button>

          <Button
            size="sm"
            onClick={() =>
              setUploadOpen(true)
            }
          >
            <Upload className="mr-1.5 h-4 w-4" />
            Enviar Ficheiro
          </Button>

        </div>

      </div>

      {/* =================================================
          CONTEÚDO
          ================================================= */}

      {isLoading ? (

        <div className="flex h-40 items-center justify-center">

          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />

        </div>

      ) : (

        <>

          {/* =================================================
              PASTAS
              ================================================= */}

          {childFolders.length > 0 && (

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">

              {childFolders.map(
                (folder) => (

                  <div
                    key={folder.id}
                    className="group relative flex items-center gap-2 rounded-lg border bg-card p-3 transition-colors hover:border-primary"
                  >

                    <button
                      onClick={() =>
                        setCurrentFolder(
                          folder
                        )
                      }
                      className="flex flex-1 items-center gap-2 text-left"
                    >

                      {folder.is_oficial ? (

                        <Lock className="h-5 w-5 shrink-0 text-primary" />

                      ) : (

                        <Folder className="h-5 w-5 shrink-0 text-primary" />

                      )}

                      <span className="truncate text-sm font-medium text-foreground">
                        {folder.nome}
                      </span>

                    </button>

                    <DropdownMenu>

                      <DropdownMenuTrigger
                        asChild
                      >

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>

                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">

                        <DropdownMenuItem
                          onClick={() => {
                            setRenamingFolder(
                              folder
                            )

                            setRenameValue(
                              folder.nome
                            )
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Renomear
                        </DropdownMenuItem>

                        {!folder.is_oficial && (

                          <DropdownMenuItem
                            onClick={() =>
                              setDeletingFolder(
                                folder
                              )
                            }
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>

                        )}

                      </DropdownMenuContent>

                    </DropdownMenu>

                  </div>

                )
              )}

            </div>

          )}

          {/* =================================================
              LISTA DE ARQUIVOS
              ================================================= */}

          <div className="rounded-lg border bg-card">

            {files.length === 0 ? (

              <div className="flex h-32 flex-col items-center justify-center text-center text-muted-foreground">

                <FileText className="mb-2 h-8 w-8" />

                <p className="text-sm">
                  Nenhum ficheiro nesta pasta
                </p>

              </div>

            ) : (

              <ul className="divide-y">

                {files.map(
                  (file) => (

                    <li
                      key={file.id}
                      className="flex items-center gap-3 p-3"
                    >

                      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />

                      <div className="min-w-0 flex-1">

                        <p className="truncate text-sm font-medium text-foreground">
                          {file.nome}
                        </p>

                        <p className="text-xs text-muted-foreground">

                          {formatDate(
                            file.data_upload
                          )}

                          {' · '}

                          {formatSize(
                            file.tamanho
                          )}

                          {file.responsavel
                            ? ` · ${file.responsavel}`
                            : ''}

                        </p>

                        {file.observacoes && (

                          <p className="truncate text-xs italic text-muted-foreground">
                            {file.observacoes}
                          </p>

                        )}

                      </div>

                      <div className="flex shrink-0 items-center gap-1">

                        {/* VISUALIZAR */}

                        <a
                          href={getFileUrl(
                            file.pathname
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                        >

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                        </a>

                        {/* DOWNLOAD */}

                        <a
                          href={getFileUrl(
                            file.pathname,
                            true
                          )}
                          download={
                            file.nome
                          }
                        >

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Descarregar"
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                        </a>

                        {/* MOVER */}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Mover"
                          onClick={() => {

                            setMovingFile(
                              file
                            )

                            setMoveTarget(
                              file.folder_id ??
                                'root'
                            )

                          }}
                        >
                          <FolderInput className="h-4 w-4" />
                        </Button>

                        {/* EXCLUIR */}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Eliminar"
                          onClick={() =>
                            setDeletingFile(
                              file
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>

                      </div>

                    </li>

                  )
                )}

              </ul>

            )}

          </div>

        </>

      )}

      {/* =================================================
          DIALOG NOVA PASTA
          ================================================= */}

      <Dialog
        open={newFolderOpen}
        onOpenChange={
          setNewFolderOpen
        }
      >

        <DialogContent>

          <DialogHeader>

            <DialogTitle>
              Nova Pasta
            </DialogTitle>

          </DialogHeader>

          <div className="space-y-2">

            <Label htmlFor="folderName">
              Nome da pasta
            </Label>

            <Input
              id="folderName"
              value={newFolderName}
              onChange={(event) =>
                setNewFolderName(
                  event.target.value
                )
              }
              placeholder="Ex: Plantas, Documentações..."
              onKeyDown={(event) =>
                event.key ===
                  'Enter' &&
                handleCreateFolder()
              }
            />

            {currentFolder && (

              <p className="text-xs text-muted-foreground">

                Será criada dentro de
                &quot;
                {currentFolder.nome}
                &quot;

              </p>

            )}

          </div>

          <DialogFooter>

            <Button
              variant="outline"
              onClick={() =>
                setNewFolderOpen(false)
              }
            >
              Cancelar
            </Button>

            <Button
              onClick={
                handleCreateFolder
              }
            >
              Criar
            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

      {/* =================================================
          DIALOG RENOMEAR
          ================================================= */}

      <Dialog
        open={!!renamingFolder}
        onOpenChange={() =>
          setRenamingFolder(null)
        }
      >

        <DialogContent>

          <DialogHeader>

            <DialogTitle>
              Renomear Pasta
            </DialogTitle>

          </DialogHeader>

          <div className="space-y-2">

            <Label htmlFor="renameValue">
              Novo nome
            </Label>

            <Input
              id="renameValue"
              value={renameValue}
              onChange={(event) =>
                setRenameValue(
                  event.target.value
                )
              }
              onKeyDown={(event) =>
                event.key ===
                  'Enter' &&
                handleRename()
              }
            />

          </div>

          <DialogFooter>

            <Button
              variant="outline"
              onClick={() =>
                setRenamingFolder(null)
              }
            >
              Cancelar
            </Button>

            <Button
              onClick={
                handleRename
              }
            >
              Guardar
            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

      {/* =================================================
          DIALOG UPLOAD
          ================================================= */}

      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {

          if (!isUploading) {
            setUploadOpen(open)
          }

        }}
      >

        <DialogContent>

          <DialogHeader>

            <DialogTitle>
              Enviar Ficheiro
            </DialogTitle>

          </DialogHeader>

          <div className="space-y-4">

            {/* ARQUIVO */}

            <div className="space-y-2">

              <Label htmlFor="file">
                Ficheiro (Formatos de Imagem, Documento, Slide ou Compactado)
              </Label>

              <Input
                id="file"
                ref={fileInputRef}
                type="file"
                accept={
                  ACCEPT_ATTRIBUTES
                }
                onChange={
                  handleSelectFile
                }
                disabled={
                  isUploading
                }
              />

            </div>

            {/* RESPONSÁVEL */}

            <div className="space-y-2">

              <Label htmlFor="responsavel">
                Responsável
              </Label>

              <Input
                id="responsavel"
                value={
                  uploadResponsavel
                }
                onChange={(event) =>
                  setUploadResponsavel(
                    event.target.value
                  )
                }
                disabled={
                  isUploading
                }
              />

            </div>

            {/* OBSERVAÇÃO */}

            <div className="space-y-2">

              <Label htmlFor="obs">
                Observações (opcional)
              </Label>

              <Textarea
                id="obs"
                value={uploadObs}
                onChange={(event) =>
                  setUploadObs(
                    event.target.value
                  )
                }
                rows={2}
                disabled={
                  isUploading
                }
              />

            </div>

            {/* PROGRESSO */}

            {isUploading && (

              <div className="space-y-2">

                <div className="flex items-center justify-between text-xs text-muted-foreground">

                  <span>
                    Enviando arquivo...
                  </span>

                  <span>
                    {uploadProgress}%
                  </span>

                </div>

                <div className="h-2 overflow-hidden rounded-full bg-muted">

                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{
                      width: `${uploadProgress}%`,
                    }}
                  />

                </div>

              </div>

            )}

            {/* ERRO */}

            {uploadError && (

              <p className="text-sm text-destructive">
                {uploadError}
              </p>

            )}

            {/* PASTA */}

            {currentFolder && (

              <p className="text-xs text-muted-foreground">

                Será guardado em
                &quot;
                {currentFolder.nome}
                &quot;

              </p>

            )}

          </div>

          <DialogFooter>

            <Button
              variant="outline"
              onClick={() =>
                setUploadOpen(false)
              }
              disabled={
                isUploading
              }
            >
              Cancelar
            </Button>

            <Button
              onClick={
                handleUpload
              }
              disabled={
                !selectedFile ||
                isUploading
              }
            >
              {isUploading
                ? `Enviando ${uploadProgress}%...`
                : 'Enviar'}
            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

      {/* =================================================
          DIALOG MOVER
          ================================================= */}

      <Dialog
        open={!!movingFile}
        onOpenChange={() =>
          setMovingFile(null)
        }
      >

        <DialogContent>

          <DialogHeader>

            <DialogTitle>
              Mover Ficheiro
            </DialogTitle>

          </DialogHeader>

          <div className="space-y-2">

            <Label>
              Pasta de destino
            </Label>

            <Select
              value={moveTarget}
              onValueChange={
                setMoveTarget
              }
            >

              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>

                <SelectItem value="root">
                  Raiz
                </SelectItem>

                {folders.map(
                  (folder) => (

                    <SelectItem
                      key={folder.id}
                      value={folder.id}
                    >
                      {folder.nome}
                    </SelectItem>

                  )
                )}

              </SelectContent>

            </Select>

          </div>

          <DialogFooter>

            <Button
              variant="outline"
              onClick={() =>
                setMovingFile(null)
              }
            >
              Cancelar
            </Button>

            <Button
              onClick={
                handleMoveFile
              }
            >
              Mover
            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

      {/* =================================================
          EXCLUIR PASTA
          ================================================= */}

      <AlertDialog
        open={!!deletingFolder}
        onOpenChange={() =>
          setDeletingFolder(null)
        }
      >

        <AlertDialogContent>

          <AlertDialogHeader>

            <AlertDialogTitle>
              Eliminar pasta
            </AlertDialogTitle>

            <AlertDialogDescription>

              Tem a certeza que deseja eliminar
              a pasta
              &quot;
              {deletingFolder?.nome}
              &quot;
              e todo o seu conteúdo
              (subpastas e ficheiros)?
              Esta ação não pode ser desfeita.

            </AlertDialogDescription>

          </AlertDialogHeader>

          <AlertDialogFooter>

            <AlertDialogCancel>
              Cancelar
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={
                handleDeleteFolder
              }
            >
              Eliminar
            </AlertDialogAction>

          </AlertDialogFooter>

        </AlertDialogContent>

      </AlertDialog>

      {/* =================================================
          EXCLUIR ARQUIVO
          ================================================= */}

      <AlertDialog
        open={!!deletingFile}
        onOpenChange={() =>
          setDeletingFile(null)
        }
      >

        <AlertDialogContent>

          <AlertDialogHeader>

            <AlertDialogTitle>
              Eliminar ficheiro
            </AlertDialogTitle>

            <AlertDialogDescription>

              Deseja realmente eliminar
              o ficheiro
              &quot;
              {deletingFile?.nome}
              &quot;?
              Esta ação não pode ser desfeita.

            </AlertDialogDescription>

          </AlertDialogHeader>

          <AlertDialogFooter>

            <AlertDialogCancel>
              Cancelar
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={
                handleDeleteFile
              }
            >
              Eliminar
            </AlertDialogAction>

          </AlertDialogFooter>

        </AlertDialogContent>

      </AlertDialog>

    </div>
  )
}