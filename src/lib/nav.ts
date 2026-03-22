export interface NavItem {
  label: string
  href: string
  icon: string
  roles: string[]
}

const ALL = ['PLATFORM_ADMIN', 'OWNER', 'ACCOUNTANT', 'PROJECT_MANAGER', 'FIELD_WORKER', 'SUBCONTRACTOR']

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    roles: ALL,
  },
  {
    label: 'Projects',
    href: '/projects',
    icon: 'FolderOpen',
    roles: ['PLATFORM_ADMIN', 'OWNER', 'PROJECT_MANAGER', 'FIELD_WORKER', 'ACCOUNTANT'],
  },
  {
    label: 'Quotes',
    href: '/quotes',
    icon: 'FileText',
    roles: ['PLATFORM_ADMIN', 'OWNER', 'PROJECT_MANAGER', 'ACCOUNTANT'],
  },
  {
    label: 'Invoices',
    href: '/invoices',
    icon: 'Receipt',
    roles: ['PLATFORM_ADMIN', 'OWNER', 'ACCOUNTANT'],
  },
  {
    label: 'Time',
    href: '/time',
    icon: 'Clock',
    roles: ['PLATFORM_ADMIN', 'OWNER', 'PROJECT_MANAGER', 'FIELD_WORKER', 'SUBCONTRACTOR'],
  },
  {
    label: 'Receipts',
    href: '/receipts',
    icon: 'Camera',
    roles: ['PLATFORM_ADMIN', 'OWNER', 'PROJECT_MANAGER', 'FIELD_WORKER'],
  },
  {
    label: 'Workers',
    href: '/workers',
    icon: 'Users',
    roles: ['PLATFORM_ADMIN', 'OWNER', 'PROJECT_MANAGER'],
  },
  {
    label: 'Suppliers',
    href: '/suppliers',
    icon: 'Package',
    roles: ['PLATFORM_ADMIN', 'OWNER', 'ACCOUNTANT', 'PROJECT_MANAGER'],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: 'Settings',
    roles: ['PLATFORM_ADMIN', 'OWNER'],
  },
]

export function getNavItems(role: string): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role))
}

/** Top 5 accessible items for the mobile bottom tab bar */
export function getMobileNavItems(role: string): NavItem[] {
  return getNavItems(role).slice(0, 5)
}
