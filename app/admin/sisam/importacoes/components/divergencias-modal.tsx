'use client'

import { useEffect, useState } from 'react'
import { X, AlertTriangle, CheckCircle, Users, BookOpen } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface TurmaDivergente {
  id: string
  codigo: string
  nome: string
  serie: string | null
  ano_letivo: string
  escola_nome: string | null
}

interface AlunoDivergente {
  id: string
  codigo: string
  nome: string
  serie: string | null
  ano_letivo: string
  escola_nome: string | null
  turma_codigo: string | null
}

interface DivergenciasResponse {
  divergencias: { turmas: TurmaDivergente[]; alunos: AlunoDivergente[] }
  totais: { turmas: number; alunos: number; total: number }
}

interface DivergenciasModalProps {
  importacaoId: string
  nomeArquivo: string
  onClose: () => void
  onRegularizado: () => void
}

/**
 * Modal do Gestor para consultar a trilha de divergencias de uma importacao
 * (cadastro mestre criado pelo ETL Sisam) e disparar a regularizacao
 * (assumir os registros como cadastro do Gestor).
 */
export function DivergenciasModal({ importacaoId, nomeArquivo, onClose, onRegularizado }: DivergenciasModalProps) {
  const toast = useToast()
  const [dados, setDados] = useState<DivergenciasResponse | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [regularizando, setRegularizando] = useState(false)

  useEffect(() => {
    const carregar = async () => {
      setCarregando(true)
      try {
        const res = await fetch(`/api/admin/importacoes/${importacaoId}/divergencias`)
        const json = await res.json()
        if (res.ok) {
          setDados(json)
        } else {
          toast.error(json.mensagem || 'Erro ao carregar divergências')
        }
      } catch {
        toast.error('Erro ao conectar com o servidor')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [importacaoId, toast])

  const regularizar = async () => {
    if (!confirm('Assumir todas as divergências como cadastro do Gestor? Os registros criados pelo ETL passarão a ser de origem "gestor".')) {
      return
    }
    setRegularizando(true)
    try {
      const res = await fetch(`/api/admin/importacoes/${importacaoId}/divergencias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entidade: 'todas' }),
      })
      const json = await res.json()
      if (res.ok) {
        toast.success(json.mensagem || 'Divergências regularizadas')
        onRegularizado()
      } else {
        toast.error(json.mensagem || 'Erro ao regularizar')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setRegularizando(false)
    }
  }

  const total = dados?.totais.total ?? 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-amber-600 mr-2" />
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Divergências da importação</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-md">{nomeArquivo}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {carregando ? (
            <LoadingSpinner text="Carregando divergências..." centered />
          ) : !dados || total === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-300">Nenhuma divergência pendente para esta importação.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Registros de cadastro mestre criados pelo ETL Sisam (origem <code>sisam_etl</code>) vinculados a esta
                importação. Regularizar significa assumi-los como cadastro do Gestor.
              </p>

              {dados.divergencias.turmas.length > 0 && (
                <section>
                  <h3 className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    <BookOpen className="w-4 h-4 mr-1.5" />
                    Turmas ({dados.totais.turmas})
                  </h3>
                  <div className="space-y-1">
                    {dados.divergencias.turmas.map((t) => (
                      <div key={t.id} className="text-xs bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                        <span className="font-medium text-gray-800 dark:text-white">{t.codigo}</span>
                        {t.serie && <span className="text-gray-500 dark:text-gray-400"> · {t.serie}</span>}
                        {t.escola_nome && <span className="text-gray-500 dark:text-gray-400"> · {t.escola_nome}</span>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {dados.divergencias.alunos.length > 0 && (
                <section>
                  <h3 className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    <Users className="w-4 h-4 mr-1.5" />
                    Alunos ({dados.totais.alunos})
                  </h3>
                  <div className="space-y-1">
                    {dados.divergencias.alunos.map((a) => (
                      <div key={a.id} className="text-xs bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                        <span className="font-medium text-gray-800 dark:text-white">{a.nome}</span>
                        <span className="text-gray-500 dark:text-gray-400"> ({a.codigo})</span>
                        {a.turma_codigo && <span className="text-gray-500 dark:text-gray-400"> · {a.turma_codigo}</span>}
                        {a.escola_nome && <span className="text-gray-500 dark:text-gray-400"> · {a.escola_nome}</span>}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {!carregando && total > 0 && (
          <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Fechar
            </button>
            <button
              onClick={regularizar}
              disabled={regularizando}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {regularizando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Regularizando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Regularizar todas ({total})
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
