'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit, Trash2, Search, Users, ChevronDown, ChevronUp, Printer, X } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useDebounce } from '@/lib/hooks/useDebounce'

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

// Escapa HTML para prevenir XSS na impressão
function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, c => map[c])
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

  // Expansão de turma (ver alunos)
  const [turmaExpandida, setTurmaExpandida] = useState<string | null>(null)
  const [detalhesTurma, setDetalhesTurma] = useState<TurmaDetalhe | null>(null)
  const [carregandoAlunos, setCarregandoAlunos] = useState(false)

  // Modal CRUD
  const [mostrarModal, setMostrarModal] = useState(false)
  const [turmaEditando, setTurmaEditando] = useState<Turma | null>(null)
  const [formData, setFormData] = useState(formInicial)
  const [salvando, setSalvando] = useState(false)

  // Carregar dados iniciais: escolas, anos disponíveis, tipo de usuário
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

        // Extrair anos distintos de todas as turmas (sem filtro de ano)
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

  // Expandir turma para ver alunos
  const toggleExpandir = async (turmaId: string) => {
    if (turmaExpandida === turmaId) {
      setTurmaExpandida(null)
      setDetalhesTurma(null)
      return
    }

    setTurmaExpandida(turmaId)
    setCarregandoAlunos(true)
    try {
      const res = await fetch(`/api/admin/turmas/${turmaId}/alunos`)
      const data = await res.json()
      setDetalhesTurma(data)
    } catch {
      toast.error('Erro ao carregar alunos da turma')
      setDetalhesTurma(null)
    } finally {
      setCarregandoAlunos(false)
    }
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
        <title>Relação de Alunos - ${turma.codigo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .info { font-size: 13px; color: #555; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
          th { background: #f3f4f6; font-weight: 600; }
          tr:nth-child(even) { background: #f9fafb; }
          .total { margin-top: 12px; font-size: 13px; font-weight: 600; }
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
              <th style="width:40px">#</th>
              <th>Código</th>
              <th>Nome do Aluno</th>
            </tr>
          </thead>
          <tbody>
            ${alunos.map((a, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(a.codigo || '-')}</td>
                <td>${escapeHtml(a.nome)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p class="total">Total de alunos: ${alunos.length}</p>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const seriesUnicas = [...new Set(turmas.map(t => t.serie))].sort()

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
                {/* Linha da turma */}
                <div className="flex items-center gap-3 p-4">
                  <button
                    onClick={() => toggleExpandir(turma.id)}
                    className="flex-shrink-0 text-gray-500 hover:text-indigo-600 transition-colors"
                    title="Ver alunos"
                  >
                    {turmaExpandida === turma.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>

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

                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>{turma.total_alunos}</span>
                  </div>

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

                {/* Painel expandido com alunos */}
                {turmaExpandida === turma.id && (
                  <div className="border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-4">
                    {carregandoAlunos ? (
                      <div className="flex justify-center py-4">
                        <LoadingSpinner />
                      </div>
                    ) : detalhesTurma && detalhesTurma.alunos.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Alunos ({detalhesTurma.total})
                          </h3>
                          <button
                            onClick={handleImprimir}
                            className="flex items-center gap-1.5 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Imprimir Relação
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                <th className="pb-2 pr-4 w-10">#</th>
                                <th className="pb-2 pr-4">Código</th>
                                <th className="pb-2">Nome</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                              {detalhesTurma.alunos.map((aluno, idx) => (
                                <tr key={aluno.id} className="text-gray-700 dark:text-gray-300">
                                  <td className="py-1.5 pr-4 text-gray-400">{idx + 1}</td>
                                  <td className="py-1.5 pr-4 font-mono text-xs">{aluno.codigo || '-'}</td>
                                  <td className="py-1.5">{aluno.nome}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        Nenhum aluno matriculado nesta turma.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal CRUD */}
        {mostrarModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
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
      </div>
    </ProtectedRoute>
  )
}
