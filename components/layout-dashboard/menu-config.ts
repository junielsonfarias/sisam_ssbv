import {
  LayoutGrid,
  Users,
  School,
  MapPin,
  FileText,
  BarChart3,
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
  Activity,
  FileBarChart,
  AlertTriangle,
  ClipboardList,
  BookOpen,
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
  Clock,
  LayoutList,
  Globe,
  FileSpreadsheet,
  Lock,
  Search,
  Shield,
  Target,
  Building2,
  MessageSquare,
  MessageCircle,
  Calendar,
  HardDrive,
  HeartPulse,
  Smartphone,
  ShieldCheck,
  Accessibility,
  UtensilsCrossed,
  Briefcase,
  Bus,
  DollarSign,
  Boxes,
  Library,
  Wrench,
  BookMarked,
  Heart,
} from 'lucide-react'
import type { MenuItem } from './types'
import type { ModuloAtivo } from '@/lib/offline-storage'

interface GetMenuItemsParams {
  tipoUsuarioReal: string
  moduloAtivo: ModuloAtivo
  basePath: string
  usuario: any
}

// ============================================================================
// HELPERS — grupos reutilizáveis (uma função por aba do menu, por módulo)
// ============================================================================

function gruposSisam(tipo: string): MenuItem[] {
  // Subset por tipo: admin/tecnico veem tudo; polo/escola veem subset reduzido
  const base: MenuItem[] = []

  if (['admin', 'administrador', 'tecnico'].includes(tipo)) {
    base.push(
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
          { icon: BarChart3, label: 'SISAM x Escola', href: '/admin/comparativo-notas' },
          { icon: TrendingUp, label: 'Evolução', href: '/admin/evolucao' },
          { icon: School, label: 'Evolução Escolas', href: '/admin/evolucao-escolas' },
        ]
      },
      {
        icon: ClipboardList, label: 'Avaliações', children: [
          { icon: ClipboardList, label: 'Avaliações SISAM', href: '/admin/avaliacoes' },
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
      { icon: Target, label: 'Indicadores e Metas', href: '/admin/metas' },
    )

    if (tipo === 'admin' || tipo === 'administrador') {
      base.push({
        icon: Settings, label: 'Configurações SISAM', children: [
          { icon: Settings, label: 'Séries SISAM', href: '/admin/configuracao-series' },
          { icon: Settings, label: 'Módulos Técnico', href: '/admin/modulos-tecnico' },
        ]
      })
    }
  } else if (tipo === 'polo') {
    base.push(
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
    )
  } else if (tipo === 'escola') {
    base.push(
      {
        icon: Database, label: 'Análises', children: [
          { icon: Database, label: 'Painel de Dados', href: '/admin/dados' },
        ]
      },
      {
        icon: FileText, label: 'Resultados', children: [
          { icon: FileText, label: 'Resultados Consolidados', href: '/escola/resultados' },
          { icon: BarChart3, label: 'SISAM x Escola', href: '/admin/comparativo-notas' },
        ]
      },
    )
  }

  return base
}

function gruposGestor(tipo: string): MenuItem[] {
  const base: MenuItem[] = []

  if (['admin', 'administrador', 'tecnico'].includes(tipo)) {
    base.push(
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
          { icon: UserPlus, label: 'Pré-Matrículas', href: '/admin/pre-matriculas' },
          { icon: ArrowLeftRight, label: 'Transferências', href: '/admin/transferencias' },
          { icon: DoorOpen, label: 'Controle de Vagas', href: '/admin/controle-vagas' },
          { icon: Clock, label: 'Fila de Espera', href: '/admin/fila-espera' },
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
          { icon: CalendarClock, label: 'Horários de Aula', href: '/admin/horarios-aula' },
          { icon: Calendar, label: 'Calendário Escolar', href: '/admin/calendario-escolar' },
        ]
      },
    )
  } else if (tipo === 'escola') {
    base.push(
      {
        icon: BookOpen, label: 'Cadastros', children: [
          { icon: GraduationCap, label: 'Alunos', href: '/escola/alunos' },
          { icon: UserPlus, label: 'Matrículas', href: '/escola/matriculas' },
          { icon: ArrowLeftRight, label: 'Transferências', href: '/admin/transferencias' },
          { icon: DoorOpen, label: 'Controle de Vagas', href: '/admin/controle-vagas' },
          { icon: Clock, label: 'Fila de Espera', href: '/admin/fila-espera' },
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
          { icon: CalendarClock, label: 'Horários de Aula', href: '/admin/horarios-aula' },
          { icon: Calendar, label: 'Calendário Escolar', href: '/admin/calendario-escolar' },
        ]
      },
    )
  }

  return base
}

