'use client'

import { useEffect, useState } from 'react'
import {
  ScanFace, Shield, CheckCircle, XCircle, AlertTriangle,
  Calendar, User, Clock, Fingerprint, Save, Loader2
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToast } from '@/components/toast'

interface Props {
  alunoId: string
  alunoNome: string
}

export function AbaFacial({ alunoId, alunoNome }: Props) {
  const toast = useToast()

  // Dados
  const [consentimento, setConsentimento] = useState<any>(null)
  const [embedding, setEmbedding] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)

  // Formulário de consentimento
  const [mostrarFormConsent, setMostrarFormConsent] = useState(false)
  const [responsavelNome, setResponsavelNome] = useState('')
  const [responsavelCpf, setResponsavelCpf] = useState('')
  const [salvandoConsent, setSalvandoConsent] = useState(false)

  const carregar = async () => {
    setCarregando(true)
    try {
      const [consentRes, embedRes] = await Promise.all([
        fetch(`/api/admin/facial/consentimento?aluno_id=${alunoId}`, { credentials: 'include' }),
        fetch(`/api/admin/facial/enrollment?aluno_id=${alunoId}`, { credentials: 'include' }),
      ])

      if (consentRes.ok) {
        const data = await consentRes.json()
        const lista = data.alunos || []
        const aluno = lista.find((a: any) => a.aluno_id === alunoId)
        setConsentimento(aluno || null)
      }

      if (embedRes.ok) {
        setEmbedding(await embedRes.json())
      } else {
        setEmbedding(null)
      }
    } catch (err) {
      console.error('[AbaFacial] Erro ao carregar dados faciais:', (err as Error).message)
    }
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [alunoId])

  const salvarConsentimento = async () => {
    if (!responsavelNome.trim()) {
      toast.error('Informe o nome do responsavel')
      return
    }

    setSalvandoConsent(true)
    try {
      const res = await fetch('/api/admin/facial/consentimento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          aluno_id: alunoId,
          responsavel_nome: responsavelNome.trim(),
          responsavel_cpf: responsavelCpf.trim() || null,
          consentido: true,
        }),
      })

      if (res.ok) {
        toast.success('Consentimento LGPD registrado com sucesso!')
        setMostrarFormConsent(false)
        setResponsavelNome('')
        setResponsavelCpf('')
        await carregar()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.mensagem || 'Erro ao registrar consentimento')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setSalvandoConsent(false)
    }
  }

  if (carregando) return <LoadingSpinner text="Carregando dados faciais..." centered />

  const temConsentimento = consentimento?.consentido === true
  const temEmbedding = embedding?.aluno_id != null

  const formatarData = (d: string | null | undefined) => {
    if (!d) return '-'
    try { return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
    catch { return d }
  }

  return (
    <div className="space-y-6">
      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Consentimento */}
        <div className={`rounded-xl p-5 border-2 ${
          temConsentimento
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`rounded-lg p-2 ${temConsentimento ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
              <Shield className={`w-5 h-5 ${temConsentimento ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Consentimento LGPD</p>
              <p className={`text-xs font-medium ${temConsentimento ? 'text-green-600' : 'text-red-600'}`}>
                {temConsentimento ? 'Autorizado' : 'Nao autorizado'}
              </p>
            </div>
          </div>
          {temConsentimento ? (
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
          ) : (
            <div className="text-center">
              <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <button
                onClick={() => setMostrarFormConsent(true)}
                className="text-xs font-semibold text-red-600 hover:text-red-700 underline"
              >
                Registrar consentimento
              </button>
            </div>
          )}
        </div>

        {/* Embedding */}
        <div className={`rounded-xl p-5 border-2 ${
          temEmbedding
            ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800'
            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`rounded-lg p-2 ${temEmbedding ? 'bg-teal-100 dark:bg-teal-900/40' : 'bg-gray-100 dark:bg-gray-700'}`}>
              <ScanFace className={`w-5 h-5 ${temEmbedding ? 'text-teal-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Cadastro Facial</p>
              <p className={`text-xs font-medium ${temEmbedding ? 'text-teal-600' : 'text-gray-500'}`}>
                {temEmbedding ? 'Cadastrado' : 'Nao cadastrado'}
              </p>
            </div>
          </div>
          {temEmbedding ? (
            <CheckCircle className="w-8 h-8 text-teal-500 mx-auto" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto" />
          )}
        </div>

        {/* Qualidade */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-2 border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-indigo-100 dark:bg-indigo-900/40 rounded-lg p-2">
              <Fingerprint className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Qualidade</p>
              <p className="text-xs text-gray-500">do reconhecimento</p>
            </div>
          </div>
          {temEmbedding && embedding?.qualidade ? (
            <div className="text-center">
              <p className={`text-3xl font-bold ${
                embedding.qualidade >= 80 ? 'text-green-600' :
                embedding.qualidade >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>{embedding.qualidade}%</p>
              <div className="w-full h-2 bg-gray-200 dark:bg-slate-600 rounded-full mt-2 overflow-hidden">
                <div className={`h-full rounded-full ${
                  embedding.qualidade >= 80 ? 'bg-green-500' :
                  embedding.qualidade >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`} style={{ width: `${embedding.qualidade}%` }} />
              </div>
            </div>
          ) : (
            <p className="text-2xl font-bold text-gray-300 text-center">-</p>
          )}
        </div>
      </div>

      {/* Formulário de consentimento */}
      {mostrarFormConsent && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-teal-200 dark:border-teal-800 overflow-hidden">
          <div className="px-5 py-3 bg-teal-50 dark:bg-teal-900/30 border-b border-teal-200 dark:border-teal-800">
            <h3 className="text-sm font-semibold text-teal-700 dark:text-teal-300 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Registrar Consentimento LGPD — {alunoNome}
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Responsavel *</label>
              <input type="text" value={responsavelNome} onChange={e => setResponsavelNome(e.target.value)}
                placeholder="Nome completo do responsavel legal"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CPF do Responsavel (opcional)</label>
              <input type="text" value={responsavelCpf} onChange={e => setResponsavelCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Ao registrar o consentimento, o responsavel autoriza o uso de reconhecimento facial
                para fins de registro de presenca escolar. Apenas vetores matematicos sao armazenados,
                nao imagens ou fotografias.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setMostrarFormConsent(false); setResponsavelNome(''); setResponsavelCpf('') }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={salvarConsentimento} disabled={!responsavelNome.trim() || salvandoConsent}
                className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2">
                {salvandoConsent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Registrar Consentimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detalhes do consentimento */}
      {temConsentimento && consentimento && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-500" />
              Detalhes do Consentimento
            </h3>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Responsavel</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                {consentimento.responsavel_nome || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">CPF do Responsavel</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {consentimento.responsavel_cpf || 'Nao informado'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Data do Consentimento</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                {formatarData(consentimento.data_consentimento)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                <CheckCircle className="w-3.5 h-3.5" /> Consentimento ativo
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Detalhes do embedding */}
      {temEmbedding && embedding && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <ScanFace className="w-4 h-4 text-teal-500" />
              Dados do Cadastro Facial
            </h3>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Qualidade da Captura</p>
              <p className={`text-lg font-bold ${
                (embedding.qualidade || 0) >= 80 ? 'text-green-600' :
                (embedding.qualidade || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>{embedding.qualidade ? `${embedding.qualidade}%` : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Versao do Modelo</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{embedding.versao_modelo || 'v1'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Data do Cadastro</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                {formatarData(embedding.criado_em)}
              </p>
            </div>
          </div>
          <div className="mx-5 mb-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Os dados faciais consistem exclusivamente em vetores matematicos (128 dimensoes).
              Nenhuma foto ou imagem do aluno e armazenada no sistema.
            </p>
          </div>
        </div>
      )}

      {/* Estado vazio — sem consentimento e sem embedding */}
      {!temConsentimento && !temEmbedding && !mostrarFormConsent && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 text-center">
          <ScanFace className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Sem cadastro facial</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
            Este aluno ainda nao possui cadastro de reconhecimento facial.
            Registre o consentimento do responsavel para iniciar.
          </p>
          <button onClick={() => setMostrarFormConsent(true)}
            className="px-5 py-2.5 bg-teal-600 text-white rounded-lg font-semibold text-sm hover:bg-teal-700 transition-colors inline-flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Registrar Consentimento LGPD
          </button>
        </div>
      )}
    </div>
  )
}
