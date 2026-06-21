'use client'

import { CheckCircle } from 'lucide-react'

interface ResultadoSucessoProps {
  protocolo: string
  onNovaMatricula: () => void
  onConsultarStatus: () => void
}

export default function ResultadoSucesso({
  protocolo,
  onNovaMatricula,
  onConsultarStatus,
}: ResultadoSucessoProps) {
  return (
    <div className="max-w-lg mx-auto text-center">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Pré-Matrícula Enviada!</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">Sua solicitação foi registrada com sucesso.</p>
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">Seu protocolo:</p>
          <p className="text-2xl font-bold text-blue-800 dark:text-blue-200 font-mono">{protocolo}</p>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Guarde este protocolo para acompanhar o andamento da sua solicitação.
          Você pode consultar o status a qualquer momento na aba "Consultar Protocolo".
        </p>
        <div className="flex gap-3">
          <button onClick={onNovaMatricula}
            className="flex-1 py-3 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
            Nova Pré-Matrícula
          </button>
          <button onClick={onConsultarStatus}
            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">
            Consultar Status
          </button>
        </div>
      </div>
    </div>
  )
}
