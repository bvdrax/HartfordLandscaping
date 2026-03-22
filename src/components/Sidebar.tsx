'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FolderOpen, FileText, Receipt, Clock,
  Camera, Users, UserCog, Package, Settings, LogOut, Leaf, BarChart2, KeyRound, type LucideIcon,
} from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import type { NavItem } from '@/lib/nav'

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Receipt,
  Clock,
  Camera,
  Users,
  UserCog,
  Package,
  BarChart2,
  Settings,
}

interface Props {
  navItems: NavItem[]
  userInitials: string
  userName: string
  userEmail: string
}

export default function Sidebar({ navItems, userInitials, userName, userEmail }: Props) {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-60 h-screen fixed left-0 top-0 border-r border-border bg-card z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border shrink-0">
        <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: '#2D6A4F' }}>
          <Leaf size={16} className="text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-foreground">Hartford</p>
          <p className="text-[10px] text-muted-foreground">Landscaping</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon: LucideIcon = ICON_MAP[item.icon] ?? LayoutDashboard
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3 shrink-0 space-y-1">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: '#2D6A4F' }}>
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{userName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{userEmail}</p>
          </div>
          <ThemeToggle />
        </div>
        <Link
          href="/account"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <KeyRound size={16} />
          {"Account & Password"}
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
