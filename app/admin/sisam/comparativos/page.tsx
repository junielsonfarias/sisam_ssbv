'use client'

import ProtectedRoute from '@/components/protected-route'
import ModalAlunosTurma from '@/components/modal-alunos-turma'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { WifiOff } from 'lucide-react'
import * as offlineStorage from '@/lib/offline-storage'
import { useUserType } from '@/lib/hooks/useUserType'
import { PoloSimples, EscolaSimples, TurmaSimples } from '@/lib/dados/types'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { DadosComparativo } from './types'
import FiltrosComparacao from './components/FiltrosComparacao'
import ResumoComparativo from './components/ResumoComparativo'
import TabelaAgregada from './components/TabelaAgregada'
import TabelaDetalhada from './components/TabelaDetalhada'
import EstadoVazio from './components/EstadoVazio'

export default function ComparativosPage() {
  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [polos, setPolos] = useState<PoloSimples[]>([])
  const [series, setSeries] = useState<string[]>([])
  const [turmas, setTurmas] = useState<TurmaSimples[]>([])
  const [escolasSelecionadas, setEscolasSelecionadas] = useState<string[]>([])
  const [poloNome, setPoloNome] = useState<string>('')
  const [filtros, setFiltros] = useState({
    polo_id: '',
    ano_letivo: '', // Deixar vazio por padrão para buscar todos os anos
    serie: '',
    turma_id: '',
  })
  const [dados, setDados] = useState<Record<string, DadosComparativo[]>>({})
  const [dadosAgregados, setDadosAgregados] = useState<Record<string, DadosComparativo[]>>({})
  const [melhoresAlunos, setMelhoresAlunos] = useState<Record<string, any>>({})
  const [carregando, setCarregando] = useState(false)
  const [modalAlunosAberto, setModalAlunosAberto] = useState(false)
  const [turmaSelecionada, setTurmaSelecionada] = useState<{
    turma_id: string
    turma_codigo: string
    escola_nome: string
    serie: string
  } | null>(null)
  const [modoOffline, setModoOffline] = useState(false)

  // Callback quando o usuário é carregado
  const handleUsuarioCarregado = useCallback((usr: any, _tipo: string) => {
    // Se for usuário polo, fixar o polo_id no filtro
    if (usr.tipo_usuario === 'polo' && usr.polo_id) {
      setFiltros(prev => ({ ...prev, polo_id: usr.polo_id }))
    }
  }, [])

  // Hook para carregar tipo de usuário
  const { tipoUsuario, usuario } = useUserType({
    onUsuarioCarregado: handleUsuarioCarregado,
    ignorarOffline: false
  })

  useEffect(() => {
    // Verificar se está offline
    const online = offlineStorage.isOnline()
    setModoOffline(!online)
  }, [])

  // Carregar dados iniciais após definir o usuário
  useEffect(() => {
    if (usuario || tipoUsuario === 'admin') {
      carregarDadosIniciais()
    }
  }, [usuario])

  useEffect(() => {
    carregarTurmas()
  }, [filtros.serie, escolasSelecionadas, filtros.ano_letivo, filtros.polo_id])

  useEffect(() => {
    carregarComparativos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolasSelecionadas, filtros])

  const carregarDadosIniciais = async () => {
    try {
      // Para usuário polo, carregar apenas escolas do seu polo
      if (usuario?.tipo_usuario === 'polo' && usuario?.polo_id) {
        const [escolasRes, poloRes] = await Promise.all([
          fetch('/api/polo/escolas'),
          fetch(`/api/admin/polos?id=${usuario.polo_id}`),
        ])

        const escolasData = await escolasRes.json()
        const poloData = await poloRes.json()

        if (Array.isArray(escolasData)) {
          setEscolas(escolasData)
        }
        if (Array.isArray(poloData) && poloData.length > 0) {
          setPolos(poloData)
          setPoloNome(poloData[0].nome)
        }
      } else {
        // Admin/Tecnico: carregar todas as escolas e polos
        const [escolasRes, polosRes] = await Promise.all([
          fetch('/api/admin/escolas'),
          fetch('/api/admin/polos'),
        ])

        const escolasData = await escolasRes.json()
        const polosData = await polosRes.json()

        if (Array.isArray(escolasData)) {
          setEscolas(escolasData)
        }
        if (Array.isArray(polosData)) {
          setPolos(polosData)
        }
      }
    } catch (error) {
      console.error('[Comparativos] Erro ao carregar dados iniciais:', (error as Error).message)
    }
  }

  const carregarTurmas = async () => {
    // Só carrega turmas se houver série selecionada
    if (!filtros.serie) {
      setTurmas([])
      return
    }

    try {
      const params = new URLSearchParams()
      params.append('serie', filtros.serie)

      // Se há polo selecionado, filtrar escolas pelo polo antes de buscar turmas
      if (filtros.polo_id && escolasSelecionadas.length === 0) {
        // Se não há escolas selecionadas mas há polo, usar todas as escolas do polo
        const escolasDoPolo = escolas.filter((e) => e.polo_id === filtros.polo_id).map((e) => e.id)
        if (escolasDoPolo.length > 0) {
          params.append('escolas_ids', escolasDoPolo.join(','))
        }
      } else if (escolasSelecionadas.length > 0) {
        // Filtrar apenas as escolas selecionadas que pertencem ao polo (se polo estiver selecionado)
        const escolasFiltradas = filtros.polo_id
          ? escolasSelecionadas.filter((id) => {
              const escola = escolas.find((e) => e.id === id)
              return escola && escola.polo_id === filtros.polo_id
            })
          : escolasSelecionadas

        if (escolasFiltradas.length > 0) {
          params.append('escolas_ids', escolasFiltradas.join(','))
        }
      }

      if (filtros.ano_letivo) {
        params.append('ano_letivo', filtros.ano_letivo)
      }

      const response = await fetch(`/api/admin/turmas?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setTurmas(data)
      } else {
        setTurmas([])
      }
    } catch (error) {
      setTurmas([])
    }
  }

  const carregarComparativos = async () => {
    if (escolasSelecionadas.length === 0 && !filtros.polo_id) {
      setDados({})
      return
    }

    setCarregando(true)
    try {
      const params = new URLSearchParams()

      if (escolasSelecionadas.length > 0) {
        params.append('escolas_ids', escolasSelecionadas.join(','))
      }

      if (filtros.polo_id) {
        params.append('polo_id', filtros.polo_id)
      }

      if (filtros.ano_letivo) {
        params.append('ano_letivo', filtros.ano_letivo)
      }

      if (filtros.serie) {
        params.append('serie', filtros.serie)
      }

      if (filtros.turma_id) {
        params.append('turma_id', filtros.turma_id)
      }

      const response = await fetch(`/api/admin/comparativos?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setDados(data.dadosPorSerie || {}) // Por turma
        setDadosAgregados(data.dadosPorSerieAgregado || {}) // Agregado por série
        setMelhoresAlunos(data.melhoresAlunos || {}) // Melhores alunos

        // Extrair séries únicas
        const seriesUnicas = [...new Set(data.dados?.map((d: DadosComparativo) => d.serie).filter(Boolean))] as string[]
        setSeries(seriesUnicas.sort())
      } else {
        setDados({})
      }
    } catch (error) {
      setDados({})
    } finally {
      setCarregando(false)
    }
  }

  const toggleEscola = (escolaId: string) => {
    setEscolasSelecionadas((prev) =>
      prev.includes(escolaId)
        ? prev.filter((id) => id !== escolaId)
        : [...prev, escolaId]
    )
  }

  const limparFiltros = () => {
    setEscolasSelecionadas([])
    // Manter o polo_id se for usuário polo
    setFiltros(prev => ({
      polo_id: usuario?.tipo_usuario === 'polo' ? prev.polo_id : '',
      ano_letivo: '',
      serie: '',
      turma_id: '',
    }))
  }

  // Função para imprimir a página
  const handlePrint = () => {
    window.print()
  }

  const handleVerAlunos = (item: DadosComparativo) => {
    setTurmaSelecionada({
      turma_id: item.turma_id!,
      turma_codigo: item.turma_codigo || 'Sem código',
      escola_nome: item.escola_nome,
      serie: item.serie
    })
    setModalAlunosAberto(true)
  }

  const escolasFiltradas = useMemo(() => {
    // Para usuário polo, já recebemos apenas as escolas do polo
    if (usuario?.tipo_usuario === 'polo') return escolas
    // Para admin/tecnico, filtrar pelo polo selecionado
    if (!filtros.polo_id) return escolas
    return escolas.filter((e) => e.polo_id === filtros.polo_id)
  }, [escolas, filtros.polo_id, usuario])

  const totalEscolasComparadas = useMemo(() => {
    return new Set(
      Object.values(dados).flat().map((d) => d.escola_id)
    ).size
  }, [dados])

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo']}>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Comparativo de Escolas</h1>
              <p className="text-gray-600 mt-1">Compare o desempenho entre escolas, séries e turmas</p>
            </div>
          </div>

          {/* Aviso de modo offline */}
          {modoOffline && (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-6">
              <div className="flex items-center justify-center gap-4">
                <div className="flex-shrink-0">
                  <WifiOff className="w-12 h-12 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-1">
                    Comparativo Indisponível Offline
                  </h2>
                  <p className="text-amber-700 dark:text-amber-300">
                    Esta funcionalidade requer comparação de dados entre múltiplas escolas que não estão disponíveis no modo offline.
                    Por favor, conecte-se à internet para acessar o comparativo completo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo principal - apenas quando online */}
          {!modoOffline && (
          <>
          {/* Filtros */}
          <FiltrosComparacao
            filtros={filtros}
            setFiltros={setFiltros}
            escolasSelecionadas={escolasSelecionadas}
            setEscolasSelecionadas={setEscolasSelecionadas}
            escolasFiltradas={escolasFiltradas}
            polos={polos}
            series={series}
            turmas={turmas}
            usuario={usuario}
            poloNome={poloNome}
            limparFiltros={limparFiltros}
            toggleEscola={toggleEscola}
          />

          {/* Resultados */}
          {carregando ? (
            <LoadingSpinner text="Carregando comparativos..." centered />
          ) : Object.keys(dados).length > 0 ? (
            <div className="space-y-6">
              {/* Resumo */}
              <ResumoComparativo
                totalEscolasComparadas={totalEscolasComparadas}
                totalSeries={Object.keys(dados).length}
              />

              {/* Comparativos por Série */}
              {Object.entries(dados).map(([serie, dadosSerie]) => {
                const dadosAgregadosSerie = dadosAgregados[serie] || []

                return (
                  <div key={serie} className="space-y-4">
                    {/* Seção: Dados Agregados por Escola/Série */}
                    {dadosAgregadosSerie.length > 0 && !filtros.turma_id && (
                      <TabelaAgregada
                        serie={serie}
                        dadosAgregadosSerie={dadosAgregadosSerie}
                        melhoresAlunos={melhoresAlunos}
                        handlePrint={handlePrint}
                      />
                    )}

                    {/* Seção: Dados Detalhados por Turma */}
                    <TabelaDetalhada
                      serie={serie}
                      dadosSerie={dadosSerie}
                      filtros={filtros}
                      handlePrint={handlePrint}
                      onVerAlunos={handleVerAlunos}
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <EstadoVazio
              escolasSelecionadas={escolasSelecionadas}
              poloId={filtros.polo_id}
            />
          )}

          {/* Modal de Alunos da Turma */}
          {turmaSelecionada && (
            <ModalAlunosTurma
              turmaId={turmaSelecionada.turma_id}
              turmaCodigo={turmaSelecionada.turma_codigo}
              escolaNome={turmaSelecionada.escola_nome}
              serie={turmaSelecionada.serie}
              anoLetivo={filtros.ano_letivo}
              isOpen={modalAlunosAberto}
              onClose={() => {
                setModalAlunosAberto(false)
                setTurmaSelecionada(null)
              }}
            />
          )}
          </>
          )}
        </div>
    </ProtectedRoute>
  )
}
