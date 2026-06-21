'use client'

import ProtectedRoute from '@/components/protected-route'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ListChecks } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { TabelaDivergencias } from './components/tabela-divergencias'
import { ResolverDivergenciaModal } from './components/resolver-divergencia-modal'
import { FiltrosTriagem } from './components/filtros-triagem'
import { TotaisTriagem } from './components/totais-triagem'
import type {
  Divergencia,
  FiltroStatus,
  FiltroTipo,
  ImportacaoResumo,
  TotaisDivergencias,
} from './components/tipos'

const TIPOS_PERMITIDOS = ['administrador', 'tecnico'] as const

export default function TriagemDivergenciasPage() {
  const toast = useToast()
  const router = useRouter()
  const params = useParams()
  const importacaoId = params.id as string

  const [importacao, setImportacao] = useState<ImportacaoResumo | null>(null)
  const [divergencias, setDivergencias] = useState<Divergencia[]>([])
  const [totais, setTotais] = useState<TotaisDivergencias | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('')
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('')

  const [divergenciaSelecionada, setDivergenciaSelecionada] = useState<Divergencia | null>(null)
  const [acaoModal, setAcaoModal] = useState<'cadastrar_no_gestor' | 'vincular_a_existente' | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const query = new URLSearchParams()
      if (filtroStatus) query.set('status', filtroStatus)
      if (filtroTipo) query.set('tipo', filtroTipo)
      const qs = query.toString()
      const res = await fetch(
        `/api/admin/importacoes/${importacaoId}/triagem${qs ? `?${qs}` : ''}`
      )
      if (!res.ok) {
        if (res.status === 404) {
          toast.error('Importação não encontrada')
          router.push('/admin/importar')
          return
        }
        toast.error('Não foi possível carregar as divergências')
        return
      }
      const data = await res.json()
      setImportacao(data.importacao ?? null)
      setDivergencias(data.divergencias ?? [])
      setTotais(data.totais ?? null)
    } catch {
      toast.error('Erro ao carregar as divergências')
    } finally {
      setCarregando(false)
    }
  }, [importacaoId, filtroStatus, filtroTipo, router, toast])

  useEffect(() => {
    carregar()
  }, [carregar])

  const abrirResolucao = (
    divergencia: Divergencia,
    acao: 'cadastrar_no_gestor' | 'vincular_a_existente'
  ) => {
    setDivergenciaSelecionada(divergencia)
    setAcaoModal(acao)
  }

  const fecharModal = () => {
    setDivergenciaSelecionada(null)
    setAcaoModal(null)
  }

  const aoResolver = () => {
    fecharModal()
    carregar()
  }

  return (
    <ProtectedRoute tiposPermitidos={[...TIPOS_PERMITIDOS]}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => router.push('/admin/importar')}
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 min-h-[44px] active:opacity-70"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para importações
        </button>

        <header className="flex items-start gap-3 mb-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 shrink-0">
            <ListChecks className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Triagem de divergências
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {importacao?.nome_arquivo
                ? `${importacao.nome_arquivo}${importacao.ano_letivo ? ` · ${importacao.ano_letivo}` : ''}`
                : 'Turmas e alunos não encontrados no cadastro do Gestor'}
            </p>
          </div>
        </header>

        {carregando ? (
          <LoadingSpinner centered text="Carregando divergências..." />
        ) : (
          <>
            {totais && <TotaisTriagem totais={totais} />}

            <FiltrosTriagem
              status={filtroStatus}
              tipo={filtroTipo}
              onStatusChange={setFiltroStatus}
              onTipoChange={setFiltroTipo}
            />

            <TabelaDivergencias
              divergencias={divergencias}
              onCadastrar={(d) => abrirResolucao(d, 'cadastrar_no_gestor')}
              onVincular={(d) => abrirResolucao(d, 'vincular_a_existente')}
            />
          </>
        )}

        {divergenciaSelecionada && acaoModal && (
          <ResolverDivergenciaModal
            importacaoId={importacaoId}
            divergencia={divergenciaSelecionada}
            acao={acaoModal}
            onFechar={fecharModal}
            onResolvido={aoResolver}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}
