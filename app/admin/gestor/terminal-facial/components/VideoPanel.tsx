'use client'

import { CameraOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { StatusCamera } from '../types'

interface VideoPanelProps {
  videoRef: any
  canvasRef: any
  statusCamera: StatusCamera
  reconhecendo: boolean
  mensagem: string
  mensagemTipo: 'sucesso' | 'info' | 'erro'
  onRetryCamera: () => void
}

export function VideoPanel({
  videoRef, canvasRef, statusCamera,
  reconhecendo, mensagem, mensagemTipo, onRetryCamera,
}: VideoPanelProps) {
  return (
    <div className="flex-1 relative bg-black flex items-center justify-center min-h-0">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Status da câmera */}
      {statusCamera !== 'ativa' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          {statusCamera === 'ligando' && (
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-3" />
              <p className="text-gray-300">Iniciando câmera...</p>
            </div>
          )}
          {statusCamera === 'erro' && (
            <div className="text-center">
              <CameraOff className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-red-300">Erro ao acessar câmera</p>
              <p className="text-gray-500 text-sm mt-1">Verifique as permissões do navegador</p>
              <button onClick={onRetryCamera} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">
                Tentar novamente
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mensagem de reconhecimento (overlay na parte inferior do vídeo) */}
      {mensagem && (
        <div className={`absolute bottom-0 left-0 right-0 py-4 px-6 text-center text-lg font-bold transition-all ${
          mensagemTipo === 'sucesso' ? 'bg-green-600/90 text-white' :
          mensagemTipo === 'erro' ? 'bg-red-600/90 text-white' :
          'bg-blue-600/90 text-white'
        }`}>
          {mensagemTipo === 'sucesso' && <CheckCircle className="w-6 h-6 inline mr-2" />}
          {mensagemTipo === 'erro' && <AlertCircle className="w-6 h-6 inline mr-2" />}
          {mensagem}
        </div>
      )}

      {/* Indicador de reconhecimento */}
      {reconhecendo && statusCamera === 'ativa' && !mensagem && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-800/80 rounded-full text-gray-300 text-sm flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Aguardando reconhecimento...
        </div>
      )}
    </div>
  )
}
