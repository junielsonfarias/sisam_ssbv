import ModuloGuard from '@/components/modulo-guard'

export default function SemedModuloLayout({ children }: { children: React.ReactNode }) {
  return <ModuloGuard modulo="semed">{children}</ModuloGuard>
}
