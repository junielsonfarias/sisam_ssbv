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
  Baby,
  CalendarDays,
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
          { icon: Database, label: 'Painel de Dados', href: '/admin/sisam/dados' },
          { icon: TrendingUp, label: 'Análise Gráfica', href: '/admin/sisam/graficos' },
          { icon: FileBarChart, label: 'Relatórios', href: '/admin/sisam/relatorios' },
        ]
      },
      {
        icon: FileText, label: 'Resultados', children: [
          { icon: FileText, label: 'Resultados Consolidados', href: '/admin/sisam/resultados' },
          { icon: BarChart3, label: 'Comparativos Escolas', href: '/admin/sisam/comparativos' },
          { icon: MapPin, label: 'Comparativo Polos', href: '/admin/sisam/comparativos-polos' },
          { icon: BarChart3, label: 'SISAM x Escola', href: '/admin/sisam/comparativo-notas' },
          { icon: TrendingUp, label: 'Evolução', href: '/admin/sisam/evolucao' },
          { icon: School, label: 'Evolução Escolas', href: '/admin/sisam/evolucao-escolas' },
        ]
      },
      {
        icon: ClipboardList, label: 'Avaliações', children: [
          { icon: ClipboardList, label: 'Avaliações SISAM', href: '/admin/sisam/avaliacoes' },
          { icon: FileCheck, label: 'Questões', href: '/admin/sisam/questoes' },
          { icon: FileScan, label: 'Cartão-Resposta', href: '/admin/sisam/cartao-resposta' },
        ]
      },
      {
        icon: Upload, label: 'Importação', children: [
          { icon: Upload, label: 'Importar Dados', href: '/admin/sisam/importar-completo' },
          { icon: UserPlus, label: 'Importar Cadastros', href: '/admin/sisam/importar-cadastros' },
          { icon: FilePlus, label: 'Importar Resultados', href: '/admin/sisam/importar-resultados' },
          { icon: History, label: 'Histórico', href: '/admin/sisam/importacoes' },
        ]
      },
      { icon: Target, label: 'Indicadores e Metas', href: '/admin/sisam/metas' },
    )

    if (tipo === 'admin' || tipo === 'administrador') {
      base.push({
        icon: Settings, label: 'Configurações SISAM', children: [
          { icon: Settings, label: 'Séries SISAM', href: '/admin/sisam/configuracao-series' },
          { icon: Settings, label: 'Módulos Técnico', href: '/admin/sisam/modulos-tecnico' },
        ]
      })
    }
  } else if (tipo === 'polo') {
    base.push(
      {
        icon: Database, label: 'Análises', children: [
          { icon: Database, label: 'Painel de Dados', href: '/admin/sisam/dados' },
          { icon: TrendingUp, label: 'Análise Gráfica', href: '/polo/graficos' },
        ]
      },
      {
        icon: FileText, label: 'Resultados', children: [
          { icon: FileText, label: 'Resultados Consolidados', href: '/polo/analise' },
          { icon: BarChart3, label: 'Comparativo Escolas', href: '/admin/sisam/comparativos' },
        ]
      },
      {
        icon: GraduationCap, label: 'Professores', children: [
          { icon: ArrowLeftRight, label: 'Turmas e Professores', href: '/admin/gestor/professor-turmas' },
        ]
      },
      {
        icon: Users, label: 'Responsáveis', children: [
          { icon: Users, label: 'Aprovar vínculos', href: '/admin/gestor/responsaveis' },
        ]
      },
    )
  } else if (tipo === 'escola') {
    base.push(
      {
        icon: Database, label: 'Análises', children: [
          { icon: Database, label: 'Painel de Dados', href: '/admin/sisam/dados' },
        ]
      },
      {
        icon: FileText, label: 'Resultados', children: [
          { icon: FileText, label: 'Resultados Consolidados', href: '/escola/resultados' },
          { icon: BarChart3, label: 'SISAM x Escola', href: '/admin/sisam/comparativo-notas' },
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
          { icon: School, label: 'Escolas', href: '/admin/gestor/escolas' },
          { icon: MapPin, label: 'Polos', href: '/admin/gestor/polos' },
          { icon: GraduationCap, label: 'Alunos', href: '/admin/gestor/alunos' },
          { icon: Users, label: 'Turmas', href: '/admin/gestor/turmas' },
        ]
      },
      {
        icon: UserPlus, label: 'Matrículas e Vagas', children: [
          { icon: UserPlus, label: 'Matrículas', href: '/admin/gestor/matriculas' },
          { icon: UserPlus, label: 'Pré-Matrículas', href: '/admin/gestor/pre-matriculas' },
          { icon: ArrowLeftRight, label: 'Transferências', href: '/admin/gestor/transferencias' },
          { icon: DoorOpen, label: 'Controle de Vagas', href: '/admin/gestor/controle-vagas' },
          { icon: Clock, label: 'Fila de Espera', href: '/admin/gestor/fila-espera' },
        ]
      },
      {
        icon: CalendarCheck, label: 'Frequência', children: [
          { icon: CalendarCheck, label: 'Frequência Bimestral', href: '/admin/gestor/frequencia' },
          { icon: Scan, label: 'Frequência Diária', href: '/admin/gestor/frequencia-diaria' },
          { icon: AlertTriangle, label: 'Infrequência', href: '/admin/gestor/infrequencia' },
          { icon: LayoutList, label: 'Painel da Turma', href: '/admin/gestor/painel-turma' },
        ]
      },
      {
        icon: ScanFace, label: 'Reconhecimento Facial', children: [
          { icon: Monitor, label: 'Dispositivos', href: '/admin/gestor/dispositivos-faciais' },
          { icon: ScanFace, label: 'Cadastro Facial', href: '/admin/gestor/facial-enrollment' },
          { icon: Tablet, label: 'Terminal', href: '/admin/gestor/terminal-facial' },
        ]
      },
      {
        icon: FileSpreadsheet, label: 'Avaliações Escolares', children: [
          { icon: FileText, label: 'Lançar Notas', href: '/admin/gestor/notas-escolares' },
          { icon: RotateCcw, label: 'Recuperação', href: '/admin/gestor/recuperacao' },
          { icon: ClipboardList, label: 'Regras de Avaliação', href: '/admin/gestor/regras-avaliacao' },
          { icon: Lock, label: 'Fechamento de Ano', href: '/admin/gestor/fechamento-ano' },
        ]
      },
      {
        icon: ClipboardList, label: 'Pedagógico', children: [
          { icon: Users, label: 'Conselho de Classe', href: '/admin/gestor/conselho-classe' },
          { icon: FileText, label: 'Histórico Escolar', href: '/admin/gestor/historico-escolar' },
          { icon: FileText, label: 'Avaliações Descritivas', href: '/admin/gestor/avaliacoes-descritivas' },
          { icon: Printer, label: 'Relatórios PDF', href: '/admin/gestor/relatorios-pdf' },
          { icon: AlertTriangle, label: 'Divergências', href: '/admin/gestor/divergencias' },
        ]
      },
      {
        icon: GraduationCap, label: 'Professores', children: [
          { icon: Users, label: 'Gerenciar Professores', href: '/admin/gestor/professores' },
          { icon: ArrowLeftRight, label: 'Vincular Turmas', href: '/admin/gestor/professor-turmas' },
        ]
      },
      {
        icon: Users, label: 'Responsáveis', children: [
          { icon: Users, label: 'Aprovar vínculos', href: '/admin/gestor/responsaveis' },
        ]
      },
      {
        icon: Settings, label: 'Configurações', children: [
          { icon: CalendarCheck, label: 'Anos Letivos', href: '/admin/gestor/anos-letivos' },
          { icon: GraduationCap, label: 'Séries', href: '/admin/gestor/series-escolares' },
          { icon: BookOpen, label: 'Disciplinas', href: '/admin/gestor/disciplinas' },
          { icon: CalendarClock, label: 'Horários de Aula', href: '/admin/gestor/horarios-aula' },
          { icon: Calendar, label: 'Calendário Escolar', href: '/admin/gestor/calendario-escolar' },
          { icon: CalendarDays, label: 'Calendário · Eventos', href: '/admin/gestor/calendario-eventos' },
        ]
      },
    )
  } else if (tipo === 'escola') {
    base.push(
      {
        icon: BookOpen, label: 'Cadastros', children: [
          { icon: GraduationCap, label: 'Alunos', href: '/escola/alunos' },
          { icon: UserPlus, label: 'Matrículas', href: '/escola/matriculas' },
          { icon: ArrowLeftRight, label: 'Transferências', href: '/admin/gestor/transferencias' },
          { icon: DoorOpen, label: 'Controle de Vagas', href: '/admin/gestor/controle-vagas' },
          { icon: Clock, label: 'Fila de Espera', href: '/admin/gestor/fila-espera' },
        ]
      },
      {
        icon: CalendarCheck, label: 'Frequência', children: [
          { icon: CalendarCheck, label: 'Frequência Bimestral', href: '/admin/gestor/frequencia' },
          { icon: Scan, label: 'Frequência Diária', href: '/admin/gestor/frequencia-diaria' },
          { icon: AlertTriangle, label: 'Infrequência', href: '/admin/gestor/infrequencia' },
          { icon: LayoutList, label: 'Painel da Turma', href: '/admin/gestor/painel-turma' },
        ]
      },
      {
        icon: ScanFace, label: 'Reconhecimento Facial', children: [
          { icon: ScanFace, label: 'Cadastro Facial', href: '/admin/gestor/facial-enrollment' },
          { icon: Tablet, label: 'Terminal', href: '/admin/gestor/terminal-facial' },
        ]
      },
      {
        icon: FileSpreadsheet, label: 'Avaliações Escolares', children: [
          { icon: FileText, label: 'Lançar Notas', href: '/admin/gestor/notas-escolares' },
          { icon: RotateCcw, label: 'Recuperação', href: '/admin/gestor/recuperacao' },
        ]
      },
      {
        icon: ClipboardList, label: 'Pedagógico', children: [
          { icon: Users, label: 'Conselho de Classe', href: '/admin/gestor/conselho-classe' },
          { icon: FileText, label: 'Histórico Escolar', href: '/admin/gestor/historico-escolar' },
          { icon: Printer, label: 'Relatórios PDF', href: '/admin/gestor/relatorios-pdf' },
        ]
      },
      {
        icon: GraduationCap, label: 'Professores', children: [
          { icon: ArrowLeftRight, label: 'Turmas e Professores', href: '/admin/gestor/professor-turmas' },
        ]
      },
      {
        icon: Users, label: 'Responsáveis', children: [
          { icon: Users, label: 'Aprovar vínculos', href: '/admin/gestor/responsaveis' },
        ]
      },
      {
        icon: Settings, label: 'Configurações', children: [
          { icon: GraduationCap, label: 'Séries', href: '/admin/gestor/series-escolares' },
          { icon: BookOpen, label: 'Disciplinas', href: '/admin/gestor/disciplinas' },
          { icon: CalendarClock, label: 'Horários de Aula', href: '/admin/gestor/horarios-aula' },
          { icon: Calendar, label: 'Calendário Escolar', href: '/admin/gestor/calendario-escolar' },
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
        { icon: AlertTriangle, label: 'FICAI / Busca Ativa', href: '/admin/semed/ficai' },
        { icon: Accessibility, label: 'AEE / Inclusão', href: '/admin/semed/aee' },
      ]
    }]
  }

  // Escola: SEMED operacional restrito
  if (tipo === 'escola') {
    return [{
      icon: Building2, label: 'SEMED — Operacional', children: [
        { icon: AlertTriangle, label: 'FICAI / Busca Ativa', href: '/admin/semed/ficai' },
        { icon: Accessibility, label: 'AEE / Inclusão', href: '/admin/semed/aee' },
        { icon: UtensilsCrossed, label: 'PNAE / Alimentação', href: '/admin/semed/pnae' },
        { icon: BookMarked, label: 'PNLD / Livros didáticos', href: '/admin/semed/pnld' },
        { icon: Boxes, label: 'Patrimônio', href: '/admin/semed/patrimonio' },
        { icon: Library, label: 'Biblioteca', href: '/admin/semed/biblioteca' },
        { icon: Wrench, label: 'Ordens de Serviço', href: '/admin/semed/ordens-servico' },
      ]
    }]
  }

  // Admin/Técnico: 3 sub-grupos completos
  return [
    {
      icon: AlertTriangle, label: 'Acompanhamento Estudantil', children: [
        { icon: AlertTriangle, label: 'FICAI / Busca Ativa', href: '/admin/semed/ficai' },
        { icon: Accessibility, label: 'AEE / Inclusão', href: '/admin/semed/aee' },
        { icon: Baby, label: 'Educação Infantil', href: '/admin/semed/ed-infantil' },
        { icon: Activity, label: 'Analytics Preditiva', href: '/admin/semed/analytics-preditiva' },
        { icon: ClipboardList, label: 'Censo Escolar (INEP)', href: '/admin/semed/censo-escolar' },
        { icon: FileCheck, label: 'Documentos Emitidos', href: '/admin/semed/documentos' },
      ]
    },
    {
      icon: Building2, label: 'Programas Federais', children: [
        { icon: UtensilsCrossed, label: 'PNAE / Alimentação', href: '/admin/semed/pnae' },
        { icon: Bus, label: 'PNATE / Transporte', href: '/admin/semed/pnate' },
        { icon: BookMarked, label: 'PNLD / Livros didáticos', href: '/admin/semed/pnld' },
        { icon: DollarSign, label: 'PDDE / Financeiro', href: '/admin/semed/pdde' },
        { icon: Heart, label: 'Bolsa Família', href: '/admin/semed/bolsa-familia' },
      ]
    },
    {
      icon: Briefcase, label: 'Recursos & Operação', children: [
        { icon: Briefcase, label: 'RH Escolar', href: '/admin/semed/rh' },
        { icon: Boxes, label: 'Patrimônio', href: '/admin/semed/patrimonio' },
        { icon: Library, label: 'Biblioteca', href: '/admin/semed/biblioteca' },
        { icon: Wrench, label: 'Ordens de Serviço', href: '/admin/semed/ordens-servico' },
      ]
    },
  ]
}

