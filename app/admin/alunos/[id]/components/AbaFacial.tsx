'use client'

import { useEffect, useState } from 'react'
import {
  ScanFace, Shield, CheckCircle, XCircle, AlertTriangle,
  Calendar, User, Clock, Fingerprint
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface DadosFaciais {
  consentimento: {
    consentido: boolean
    responsavel_nome: string | null
    responsavel_cpf: string | null
    data_consentimento: string | null
    data_revogacao: string | null
  } | null
  embedding: {
    qualidade: number | null
    versao_modelo: string | null
    criado_em: string | null
  } | null
  fotos_captura: string[] // fotos das poses (se disponíveis no futuro)
}

interface Props {
  alunoId: string
  alunoNome: string
}

export function AbaFacial({ alunoId, alunoNome }: Props) {
  const [dados, setDados] = useState<DadosFaciais | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      setCarregando(true)
      try {
        // Buscar consentimento
        const consentRes = await fetch(`/api/admin/facial/consentimento?escola_id=all&aluno_id=${alunoId}`, {
          credentials: 'include',
        })

        // Buscar embedding
        const embedRes = await fetch(`/api/admin/facial/enrollment?aluno_id=${alunoId}`, {
          credentials: 'include',
        })

        let consentimento = null
        let embedding = null

        if (consentRes.ok) {
          const consentData = await consentRes.json()
          const lista = consentData.alunos || consentData
          const aluno = Array.isArray(lista) ? lista.find((a: any) => a.aluno_id === alunoId) : null
          if (aluno) {
            consentimento = {
              consentido: aluno.consentido || false,
              responsavel_nome: aluno.responsavel_nome || null,
              responsavel_cpf: aluno.responsavel_cpf || null,
              data_consentimento: aluno.data_consentimento || null,
              data_revogacao: aluno.data_revogacao || null,
            }
          }
        }

        if (embedRes.ok) {
          const embedData = await embedRes.json()
          embedding = {
            qualidade: embedData.qualidade || null,
            versao_modelo: embedData.versao_modelo || null,
            criado_em: embedData.criado_em || null,
          }
        }

        setDados({ consentimento, embedding, fotos_captura: [] })
      } catch {
        setDados({ consentimento: null, embedding: null, fotos_captura: [] })
      } finally {
        setCarregando(false)
      }
    }

    carregar()
  }, [alunoId])

  if (carregando) {
    return <LoadingSpinner text="Carregando dados faciais..." centered />
  }

  const temConsentimento = dados?.consentimento?.consentido === true
  const temEmbedding = dados?.embedding !== null
  const formatarData = (d: string | null) => {
    if (!d) return '-'
    try { return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
    catch { return d }
  }

  return (
    <div className="space-y-6">
      {/* Status geral */}
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
            <XCircle className="w-8 h-8 text-red-400 mx-auto" />
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
          {temEmbedding && dados?.embedding?.qualidade ? (
            <div className="text-center">
              <p className={`text-3xl font-bold ${
                dados.embedding.qualidade >= 80 ? 'text-green-600' :
                dados.embedding.qualidade >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {dados.embedding.qualidade}%
              </p>
              <div className="w-full h-2 bg-gray-200 dark:bg-slate-600 rounded-full mt-2 overflow-hidden">
                <div className={`h-full rounded-full ${
                  dados.embedding.qualidade >= 80 ? 'bg-green-500' :
                  dados.embedding.qualidade >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`} style={{ width: `${dados.embedding.qualidade}%` }} />
              </div>
            </div>
          ) : (
            <p className="text-2xl font-bold text-gray-300 text-center">-</p>
          )}
        </div>
      </div>

      {/* Detalhes do consentimento */}
      {dados?.consentimento && (
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
                {dados.consentimento.responsavel_nome || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">CPF do Responsavel</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {dados.consentimento.responsavel_cpf || 'Nao informado'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Data do Consentimento</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                {formatarData(dados.consentimento.data_consentimento)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                temConsentimento
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
              }`}>
                {temConsentimento ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {temConsentimento ? 'Consentimento ativo' : 'Revogado'}
              </span>
            </div>
            {dados.consentimento.data_revogacao && (
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Data da Revogacao</p>
                <p className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {formatarData(dados.consentimento.data_revogacao)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detalhes do embedding */}
      {temEmbedding && dados?.embedding && (
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
                (dados.embedding.qualidade || 0) >= 80 ? 'text-green-600' :
                (dados.embedding.qualidade || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {dados.embedding.qualidade ? `${dados.embedding.qualidade}%` : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Versao do Modelo</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {dados.embedding.versao_modelo || 'v1'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Data do Cadastro</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                {formatarData(dados.embedding.criado_em)}
              </p>
            </div>
          </div>

          {/* Aviso LGPD */}
          <div className="mx-5 mb-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Os dados faciais consistem exclusivamente em vetores matematicos (128 dimensoes).
              Nenhuma foto ou imagem do aluno e armazenada no sistema.
            </p>
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {!temConsentimento && !temEmbedding && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 text-center">
          <ScanFace className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Sem cadastro facial</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Este aluno ainda nao possui cadastro de reconhecimento facial.
            Acesse o modulo de Cadastro Facial para registrar o consentimento e capturar o rosto do aluno.
          </p>
        </div>
      )}
    </div>
  )
}
