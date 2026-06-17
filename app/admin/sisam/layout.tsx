import ModuloGuard from '@/components/modulo-guard'

export default function SisamModuloLayout({ children }: { children: React.ReactNode }) {
  return <ModuloGuard modulo="sisam">{children}</ModuloGuard>
}
