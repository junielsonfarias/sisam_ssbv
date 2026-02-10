'use client'

import ProtectedRoute from '@/components/protected-route'
import Link from 'next/link'
import { Database, ArrowRight } from 'lucide-react'

export default function EscolaResultadosPage() {
  return (
    <ProtectedRoute tiposPermitidos={['escola']}>
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-6">
            <Database className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Resultados Consolidados
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Os dados consolidados estao disponiveis no <strong>Painel de Dados</strong>. Acesse para visualizar os resultados da sua escola.
          </p>
          <Link
            href="/admin/dados"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
          >
            Acessar Painel de Dados
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </ProtectedRoute>
  )
}
