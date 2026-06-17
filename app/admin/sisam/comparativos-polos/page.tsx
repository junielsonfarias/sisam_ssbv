'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { BarChart3 } from 'lucide-react'
import { PoloSimples, EscolaSimples, TurmaSimples } from '@/lib/dados/types'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

import { Filtros } from './components/Filtros'
import { Resumo } from './components/Resumo'
import { SeletorPolos } from './components/SeletorPolos'
import { TabelaComparativoEscola } from './components/TabelaComparativoEscola'
import { TabelaResumoPolo } from './components/TabelaResumoPolo'
import { DadosComparativoEscola, DadosComparativoPolo } from './types'

interface FiltrosState {
  ano_letivo: string
  serie: string
  escola_id: string
  turma_id: string
}

const FILTROS_INICIAL: FiltrosState = {
  ano_letivo: '',
  serie: '',
  escola_id: '',
  turma_id: '',
}

export default function ComparativosPolosPage() {
  const [polos, setPolos] = useState<PoloSimples[]>([])
  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [series, setSeries] = useState<string[]>([])
  const [turmas, setTurmas] = useState<TurmaSimples[]>([])
  const [polosSelecionados, setPolosSelecionados] = useState<string[]>([])
  const [filtros, setFiltros] = useState<FiltrosState>(FILTROS_INICIAL)
  const [dadosAgregados, setDadosAgregados] = useState<Record<string, DadosComparativoPolo[]>>({})
  const [dadosPorSerieEscola, setDadosPorSerieEscola] = useState<Record<string, Record<string, DadosComparativoEscola[]>>>({})
  const [carregando, setCarregando] = useState(false)

  // Carregar polos iniciais
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/polos', { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setPolos(Array.isArray(data) ? data : []))
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') console.error('[ComparativosPolos] Erro ao carregar polos:', (e as Error).message)
      })
    return () => controller.abort()
  }, [])

  // Carregar escolas dos polos selecionados
  const carregarEscolas = useCallback(async () => {
    if (polosSelecionados.length === 0) {
      setEscolas([])
      return
    }
    try {
      const todasEscolas: EscolaSimples[] = []
      for (const poloId of polosSelecionados) {
        const res = await fetch(`/api/admin/escolas?polo_id=${poloId}`)
        const data = await res.json()
        if (Array.isArray(data)) todasEscolas.push(...data)
      }
      setEscolas([...new Map(todasEscolas.map((e) => [e.id, e])).values()])
    } catch {
      setEscolas([])
    }
  }, [polosSelecionados])

  useEffect(() => { carregarEscolas() }, [carregarEscolas])

  // Carregar turmas conforme filtros
  const carregarTurmas = useCallback(async () => {
    if (!filtros.serie || !filtros.escola_id) {
      setTurmas([])
      return
    }
    try {
      const params = new URLSearchParams({ serie: filtros.serie, escolas_ids: filtros.escola_id })
      if (filtros.ano_letivo) params.append('ano_letivo', filtros.ano_letivo)
      const res = await fetch(`/api/admin/turmas?${params}`)
      const data = await res.json()
      setTurmas(res.ok && Array.isArray(data) ? data : [])
    } catch {
      setTurmas([])
    }
  }, [filtros.serie, filtros.escola_id, filtros.ano_letivo])

  useEffect(() => { carregarTurmas() }, [carregarTurmas])

  // Carregar comparativos
  const carregarComparativos = useCallback(async () => {
    if (polosSelecionados.length !== 2) {
      setDadosAgregados({})
      setDadosPorSerieEscola({})
      return
    }
    setCarregando(true)
    try {
      const params = new URLSearchParams({ polos_ids: polosSelecionados.join(',') })
      if (filtros.ano_letivo) params.append('ano_letivo', filtros.ano_letivo)
      if (filtros.serie) params.append('serie', filtros.serie)
      if (filtros.escola_id && filtros.escola_id !== 'todas') params.append('escola_id', filtros.escola_id)
      if (filtros.turma_id) params.append('turma_id', filtros.turma_id)

      const res = await fetch(`/api/admin/comparativos-polos?${params}`)
      const data = await res.json()

      if (res.ok) {
        setDadosAgregados(data.dadosPorSerieAgregado || {})
        setDadosPorSerieEscola(data.dadosPorSerieEscola || {})

        const seriesUnicas = [
          ...new Set(
            (Object.values(data.dadosPorSerie || {}) as DadosComparativoPolo[][])
              .flat()
              .map((d) => d.serie)
              .filter(Boolean)
          ),
        ] as string[]
        setSeries(seriesUnicas.sort())
      } else {
        setDadosAgregados({})
        setDadosPorSerieEscola({})
      }
    } catch {
      setDadosAgregados({})
      setDadosPorSerieEscola({})
    } finally {
      setCarregando(false)
    }
  }, [polosSelecionados, filtros])

  useEffect(() => { carregarComparativos() }, [carregarComparativos])

  const togglePolo = (poloId: string) => {
    setPolosSelecionados((prev) => {
      if (prev.includes(poloId)) return prev.filter((id) => id !== poloId)
      // Máximo 2: substitui o primeiro se já tem 2
      if (prev.length >= 2) return [prev[1], poloId]
      return [...prev, poloId]
    })
    setFiltros((prev) => ({ ...prev, escola_id: '', turma_id: '' }))
  }

  const limparFiltros = () => {
    setPolosSelecionados([])
    setFiltros(FILTROS_INICIAL)
  }

  const nomesPolos = useMemo(
    () => polosSelecionados.map((id) => polos.find((p) => p.id === id)?.nome || id),
    [polosSelecionados, polos]
  )

  const temDados =
    Object.keys(dadosAgregados).length > 0 || Object.keys(dadosPorSerieEscola).length > 0

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Comparativo entre Polos</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Compare o desempenho entre 2 polos, séries, escolas e turmas
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6" style={{ overflow: 'visible' }}>
          <Filtros
            filtros={filtros}
            series={series}
            escolas={escolas}
            turmas={turmas}
            polosSelecionadosCount={polosSelecionados.length}
            onChangeFiltros={setFiltros}
            onLimpar={limparFiltros}
          />

          <SeletorPolos polos={polos} polosSelecionados={polosSelecionados} togglePolo={togglePolo} />
        </div>

        {carregando ? (
          <LoadingSpinner text="Carregando comparativos..." centered />
        ) : temDados ? (
          <div className="space-y-6">
            <Resumo nomesPolos={nomesPolos} totalSeries={Object.keys(dadosAgregados).length} />

            {Object.entries(dadosAgregados).map(([serie, dadosSerie]) => {
              const dadosEscolasPorPolo = dadosPorSerieEscola[serie] || {}
              return (
                <div key={serie} className="space-y-4">
                  <TabelaResumoPolo serie={serie} dadosSerie={dadosSerie} />
                  <TabelaComparativoEscola
                    serie={serie}
                    dadosEscolasPorPolo={dadosEscolasPorPolo}
                    polos={polos}
                    filtroEscolaId={filtros.escola_id}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
              {polosSelecionados.length !== 2
                ? 'Selecione exatamente 2 polos para comparar'
                : 'Nenhum dado encontrado'}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {polosSelecionados.length !== 2
                ? 'Escolha 2 polos e configure os filtros'
                : 'Verifique se há dados para os polos selecionados no ano letivo informado'}
            </p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
