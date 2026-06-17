'use client'

import { useEffect, useState } from 'react'
import { Calendar, Link as LinkIcon, Info } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { PeriodoLetivo, ConfiguracaoNotasEscola } from './types'

export function AbaCalendarioLetivo({
  escolaId,
  anoLetivo,
}: {
  escolaId: string
  anoLetivo: string
}) {
  const [periodos, setPeriodos] = useState<PeriodoLetivo[]>([])
  const [configNotas, setConfigNotas] = useState<ConfiguracaoNotasEscola | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      try {
        const [periodosRes, configRes] = await Promise.all([
          fetch(`/api/admin/periodos-letivos?ano_letivo=${anoLetivo}`),
          fetch(`/api/admin/configuracao-notas?escola_id=${escolaId}&ano_letivo=${anoLetivo}`),
        ])

        if (periodosRes.ok) {
          const data = await periodosRes.json()
          setPeriodos(Array.isArray(data) ? data : data.periodos || [])
        }

        if (configRes.ok) {
          const data = await configRes.json()
          const configs = Array.isArray(data) ? data : data.configuracoes || []
          if (configs.length > 0) setConfigNotas(configs[0])
        }
      } catch (error) {
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [escolaId, anoLetivo])

  if (carregando) {
    return <LoadingSpinner text="Carregando calendario..." centered />
  }

  const formatarData = (data: string | null) => {
    if (!data) return '-'
    return new Date(data).toLocaleDateString('pt-BR')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600" />
          Calendario Letivo ({anoLetivo})
        </h3>
        <a
          href="/admin/gestor-escolar"
          className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          Editar no Gestor Escolar
        </a>
      </div>

      {/* Periodos */}
      {periodos.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Calendar className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p>Nenhum periodo letivo configurado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {periodos.map(periodo => (
            <div key={periodo.id} className="bg-white dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{periodo.nome}</h4>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>Inicio: {formatarData(periodo.data_inicio)}</p>
                <p>Fim: {formatarData(periodo.data_fim)}</p>
                {periodo.dias_letivos != null && <p>Dias letivos: {periodo.dias_letivos}</p>}
              </div>
              <div className="mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  periodo.ativo
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-400'
                }`}>
                  {periodo.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Configuracao de Notas */}
      {configNotas && (
        <div className="bg-white dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-600" />
            Configuracao de Notas
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Media de Aprovacao:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">{configNotas.media_aprovacao}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Media de Recuperacao:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">{configNotas.media_recuperacao}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Nota Maxima:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">{configNotas.nota_maxima}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
