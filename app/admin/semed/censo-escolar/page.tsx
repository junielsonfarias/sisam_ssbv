'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ClipboardCheck,
  Download,
  Users,
  GraduationCap,
  School,
  AlertTriangle,
  FileSpreadsheet,
  Info,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useAnoLetivo } from '@/lib/contexts/ano-letivo-context'

interface Escola {
  id: string
  nome: string
  codigo_inep?: string | null
}

interface KpiCenso {
  alunos_ativos: number
  alunos_sem_inep_escola: number
  alunos_sem_cpf: number
  alunos_sem_data_nascimento: number
  alunos_sem_nome_mae: number
  turmas_ativas: number
  professores_ativos: number
}

const TIPOS_EXPORT = [
  {
    tipo: 'alunos',
    label: 'Alunos',
    descricao: 'Matrículas + dados do aluno (com flags AEE)',
    Icon: Users,
    cor: 'indigo',
  },
  {
    tipo: 'docentes',
    label: 'Docentes',
    descricao: 'Vinculação de professores às turmas',
    Icon: GraduationCap,
    cor: 'emerald',
  },
  {
    tipo: 'turmas',
    label: 'Turmas',
    descricao: 'Composição das turmas (turno, modalidade, etc.)',
    Icon: School,
    cor: 'amber',
  },
] as const

