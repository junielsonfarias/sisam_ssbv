'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutGrid,
  Users,
  School,
  MapPin,
  FileText,
  BarChart3,
  LogOut,
  Menu,
  X,
  Database,
  FileCheck,
  TrendingUp,
  FileScan,
  GraduationCap,
  Settings,
  Upload,
  History,
  FilePlus,
  UserPlus,
  User,
  WifiOff,
  Activity,
  FileBarChart,
  AlertTriangle,
  ClipboardList,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ArrowLeftRight,
  CalendarCheck,
  RotateCcw,
  Bell,
  DoorOpen,
  Printer,
  Scan,
  Monitor,
  ScanFace,
  Tablet,
  CalendarClock,
  LayoutList,
  Globe,
  FileSpreadsheet,
  Lock
} from 'lucide-react'
import Rodape from './rodape'
import { OfflineSyncManager } from './offline-sync-manager'
import * as offlineStorage from '@/lib/offline-storage'
import { ThemeToggleSimple } from './theme-toggle'
import AlertaDivergencias from './alerta-divergencias'

interface LayoutDashboardProps {
  children: React.ReactNode
  tipoUsuario: string
}

interface MenuItem {
  icon: any
  label: string
  href?: string
  children?: MenuItem[]
}

interface Personalizacao {
  logo_url?: string
  nome_sistema?: string
  cor_primaria?: string
}

