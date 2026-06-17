'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, RefreshCw, LayoutGrid, Download } from 'lucide-react'
import { exportarCSV } from '@/lib/export-csv'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { Situacao } from '@/lib/situacoes-config'
import { useSeries } from '@/lib/use-series'

import { Turma, Aluno, TurmaDetalhe, EscolaSimples, formInicial, getSituacaoConfig } from './components/types'
import { imprimirRelacaoAlunos } from './components/printAlunos'
import { ModalCrudTurma } from './components/ModalCrudTurma'
import { ModalAlunos } from './components/ModalAlunos'
import { ModalSituacao } from './components/ModalSituacao'
import { KpiCards } from './components/KpiCards'
import { TurmaListItem } from './components/TurmaListItem'
import { ModalMultiserie, ComposicaoSerie } from './components/ModalMultiserie'

export default function TurmasPage() {
  const toast = useToast()
  const { formatSerie } = useSeries()
  const [tipoUsuario, setTipoUsuario] = useState<string>('')

  // Filtros
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString())
  const [anosDisponiveis, setAnosDisponiveis] = useState<string[]>([])
  const [filtroEscola, setFiltroEscola] = useState('')
  const [filtroSerie, setFiltroSerie] = useState('')
  const [busca, setBusca] = useState('')
  const buscaDebounced = useDebounce(busca, 300)

  // Dados
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [carregando, setCarregando] = useState(true)

  // Modal de alunos
  const [mostrarModalAlunos, setMostrarModalAlunos] = useState(false)
  const [detalhesTurma, setDetalhesTurma] = useState<TurmaDetalhe | null>(null)
  const [carregandoAlunos, setCarregandoAlunos] = useState(false)

  // Modal de situação do aluno
  const [mostrarModalSituacao, setMostrarModalSituacao] = useState(false)
  const [alunoSituacao, setAlunoSituacao] = useState<Aluno | null>(null)
  const [novaSituacao, setNovaSituacao] = useState<Situacao>('cursando')
  const [dataSituacao, setDataSituacao] = useState(new Date().toISOString().split('T')[0])
  const [observacaoSituacao, setObservacaoSituacao] = useState('')
  const [salvandoSituacao, setSalvandoSituacao] = useState(false)
  const [historicoSituacao, setHistoricoSituacao] = useState<any[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)

  // Campos de transferência
  const [tipoTransferencia, setTipoTransferencia] = useState<'dentro_municipio' | 'fora_municipio'>('dentro_municipio')
  const [escolaDestinoId, setEscolaDestinoId] = useState('')
  const [escolaDestinoNome, setEscolaDestinoNome] = useState('')
  const [escolaOrigemId, setEscolaOrigemId] = useState('')
  const [escolaOrigemNome, setEscolaOrigemNome] = useState('')
  const [escolasLista, setEscolasLista] = useState<{id: string, nome: string}[]>([])

  // Modal multiserie
  const [mostrarMultiserie, setMostrarMultiserie] = useState(false)
  const [composicaoSeries, setComposicaoSeries] = useState<Record<string, ComposicaoSerie[]>>({})
  const [carregandoComposicao, setCarregandoComposicao] = useState(false)

  // Modal CRUD
  const [mostrarModal, setMostrarModal] = useState(false)
  const [turmaEditando, setTurmaEditando] = useState<Turma | null>(null)
  const [formData, setFormData] = useState(formInicial)
  const [salvando, setSalvando] = useState(false)

  // Carregar dados iniciais
  useEffect(() => {
    const carregarIniciais = async () => {
      try {
        const [escolasRes, anosRes, authRes] = await Promise.all([
          fetch('/api/admin/escolas').catch(() => null),
          fetch('/api/admin/turmas?mode=listagem').catch(() => null),
          fetch('/api/auth/verificar').catch(() => null),
        ])

        if (escolasRes?.ok) {
          const data = await escolasRes.json()
          setEscolas(Array.isArray(data) ? data : [])
        }

        if (anosRes?.ok) {
          const data = await anosRes.json()
          const anos = [...new Set((Array.isArray(data) ? data : []).map((t: any) => t.ano_letivo).filter(Boolean))] as string[]
          const anoAtual = new Date().getFullYear().toString()
          if (!anos.includes(anoAtual)) anos.push(anoAtual)
          setAnosDisponiveis(anos.sort().reverse())
        }

        if (authRes?.ok) {
          const authData = await authRes.json()
          if (authData.usuario) {
            setTipoUsuario(authData.usuario.tipo_usuario === 'administrador' ? 'admin' : authData.usuario.tipo_usuario)
          }
        }
      } catch (err) {
      console.error('[Turmas] Erro ao carregar dados iniciais:', (err as Error).message)
    }
    }
    carregarIniciais()
  }, [])

  // Carregar turmas
  const carregarTurmas = useCallback(async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({ mode: 'listagem' })
      if (filtroAno) params.append('ano_letivo', filtroAno)
      if (filtroEscola) params.append('escola_id', filtroEscola)
      if (filtroSerie) params.append('serie', filtroSerie)
      if (buscaDebounced) params.append('busca', buscaDebounced)

      const res = await fetch(`/api/admin/turmas?${params}`)
      const data = await res.json()
      setTurmas(Array.isArray(data) ? data : [])
    } catch {
      setTurmas([])
    } finally {
      setCarregando(false)
    }
  }, [filtroAno, filtroEscola, filtroSerie, buscaDebounced])

  useEffect(() => {
    carregarTurmas()
  }, [carregarTurmas])

  // Abrir modal de alunos
  const handleVerAlunos = async (turmaId: string) => {
    setMostrarModalAlunos(true)
    setCarregandoAlunos(true)
    setDetalhesTurma(null)
    try {
      const res = await fetch(`/api/admin/turmas/${turmaId}/alunos`)
      const data = await res.json()
      setDetalhesTurma(data)
    } catch {
      toast.error('Erro ao carregar alunos da turma')
    } finally {
      setCarregandoAlunos(false)
    }
  }

  // Fechar modal alunos
  const fecharModalAlunos = () => {
    setMostrarModalAlunos(false)
    setDetalhesTurma(null)
  }

  // CRUD
  const handleAbrirModal = (turma?: Turma) => {
    if (turma) {
      setTurmaEditando(turma)
      setFormData({
        codigo: turma.codigo,
        nome: turma.nome || '',
        escola_id: turma.escola_id,
        serie: turma.serie,
        ano_letivo: turma.ano_letivo,
        capacidade_maxima: turma.capacidade_maxima || 35,
        multiserie: turma.multiserie || false,
        multietapa: turma.multietapa || false,
      })
    } else {
      setTurmaEditando(null)
      setFormData({ ...formInicial, ano_letivo: filtroAno || new Date().getFullYear().toString() })
    }
    setMostrarModal(true)
  }

  const handleSalvar = async () => {
    if (!formData.codigo.trim() || !formData.escola_id || !formData.serie.trim() || !formData.ano_letivo.trim()) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setSalvando(true)
    try {
      const method = turmaEditando ? 'PUT' : 'POST'
      const body = turmaEditando ? { id: turmaEditando.id, ...formData } : formData

      const res = await fetch('/api/admin/turmas', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.mensagem || 'Erro ao salvar turma')
        return
      }

      toast.success(turmaEditando ? 'Turma atualizada com sucesso' : 'Turma criada com sucesso')
      setMostrarModal(false)
      carregarTurmas()
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (turma: Turma) => {
    if (!confirm(`Deseja excluir a turma "${turma.codigo}"?`)) return

    try {
      const res = await fetch(`/api/admin/turmas?id=${turma.id}`, { method: 'DELETE' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.mensagem || 'Erro ao excluir turma')
        return
      }

      toast.success('Turma excluída com sucesso')
      carregarTurmas()
    } catch {
      toast.error('Erro ao conectar com o servidor')
    }
  }

  // Abrir modal de situação
  const handleAbrirSituacao = async (aluno: Aluno) => {
    setAlunoSituacao(aluno)
    setNovaSituacao(aluno.situacao || 'cursando')
    setDataSituacao(new Date().toISOString().split('T')[0])
    setObservacaoSituacao('')
    setTipoTransferencia('dentro_municipio')
    setEscolaDestinoId('')
    setEscolaDestinoNome('')
    setEscolaOrigemId('')
    setEscolaOrigemNome('')
    setMostrarModalSituacao(true)
    setCarregandoHistorico(true)

    // Carregar lista de escolas para transferência
    if (escolasLista.length === 0) {
      try {
        const resEscolas = await fetch('/api/admin/escolas')
        const dataEscolas = await resEscolas.json()
        const lista = (dataEscolas.escolas || dataEscolas || []).map((e: any) => ({ id: e.id, nome: e.nome }))
        setEscolasLista(lista)
      } catch {
        // Silencioso — escolas não carregadas não impede uso do modal
      }
    }

    try {
      const res = await fetch(`/api/admin/alunos/${aluno.id}/situacao`)
      const data = await res.json()
      setHistoricoSituacao(data.historico || [])
    } catch {
      setHistoricoSituacao([])
    } finally {
      setCarregandoHistorico(false)
    }
  }

  const handleSalvarSituacao = async () => {
    if (!alunoSituacao) return

    setSalvandoSituacao(true)
    try {
      const bodyData: any = {
        situacao: novaSituacao,
        data: dataSituacao,
        observacao: observacaoSituacao || null,
      }

      // Adicionar campos de transferência se aplicável
      if (novaSituacao === 'transferido') {
        bodyData.tipo_transferencia = tipoTransferencia
        if (tipoTransferencia === 'dentro_municipio') {
          bodyData.escola_destino_id = escolaDestinoId
        } else {
          bodyData.escola_destino_nome = escolaDestinoNome
        }
      }

      // Campos de reingresso (entrada)
      if (novaSituacao === 'cursando' && alunoSituacao.situacao === 'transferido') {
        if (escolaOrigemId || escolaOrigemNome) {
          bodyData.tipo_transferencia = tipoTransferencia
          if (tipoTransferencia === 'dentro_municipio') {
            bodyData.escola_origem_id = escolaOrigemId
          } else {
            bodyData.escola_origem_nome = escolaOrigemNome
          }
        }
      }

      const res = await fetch(`/api/admin/alunos/${alunoSituacao.id}/situacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.mensagem || 'Erro ao alterar situação')
        return
      }

      toast.success(`Situação alterada para "${getSituacaoConfig(novaSituacao).label}"`)
      setMostrarModalSituacao(false)

      // Atualizar o aluno na lista local
      if (detalhesTurma) {
        const isInativo = ['transferido', 'abandono'].includes(novaSituacao)
        const alunosAtualizados = detalhesTurma.alunos.map(a =>
          a.id === alunoSituacao.id ? {
            ...a,
            situacao: novaSituacao,
            ativo: !isInativo,
            data_transferencia: isInativo ? dataSituacao : a.data_transferencia,
          } : a
        )
        // Reordenar: ativos alfabeticamente, inativos por último
        alunosAtualizados.sort((a, b) => {
          const aInativo = ['transferido', 'abandono'].includes(a.situacao || '') ? 1 : 0
          const bInativo = ['transferido', 'abandono'].includes(b.situacao || '') ? 1 : 0
          if (aInativo !== bInativo) return aInativo - bInativo
          return a.nome.localeCompare(b.nome)
        })
        setDetalhesTurma({ ...detalhesTurma, alunos: alunosAtualizados })
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setSalvandoSituacao(false)
    }
  }

  // Imprimir relação de alunos
  const handleImprimir = () => {
    if (!detalhesTurma) return
    imprimirRelacaoAlunos(detalhesTurma, formatSerie)
  }

  const seriesUnicas = [...new Set(turmas.map(t => t.serie))].sort()

  // Estatísticas do modal
  const totalPcd = detalhesTurma?.alunos.filter(a => a.pcd).length || 0

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="space-y-6">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white print:hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-lg p-2">
                <LayoutGrid className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Gestao de Turmas</h1>
                <p className="text-sm opacity-90">Organize turmas, series e alunos por escola</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => carregarTurmas()} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors" title="Atualizar">
                <RefreshCw className="w-5 h-5" />
              </button>
              {turmas.length > 0 && (
                <button
                  onClick={() => exportarCSV(
                    turmas.map(t => ({
                      ...t,
                      multiserie_label: t.multiserie ? 'Sim' : 'Não',
                    })),
                    [
                      { campo: 'codigo', titulo: 'Código' },
                      { campo: 'nome', titulo: 'Nome' },
                      { campo: 'serie', titulo: 'Série' },
                      { campo: 'escola_nome', titulo: 'Escola' },
                      { campo: 'ano_letivo', titulo: 'Ano Letivo' },
                      { campo: 'total_alunos', titulo: 'Total Alunos' },
                      { campo: 'multiserie_label', titulo: 'Multisseriada' },
                    ],
                    `turmas-${filtroAno || 'todos'}`
                  )}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  title="Exportar CSV"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
              <button onClick={() => handleAbrirModal()}
                className="bg-white text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-50 flex items-center gap-2 font-semibold text-sm shadow-sm transition-all">
                <Plus className="w-4 h-4" />
                Nova Turma
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <KpiCards turmas={turmas} seriesUnicas={seriesUnicas} escolas={escolas} onVerMultiserie={async () => {
          setMostrarMultiserie(true)
          setCarregandoComposicao(true)
          try {
            const res = await fetch(`/api/admin/turmas/composicao-series?ano_letivo=${filtroAno || new Date().getFullYear()}`)
            if (res.ok) setComposicaoSeries(await res.json())
          } catch { /* silencioso */ }
          finally { setCarregandoComposicao(false) }
        }} />

        {/* Filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className="select-custom w-full">
              <option value="">Todos os anos</option>
              {anosDisponiveis.map(ano => <option key={ano} value={ano}>{ano}</option>)}
            </select>
            <select value={filtroEscola} onChange={e => setFiltroEscola(e.target.value)} className="select-custom w-full">
              <option value="">Todas as escolas</option>
              {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <select value={filtroSerie} onChange={e => setFiltroSerie(e.target.value)} className="select-custom w-full">
              <option value="">Todas as series</option>
              {seriesUnicas.map(s => <option key={s} value={s}>{formatSerie(s)}</option>)}
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Codigo, nome ou escola..."
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
        </div>

        {/* Lista de Turmas */}
        {carregando ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : turmas.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 text-center text-gray-500 dark:text-gray-400">
            Nenhuma turma encontrada com os filtros selecionados.
          </div>
        ) : (
          <div className="space-y-2">
            {turmas.map(turma => (
              <TurmaListItem
                key={turma.id}
                turma={turma}
                tipoUsuario={tipoUsuario}
                formatSerie={formatSerie}
                onVerAlunos={handleVerAlunos}
                onEditar={handleAbrirModal}
                onExcluir={handleExcluir}
              />
            ))}
          </div>
        )}

        {/* Modal de Alunos da Turma */}
        <ModalAlunos
          mostrarModalAlunos={mostrarModalAlunos}
          detalhesTurma={detalhesTurma}
          carregandoAlunos={carregandoAlunos}
          totalPcd={totalPcd}
          formatSerie={formatSerie}
          onFechar={fecharModalAlunos}
          onAbrirSituacao={handleAbrirSituacao}
          onImprimir={handleImprimir}
        />

        {/* Modal CRUD */}
        <ModalCrudTurma
          mostrarModal={mostrarModal}
          turmaEditando={turmaEditando}
          formData={formData}
          setFormData={setFormData}
          escolas={escolas}
          salvando={salvando}
          onFechar={() => setMostrarModal(false)}
          onSalvar={handleSalvar}
        />

        {/* Modal Multiserie/Multietapa */}
        <ModalMultiserie
          aberto={mostrarMultiserie}
          turmas={turmas}
          composicao={composicaoSeries}
          carregandoComposicao={carregandoComposicao}
          formatSerie={formatSerie}
          onFechar={() => setMostrarMultiserie(false)}
        />

        {/* Modal de Situação do Aluno */}
        <ModalSituacao
          mostrarModalSituacao={mostrarModalSituacao}
          alunoSituacao={alunoSituacao}
          novaSituacao={novaSituacao}
          setNovaSituacao={setNovaSituacao}
          dataSituacao={dataSituacao}
          setDataSituacao={setDataSituacao}
          observacaoSituacao={observacaoSituacao}
          setObservacaoSituacao={setObservacaoSituacao}
          salvandoSituacao={salvandoSituacao}
          historicoSituacao={historicoSituacao}
          carregandoHistorico={carregandoHistorico}
          tipoTransferencia={tipoTransferencia}
          setTipoTransferencia={setTipoTransferencia}
          escolaDestinoId={escolaDestinoId}
          setEscolaDestinoId={setEscolaDestinoId}
          escolaDestinoNome={escolaDestinoNome}
          setEscolaDestinoNome={setEscolaDestinoNome}
          escolaOrigemId={escolaOrigemId}
          setEscolaOrigemId={setEscolaOrigemId}
          escolaOrigemNome={escolaOrigemNome}
          setEscolaOrigemNome={setEscolaOrigemNome}
          escolasLista={escolasLista}
          detalhesTurma={detalhesTurma}
          onFechar={() => setMostrarModalSituacao(false)}
          onSalvar={handleSalvarSituacao}
        />
      </div>
    </ProtectedRoute>
  )
}
