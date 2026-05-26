'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  FileSignature,
  FileText,
  FileCheck,
  ArrowLeftRight,
  Plus,
  Search,
  X,
  Loader2,
  Save,
  QrCode,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Copy,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useAnoLetivo } from '@/lib/contexts/ano-letivo-context'

interface DocumentoEmitido {
  id: string
  codigo_validacao: string
  tipo: string
  status: 'ativo' | 'cancelado' | 'substituido'
  emitido_em: string
  escola_nome_snapshot: string | null
  vezes_validado: number
  ultima_validacao: string | null
  cancelado_em: string | null
  motivo_cancelamento: string | null
  aluno_nome: string | null
  aluno_matricula: string | null
  emitido_por_nome: string | null
}

interface AlunoBusca {
  id: string
  nome: string
  codigo?: string | null
  serie?: string | null
  escola_nome?: string | null
}

interface Estatisticas {
  total: number
  ativos: number
  cancelados: number
  total_validacoes: number
}

const TIPO_LABEL: Record<string, string> = {
  historico_escolar: 'Histórico Escolar',
  guia_transferencia: 'Guia de Transferência',
  declaracao_matricula: 'Declaração de Matrícula',
  declaracao_frequencia: 'Declaração de Frequência',
  declaracao_conclusao: 'Declaração de Conclusão',
  declaracao_transferencia: 'Declaração de Transferência',
  boletim_escolar: 'Boletim Escolar',
  certificado_eja: 'Certificado EJA',
}

const TIPO_BADGE: Record<string, string> = {
  historico_escolar: 'bg-purple-100 text-purple-700',
  guia_transferencia: 'bg-amber-100 text-amber-700',
  declaracao_matricula: 'bg-blue-100 text-blue-700',
  declaracao_frequencia: 'bg-cyan-100 text-cyan-700',
  declaracao_conclusao: 'bg-emerald-100 text-emerald-700',
  declaracao_transferencia: 'bg-orange-100 text-orange-700',
  boletim_escolar: 'bg-indigo-100 text-indigo-700',
  certificado_eja: 'bg-teal-100 text-teal-700',
}

const STATUS_BADGE: Record<string, string> = {
  ativo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelado: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  substituido: 'bg-slate-100 text-slate-700',
}

const TIPOS_EMISSAO = [
  {
    id: 'declaracao',
    label: 'Declaração',
    descricao: 'Matrícula, Frequência ou Conclusão',
    Icon: FileSignature,
    cor: 'blue',
  },
  {
    id: 'historico',
    label: 'Histórico Escolar',
    descricao: 'Histórico formal completo com QR de validação',
    Icon: FileText,
    cor: 'purple',
  },
  {
    id: 'transferencia',
    label: 'Transferência',
    descricao: 'Guia ou Declaração de Transferência',
    Icon: ArrowLeftRight,
    cor: 'amber',
  },
] as const

