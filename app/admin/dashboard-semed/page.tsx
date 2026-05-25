'use client'

import { useEffect, useState } from 'react'
import {
  Users, School, GraduationCap, UserCheck, BookOpen, TrendingUp,
  AlertTriangle, UtensilsCrossed, Bus, Wrench, BarChart3, Heart,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface KpisCompletos {
  gerais: any
  frequencia: any
  desempenho: any
  programas: any
  comparativo_escolas?: any[]
  gerado_em: string
}

export default function DashboardSemedPage() {
  const [kpis, setKpis] = useState<KpisCompletos | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [ano, setAno] = useState(String(new Date().getFullYear()))

  useEffect(() => { carregar() }, [ano])

  const carregar = async () => {
    setCarregando(true)
    try {
      const res = await fetch(`/api/admin/kpis-semed?ano=${ano}&comparativo=true`)
      if (res.ok) setKpis(await res.json())
    } finally { setCarregando(false) }
  }

  if (carregando) {
    return (
      <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo']}>
        <LoadingSpinner centered />
      </ProtectedRoute>
    )
  }

  if (!kpis) {
    return (
      <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo']}>
        <div className="p-8 text-gray-500">Sem dados disponíveis.</div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo']}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-indigo-600" />
              Painel Estratégico SEMED
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Indicadores municipais do ano letivo {ano} · Gerado em {new Date(kpis.gerado_em).toLocaleString('pt-BR')}
            </p>
          </div>
          <select
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          >
            {[2024, 2025, 2026].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </header>

        {/* KPIs gerais */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Visão geral</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card icon={<Users />} label="Alunos" valor={kpis.gerais.total_alunos} cor="indigo" />
            <Card icon={<School />} label="Escolas" valor={kpis.gerais.total_escolas} cor="blue" />
            <Card icon={<GraduationCap />} label="Professores" valor={kpis.gerais.total_professores} cor="purple" />
            <Card icon={<UserCheck />} label="Servidores" valor={kpis.gerais.total_servidores} cor="gray" />
            <Card icon={<Heart />} label="Alunos PNE" valor={kpis.gerais.alunos_pne} cor="pink" />
            <Card icon={<BookOpen />} label="Bolsa Família" valor={kpis.gerais.alunos_bf} cor="amber" />
          </div>
        </section>

        {/* Frequência + Desempenho */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Painel titulo="Frequência" icon={<UserCheck className="w-5 h-5 text-indigo-600" />}>
            <Indicador label="Frequência média" valor={`${kpis.frequencia.frequencia_media_pct}%`}
              destaque={kpis.frequencia.frequencia_media_pct >= 85 ? 'bom' : kpis.frequencia.frequencia_media_pct >= 75 ? 'medio' : 'ruim'} />
            <Indicador label="Alunos infrequentes (<75%)" valor={kpis.frequencia.alunos_infrequentes}
              destaque={kpis.frequencia.alunos_infrequentes > 0 ? 'medio' : 'bom'} />
            <Indicador label="Em risco de evasão (FICAI abertos)" valor={kpis.frequencia.alunos_evasao_risco}
              destaque={kpis.frequencia.alunos_evasao_risco > 0 ? 'ruim' : 'bom'} />
          </Painel>

          <Painel titulo="Desempenho Pedagógico" icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}>
            <Indicador label="Média geral" valor={kpis.desempenho.media_geral != null ? kpis.desempenho.media_geral.toFixed(2) : '—'} />
            <Indicador label="Taxa de aprovação" valor={kpis.desempenho.taxa_aprovacao_pct != null ? `${kpis.desempenho.taxa_aprovacao_pct}%` : '—'}
              destaque={kpis.desempenho.taxa_aprovacao_pct != null && kpis.desempenho.taxa_aprovacao_pct >= 85 ? 'bom' : 'medio'} />
            <Indicador label="Taxa de reprovação" valor={kpis.desempenho.taxa_reprovacao_pct != null ? `${kpis.desempenho.taxa_reprovacao_pct}%` : '—'} />
            <Indicador label="Distorção idade-série" valor={kpis.desempenho.distorcao_idade_serie_pct != null ? `${kpis.desempenho.distorcao_idade_serie_pct}%` : '—'}
              destaque={kpis.desempenho.distorcao_idade_serie_pct != null && kpis.desempenho.distorcao_idade_serie_pct > 20 ? 'ruim' : 'bom'} />
            <Indicador label="IDEB projetado (estimativa interna)" valor={kpis.desempenho.ideb_projetado != null ? kpis.desempenho.ideb_projetado.toFixed(1) : '—'}
              destaque={kpis.desempenho.ideb_projetado != null && kpis.desempenho.ideb_projetado >= 6 ? 'bom' : 'medio'} />
          </Painel>
        </section>

        {/* Programas */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Programas Federais e Operação</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Card icon={<UtensilsCrossed />} label="Refeições PNAE (mês)" valor={kpis.programas.pnae_refeicoes_mes} cor="green" />
            <Card icon={<Bus />} label="Alunos PNATE" valor={kpis.programas.pnate_alunos_atendidos} cor="blue" />
            <Card icon={<BookOpen />} label="PDDE executado" valor={kpis.programas.pdde_executado_pct != null ? `${kpis.programas.pdde_executado_pct}%` : '—'} cor="purple" />
            <Card icon={<Wrench />} label="OS abertas" valor={kpis.programas.ordens_servico_abertas}
              cor={kpis.programas.ordens_servico_urgentes > 0 ? 'red' : 'gray'} />
            <Card icon={<AlertTriangle />} label="OS urgentes" valor={kpis.programas.ordens_servico_urgentes}
              cor={kpis.programas.ordens_servico_urgentes > 0 ? 'red' : 'green'} />
          </div>
        </section>

        {/* Comparativo por escola */}
        {kpis.comparativo_escolas && kpis.comparativo_escolas.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Comparativo por Escola</h2>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-900 text-xs uppercase text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left">Escola</th>
                      <th className="px-4 py-3 text-left">Polo</th>
                      <th className="px-4 py-3 text-right">Alunos</th>
                      <th className="px-4 py-3 text-right">Frequência</th>
                      <th className="px-4 py-3 text-right">Média</th>
                      <th className="px-4 py-3 text-right">PNE</th>
                      <th className="px-4 py-3 text-right">FICAI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {kpis.comparativo_escolas.map((e) => (
                      <tr key={e.escola_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-2 text-gray-900 dark:text-white font-medium">{e.escola_nome}</td>
                        <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{e.polo_nome || '—'}</td>
                        <td className="px-4 py-2 text-right">{e.total_alunos}</td>
                        <td className="px-4 py-2 text-right">
                          {e.frequencia_pct != null ? (
                            <span className={e.frequencia_pct >= 85 ? 'text-green-600' : e.frequencia_pct >= 75 ? 'text-amber-600' : 'text-red-600'}>
                              {e.frequencia_pct}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-2 text-right">{e.media_geral != null ? e.media_geral.toFixed(1) : '—'}</td>
                        <td className="px-4 py-2 text-right">{e.alunos_pne}</td>
                        <td className="px-4 py-2 text-right">
                          {e.alertas_ficai > 0 ? (
                            <span className="text-red-600 font-medium">{e.alertas_ficai}</span>
                          ) : 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </ProtectedRoute>
  )
}

const COR_BG: Record<string, string> = {
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  gray: 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300',
}

function Card({ icon, label, valor, cor }: { icon: React.ReactNode; label: string; valor: any; cor: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
      <div className={`inline-flex p-2 rounded-lg ${COR_BG[cor] || COR_BG.gray} mb-2`}>
        <span className="w-5 h-5">{icon}</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{valor}</p>
    </div>
  )
}

function Painel({ titulo, icon, children }: { titulo: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
        {icon} {titulo}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Indicador({ label, valor, destaque }: { label: string; valor: any; destaque?: 'bom' | 'medio' | 'ruim' }) {
  const cores = {
    bom: 'text-green-600 dark:text-green-400',
    medio: 'text-amber-600 dark:text-amber-400',
    ruim: 'text-red-600 dark:text-red-400',
  }
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-slate-700 last:border-0">
      <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
      <span className={`text-base font-semibold ${destaque ? cores[destaque] : 'text-gray-900 dark:text-white'}`}>
        {valor}
      </span>
    </div>
  )
}
