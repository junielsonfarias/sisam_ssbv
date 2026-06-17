'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import { Shield, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface LogAuditoria {
  id: string
  usuario_id: string | null
  usuario_email: string | null
  usuario_nome: string | null
  acao: string
  entidade: string
  entidade_id: string | null
  detalhes: Record<string, any> | null
  ip: string | null
  criado_em: string
}

interface UsuarioFiltro {
  usuario_id: string
  usuario_email: string
  usuario_nome: string | null
}

const ACAO_CORES: Record<string, string> = {
  criar: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  editar: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  excluir: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  transferir: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  alterar_situacao: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  alterar_nota: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  atualizar: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  importar: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  cancelar: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  login: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  logout: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

const ACAO_LABELS: Record<string, string> = {
  criar: 'Criar',
  editar: 'Editar',
  excluir: 'Excluir',
  transferir: 'Transferir',
  alterar_situacao: 'Alterar Situação',
  alterar_nota: 'Alterar Nota',
  atualizar: 'Atualizar',
  importar: 'Importar',
  cancelar: 'Cancelar',
  login: 'Login',
  logout: 'Logout',
}

const ACOES = ['criar', 'editar', 'excluir', 'transferir', 'alterar_situacao', 'alterar_nota', 'atualizar', 'importar', 'cancelar', 'login', 'logout']
const ENTIDADES = ['aluno', 'turma', 'nota', 'frequencia', 'publicacao', 'usuario', 'site_config', 'importacao', 'resultados']

function formatDetalhes(detalhes: Record<string, any> | null): string {
  if (!detalhes) return '-'
  const parts: string[] = []
  if (detalhes.campo) parts.push(`Campo: ${detalhes.campo}`)
  if (detalhes.de !== undefined) parts.push(`De: ${detalhes.de}`)
  if (detalhes.para !== undefined) parts.push(`Para: ${detalhes.para}`)
  if (detalhes.titulo) parts.push(`"${detalhes.titulo}"`)
  if (detalhes.tipo) parts.push(`Tipo: ${detalhes.tipo}`)
  if (parts.length === 0) {
    // Fallback genérico
    return Object.entries(detalhes)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .slice(0, 3)
      .join(' | ') || '-'
  }
  return parts.join(' | ')
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<LogAuditoria[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioFiltro[]>([])
  const [carregando, setCarregando] = useState(false)
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(0)

  // Filtros
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [filtroAcao, setFiltroAcao] = useState('')
  const [filtroEntidade, setFiltroEntidade] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const buscar = async (pag: number = 1) => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({ pagina: pag.toString(), limite: '50' })
      if (filtroUsuario) params.set('usuario_id', filtroUsuario)
      if (filtroAcao) params.set('acao', filtroAcao)
      if (filtroEntidade) params.set('entidade', filtroEntidade)
      if (dataInicio) params.set('data_inicio', dataInicio)
      if (dataFim) params.set('data_fim', dataFim)

      const res = await fetch(`/api/admin/auditoria?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setUsuarios(data.usuarios || [])
        setTotal(data.total || 0)
        setPagina(data.pagina || 1)
        setTotalPaginas(data.totalPaginas || 0)
      }
    } catch {
      // silencioso
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    buscar()
  }, [])

  const handleBuscar = () => {
    setPagina(1)
    buscar(1)
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-gray-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Auditoria do Sistema</h1>
              <p className="text-sm opacity-90">Registro de todas as ações realizadas no sistema</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Filtros</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuário</label>
              <select
                value={filtroUsuario}
                onChange={e => setFiltroUsuario(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">Todos</option>
                {usuarios.map(u => (
                  <option key={u.usuario_id} value={u.usuario_id}>
                    {u.usuario_nome || u.usuario_email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ação</label>
              <select
                value={filtroAcao}
                onChange={e => setFiltroAcao(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">Todas</option>
                {ACOES.map(a => (
                  <option key={a} value={a}>{ACAO_LABELS[a] || a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entidade</label>
              <select
                value={filtroEntidade}
                onChange={e => setFiltroEntidade(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">Todas</option>
                {ENTIDADES.map(e => (
                  <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <button
            onClick={handleBuscar}
            disabled={carregando}
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium bg-slate-700 text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            Buscar
          </button>
        </div>

        {/* Resultado */}
        {carregando ? (
          <LoadingSpinner text="Buscando registros de auditoria..." centered />
        ) : (
          <>
            {/* Info total */}
            {total > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
              </p>
            )}

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
              {logs.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-8 text-center text-gray-500 dark:text-gray-400">
                  <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p>Nenhum registro encontrado</p>
                </div>
              ) : logs.map((log) => (
                <div key={log.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${ACAO_CORES[log.acao] || 'bg-gray-100 text-gray-700'}`}>
                      {ACAO_LABELS[log.acao] || log.acao}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(log.criado_em).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {log.usuario_nome || log.usuario_email || '-'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="capitalize font-medium">{log.entidade}</span>
                    {log.ip && <span className="font-mono">IP: {log.ip}</span>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={formatDetalhes(log.detalhes)}>
                    {formatDetalhes(log.detalhes)}
                  </p>
                </div>
              ))}
            </div>

            {/* Tabela Desktop */}
            <div className="hidden sm:block bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Data/Hora</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Usuário</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Ação</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Entidade</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Detalhes</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-500 dark:text-gray-400">
                          <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                          <p>Nenhum registro de auditoria encontrado</p>
                        </td>
                      </tr>
                    ) : (
                      logs.map((log, idx) => (
                        <tr
                          key={log.id}
                          className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-slate-800/50'}`}
                        >
                          <td className="py-2 px-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {new Date(log.criado_em).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {log.usuario_nome || log.usuario_email || '-'}
                            </span>
                            {log.usuario_nome && log.usuario_email && (
                              <span className="block text-[10px] text-gray-400">{log.usuario_email}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${ACAO_CORES[log.acao] || 'bg-gray-100 text-gray-700'}`}>
                              {ACAO_LABELS[log.acao] || log.acao}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center text-sm text-gray-700 dark:text-gray-300 capitalize">
                            {log.entidade}
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate" title={formatDetalhes(log.detalhes)}>
                            {formatDetalhes(log.detalhes)}
                          </td>
                          <td className="py-2 px-3 text-center text-xs text-gray-400 font-mono">
                            {log.ip || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPaginas > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Página {pagina} de {totalPaginas}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => buscar(pagina - 1)}
                      disabled={pagina <= 1}
                      className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => buscar(pagina + 1)}
                      disabled={pagina >= totalPaginas}
                      className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
