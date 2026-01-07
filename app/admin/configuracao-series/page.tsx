'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useEffect, useState } from 'react'
import { Settings, Save, Plus, X, BookOpen, Trash2, GripVertical, Check, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react'

interface Disciplina {
  id?: string
  disciplina: string
  sigla: string
  ordem: number
  questao_inicio: number
  questao_fim: number
  qtd_questoes: number
  valor_questao: number
  nota_maxima: number
}

interface ConfiguracaoSerie {
  id: string
  serie: string
  nome_serie: string
  tipo_ensino: 'anos_iniciais' | 'anos_finais'
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
  usa_nivel_aprendizagem: boolean
  ativo: boolean
  disciplinas?: Disciplina[]
}

const DISCIPLINAS_DISPONIVEIS = [
  { nome: 'Língua Portuguesa', sigla: 'LP', cor: 'blue' },
  { nome: 'Matemática', sigla: 'MAT', cor: 'purple' },
  { nome: 'Ciências Humanas', sigla: 'CH', cor: 'green' },
  { nome: 'Ciências da Natureza', sigla: 'CN', cor: 'yellow' },
]

// Configuração padrão de disciplinas por série (hardcoded)
const DISCIPLINAS_PADRAO_POR_SERIE: Record<string, Disciplina[]> = {
  '2': [
    { disciplina: 'Língua Portuguesa', sigla: 'LP', ordem: 1, questao_inicio: 1, questao_fim: 14, qtd_questoes: 14, valor_questao: 0.71, nota_maxima: 10 },
    { disciplina: 'Matemática', sigla: 'MAT', ordem: 2, questao_inicio: 15, questao_fim: 28, qtd_questoes: 14, valor_questao: 0.71, nota_maxima: 10 }
  ],
  '3': [
    { disciplina: 'Língua Portuguesa', sigla: 'LP', ordem: 1, questao_inicio: 1, questao_fim: 14, qtd_questoes: 14, valor_questao: 0.71, nota_maxima: 10 },
    { disciplina: 'Matemática', sigla: 'MAT', ordem: 2, questao_inicio: 15, questao_fim: 28, qtd_questoes: 14, valor_questao: 0.71, nota_maxima: 10 }
  ],
  '5': [
    { disciplina: 'Língua Portuguesa', sigla: 'LP', ordem: 1, questao_inicio: 1, questao_fim: 14, qtd_questoes: 14, valor_questao: 0.71, nota_maxima: 10 },
    { disciplina: 'Matemática', sigla: 'MAT', ordem: 2, questao_inicio: 15, questao_fim: 34, qtd_questoes: 20, valor_questao: 0.50, nota_maxima: 10 }
  ],
  '8': [
    { disciplina: 'Língua Portuguesa', sigla: 'LP', ordem: 1, questao_inicio: 1, questao_fim: 20, qtd_questoes: 20, valor_questao: 0.50, nota_maxima: 10 },
    { disciplina: 'Ciências Humanas', sigla: 'CH', ordem: 2, questao_inicio: 21, questao_fim: 30, qtd_questoes: 10, valor_questao: 1.00, nota_maxima: 10 },
    { disciplina: 'Matemática', sigla: 'MAT', ordem: 3, questao_inicio: 31, questao_fim: 50, qtd_questoes: 20, valor_questao: 0.50, nota_maxima: 10 },
    { disciplina: 'Ciências da Natureza', sigla: 'CN', ordem: 4, questao_inicio: 51, questao_fim: 60, qtd_questoes: 10, valor_questao: 1.00, nota_maxima: 10 }
  ],
  '9': [
    { disciplina: 'Língua Portuguesa', sigla: 'LP', ordem: 1, questao_inicio: 1, questao_fim: 20, qtd_questoes: 20, valor_questao: 0.50, nota_maxima: 10 },
    { disciplina: 'Ciências Humanas', sigla: 'CH', ordem: 2, questao_inicio: 21, questao_fim: 30, qtd_questoes: 10, valor_questao: 1.00, nota_maxima: 10 },
    { disciplina: 'Matemática', sigla: 'MAT', ordem: 3, questao_inicio: 31, questao_fim: 50, qtd_questoes: 20, valor_questao: 0.50, nota_maxima: 10 },
    { disciplina: 'Ciências da Natureza', sigla: 'CN', ordem: 4, questao_inicio: 51, questao_fim: 60, qtd_questoes: 10, valor_questao: 1.00, nota_maxima: 10 }
  ]
}

export default function ConfiguracaoSeriesPage() {
  const [series, setSeries] = useState<ConfiguracaoSerie[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState<string | null>(null)
  const [editandoSerie, setEditandoSerie] = useState<string | null>(null)
  const [disciplinasEditando, setDisciplinasEditando] = useState<Disciplina[]>([])
  const [mostrarNovaSerieModal, setMostrarNovaSerieModal] = useState(false)
  const [novaSerieData, setNovaSerieData] = useState({
    serie: '',
    nome_serie: '',
    tipo_ensino: 'anos_iniciais' as 'anos_iniciais' | 'anos_finais',
    tem_producao_textual: false,
    qtd_itens_producao: 8,
    usa_nivel_aprendizagem: false,
    disciplinas: [] as Disciplina[]
  })
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null)
  const [excluindoSerie, setExcluindoSerie] = useState<string | null>(null)
  const [confirmarExclusao, setConfirmarExclusao] = useState<ConfiguracaoSerie | null>(null)

  useEffect(() => {
    carregarSeries()
  }, [])

  const carregarSeries = async () => {
    try {
      const [seriesRes, disciplinasRes] = await Promise.all([
        fetch('/api/admin/configuracao-series'),
        fetch('/api/admin/configuracao-series/disciplinas')
      ])

      const seriesData = await seriesRes.json()
      const disciplinasData = await disciplinasRes.json()

      if (seriesData.series) {
        // Merge disciplinas into series (com fallback para valores padrão)
        const seriesComDisciplinas = seriesData.series.map((s: ConfiguracaoSerie) => {
          const discData = disciplinasData.find((d: any) => d.serie_id === s.id)
          const disciplinasBanco = discData?.disciplinas || []

          // Se não tem disciplinas no banco ou tem valores incorretos, usar padrão
          let disciplinasFinais = disciplinasBanco
          if (disciplinasBanco.length === 0 && DISCIPLINAS_PADRAO_POR_SERIE[s.serie]) {
            disciplinasFinais = DISCIPLINAS_PADRAO_POR_SERIE[s.serie]
          }

          return {
            ...s,
            disciplinas: disciplinasFinais
          }
        })
        setSeries(seriesComDisciplinas)
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar configurações' })
    } finally {
      setCarregando(false)
    }
  }

  const handleEditarDisciplinas = async (config: ConfiguracaoSerie) => {
    // Buscar disciplinas atuais
    try {
      const response = await fetch(`/api/admin/configuracao-series/disciplinas?serie_id=${config.id}`)
      const disciplinas = await response.json()

      // Se tem disciplinas no banco, usar elas; senão, usar o padrão
      if (disciplinas.length > 0) {
        setDisciplinasEditando(disciplinas)
      } else if (DISCIPLINAS_PADRAO_POR_SERIE[config.serie]) {
        // Usar configuração padrão para a série
        setDisciplinasEditando([...DISCIPLINAS_PADRAO_POR_SERIE[config.serie]])
      } else {
        setDisciplinasEditando([])
      }
      setEditandoSerie(config.id)
    } catch (error) {
      console.error('Erro ao buscar disciplinas:', error)
      // Em caso de erro, usar configuração padrão
      if (DISCIPLINAS_PADRAO_POR_SERIE[config.serie]) {
        setDisciplinasEditando([...DISCIPLINAS_PADRAO_POR_SERIE[config.serie]])
      } else {
        setDisciplinasEditando([])
      }
      setEditandoSerie(config.id)
    }
  }

  const handleAdicionarDisciplina = (isNewSerie = false) => {
    const disciplinas = isNewSerie ? novaSerieData.disciplinas : disciplinasEditando
    const setDisciplinas = isNewSerie
      ? (d: Disciplina[]) => setNovaSerieData({ ...novaSerieData, disciplinas: d })
      : setDisciplinasEditando

    // Encontrar próxima questão disponível
    const ultimaQuestao = disciplinas.length > 0
      ? Math.max(...disciplinas.map(d => d.questao_fim))
      : 0

    const novaDisciplina: Disciplina = {
      disciplina: '',
      sigla: '',
      ordem: disciplinas.length + 1,
      questao_inicio: ultimaQuestao + 1,
      questao_fim: ultimaQuestao + 10,
      qtd_questoes: 10,
      valor_questao: 1.00,
      nota_maxima: 10
    }

    setDisciplinas([...disciplinas, novaDisciplina])
  }

  const handleRemoverDisciplina = (index: number, isNewSerie = false) => {
    const disciplinas = isNewSerie ? novaSerieData.disciplinas : disciplinasEditando
    const setDisciplinas = isNewSerie
      ? (d: Disciplina[]) => setNovaSerieData({ ...novaSerieData, disciplinas: d })
      : setDisciplinasEditando

    const novaLista = disciplinas.filter((_, i) => i !== index)
    // Reordenar
    novaLista.forEach((d, i) => d.ordem = i + 1)
    setDisciplinas(novaLista)
  }

  const handleMoverDisciplina = (index: number, direcao: 'up' | 'down', isNewSerie = false) => {
    const disciplinas = isNewSerie ? novaSerieData.disciplinas : disciplinasEditando
    const setDisciplinas = isNewSerie
      ? (d: Disciplina[]) => setNovaSerieData({ ...novaSerieData, disciplinas: d })
      : setDisciplinasEditando

    if ((direcao === 'up' && index === 0) || (direcao === 'down' && index === disciplinas.length - 1)) {
      return
    }

    const novaLista = [...disciplinas]
    const newIndex = direcao === 'up' ? index - 1 : index + 1
    const temp = novaLista[index]
    novaLista[index] = novaLista[newIndex]
    novaLista[newIndex] = temp

    // Recalcular ordens e questões
    let questaoAtual = 1
    novaLista.forEach((d, i) => {
      d.ordem = i + 1
      d.questao_inicio = questaoAtual
      d.questao_fim = questaoAtual + d.qtd_questoes - 1
      questaoAtual = d.questao_fim + 1
    })

    setDisciplinas(novaLista)
  }

  const handleAtualizarDisciplina = (index: number, campo: keyof Disciplina, valor: any, isNewSerie = false) => {
    const disciplinas = isNewSerie ? novaSerieData.disciplinas : disciplinasEditando
    const setDisciplinas = isNewSerie
      ? (d: Disciplina[]) => setNovaSerieData({ ...novaSerieData, disciplinas: d })
      : setDisciplinasEditando

    const novaLista = [...disciplinas]
    novaLista[index] = { ...novaLista[index], [campo]: valor }

    // Se mudou qtd_questoes, recalcular questao_fim e valor_questao
    if (campo === 'qtd_questoes') {
      novaLista[index].questao_fim = novaLista[index].questao_inicio + valor - 1
      novaLista[index].valor_questao = parseFloat((10 / valor).toFixed(2))

      // Recalcular as próximas disciplinas
      for (let i = index + 1; i < novaLista.length; i++) {
        novaLista[i].questao_inicio = novaLista[i - 1].questao_fim + 1
        novaLista[i].questao_fim = novaLista[i].questao_inicio + novaLista[i].qtd_questoes - 1
      }
    }

    // Se selecionou uma disciplina do dropdown
    if (campo === 'sigla') {
      const disc = DISCIPLINAS_DISPONIVEIS.find(d => d.sigla === valor)
      if (disc) {
        novaLista[index].disciplina = disc.nome
        novaLista[index].sigla = disc.sigla
      }
    }

    setDisciplinas(novaLista)
  }

  const handleSalvarDisciplinas = async (serieId: string) => {
    setSalvando(serieId)
    try {
      const response = await fetch('/api/admin/configuracao-series/disciplinas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serie_id: serieId,
          disciplinas: disciplinasEditando
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMensagem({ tipo: 'sucesso', texto: 'Disciplinas atualizadas com sucesso!' })
        await carregarSeries()
        setEditandoSerie(null)
        setDisciplinasEditando([])
      } else {
        setMensagem({ tipo: 'erro', texto: data.mensagem || 'Erro ao salvar' })
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar disciplinas' })
    } finally {
      setSalvando(null)
    }
  }

  const handleAtualizarTipoEnsino = async (serieId: string, tipoEnsino: string) => {
    try {
      const response = await fetch('/api/admin/configuracao-series', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: serieId,
          tipo_ensino: tipoEnsino
        }),
      })

      if (response.ok) {
        await carregarSeries()
        setMensagem({ tipo: 'sucesso', texto: 'Tipo de ensino atualizado!' })
      }
    } catch (error) {
      console.error('Erro ao atualizar tipo de ensino:', error)
    }
  }

  const handleCriarSerie = async () => {
    if (!novaSerieData.serie || !novaSerieData.nome_serie) {
      setMensagem({ tipo: 'erro', texto: 'Preencha o número e nome da série' })
      return
    }

    if (novaSerieData.disciplinas.length === 0) {
      setMensagem({ tipo: 'erro', texto: 'Adicione pelo menos uma disciplina' })
      return
    }

    setSalvando('nova')
    try {
      // Criar a série primeiro
      const response = await fetch('/api/admin/configuracao-series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serie: novaSerieData.serie,
          nome_serie: novaSerieData.nome_serie,
          tipo_ensino: novaSerieData.tipo_ensino,
          tem_producao_textual: novaSerieData.tem_producao_textual,
          qtd_itens_producao: novaSerieData.qtd_itens_producao,
          usa_nivel_aprendizagem: novaSerieData.usa_nivel_aprendizagem,
          // Calcular totais baseados nas disciplinas
          qtd_questoes_lp: novaSerieData.disciplinas.find(d => d.sigla === 'LP')?.qtd_questoes || 0,
          qtd_questoes_mat: novaSerieData.disciplinas.find(d => d.sigla === 'MAT')?.qtd_questoes || 0,
          qtd_questoes_ch: novaSerieData.disciplinas.find(d => d.sigla === 'CH')?.qtd_questoes || 0,
          qtd_questoes_cn: novaSerieData.disciplinas.find(d => d.sigla === 'CN')?.qtd_questoes || 0,
          avalia_lp: novaSerieData.disciplinas.some(d => d.sigla === 'LP'),
          avalia_mat: novaSerieData.disciplinas.some(d => d.sigla === 'MAT'),
          avalia_ch: novaSerieData.disciplinas.some(d => d.sigla === 'CH'),
          avalia_cn: novaSerieData.disciplinas.some(d => d.sigla === 'CN'),
        }),
      })

      const data = await response.json()

      if (response.ok && data.id) {
        // Agora salvar as disciplinas
        await fetch('/api/admin/configuracao-series/disciplinas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serie_id: data.id,
            disciplinas: novaSerieData.disciplinas
          }),
        })

        setMensagem({ tipo: 'sucesso', texto: 'Nova série criada com sucesso!' })
        await carregarSeries()
        setMostrarNovaSerieModal(false)
        setNovaSerieData({
          serie: '',
          nome_serie: '',
          tipo_ensino: 'anos_iniciais',
          tem_producao_textual: false,
          qtd_itens_producao: 8,
          usa_nivel_aprendizagem: false,
          disciplinas: []
        })
      } else {
        setMensagem({ tipo: 'erro', texto: data.mensagem || 'Erro ao criar série' })
      }
    } catch (error) {
      console.error('Erro ao criar série:', error)
      setMensagem({ tipo: 'erro', texto: 'Erro ao criar série' })
    } finally {
      setSalvando(null)
    }
  }

  const handleExcluirSerie = async (config: ConfiguracaoSerie) => {
    setExcluindoSerie(config.id)
    try {
      const response = await fetch(`/api/admin/configuracao-series?id=${config.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setMensagem({ tipo: 'sucesso', texto: `Série ${config.nome_serie} excluída com sucesso!` })
        await carregarSeries()
      } else {
        setMensagem({ tipo: 'erro', texto: data.mensagem || 'Erro ao excluir série' })
      }
    } catch (error) {
      console.error('Erro ao excluir série:', error)
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir série' })
    } finally {
      setExcluindoSerie(null)
      setConfirmarExclusao(null)
    }
  }

  const getTipoEnsinoColor = (tipo: string) => {
    return tipo === 'anos_iniciais'
      ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-200'
      : 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-200'
  }

  const getDisciplinaColor = (sigla: string) => {
    const cores: Record<string, string> = {
      'LP': 'bg-blue-100 border-blue-300 text-blue-800',
      'MAT': 'bg-purple-100 border-purple-300 text-purple-800',
      'CH': 'bg-green-100 border-green-300 text-green-800',
      'CN': 'bg-yellow-100 border-yellow-300 text-yellow-800',
    }
    return cores[sigla] || 'bg-gray-100 border-gray-300 text-gray-800'
  }

  // Limpar mensagem após 5 segundos
  useEffect(() => {
    if (mensagem) {
      const timer = setTimeout(() => setMensagem(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [mensagem])

  // Componente para edição de disciplinas
  const DisciplinasEditor = ({ disciplinas, isNewSerie = false }: { disciplinas: Disciplina[], isNewSerie?: boolean }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Disciplinas e Mapeamento de Questões
        </h4>
        <button
          onClick={() => handleAdicionarDisciplina(isNewSerie)}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      {disciplinas.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-slate-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">Nenhuma disciplina configurada</p>
          <button
            onClick={() => handleAdicionarDisciplina(isNewSerie)}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
          >
            Adicionar primeira disciplina
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {disciplinas.map((disc, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${getDisciplinaColor(disc.sigla)} dark:bg-slate-700 dark:border-slate-600`}
            >
              <div className="flex items-start gap-3">
                {/* Ordem e Controles */}
                <div className="flex flex-col items-center gap-1">
                  <span className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-current flex items-center justify-center font-bold text-sm">
                    {disc.ordem}º
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleMoverDisciplina(index, 'up', isNewSerie)}
                      disabled={index === 0}
                      className="p-0.5 hover:bg-white/50 rounded disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoverDisciplina(index, 'down', isNewSerie)}
                      disabled={index === disciplinas.length - 1}
                      className="p-0.5 hover:bg-white/50 rounded disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Campos */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Disciplina */}
                  <div>
                    <label className="block text-xs font-medium mb-1 opacity-75">Disciplina</label>
                    <select
                      value={disc.sigla}
                      onChange={(e) => handleAtualizarDisciplina(index, 'sigla', e.target.value, isNewSerie)}
                      className="w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-600"
                    >
                      <option value="">Selecione...</option>
                      {DISCIPLINAS_DISPONIVEIS.map(d => (
                        <option key={d.sigla} value={d.sigla}>{d.nome} ({d.sigla})</option>
                      ))}
                    </select>
                  </div>

                  {/* Questões */}
                  <div>
                    <label className="block text-xs font-medium mb-1 opacity-75">Qtd. Questões</label>
                    <input
                      type="number"
                      min="1"
                      value={disc.qtd_questoes}
                      onChange={(e) => handleAtualizarDisciplina(index, 'qtd_questoes', parseInt(e.target.value) || 1, isNewSerie)}
                      className="w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-600"
                    />
                  </div>

                  {/* Intervalo */}
                  <div>
                    <label className="block text-xs font-medium mb-1 opacity-75">Intervalo</label>
                    <div className="px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border rounded font-mono">
                      Q{disc.questao_inicio} a Q{disc.questao_fim}
                    </div>
                  </div>

                  {/* Valor */}
                  <div>
                    <label className="block text-xs font-medium mb-1 opacity-75">Valor/Questão</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={disc.valor_questao}
                      onChange={(e) => handleAtualizarDisciplina(index, 'valor_questao', parseFloat(e.target.value) || 0.5, isNewSerie)}
                      className="w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-600"
                    />
                  </div>
                </div>

                {/* Remover */}
                <button
                  onClick={() => handleRemoverDisciplina(index, isNewSerie)}
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Resumo */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total de questões:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {disciplinas.reduce((sum, d) => sum + d.qtd_questoes, 0)} questões
                (Q1 a Q{disciplinas.length > 0 ? disciplinas[disciplinas.length - 1].questao_fim : 0})
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <ProtectedRoute tiposPermitidos={['administrador']}>
      <LayoutDashboard tipoUsuario="admin">
        <div className="space-y-6">
          {/* Cabeçalho */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Settings className="w-8 h-8 text-indigo-600" />
                Configuração de Séries
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Configure as disciplinas e mapeamento de questões para cada série
              </p>
            </div>
            <button
              onClick={() => setMostrarNovaSerieModal(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nova Série
            </button>
          </div>

          {/* Mensagem de feedback */}
          {mensagem && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              mensagem.tipo === 'sucesso'
                ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
            }`}>
              {mensagem.tipo === 'sucesso' ? (
                <Check className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              )}
              <span>{mensagem.texto}</span>
            </div>
          )}

          {/* Cards de Configuração */}
          {carregando ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-4">Carregando configurações...</p>
            </div>
          ) : series.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-12 text-center">
              <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Nenhuma série configurada</p>
              <p className="text-sm text-gray-400 mt-2">Clique em &quot;Nova Série&quot; para começar</p>
            </div>
          ) : (
            <div className="space-y-6">
              {series.map((config) => {
                const estaEditando = editandoSerie === config.id

                return (
                  <div
                    key={config.id}
                    className={`bg-white dark:bg-slate-800 rounded-xl shadow-md border-2 transition-all ${
                      estaEditando ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800' : 'border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    {/* Cabeçalho do Card */}
                    <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 px-6 py-4 border-b border-indigo-200 dark:border-indigo-800 rounded-t-xl">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xl">
                            {config.serie}º
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{config.nome_serie}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <select
                                value={config.tipo_ensino || 'anos_iniciais'}
                                onChange={(e) => handleAtualizarTipoEnsino(config.id, e.target.value)}
                                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getTipoEnsinoColor(config.tipo_ensino || 'anos_iniciais')} bg-transparent cursor-pointer`}
                              >
                                <option value="anos_iniciais">Anos Iniciais</option>
                                <option value="anos_finais">Anos Finais</option>
                              </select>
                              {config.tem_producao_textual && (
                                <span className="text-xs bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full">
                                  + Produção Textual
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-left sm:text-right">
                            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                              {config.disciplinas?.reduce((sum, d) => sum + d.qtd_questoes, 0) || config.total_questoes_objetivas}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">questões objetivas</p>
                          </div>
                          <button
                            onClick={() => setConfirmarExclusao(config)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Excluir série"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Corpo do Card */}
                    <div className="p-6">
                      {estaEditando ? (
                        <>
                          <DisciplinasEditor disciplinas={disciplinasEditando} />

                          {/* Botões de Ação */}
                          <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-200 dark:border-slate-700">
                            <button
                              onClick={() => {
                                setEditandoSerie(null)
                                setDisciplinasEditando([])
                              }}
                              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSalvarDisciplinas(config.id)}
                              disabled={salvando === config.id}
                              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                              {salvando === config.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                  Salvando...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4" />
                                  Salvar Disciplinas
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Visualização das Disciplinas */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <BookOpen className="w-4 h-4" />
                              Mapeamento de Questões
                            </h4>

                            {config.disciplinas && config.disciplinas.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {config.disciplinas.map((disc: Disciplina, idx: number) => (
                                  <div
                                    key={idx}
                                    className={`p-3 rounded-lg border-2 ${getDisciplinaColor(disc.sigla)} dark:bg-slate-700 dark:border-slate-600`}
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-xs font-bold">
                                        {disc.ordem}º
                                      </span>
                                      <span className="font-semibold">{disc.sigla}</span>
                                    </div>
                                    <p className="text-sm">{disc.disciplina}</p>
                                    <div className="mt-2 text-xs space-y-1 opacity-75">
                                      <p>Questões: <span className="font-mono font-bold">Q{disc.questao_inicio}-Q{disc.questao_fim}</span></p>
                                      <p>Total: <span className="font-bold">{disc.qtd_questoes}</span> | Valor: <span className="font-bold">{disc.valor_questao}</span>/questão</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma disciplina configurada</p>
                              </div>
                            )}
                          </div>

                          {/* Botão Editar */}
                          <div className="flex justify-end pt-4 mt-4 border-t border-gray-200 dark:border-slate-700">
                            <button
                              onClick={() => handleEditarDisciplinas(config)}
                              className="flex items-center gap-2 px-4 py-2 border border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                            >
                              <Settings className="w-4 h-4" />
                              Editar Disciplinas
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Modal Confirmar Exclusão */}
          {confirmarExclusao && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-black dark:bg-opacity-60" onClick={() => setConfirmarExclusao(null)}></div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full relative z-10">
                  <div className="p-6">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                      <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-center text-gray-900 dark:text-white mb-2">
                      Excluir Série
                    </h3>
                    <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                      Tem certeza que deseja excluir a série <strong>{confirmarExclusao.nome_serie}</strong>?
                      <br />
                      <span className="text-sm text-red-500">Esta ação não pode ser desfeita.</span>
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => setConfirmarExclusao(null)}
                        className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleExcluirSerie(confirmarExclusao)}
                        disabled={excluindoSerie === confirmarExclusao.id}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {excluindoSerie === confirmarExclusao.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Excluindo...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Excluir
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Nova Série */}
          {mostrarNovaSerieModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-black dark:bg-opacity-60" onClick={() => setMostrarNovaSerieModal(false)}></div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-4xl w-full relative z-10 max-h-[90vh] overflow-y-auto">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nova Configuração de Série</h3>
                      <button onClick={() => setMostrarNovaSerieModal(false)} className="text-gray-400 hover:text-gray-500">
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Dados Básicos */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Número da Série *</label>
                        <input
                          type="text"
                          value={novaSerieData.serie}
                          onChange={(e) => setNovaSerieData({ ...novaSerieData, serie: e.target.value.replace(/\D/g, '') })}
                          placeholder="Ex: 6"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Série *</label>
                        <input
                          type="text"
                          value={novaSerieData.nome_serie}
                          onChange={(e) => setNovaSerieData({ ...novaSerieData, nome_serie: e.target.value })}
                          placeholder="Ex: 6º Ano"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Ensino *</label>
                        <select
                          value={novaSerieData.tipo_ensino}
                          onChange={(e) => setNovaSerieData({ ...novaSerieData, tipo_ensino: e.target.value as 'anos_iniciais' | 'anos_finais' })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                        >
                          <option value="anos_iniciais">Anos Iniciais</option>
                          <option value="anos_finais">Anos Finais</option>
                        </select>
                      </div>
                    </div>

                    {/* Opções adicionais */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Produção Textual</span>
                          {novaSerieData.tem_producao_textual && (
                            <div className="flex items-center gap-2 mt-1">
                              <label className="text-xs text-gray-500">Itens:</label>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={novaSerieData.qtd_itens_producao}
                                onChange={(e) => setNovaSerieData({ ...novaSerieData, qtd_itens_producao: parseInt(e.target.value) || 8 })}
                                className="w-16 px-2 py-1 text-center text-sm border rounded dark:bg-slate-800 dark:border-slate-600"
                              />
                            </div>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={novaSerieData.tem_producao_textual}
                          onChange={(e) => setNovaSerieData({
                            ...novaSerieData,
                            tem_producao_textual: e.target.checked,
                            qtd_itens_producao: e.target.checked ? 8 : 0
                          })}
                          className="w-5 h-5 text-indigo-600 rounded"
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Nível de Aprendizagem</span>
                        <input
                          type="checkbox"
                          checked={novaSerieData.usa_nivel_aprendizagem}
                          onChange={(e) => setNovaSerieData({ ...novaSerieData, usa_nivel_aprendizagem: e.target.checked })}
                          className="w-5 h-5 text-indigo-600 rounded"
                        />
                      </div>
                    </div>

                    {/* Editor de Disciplinas */}
                    <DisciplinasEditor disciplinas={novaSerieData.disciplinas} isNewSerie={true} />
                  </div>

                  <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
                    <button
                      onClick={() => setMostrarNovaSerieModal(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCriarSerie}
                      disabled={salvando === 'nova'}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {salvando === 'nova' ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Criando...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Criar Série
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}
