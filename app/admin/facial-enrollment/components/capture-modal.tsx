'use client'

import { Camera, CheckCircle, RefreshCw, SwitchCamera } from 'lucide-react'
import { PoseType, PoseCapture, POSES, TAMANHO_MINIMO_ROSTO, AMOSTRAS_POR_POSE } from '../types'

interface CaptureModalProps {
  alunoNome: string
  cameraAtiva: boolean
  carregandoModelos: boolean
  faceDetectada: boolean
  qualidadeFace: number
  tamanhoRosto: number
  anguloDetectado: PoseType | null
  enviandoEmbed: boolean
  capturaStatus: 'aguardando' | 'detectando' | 'capturado' | 'enviando'
  poseAtual: number
  posesCapturadas: Record<PoseType, PoseCapture | null>
  cameraMode: 'user' | 'environment'
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  poseBufferRef: React.MutableRefObject<{ descriptor: Float32Array; score: number }[]>
  poseConfig: typeof POSES[number]
  todasPosesCapturadas: boolean
  posesConcluidasCount: number
  onAlternarCamera: () => void
  onCapturarPose: () => void
  onSalvarEmbedding: () => void
  onCancelar: () => void
}

export function CaptureModal({
  alunoNome,
  cameraAtiva,
  carregandoModelos,
  faceDetectada,
  qualidadeFace,
  tamanhoRosto,
  anguloDetectado,
  enviandoEmbed,
  capturaStatus,
  poseAtual,
  posesCapturadas,
  cameraMode,
  videoRef,
  canvasRef,
  poseBufferRef,
  poseConfig,
  todasPosesCapturadas,
  posesConcluidasCount,
  onAlternarCamera,
  onCapturarPose,
  onSalvarEmbedding,
  onCancelar,
}: CaptureModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-teal-100 dark:bg-teal-900/40 rounded-lg p-2">
                <Camera className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Captura Facial Multi-Angulo</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {alunoNome}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onAlternarCamera}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                title={cameraMode === 'user' ? 'Usando camera frontal — clique para traseira' : 'Usando camera traseira — clique para frontal'}
              >
                <SwitchCamera className="w-3.5 h-3.5" />
                {cameraMode === 'user' ? 'Frontal' : 'Traseira'}
              </button>
              <span className="text-xs font-semibold bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 px-3 py-1 rounded-full">
                {posesConcluidasCount}/{POSES.length} poses
              </span>
            </div>
          </div>
        </div>

        {/* Progresso das poses */}
        <div className="px-6 pt-4">
          <div className="flex gap-2">
            {POSES.map((pose, i) => {
              const capturada = posesCapturadas[pose.key] !== null
              const atual = i === poseAtual && !todasPosesCapturadas
              return (
                <div key={pose.key} className={`flex-1 rounded-lg p-2 text-center transition-all border-2 ${
                  capturada ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' :
                  atual ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-400 dark:border-teal-600 shadow-sm' :
                  'bg-gray-50 dark:bg-slate-700/50 border-transparent'
                }`}>
                  <div className="text-2xl mb-1">{capturada ? '\u2705' : pose.seta}</div>
                  <p className={`text-xs font-semibold ${capturada ? 'text-green-700 dark:text-green-400' : atual ? 'text-teal-700 dark:text-teal-300' : 'text-gray-500 dark:text-gray-400'}`}>
                    {pose.label}
                  </p>
                  {capturada && posesCapturadas[pose.key] && (
                    <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5">
                      {Math.round(posesCapturadas[pose.key]!.score * 100)}%
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Camera + instrucao */}
        <div className="px-6 py-4">
          {cameraAtiva && !todasPosesCapturadas && capturaStatus !== 'capturado' && (
            <div className={`mb-3 rounded-lg p-3 text-center ${
              faceDetectada ? 'bg-green-50 dark:bg-green-900/20' : 'bg-teal-50 dark:bg-teal-900/20'
            }`}>
              <p className="text-3xl mb-1">{poseConfig.seta}</p>
              <p className={`text-sm font-semibold ${faceDetectada ? 'text-green-700 dark:text-green-300' : 'text-teal-700 dark:text-teal-300'}`}>
                {poseConfig.instrucao}
              </p>
              {anguloDetectado && anguloDetectado !== poseConfig.key && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  Detectado: {anguloDetectado} — vire para {poseConfig.label.toLowerCase()}
                </p>
              )}
              {faceDetectada && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Angulo correto! Amostras: {poseBufferRef.current.length}/{AMOSTRAS_POR_POSE}
                </p>
              )}
            </div>
          )}

          <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

            {(carregandoModelos || !cameraAtiva) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-center text-white">
                  <RefreshCw className="w-10 h-10 mx-auto mb-3 animate-spin opacity-70" />
                  <p className="text-sm">{carregandoModelos ? 'Carregando modelos de IA...' : 'Iniciando camera...'}</p>
                </div>
              </div>
            )}

            {capturaStatus === 'capturado' && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-900/80">
                <div className="text-center text-white">
                  <div className="flex justify-center gap-3 mb-4">
                    {POSES.map(p => posesCapturadas[p.key]?.foto && (
                      <img key={p.key} src={posesCapturadas[p.key]!.foto} alt={p.label}
                        className="w-20 h-20 rounded-full object-cover border-3 border-green-400 shadow-lg" />
                    ))}
                  </div>
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
                  <p className="text-xl font-bold">Rosto cadastrado com 3 angulos!</p>
                </div>
              </div>
            )}

            {cameraAtiva && !faceDetectada && capturaStatus === 'detectando' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-60 border-2 border-dashed border-white/30 rounded-3xl" />
              </div>
            )}
          </div>

          {posesConcluidasCount > 0 && capturaStatus !== 'capturado' && (
            <div className="mt-3 flex gap-3">
              {POSES.map(p => posesCapturadas[p.key] && (
                <div key={p.key} className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                  <img src={posesCapturadas[p.key]!.foto} alt={p.label}
                    className="w-10 h-10 rounded-full object-cover border-2 border-green-400" />
                  <div>
                    <p className="text-xs font-semibold text-green-700 dark:text-green-300">{p.label}</p>
                    <p className="text-[10px] text-green-600">{Math.round(posesCapturadas[p.key]!.score * 100)}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {cameraAtiva && !todasPosesCapturadas && (
              <>
                <span>Qualidade: <strong className={qualidadeFace >= 70 ? 'text-green-600' : 'text-yellow-600'}>{qualidadeFace || '-'}%</strong></span>
                {tamanhoRosto > 0 && <span>Rosto: <strong className={tamanhoRosto >= TAMANHO_MINIMO_ROSTO ? 'text-green-600' : 'text-orange-600'}>{tamanhoRosto}%</strong></span>}
                {anguloDetectado && <span>Angulo: <strong>{anguloDetectado}</strong></span>}
              </>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancelar}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            {!todasPosesCapturadas ? (
              <button
                onClick={onCapturarPose}
                disabled={!faceDetectada || poseBufferRef.current.length < AMOSTRAS_POR_POSE}
                className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Capturar {poseConfig.label} ({poseAtual + 1}/{POSES.length})
              </button>
            ) : (
              <button
                onClick={onSalvarEmbedding}
                disabled={enviandoEmbed || capturaStatus === 'capturado'}
                className="px-5 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {enviandoEmbed ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Salvar Cadastro Facial
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