function gruposTransparencia(): MenuItem[] {
  return [
    { icon: Globe, label: 'Site Institucional', href: '/admin/transparencia/site-institucional' },
    { icon: LayoutGrid, label: 'Notícias', href: '/editor/noticias' },
    { icon: FileText, label: 'Publicações', href: '/publicador/publicacoes' },
    { icon: MessageCircle, label: 'Ouvidoria', href: '/admin/transparencia/ouvidoria' },
    { icon: Calendar, label: 'Eventos', href: '/admin/transparencia/eventos' },
    { icon: Building2, label: 'Relatórios Conselhos', href: '/admin/transparencia/relatorios-conselhos' },
  ]
}

function gruposAdministracao(): MenuItem[] {
  return [
    { icon: Users, label: 'Usuários', href: '/admin/admin/usuarios' },
    { icon: Bell, label: 'Notificações', href: '/admin/admin/notificacoes' },
    { icon: ShieldCheck, label: 'Segurança', href: '/admin/admin/seguranca' },
    { icon: Shield, label: 'LGPD / Solicitações', href: '/admin/admin/lgpd' },
    { icon: Shield, label: 'Auditoria', href: '/admin/admin/auditoria' },
    { icon: Activity, label: 'Logs de Acesso', href: '/admin/admin/logs-acesso' },
    { icon: HardDrive, label: 'Backup', href: '/admin/admin/backup' },
    { icon: HeartPulse, label: 'Monitoramento', href: '/admin/admin/monitoramento' },
    { icon: Activity, label: 'Status Page / Incidentes', href: '/admin/admin/status-page' },
    { icon: Settings, label: 'Personalização', href: '/admin/admin/personalizacao' },
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
    items.push({ icon: LayoutGrid, label: 'Dashboard', href: '/admin/gestor/dashboard' })
  } else if (mod === 'semed') {
    items.push({ icon: LayoutGrid, label: 'Dashboard', href: '/admin/semed/dashboard' })
  } else if (mod === 'admin') {
    items.push({ icon: LayoutGrid, label: 'Dashboard', href: '/admin/sisam/dashboard' })
  } else {
    // sisam ou transparencia ou outros — usa rota por papel.
    // Para admin, o dashboard do SISAM agora é namespaced em /admin/sisam/dashboard;
    // demais papéis (escola/polo/tecnico) mantêm sua própria página de dashboard.
    const dashboardHref = basePath === 'admin' ? '/admin/sisam/dashboard' : `/${basePath}/dashboard`
    items.push({ icon: LayoutGrid, label: 'Dashboard', href: dashboardHref })
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
    items.push({ icon: Bell, label: 'Notificações', href: '/admin/admin/notificacoes' })
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
      { icon: Calendar, label: 'Eventos', href: '/admin/transparencia/eventos' },
    ]
  }

  if (tipo === 'publicador') {
    return [
      { icon: FileText, label: 'Publicações', href: '/publicador/publicacoes' },
      { icon: Calendar, label: 'Eventos', href: '/admin/transparencia/eventos' },
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
