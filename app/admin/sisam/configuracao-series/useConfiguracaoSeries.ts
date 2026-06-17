import { useEffect, useState } from 'react'
import {
  Disciplina,
  ConfiguracaoSerie,
  RegrasAprovacao,
  DISCIPLINAS_DISPONIVEIS,
  DISCIPLINAS_PADRAO_POR_SERIE,
} from './types'

const NOVA_SERIE_INICIAL = {
  serie: '',
  nome_serie: '',
  tipo_ensino: 'anos_iniciais' as 'anos_iniciais' | 'anos_finais',
  tem_producao_textual: false,
  qtd_itens_producao: 8,
  usa_nivel_aprendizagem: false,
  disciplinas: [] as Disciplina[]
}

export function useConfiguracaoSeries() {
  const [series, setSeries] = useState<ConfiguracaoSerie[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState<string | null>(null)
  const [editandoSerie, setEditandoSerie] = useState<string | null>(null)
  const [disciplinasEditando, setDisciplinasEditando] = useState<Disciplina[]>([])
  const [mostrarNovaSerieModal, setMostrarNovaSerieModal] = useState(false)
  const [novaSerieData, setNovaSerieData] = useState(NOVA_SERIE_INICIAL)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null)
  const [excluindoSerie, setExcluindoSerie] = useState<string | null>(null)
  const [confirmarExclusao, setConfirmarExclusao] = useState<ConfiguracaoSerie | null>(null)
  const [regrasEditando, setRegrasEditando] = useState<Record<string, RegrasAprovacao>>({})
  const [salvandoRegras, setSalvandoRegras] = useState<string | null>(null)

  useEffect(() => {
    carregarSeries()
  }, [])

  // Limpar mensagem após 5 segundos
  useEffect(() => {
    if (mensagem) {
      const timer = setTimeout(() => setMensagem(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [mensagem])

  const carregarSeries = async () => {
    try {
      const [seriesRes, disciplinasRes] = await Promise.all([
        fetch('/api/admin/configuracao-series'),
        fetch('/api/admin/configuracao-series/disciplinas')
      ])

      const seriesData = await seriesRes.json()
      const disciplinasData = await disciplinasRes.json()

      if (seriesData.series) {
        const seriesComDisciplinas = seriesData.series.map((s: ConfiguracaoSerie) => {
          const discData = disciplinasData.find((d: any) => d.serie_id === s.id)
          const disciplinasBanco = discData?.disciplinas || []

          let disciplinasFinais = disciplinasBanco
          if (disciplinasBanco.length === 0 && DISCIPLINAS_PADRAO_POR_SERIE[s.serie]) {
            disciplinasFinais = DISCIPLINAS_PADRAO_POR_SERIE[s.serie]
          }

          return { ...s, disciplinas: disciplinasFinais }
        })
        setSeries(seriesComDisciplinas)

        const regrasIniciais: Record<string, RegrasAprovacao> = {}
        seriesComDisciplinas.forEach((s: any) => {
          const isAnosFinais = s.tipo_ensino === 'anos_finais'
          regrasIniciais[s.id] = {
            media_aprovacao: s.media_aprovacao ?? 6.0,
            media_recuperacao: s.media_recuperacao ?? 5.0,
            nota_maxima: s.nota_maxima ?? 10.0,
            max_dependencias: s.max_dependencias ?? (isAnosFinais ? 3 : 0),
            formula_nota_final: s.formula_nota_final ?? 'media_aritmetica'
          }
        })
        setRegrasEditando(regrasIniciais)
      }
    } catch (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar configurações' })
    } finally {
      setCarregando(false)
    }
  }

  const handleEditarDisciplinas = async (config: ConfiguracaoSerie) => {
    try {
      const response = await fetch(`/api/admin/configuracao-series/disciplinas?serie_id=${config.id}`)
      const disciplinas = await response.json()

      if (disciplinas.length > 0) {
        setDisciplinasEditando(disciplinas)
      } else if (DISCIPLINAS_PADRAO_POR_SERIE[config.serie]) {
        setDisciplinasEditando([...DISCIPLINAS_PADRAO_POR_SERIE[config.serie]])
      } else {
        setDisciplinasEditando([])
      }
      setEditandoSerie(config.id)
    } catch (error) {
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

    if (campo === 'qtd_questoes') {
      novaLista[index].questao_fim = novaLista[index].questao_inicio + valor - 1
      novaLista[index].valor_questao = parseFloat((10 / valor).toFixed(2))

      for (let i = index + 1; i < novaLista.length; i++) {
        novaLista[i].questao_inicio = novaLista[i - 1].questao_fim + 1
        novaLista[i].questao_fim = novaLista[i].questao_inicio + novaLista[i].qtd_questoes - 1
      }
    }

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
        body: JSON.stringify({ id: serieId, tipo_ensino: tipoEnsino }),
      })

      if (response.ok) {
        await carregarSeries()
        setMensagem({ tipo: 'sucesso', texto: 'Tipo de ensino atualizado!' })
      }
    } catch (error) {
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
        setNovaSerieData(NOVA_SERIE_INICIAL)
      } else {
        setMensagem({ tipo: 'erro', texto: data.mensagem || 'Erro ao criar série' })
      }
    } catch (error) {
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
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir série' })
    } finally {
      setExcluindoSerie(null)
      setConfirmarExclusao(null)
    }
  }

  const handleSalvarRegras = async (serieId: string) => {
    const regras = regrasEditando[serieId]
    if (!regras) return

    setSalvandoRegras(serieId)
    try {
      const response = await fetch('/api/admin/configuracao-series', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: serieId,
          media_aprovacao: regras.media_aprovacao,
          media_recuperacao: regras.media_recuperacao,
          nota_maxima: regras.nota_maxima,
          max_dependencias: regras.max_dependencias,
          formula_nota_final: regras.formula_nota_final
        }),
      })

      if (response.ok) {
        setMensagem({ tipo: 'sucesso', texto: 'Regras de aprovação atualizadas com sucesso!' })
        await carregarSeries()
      } else {
        const data = await response.json()
        setMensagem({ tipo: 'erro', texto: data.mensagem || 'Erro ao salvar regras' })
      }
    } catch (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar regras de aprovação' })
    } finally {
      setSalvandoRegras(null)
    }
  }

  const handleAtualizarRegra = (serieId: string, campo: keyof RegrasAprovacao, valor: any) => {
    setRegrasEditando(prev => ({
      ...prev,
      [serieId]: {
        ...prev[serieId],
        [campo]: valor
      }
    }))
  }

  const handleCancelarEdicao = () => {
    setEditandoSerie(null)
    setDisciplinasEditando([])
  }

  return {
    // State
    series,
    carregando,
    salvando,
    editandoSerie,
    disciplinasEditando,
    mostrarNovaSerieModal,
    novaSerieData,
    mensagem,
    excluindoSerie,
    confirmarExclusao,
    regrasEditando,
    salvandoRegras,
    // Setters
    setMostrarNovaSerieModal,
    setNovaSerieData,
    setConfirmarExclusao,
    // Handlers
    handleEditarDisciplinas,
    handleAdicionarDisciplina,
    handleRemoverDisciplina,
    handleMoverDisciplina,
    handleAtualizarDisciplina,
    handleSalvarDisciplinas,
    handleAtualizarTipoEnsino,
    handleCriarSerie,
    handleExcluirSerie,
    handleSalvarRegras,
    handleAtualizarRegra,
    handleCancelarEdicao,
  }
}
