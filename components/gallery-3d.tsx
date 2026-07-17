'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { upload } from '@vercel/blob/client'
import {
  Folder,
  FolderPlus,
  ImagePlus,
  Trash2,
  Download,
  X,
  Home,
  ChevronRight,
  ChevronLeft,
  Pencil,
  MoreVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { IMAGE_EXTENSIONS } from '@/lib/types'
import type { Folder as FolderType, Image3D } from '@/lib/types'
import {
  getImageFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  getImages,
  saveImageMetadata,
  deleteImage,
} from '@/app/actions/files'

interface Gallery3DProps {
  projectId: string
}

export function Gallery3D({ projectId }: Gallery3DProps) {
  const [folders, setFolders] = useState<FolderType[]>([])
  const [images, setImages] = useState<Image3D[]>([])
  const [currentFolder, setCurrentFolder] = useState<FolderType | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renamingFolder, setRenamingFolder] = useState<FolderType | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deletingFolder, setDeletingFolder] = useState<FolderType | null>(null)
  const [deletingImage, setDeletingImage] = useState<Image3D | null>(null)

  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [foldersData, imagesData] = await Promise.all([
        getImageFolders(projectId),
        getImages(projectId, currentFolder?.id ?? null),
      ])
      setFolders(foldersData)
      setImages(imagesData)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, currentFolder])

  useEffect(() => {
    loadData()
  }, [loadData])

  const childFolders = folders.filter(
    (f) => f.parent_id === (currentFolder?.id ?? null)
  )

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

  const handleDeleteImage = async () => {
    if (!deletingImage) return
    await deleteImage(deletingImage.id, deletingImage.pathname)
    setDeletingImage(null)
    setLightboxIndex(null)
    loadData()
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    // Valida formatos
    const invalid = selectedFiles.find((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() || ''
      return !IMAGE_EXTENSIONS.includes(ext)
    })
    if (invalid) {
      setUploadError('Apenas JPG, JPEG, PNG e WEBP são permitidos.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploadError('')
    setIsUploading(true)
    setUploadProgress({ current: 0, total: selectedFiles.length })

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        const blob = await upload(file.name, file, {
          access: 'private',
          handleUploadUrl: '/api/blob/upload',
          multipart: file.size > 5 * 1024 * 1024,
        })
        await saveImageMetadata({
          projectId,
          folderId: currentFolder?.id ?? null,
          nome: file.name,
          pathname: blob.pathname,
          tamanho: file.size,
        })
        setUploadProgress({ current: i + 1, total: selectedFiles.length })
      }
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadData()
    } catch (err) {
      console.error(err)
      setUploadError('Erro ao enviar imagens.')
    } finally {
      setIsUploading(false)
    }
  }

  const imgSrc = (pathname: string) =>
    `/api/file?pathname=${encodeURIComponent(pathname)}`

  const showPrev = () => {
    setLightboxIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length))
  }
  const showNext = () => {
    setLightboxIndex((i) => (i === null ? null : (i + 1) % images.length))
  }

  return (
    <div className="space-y-4">
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
              <span className="rounded px-2 py-1 font-medium text-foreground">
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
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <ImagePlus className="mr-1.5 h-4 w-4" />
            {isUploading
              ? `Enviando ${uploadProgress.current}/${uploadProgress.total}...`
              : 'Adicionar Imagens'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>

      {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

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
                  className="group flex items-center gap-2 rounded-lg border bg-card p-3 transition-colors hover:border-primary"
                >
                  <button
                    onClick={() => setCurrentFolder(folder)}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <Folder className="h-5 w-5 shrink-0 text-primary" />
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
                          Excluir
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}

          {/* Grid de imagens */}
          {images.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-lg border bg-card text-center text-muted-foreground">
              <ImagePlus className="mb-2 h-8 w-8" />
              <p className="text-sm">Nenhuma imagem nesta pasta</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((img, index) => (
                <div
                  key={img.id}
                  className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgSrc(img.pathname) || "/placeholder.svg"}
                    alt={img.nome}
                    className="h-full w-full cursor-pointer object-cover transition-transform group-hover:scale-105"
                    onClick={() => setLightboxIndex(index)}
                  />
                  <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <a href={`${imgSrc(img.pathname)}&download=1`} onClick={(e) => e.stopPropagation()}>
                      <Button variant="secondary" size="icon" className="h-7 w-7">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setDeletingImage(img)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && images[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-white hover:bg-white/20 hover:text-white"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 text-white hover:bg-white/20 hover:text-white"
              onClick={(e) => {
                e.stopPropagation()
                showPrev()
              }}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc(images[lightboxIndex].pathname) || "/placeholder.svg"}
            alt={images[lightboxIndex].nome}
            className="max-h-[85vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 text-white hover:bg-white/20 hover:text-white"
              onClick={(e) => {
                e.stopPropagation()
                showNext()
              }}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-sm text-white">
            {images[lightboxIndex].nome} ({lightboxIndex + 1}/{images.length})
          </div>
        </div>
      )}

      {/* Dialog Nova Pasta */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Pasta</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="folderName3d">Nome da pasta</Label>
            <Input
              id="folderName3d"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Ex: Render Sala, Fachada..."
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
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
            <Label htmlFor="renameValue3d">Novo nome</Label>
            <Input
              id="renameValue3d"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingFolder(null)}>
              Cancelar
            </Button>
            <Button onClick={handleRename}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Excluir Pasta */}
      <AlertDialog open={!!deletingFolder} onOpenChange={() => setDeletingFolder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir &quot;{deletingFolder?.nome}&quot; e todas as imagens dentro dela?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolder}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Excluir Imagem */}
      <AlertDialog open={!!deletingImage} onOpenChange={() => setDeletingImage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir imagem</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir &quot;{deletingImage?.nome}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteImage}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