export default function LayoutDashboard({ children, tipoUsuario }: LayoutDashboardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [usuario, setUsuario] = useState<any>(null)
  const [menuAberto, setMenuAberto] = useState(false)
  const [menuDesktopOculto, setMenuDesktopOculto] = useState(true) // Menu oculto por padrão em desktop
  const [modoOffline, setModoOffline] = useState(false)
  const [personalizacao, setPersonalizacao] = useState<Personalizacao>({})
  const [dataAtual, setDataAtual] = useState('')
  const [gruposExpandidos, setGruposExpandidos] = useState<Record<string, boolean>>({})
  const [moduloAtivo, setModuloAtivo] = useState<offlineStorage.ModuloAtivo>('educatec')
  const [hidratado, setHidratado] = useState(false)

  // Função para verificar se o item do menu está ativo
  // Usa correspondência exata ou subrota, com proteção contra falso-positivo
  // (ex: /admin/relatorios não deve ativar /admin/relatorios-pdf)
  const isMenuItemActive = (href: string): boolean => {
    if (!pathname) return false
    if (pathname === href) return true
    // Subrota: pathname deve começar com href + '/' (não apenas href como prefix)
    if (pathname.startsWith(href + '/')) return true
    return false
  }

  // Função para obter configurações do badge por tipo de usuário
  const getBadgeConfig = (tipo: string) => {
    const configs: Record<string, { label: string; bgColor: string; textColor: string }> = {
      admin: { label: 'Administrador', bgColor: 'bg-purple-100 dark:bg-purple-900/50', textColor: 'text-purple-700 dark:text-purple-300' },
      administrador: { label: 'Administrador', bgColor: 'bg-purple-100 dark:bg-purple-900/50', textColor: 'text-purple-700 dark:text-purple-300' },
      tecnico: { label: 'Técnico', bgColor: 'bg-blue-100 dark:bg-blue-900/50', textColor: 'text-blue-700 dark:text-blue-300' },
      polo: { label: 'Polo', bgColor: 'bg-green-100 dark:bg-green-900/50', textColor: 'text-green-700 dark:text-green-300' },
      escola: { label: 'Escola', bgColor: 'bg-orange-100 dark:bg-orange-900/50', textColor: 'text-orange-700 dark:text-orange-300' },
      professor: { label: 'Professor', bgColor: 'bg-emerald-100 dark:bg-emerald-900/50', textColor: 'text-emerald-700 dark:text-emerald-300' },
      gestor: { label: 'Gestor Escolar', bgColor: 'bg-teal-100 dark:bg-teal-900/50', textColor: 'text-teal-700 dark:text-teal-300' }
    }
    return configs[tipo] || { label: tipo, bgColor: 'bg-gray-100 dark:bg-gray-900/50', textColor: 'text-gray-700 dark:text-gray-300' }
  }

  // Hidratar estado do cliente (evita mismatch server/client)
  // Também detecta o módulo pela URL atual
  useEffect(() => {
    const moduloStorage = offlineStorage.getModuloAtivo()
    // Se a URL é de dashboard-gestor ou rota do gestor, forçar módulo gestor
    if (pathname?.includes('dashboard-gestor')) {
      setModuloAtivo('gestor')
      offlineStorage.saveModuloAtivo('gestor')
    } else {
      setModuloAtivo(moduloStorage)
    }
    setHidratado(true)
  }, [pathname])

  // Carregar personalização do sistema
  useEffect(() => {
    const carregarPersonalizacao = async () => {
      try {
        const response = await fetch('/api/personalizacao')
        if (response.ok) {
          const data = await response.json()
          setPersonalizacao(data)
        }
      } catch (error) {
        console.error('Erro ao carregar personalização:', error)
      }
    }
    carregarPersonalizacao()

    // Atualizar data atual
    const atualizarData = () => {
      const agora = new Date()
      const opcoes: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }
      setDataAtual(agora.toLocaleDateString('pt-BR', opcoes))
    }
    atualizarData()
    const intervalo = setInterval(atualizarData, 60000) // Atualiza a cada minuto
    return () => clearInterval(intervalo)
  }, [])

  useEffect(() => {
    const carregarUsuario = async () => {
      // Verificar se está online
      const online = offlineStorage.isOnline()
      setModoOffline(!online)

      if (online) {
        // Tentar carregar do servidor
        try {
          const response = await fetch('/api/auth/verificar')
          const data = await response.json()
          if (data.usuario) {
            setUsuario(data.usuario)
            // Salvar usuário para acesso offline no localStorage
            offlineStorage.saveUser({
              id: data.usuario.id?.toString() || data.usuario.usuario_id?.toString(),
              nome: data.usuario.nome,
              email: data.usuario.email,
              tipo_usuario: data.usuario.tipo_usuario,
              polo_id: data.usuario.polo_id,
              escola_id: data.usuario.escola_id,
              polo_nome: data.usuario.polo_nome,
              escola_nome: data.usuario.escola_nome,
              gestor_escolar_habilitado: data.usuario.gestor_escolar_habilitado
            })
          } else {
            // Sem sessão válida, tentar usuário offline
            const offlineUser = offlineStorage.getUser()
            if (offlineUser) {
              setUsuario(offlineUser)
              setModoOffline(true)
            } else {
              router.push('/login')
            }
          }
        } catch (error) {
          // Erro de rede, tentar usuário offline
          const offlineUser = offlineStorage.getUser()
          if (offlineUser) {
            setUsuario(offlineUser)
            setModoOffline(true)
          } else {
            router.push('/login')
          }
        }
      } else {
        // Está offline, usar usuário salvo
        const offlineUser = offlineStorage.getUser()
        if (offlineUser) {
          setUsuario(offlineUser)
        } else {
          // Sem usuário offline, redirecionar para login
          router.push('/login')
        }
      }
    }

    carregarUsuario()

    // Listener para mudanças de conexão
    const handleOnline = () => setModoOffline(false)
    const handleOffline = () => setModoOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Impedir reload quando offline - aviso ao usuário
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!offlineStorage.isOnline()) {
        e.preventDefault()
        e.returnValue = 'Você está offline. Recarregar a página pode causar perda de sessão. Deseja continuar?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [router])

  const handleLogout = () => {
    // Limpar usuario e módulo imediatamente
    offlineStorage.clearUser()
    offlineStorage.clearModuloAtivo()

    // Redirecionar imediatamente para o login
    router.push('/login')

    // Fazer logout no servidor em background (não bloqueia)
    if (offlineStorage.isOnline()) {
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    }

    // Limpar demais dados offline em background (não bloqueia)
    offlineStorage.clearAllOfflineData()
  }

  // Mapear tipoUsuario para o caminho correto
  const getBasePath = () => {
    if (!tipoUsuario) return 'admin'
    if (tipoUsuario === 'admin' || tipoUsuario === 'administrador') return 'admin'
    return tipoUsuario
  }

  const basePath = getBasePath()
  const tipoUsuarioReal = usuario?.tipo_usuario === 'administrador' ? 'admin' : (usuario?.tipo_usuario || tipoUsuario || 'admin')

  // Menu fixo baseado no tipo de usuario e módulo ativo
  const getMenuItems = (): MenuItem[] => {
    const dashHref = moduloAtivo === 'gestor' ? '/admin/dashboard-gestor' : `/${basePath}/dashboard`
    const items: MenuItem[] = [
      { icon: LayoutGrid, label: 'Dashboard', href: dashHref },
    ]

    // Menu especifico para ADMINISTRADOR
    if (tipoUsuarioReal === 'admin' || tipoUsuarioReal === 'administrador') {
      // Grupos Educatec (só no módulo Educatec)
      if (moduloAtivo === 'educatec') {
        items.push(
          {
            icon: Database, label: 'Análises', children: [
              { icon: Database, label: 'Painel de Dados', href: '/admin/dados' },
              { icon: TrendingUp, label: 'Análise Gráfica', href: '/admin/graficos' },
              { icon: FileBarChart, label: 'Relatórios', href: '/admin/relatorios' },
            ]
          },
          {
            icon: FileText, label: 'Resultados', children: [
              { icon: FileText, label: 'Resultados Consolidados', href: '/admin/resultados' },
              { icon: BarChart3, label: 'Comparativos Escolas', href: '/admin/comparativos' },
              { icon: MapPin, label: 'Comparativo Polos', href: '/admin/comparativos-polos' },
              { icon: BarChart3, label: 'Educatec x Escola', href: '/admin/comparativo-notas' },
              { icon: TrendingUp, label: 'Evolução', href: '/admin/evolucao' },
            ]
          },
          {
            icon: ClipboardList, label: 'Avaliações', children: [
              { icon: ClipboardList, label: 'Avaliações Educatec', href: '/admin/avaliacoes' },
              { icon: FileCheck, label: 'Questões', href: '/admin/questoes' },
              { icon: FileScan, label: 'Cartão-Resposta', href: '/admin/cartao-resposta' },
            ]
          },
          {
            icon: Upload, label: 'Importação', children: [
              { icon: Upload, label: 'Importar Dados', href: '/admin/importar-completo' },
              { icon: UserPlus, label: 'Importar Cadastros', href: '/admin/importar-cadastros' },
              { icon: FilePlus, label: 'Importar Resultados', href: '/admin/importar-resultados' },
              { icon: History, label: 'Histórico', href: '/admin/importacoes' },
            ]
          },
          {
            icon: Settings, label: 'Configurações Educatec', children: [
              { icon: Settings, label: 'Séries Educatec', href: '/admin/configuracao-series' },
              { icon: Settings, label: 'Módulos Técnico', href: '/admin/modulos-tecnico' },
            ]
          },
        )
      }
      // Grupos do Gestor Escolar (só no módulo Gestor)
      if (moduloAtivo === 'gestor') {
        items.push(
          {
            icon: BookOpen, label: 'Cadastros', children: [
              { icon: School, label: 'Escolas', href: '/admin/escolas' },
              { icon: MapPin, label: 'Polos', href: '/admin/polos' },
              { icon: GraduationCap, label: 'Alunos', href: '/admin/alunos' },
              { icon: Users, label: 'Turmas', href: '/admin/turmas' },
            ]
          },
          {
            icon: UserPlus, label: 'Matrículas e Vagas', children: [
              { icon: UserPlus, label: 'Matrículas', href: '/admin/matriculas' },
              { icon: ArrowLeftRight, label: 'Transferências', href: '/admin/transferencias' },
              { icon: DoorOpen, label: 'Controle de Vagas', href: '/admin/controle-vagas' },
            ]
          },
          {
            icon: CalendarCheck, label: 'Frequência', children: [
              { icon: CalendarCheck, label: 'Frequência Bimestral', href: '/admin/frequencia' },
              { icon: Scan, label: 'Frequência Diária', href: '/admin/frequencia-diaria' },
              { icon: AlertTriangle, label: 'Infrequência', href: '/admin/infrequencia' },
              { icon: LayoutList, label: 'Painel da Turma', href: '/admin/painel-turma' },
            ]
          },
          {
            icon: ScanFace, label: 'Reconhecimento Facial', children: [
              { icon: Monitor, label: 'Dispositivos', href: '/admin/dispositivos-faciais' },
              { icon: ScanFace, label: 'Cadastro Facial', href: '/admin/facial-enrollment' },
              { icon: Tablet, label: 'Terminal', href: '/admin/terminal-facial' },
            ]
          },
          {
            icon: FileSpreadsheet, label: 'Avaliações Escolares', children: [
              { icon: FileText, label: 'Lançar Notas', href: '/admin/notas-escolares' },
              { icon: RotateCcw, label: 'Recuperação', href: '/admin/recuperacao' },
              { icon: ClipboardList, label: 'Regras de Avaliação', href: '/admin/regras-avaliacao' },
              { icon: Lock, label: 'Fechamento de Ano', href: '/admin/fechamento-ano' },
            ]
          },
          {
            icon: ClipboardList, label: 'Pedagógico', children: [
              { icon: Users, label: 'Conselho de Classe', href: '/admin/conselho-classe' },
              { icon: FileText, label: 'Histórico Escolar', href: '/admin/historico-escolar' },
              { icon: Printer, label: 'Relatórios PDF', href: '/admin/relatorios-pdf' },
              { icon: AlertTriangle, label: 'Divergências', href: '/admin/divergencias' },
            ]
          },
          {
            icon: GraduationCap, label: 'Professores', children: [
              { icon: Users, label: 'Gerenciar Professores', href: '/admin/professores' },
              { icon: ArrowLeftRight, label: 'Vincular Turmas', href: '/admin/professor-turmas' },
            ]
          },
          {
            icon: Settings, label: 'Configurações', children: [
              { icon: CalendarCheck, label: 'Anos Letivos', href: '/admin/anos-letivos' },
              { icon: GraduationCap, label: 'Séries', href: '/admin/series-escolares' },
              { icon: BookOpen, label: 'Disciplinas', href: '/admin/disciplinas' },
              { icon: Settings, label: 'Períodos Letivos', href: '/admin/gestor-escolar' },
              { icon: CalendarClock, label: 'Horários de Aula', href: '/admin/horarios-aula' },
            ]
          },
        )
      }
      // Itens comuns (visíveis em ambos módulos)
      items.push(
        { icon: Bell, label: 'Notificações', href: '/admin/notificacoes' },
        { icon: Users, label: 'Usuários', href: '/admin/usuarios' },
        { icon: Settings, label: 'Personalização', href: '/admin/personalizacao' },
        { icon: Globe, label: 'Site Institucional', href: '/admin/site-institucional' },
        { icon: Activity, label: 'Logs de Acesso', href: '/admin/logs-acesso' }
      )
    }

    // Menu especifico para TECNICO
    if (tipoUsuarioReal === 'tecnico') {
      if (moduloAtivo === 'educatec') {
        items.push(
          {
            icon: Database, label: 'Análises', children: [
              { icon: Database, label: 'Painel de Dados', href: '/admin/dados' },
              { icon: TrendingUp, label: 'Análise Gráfica', href: '/tecnico/graficos' },
            ]
          },
          {
            icon: FileText, label: 'Resultados', children: [
              { icon: FileText, label: 'Resultados Consolidados', href: '/tecnico/analise' },
              { icon: BarChart3, label: 'Comparativos Escolas', href: '/admin/comparativos' },
              { icon: MapPin, label: 'Comparativo Polos', href: '/admin/comparativos-polos' },
              { icon: BarChart3, label: 'Educatec x Escola', href: '/admin/comparativo-notas' },
              { icon: TrendingUp, label: 'Evolução', href: '/admin/evolucao' },
            ]
          },
        )
      }
      if (moduloAtivo === 'gestor') {
        items.push(
          {
            icon: BookOpen, label: 'Cadastros', children: [
              { icon: School, label: 'Escolas', href: '/admin/escolas' },
              { icon: MapPin, label: 'Polos', href: '/admin/polos' },
              { icon: GraduationCap, label: 'Alunos', href: '/admin/alunos' },
              { icon: Users, label: 'Turmas', href: '/admin/turmas' },
            ]
          },
          {
            icon: UserPlus, label: 'Matrículas e Vagas', children: [
              { icon: UserPlus, label: 'Matrículas', href: '/admin/matriculas' },
              { icon: ArrowLeftRight, label: 'Transferências', href: '/admin/transferencias' },
              { icon: DoorOpen, label: 'Controle de Vagas', href: '/admin/controle-vagas' },
            ]
          },
          {
            icon: CalendarCheck, label: 'Frequência', children: [
              { icon: CalendarCheck, label: 'Frequência Bimestral', href: '/admin/frequencia' },
              { icon: Scan, label: 'Frequência Diária', href: '/admin/frequencia-diaria' },
              { icon: AlertTriangle, label: 'Infrequência', href: '/admin/infrequencia' },
              { icon: LayoutList, label: 'Painel da Turma', href: '/admin/painel-turma' },
            ]
          },
          {
            icon: ScanFace, label: 'Reconhecimento Facial', children: [
              { icon: Monitor, label: 'Dispositivos', href: '/admin/dispositivos-faciais' },
              { icon: ScanFace, label: 'Cadastro Facial', href: '/admin/facial-enrollment' },
              { icon: Tablet, label: 'Terminal', href: '/admin/terminal-facial' },
            ]
          },
          {
            icon: FileSpreadsheet, label: 'Avaliações Escolares', children: [
              { icon: FileText, label: 'Lançar Notas', href: '/admin/notas-escolares' },
              { icon: RotateCcw, label: 'Recuperação', href: '/admin/recuperacao' },
              { icon: ClipboardList, label: 'Regras de Avaliação', href: '/admin/regras-avaliacao' },
              { icon: Lock, label: 'Fechamento de Ano', href: '/admin/fechamento-ano' },
            ]
          },
          {
            icon: ClipboardList, label: 'Pedagógico', children: [
              { icon: Users, label: 'Conselho de Classe', href: '/admin/conselho-classe' },
              { icon: FileText, label: 'Histórico Escolar', href: '/admin/historico-escolar' },
              { icon: Printer, label: 'Relatórios PDF', href: '/admin/relatorios-pdf' },
            ]
          },
          {
            icon: Settings, label: 'Configurações', children: [
              { icon: CalendarCheck, label: 'Anos Letivos', href: '/admin/anos-letivos' },
              { icon: GraduationCap, label: 'Séries', href: '/admin/series-escolares' },
              { icon: BookOpen, label: 'Disciplinas', href: '/admin/disciplinas' },
              { icon: Settings, label: 'Períodos Letivos', href: '/admin/gestor-escolar' },
              { icon: CalendarClock, label: 'Horários de Aula', href: '/admin/horarios-aula' },
            ]
          },
        )
      }
      items.push({ icon: Bell, label: 'Notificações', href: '/admin/notificacoes' })
    }

    // Menu especifico para POLO
    if (tipoUsuarioReal === 'polo') {
      items.push(
        {
          icon: Database, label: 'Análises', children: [
            { icon: Database, label: 'Painel de Dados', href: '/admin/dados' },
            { icon: TrendingUp, label: 'Análise Gráfica', href: '/polo/graficos' },
          ]
        },
        {
          icon: FileText, label: 'Resultados', children: [
            { icon: FileText, label: 'Resultados Consolidados', href: '/polo/analise' },
            { icon: BarChart3, label: 'Comparativo Escolas', href: '/admin/comparativos' },
          ]
        },
        {
          icon: BookOpen, label: 'Cadastros', children: [
            { icon: School, label: 'Escolas', href: '/polo/escolas' },
            { icon: GraduationCap, label: 'Alunos', href: '/admin/alunos' },
          ]
        },
      )
    }

    // Menu especifico para ESCOLA
    if (tipoUsuarioReal === 'escola') {
      if (moduloAtivo === 'educatec') {
        items.push(
          {
            icon: Database, label: 'Análises', children: [
              { icon: Database, label: 'Painel de Dados', href: '/admin/dados' },
            ]
          },
          {
            icon: FileText, label: 'Resultados', children: [
              { icon: FileText, label: 'Resultados Consolidados', href: '/escola/resultados' },
              { icon: BarChart3, label: 'Educatec x Escola', href: '/admin/comparativo-notas' },
            ]
          },
        )
      }
      if (moduloAtivo === 'gestor' && usuario?.gestor_escolar_habilitado) {
        items.push(
          {
            icon: BookOpen, label: 'Cadastros', children: [
              { icon: GraduationCap, label: 'Alunos', href: '/escola/alunos' },
              { icon: UserPlus, label: 'Matrículas', href: '/escola/matriculas' },
              { icon: ArrowLeftRight, label: 'Transferências', href: '/admin/transferencias' },
              { icon: DoorOpen, label: 'Controle de Vagas', href: '/admin/controle-vagas' },
            ]
          },
          {
            icon: CalendarCheck, label: 'Frequência', children: [
              { icon: CalendarCheck, label: 'Frequência Bimestral', href: '/admin/frequencia' },
              { icon: Scan, label: 'Frequência Diária', href: '/admin/frequencia-diaria' },
              { icon: AlertTriangle, label: 'Infrequência', href: '/admin/infrequencia' },
              { icon: LayoutList, label: 'Painel da Turma', href: '/admin/painel-turma' },
            ]
          },
          {
            icon: ScanFace, label: 'Reconhecimento Facial', children: [
              { icon: ScanFace, label: 'Cadastro Facial', href: '/admin/facial-enrollment' },
              { icon: Tablet, label: 'Terminal', href: '/admin/terminal-facial' },
            ]
          },
          {
            icon: FileSpreadsheet, label: 'Avaliações Escolares', children: [
              { icon: FileText, label: 'Lançar Notas', href: '/admin/notas-escolares' },
              { icon: RotateCcw, label: 'Recuperação', href: '/admin/recuperacao' },
            ]
          },
          {
            icon: ClipboardList, label: 'Pedagógico', children: [
              { icon: Users, label: 'Conselho de Classe', href: '/admin/conselho-classe' },
              { icon: FileText, label: 'Histórico Escolar', href: '/admin/historico-escolar' },
              { icon: Printer, label: 'Relatórios PDF', href: '/admin/relatorios-pdf' },
            ]
          },
          {
            icon: Settings, label: 'Configurações', children: [
              { icon: GraduationCap, label: 'Séries', href: '/admin/series-escolares' },
              { icon: BookOpen, label: 'Disciplinas', href: '/admin/disciplinas' },
              { icon: Settings, label: 'Períodos Letivos', href: '/admin/gestor-escolar' },
              { icon: CalendarClock, label: 'Horários de Aula', href: '/admin/horarios-aula' },
            ]
          },
        )
      }
      items.push({ icon: Bell, label: 'Notificações', href: '/admin/notificacoes' })
    }

    // Menu para PROFESSOR
    if (tipoUsuarioReal === 'professor') {
      items.push(
        { icon: LayoutGrid, label: 'Dashboard', href: '/professor/dashboard' },
        { icon: Users, label: 'Minhas Turmas', href: '/professor/turmas' },
        {
          icon: CalendarCheck, label: 'Frequência', children: [
            { icon: CalendarCheck, label: 'Lançar Frequência', href: '/professor/frequencia' },
          ]
        },
        {
          icon: FileSpreadsheet, label: 'Notas', children: [
            { icon: FileText, label: 'Lançar Notas', href: '/professor/notas' },
          ]
        },
      )
    }

    return items
  }

  const menuItems = getMenuItems()

  // Verifica se algum filho do grupo está ativo
  const isGroupActive = (item: MenuItem): boolean => {
    if (!item.children) return false
    return item.children.some(child => child.href ? isMenuItemActive(child.href) : false)
  }

  // Verifica se o grupo está expandido (manual ou auto pelo filho ativo)
  const isGroupExpanded = (label: string, item: MenuItem): boolean => {
    if (gruposExpandidos[label] !== undefined) return gruposExpandidos[label]
    return isGroupActive(item)
  }

  const toggleGrupo = (label: string) => {
    setGruposExpandidos(prev => ({ ...prev, [label]: !prev[label] }))
  }

  // Obter contexto do usuário (polo ou escola)
  const getContextoUsuario = () => {
    if (tipoUsuarioReal === 'polo' && usuario?.polo_nome) {
      return usuario.polo_nome
    }
    if (tipoUsuarioReal === 'escola' && usuario?.escola_nome) {
      return usuario.escola_nome
    }
    return null
  }

  const badgeConfig = getBadgeConfig(tipoUsuarioReal)
  const contextoUsuario = getContextoUsuario()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col transition-colors duration-300">
      {/* Header - Fixo no topo com gradiente sutil (oculto na impressão) */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-white via-white to-gray-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 shadow-md dark:shadow-slate-700/50 border-b border-gray-200 dark:border-slate-700 flex-shrink-0 transition-colors duration-300 print:hidden">
        <div className="px-2 sm:px-4 md:px-6 lg:px-8">
          {/* Linha superior: Logo, Nome do Sistema, Data */}
          <div className="flex justify-between items-center h-14 sm:h-16 lg:h-[72px]">
            {/* Seção esquerda: Menu mobile/desktop + Logo + Nome */}
            <div className="flex items-center min-w-0 gap-2 sm:gap-3">
              {/* Botão menu mobile */}
              <button
                onClick={() => setMenuAberto(!menuAberto)}
                className="lg:hidden p-1.5 sm:p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 flex-shrink-0 transition-all duration-200"
                aria-label="Menu"
              >
                {menuAberto ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>

              {/* Botão toggle menu desktop (gaveta) */}
              <button
                onClick={() => setMenuDesktopOculto(!menuDesktopOculto)}
                className="hidden lg:flex p-1.5 sm:p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 flex-shrink-0 transition-all duration-200"
                aria-label={menuDesktopOculto ? "Abrir menu" : "Fechar menu"}
                title={menuDesktopOculto ? "Abrir menu lateral" : "Fechar menu lateral"}
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Logo do Sistema - Usa logo estática para evitar problemas com banco de dados */}
              <div className="flex-shrink-0 hidden sm:block">
                <img
                  src="/logo.png"
                  alt="Logo do Sistema"
                  className="h-8 sm:h-9 lg:h-10 w-auto object-contain rounded"
                />
              </div>

              {/* Nome do Sistema */}
              <div className="flex flex-col min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-white truncate">
                  {personalizacao.nome_sistema || 'Educatec'}
                </h1>
                <span className="hidden lg:block text-xs text-gray-500 dark:text-gray-400 truncate">
                  Sistema de Avaliação Municipal
                </span>
              </div>

              {/* Separador visual */}
              <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-slate-600 mx-2" />

              {/* Botão de troca de módulo - oculto para polo e escola sem gestor habilitado */}
              {tipoUsuarioReal !== 'polo' && tipoUsuarioReal !== 'professor' && !(tipoUsuarioReal === 'escola' && !usuario?.gestor_escolar_habilitado) && (
                <button
                  onClick={() => {
                    const novo = moduloAtivo === 'educatec' ? 'gestor' as offlineStorage.ModuloAtivo : 'educatec' as offlineStorage.ModuloAtivo
                    offlineStorage.saveModuloAtivo(novo)
                    setModuloAtivo(novo)
                    if (novo === 'gestor') router.push('/admin/dashboard-gestor')
                    else router.push(`/${basePath}/dashboard`)
                  }}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-all duration-200 ${
                    moduloAtivo === 'educatec'
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200'
                      : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                  }`}
                  title={`Módulo ativo: ${moduloAtivo === 'educatec' ? 'Educatec' : 'Gestor Escolar'}. Clique para alternar.`}
                >
                  {moduloAtivo === 'educatec' ? <Database className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                  <span>{moduloAtivo === 'educatec' ? 'Educatec' : 'Gestor'}</span>
                  <ArrowLeftRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 opacity-50" />
                </button>
              )}

              {/* Badge do tipo de usuário */}
              <div className="hidden md:flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeConfig.bgColor} ${badgeConfig.textColor}`}>
                  {badgeConfig.label}
                </span>
                {/* Contexto do usuário (polo/escola) */}
                {contextoUsuario && (
                  <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[120px] sm:max-w-[150px] md:max-w-[180px] lg:max-w-[200px]" title={contextoUsuario}>
                    {contextoUsuario}
                  </span>
                )}
              </div>
            </div>

            {/* Seção central: Data (apenas desktop) */}
            <div className="hidden xl:flex items-center justify-center">
              <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {dataAtual}
              </span>
            </div>

            {/* Seção direita: Status + Usuário + Ações */}
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              {/* Indicadores de status */}
              <div className="flex items-center gap-1">
                {/* Indicador de modo offline */}
                {modoOffline && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium animate-pulse">
                    <WifiOff className="w-3 h-3" />
                    <span className="hidden sm:inline">Offline</span>
                  </span>
                )}

                {/* Status de sincronização offline */}
                <OfflineSyncManager
                  userId={usuario?.id?.toString() || usuario?.usuario_id?.toString() || null}
                  autoSync={true}
                  showStatus={true}
                />
              </div>

              {/* Separador visual */}
              <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-slate-600 mx-1" />

              {/* Badge do tipo (mobile) */}
              <span className={`md:hidden inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${badgeConfig.bgColor} ${badgeConfig.textColor}`}>
                {badgeConfig.label.substring(0, 3)}
              </span>

              {/* Link do perfil do usuário */}
              <Link
                href="/perfil"
                className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all duration-200 group"
                title="Meu Perfil"
              >
                {usuario?.foto_url ? (
                  <img
                    src={usuario.foto_url}
                    alt="Foto do perfil"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-gray-200 dark:ring-slate-600 group-hover:ring-indigo-300 dark:group-hover:ring-indigo-500 transition-all"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center ring-2 ring-gray-200 dark:ring-slate-600 group-hover:ring-indigo-300 dark:group-hover:ring-indigo-500 transition-all">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                )}
                <div className="hidden sm:flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate max-w-[80px] md:max-w-[120px] lg:max-w-[150px]">
                    {usuario?.nome?.split(' ')[0] || 'Usuário'}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    Ver perfil
                  </span>
                </div>
              </Link>

              {/* Separador visual */}
              <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-slate-600 mx-1" />

              {/* Toggle de Tema */}
              <ThemeToggleSimple className="flex-shrink-0 p-1.5 sm:p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200" />

              {/* Botão de Logout */}
              <button
                onClick={handleLogout}
                className="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-all duration-200 flex-shrink-0"
                aria-label="Sair"
                title="Sair do sistema"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Alerta de Divergências Críticas (oculto na impressão) */}
      <div className="print:hidden">
        <AlertaDivergencias tipoUsuario={tipoUsuarioReal} />
      </div>

      {/* Espaçador para compensar o header fixo (oculto na impressão) */}
      <div className="h-14 sm:h-16 lg:h-[72px] flex-shrink-0 print:hidden" />

      <div className="flex flex-1">
        {/* Sidebar - Fixo na lateral (oculto na impressão) */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40
            w-52 sm:w-56 md:w-64 bg-white dark:bg-slate-800 shadow-lg dark:shadow-slate-900/50 border-r border-gray-200 dark:border-slate-700 transform transition-all duration-300 ease-in-out
            ${menuAberto ? 'translate-x-0' : '-translate-x-full'} ${menuDesktopOculto ? 'lg:-translate-x-full' : 'lg:translate-x-0'}
            flex-shrink-0 overflow-y-auto
            pt-14 sm:pt-16 lg:pt-[72px]
            print:hidden
          `}
        >
          <nav className="mt-4 sm:mt-6 px-2 sm:px-3 pb-4">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon

                // Item com subitens (grupo expansível)
                if (item.children) {
                  const expanded = isGroupExpanded(item.label, item)
                  const groupActive = isGroupActive(item)
                  return (
                    <li key={item.label}>
                      <button
                        onClick={() => toggleGrupo(item.label)}
                        className={`
                          w-full flex items-center px-2 sm:px-3 py-2 sm:py-2.5 text-sm rounded-lg transition-all duration-200
                          ${groupActive
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:text-indigo-600 dark:hover:text-indigo-400'
                          }
                        `}
                      >
                        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0 ${groupActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                        <span className="truncate flex-1 text-left">{item.label}</span>
                        {expanded
                          ? <ChevronDown className="w-4 h-4 flex-shrink-0 ml-1 transition-transform" />
                          : <ChevronRight className="w-4 h-4 flex-shrink-0 ml-1 transition-transform" />
                        }
                      </button>
                      {expanded && (
                        <ul className="mt-1 ml-3 sm:ml-4 pl-2 sm:pl-3 border-l-2 border-indigo-100 dark:border-indigo-800/50 space-y-0.5">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon
                            const childActive = child.href ? isMenuItemActive(child.href) : false
                            return (
                              <li key={child.href || child.label}>
                                <Link
                                  href={child.href || '#'}
                                  className={`
                                    flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-sm rounded-lg transition-all duration-200
                                    ${childActive
                                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 font-medium'
                                      : 'text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:text-indigo-600 dark:hover:text-indigo-400'
                                    }
                                  `}
                                  onClick={() => {
                                    setMenuAberto(false)
                                    setMenuDesktopOculto(true)
                                  }}
                                >
                                  <ChildIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 sm:mr-2.5 flex-shrink-0 ${childActive ? 'text-white' : ''}`} />
                                  <span className="truncate">{child.label}</span>
                                  {childActive && (
                                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                  )}
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </li>
                  )
                }

                // Item simples (sem filhos)
                const isActive = item.href ? isMenuItemActive(item.href) : false
                return (
                  <li key={item.href || item.label}>
                    <Link
                      href={item.href || '#'}
                      className={`
                        flex items-center px-2 sm:px-3 py-2 sm:py-2.5 text-sm rounded-lg transition-all duration-200
                        ${isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 font-medium'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:text-indigo-600 dark:hover:text-indigo-400'
                        }
                      `}
                      onClick={() => {
                        setMenuAberto(false)
                        setMenuDesktopOculto(true)
                      }}
                    >
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
                      <span className="truncate">{item.label}</span>
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        {/* Overlay para mobile e tablet - z-30 para ficar abaixo do sidebar (z-40) (oculto na impressão) */}
        {menuAberto && (
          <div
            className="fixed inset-0 bg-black/50 dark:bg-black/70 z-30 lg:hidden print:hidden"
            onClick={() => setMenuAberto(false)}
          />
        )}

        {/* Overlay para desktop quando menu está visível (oculto na impressão) */}
        {!menuDesktopOculto && (
          <div
            className="hidden lg:block fixed inset-0 bg-black/30 dark:bg-black/50 z-30 print:hidden"
            onClick={() => setMenuDesktopOculto(true)}
          />
        )}

        {/* Main Content - Sem margem, menu funciona como drawer sobrepondo */}
        <main className="flex-1 p-2 sm:p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-slate-900 print:p-0 print:bg-white">
          {children}
        </main>
      </div>

      {/* Rodape - Sem margem (oculto na impressão) */}
      <div className="print:hidden">
        <Rodape />
      </div>
    </div>
  )
}
