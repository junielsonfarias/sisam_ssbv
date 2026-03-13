'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit, Trash2, Search, Users, Printer, X, Eye, GraduationCap, Calendar, School } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { Situacao, SITUACOES } from '@/lib/situacoes-config'

interface Turma {
  id: string
  codigo: string
  nome: string | null
  serie: string
  ano_letivo: string
  escola_id: string
  escola_nome: string
  polo_nome: string | null
  total_alunos: number
}

interface Aluno {
  id: string
  codigo: string | null
  nome: string
  serie: string | null
  ano_letivo: string | null
  ativo: boolean
  data_nascimento: string | null
  pcd: boolean
  situacao: Situacao | null
  data_matricula: string | null
  data_transferencia: string | null
}

function getSituacaoConfig(situacao: string | null) {
  return SITUACOES.find(s => s.value === situacao) || SITUACOES[0]
}

interface TurmaDetalhe {
  turma: {
    id: string
    codigo: string
    nome: string | null
    serie: string
    ano_letivo: string
    escola_id: string
    escola_nome: string
    polo_nome: string | null
  }
  alunos: Aluno[]
  total: number
}

interface EscolaSimples {
  id: string
  nome: string
}

const formInicial = {
  codigo: '',
  nome: '',
  escola_id: '',
  serie: '',
  ano_letivo: new Date().getFullYear().toString(),
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, c => map[c])
}

function calcularIdade(dataNascimento: string | null): number | null {
  if (!dataNascimento) return null
  const nascimento = new Date(dataNascimento)
  if (isNaN(nascimento.getTime())) return null
  const hoje = new Date()
  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const mesAtual = hoje.getMonth()
  const mesNasc = nascimento.getMonth()
  if (mesAtual < mesNasc || (mesAtual === mesNasc && hoje.getDate() < nascimento.getDate())) {
    idade--
  }
  return idade
}

