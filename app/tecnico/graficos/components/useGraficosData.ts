'use client'

import { useEffect, useState, useMemo } from 'react'
import { isAnosIniciais, DISCIPLINAS_OPTIONS_ANOS_INICIAIS, DISCIPLINAS_OPTIONS_ANOS_FINAIS } from '@/lib/disciplinas-mapping'
import { FiltrosGraficos } from './constants'

export function useGraficosData() {
  const [tipoUsuario, setTipoUsuario] = useState<string>('tecnico')
  const [filtros, setFiltros] = useState<FiltrosGraficos>({})
  const [polos, setPolos] = useState<any[]>([])
  const [escolas, setEscolas] = useState<any[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [series, setSeries] = useState<string[]>([])
  const [dados, setDados] = useState<any>(null)
  const [carregando, setCarregando] = useState(false)
  const [tipoVisualizacao, setTipoVisualizacao] = useState<string>('geral')
  const [erro, setErro] = useState<string>('')

  // Disciplinas disponíveis baseado na série selecionada
  const disciplinasDisponiveis = useMemo(() => {
    if (filtros.serie && isAnosIniciais(filtros.serie)) {
      return DISCIPLINAS_OPTIONS_ANOS_INICIAIS
    }
    return DISCIPLINAS_OPTIONS_ANOS_FINAIS
  }, [filtros.serie])

  // Limpar disciplina se não estiver disponível para a série selecionada
  useEffect(() => {
    if (filtros.disciplina && filtros.serie) {
      const disciplinaValida = disciplinasDisponiveis.some(d => d.value === filtros.disciplina)
      if (!disciplinaValida) {
        setFiltros(prev => ({ ...prev, disciplina: undefined }))
      }
    }
  }, [filtros.serie, filtros.disciplina, disciplinasDisponiveis])

  useEffect(() => {
    carregarDadosIniciais()
  }, [])

  // Carregar turmas quando escola for selecionada
  useEffect(() => {
    // Só carregar se escola_id for válido (não vazio, não undefined, não "Todas")
    if (filtros.escola_id && filtros.escola_id !== '' && filtros.escola_id !== 'undefined' && filtros.escola_id.toLowerCase() !== 'todas') {
      const params = new URLSearchParams()
      params.append('escolas_ids', filtros.escola_id)
      if (filtros.ano_letivo && filtros.ano_letivo.trim() !== '') {
        params.append('ano_letivo', filtros.ano_letivo.trim())
      }
      if (filtros.serie && filtros.serie.trim() !== '') {
        params.append('serie', filtros.serie.trim())
      }

      if (process.env.NODE_ENV === 'development') {
      }

      fetch(`/api/admin/turmas?${params.toString()}`)
        .then(r => {
          if (!r.ok) {
            throw new Error(`Erro ao carregar turmas: ${r.status}`)
          }
          return r.json()
        })
        .then(data => {
          if (process.env.NODE_ENV === 'development') {
          }
          if (Array.isArray(data)) {
            setTurmas(data)
            // Se não houver turmas e houver turma_id selecionada, limpar
            if (data.length === 0 && filtros.turma_id) {
              setFiltros(prev => ({ ...prev, turma_id: undefined }))
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
            }
            setTurmas([])
            setFiltros(prev => ({ ...prev, turma_id: undefined }))
          }
        })
        .catch((error) => {
          if (process.env.NODE_ENV === 'development') {
          }
          setTurmas([])
          setFiltros(prev => ({ ...prev, turma_id: undefined }))
        })
    } else {
      // Limpar turmas quando escola não estiver selecionada
      setTurmas([])
      setFiltros(prev => ({ ...prev, turma_id: undefined }))
    }
  }, [filtros.escola_id, filtros.ano_letivo, filtros.serie])

  const carregarDadosIniciais = async () => {
    try {
      // Determinar qual API usar baseado no tipo de usuário
      if (tipoUsuario === 'polo') {
        // Polo: buscar apenas escolas do seu polo
        const escolasRes = await fetch('/api/polo/escolas')
        const escolasData = await escolasRes.json()
        setEscolas(Array.isArray(escolasData) ? escolasData : [])
        setPolos([]) // Polo não precisa de lista de polos
      } else if (tipoUsuario === 'escola') {
        // Escola: não precisa de filtros, apenas seus próprios dados
        setPolos([])
        setEscolas([])
      } else {
        // Admin e Técnico: buscar todas as escolas e polos
        const [polosRes, escolasRes] = await Promise.all([
          fetch('/api/admin/polos'),
          fetch('/api/admin/escolas'),
        ])

        const polosData = await polosRes.json()
        const escolasData = await escolasRes.json()

        setPolos(Array.isArray(polosData) ? polosData : [])
        setEscolas(Array.isArray(escolasData) ? escolasData : [])
      }

      // Séries serão carregadas do banco quando buscar gráficos
      // Inicializar vazio para evitar mostrar séries que não existem
      setSeries([])
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
      }
    }
  }

  const handleFiltroChange = (campo: keyof FiltrosGraficos, valor: string) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor || undefined,
    }))
  }

  const handleBuscarGraficos = async () => {
    setCarregando(true)
    setDados(null)
    setErro('')
    try {
      const params = new URLSearchParams()
      params.append('tipo', tipoVisualizacao)
      // Forçar atualização do cache para sempre buscar dados frescos
      params.append('atualizar_cache', 'true')
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.append(key, value.toString())
      })

      const response = await fetch(`/api/admin/graficos?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ mensagem: 'Erro desconhecido' }))
        if (process.env.NODE_ENV === 'development') {
        }
        setErro(errorData.mensagem || 'Erro ao buscar gráficos')
        return
      }

      const data = await response.json()

      // Atualizar séries disponíveis do banco de dados
      if (data.series_disponiveis && Array.isArray(data.series_disponiveis)) {
        setSeries(data.series_disponiveis)
      }

      // Verificar se há dados válidos
      if (!data || Object.keys(data).length === 0) {
        setErro('Nenhum dado encontrado para os filtros selecionados')
        return
      }

      // Verificar se há dados para o tipo de visualização selecionado
      const tiposSemDados = [
        'acertos_erros', 'questoes', 'heatmap', 'radar', 'boxplot',
        'correlacao', 'ranking', 'aprovacao', 'gaps'
      ]

      if (tiposSemDados.includes(tipoVisualizacao)) {
        const campoDados = tipoVisualizacao === 'acertos_erros' ? 'acertos_erros' :
                          tipoVisualizacao === 'questoes' ? 'questoes' :
                          tipoVisualizacao === 'heatmap' ? 'heatmap' :
                          tipoVisualizacao === 'radar' ? 'radar' :
                          tipoVisualizacao === 'boxplot' ? 'boxplot' :
                          tipoVisualizacao === 'correlacao' ? 'correlacao' :
                          tipoVisualizacao === 'ranking' ? 'ranking' :
                          tipoVisualizacao === 'aprovacao' ? 'aprovacao' :
                          'gaps'

        if (!data[campoDados] || (Array.isArray(data[campoDados]) && data[campoDados].length === 0)) {
          setErro('Nenhum dado encontrado para os filtros selecionados. Verifique se há alunos cadastrados com os critérios escolhidos.')
          setDados(null)
          return
        }
      }

      setDados(data)
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
      }
      setErro(error.message || 'Erro ao conectar com o servidor')
    } finally {
      setCarregando(false)
    }
  }

  const prepararDadosComparativo = () => {
    if (!dados?.comparativo_escolas) return []

    return dados.comparativo_escolas.escolas.map((escola: string, index: number) => ({
      escola,
      LP: dados.comparativo_escolas.mediaLP[index],
      CH: dados.comparativo_escolas.mediaCH?.[index] || 0,
      MAT: dados.comparativo_escolas.mediaMAT[index],
      CN: dados.comparativo_escolas.mediaCN?.[index] || 0,
      PT: dados.comparativo_escolas.mediaPT?.[index] || 0,
      Média: dados.comparativo_escolas.mediaGeral[index]
    }))
  }

  return {
    tipoUsuario,
    filtros,
    polos,
    escolas,
    turmas,
    series,
    dados,
    carregando,
    tipoVisualizacao,
    erro,
    disciplinasDisponiveis,
    setTipoVisualizacao,
    handleFiltroChange,
    handleBuscarGraficos,
    prepararDadosComparativo,
  }
}
