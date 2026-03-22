import { getNavItems, getMobileNavItems } from '@/lib/nav'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import ActiveClockInBanner from './time/ActiveClockInBanner'
import OfflineBanner from './OfflineBanner'
import InstallPrompt from './InstallPrompt'
import type { SessionPayload } from '@/lib/auth'

interface Props {
  session: SessionPayload
  children: React.ReactNode
}

export default function AppLayout({ session, children }: Props) {
  const navItems = getNavItems(session.role)
  const mobileNavItems = getMobileNavItems(session.role)
  const userInitials = `${session.firstName[0]}${session.lastName[0]}`.toUpperCase()
  const userName = `${session.firstName} ${session.lastName}`

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        navItems={navItems}
        userInitials={userInitials}
        userName={userName}
        userEmail={session.email}
      />

      {/* Main content — offset by sidebar on desktop, padded for bottom nav on mobile */}
      <main className="lg:pl-60 pb-16 lg:pb-0 min-h-screen">
        <OfflineBanner />
        <ActiveClockInBanner />
        {children}
      </main>

      <BottomNav navItems={mobileNavItems} />
      <InstallPrompt />
    </div>
  )
}
