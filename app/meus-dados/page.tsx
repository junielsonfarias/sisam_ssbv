'use client'

import { useEffect, useState } from 'react'
import { Download, FileJson, Trash2, Shield, Clock, AlertCircle, CheckCircle, X } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Solicitacao {
  id: string
  tipo: 'exportar' | 'portabilidade' | 'exclusao'
  status: 'pendente' | 'em_processamento' | 'concluida' | 'cancelada' | 'negada'
  motivo: string | null
  prevista_para: string | null
  concluida_em: string | null
  criada_em: string
}

const TIPO_LABEL: Record<string, string> = {
  exportar: 'Exportação de dados',
  portabilidade: 'Portabilidade',
  exclusao: 'Exclusão de dados',
}

const STATUS_COR: Record<string, string> = {
  pendente: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
  em_processamento: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  concluida: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  cancelada: 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-300',
  negada: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
}

export default function MeusDadosPage() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [acao, setAcao] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => { carregar() }, [])

  const carregar = async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/lgpd/solicitar-exclusao')
      if (res.ok) {
        const data = await res.json()
        setSolicitacoes(data.solicitacoes || [])
      }
    } finally {
      setCarregando(false)
    }
  }

  const baixarArquivo = async (endpoint: string, prefixo: string) => {
    setAcao(prefixo)
    setErro('')
    setSucesso('')
    try {
      const res = await fetch(endpoint, { method: 'POST' })
      if (!res.ok) {
        setErro('Não foi possível gerar o arquivo. Tente novamente.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // Pega filename do header se houver
      const disposition = res.headers.get('content-disposition') || ''
      const match = disposition.match(/filename="([^"]+)"/)
      a.download = match?.[1] || `${prefixo}-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setSucesso('Arquivo gerado com sucesso. Verifique seus downloads.')
      await carregar()
    } catch {
      setErro('Erro de conexão.')
    } finally {
      setAcao(null)
    }
  }

  const solicitarExclusao = async () => {
    const motivo = prompt('Por que você deseja excluir seus dados? (opcional)')
    if (motivo === null) return // usuário cancelou

    if (!confirm('Tem certeza? Após 15 dias os dados serão removidos permanentemente.')) return

    setAcao('exclusao')
    setErro('')
    setSucesso('')
    try {
      const res = await fetch('/api/lgpd/solicitar-exclusao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.mensagem || 'Erro ao solicitar exclusão')
        return
      }
      setSucesso(data.mensagem)
      await carregar()
    } catch {
      setErro('Erro de conexão.')
    } finally {
      setAcao(null)
    }
  }

  const cancelarSolicitacao = async (id: string) => {
    if (!confirm('Cancelar essa solicitação de exclusão?')) return
    try {
      const res = await fetch('/api/lgpd/solicitar-exclusao', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitacaoId: id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.mensagem)
        return
      }
      setSucesso(data.mensagem)
      await carregar()
    } catch {
      setErro('Erro de conexão.')
    }
  }

  if (carregando) {
    return (
      <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo', 'escola', 'professor', 'editor', 'publicador', 'responsavel']}>
        <LoadingSpinner centered />
      </ProtectedRoute>
    )
  }

  const pendenteExclusao = solicitacoes.find((s) => s.tipo === 'exclusao' && s.status === 'pendente')

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo', 'escola', 'professor', 'editor', 'publicador', 'responsavel']}>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-indigo-600" />
            Meus dados (LGPD)
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem o direito
            de acessar, portar e excluir seus dados pessoais.
          </p>
        </div>

        {erro && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-200">{erro}</p>
          </div>
        )}

        {sucesso && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800 dark:text-green-200">{sucesso}</p>
          </div>
        )}

        {pendenteExclusao && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded-lg">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  Exclusão agendada para {new Date(pendenteExclusao.prevista_para!).toLocaleDateString('pt-BR')}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Você ainda pode cancelar esta solicitação até a data prevista.
                </p>
                <button
                  onClick={() => cancelarSolicitacao(pendenteExclusao.id)}
                  className="mt-3 text-sm font-medium text-amber-900 dark:text-amber-100 underline hover:no-underline"
                >
                  Cancelar exclusão
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
            <Download className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Acessar meus dados</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Art. 18, II — Obtenha um arquivo JSON com todos os dados que temos sobre você.
            </p>
            <button
              onClick={() => baixarArquivo('/api/lgpd/exportar-dados', 'meus-dados')}
              disabled={acao === 'meus-dados'}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg"
            >
              <Download className="w-4 h-4" />
              {acao === 'meus-dados' ? 'Gerando...' : 'Baixar JSON'}
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
            <FileJson className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Portabilidade</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Art. 18, V — Formato interoperável para levar seus dados a outro sistema.
            </p>
            <button
              onClick={() => baixarArquivo('/api/lgpd/portabilidade', 'portabilidade')}
              disabled={acao === 'portabilidade'}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg"
            >
              <FileJson className="w-4 h-4" />
              {acao === 'portabilidade' ? 'Gerando...' : 'Baixar JSON'}
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
            <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Excluir meus dados</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Art. 18, VI — Solicitar a eliminação. Há carência de 15 dias para cancelar.
            </p>
            <button
              onClick={solicitarExclusao}
              disabled={acao === 'exclusao' || !!pendenteExclusao}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-medium rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
              {acao === 'exclusao' ? 'Solicitando...' : pendenteExclusao ? 'Já solicitado' : 'Solicitar exclusão'}
            </button>
          </div>
        </div>

        {/* Histórico */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Histórico de solicitações
          </h2>
          {solicitacoes.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">Nenhuma solicitação ainda.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-slate-700">
              {solicitacoes.map((s) => (
                <li key={s.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {TIPO_LABEL[s.tipo]}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COR[s.status]}`}>
                        {s.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Em {new Date(s.criada_em).toLocaleString('pt-BR')}
                      {s.prevista_para && ` · Prevista: ${new Date(s.prevista_para).toLocaleDateString('pt-BR')}`}
                    </p>
                  </div>
                  {s.tipo === 'exclusao' && s.status === 'pendente' && (
                    <button
                      onClick={() => cancelarSolicitacao(s.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      title="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-6 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Em caso de dúvidas sobre o tratamento dos seus dados pessoais, entre em contato com o
          Encarregado de Dados (DPO) da Secretaria Municipal de Educação. A nossa{' '}
          <a href="/politica-de-privacidade" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Política de Privacidade
          </a>{' '}
          explica como tratamos seus dados.
        </p>
      </div>
    </ProtectedRoute>
  )
}
