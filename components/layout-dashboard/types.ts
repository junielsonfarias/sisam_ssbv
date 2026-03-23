export interface LayoutDashboardProps {
  children: React.ReactNode
  tipoUsuario: string
}

export interface MenuItem {
  icon: any
  label: string
  href?: string
  children?: MenuItem[]
}

export interface Personalizacao {
  logo_url?: string
  nome_sistema?: string
  cor_primaria?: string
}
