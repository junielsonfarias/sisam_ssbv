'use client'

import { useRef } from 'react'
import {
  Camera, Wifi, WifiOff, Users, AlertCircle, CheckCircle,
  Maximize, Minimize, Volume2, VolumeX, Settings, ScanFace,
  Loader2, Download, RefreshCw, CloudOff, Cloud,
} from 'lucide-react'
import { obterEmbeddings, baixarEmbeddings } from '@/lib/terminal-db'
import type { AlunoEmMemoria, RegistroLocal } from '../types'

// Animacoes CSS para o overlay de confirmacao
const animationStyles = `
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes scaleIn { from { opacity: 0; transform: scale(1.3) } to { opacity: 1; transform: scale(1) } }
`

interface TerminalViewProps {
  escolaNome: string
  horaAtual: string
  online: boolean
  fullscreen: boolean
  somAtivo: boolean
  setSomAtivo: (v: boolean) => void
  reconhecendo: boolean
  alunos: AlunoEmMemoria[]
  setAlunos: (a: AlunoEmMemoria[]) => void
  registros: RegistroLocal[]
  mensagem: string
  setMensagem: (m: string) => void
  mensagemTipo: 'sucesso' | 'info' | 'erro'
  setMensagemTipo: (t: 'sucesso' | 'info' | 'erro') => void
  ultimoAlunoNome: string
  ultimoAlunoInfo: string
  ultimoAlunoHora: string
  mostrarConfirmacao: boolean
  confirmacaoTipo: 'entrada' | 'ja_registrado'
  pendentesSync: number
  sincronizando: boolean
  serverUrl: string
  escolaId: string
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  faceapiRef: React.MutableRefObject<any>
  streamRef: React.MutableRefObject<MediaStream | null>
  intervalRef: React.MutableRefObject<NodeJS.Timeout | null>
  setCameraAtiva: (v: boolean) => void
  setReconhecendo: (v: boolean) => void
  setFase: (f: 'setup' | 'terminal') => void
  toggleFullscreen: () => void
}

