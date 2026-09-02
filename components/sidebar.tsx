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
  Wallet,
  LogOut,
  Moon,
  Sun,
  MoreHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  evaluationCount?: number
}

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/dashboard/estatisticas',
    label: 'Estatísticas',
    icon: BarChart3,
  },
  {
    href: '/dashboard/financeiro',
    label: 'Financeiro',
    icon: Wallet,
  },
  {
    href: '/dashboard/avaliacao',
    label: 'Avaliação',
    icon: ClipboardList,
  },
  {
    href: '/dashboard/drivers',
    label: 'Drivers',
    icon: HardDrive,
  },
]

export function Sidebar({ evaluationCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const [mounted, setMounted] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

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

  const isActive = (href: string) => {
    return href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href)
  }

  const content = (isCollapsed: boolean) => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div
        className={`flex items-center gap-3 border-b border-sidebar-border px-5 py-5 ${
          isCollapsed ? 'justify-center px-3' : ''
        }`}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
          <Image
            src="/logo.png"
            alt="KM Logo"
            width={32}
            height={32}
            className="rounded-md"
          />
        </div>

        {!isCollapsed && (
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold">
              Gestão de Projetos
            </h1>

            <p className="truncate text-xs text-sidebar-foreground/60">
              Kalyandra M. Moura - Arquitetura
            </p>
          </div>
        )}
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isCollapsed ? 'justify-center' : 'justify-between'
              } ${
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
              }`}
            >
              <span
                className={`flex items-center ${
                  isCollapsed ? '' : 'gap-2'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />

                {!isCollapsed && item.label}
              </span>

              {!isCollapsed &&
                item.href === '/dashboard/avaliacao' &&
                evaluationCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-5 justify-center px-1.5"
                  >
                    {evaluationCount}
                  </Badge>
                )}
            </Link>
          )
        })}
      </nav>

      {/* Rodapé */}
      <div className="space-y-1 border-t border-sidebar-border px-3 py-4">
        {/* Tema */}
        {mounted && (
          <Button
            variant="ghost"
            onClick={toggleTheme}
            title={
              isCollapsed
                ? theme === 'dark'
                  ? 'Modo claro'
                  : 'Modo escuro'
                : undefined
            }
            className={`w-full text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground ${
              isCollapsed
                ? 'justify-center px-0'
                : 'justify-start gap-2'
            }`}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}

            {!isCollapsed &&
              (theme === 'dark' ? 'Modo claro' : 'Modo escuro')}
          </Button>
        )}

        {/* Sair */}
        <Button
          variant="ghost"
          onClick={handleLogout}
          title={isCollapsed ? 'Sair' : undefined}
          className={`w-full text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground ${
            isCollapsed
              ? 'justify-center px-0'
              : 'justify-start gap-2'
          }`}
        >
          <LogOut className="h-4 w-4" />

          {!isCollapsed && 'Sair'}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* ========================================================= */}
      {/* SIDEBAR DESKTOP */}
      {/* ========================================================= */}

      <aside
        className={`hidden shrink-0 overflow-visible transition-all duration-200 md:block ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="relative h-screen overflow-visible sticky top-0">
          {content(collapsed)}

          {/* Botão recolher/expandir */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute -right-3 top-6 z-50 h-6 w-6 rounded-full border shadow-md"
            onClick={() => setCollapsed((current) => !current)}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* BARRA INFERIOR MOBILE */}
      {/* ========================================================= */}

      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-t bg-sidebar pb-[env(safe-area-inset-bottom)] text-sidebar-foreground md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="relative flex h-full flex-1 flex-col items-center justify-center gap-0.5"
            >
              <span className="relative">
                <Icon
                  className={`h-[18px] w-[18px] transition-transform ${
                    active
                      ? 'scale-105 text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/55'
                  }`}
                  strokeWidth={active ? 2.25 : 1.75}
                />

                {item.href === '/dashboard/avaliacao' &&
                  evaluationCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="absolute -right-1.5 -top-1.5 h-3.5 min-w-3.5 justify-center rounded-full px-1 text-[8px] leading-none"
                    >
                      {evaluationCount}
                    </Badge>
                  )}
              </span>

              <span
                className={`text-[9px] leading-none tracking-tight ${
                  active
                    ? 'font-medium text-sidebar-accent-foreground'
                    : 'font-normal text-sidebar-foreground/55'
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* Botão Mais */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex h-full flex-1 flex-col items-center justify-center gap-0.5"
        >
          <MoreHorizontal
            className="h-[18px] w-[18px] text-sidebar-foreground/55"
            strokeWidth={1.75}
          />

          <span className="text-[9px] font-normal leading-none tracking-tight text-sidebar-foreground/55">
            Mais
          </span>
        </button>
      </nav>

      {/* ========================================================= */}
      {/* MENU "MAIS" MOBILE */}
      {/* ========================================================= */}

      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Fundo escuro */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMoreOpen(false)}
          />

          {/* Menu */}
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-sidebar pb-[env(safe-area-inset-bottom)] text-sidebar-foreground">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
              <span className="text-sm font-semibold">
                Mais opções
              </span>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMoreOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Opções */}
            <div className="space-y-1 px-3 py-3">
              {/* Tema */}
              {mounted && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    toggleTheme()
                    setMoreOpen(false)
                  }}
                  className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}

                  {theme === 'dark'
                    ? 'Modo claro'
                    : 'Modo escuro'}
                </Button>
              )}

              {/* Sair */}
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

      {/* ========================================================= */}
      {/* MENU MOBILE LATERAL */}
      {/* ========================================================= */}

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Fundo */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />

          {/* Sidebar */}
          <div className="absolute inset-y-0 left-0 w-64">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10 text-sidebar-foreground hover:bg-sidebar-accent/60"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            {content(false)}
          </div>
        </div>
      )}
    </>
  )
}