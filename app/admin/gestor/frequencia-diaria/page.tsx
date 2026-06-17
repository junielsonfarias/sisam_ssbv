'use client'

import { useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Download, RefreshCw, AlertTriangle } from 'lucide-react'
import { useUserType } from '@/lib/hooks/useUserType'
import { useEscolas } from '@/lib/hooks/useEscolas'
import { useTurmas } from '@/lib/hooks/useTurmas'
import { formatarHora, formatarConfianca } from './components/helpers'
import { KpiCards } from './components/KpiCards'
import { FilterSection } from './components/FilterSection'
import { JustificativaModal } from './components/JustificativaModal'
import { AttendanceTable } from './components/AttendanceTable'

interface Resumo {
  total_alunos: number
  total_presentes: number
  total_ausentes: number
  taxa_presenca: number
}

interface RegistroFrequencia {
  id: string
  aluno_nome: string
  aluno_codigo: string
  turma_codigo: string
  hora_entrada: string | null
  hora_saida: string | null
  metodo: 'facial' | 'manual' | 'qrcode'
  confianca: number | null
  dispositivo: string | null
  status: 'presente' | 'ausente'
  justificativa: string | null
}

interface Paginacao {
  pagina: number
  limite: number
  total: number
  totalPaginas: number
}

export default function FrequenciaDiariaPage() {
  const toast = useToast()

  // Filtros
  const [escolaId, setEscolaId] = useState('')
  const [turmaId, setTurmaId] = useState('')

  // Auth via hook
  const { tipoUsuario, usuario, isEscola } = useUserType({
    onUsuarioCarregado: (u) => {
      if (u.escola_id) setEscolaId(u.escola_id)
    }
  })

  // Dados via hooks
  const { escolas } = useEscolas({ desabilitado: isEscola })
  const { turmas } = useTurmas(escolaId)

  // Reset turmaId quando escola muda
  useEffect(() => { setTurmaId('') }, [escolaId])

  // Data
  const [registros, setRegistros] = useState<RegistroFrequencia[]>([])
  const [resumo, setResumo] = useState<Resumo>({
    total_alunos: 0,
    total_presentes: 0,
    total_ausentes: 0,
    taxa_presenca: 0,
  })

  const [data, setData] = useState(() => {
    const hoje = new Date()
    return hoje.toISOString().split('T')[0]
  })
  const [metodo, setMetodo] = useState('')

  // Estado
  const [carregando, setCarregando] = useState(false)
  const [carregandoResumo, setCarregandoResumo] = useState(false)
  const [lancandoFaltas, setLancandoFaltas] = useState(false)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [justificandoId, setJustificandoId] = useState<string | null>(null)
  const [justificativaTexto, setJustificativaTexto] = useState('')
  const [paginacao, setPaginacao] = useState<Paginacao>({
    pagina: 1,
    limite: 50,
    total: 0,
    totalPaginas: 0
  })

  // Carregar resumo
  const carregarResumo = useCallback(async () => {
    setCarregandoResumo(true)
    try {
      const params = new URLSearchParams()
      params.set('data', data)
      if (escolaId) params.set('escola_id', escolaId)
      if (turmaId) params.set('turma_id', turmaId)

      const res = await fetch(`/api/admin/frequencia-diaria/resumo?${params.toString()}`)
      if (res.ok) {
        const d = await res.json()
        setResumo({
          total_alunos: d.total_alunos ?? 0,
          total_presentes: d.total_presentes ?? 0,
          total_ausentes: d.total_ausentes ?? 0,
          taxa_presenca: d.taxa_presenca ?? 0,
        })
      } else {
        setResumo({ total_alunos: 0, total_presentes: 0, total_ausentes: 0, taxa_presenca: 0 })
      }
    } catch {
      setResumo({ total_alunos: 0, total_presentes: 0, total_ausentes: 0, taxa_presenca: 0 })
    } finally {
      setCarregandoResumo(false)
    }
  }, [data, escolaId, turmaId])

  // Carregar registros
  const carregarRegistros = useCallback(async (pagina = 1) => {
    setCarregando(true)
    try {
      const params = new URLSearchParams()
      params.set('data', data)
      params.set('pagina', pagina.toString())
      params.set('limite', '50')

      if (escolaId) params.set('escola_id', escolaId)
      if (turmaId) params.set('turma_id', turmaId)
      if (metodo) params.set('metodo', metodo)

      const res = await fetch(`/api/admin/frequencia-diaria?${params.toString()}`)
      if (res.ok) {
        const d = await res.json()
        setRegistros(d.frequencias || d.registros || [])
        setPaginacao(d.paginacao || { pagina: 1, limite: 50, total: 0, totalPaginas: 0 })
      } else {
        toast.error('Erro ao carregar registros de frequencia')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setCarregando(false)
    }
  }, [data, escolaId, turmaId, metodo, toast])

  // Buscar ao clicar
  const handleBuscar = () => {
    carregarResumo()
    carregarRegistros(1)
  }

  // Excluir registro
  const handleExcluir = async (id: string, nomeAluno: string) => {
    if (!confirm(`Tem certeza que deseja excluir o registro de frequência de "${nomeAluno}"?`)) return

    setExcluindoId(id)
    try {
      const res = await fetch('/api/admin/frequencia-diaria', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        toast.success('Registro excluído com sucesso')
        carregarRegistros(paginacao.pagina)
        carregarResumo()
      } else {
        const d = await res.json().catch(() => null)
        toast.error(d?.mensagem || 'Erro ao excluir registro')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setExcluindoId(null)
    }
  }

  // Abrir justificativa
  const handleAbrirJustificativa = (reg: RegistroFrequencia) => {
    setJustificandoId(reg.id)
    setJustificativaTexto(reg.justificativa || '')
  }

  // Fechar justificativa
  const handleFecharJustificativa = () => {
    setJustificandoId(null)
    setJustificativaTexto('')
  }

  // Salvar justificativa
  const handleSalvarJustificativa = async () => {
    if (!justificandoId) return

    try {
      const res = await fetch('/api/admin/frequencia-diaria', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: justificandoId, justificativa: justificativaTexto }),
      })
      if (res.ok) {
        toast.success('Justificativa salva com sucesso')
        setRegistros(prev => prev.map(r =>
          r.id === justificandoId ? { ...r, justificativa: justificativaTexto || null } : r
        ))
        handleFecharJustificativa()
      } else {
        const d = await res.json().catch(() => null)
        toast.error(d?.mensagem || 'Erro ao salvar justificativa')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    }
  }

  // ESC para fechar modal
  useEffect(() => {
    if (!justificandoId) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleFecharJustificativa()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [justificandoId])

  // Lancar faltas
  const handleLancarFaltas = async () => {
    if (!turmaId) {
      toast.error('Selecione uma turma para lançar faltas')
      return
    }

    const turmaSelecionada = turmas.find(t => t.id === turmaId)
    const nomeTurma = turmaSelecionada ? `${turmaSelecionada.codigo}${turmaSelecionada.nome ? ` - ${turmaSelecionada.nome}` : ''}` : turmaId

    if (!confirm(`Lançar FALTA para todos os alunos da turma "${nomeTurma}" que não registraram presença em ${data}?\n\nEsta ação não pode ser desfeita automaticamente.`)) return

    setLancandoFaltas(true)
    try {
      const res = await fetch('/api/admin/frequencia-diaria/lancar-faltas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turma_id: turmaId, data }),
      })
      const d = await res.json().catch(() => null)
      if (res.ok) {
        toast.success(d?.mensagem || 'Faltas lançadas com sucesso')
        carregarRegistros(1)
        carregarResumo()
      } else {
        toast.error(d?.mensagem || 'Erro ao lançar faltas')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setLancandoFaltas(false)
    }
  }

  // Exportar CSV
  const handleExportarCSV = () => {
    if (registros.length === 0) {
      toast.error('Nenhum registro para exportar')
      return
    }

    const headers = ['Nome do Aluno', 'Codigo', 'Turma', 'Status', 'Hora Entrada', 'Hora Saida', 'Metodo', 'Confianca (%)', 'Dispositivo', 'Justificativa']
    const linhas = registros.map(r => {
      const conf = formatarConfianca(r.confianca)
      return [
        r.aluno_nome,
        r.aluno_codigo || '',
        r.turma_codigo || '',
        r.status === 'ausente' ? 'Ausente' : 'Presente',
        r.hora_entrada ? formatarHora(r.hora_entrada) : '',
        r.hora_saida ? formatarHora(r.hora_saida) : '',
        r.metodo || '',
        conf !== null ? Number(conf).toFixed(1) : '',
        r.dispositivo || '',
        r.justificativa || ''
      ]
    })

    const csvContent = [headers, ...linhas]
      .map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `frequencia-diaria-${data}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exportado com sucesso')
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="space-y-6">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-xl p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Frequencia Diaria</h1>
              <p className="mt-1 text-sm text-indigo-200">
                Acompanhamento em tempo real da presenca dos alunos
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLancarFaltas}
                disabled={!turmaId || lancandoFaltas}
                title={!turmaId ? 'Selecione uma turma primeiro' : 'Lançar falta para alunos sem presença'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/80 text-white rounded-lg hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {lancandoFaltas ? <LoadingSpinner /> : <AlertTriangle className="w-4 h-4" />}
                Lancar Faltas
              </button>
              <button
                onClick={handleExportarCSV}
                disabled={registros.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
              <button
                onClick={handleBuscar}
                disabled={carregando}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors text-sm font-semibold"
              >
                <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>
        </div>

        <KpiCards resumo={resumo} carregandoResumo={carregandoResumo} />

        <FilterSection
          data={data} setData={setData}
          escolaId={escolaId} setEscolaId={setEscolaId}
          turmaId={turmaId} setTurmaId={setTurmaId}
          metodo={metodo} setMetodo={setMetodo}
          tipoUsuario={tipoUsuario}
          escolas={escolas}
          turmas={turmas}
          carregando={carregando}
          onBuscar={handleBuscar}
        />

        {justificandoId && (
          <JustificativaModal
            justificativaTexto={justificativaTexto}
            setJustificativaTexto={setJustificativaTexto}
            onFechar={handleFecharJustificativa}
            onSalvar={handleSalvarJustificativa}
          />
        )}

        <AttendanceTable
          registros={registros}
          paginacao={paginacao}
          carregando={carregando}
          excluindoId={excluindoId}
          onExcluir={handleExcluir}
          onAbrirJustificativa={handleAbrirJustificativa}
          onPaginar={carregarRegistros}
        />
      </div>
    </ProtectedRoute>
  )
}