function gruposSemed(tipo: string): MenuItem[] {
  // Polo: visão consolidada FICAI/AEE
  if (tipo === 'polo') {
    return [{
      icon: AlertTriangle, label: 'Acompanhamento Estudantil', children: [
        { icon: AlertTriangle, label: 'FICAI / Busca Ativa', href: '/admin/ficai' },
        { icon: Accessibility, label: 'AEE / Inclusão', href: '/admin/aee' },
      ]
    }]
  }

  // Escola: SEMED operacional restrito
  if (tipo === 'escola') {
    return [{
      icon: Building2, label: 'SEMED — Operacional', children: [
        { icon: AlertTriangle, label: 'FICAI / Busca Ativa', href: '/admin/ficai' },
        { icon: Accessibility, label: 'AEE / Inclusão', href: '/admin/aee' },
        { icon: UtensilsCrossed, label: 'PNAE / Alimentação', href: '/admin/pnae' },
        { icon: BookMarked, label: 'PNLD / Livros didáticos', href: '/admin/pnld' },
        { icon: Boxes, label: 'Patrimônio', href: '/admin/patrimonio' },
        { icon: Library, label: 'Biblioteca', href: '/admin/biblioteca' },
        { icon: Wrench, label: 'Ordens de Serviço', href: '/admin/ordens-servico' },
      ]
    }]
  }

  // Admin/Técnico: 3 sub-grupos completos
  return [
    {
      icon: AlertTriangle, label: 'Acompanhamento Estudantil', children: [
        { icon: AlertTriangle, label: 'FICAI / Busca Ativa', href: '/admin/ficai' },
        { icon: Accessibility, label: 'AEE / Inclusão', href: '/admin/aee' },
      ]
    },
    {
      icon: Building2, label: 'Programas Federais', children: [
        { icon: UtensilsCrossed, label: 'PNAE / Alimentação', href: '/admin/pnae' },
        { icon: Bus, label: 'PNATE / Transporte', href: '/admin/pnate' },
        { icon: BookMarked, label: 'PNLD / Livros didáticos', href: '/admin/pnld' },
        { icon: DollarSign, label: 'PDDE / Financeiro', href: '/admin/pdde' },
        { icon: Heart, label: 'Bolsa Família', href: '/admin/bolsa-familia' },
      ]
    },
    {
      icon: Briefcase, label: 'Recursos & Operação', children: [
        { icon: Briefcase, label: 'RH Escolar', href: '/admin/rh' },
        { icon: Boxes, label: 'Patrimônio', href: '/admin/patrimonio' },
        { icon: Library, label: 'Biblioteca', href: '/admin/biblioteca' },
        { icon: Wrench, label: 'Ordens de Serviço', href: '/admin/ordens-servico' },
      ]
    },
  ]
}

function gruposTransparencia(): MenuItem[] {
  return [
    { icon: Globe, label: 'Site Institucional', href: '/admin/site-institucional' },
    { icon: LayoutGrid, label: 'Notícias', href: '/editor/noticias' },
    { icon: FileText, label: 'Publicações', href: '/publicador/publicacoes' },
    { icon: MessageCircle, label: 'Ouvidoria', href: '/admin/ouvidoria' },
    { icon: Calendar, label: 'Eventos', href: '/admin/eventos' },
    { icon: Building2, label: 'Relatórios Conselhos', href: '/admin/relatorios-conselhos' },
  ]
}

function gruposAdministracao(): MenuItem[] {
  return [
    { icon: Users, label: 'Usuários', href: '/admin/usuarios' },
    { icon: Bell, label: 'Notificações', href: '/admin/notificacoes' },
    { icon: ShieldCheck, label: 'Segurança', href: '/admin/seguranca' },
    { icon: Shield, label: 'LGPD / Solicitações', href: '/admin/lgpd' },
    { icon: Shield, label: 'Auditoria', href: '/admin/auditoria' },
    { icon: Activity, label: 'Logs de Acesso', href: '/admin/logs-acesso' },
    { icon: HardDrive, label: 'Backup', href: '/admin/backup' },
    { icon: HeartPulse, label: 'Monitoramento', href: '/admin/monitoramento' },
    { icon: Activity, label: 'Status Page / Incidentes', href: '/admin/status-page' },
    { icon: Settings, label: 'Personalização', href: '/admin/personalizacao' },
    { icon: Smartphone, label: 'Baixar App', href: '/app-download' },
  ]
}

// ============================================================================
// MAIN
// ============================================================================

