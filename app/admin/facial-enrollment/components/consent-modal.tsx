'use client'

import { LoadingSpinner } from '@/components/ui/loading-spinner'
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
  aluno,
  consentForm,
  setConsentForm,
  salvandoConsent,
  onSalvar,
  onCancelar,
}: ConsentModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">
            Termo de Consentimento
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Aluno: {aluno?.nome}
          </p>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Responsavel *
            </label>
            <input
              type="text"
              value={consentForm.responsavel_nome}
              onChange={e => setConsentForm(prev => ({ ...prev, responsavel_nome: e.target.value }))}
              placeholder="Nome completo do responsavel legal"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CPF do Responsavel (opcional)
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={consentForm.responsavel_cpf}
              onChange={e => setConsentForm(prev => ({ ...prev, responsavel_cpf: e.target.value }))}
              placeholder="000.000.000-00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          <div className="flex items-start gap-3 p-3 min-h-[44px] bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="consent-check"
              checked={consentForm.consentido}
              onChange={e => setConsentForm(prev => ({ ...prev, consentido: e.target.checked }))}
              className="mt-1 h-5 w-5 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
            />
            <label htmlFor="consent-check" className="text-sm text-gray-700">
              Autorizo o uso de reconhecimento facial para fins de registro de presenca escolar.
              Estou ciente de que apenas vetores matematicos serao armazenados, e nao imagens ou
              fotografias.
            </label>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button
            onClick={onCancelar}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSalvar}
            disabled={salvandoConsent || !consentForm.responsavel_nome.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {salvandoConsent && <LoadingSpinner />}
            Salvar Consentimento
          </button>
        </div>
      </div>
    </div>
  )
}