function DocumentosAdmin() {
  const toast = useToast()
  const [aba, setAba] = useState<'emitir' | 'historico'>('emitir')
  const [documentos, setDocumentos] = useState<DocumentoEmitido[]>([])
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null)
  const [carregando, setCarregando] = useState(false)

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroCodigo, setFiltroCodigo] = useState('')

  // Emissão — modal genérico de qualquer tipo
  const [tipoEmissao, setTipoEmissao] = useState<'declaracao' | 'historico' | 'transferencia' | null>(null)
  const [emitindo, setEmitindo] = useState(false)

  // Form de emissão
  const [buscaAluno, setBuscaAluno] = useState('')
  const [alunosResult, setAlunosResult] = useState<AlunoBusca[]>([])
  const [buscandoAluno, setBuscandoAluno] = useState(false)
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoBusca | null>(null)
  const buscaAlunoAbortRef = useRef<AbortController | null>(null)

  // Ano letivo padrão vem do contexto global, mas pode ser alterado por emissão
  const { anoLetivo: anoGlobal, anosDisponiveis } = useAnoLetivo()
  const [anoLetivoEmitir, setAnoLetivoEmitir] = useState(anoGlobal)
  const [tipoDeclaracao, setTipoDeclaracao] = useState<'matricula' | 'frequencia' | 'conclusao'>('matricula')
  const [serieConcluida, setSerieConcluida] = useState('')
  const [tipoTransferencia, setTipoTransferencia] = useState<'guia_transferencia' | 'declaracao_transferencia'>('guia_transferencia')
  const [motivoTransferencia, setMotivoTransferencia] = useState('')
  const [destinoNome, setDestinoNome] = useState('')
  const [destinoCidade, setDestinoCidade] = useState('')

  // Documento recém-emitido (mostra código + link de validação)
  const [docEmitido, setDocEmitido] = useState<{ codigo: string; tipo: string; aluno: string } | null>(null)

  // Cancelar
  const [modalCancelar, setModalCancelar] = useState<DocumentoEmitido | null>(null)
  const [cancelando, setCancelando] = useState(false)

  const carregar = useCallback(async (signal?: AbortSignal) => {
    if (aba !== 'historico') return
    setCarregando(true)
    try {
      const p = new URLSearchParams({ limite: '100' })
      if (filtroTipo) p.set('tipo', filtroTipo)
      if (filtroStatus) p.set('status', filtroStatus)
      if (filtroCodigo.trim().length >= 3) p.set('codigo', filtroCodigo.trim())
      const res = await fetch(`/api/admin/documentos?${p}`, { signal })
      const data = await res.json()
      setDocumentos(data.documentos || [])
      setEstatisticas(data.estatisticas || null)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error('Erro ao carregar documentos')
    } finally {
      setCarregando(false)
    }
  }, [aba, filtroTipo, filtroStatus, filtroCodigo, toast])

  useEffect(() => {
    const controller = new AbortController()
    const t = setTimeout(() => carregar(controller.signal), 300)
    return () => { clearTimeout(t); controller.abort() }
  }, [carregar])

  // Busca de aluno (debounce + abort)
  useEffect(() => {
    if (!tipoEmissao || alunoSelecionado || buscaAluno.trim().length < 2) {
      setAlunosResult([])
      return
    }
    buscaAlunoAbortRef.current?.abort()
    const controller = new AbortController()
    buscaAlunoAbortRef.current = controller
    const t = setTimeout(async () => {
      setBuscandoAluno(true)
      try {
        const res = await fetch(
          `/api/admin/alunos?busca=${encodeURIComponent(buscaAluno.trim())}&limite=15`,
          { signal: controller.signal }
        )
        const data = await res.json()
        setAlunosResult(Array.isArray(data) ? data : data.alunos || [])
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setAlunosResult([])
      } finally {
        if (buscaAlunoAbortRef.current === controller) setBuscandoAluno(false)
      }
    }, 350)
    return () => { clearTimeout(t); controller.abort() }
  }, [buscaAluno, alunoSelecionado, tipoEmissao])

  function abrirEmissao(tipo: 'declaracao' | 'historico' | 'transferencia') {
    setTipoEmissao(tipo)
    setAlunoSelecionado(null)
    setBuscaAluno('')
    setAlunosResult([])
    setAnoLetivoEmitir(anoGlobal)
    setTipoDeclaracao('matricula')
    setSerieConcluida('')
    setTipoTransferencia('guia_transferencia')
    setMotivoTransferencia('')
    setDestinoNome('')
    setDestinoCidade('')
    setDocEmitido(null)
  }

  async function emitirDocumento() {
    if (!tipoEmissao || !alunoSelecionado) {
      toast.error('Selecione o aluno')
      return
    }
    setEmitindo(true)
    try {
      let endpoint = ''
      let body: Record<string, unknown> = {}

      if (tipoEmissao === 'declaracao') {
        endpoint = '/api/admin/documentos/declaracao'
        body = {
          tipo: tipoDeclaracao,
          alunoId: alunoSelecionado.id,
          anoLetivo: anoLetivoEmitir,
        }
        if (tipoDeclaracao === 'conclusao') {
          if (!serieConcluida.trim()) {
            toast.error('Informe a série concluída')
            setEmitindo(false)
            return
          }
          body.serieConcluida = serieConcluida.trim()
        }
      } else if (tipoEmissao === 'historico') {
        endpoint = '/api/admin/documentos/historico'
        body = { alunoId: alunoSelecionado.id }
      } else {
        endpoint = '/api/admin/documentos/transferencia'
        body = {
          alunoId: alunoSelecionado.id,
          anoLetivo: anoLetivoEmitir,
          tipo: tipoTransferencia,
        }
        if (motivoTransferencia.trim()) body.motivo = motivoTransferencia.trim()
        if (destinoNome.trim()) {
          body.escolaDestino = {
            nome: destinoNome.trim(),
            ...(destinoCidade.trim() ? { cidade: destinoCidade.trim() } : {}),
          }
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro ao emitir')
      }
      const data = await res.json()
      toast.success('Documento emitido')
      setDocEmitido({
        codigo: data.codigo_validacao,
        tipo: tipoEmissao,
        aluno: alunoSelecionado.nome,
      })
      // Mantém modal aberto para mostrar o código emitido
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setEmitindo(false)
    }
  }

  async function confirmarCancelar(motivo?: string) {
    if (!modalCancelar || !motivo) return
    setCancelando(true)
    try {
      const res = await fetch(`/api/admin/documentos?id=${modalCancelar.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Documento cancelado')
      setModalCancelar(null)
      carregar()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setCancelando(false)
    }
  }

  function copiarCodigo(codigo: string) {
    navigator.clipboard.writeText(codigo).then(
      () => toast.success(`Código ${codigo} copiado`),
      () => toast.error('Falha ao copiar')
    )
  }

  function copiarUrlValidacao(codigo: string) {
    const url = `${window.location.origin}/validar/${codigo}`
    navigator.clipboard.writeText(url).then(
      () => toast.success('Link de validação copiado'),
      () => toast.error('Falha ao copiar')
    )
  }

  const inputCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none'

  return (
    <div>
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3">
          <FileCheck className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Documentos Emitidos</h1>
            <p className="text-indigo-100 text-sm">Declarações, histórico escolar e transferências com QR de validação pública</p>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-slate-700">
        {[
          { k: 'emitir', label: 'Emitir documento', Icon: Plus },
          { k: 'historico', label: 'Histórico de emissões', Icon: FileText },
        ].map((tab) => (
          <button
            key={tab.k}
            onClick={() => setAba(tab.k as any)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
              aba === tab.k
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <tab.Icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {aba === 'emitir' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIPOS_EMISSAO.map((t) => {
            const Icon = t.Icon
            return (
              <button
                key={t.id}
                onClick={() => abrirEmissao(t.id)}
                className={`group bg-white dark:bg-slate-800 rounded-2xl border-2 border-transparent hover:border-${t.cor}-500 shadow hover:shadow-lg transition-all p-6 text-left`}
              >
                <div className={`bg-${t.cor}-100 dark:bg-${t.cor}-900/30 rounded-xl p-3 w-fit mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-7 h-7 text-${t.cor}-600 dark:text-${t.cor}-400`} />
                </div>
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-1">{t.label}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.descricao}</p>
                <p className={`mt-4 text-sm font-bold text-${t.cor}-600 dark:text-${t.cor}-400`}>
                  Emitir →
                </p>
              </button>
            )
          })}
        </div>
      )}

      {aba === 'historico' && (
        <>
          {estatisticas && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-4 text-center">
                <FileCheck className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{estatisticas.total}</p>
                <p className="text-xs text-indigo-600">Total emitidos</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
                <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{estatisticas.ativos}</p>
                <p className="text-xs text-green-600">Ativos</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4 text-center">
                <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{estatisticas.cancelados}</p>
                <p className="text-xs text-red-600">Cancelados</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center">
                <QrCode className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{estatisticas.total_validacoes}</p>
                <p className="text-xs text-amber-600">Validações públicas</p>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filtroCodigo}
                  onChange={(e) => setFiltroCodigo(e.target.value.toUpperCase())}
                  placeholder="Buscar por código de validação (mín. 3 chars)..."
                  className={`${inputCls} w-full pl-9 font-mono`}
                />
              </div>
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className={inputCls}>
                <option value="">Todos os tipos</option>
                {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className={inputCls}>
                <option value="">Todos os status</option>
                <option value="ativo">Ativo</option>
                <option value="cancelado">Cancelado</option>
                <option value="substituido">Substituído</option>
              </select>
            </div>
          </div>

          {/* Lista */}
          {carregando ? (
            <LoadingSpinner centered />
          ) : documentos.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <FileCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum documento encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documentos.map((d) => (
                <div key={d.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${TIPO_BADGE[d.tipo] || 'bg-slate-100 text-slate-700'}`}>
                          {TIPO_LABEL[d.tipo] || d.tipo}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[d.status]}`}>
                          {d.status}
                        </span>
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{d.codigo_validacao}</span>
                        <button onClick={() => copiarCodigo(d.codigo_validacao)} className="text-gray-400 hover:text-indigo-600" title="Copiar código">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {d.aluno_nome || 'Aluno removido'}
                        {d.aluno_matricula && <span className="text-gray-400 font-normal ml-2">#{d.aluno_matricula}</span>}
                      </p>
                      <div className="flex gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                        {d.escola_nome_snapshot && <span>{d.escola_nome_snapshot}</span>}
                        <span>Emitido em {new Date(d.emitido_em).toLocaleString('pt-BR')}</span>
                        {d.emitido_por_nome && <span>por {d.emitido_por_nome}</span>}
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {d.vezes_validado} validações</span>
                      </div>
                      {d.status === 'cancelado' && d.motivo_cancelamento && (
                        <p className="text-xs text-red-600 italic mt-2">
                          ⚠ Cancelado em {d.cancelado_em && new Date(d.cancelado_em).toLocaleString('pt-BR')}: {d.motivo_cancelamento}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => copiarUrlValidacao(d.codigo_validacao)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-200"
                        title="Copiar link público de validação"
                      >
                        <QrCode className="w-3 h-3" /> Link
                      </button>
                      {d.status === 'ativo' && (
                        <button
                          onClick={() => setModalCancelar(d)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold hover:bg-red-200"
                          title="Cancelar documento"
                        >
                          <Ban className="w-3 h-3" /> Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal de emissão */}
      {tipoEmissao && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                Emitir {TIPOS_EMISSAO.find((t) => t.id === tipoEmissao)?.label}
              </h2>
              <button onClick={() => { setTipoEmissao(null); setDocEmitido(null) }} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tela de sucesso pós-emissão */}
            {docEmitido ? (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-green-800 dark:text-green-200">Documento emitido com sucesso</p>
                    <p className="text-xs text-green-700 dark:text-green-300">{docEmitido.aluno}</p>
                  </div>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
                  <p className="text-xs text-indigo-600 dark:text-indigo-300 mb-1">Código de validação</p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-xl font-bold text-indigo-700 dark:text-indigo-300 tracking-wider">{docEmitido.codigo}</p>
                    <button
                      onClick={() => copiarCodigo(docEmitido.codigo)}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                    >
                      <Copy className="w-3 h-3" /> Copiar
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Qualquer pessoa pode validar este documento em <strong>/validar/{docEmitido.codigo}</strong>
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => copiarUrlValidacao(docEmitido.codigo)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-bold hover:bg-indigo-200"
                  >
                    <QrCode className="w-4 h-4" /> Copiar link público
                  </button>
                  <button
                    onClick={() => { setDocEmitido(null); setAlunoSelecionado(null); setBuscaAluno('') }}
                    className="flex-1 px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold"
                  >
                    Emitir outro
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-6 space-y-4">
                  {/* Busca de aluno */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Aluno *</label>
                    {alunoSelecionado ? (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300 truncate">{alunoSelecionado.nome}</p>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400">
                            {alunoSelecionado.codigo && `#${alunoSelecionado.codigo}`}
                            {alunoSelecionado.serie && ` • ${alunoSelecionado.serie}`}
                            {alunoSelecionado.escola_nome && ` • ${alunoSelecionado.escola_nome}`}
                          </p>
                        </div>
                        <button type="button" onClick={() => { setAlunoSelecionado(null); setBuscaAluno('') }} className="p-1 rounded text-indigo-600 hover:bg-indigo-100">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={buscaAluno}
                          onChange={(e) => setBuscaAluno(e.target.value)}
                          placeholder="Buscar aluno por nome ou matrícula..."
                          className={`${inputCls} w-full pl-9`}
                          autoComplete="off"
                        />
                        {(buscandoAluno || alunosResult.length > 0) && (
                          <div className="mt-2 border border-gray-200 dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto bg-white dark:bg-slate-800">
                            {buscandoAluno && alunosResult.length === 0 && (
                              <p className="text-xs text-gray-400 p-3 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Buscando...</p>
                            )}
                            {alunosResult.map((a) => (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => { setAlunoSelecionado(a); setBuscaAluno(''); setAlunosResult([]) }}
                                className="w-full text-left px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm border-b border-gray-100 dark:border-slate-700 last:border-0"
                              >
                                <p className="font-semibold text-gray-800 dark:text-gray-200">{a.nome}</p>
                                <p className="text-xs text-gray-400">{a.codigo || ''} {a.serie && `• ${a.serie}`}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Campos específicos por tipo */}
                  {tipoEmissao === 'declaracao' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo de declaração</label>
                          <select value={tipoDeclaracao} onChange={(e) => setTipoDeclaracao(e.target.value as any)} className={`${inputCls} w-full`}>
                            <option value="matricula">Matrícula</option>
                            <option value="frequencia">Frequência</option>
                            <option value="conclusao">Conclusão</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">Ano letivo</label>
                          <select value={anoLetivoEmitir} onChange={(e) => setAnoLetivoEmitir(e.target.value)} className={`${inputCls} w-full`}>
                            {anosDisponiveis.map((a) => (
                              <option key={a.ano} value={a.ano}>
                                {a.ano}{a.ativo || a.status === 'ativo' ? ' (ativo)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {tipoDeclaracao === 'conclusao' && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">Série concluída *</label>
                          <input type="text" value={serieConcluida} onChange={(e) => setSerieConcluida(e.target.value)} placeholder="Ex: 9º ano do Ensino Fundamental" className={`${inputCls} w-full`} />
                        </div>
                      )}
                    </>
                  )}

                  {tipoEmissao === 'historico' && (
                    <div className="text-xs text-gray-500 bg-gray-50 dark:bg-slate-700/30 rounded-lg p-3">
                      O histórico escolar é gerado a partir de todos os anos letivos cursados pelo aluno na rede municipal, incluindo notas detalhadas por disciplina e situação anual.
                    </div>
                  )}

                  {tipoEmissao === 'transferencia' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo de documento</label>
                          <select value={tipoTransferencia} onChange={(e) => setTipoTransferencia(e.target.value as any)} className={`${inputCls} w-full`}>
                            <option value="guia_transferencia">Guia de Transferência</option>
                            <option value="declaracao_transferencia">Declaração de Transferência</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">Ano letivo</label>
                          <select value={anoLetivoEmitir} onChange={(e) => setAnoLetivoEmitir(e.target.value)} className={`${inputCls} w-full`}>
                            {anosDisponiveis.map((a) => (
                              <option key={a.ano} value={a.ano}>
                                {a.ano}{a.ativo || a.status === 'ativo' ? ' (ativo)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Escola de destino</label>
                        <input type="text" value={destinoNome} onChange={(e) => setDestinoNome(e.target.value)} placeholder="Nome da escola para onde o aluno está sendo transferido" className={`${inputCls} w-full`} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Cidade de destino</label>
                        <input type="text" value={destinoCidade} onChange={(e) => setDestinoCidade(e.target.value)} className={`${inputCls} w-full`} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Motivo</label>
                        <textarea value={motivoTransferencia} onChange={(e) => setMotivoTransferencia(e.target.value)} rows={2} placeholder="Mudança de cidade, opção da família..." className={`${inputCls} w-full`} />
                      </div>
                    </>
                  )}
                </div>

                <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
                  <button onClick={() => setTipoEmissao(null)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
                  <button
                    onClick={emitirDocumento}
                    disabled={emitindo || !alunoSelecionado}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {emitindo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Emitir documento
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        aberto={!!modalCancelar}
        titulo="Cancelar documento?"
        mensagem={modalCancelar ? `O documento ${TIPO_LABEL[modalCancelar.tipo] || modalCancelar.tipo} (código ${modalCancelar.codigo_validacao}) será marcado como CANCELADO. A página pública de validação passará a indicar invalidez.\n\nO snapshot original e a auditoria são preservados.` : ''}
        variant="danger"
        exigirJustificativa
        placeholderJustificativa="Motivo do cancelamento (erro de emissão, dados incorretos, substituição...)"
        minCaracteresJustificativa={5}
        textoConfirmar="Cancelar documento"
        textoCancelar="Voltar"
        processando={cancelando}
        onConfirmar={(motivo) => confirmarCancelar(motivo)}
        onFechar={() => setModalCancelar(null)}
      />
    </div>
  )
}

export default function DocumentosAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <DocumentosAdmin />
    </ProtectedRoute>
  )
}