export default function TurmasPage() {
  const toast = useToast()
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
      } catch { /* silencioso */ }
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

    const { turma, alunos } = detalhesTurma
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relação de Alunos - ${escapeHtml(turma.codigo)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .info { font-size: 13px; color: #555; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
          th { background: #f3f4f6; font-weight: 600; }
          tr:nth-child(even) { background: #f9fafb; }
          .pcd { background: #dbeafe; color: #1e40af; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
          .inativo { opacity: 0.6; }
          .inativo td { color: #888; }
          .inativo .nome { text-decoration: line-through; }
          .data-saida { color: #dc2626; font-size: 10px; display: block; }
          .total { margin-top: 12px; font-size: 13px; font-weight: 600; }
          .resumo { margin-top: 4px; font-size: 12px; color: #666; }
          @media print { body { margin: 10mm; } }
        </style>
      </head>
      <body>
        <h1>Relação de Alunos - Turma ${escapeHtml(turma.codigo)}${turma.nome ? ' (' + escapeHtml(turma.nome) + ')' : ''}</h1>
        <div class="info">
          <p>Escola: ${escapeHtml(turma.escola_nome)} | Série: ${escapeHtml(turma.serie)} | Ano Letivo: ${escapeHtml(turma.ano_letivo)}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:35px">Ord.</th>
              <th>Nome do Aluno</th>
              <th style="width:55px; text-align:center">Idade</th>
              <th style="width:80px; text-align:center">Matrícula</th>
              <th style="width:90px; text-align:center">Situação</th>
              <th style="width:50px; text-align:center">PCD</th>
            </tr>
          </thead>
          <tbody>
            ${alunos.map((a, i) => {
              const idade = a.data_nascimento ? calcularIdade(a.data_nascimento) : null
              const sit = a.situacao ? a.situacao.charAt(0).toUpperCase() + a.situacao.slice(1) : 'Cursando'
              const isInativo = ['transferido', 'abandono'].includes(a.situacao || '')
              const dataMatricula = a.data_matricula ? new Date(a.data_matricula).toLocaleDateString('pt-BR') : '-'
              const dataTransf = a.data_transferencia ? new Date(a.data_transferencia).toLocaleDateString('pt-BR') : ''
              return `
              <tr class="${isInativo ? 'inativo' : ''}">
                <td>${i + 1}</td>
                <td><span class="${isInativo ? 'nome' : ''}">${escapeHtml(a.nome)}</span>${isInativo && dataTransf ? '<span class="data-saida">' + escapeHtml(sit) + ' em ' + dataTransf + '</span>' : ''}</td>
                <td style="text-align:center">${idade !== null ? idade : '-'}</td>
                <td style="text-align:center">${dataMatricula}</td>
                <td style="text-align:center">${escapeHtml(sit)}</td>
                <td style="text-align:center">${a.pcd ? '<span class="pcd">PCD</span>' : '-'}</td>
              </tr>`
            }).join('')}
          </tbody>
        </table>
        ${(() => {
          const ativos = alunos.filter(a => !['transferido', 'abandono'].includes(a.situacao || '')).length
          const inativos = alunos.length - ativos
          return `
            <p class="total">Total de alunos ativos: ${ativos}</p>
            ${inativos > 0 ? '<p class="resumo">Transferidos/Saídas: ' + inativos + ' aluno(s)</p>' : ''}
            <p class="resumo">PCD: ${alunos.filter(a => a.pcd).length} aluno(s)</p>
          `
        })()}
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const seriesUnicas = [...new Set(turmas.map(t => t.serie))].sort()

  // Estatísticas do modal
  const totalPcd = detalhesTurma?.alunos.filter(a => a.pcd).length || 0

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <div className="p-3 sm:p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">Gestão de Turmas</h1>
          <button
            onClick={() => handleAbrirModal()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Turma
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ano Letivo</label>
              <select
                value={filtroAno}
                onChange={e => setFiltroAno(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">Todos</option>
                {anosDisponiveis.map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Escola</label>
              <select
                value={filtroEscola}
                onChange={e => setFiltroEscola(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">Todas</option>
                {escolas.map(e => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Série</label>
              <select
                value={filtroSerie}
                onChange={e => setFiltroSerie(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">Todas</option>
                {seriesUnicas.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Busca</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Código, nome ou escola..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
          <span>{turmas.length} turma(s) encontrada(s)</span>
          <span>{turmas.reduce((acc, t) => acc + t.total_alunos, 0)} aluno(s) no total</span>
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
              <div key={turma.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800 dark:text-white">{turma.codigo}</span>
                      {turma.nome && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">({turma.nome})</span>
                      )}
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {turma.serie}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300">
                        {turma.ano_letivo}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {turma.escola_nome}
                      {turma.polo_nome && <span className="ml-1">({turma.polo_nome})</span>}
                    </p>
                  </div>

                  <button
                    onClick={() => handleVerAlunos(turma.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                    title="Ver alunos"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <Users className="w-3.5 h-3.5" />
                    <span>{turma.total_alunos}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAbrirModal(turma)}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {tipoUsuario === 'admin' && (
                      <button
                        onClick={() => handleExcluir(turma)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 rounded transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Alunos da Turma */}
        {mostrarModalAlunos && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4" onClick={fecharModalAlunos}>
            <div
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header com gradiente */}
              <div className="relative bg-gradient-to-r from-indigo-600 to-blue-500 dark:from-indigo-700 dark:to-blue-600">
                {/* Botão fechar */}
                <button
                  onClick={fecharModalAlunos}
                  className="absolute top-3 right-3 p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {detalhesTurma ? (
                  <div className="px-5 pt-5 pb-4">
                    <div className="flex items-center gap-2.5 mb-1">
                      <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white leading-tight">
                          Turma {detalhesTurma.turma.codigo}
                        </h2>
                        {detalhesTurma.turma.nome && (
                          <p className="text-sm text-white/70">{detalhesTurma.turma.nome}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-white/80 mt-2">
                      <School className="w-3.5 h-3.5" />
                      <span>
                        {detalhesTurma.turma.escola_nome}
                        {detalhesTurma.turma.polo_nome && ` - ${detalhesTurma.turma.polo_nome}`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 pt-5 pb-4">
                    <h2 className="text-lg font-bold text-white">Alunos da Turma</h2>
                  </div>
                )}

                {/* Stat cards no footer do header */}
                {detalhesTurma && (
                  <div className="flex gap-2 px-5 pb-4 flex-wrap">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm text-xs font-medium text-white">
                      <Calendar className="w-3.5 h-3.5" />
                      {detalhesTurma.turma.serie} - {detalhesTurma.turma.ano_letivo}
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm text-xs font-medium text-white">
                      <Users className="w-3.5 h-3.5" />
                      {detalhesTurma.total} aluno{detalhesTurma.total !== 1 ? 's' : ''}
                    </div>
                    {totalPcd > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/25 backdrop-blur-sm text-xs font-semibold text-amber-100">
                        PCD: {totalPcd}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Body - Tabela de alunos */}
              <div className="flex-1 overflow-y-auto">
                {carregandoAlunos ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <LoadingSpinner />
                    <span className="text-sm text-gray-400 dark:text-gray-500">Carregando alunos...</span>
                  </div>
                ) : detalhesTurma && detalhesTurma.alunos.length > 0 ? (
                  <table className="w-full">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gray-50 dark:bg-slate-700/60 border-b border-gray-200 dark:border-slate-600">
                        <th className="text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-2.5 w-14">
                          Ord.
                        </th>
                        <th className="text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-2.5">
                          Nome do Aluno
                        </th>
                        <th className="text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-2.5 w-20">
                          Idade
                        </th>
                        <th className="text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-2.5 w-24">
                          Matrícula
                        </th>
                        <th className="text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-2.5 w-24">
                          Situação
                        </th>
                        <th className="text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-2.5 w-14">
                          PCD
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalhesTurma.alunos.map((aluno, idx) => {
                        const idade = calcularIdade(aluno.data_nascimento)
                        const isEven = idx % 2 === 0
                        const sitConfig = getSituacaoConfig(aluno.situacao)
                        const isInativo = ['transferido', 'abandono'].includes(aluno.situacao || '')
                        return (
                          <tr
                            key={aluno.id}
                            className={`border-b border-gray-100 dark:border-slate-700/40 transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 ${
                              isInativo
                                ? 'bg-gray-100/70 dark:bg-slate-900/40 opacity-75'
                                : isEven ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/50 dark:bg-slate-800/60'
                            }`}
                          >
                            {/* Ordem */}
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                isInativo
                                  ? 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500'
                                  : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                              }`}>
                                {idx + 1}
                              </span>
                            </td>

                            {/* Nome */}
                            <td className="px-2 py-3">
                              <span className={`text-sm font-medium whitespace-nowrap ${isInativo ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-gray-100'}`}>
                                {aluno.nome}
                              </span>
                              {isInativo && aluno.data_transferencia && (
                                <span className="block text-[10px] text-red-500 dark:text-red-400 mt-0.5 whitespace-nowrap">
                                  {aluno.situacao === 'transferido' ? 'Transferido' : 'Abandono'} em {new Date(aluno.data_transferencia).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </td>

                            {/* Idade */}
                            <td className="px-2 py-3 text-center">
                              {idade !== null ? (
                                <span className={`text-sm ${isInativo ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
                                  {idade}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-300 dark:text-gray-600">-</span>
                              )}
                            </td>

                            {/* Data Matrícula */}
                            <td className="px-2 py-3 text-center">
                              {aluno.data_matricula ? (
                                <span className={`text-xs ${isInativo ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
                                  {new Date(aluno.data_matricula).toLocaleDateString('pt-BR')}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-300 dark:text-gray-600">-</span>
                              )}
                            </td>

                            {/* Situação */}
                            <td className="px-2 py-3 text-center">
                              <button
                                onClick={() => handleAbrirSituacao(aluno)}
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide cursor-pointer hover:opacity-80 transition-opacity ${sitConfig.cor} ${sitConfig.corDark}`}
                                title="Alterar situação"
                              >
                                {sitConfig.label}
                              </button>
                            </td>

                            {/* PCD */}
                            <td className="px-2 py-3 text-center">
                              {aluno.pcd ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-500/30">
                                  PCD
                                </span>
                              ) : (
                                <span className="text-xs text-gray-300 dark:text-gray-600">-</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                      <Users className="w-8 h-8 text-gray-300 dark:text-slate-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-400 dark:text-gray-500">Nenhum aluno matriculado nesta turma</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              {detalhesTurma && detalhesTurma.alunos.length > 0 && (
                <div className="px-5 py-3.5 border-t border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {(() => {
                      const ativos = detalhesTurma.alunos.filter(a => !['transferido', 'abandono'].includes(a.situacao || '')).length
                      const inativos = detalhesTurma.alunos.length - ativos
                      return (
                        <>
                          <span className="font-medium">{ativos} aluno{ativos !== 1 ? 's' : ''}</span>
                          {inativos > 0 && (
                            <>
                              <span className="w-px h-3 bg-gray-300 dark:bg-slate-600" />
                              <span className="text-gray-400 dark:text-gray-500">{inativos} {inativos === 1 ? 'transferido/saiu' : 'transferidos/saíram'}</span>
                            </>
                          )}
                        </>
                      )
                    })()}
                    {totalPcd > 0 && (
                      <>
                        <span className="w-px h-3 bg-gray-300 dark:bg-slate-600" />
                        <span>{totalPcd} PCD</span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={handleImprimir}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimir Relação
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal CRUD */}
        {mostrarModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setMostrarModal(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {turmaEditando ? 'Editar Turma' : 'Nova Turma'}
                </h2>
                <button onClick={() => setMostrarModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Código *
                  </label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={e => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                    placeholder="Ex: 5A, 6B"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Turma A - Manhã"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Escola *
                  </label>
                  <select
                    value={formData.escola_id}
                    onChange={e => setFormData(prev => ({ ...prev, escola_id: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Selecione a escola</option>
                    {escolas.map(e => (
                      <option key={e.id} value={e.id}>{e.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Série *
                    </label>
                    <input
                      type="text"
                      value={formData.serie}
                      onChange={e => setFormData(prev => ({ ...prev, serie: e.target.value }))}
                      placeholder="Ex: 5º Ano"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Ano Letivo *
                    </label>
                    <input
                      type="text"
                      value={formData.ano_letivo}
                      onChange={e => setFormData(prev => ({ ...prev, ano_letivo: e.target.value }))}
                      placeholder="Ex: 2026"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={() => setMostrarModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvar}
                  disabled={salvando}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {salvando ? 'Salvando...' : turmaEditando ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal de Situação do Aluno */}
        {mostrarModalSituacao && alunoSituacao && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-3 sm:p-4" onClick={() => setMostrarModalSituacao(false)}>
            <div
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-4 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-bold text-gray-800 dark:text-white">Situação do Aluno</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{alunoSituacao.nome}</p>
                  </div>
                  <button
                    onClick={() => setMostrarModalSituacao(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Situação atual e datas */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Atual:</span>
                    {(() => {
                      const cfg = getSituacaoConfig(alunoSituacao.situacao)
                      return (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.cor} ${cfg.corDark}`}>
                          {cfg.label}
                        </span>
                      )
                    })()}
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400">
                    {alunoSituacao.data_matricula && (
                      <span>
                        <span className="font-medium text-gray-600 dark:text-gray-300">Matrícula:</span>{' '}
                        {new Date(alunoSituacao.data_matricula).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    {alunoSituacao.data_transferencia && (
                      <span>
                        <span className="font-medium text-red-600 dark:text-red-400">Saída:</span>{' '}
                        {new Date(alunoSituacao.data_transferencia).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Formulário de mudança */}
                <div className="px-5 py-4 space-y-3 border-b border-gray-100 dark:border-slate-700/50">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Alterar Situação</h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SITUACOES.map(s => (
                      <button
                        key={s.value}
                        onClick={() => setNovaSituacao(s.value)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                          novaSituacao === s.value
                            ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800 ' + s.cor + ' ' + s.corDark
                            : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-500'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Campos de transferência */}
                  {novaSituacao === 'transferido' && (
                    <div className="space-y-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase">Dados da Transferência</h4>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setTipoTransferencia('dentro_municipio')}
                          className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                            tipoTransferencia === 'dentro_municipio'
                              ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                              : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          Dentro do Município
                        </button>
                        <button
                          type="button"
                          onClick={() => setTipoTransferencia('fora_municipio')}
                          className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                            tipoTransferencia === 'fora_municipio'
                              ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                              : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          Fora do Município
                        </button>
                      </div>

                      {tipoTransferencia === 'dentro_municipio' ? (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Escola Destino</label>
                          <select
                            value={escolaDestinoId}
                            onChange={e => setEscolaDestinoId(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Selecione a escola destino</option>
                            {escolasLista
                              .filter(e => detalhesTurma && e.id !== detalhesTurma.turma.escola_id)
                              .map(e => (
                                <option key={e.id} value={e.id}>{e.nome}</option>
                              ))
                            }
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nome da Escola Destino</label>
                          <input
                            type="text"
                            value={escolaDestinoNome}
                            onChange={e => setEscolaDestinoNome(e.target.value)}
                            placeholder="Nome da escola fora do município"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Campos de reingresso (entrada de aluno transferido) */}
                  {novaSituacao === 'cursando' && alunoSituacao.situacao === 'transferido' && (
                    <div className="space-y-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <h4 className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase">Dados de Origem (Reingresso)</h4>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setTipoTransferencia('dentro_municipio')}
                          className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                            tipoTransferencia === 'dentro_municipio'
                              ? 'border-green-500 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                              : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          Dentro do Município
                        </button>
                        <button
                          type="button"
                          onClick={() => setTipoTransferencia('fora_municipio')}
                          className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                            tipoTransferencia === 'fora_municipio'
                              ? 'border-green-500 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                              : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          Fora do Município
                        </button>
                      </div>

                      {tipoTransferencia === 'dentro_municipio' ? (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Escola de Origem</label>
                          <select
                            value={escolaOrigemId}
                            onChange={e => setEscolaOrigemId(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Selecione a escola de origem</option>
                            {escolasLista
                              .filter(e => detalhesTurma && e.id !== detalhesTurma.turma.escola_id)
                              .map(e => (
                                <option key={e.id} value={e.id}>{e.nome}</option>
                              ))
                            }
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nome da Escola de Origem</label>
                          <input
                            type="text"
                            value={escolaOrigemNome}
                            onChange={e => setEscolaOrigemNome(e.target.value)}
                            placeholder="Nome da escola fora do município"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {['transferido', 'abandono'].includes(novaSituacao) ? 'Data de Saída' : novaSituacao === 'cursando' && alunoSituacao.situacao === 'transferido' ? 'Data de Entrada' : 'Data'}
                      </label>
                      <input
                        type="date"
                        value={dataSituacao}
                        onChange={e => setDataSituacao(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Observação</label>
                      <input
                        type="text"
                        value={observacaoSituacao}
                        onChange={e => setObservacaoSituacao(e.target.value)}
                        placeholder="Ex: Transferido para escola X"
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSalvarSituacao}
                    disabled={
                      salvandoSituacao ||
                      novaSituacao === alunoSituacao.situacao ||
                      (novaSituacao === 'transferido' && tipoTransferencia === 'dentro_municipio' && !escolaDestinoId) ||
                      (novaSituacao === 'transferido' && tipoTransferencia === 'fora_municipio' && !escolaDestinoNome.trim())
                    }
                    className="w-full px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {salvandoSituacao ? 'Salvando...' : 'Confirmar Alteração'}
                  </button>
                </div>

                {/* Histórico */}
                <div className="px-5 py-4">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Histórico</h3>
                  {carregandoHistorico ? (
                    <div className="flex justify-center py-4">
                      <LoadingSpinner />
                    </div>
                  ) : historicoSituacao.length > 0 ? (
                    <div className="space-y-2">
                      {historicoSituacao.map((h: any) => {
                        const cfg = getSituacaoConfig(h.situacao)
                        const cfgAnterior = h.situacao_anterior ? getSituacaoConfig(h.situacao_anterior) : null
                        return (
                          <div key={h.id} className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-slate-700/40 last:border-0">
                            <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {cfgAnterior && (
                                  <>
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${cfgAnterior.cor} ${cfgAnterior.corDark} opacity-60`}>
                                      {cfgAnterior.label}
                                    </span>
                                    <span className="text-xs text-gray-400">→</span>
                                  </>
                                )}
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${cfg.cor} ${cfg.corDark}`}>
                                  {cfg.label}
                                </span>
                              </div>
                              {/* Info de transferência */}
                              {h.tipo_movimentacao && (
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                    h.tipo_movimentacao === 'saida'
                                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  }`}>
                                    {h.tipo_movimentacao === 'saida' ? 'Saída' : 'Entrada'}
                                  </span>
                                  {h.tipo_transferencia && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400">
                                      {h.tipo_transferencia === 'dentro_municipio' ? 'Dentro do Município' : 'Fora do Município'}
                                    </span>
                                  )}
                                  {(h.escola_destino_ref_nome || h.escola_destino_nome) && (
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                      → {h.escola_destino_ref_nome || h.escola_destino_nome}
                                    </span>
                                  )}
                                  {(h.escola_origem_ref_nome || h.escola_origem_nome) && (
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                      ← {h.escola_origem_ref_nome || h.escola_origem_nome}
                                    </span>
                                  )}
                                </div>
                              )}
                              {h.observacao && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{h.observacao}</p>
                              )}
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                {new Date(h.data).toLocaleDateString('pt-BR')}
                                {h.registrado_por_nome && ` — ${h.registrado_por_nome}`}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">Nenhum registro no histórico</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
