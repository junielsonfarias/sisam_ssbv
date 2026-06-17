import ModuloGuard from '@/components/modulo-guard'

export default function AdminModuloLayout({ children }: { children: React.ReactNode }) {
  return <ModuloGuard modulo="admin">{children}</ModuloGuard>
}
