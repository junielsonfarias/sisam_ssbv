import type { Metadata } from 'next'
import Link from 'next/link'
import { Eye, School, Users, GraduationCap, Heart, UtensilsCrossed, Bus, BookOpen, Download } from 'lucide-react'
import { headers } from 'next/headers'

export const metadata: Metadata = {
  title: 'Dados Abertos — SEMED',
  description: 'Indicadores agregados e abertos da rede municipal de ensino.',
}

export const dynamic = 'force-dynamic'

async function fetchEndpoint(endpoint: string) {
  const h = headers()
  const host = h.get('host')
  const proto = h.get('x-forwarded-proto') || 'http'
  const baseUrl = `${proto}://${host}`
  try {
    const res = await fetch(`${baseUrl}${endpoint}`, { cache: 'no-store' })
    return res.ok ? await res.json() : null
  } catch { return null }
}

export default async function DadosAbertosPage() {
  const [resumo, escolas] = await Promise.all([
    fetchEndpoint('/api/publico/transparencia?recurso=resumo'),
    fetchEndpoint('/api/publico/transparencia?recurso=escolas'),
  ])

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dados Abertos</h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Indicadores agregados da rede municipal de ensino, conforme Lei de Acesso à Informação (12.527/2011).
            Apenas dados agregados — sem informações individuais identificáveis (LGPD).
          </p>
          {resumo?.atualizado_em && (
            <p className="text-xs text-gray-500 mt-2">
              Última atualização: {new Date(resumo.atualizado_em).toLocaleString('pt-BR')}
            </p>
          )}
        </header>

        {resumo ? (
          <>
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Visão Municipal — {resumo.ano_letivo}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <StatCard icon={<Users />} label="Alunos matriculados" valor={resumo.total_alunos.toLocaleString('pt-BR')} />
                <StatCard icon={<School />} label="Escolas ativas" valor={resumo.total_escolas} />
                <StatCard icon={<GraduationCap />} label="Professores" valor={resumo.total_professores} />
                <StatCard icon={<Heart />} label="Alunos PNE" valor={resumo.alunos_pne} />
                <StatCard icon={<UtensilsCrossed />} label="Refeições PNAE (ano)" valor={resumo.alunos_atendidos_pnae.toLocaleString('pt-BR')} />
                <StatCard icon={<Bus />} label="Alunos no transporte" valor={resumo.alunos_transporte} />
                <StatCard icon={<BookOpen />} label="Beneficiários Bolsa Família" valor={resumo.alunos_bolsa_familia} />
                <StatCard icon={<BookOpen />} label="PDDE executado"
                  valor={resumo.pdde_recebido_total > 0
                    ? `${((resumo.pdde_executado_total / resumo.pdde_recebido_total) * 100).toFixed(1)}%`
                    : '—'} />
              </div>

              {resumo.pdde_recebido_total > 0 && (
                <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500 rounded">
                  <p className="text-sm text-indigo-900 dark:text-indigo-200">
                    <strong>PDDE 2026:</strong> R$ {resumo.pdde_recebido_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} recebidos · {' '}
                    R$ {resumo.pdde_executado_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} executados.
                  </p>
                </div>
              )}
            </section>

            {escolas?.escolas && escolas.escolas.length > 0 && (
              <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="p-5 border-b border-gray-200 dark:border-slate-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Escolas da Rede ({escolas.total})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-900 text-xs uppercase text-gray-600 dark:text-gray-300">
                      <tr>
                        <th className="px-4 py-3 text-left">Escola</th>
                        <th className="px-4 py-3 text-left">Polo</th>
                        <th className="px-4 py-3 text-right">Alunos</th>
                        <th className="px-4 py-3 text-right">Frequência</th>
                        <th className="px-4 py-3 text-right">PDDE Recebido</th>
                        <th className="px-4 py-3 text-right">PDDE Executado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {escolas.escolas.map((e: any) => (
                        <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                          <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{e.nome}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{e.polo_nome || '—'}</td>
                          <td className="px-4 py-3 text-right">{e.total_alunos}</td>
                          <td className="px-4 py-3 text-right">{e.frequencia_media_pct != null ? `${e.frequencia_media_pct}%` : '—'}</td>
                          <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                            R$ {Number(e.pdde_recebido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                            R$ {Number(e.pdde_executado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center text-gray-500">
            Não foi possível carregar os dados no momento. Tente novamente em instantes.
          </div>
        )}

        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Download className="w-5 h-5" /> API Pública
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Acesse os dados em formato JSON via API REST. Use livremente para pesquisas, análises e jornalismo de dados.
          </p>
          <div className="space-y-2 text-sm font-mono bg-gray-50 dark:bg-slate-900 p-3 rounded border border-gray-200 dark:border-slate-700">
            <p>GET <code>/api/publico/transparencia?recurso=resumo</code></p>
            <p>GET <code>/api/publico/transparencia?recurso=escolas</code></p>
            <p>GET <code>/api/publico/transparencia?recurso=indicadores&amp;escola=&lt;uuid&gt;</code></p>
          </div>
          <p className="text-xs text-gray-500 mt-2">Rate-limit: 600 requisições/minuto por IP.</p>
        </section>

        <footer className="text-center text-xs text-gray-500 py-4">
          <p>
            Base legal: Lei de Acesso à Informação (12.527/2011) · LGPD (13.709/2018) — dados pessoais anonimizados.
          </p>
          <p className="mt-1">
            <Link href="/politica-de-privacidade" className="text-indigo-600 dark:text-indigo-400 hover:underline">Política de Privacidade</Link>
            {' · '}
            <Link href="/transparencia" className="text-indigo-600 dark:text-indigo-400 hover:underline">Portal de Escolas</Link>
          </p>
        </footer>
      </div>
    </main>
  )
}

function StatCard({ icon, label, valor }: { icon: React.ReactNode; label: string; valor: any }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
      <div className="inline-flex p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg mb-2">
        <span className="w-5 h-5">{icon}</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{valor}</p>
    </div>
  )
}