export function getMenuItems({ tipoUsuarioReal, moduloAtivo, basePath, usuario }: GetMenuItemsParams): MenuItem[] {
  const items: MenuItem[] = []
  // Normaliza 'educatec' (legado) para 'sisam'
  const mod: ModuloAtivo = moduloAtivo === 'educatec' ? 'sisam' : moduloAtivo
  const tipo = tipoUsuarioReal

  // Portais separados — Professor, Editor, Publicador, Responsável têm menus próprios
  // (sem seleção de módulo). Tratados ao final.

  // Dashboard sempre primeiro
  if (mod === 'gestor') {
    items.push({ icon: LayoutGrid, label: 'Dashboard', href: '/admin/dashboard-gestor' })
  } else if (mod === 'semed') {
    items.push({ icon: LayoutGrid, label: 'Dashboard', href: '/admin/dashboard-semed' })
  } else if (mod === 'admin') {
    items.push({ icon: LayoutGrid, label: 'Dashboard', href: '/admin/dashboard' })
  } else {
    // sisam ou transparencia ou outros — usa rota por papel
    items.push({ icon: LayoutGrid, label: 'Dashboard', href: `/${basePath}/dashboard` })
  }

  // Pesquisar Aluno — disponível para perfis com acesso a dados de alunos
  if (['admin', 'administrador', 'tecnico', 'polo', 'escola'].includes(tipo)) {
    if (mod === 'gestor' || mod === 'sisam' || mod === 'semed') {
      items.push({ icon: Search, label: 'Pesquisar Aluno', href: '/admin/gestor-escolar' })
    }
  }

  // Painel Executivo — admin/tecnico em SISAM ou Gestor
  if (['admin', 'administrador', 'tecnico'].includes(tipo) && (mod === 'sisam' || mod === 'gestor')) {
    items.push({ icon: BarChart3, label: 'Painel Executivo', href: '/admin/executivo' })
  }

  // ==== Módulo SISAM (avaliações + análises) ====
  if (mod === 'sisam') {
    items.push(...gruposSisam(tipo))
  }

  // ==== Módulo Gestor Escolar ====
  if (mod === 'gestor') {
    // Para escola, exige flag gestor_escolar_habilitado
    if (tipo === 'escola' && !usuario?.gestor_escolar_habilitado) {
      // Sem grupos — apenas dashboard + notificações
    } else {
      items.push(...gruposGestor(tipo))
    }
  }

  // ==== Módulo SEMED ====
  if (mod === 'semed') {
    items.push(...gruposSemed(tipo))
  }

  // ==== Módulo Transparência ====
  if (mod === 'transparencia') {
    items.push(...gruposTransparencia())
  }

  // ==== Módulo Administração (apenas admin) ====
  if (mod === 'admin' && (tipo === 'admin' || tipo === 'administrador')) {
    items.push(...gruposAdministracao())
  }

  // Notificações — comum a todos perfis interativos (exceto no módulo admin onde já está)
  if (
    mod !== 'admin' &&
    ['admin', 'administrador', 'tecnico', 'escola', 'polo'].includes(tipo)
  ) {
    items.push({ icon: Bell, label: 'Notificações', href: '/admin/notificacoes' })
  }

  // ============================================================================
  // PORTAIS DEDICADOS — não usam seletor de módulo
  // ============================================================================

  if (tipo === 'professor') {
    return [
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
      { icon: BookOpen, label: 'Diário de Classe', href: '/professor/diario' },
      { icon: ClipboardList, label: 'Planejamento', href: '/professor/planos' },
      { icon: MessageSquare, label: 'Comunicados', href: '/professor/comunicados' },
      { icon: Smartphone, label: 'Baixar App', href: '/app-download' },
    ]
  }

  if (tipo === 'editor') {
    return [
      { icon: LayoutGrid, label: 'Notícias', href: '/editor/noticias' },
      { icon: Calendar, label: 'Eventos', href: '/admin/eventos' },
    ]
  }

  if (tipo === 'publicador') {
    return [
      { icon: FileText, label: 'Publicações', href: '/publicador/publicacoes' },
      { icon: Calendar, label: 'Eventos', href: '/admin/eventos' },
    ]
  }

  return items
}

export function getBadgeConfig(tipo: string) {
  const configs: Record<string, { label: string; bgColor: string; textColor: string }> = {
    admin: { label: 'Administrador', bgColor: 'bg-purple-100 dark:bg-purple-900/50', textColor: 'text-purple-700 dark:text-purple-300' },
    administrador: { label: 'Administrador', bgColor: 'bg-purple-100 dark:bg-purple-900/50', textColor: 'text-purple-700 dark:text-purple-300' },
    tecnico: { label: 'Técnico', bgColor: 'bg-blue-100 dark:bg-blue-900/50', textColor: 'text-blue-700 dark:text-blue-300' },
    polo: { label: 'Polo', bgColor: 'bg-green-100 dark:bg-green-900/50', textColor: 'text-green-700 dark:text-green-300' },
    escola: { label: 'Escola', bgColor: 'bg-orange-100 dark:bg-orange-900/50', textColor: 'text-orange-700 dark:text-orange-300' },
    professor: { label: 'Professor', bgColor: 'bg-emerald-100 dark:bg-emerald-900/50', textColor: 'text-emerald-700 dark:text-emerald-300' },
    gestor: { label: 'Gestor Escolar', bgColor: 'bg-teal-100 dark:bg-teal-900/50', textColor: 'text-teal-700 dark:text-teal-300' },
    editor: { label: 'Editor', bgColor: 'bg-pink-100 dark:bg-pink-900/50', textColor: 'text-pink-700 dark:text-pink-300' },
    publicador: { label: 'Publicador', bgColor: 'bg-indigo-100 dark:bg-indigo-900/50', textColor: 'text-indigo-700 dark:text-indigo-300' }
  }
  return configs[tipo] || { label: tipo, bgColor: 'bg-gray-100 dark:bg-gray-900/50', textColor: 'text-gray-700 dark:text-gray-300' }
}
