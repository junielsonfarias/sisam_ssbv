import type { Metadata } from 'next'
import { CheckCircle2, AlertTriangle, XCircle, Wrench, Activity, Clock } from 'lucide-react'
import { headers } from 'next/headers'

export const metadata: Metadata = {
  title: 'Status — SISAM/Educatec',
  description: 'Estado dos serviços do sistema em tempo real.',
}

export const dynamic = 'force-dynamic'

const ICONE: Record<string, React.ReactNode> = {
  operacional: <CheckCircle2 className="w-5 h-5 text-green-500" />,
  degradado: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  parcialmente_indisponivel: <AlertTriangle className="w-5 h-5 text-orange-500" />,
  indisponivel: <XCircle className="w-5 h-5 text-red-500" />,
  manutencao: <Wrench className="w-5 h-5 text-blue-500" />,
}

const LABEL: Record<string, string> = {
  operacional: 'Operacional',
  degradado: 'Funcionando com lentidão',
  parcialmente_indisponivel: 'Parcialmente indisponível',
  indisponivel: 'Indisponível',
  manutencao: 'Em manutenção',
}

const COR_BG: Record<string, string> = {
  operacional: 'bg-green-50 border-green-500 dark:bg-green-900/20',
  degradado: 'bg-amber-50 border-amber-500 dark:bg-amber-900/20',
  parcialmente_indisponivel: 'bg-orange-50 border-orange-500 dark:bg-orange-900/20',
  indisponivel: 'bg-red-50 border-red-500 dark:bg-red-900/20',
  manutencao: 'bg-blue-50 border-blue-500 dark:bg-blue-900/20',
}

async function fetchStatus() {
  const h = headers()
  const host = h.get('host')
  const proto = h.get('x-forwarded-proto') || 'http'
  try {
    const res = await fetch(`${proto}://${host}/api/publico/status`, { cache: 'no-store' })
    return res.ok ? await res.json() : null
  } catch { return null }
}

export default async function StatusPage() {
  const status = await fetchStatus()

  if (!status) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8 px-4">
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-xl p-8 text-center">
          <p className="text-gray-500">Não foi possível obter status do sistema.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Banner principal */}
        <div className={`rounded-2xl border-l-4 p-6 ${COR_BG[status.status_global]}`}>
          <div className="flex items-center gap-3">
            {ICONE[status.status_global]}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {status.status_global === 'operacional' ? 'Todos os sistemas operacionais' : LABEL[status.status_global]}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Verificado às {new Date(status.verificado_em).toLocaleTimeString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

        {/* Serviços */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-slate-700">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" /> Serviços
            </h2>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-slate-700">
            {status.servicos.map((s: any) => (
              <li key={s.nome} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {ICONE[s.status]}
                  <span className="font-medium text-gray-900 dark:text-white">{s.nome}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-300">{LABEL[s.status]}</p>
                  {s.latencia_ms != null && (
                    <p className="text-xs text-gray-500">{s.latencia_ms}ms</p>
                  )}
                  {s.mensagem && (
                    <p className="text-xs text-gray-500 italic">{s.mensagem}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Incidentes ativos */}
        {status.incidentes_ativos && status.incidentes_ativos.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-l-4 border-amber-500">
            <div className="p-5 border-b border-gray-200 dark:border-slate-700">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Incidentes em andamento ({status.incidentes_ativos.length})
              </h2>
            </div>
            <ul className="divide-y divide-gray-200 dark:divide-slate-700">
              {status.incidentes_ativos.map((inc: any) => (
                <li key={inc.id} className="p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{inc.titulo}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{inc.descricao}</p>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Iniciado: {new Date(inc.inicio_em).toLocaleString('pt-BR')}
                    {' · '}Severidade: <strong>{inc.severidade}</strong>
                  </p>
                  {inc.atualizacoes && inc.atualizacoes.length > 0 && (
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer text-indigo-600 dark:text-indigo-400">
                        Ver atualizações ({inc.atualizacoes.length})
                      </summary>
                      <ul className="mt-2 space-y-2 ml-4 text-gray-600 dark:text-gray-300">
                        {inc.atualizacoes.map((a: any, i: number) => (
                          <li key={i} className="text-xs border-l-2 border-gray-200 dark:border-slate-700 pl-3">
                            <strong>{LABEL[a.status] || a.status}</strong> — {a.mensagem}
                            <p className="text-gray-400">{new Date(a.criado_em).toLocaleString('pt-BR')}</p>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Histórico recente */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-300 text-center">
          {status.incidentes_recentes > 0 ? (
            <p>{status.incidentes_recentes} incidente(s) resolvido(s) nos últimos 7 dias.</p>
          ) : (
            <p>Sem incidentes nos últimos 7 dias. 🎉</p>
          )}
        </div>

        <footer className="text-center text-xs text-gray-500 py-4">
          <p>Esta página atualiza a cada acesso. Para monitoramento contínuo, consulte o JSON em <code>/api/publico/status</code>.</p>
        </footer>
      </div>
    </main>
  )
}
