import ModuloGuard from '@/components/modulo-guard'

export default function TransparenciaModuloLayout({ children }: { children: React.ReactNode }) {
  return <ModuloGuard modulo="transparencia">{children}</ModuloGuard>
}
