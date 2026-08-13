'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard,
  BarChart3,
  ClipboardList,
  HardDrive,
  LogOut,
  Moon,
  Sun,
  MoreHorizontal,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  evaluationCount?: number
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/estatisticas', label: 'Estatísticas', icon: BarChart3 },
  { href: '/dashboard/avaliacao', label: 'Avaliação', icon: ClipboardList },
  { href: '/dashboard/drivers', label: 'Drivers', icon: HardDrive },
]

export function Sidebar({ evaluationCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const content = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
          <Image
            src="/logo.png"
            alt="KM Logo"
            width={32}
            height={32}
            className="rounded-md"
          />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold">Gestão de Projetos</h1>
          <p className="truncate text-xs text-sidebar-foreground/60">
            Kalyandra M. Moura - Arquitetura
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
              {item.href === '/dashboard/avaliacao' && evaluationCount > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5">
                  {evaluationCount}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border px-3 py-4">
        {mounted && (
          <Button
            variant="ghost"
            onClick={toggleTheme}
            className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Topbar mobile — só logo, sem botão de menu */}
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white p-0.5">
          <Image src="/logo.png" alt="KM Logo" width={24} height={24} className="rounded-sm" />
        </div>
        <span className="text-sm font-bold">Gestão de Projetos</span>
      </div>

      {/* Sidebar desktop — igual antes
<aside className="hidden w-64 shrink-0 md:block">
  <div className="sticky top-0 h-screen">{content}</div>
</aside>
*/}

      {/* Barra inferior mobile estilo Instagram */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t bg-sidebar text-sidebar-foreground pb-[env(safe-area-inset-bottom)] md:hidden"
        style={{ height: '64px' }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex h-full flex-1 flex-col items-center justify-center gap-0.5"
            >
              <span className="relative">
                <Icon
                  className={`h-6 w-6 transition-transform ${
                    active ? 'text-sidebar-accent-foreground scale-110' : 'text-sidebar-foreground/60'
                  }`}
                  strokeWidth={active ? 2.5 : 2}
                />
                {item.href === '/dashboard/avaliacao' && evaluationCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute -right-2 -top-2 h-4 min-w-4 justify-center px-1 text-[9px]"
                  >
                    {evaluationCount}
                  </Badge>
                )}
              </span>
              <span
                className={`text-[10px] ${
                  active ? 'text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/60'
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* Botão "mais" — tema e sair */}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex h-full flex-1 flex-col items-center justify-center gap-0.5"
        >
          <MoreHorizontal className="h-6 w-6 text-sidebar-foreground/60" />
          <span className="text-[10px] text-sidebar-foreground/60">Mais</span>
        </button>
      </nav>

      {/* Sheet "mais" — tema / sair, abre de baixo pra cima */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-sidebar text-sidebar-foreground pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
              <span className="text-sm font-semibold">Mais opções</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMoreOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-1 px-3 py-3">
              {mounted && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    toggleTheme()
                    setMoreOpen(false)
                  }}
                  className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}