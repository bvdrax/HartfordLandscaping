'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FolderOpen, FileText, Receipt, Clock,
  Camera, Users, Package, Settings, type LucideIcon,
} from 'lucide-react'
import type { NavItem } from '@/lib/nav'

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Receipt,
  Clock,
  Camera,
  Users,
  Package,
  Settings,
}

interface Props {
  navItems: NavItem[]
}

export default function BottomNav({ navItems }: Props) {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border pb-safe">
      <div className="flex h-16">
        {navItems.map((item) => {
          const Icon: LucideIcon = ICON_MAP[item.icon] ?? LayoutDashboard
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon size={22} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
