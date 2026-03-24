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
  LayoutList,
  Globe,
  FileSpreadsheet,
  Lock,
  Search
} from 'lucide-react'
import type { MenuItem } from './types'
import type { ModuloAtivo } from '@/lib/offline-storage'

interface GetMenuItemsParams {
  tipoUsuarioReal: string
  moduloAtivo: ModuloAtivo
  basePath: string
  usuario: any
}

export function getMenuItems({ tipoUsuarioReal, moduloAtivo, basePath, usuario }: GetMenuItemsParams): MenuItem[] {
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
            { icon: Search, label: 'Pesquisar Aluno', href: '/admin/gestor-escolar' },
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
            { icon: Search, label: 'Pesquisar Aluno', href: '/admin/gestor-escolar' },
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
          { icon: Search, label: 'Pesquisar Aluno', href: '/admin/gestor-escolar' },
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
            { icon: Search, label: 'Pesquisar Aluno', href: '/admin/gestor-escolar' },
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

  // Menu para EDITOR DE NOTÍCIAS
  if (tipoUsuarioReal === 'editor') {
    items.push(
      { icon: LayoutGrid, label: 'Notícias', href: '/editor/noticias' },
    )
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
    editor: { label: 'Editor', bgColor: 'bg-pink-100 dark:bg-pink-900/50', textColor: 'text-pink-700 dark:text-pink-300' }
  }
  return configs[tipo] || { label: tipo, bgColor: 'bg-gray-100 dark:bg-gray-900/50', textColor: 'text-gray-700 dark:text-gray-300' }
}