export function TerminalView({
  escolaNome, horaAtual, online, fullscreen, somAtivo, setSomAtivo,
  reconhecendo, alunos, setAlunos, registros, mensagem, setMensagem,
  mensagemTipo, setMensagemTipo,
  ultimoAlunoNome, ultimoAlunoInfo, ultimoAlunoHora,
  mostrarConfirmacao, confirmacaoTipo,
  pendentesSync, sincronizando, serverUrl, escolaId,
  videoRef, canvasRef, faceapiRef, streamRef, intervalRef,
  setCameraAtiva, setReconhecendo, setFase, toggleFullscreen,
}: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mensagemTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const presentes = new Set(registros.map(r => r.aluno_id)).size
  const dataHoje = new Date()
  const diaSemana = dataHoje.toLocaleDateString('pt-BR', { weekday: 'long' })
  const dataFormatada = dataHoje.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div ref={containerRef} className="min-h-screen bg-black text-white flex flex-col select-none">
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
      {/* Video em tela cheia */}
      <div className="flex-1 relative">
        {/* Video visivel - face-api detecta direto nele */}
        <video ref={videoRef} autoPlay playsInline muted
          className="absolute inset-0 w-full h-full object-cover"
          onLoadedMetadata={() => {
            if (canvasRef.current && videoRef.current) {
              const v = videoRef.current
              faceapiRef.current?.matchDimensions(canvasRef.current, { width: v.videoWidth, height: v.videoHeight })
            }
          }} />
        {/* Canvas overlay */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

        {/* Overlay de confirmacao */}
        {mostrarConfirmacao && ultimoAlunoNome && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="absolute inset-0 bg-black/60 animate-[fadeIn_0.2s_ease-out]" />
            <div className={`relative rounded-3xl px-10 sm:px-16 py-8 sm:py-10 text-center shadow-2xl max-w-lg mx-4 animate-[scaleIn_0.3s_ease-out] ${
              confirmacaoTipo === 'ja_registrado'
                ? 'bg-amber-500'
                : 'bg-green-600'
            }`}>
              {confirmacaoTipo === 'ja_registrado' ? (
                <AlertCircle className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 text-white/90" />
              ) : (
                <CheckCircle className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 text-white" />
              )}
              <p className="text-2xl sm:text-4xl font-bold text-white mb-2 leading-tight">{ultimoAlunoNome}</p>
              {ultimoAlunoInfo && (
                <p className="text-base sm:text-lg text-white/80 mb-3">{ultimoAlunoInfo}</p>
              )}
              <div className="flex items-center justify-center gap-3 mt-2">
                <span className="bg-white/20 text-white text-sm sm:text-base font-semibold px-4 py-1.5 rounded-full">
                  {ultimoAlunoHora}
                </span>
                <span className="bg-white/20 text-white text-sm sm:text-base font-semibold px-4 py-1.5 rounded-full">
                  {confirmacaoTipo === 'ja_registrado' ? 'Ja registrado' : 'Entrada'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Mensagem de erro */}
        {mensagem && !mostrarConfirmacao && (
          <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl text-xl font-bold shadow-2xl ${
            mensagemTipo === 'erro' ? 'bg-red-600' : 'bg-blue-600'
          }`}>
            {mensagemTipo === 'erro' && <AlertCircle className="w-6 h-6 inline mr-2 -mt-1" />}
            {mensagem}
          </div>
        )}

        {/* Barra superior */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ScanFace className="w-7 h-7 text-teal-400" />
              <div>
                <h1 className="text-base font-bold text-white">{escolaNome || 'Terminal Facial'}</h1>
                <p className="text-xs text-gray-300 capitalize">{diaSemana}, {dataFormatada}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold font-mono text-white">{horaAtual}</p>
            </div>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Contadores */}
            <div className="flex items-center gap-3">
              <div className="bg-green-600/80 backdrop-blur px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span className="text-sm font-bold">{presentes}</span>
                <span className="text-xs opacity-80">presentes</span>
              </div>
              <div className="bg-slate-600/80 backdrop-blur px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <span className="text-sm font-bold">{alunos.length}</span>
                <span className="text-xs opacity-80">cadastrados</span>
              </div>
            </div>

            {/* Status + controles */}
            <div className="flex items-center gap-2">
              {/* Sync */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium ${
                pendentesSync > 0 ? (sincronizando ? 'bg-blue-900/60 text-blue-300' : 'bg-yellow-900/60 text-yellow-300') : 'bg-green-900/60 text-green-300'
              }`}>
                {sincronizando ? <RefreshCw className="w-3 h-3 animate-spin" /> :
                 pendentesSync > 0 ? <CloudOff className="w-3 h-3" /> : <Cloud className="w-3 h-3" />}
                {pendentesSync > 0 ? `${pendentesSync}` : 'OK'}
              </div>

              {/* Online */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium ${online ? 'bg-green-900/60 text-green-300' : 'bg-red-900/60 text-red-300'}`}>
                {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              </div>

              {/* Som */}
              <button onClick={() => setSomAtivo(!somAtivo)} className="p-1.5 hover:bg-white/10 rounded transition-colors">
                {somAtivo ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
              </button>

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="p-1.5 hover:bg-white/10 rounded transition-colors">
                {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>

              {/* Atualizar embeddings */}
              <button onClick={async () => {
                try {
                  const url = serverUrl || window.location.origin
                  const total = await baixarEmbeddings(url, '', escolaId)
                  if (total > 0) {
                    const embsLocais = await obterEmbeddings()
                    const novosAlunos: AlunoEmMemoria[] = []
                    for (const emb of embsLocais) {
                      try {
                        const bytes = Uint8Array.from(atob(emb.embedding_base64.replace(/\s/g, '')), c => c.charCodeAt(0))
                        const descriptor = new Float32Array(bytes.buffer)
                        novosAlunos.push({ aluno_id: emb.aluno_id, nome: emb.nome, codigo: emb.codigo, serie: emb.serie, turma_codigo: emb.turma_codigo, descriptor })
                      } catch {
                        // Expected: skip individual invalid embeddings
                      }
                    }
                    setAlunos(novosAlunos)
                    setMensagem(`${total} aluno(s) atualizado(s)`)
                    setMensagemTipo('info')
                    if (mensagemTimeoutRef.current) clearTimeout(mensagemTimeoutRef.current)
                    mensagemTimeoutRef.current = setTimeout(() => setMensagem(''), 3000)
                  }
                } catch {
                  // Expected: network unavailable in offline mode
                }
              }} className="p-1.5 hover:bg-white/10 rounded transition-colors" title="Atualizar alunos">
                <Download className="w-4 h-4" />
              </button>

              {/* Config */}
              <button onClick={() => {
                if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
                if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
                setCameraAtiva(false)
                setReconhecendo(false)
                setFase('setup')
              }} className="p-1.5 hover:bg-white/10 rounded transition-colors" title="Configuracoes">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Iniciando reconhecimento ou erro de camera */}
        {!reconhecendo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center max-w-sm px-4">
              {mensagemTipo === 'erro' && mensagem ? (
                <>
                  <AlertCircle className="w-14 h-14 mx-auto mb-4 text-red-400" />
                  <p className="text-lg font-medium text-white mb-2">{mensagem}</p>
                  <p className="text-sm text-gray-400 mb-6">
                    Verifique se a permissao de camera esta habilitada nas configuracoes do navegador.
                  </p>
                  <button
                    onClick={async () => {
                      setMensagem('')
                      setMensagemTipo('info')
                      try {
                        let stream: MediaStream
                        try {
                          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
                        } catch {
                          stream = await navigator.mediaDevices.getUserMedia({ video: true })
                        }
                        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
                        streamRef.current = stream
                        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
                        setCameraAtiva(true)
                      } catch {
                        setMensagem('Camera indisponivel. Verifique as permissoes.')
                        setMensagemTipo('erro')
                      }
                    }}
                    className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors inline-flex items-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Tentar Novamente
                  </button>
                </>
              ) : (
                <>
                  <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-teal-400" />
                  <p className="text-lg">Iniciando reconhecimento...</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
