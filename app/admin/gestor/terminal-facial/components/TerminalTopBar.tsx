'use client'

import {
  ScanFace, Wifi, WifiOff, Users, CheckCircle, UserX,
  Volume2, VolumeX, Maximize, Minimize, Settings,
} from 'lucide-react'
import { HoraAtual } from './HoraAtual'
import { AlunoEmbedding, RegistroPresenca } from '../types'

interface TerminalTopBarProps {
  online: boolean
  alunos: AlunoEmbedding[]
  registros: RegistroPresenca[]
  somAtivo: boolean
  setSomAtivo: (v: boolean) => void
  fullscreen: boolean
  toggleFullscreen: () => void
  onVoltarConfig: () => void
}

export function TerminalTopBar({
  online, alunos, registros, somAtivo, setSomAtivo,
  fullscreen, toggleFullscreen, onVoltarConfig,
}: TerminalTopBarProps) {
  const presentesCount = new Set(registros.map(r => r.aluno_id)).size

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900/90 backdrop-blur-sm z-10">
      <div className="flex items-center gap-3">
        <ScanFace className="w-6 h-6 text-indigo-400" />
        <span className="text-white font-semibold hidden sm:inline">Educatec Terminal</span>

        {/* Status */}
        <div className="flex items-center gap-1.5">
          {online ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
              <Wifi className="w-3 h-3" /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">
              <WifiOff className="w-3 h-3" /> Offline
            </span>
          )}
        </div>

        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs">
          <Users className="w-3 h-3" /> {alunos.length} alunos
        </span>
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
          <CheckCircle className="w-3 h-3" /> {presentesCount} presentes
        </span>
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">
          <UserX className="w-3 h-3" /> {alunos.length - presentesCount} ausentes
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Hora */}
        <HoraAtual />

        {/* Botões */}
        <button onClick={() => setSomAtivo(!somAtivo)} className="p-2 text-gray-400 hover:text-white transition-colors" title={somAtivo ? 'Desativar som' : 'Ativar som'}>
          {somAtivo ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        <button onClick={toggleFullscreen} className="p-2 text-gray-400 hover:text-white transition-colors" title="Tela cheia">
          {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
        <button
          onClick={onVoltarConfig}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          title="Configurações"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
