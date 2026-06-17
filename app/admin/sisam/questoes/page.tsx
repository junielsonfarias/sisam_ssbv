'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useMemo } from 'react'
import { Plus, Settings, Check, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/toast'
import FiltrosQuestoes from './components/FiltrosQuestoes'
import TabelaQuestoes from './components/TabelaQuestoes'
import ModalQuestao from './components/ModalQuestao'

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

  useEffect(() => { carregarDados() }, [])

  const carregarDados = async () => {
    try {
      const [questoesRes, configRes] = await Promise.all([
        fetch('/api/admin/questoes'),
        fetch('/api/admin/configuracao-series')
      ])
      const questoesData = await questoesRes.json()
      const configData = await configRes.json()
      if (Array.isArray(questoesData)) setQuestoes(questoesData)
      if (configData.series && Array.isArray(configData.series)) setConfigSeries(configData.series)
    } catch (error) {
      // silencioso
    } finally {
      setCarregando(false)
    }
  }

  // Estatísticas por série
  const estatisticasPorSerie = useMemo(() => {
    const questoesPorSerie: Record<string, Questao[]> = {}
    configSeries.forEach(config => { questoesPorSerie[config.serie] = [] })
    questoes.forEach(questao => {
      const serie = questao.serie_aplicavel?.match(/(\d+)/)?.[1] || 'sem_serie'
      if (!questoesPorSerie[serie]) questoesPorSerie[serie] = []
      questoesPorSerie[serie].push(questao)
    })

    const stats: Record<string, { objetivas: number; config?: ConfiguracaoSerie }> = {}
    configSeries.forEach(config => {
      const questoesSerie = questoesPorSerie[config.serie] || []
      stats[config.serie] = {
        objetivas: questoesSerie.filter(q => q.tipo_questao === 'objetiva').length,
        config
      }
    })
    return stats
  }, [questoes, configSeries])

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
    if (filtroSerie) filtradas = filtradas.filter(q => q.serie_aplicavel?.match(/(\d+)/)?.[1] === filtroSerie)
    if (filtroTipo) filtradas = filtradas.filter(q => q.tipo_questao === filtroTipo)
    if (filtroDisciplina) filtradas = filtradas.filter(q => q.disciplina?.toLowerCase().includes(filtroDisciplina.toLowerCase()))
    return filtradas
  }, [questoes, busca, filtroSerie, filtroTipo, filtroDisciplina])

  const resetForm = () => {
    setFormData({ codigo: '', descricao: '', disciplina: '', area_conhecimento: '', dificuldade: '', gabarito: '', serie_aplicavel: '', tipo_questao: 'objetiva' })
  }

  const handleAbrirModal = (questao?: Questao) => {
    if (questao) {
      setQuestaoEditando(questao)
      setFormData({
        codigo: questao.codigo || '', descricao: questao.descricao || '', disciplina: questao.disciplina || '',
        area_conhecimento: questao.area_conhecimento || '', dificuldade: questao.dificuldade || '',
        gabarito: questao.gabarito || '', serie_aplicavel: questao.serie_aplicavel || '', tipo_questao: questao.tipo_questao || 'objetiva',
      })
    } else {
      setQuestaoEditando(null)
      resetForm()
    }
    setMostrarModal(true)
  }

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      const method = questaoEditando ? 'PUT' : 'POST'
      const body = questaoEditando ? { id: questaoEditando.id, ...formData } : formData
      const response = await fetch('/api/admin/questoes', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
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
      toast.error('Erro ao salvar questão')
    } finally {
      setSalvando(false)
    }
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
      toast.error('Erro ao excluir questão')
    }
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
            <Link href="/admin/configuracao-series"
              className="flex items-center gap-2 px-4 py-2 border border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
              <Settings className="w-4 h-4" /> Configurar Séries
            </Link>
            <button onClick={() => handleAbrirModal()}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
              <Plus className="w-4 h-4" /> Nova Questão
            </button>
          </div>
        </div>

        {/* Cards de Resumo por Série */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {configSeries.map(config => {
            const stats = estatisticasPorSerie[config.serie]
            const completo = stats?.objetivas >= config.total_questoes_objetivas
            return (
              <div key={config.id}
                className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-slate-900/50 border-2 p-4 cursor-pointer hover:shadow-md transition-all ${
                  filtroSerie === config.serie ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 dark:border-slate-700'
                }`}
                onClick={() => setFiltroSerie(filtroSerie === config.serie ? '' : config.serie)}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      completo ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300'
                    }`}>{config.serie}&#186;</div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{config.nome_serie}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        config.tem_producao_textual ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                      }`}>{config.tem_producao_textual ? 'Anos Iniciais' : 'Anos Finais'}</span>
                    </div>
                  </div>
                  {completo ? <Check className="w-5 h-5 text-green-600 dark:text-green-400" /> : <AlertCircle className="w-5 h-5 text-orange-500 dark:text-orange-400" />}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Questões Objetivas:</span>
                    <span className={`font-bold ${stats?.objetivas >= config.total_questoes_objetivas ? 'text-green-600' : 'text-orange-600'}`}>
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
                    <div className={`h-2 rounded-full transition-all ${completo ? 'bg-green-500' : 'bg-orange-500'}`}
                      style={{ width: `${Math.min((stats?.objetivas || 0) / config.total_questoes_objetivas * 100, 100)}%` }}></div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Filtros */}
        <FiltrosQuestoes
          busca={busca} onBuscaChange={setBusca}
          filtroSerie={filtroSerie} onFiltroSerieChange={setFiltroSerie}
          filtroDisciplina={filtroDisciplina} onFiltroDisciplinaChange={setFiltroDisciplina}
          filtroTipo={filtroTipo} onFiltroTipoChange={setFiltroTipo}
          configSeries={configSeries}
          totalFiltradas={questoesFiltradas.length} totalQuestoes={questoes.length}
          onLimparFiltros={() => { setBusca(''); setFiltroSerie(''); setFiltroTipo(''); setFiltroDisciplina('') }}
        />

        {/* Tabela */}
        <TabelaQuestoes
          questoes={questoesFiltradas}
          carregando={carregando}
          onEditar={handleAbrirModal}
          onExcluir={handleExcluir}
        />

        {/* Modal */}
        {mostrarModal && (
          <ModalQuestao
            editando={!!questaoEditando}
            formData={formData}
            onFormDataChange={setFormData}
            configSeries={configSeries}
            salvando={salvando}
            onSalvar={handleSalvar}
            onFechar={() => setMostrarModal(false)}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}
