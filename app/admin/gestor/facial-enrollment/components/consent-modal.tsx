'use client'

import { Shield } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ModalBase } from '@/components/ui/modal-base'
import { AlunoFacial, ConsentForm } from '../types'

interface ConsentModalProps {
  aluno: AlunoFacial | undefined
  consentForm: ConsentForm
  setConsentForm: React.Dispatch<React.SetStateAction<ConsentForm>>
  salvandoConsent: boolean
  onSalvar: () => void
  onCancelar: () => void
}

export function ConsentModal({
  aluno, consentForm, setConsentForm, salvandoConsent, onSalvar, onCancelar,
}: ConsentModalProps) {
  return (
    <ModalBase aberto={!!aluno} onFechar={onCancelar} titulo="Termo de Consentimento" largura="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 -mt-1">
          <div className="bg-indigo-100 dark:bg-indigo-900/40 rounded-lg p-1.5">
            <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Aluno: {aluno?.nome}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="resp-nome">
            Nome do Responsavel *
          </label>
          <input
            id="resp-nome"
            type="text"
            aria-required="true"
            value={consentForm.responsavel_nome}
            onChange={e => setConsentForm(prev => ({ ...prev, responsavel_nome: e.target.value }))}
            placeholder="Nome completo do responsavel legal"
            className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg px-3 py-3 sm:py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="resp-cpf">
            CPF do Responsavel <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span>
          </label>
          <input
            id="resp-cpf"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={consentForm.responsavel_cpf}
            onChange={e => setConsentForm(prev => ({ ...prev, responsavel_cpf: e.target.value }))}
            placeholder="000.000.000-00"
            className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg px-3 py-3 sm:py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>

        <label htmlFor="consent-check" className="flex items-start gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl cursor-pointer active:bg-indigo-100 dark:active:bg-indigo-900/30 transition-colors">
          <input
            type="checkbox"
            id="consent-check"
            checked={consentForm.consentido}
            onChange={e => setConsentForm(prev => ({ ...prev, consentido: e.target.checked }))}
            className="mt-0.5 h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-slate-500 rounded shrink-0"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            Autorizo o uso de reconhecimento facial para fins de registro de presenca escolar.
            Estou ciente de que apenas vetores matematicos serao armazenados, e nao imagens ou fotografias.
          </span>
        </label>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onCancelar}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl"
          >
            Cancelar
          </button>
          <button
            onClick={onSalvar}
            disabled={salvandoConsent || !consentForm.responsavel_nome.trim()}
            aria-busy={salvandoConsent}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {salvandoConsent && <LoadingSpinner />}
            Salvar Consentimento
          </button>
        </div>
      </div>
    </ModalBase>
  )
}
