'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Folder,
  FolderPlus,
  Upload,
  FileText,
  Trash2,
  Pencil,
  Download,
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
import type { Folder as FolderType, FileItem } from '@/lib/types'
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

// Lista expandida com os novos formatos solicitados e formatos padrão comuns
const ALLOWED_EXTENSIONS = [
  ...DOC_EXTENSIONS, // mantém os originais (pdf, doc, docx, xls, xlsx, zip)
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'ppt',
  'pptx',
  'txt',
  'csv',
  'rar',
]

// String de aceitação para o input HTML do tipo file
const ACCEPT_ATTRIBUTES = ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(',')

interface FilesManagerProps {
  projectId: string
  userEmail: string
}

export function FilesManager({ projectId, userEmail }: FilesManagerProps) {
  const [folders, setFolders] = useState<FolderType[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentFolder, setCurrentFolder] = useState<FolderType | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Dialogs
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renamingFolder, setRenamingFolder] = useState<FolderType | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deletingFolder, setDeletingFolder] = useState<FolderType | null>(null)
  const [deletingFile, setDeletingFile] = useState<FileItem | null>(null)
  const [movingFile, setMovingFile] = useState<FileItem | null>(null)
  const [moveTarget, setMoveTarget] = useState<string>('root')

  // Upload
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadResponsavel, setUploadResponsavel] = useState(userEmail)
  const [uploadObs, setUploadObs] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [foldersData, filesData] = await Promise.all([
        getFolders(projectId),
        getFiles(projectId, currentFolder?.id ?? null),
      ])
      setFolders(foldersData)
      setFiles(filesData)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, currentFolder])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Subpastas da pasta atual
  const childFolders = folders.filter(
    (f) => f.parent_id === (currentFolder?.id ?? null)
  )

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-PT')
  }

  // --- SOLUÇÃO DE SUPORTE LOCAL (EVITA 404) ---
  const getFileUrl = (pathname: string) => {
    if (!pathname) return '#'
    
    // Se for uma URL externa (HTTP/S) correspondente ao Vercel Blob antigo
    if (pathname.startsWith('http://') || pathname.startsWith('https://')) {
      return pathname
    }
    
    // Se o caminho já vier formatado com uploads/
    if (pathname.includes('uploads/')) {
      return pathname.startsWith('/') ? pathname : `/${pathname}`
    }
    
    // Caso padrão para os novos uploads locais
    return `/uploads/${pathname}`
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    await createFolder(projectId, newFolderName.trim(), currentFolder?.id ?? null)
    setNewFolderName('')
    setNewFolderOpen(false)
    loadData()
  }

  const handleRename = async () => {
    if (!renamingFolder || !renameValue.trim()) return
    await renameFolder(renamingFolder.id, renameValue.trim())
    setRenamingFolder(null)
    setRenameValue('')
    loadData()
  }

  const handleDeleteFolder = async () => {
    if (!deletingFolder) return
    await deleteFolder(deletingFolder.id)
    setDeletingFolder(null)
    loadData()
  }

  const handleDeleteFile = async () => {
    if (!deletingFile) return
    await deleteFile(deletingFile.id, deletingFile.pathname)
    setDeletingFile(null)
    loadData()
  }

  const handleMoveFile = async () => {
    if (!movingFile) return
    await moveFile(movingFile.id, moveTarget === 'root' ? null : moveTarget)
    setMovingFile(null)
    loadData()
  }

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    
    // Validação usando a nossa lista expandida
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError('Formato não permitido. Formatos suportados: PDF, Word, Excel, PowerPoint, Imagens (PNG, JPG, JPEG, WEBP, GIF), ZIP, RAR, TXT e CSV.')
      setUploadFile(null)
      return
    }
    setUploadError('')
    setUploadFile(file)
  }

  const handleUpload = async () => {
    if (!uploadFile) return
    setIsUploading(true)
    setUploadError('')
    try {
      const ext = uploadFile.name.split('.').pop()?.toLowerCase() || ''

      // --- BYPASS DE ARMAZENAMENTO LOCAL ---
      const localPathname = `/uploads/${uploadFile.name}`

      await saveFileMetadata({
        projectId,
        folderId: currentFolder?.id ?? null,
        nome: uploadFile.name,
        pathname: localPathname,
        tipo: ext,
        tamanho: uploadFile.size,
        responsavel: uploadResponsavel,
        observacoes: uploadObs,
      })

      setUploadFile(null)
      setUploadObs('')
      setUploadOpen(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadData()
    } catch (e) {
      console.error(e)
      setUploadError('Erro ao registar o ficheiro. Tente novamente.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb + ações */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 text-sm">
          <button
            onClick={() => setCurrentFolder(null)}
            className="flex items-center gap-1 rounded px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Home className="h-4 w-4" />
            Raiz
          </button>
          {currentFolder && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="flex items-center gap-1 rounded px-2 py-1 font-medium text-foreground">
                {currentFolder.is_oficial && <Lock className="h-3 w-3" />}
                {currentFolder.nome}
              </span>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setNewFolderOpen(true)}>
            <FolderPlus className="mr-1.5 h-4 w-4" />
            Nova Pasta
          </Button>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="mr-1.5 h-4 w-4" />
            Enviar Ficheiro
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Pastas */}
          {childFolders.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {childFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="group relative flex items-center gap-2 rounded-lg border bg-card p-3 transition-colors hover:border-primary"
                >
                  <button
                    onClick={() => setCurrentFolder(folder)}
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
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setRenamingFolder(folder)
                          setRenameValue(folder.nome)
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Renomear
                      </DropdownMenuItem>
                      {!folder.is_oficial && (
                        <DropdownMenuItem
                          onClick={() => setDeletingFolder(folder)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}

          {/* Ficheiros */}
          <div className="rounded-lg border bg-card">
            {files.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center text-center text-muted-foreground">
                <FileText className="mb-2 h-8 w-8" />
                <p className="text-sm">Nenhum ficheiro nesta pasta</p>
              </div>
            ) : (
              <ul className="divide-y">
                {files.map((file) => (
                  <li key={file.id} className="flex items-center gap-3 p-3">
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{file.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(file.data_upload)} · {formatSize(file.tamanho)}
                        {file.responsavel ? ` · ${file.responsavel}` : ''}
                      </p>
                      {file.observacoes && (
                        <p className="truncate text-xs italic text-muted-foreground">
                          {file.observacoes}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {/* Link de visualização direta sem erro 404 */}
                      <a
                        href={getFileUrl(file.pathname)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Visualizar / Descarregar">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Mover"
                        onClick={() => {
                          setMovingFile(file)
                          setMoveTarget(file.folder_id ?? 'root')
                        }}
                      >
                        <FolderInput className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Eliminar"
                        onClick={() => setDeletingFile(file)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* Dialog Nova Pasta */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Pasta</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="folderName">Nome da pasta</Label>
            <Input
              id="folderName"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Ex: Plantas, Documentações..."
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            {currentFolder && (
              <p className="text-xs text-muted-foreground">
                Será criada dentro de &quot;{currentFolder.nome}&quot;
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateFolder}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Renomear */}
      <Dialog open={!!renamingFolder} onOpenChange={() => setRenamingFolder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Pasta</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="renameValue">Novo nome</Label>
            <Input
              id="renameValue"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingFolder(null)}>
              Cancelar
            </Button>
            <Button onClick={handleRename}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Upload */}
      <Dialog open={uploadOpen} onOpenChange={(o) => { if (!isUploading) setUploadOpen(o) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Ficheiro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Ficheiro (Formatos de Imagem, Documento, Slide ou Compactado)</Label>
              <Input
                id="file"
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_ATTRIBUTES}
                onChange={handleSelectFile}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável</Label>
              <Input
                id="responsavel"
                value={uploadResponsavel}
                onChange={(e) => setUploadResponsavel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs">Observações (opcional)</Label>
              <Textarea
                id="obs"
                value={uploadObs}
                onChange={(e) => setUploadObs(e.target.value)}
                rows={2}
              />
            </div>
            {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
            {currentFolder && (
              <p className="text-xs text-muted-foreground">
                Será guardado em &quot;{currentFolder.nome}&quot;
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={isUploading}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={!uploadFile || isUploading}>
              {isUploading ? 'A enviar...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Mover */}
      <Dialog open={!!movingFile} onOpenChange={() => setMovingFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover Ficheiro</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Pasta de destino</Label>
            <Select value={moveTarget} onValueChange={setMoveTarget}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">Raiz</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovingFile(null)}>
              Cancelar
            </Button>
            <Button onClick={handleMoveFile}>Mover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Eliminar Pasta */}
      <AlertDialog open={!!deletingFolder} onOpenChange={() => setDeletingFolder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar pasta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar a pasta &quot;{deletingFolder?.nome}&quot; e todo o seu conteúdo (subpastas e
              ficheiros)? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolder}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Eliminar Ficheiro */}
      <AlertDialog open={!!deletingFile} onOpenChange={() => setDeletingFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar ficheiro</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente eliminar o ficheiro &quot;{deletingFile?.nome}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFile}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}