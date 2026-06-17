'use client'

import {
  Camera, ScanFace, Loader2, CheckCircle, AlertCircle, ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { ConfigTerminal, StatusModelo } from '../types'
import type { TurmaSimples } from '@/lib/types/common'

interface ConfigScreenProps {
  config: ConfigTerminal
  setConfig: React.Dispatch<React.SetStateAction<ConfigTerminal>>
  escolas: { id: string; nome: string }[]
  turmas: TurmaSimples[]
  statusModelo: StatusModelo
  erroModelo: string
  formatSerie: (serie: string) => string
  onIniciarTerminal: () => void
}

export function ConfigScreen({
  config, setConfig, escolas, turmas,
  statusModelo, erroModelo, formatSerie, onIniciarTerminal,
}: ConfigScreenProps) {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
            <ScanFace className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Terminal Facial</h1>
          <p className="text-gray-400 mt-1">Configure o terminal de reconhecimento</p>

          {/* Status do modelo */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {statusModelo === 'carregando' && (
              <span className="flex items-center gap-2 text-sm text-yellow-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando modelos...
              </span>
            )}
            {statusModelo === 'pronto' && (
              <span className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle className="w-4 h-4" /> Modelos prontos
              </span>
            )}
            {statusModelo === 'erro' && (
              <span className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="w-4 h-4" /> {erroModelo}
              </span>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="bg-gray-800 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Escola</label>
            <select
              value={config.escola_id}
              onChange={e => setConfig(c => ({ ...c, escola_id: e.target.value, turma_id: '' }))}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Selecione a escola</option>
              {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Turma (opcional — todas se vazio)</label>
            <select
              value={config.turma_id}
              onChange={e => setConfig(c => ({ ...c, turma_id: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={!config.escola_id}
            >
              <option value="">Todas as turmas</option>
              {turmas.map(t => (
                <option key={t.id} value={t.id}>
                  {t.codigo}{t.nome ? ` - ${t.nome}` : ''} ({formatSerie(t.serie)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Confianca mínima</label>
              <select
                value={config.confianca_minima}
                onChange={e => setConfig(c => ({ ...c, confianca_minima: parseFloat(e.target.value) }))}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm"
              >
                <option value={0.7}>70% (flexível)</option>
                <option value={0.8}>80% (normal)</option>
                <option value={0.85}>85% (recomendado)</option>
                <option value={0.9}>90% (rigoroso)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Cooldown</label>
              <select
                value={config.cooldown_segundos}
                onChange={e => setConfig(c => ({ ...c, cooldown_segundos: parseInt(e.target.value) }))}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm"
              >
                <option value={300}>5 minutos</option>
                <option value={900}>15 minutos</option>
                <option value={1800}>30 minutos (recomendado)</option>
                <option value={3600}>1 hora</option>
              </select>
            </div>
          </div>

          <button
            onClick={onIniciarTerminal}
            disabled={!config.escola_id || statusModelo !== 'pronto'}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" />
            Iniciar Terminal
          </button>

          <Link
            href="/admin/frequencia-diaria"
            className="block text-center text-sm text-gray-400 hover:text-gray-300 mt-2"
          >
            <ArrowLeft className="w-4 h-4 inline mr-1" />
            Voltar ao painel
          </Link>
        </div>
      </div>
    </div>
  )
}
