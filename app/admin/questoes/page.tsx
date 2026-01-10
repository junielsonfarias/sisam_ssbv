'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useMemo } from 'react'
import { Plus, Edit, Trash2, Search, X, Calendar, FileText, BookOpen, Settings, ChevronDown, ChevronUp, AlertCircle, Check } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/toast'

interface Questao {
  id: string
  codigo: string | null
  descricao: string | null
  disciplina: string | null
  area_conhecimento: string | null
  dificuldade: string | null
  gabarito: string | null
  serie_aplicavel: string | null
  tipo_questao: string | null
  numero_questao: number | null
  criado_em: Date
}

interface ConfiguracaoSerie {
  id: string
  serie: string
  nome_serie: string
  qtd_questoes_lp: number
  qtd_questoes_mat: number
  qtd_questoes_ch: number
  qtd_questoes_cn: number
  total_questoes_objetivas: number
  tem_producao_textual: boolean
  qtd_itens_producao: number
  avalia_lp: boolean
  avalia_mat: boolean
  avalia_ch: boolean
  avalia_cn: boolean
}

export default function QuestoesPage() {
  const toast = useToast()
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [configSeries, setConfigSeries] = useState<ConfiguracaoSerie[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroSerie, setFiltroSerie] = useState<string>('')
  const [filtroTipo, setFiltroTipo] = useState<string>('')
  const [filtroDisciplina, setFiltroDisciplina] = useState<string>('')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [questaoEditando, setQuestaoEditando] = useState<Questao | null>(null)
  const [formData, setFormData] = useState({
    codigo: '',
    descricao: '',
    disciplina: '',
    area_conhecimento: '',
    dificuldade: '',
    gabarito: '',
    serie_aplicavel: '',
    tipo_questao: 'objetiva',
  })
  const [salvando, setSalvando] = useState(false)
  const [secaoExpandida, setSecaoExpandida] = useState<string | null>(null)
  const [visualizacao, setVisualizacao] = useState<'serie' | 'lista'>('serie')

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      const [questoesRes, configRes] = await Promise.all([
        fetch('/api/admin/questoes'),
        fetch('/api/admin/configuracao-series')
      ])

      const questoesData = await questoesRes.json()
      const configData = await configRes.json()

      if (Array.isArray(questoesData)) {
        setQuestoes(questoesData)
      }

      if (configData.series && Array.isArray(configData.series)) {
        setConfigSeries(configData.series)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setCarregando(false)
    }
  }

  // Agrupar questões por série
  const questoesPorSerie = useMemo(() => {
    const grupos: Record<string, Questao[]> = {}

    // Inicializar grupos para todas as séries configuradas
    configSeries.forEach(config => {
      grupos[config.serie] = []
    })

    // Adicionar grupo para questões sem série
    grupos['sem_serie'] = []

    // Distribuir questões nos grupos
    questoes.forEach(questao => {
      const serie = questao.serie_aplicavel?.match(/(\d+)/)?.[1] || 'sem_serie'
      if (!grupos[serie]) {
        grupos[serie] = []
      }
      grupos[serie].push(questao)
    })

    return grupos
  }, [questoes, configSeries])

  // Estatísticas por série
  const estatisticasPorSerie = useMemo(() => {
    const stats: Record<string, {
      total: number
      objetivas: number
      discursivas: number
      lp: number
      mat: number
      ch: number
      cn: number
      config?: ConfiguracaoSerie
    }> = {}

    configSeries.forEach(config => {
      const questoesSerie = questoesPorSerie[config.serie] || []
      stats[config.serie] = {
        total: questoesSerie.length,
        objetivas: questoesSerie.filter(q => q.tipo_questao === 'objetiva').length,
        discursivas: questoesSerie.filter(q => q.tipo_questao === 'discursiva').length,
        lp: questoesSerie.filter(q => q.disciplina?.toLowerCase().includes('portugu')).length,
        mat: questoesSerie.filter(q => q.disciplina?.toLowerCase().includes('matem')).length,
        ch: questoesSerie.filter(q => q.disciplina?.toLowerCase().includes('humanas')).length,
        cn: questoesSerie.filter(q => q.disciplina?.toLowerCase().includes('natureza')).length,
        config
      }
    })

    return stats
  }, [questoesPorSerie, configSeries])

  const questoesFiltradas = useMemo(() => {
    let filtradas = questoes

    if (busca) {
      const buscaLower = busca.toLowerCase()
      filtradas = filtradas.filter(q =>
        q.codigo?.toLowerCase().includes(buscaLower) ||
        q.descricao?.toLowerCase().includes(buscaLower) ||
        q.disciplina?.toLowerCase().includes(buscaLower)
      )
    }

    if (filtroSerie) {
      filtradas = filtradas.filter(q => {
        const serieNum = q.serie_aplicavel?.match(/(\d+)/)?.[1]
        return serieNum === filtroSerie
      })
    }

    if (filtroTipo) {
      filtradas = filtradas.filter(q => q.tipo_questao === filtroTipo)
    }

    if (filtroDisciplina) {
      filtradas = filtradas.filter(q => q.disciplina?.toLowerCase().includes(filtroDisciplina.toLowerCase()))
    }

    return filtradas
  }, [questoes, busca, filtroSerie, filtroTipo, filtroDisciplina])

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      const url = '/api/admin/questoes'
      const method = questaoEditando ? 'PUT' : 'POST'

      const body = questaoEditando
        ? { id: questaoEditando.id, ...formData }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok) {
        await carregarDados()
        setMostrarModal(false)
        setQuestaoEditando(null)
        resetForm()
        toast.success(questaoEditando ? 'Questão atualizada com sucesso!' : 'Questão cadastrada com sucesso!')
      } else {
        toast.error(data.mensagem || 'Erro ao salvar questão')
      }
    } catch (error) {
      console.error('Erro ao salvar questão:', error)
      toast.error('Erro ao salvar questão')
    } finally {
      setSalvando(false)
    }
  }

  const resetForm = () => {
    setFormData({
      codigo: '',
      descricao: '',
      disciplina: '',
      area_conhecimento: '',
      dificuldade: '',
      gabarito: '',
      serie_aplicavel: '',
      tipo_questao: 'objetiva',
    })
  }

  const handleAbrirModal = (questao?: Questao) => {
    if (questao) {
      setQuestaoEditando(questao)
      setFormData({
        codigo: questao.codigo || '',
        descricao: questao.descricao || '',
        disciplina: questao.disciplina || '',
        area_conhecimento: questao.area_conhecimento || '',
        dificuldade: questao.dificuldade || '',
        gabarito: questao.gabarito || '',
        serie_aplicavel: questao.serie_aplicavel || '',
        tipo_questao: questao.tipo_questao || 'objetiva',
      })
    } else {
      setQuestaoEditando(null)
      resetForm()
    }
    setMostrarModal(true)
  }

  const handleExcluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta questão?')) return

    try {
      const response = await fetch(`/api/admin/questoes?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        await carregarDados()
        toast.success('Questão excluída com sucesso!')
      } else {
        const data = await response.json()
        toast.error(data.mensagem || 'Erro ao excluir questão')
      }
    } catch (error) {
      console.error('Erro ao excluir:', error)
      toast.error('Erro ao excluir questão')
    }
  }

  const getDisciplinaColor = (disciplina: string | null) => {
    if (!disciplina) return 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
    const disc = disciplina.toLowerCase()
    if (disc.includes('português') || disc.includes('língua')) return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
    if (disc.includes('matemática') || disc.includes('mat')) return 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200'
    if (disc.includes('humanas') || disc.includes('ch')) return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
    if (disc.includes('natureza') || disc.includes('cn')) return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200'
    return 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
  }

  const toggleSecao = (serie: string) => {
    setSecaoExpandida(secaoExpandida === serie ? null : serie)
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador']}>
        <div className="space-y-6">
          {/* Cabeçalho */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">Gestão de Questões</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie o banco de questões por série e disciplina</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin/configuracao-series"
                className="flex items-center gap-2 px-4 py-2 border border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Configurar Séries
              </Link>
              <button
                onClick={() => handleAbrirModal()}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nova Questão
              </button>
            </div>
          </div>

          {/* Cards de Resumo por Série */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {configSeries.map(config => {
              const stats = estatisticasPorSerie[config.serie]
              const completo = stats?.objetivas >= config.total_questoes_objetivas

              return (
                <div
                  key={config.id}
                  className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-slate-900/50 border-2 p-4 cursor-pointer hover:shadow-md transition-all ${
                    filtroSerie === config.serie ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 dark:border-slate-700'
                  }`}
                  onClick={() => setFiltroSerie(filtroSerie === config.serie ? '' : config.serie)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        completo ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300'
                      }`}>
                        {config.serie}º
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{config.nome_serie}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          config.tem_producao_textual
                            ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                            : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                        }`}>
                          {config.tem_producao_textual ? 'Anos Iniciais' : 'Anos Finais'}
                        </span>
                      </div>
                    </div>
                    {completo ? (
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Questões Objetivas:</span>
                      <span className={`font-bold ${
                        stats?.objetivas >= config.total_questoes_objetivas
                          ? 'text-green-600'
                          : 'text-orange-600'
                      }`}>
                        {stats?.objetivas || 0} / {config.total_questoes_objetivas}
                      </span>
                    </div>

                    {config.tem_producao_textual && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Itens Produção:</span>
                        <span className="font-bold text-gray-700 dark:text-gray-300">{config.qtd_itens_producao}</span>
                      </div>
                    )}

                    <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          completo ? 'bg-green-500' : 'bg-orange-500'
                        }`}
                        style={{
                          width: `${Math.min((stats?.objetivas || 0) / config.total_questoes_objetivas * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Filtros */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar questões..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <select
                value={filtroSerie}
                onChange={(e) => setFiltroSerie(e.target.value)}
                className="select-custom w-full"
              >
                <option value="">Todas as séries</option>
                {configSeries.map(config => (
                  <option key={config.id} value={config.serie}>
                    {config.nome_serie}
                  </option>
                ))}
              </select>

              <select
                value={filtroDisciplina}
                onChange={(e) => setFiltroDisciplina(e.target.value)}
                className="select-custom w-full"
              >
                <option value="">Todas as disciplinas</option>
                <option value="Língua Portuguesa">Língua Portuguesa</option>
                <option value="Matemática">Matemática</option>
                <option value="Ciências Humanas">Ciências Humanas</option>
                <option value="Ciências da Natureza">Ciências da Natureza</option>
              </select>

              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="select-custom w-full"
              >
                <option value="">Todos os tipos</option>
                <option value="objetiva">Objetiva</option>
                <option value="discursiva">Discursiva</option>
              </select>
            </div>

            {(busca || filtroSerie || filtroTipo || filtroDisciplina) && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {questoesFiltradas.length} de {questoes.length} questões
                </span>
                <button
                  onClick={() => { setBusca(''); setFiltroSerie(''); setFiltroTipo(''); setFiltroDisciplina(''); }}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>

          {/* Lista de Questões */}
          {carregando ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-4">Carregando questões...</p>
            </div>
          ) : questoesFiltradas.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Nenhuma questão encontrada</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Tente ajustar os filtros ou adicione novas questões</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px]">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm">Código</th>
                      <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm hidden md:table-cell">Descrição</th>
                      <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm">Disciplina</th>
                      <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm hidden sm:table-cell">Série</th>
                      <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm hidden lg:table-cell">Tipo</th>
                      <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm">Gab.</th>
                      <th className="text-right py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {questoesFiltradas.map((questao) => (
                      <tr key={questao.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="py-2 px-2 md:py-3 md:px-4">
                          <span className="font-mono font-semibold text-gray-900 dark:text-white text-xs md:text-sm">
                            {questao.codigo || '-'}
                          </span>
                        </td>
                        <td className="py-2 px-2 md:py-3 md:px-4 hidden md:table-cell">
                          <span className="text-gray-700 dark:text-gray-300 text-xs md:text-sm">
                            {questao.descricao
                              ? questao.descricao.length > 40
                                ? `${questao.descricao.substring(0, 40)}...`
                                : questao.descricao
                              : '-'}
                          </span>
                        </td>
                        <td className="py-2 px-2 md:py-3 md:px-4">
                          {questao.disciplina ? (
                            <span className={`inline-flex items-center px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${getDisciplinaColor(questao.disciplina)}`}>
                              {questao.disciplina}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2 md:py-3 md:px-4 text-center hidden sm:table-cell">
                          {questao.serie_aplicavel ? (
                            <span className="inline-flex items-center px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200">
                              {questao.serie_aplicavel}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2 md:py-3 md:px-4 text-center hidden lg:table-cell">
                          <span className={`inline-flex items-center px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${
                            questao.tipo_questao === 'objetiva'
                              ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                              : 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200'
                          }`}>
                            {questao.tipo_questao === 'objetiva' ? 'Obj' : 'Disc'}
                          </span>
                        </td>
                        <td className="py-2 px-2 md:py-3 md:px-4 text-center">
                          {questao.gabarito ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 font-bold text-xs md:text-sm">
                              {questao.gabarito}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2 md:py-3 md:px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleAbrirModal(questao)}
                              className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleExcluir(questao.id)}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal de Cadastro/Edição */}
          {mostrarModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
                <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80" onClick={() => setMostrarModal(false)}></div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl dark:shadow-slate-900/50 max-w-2xl w-full relative z-10 max-h-[90vh] overflow-y-auto">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {questaoEditando ? 'Editar Questão' : 'Nova Questão'}
                      </h3>
                      <button onClick={() => setMostrarModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400">
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código</label>
                        <input
                          type="text"
                          value={formData.codigo}
                          onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          placeholder="Ex: Q1, Q2..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Série Aplicável</label>
                        <select
                          value={formData.serie_aplicavel}
                          onChange={(e) => setFormData({ ...formData, serie_aplicavel: e.target.value })}
                          className="select-custom w-full"
                        >
                          <option value="">Selecione a série</option>
                          {configSeries.map(config => (
                            <option key={config.id} value={config.nome_serie}>
                              {config.nome_serie}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                      <textarea
                        value={formData.descricao}
                        onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        placeholder="Descrição da questão"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Questão</label>
                        <select
                          value={formData.tipo_questao}
                          onChange={(e) => setFormData({ ...formData, tipo_questao: e.target.value })}
                          className="select-custom w-full"
                        >
                          <option value="objetiva">Objetiva</option>
                          <option value="discursiva">Discursiva</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Disciplina</label>
                        <select
                          value={formData.disciplina}
                          onChange={(e) => setFormData({ ...formData, disciplina: e.target.value, area_conhecimento: e.target.value })}
                          className="select-custom w-full"
                        >
                          <option value="">Selecione</option>
                          <option value="Língua Portuguesa">Língua Portuguesa</option>
                          <option value="Matemática">Matemática</option>
                          <option value="Ciências Humanas">Ciências Humanas</option>
                          <option value="Ciências da Natureza">Ciências da Natureza</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dificuldade</label>
                        <select
                          value={formData.dificuldade}
                          onChange={(e) => setFormData({ ...formData, dificuldade: e.target.value })}
                          className="select-custom w-full"
                        >
                          <option value="">Selecione</option>
                          <option value="Fácil">Fácil</option>
                          <option value="Média">Média</option>
                          <option value="Difícil">Difícil</option>
                        </select>
                      </div>
                      {formData.tipo_questao === 'objetiva' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gabarito</label>
                          <select
                            value={formData.gabarito}
                            onChange={(e) => setFormData({ ...formData, gabarito: e.target.value })}
                            className="select-custom w-full"
                          >
                            <option value="">Selecione</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                            <option value="E">E</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
                    <button
                      onClick={() => setMostrarModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSalvar}
                      disabled={salvando}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {salvando ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
    </ProtectedRoute>
  )
}
