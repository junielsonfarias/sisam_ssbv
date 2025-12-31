'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import ModalAluno from '@/components/modal-aluno'
import ModalHistoricoAluno from '@/components/modal-historico-aluno'
import { useEffect, useState, useMemo } from 'react'
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react'

interface Aluno {
  id: string
  codigo: string | null
  nome: string
  escola_id: string
  turma_id: string | null
  serie: string | null
  ano_letivo: string | null
  ativo: boolean
  escola_nome?: string
  polo_nome?: string
  turma_codigo?: string
  turma_nome?: string
}

const SERIES_DISPONIVEIS = ['6º Ano', '7º Ano', '8º Ano', '9º Ano']

const normalizarSerie = (serie: string | null | undefined): string => {
  if (!serie) return ''
  const trim = serie.trim()
  if (SERIES_DISPONIVEIS.includes(trim)) return trim
  const match = trim.match(/^(\d+)/)
  if (match) {
    const num = parseInt(match[1])
    if (num >= 6 && num <= 9) return `${num}º Ano`
  }
  return ''
}

const formDataInicial = {
  codigo: '',
  nome: '',
  polo_id: '',
  escola_id: '',
  turma_id: '',
  serie: '',
  ano_letivo: new Date().getFullYear().toString(),
}

export default function AlunosPage() {
  const [tipoUsuario, setTipoUsuario] = useState<string>('admin')
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [polos, setPolos] = useState<any[]>([])
  const [escolas, setEscolas] = useState<any[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroPolo, setFiltroPolo] = useState('')
  const [filtroEscola, setFiltroEscola] = useState('')
  const [filtroTurma, setFiltroTurma] = useState('')
  const [filtroSerie, setFiltroSerie] = useState('')
  const [filtroAno, setFiltroAno] = useState('')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [alunoEditando, setAlunoEditando] = useState<Aluno | null>(null)
  const [formData, setFormData] = useState(formDataInicial)
  const [salvando, setSalvando] = useState(false)
  const [mostrarModalHistorico, setMostrarModalHistorico] = useState(false)
  const [historicoAluno, setHistoricoAluno] = useState<any>(null)
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)

  useEffect(() => {
    const carregarTipoUsuario = async () => {
      try {
        const response = await fetch('/api/auth/verificar')
        const data = await response.json()
        if (data.usuario) {
          const tipo = data.usuario.tipo_usuario === 'administrador' ? 'admin' : data.usuario.tipo_usuario
          setTipoUsuario(tipo)
        }
      } catch (error) {
        console.error('Erro ao carregar tipo de usuário:', error)
      }
    }
    carregarTipoUsuario()
    fetch('/api/admin/polos').then(r => r.json()).then(setPolos).finally(() => setCarregando(false))
  }, [])

  useEffect(() => {
    if (filtroPolo) {
      fetch(`/api/admin/escolas?polo_id=${filtroPolo}`)
        .then(r => r.json())
        .then(setEscolas)
        .catch(() => setEscolas([]))
    } else {
      setEscolas([])
      setFiltroEscola('')
    }
  }, [filtroPolo])

  useEffect(() => {
    if (filtroEscola) {
      fetch(`/api/admin/turmas?escolas_ids=${filtroEscola}`)
        .then(r => r.json())
        .then(setTurmas)
        .catch(() => setTurmas([]))
    } else {
      setTurmas([])
      setFiltroTurma('')
    }
  }, [filtroEscola])

  useEffect(() => {
    carregarAlunos()
  }, [busca, filtroPolo, filtroEscola, filtroTurma, filtroSerie, filtroAno, escolas])

  const carregarAlunos = async () => {
    try {
      const params = new URLSearchParams()
      if (filtroEscola) params.append('escola_id', filtroEscola)
      if (filtroTurma) params.append('turma_id', filtroTurma)
      if (filtroSerie) params.append('serie', filtroSerie)
      if (filtroAno) params.append('ano_letivo', filtroAno)
      if (busca) params.append('busca', busca)

      const data = await fetch(`/api/admin/alunos?${params}`).then(r => r.json())
      const alunosFiltrados = filtroPolo
        ? data.filter((a: Aluno) => escolas.some(e => e.id === a.escola_id && e.polo_id === filtroPolo))
        : data
      setAlunos(alunosFiltrados)
    } catch (error) {
      console.error('Erro ao carregar alunos:', error)
    }
  }

  const handleAbrirModal = async (aluno?: Aluno) => {
    if (aluno) {
      setAlunoEditando(aluno)
      setMostrarModal(true)
      setFormData({
        codigo: aluno.codigo || '',
        nome: aluno.nome,
        polo_id: '',
        escola_id: aluno.escola_id,
        turma_id: aluno.turma_id || '',
        serie: '',
        ano_letivo: aluno.ano_letivo || new Date().getFullYear().toString(),
      })

      try {
        const escolaData = await fetch(`/api/admin/escolas?id=${aluno.escola_id}`).then(r => r.json())
        if (escolaData[0]?.polo_id) {
          await carregarEscolas(escolaData[0].polo_id)
          await carregarTurmas(aluno.escola_id)
          setFormData(prev => ({
            ...prev,
            polo_id: escolaData[0].polo_id,
            serie: normalizarSerie(aluno.serie),
          }))
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      }
    } else {
      setAlunoEditando(null)
      setFormData(formDataInicial)
      setEscolas([])
      setTurmas([])
      setMostrarModal(true)
    }
  }

  const carregarEscolas = async (poloId: string) => {
    const data = await fetch(`/api/admin/escolas?polo_id=${poloId}`).then(r => r.json())
    setEscolas(data)
  }

  const carregarTurmas = async (escolaId: string) => {
    const data = await fetch(`/api/admin/turmas?escolas_ids=${escolaId}`).then(r => r.json())
    setTurmas(data)
  }

  const handleSalvar = async () => {
    if (!formData.nome || !formData.escola_id) {
      alert('Nome e escola são obrigatórios')
      return
    }

    setSalvando(true)
    try {
      const body = alunoEditando ? { id: alunoEditando.id, ...formData } : formData
      const response = await fetch('/api/admin/alunos', {
        method: alunoEditando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (response.ok) {
        await carregarAlunos()
        setMostrarModal(false)
        setAlunoEditando(null)
        setFormData(formDataInicial)
      } else {
        alert(data.mensagem || 'Erro ao salvar aluno')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro ao salvar aluno')
    } finally {
      setSalvando(false)
    }
  }

  const handleVisualizarHistorico = async (aluno: Aluno) => {
    setCarregandoHistorico(true)
    setMostrarModalHistorico(true)
    setHistoricoAluno(null)

    try {
      const response = await fetch(`/api/admin/alunos/historico?aluno_nome=${encodeURIComponent(aluno.nome)}`)
      const data = await response.json()
      if (response.ok) {
        setHistoricoAluno(data)
      } else {
        alert(data.mensagem || 'Erro ao carregar histórico')
        setMostrarModalHistorico(false)
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
      alert('Erro ao carregar histórico')
      setMostrarModalHistorico(false)
    } finally {
      setCarregandoHistorico(false)
    }
  }

  const handleExcluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) return

    try {
      const response = await fetch(`/api/admin/alunos?id=${id}`, { method: 'DELETE' })
      const data = await response.json()
      if (response.ok) {
        await carregarAlunos()
      } else {
        alert(data.mensagem || 'Erro ao excluir')
      }
    } catch (error) {
      console.error('Erro ao excluir:', error)
      alert('Erro ao excluir aluno')
    }
  }

  const anosDisponiveis = useMemo(
    () => [...new Set(alunos.map(a => a.ano_letivo).filter((ano): ano is string => Boolean(ano)))].sort().reverse(),
    [alunos]
  )

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <LayoutDashboard tipoUsuario={tipoUsuario}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Gestão de Alunos</h1>
            <button
              onClick={() => handleAbrirModal()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Novo Aluno
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar aluno..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                />
              </div>

              <select
                value={filtroPolo}
                onChange={(e) => {
                  setFiltroPolo(e.target.value)
                  setFiltroEscola('')
                  setFiltroTurma('')
                  if (e.target.value) carregarEscolas(e.target.value)
                  else setEscolas([])
                }}
                className="select-custom w-full"
              >
                <option value="">Todos os polos</option>
                {polos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>

              <select
                value={filtroEscola}
                onChange={(e) => {
                  setFiltroEscola(e.target.value)
                  setFiltroTurma('')
                }}
                className="select-custom w-full"
                disabled={!filtroPolo}
              >
                <option value="">Todas as escolas</option>
                {escolas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>

              <select
                value={filtroTurma}
                onChange={(e) => setFiltroTurma(e.target.value)}
                className="select-custom w-full"
                disabled={!filtroEscola}
              >
                <option value="">Todas as turmas</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>{t.codigo} - {t.nome || ''}</option>
                ))}
              </select>

              <select
                value={filtroSerie}
                onChange={(e) => setFiltroSerie(e.target.value)}
                className="select-custom w-full"
              >
                <option value="">Todas as séries</option>
                {SERIES_DISPONIVEIS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={filtroAno}
                onChange={(e) => setFiltroAno(e.target.value)}
                className="select-custom w-full"
              >
                <option value="">Todos os anos</option>
                {anosDisponiveis.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {carregando ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Carregando alunos...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Código', 'Nome', 'Polo', 'Escola', 'Turma', 'Série', 'Ano Letivo', 'Ações'].map((h) => (
                        <th key={h} className="text-left py-4 px-6 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {alunos.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-500">
                          <p className="text-lg font-medium">Nenhum aluno encontrado</p>
                          <p className="text-sm">Tente ajustar os filtros de busca</p>
                        </td>
                      </tr>
                    ) : (
                      alunos.map((aluno) => (
                        <tr key={aluno.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-6">
                            <span className="font-mono text-sm text-gray-900">{aluno.codigo || '-'}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-gray-900 font-medium">{aluno.nome}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-gray-700">{aluno.polo_nome || '-'}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-gray-700">{aluno.escola_nome || '-'}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-gray-700">{aluno.turma_codigo || '-'}</span>
                          </td>
                          <td className="py-4 px-6">
                            {aluno.serie ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {aluno.serie}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-gray-700">{aluno.ano_letivo || '-'}</span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleVisualizarHistorico(aluno)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Visualizar Histórico"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleAbrirModal(aluno)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleExcluir(aluno.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <ModalAluno
            mostrar={mostrarModal}
            alunoEditando={alunoEditando}
            formData={formData}
            setFormData={setFormData}
            polos={polos}
            escolas={escolas}
            turmas={turmas}
            seriesDisponiveis={SERIES_DISPONIVEIS}
            salvando={salvando}
            onClose={() => {
              setMostrarModal(false)
              setAlunoEditando(null)
              setFormData(formDataInicial)
            }}
            onSalvar={handleSalvar}
            onPoloChange={carregarEscolas}
            onEscolaChange={carregarTurmas}
          />

          <ModalHistoricoAluno
            mostrar={mostrarModalHistorico}
            historico={historicoAluno}
            carregando={carregandoHistorico}
            onClose={() => setMostrarModalHistorico(false)}
          />
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}