function CensoEscolarAdmin() {
  const toast = useToast()
  const { anoLetivo: ano, setAnoLetivo: setAno, anosDisponiveis } = useAnoLetivo()
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [escolaId, setEscolaId] = useState('')
  const [baixando, setBaixando] = useState<string | null>(null)
  const [kpis, setKpis] = useState<KpiCenso | null>(null)
  const [carregandoKpis, setCarregandoKpis] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/escolas', { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setEscolas(Array.isArray(d) ? d : []))
      .catch((e) => { if ((e as Error).name !== 'AbortError') console.error('[Censo] escolas', e) })
    return () => controller.abort()
  }, [])

  const carregarKpis = useCallback(async (signal?: AbortSignal) => {
    setCarregandoKpis(true)
    try {
      // KPIs derivados de queries simples via endpoints existentes
      // (busca quantidades de alunos com campos vazios — sinaliza pendência para Censo)
      const p = new URLSearchParams({ ano_letivo: ano, limite: '1' })
      if (escolaId) p.set('escola_id', escolaId)
      const res = await fetch(`/api/admin/censo-escolar/kpis?${p}`, { signal })
      if (res.ok) {
        const data = await res.json()
        setKpis(data.kpis || null)
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') console.error('[Censo] kpis', e)
    } finally {
      setCarregandoKpis(false)
    }
  }, [ano, escolaId])

  useEffect(() => {
    const controller = new AbortController()
    carregarKpis(controller.signal)
    return () => controller.abort()
  }, [carregarKpis])

  async function baixarCsv(tipo: string) {
    setBaixando(tipo)
    try {
      const p = new URLSearchParams({ tipo, ano })
      if (escolaId) p.set('escola', escolaId)
      const res = await fetch(`/api/admin/censo-escolar?${p}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.mensagem || 'Erro ao gerar CSV')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const escolaSuffix = escolaId ? `-escola-${escolaId.slice(0, 8)}` : ''
      a.download = `censo-${tipo}-${ano}${escolaSuffix}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`CSV de ${tipo} gerado`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBaixando(null)
    }
  }

  const inputCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-violet-500 outline-none'

  const temPendencias = kpis && (
    kpis.alunos_sem_inep_escola > 0 ||
    kpis.alunos_sem_cpf > 0 ||
    kpis.alunos_sem_data_nascimento > 0 ||
    kpis.alunos_sem_nome_mae > 0
  )

  return (
    <div>
      <div className="bg-gradient-to-r from-violet-700 to-purple-700 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Censo Escolar — Educacenso INEP</h1>
            <p className="text-violet-100 text-sm">Exportação simplificada para validação e migração ao portal Educacenso</p>
          </div>
        </div>
      </div>

      {/* Aviso sobre escopo */}
      <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-semibold mb-1">Limitação reconhecida</p>
          <p>Este export gera CSVs simplificados para conferência manual e importação ajustada no portal Educacenso oficial. <strong>Não cumpre 100% do layout XML INEP</strong>. Antes de enviar oficialmente, valide os dados e converta para o layout exigido pelo INEP.</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Ano letivo</label>
            <select value={ano} onChange={(e) => setAno(e.target.value)} className={inputCls}>
              {anosDisponiveis.map((a) => (
                <option key={a.ano} value={a.ano}>
                  {a.ano}{a.ativo || a.status === 'ativo' ? ' (ativo)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[240px]">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Escola (opcional — vazio = todas)</label>
            <select value={escolaId} onChange={(e) => setEscolaId(e.target.value)} className={`${inputCls} w-full`}>
              <option value="">Todas as escolas</option>
              {escolas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}{e.codigo_inep ? ` (INEP ${e.codigo_inep})` : ' ⚠ sem INEP'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPIs de validação */}
      {carregandoKpis ? (
        <LoadingSpinner centered />
      ) : kpis ? (
        <>
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 mt-6">Validação de dados</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-4 text-center">
              <Users className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{kpis.alunos_ativos.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-indigo-600">Alunos ativos</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-4 text-center">
              <School className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{kpis.turmas_ativas.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-emerald-600">Turmas</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center">
              <GraduationCap className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{kpis.professores_ativos.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-amber-600">Professores</p>
            </div>
            <div className={`${temPendencias ? 'bg-red-50 dark:bg-red-900/30' : 'bg-green-50 dark:bg-green-900/30'} rounded-xl p-4 text-center`}>
              <AlertTriangle className={`w-5 h-5 ${temPendencias ? 'text-red-600' : 'text-green-600'} mx-auto mb-1`} />
              <p className={`text-2xl font-bold ${temPendencias ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                {(kpis.alunos_sem_inep_escola + kpis.alunos_sem_cpf + kpis.alunos_sem_data_nascimento + kpis.alunos_sem_nome_mae).toLocaleString('pt-BR')}
              </p>
              <p className={`text-xs ${temPendencias ? 'text-red-600' : 'text-green-600'}`}>Pendências</p>
            </div>
          </div>

          {temPendencias && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <h3 className="text-sm font-bold text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Pendências críticas para o Censo
              </h3>
              <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
                {kpis.alunos_sem_inep_escola > 0 && (
                  <li>• <strong>{kpis.alunos_sem_inep_escola}</strong> alunos em escolas sem código INEP cadastrado</li>
                )}
                {kpis.alunos_sem_cpf > 0 && (
                  <li>• <strong>{kpis.alunos_sem_cpf}</strong> alunos sem CPF</li>
                )}
                {kpis.alunos_sem_data_nascimento > 0 && (
                  <li>• <strong>{kpis.alunos_sem_data_nascimento}</strong> alunos sem data de nascimento</li>
                )}
                {kpis.alunos_sem_nome_mae > 0 && (
                  <li>• <strong>{kpis.alunos_sem_nome_mae}</strong> alunos sem nome da mãe</li>
                )}
              </ul>
              <p className="text-xs text-red-600 mt-3 italic">Corrija essas pendências em /admin/alunos antes de enviar ao INEP.</p>
            </div>
          )}
        </>
      ) : (
        <div className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-slate-700/30 text-sm text-gray-500 text-center">
          KPIs de validação indisponíveis (endpoint /api/admin/censo-escolar/kpis não respondeu).
        </div>
      )}

      {/* Cards de exportação */}
      <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Exportar CSVs</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIPOS_EXPORT.map((opt) => {
          const Icon = opt.Icon
          const cor = opt.cor
          return (
            <div key={opt.tipo} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
              <div className={`bg-${cor}-100 dark:bg-${cor}-900/30 rounded-lg p-2 w-fit mb-3`}>
                <Icon className={`w-6 h-6 text-${cor}-600 dark:text-${cor}-400`} />
              </div>
              <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-1">{opt.label}</h3>
              <p className="text-xs text-gray-500 mb-4">{opt.descricao}</p>
              <button
                onClick={() => baixarCsv(opt.tipo)}
                disabled={baixando !== null}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-${cor}-600 text-white text-sm font-bold hover:bg-${cor}-700 disabled:opacity-50`}
              >
                {baixando === opt.tipo ? (
                  <>
                    <FileSpreadsheet className="w-4 h-4 animate-pulse" /> Gerando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Baixar {opt.label} ({ano})
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-6 text-xs text-gray-400 text-center">
        Os CSVs usam codificação UTF-8. Para Excel, abrir via &ldquo;Dados → Obter dados → Texto/CSV&rdquo; selecionando UTF-8.
      </div>
    </div>
  )
}

export default function CensoEscolarAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <CensoEscolarAdmin />
    </ProtectedRoute>
  )
}
