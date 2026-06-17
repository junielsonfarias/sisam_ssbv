import ModuloGuard from '@/components/modulo-guard'

export default function GestorModuloLayout({ children }: { children: React.ReactNode }) {
  return <ModuloGuard modulo="gestor">{children}</ModuloGuard>
}
