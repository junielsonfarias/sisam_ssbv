'use client'

import { useState, useEffect } from 'react'
import { Camera, CheckCircle, RefreshCw, SwitchCamera, Sun, RotateCcw, X, Zap } from 'lucide-react'
import { PoseType, PoseCapture, POSES, AMOSTRAS_POR_POSE } from '../types'
import type { IluminacaoInfo } from '../hooks/use-face-capture'

function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(true)
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [breakpoint])
  return isMobile
}

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
  iluminacao: IluminacaoInfo
  autoCapturaProg: number
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  poseBufferRef: React.MutableRefObject<{ descriptor: Float32Array; score: number }[]>
  poseConfig: typeof POSES[number]
  todasPosesCapturadas: boolean
  posesConcluidasCount: number
  onAlternarCamera: () => void
  onCapturarPose: () => void
  onRecapturarPose: (index: number) => void
  onSalvarEmbedding: () => void
  onCancelar: () => void
}

// Barra de qualidade para desktop
function QualidadeBarraDesktop({ label, valor, min, max, unidade = '%' }: {
  label: string; valor: number; min: number; max: number; unidade?: string
}) {
  const pct = Math.min(100, Math.max(0, ((valor - min) / (max - min)) * 100))
  const cor = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
  const ct = pct >= 70 ? 'text-green-600 dark:text-green-400' : pct >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
        <div className={`h-full ${cor} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[11px] font-bold w-10 text-right ${ct}`}>{valor}{unidade}</span>
    </div>
  )
}

// Indicador compacto mobile (ponto colorido em vez de barra)
function IndicadorMobile({ ok }: { ok: boolean }) {
  return <div className={`w-2 h-2 rounded-full ${ok ? 'bg-green-400' : 'bg-red-400'}`} />
}

export function CaptureModal({
  alunoNome, cameraAtiva, carregandoModelos, faceDetectada, qualidadeFace,
  tamanhoRosto, anguloDetectado, enviandoEmbed, capturaStatus, poseAtual,
  posesCapturadas, cameraMode, iluminacao, autoCapturaProg, videoRef, canvasRef,
  poseBufferRef, poseConfig, todasPosesCapturadas, posesConcluidasCount,
  onAlternarCamera, onCapturarPose, onRecapturarPose, onSalvarEmbedding, onCancelar,
}: CaptureModalProps) {
  const amostras = poseBufferRef.current.length
  const detectando = capturaStatus === 'detectando'
  const capturado = capturaStatus === 'capturado'
  const qualidadeOk = qualidadeFace >= 70
  const tamanhoOk = tamanhoRosto >= 20
  const luzOk = iluminacao.status === 'bom'

  // ===========================================================================
  // MOBILE: Tela cheia tipo app de camera — tudo como overlay no video
  // ===========================================================================
  const mobileView = (
    <div className="fixed inset-0 z-[60] bg-black lg:hidden">
      {/* Video ocupa TUDO */}
      <video ref={videoRef} autoPlay playsInline muted
        className="absolute inset-0 w-full h-full object-cover" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* === TOP: Header + poses === */}
      <div className="absolute top-0 left-0 right-0 z-30">
        {/* Safe area top */}
        <div className="bg-gradient-to-b from-black/70 via-black/40 to-transparent" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-white text-base font-bold truncate" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                {alunoNome}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onAlternarCamera}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm active:bg-black/60">
                <SwitchCamera className="w-5 h-5 text-white" />
              </button>
              <button onClick={onCancelar}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm active:bg-black/60">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Poses: 3 circulos/thumbnails */}
          <div className="flex justify-center gap-3 px-4 pb-2">
            {POSES.map((pose, i) => {
              const cap = posesCapturadas[pose.key] !== null
              const atual = i === poseAtual && !todasPosesCapturadas
              return (
                <button key={pose.key}
                  onClick={() => cap && detectando ? onRecapturarPose(i) : undefined}
                  className="flex flex-col items-center gap-1">
                  <div className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center transition-all ${
                    cap ? 'ring-2 ring-green-400 ring-offset-1 ring-offset-black' :
                    atual ? 'ring-2 ring-white ring-offset-1 ring-offset-black' :
                    'ring-1 ring-white/30'
                  }`}>
                    {cap && posesCapturadas[pose.key]?.foto ? (
                      <img src={posesCapturadas[pose.key]!.foto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className={`text-xl ${atual ? 'text-white' : 'text-white/40'}`}>{pose.seta}</span>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold drop-shadow-lg ${
                    cap ? 'text-green-400' : atual ? 'text-white' : 'text-white/40'
                  }`}>{pose.label}</span>
                </button>
              )
            })}
          </div>

          {/* Alerta iluminacao */}
          {cameraAtiva && !luzOk && detectando && (
            <div className="mx-4 mb-2">
              <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold backdrop-blur-md ${
                iluminacao.status === 'escuro'
                  ? 'bg-amber-500/25 text-amber-100 border border-amber-500/30'
                  : 'bg-yellow-500/25 text-yellow-100 border border-yellow-500/30'
              }`} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                <Sun className="w-4.5 h-4.5 shrink-0" />
                <span>{iluminacao.mensagem}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === CENTRO: Guia oval grande === */}
      {cameraAtiva && !faceDetectada && detectando && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="relative" style={{ marginTop: '-5%' }}>
            <div className="w-[65vw] max-w-[280px] aspect-[3/4] border-[3px] border-dashed border-white/50 rounded-[50%]" />
            <div className="absolute -bottom-10 left-0 right-0 flex justify-center">
              <span className="bg-black/60 backdrop-blur-sm text-white text-sm font-semibold px-4 py-1.5 rounded-full"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                Posicione seu rosto
              </span>
            </div>
          </div>
        </div>
      )}

      {/* === Auto-captura barra no topo do video === */}
      {autoCapturaProg > 0 && autoCapturaProg < 100 && detectando && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-40">
          <div className="h-full bg-green-400 transition-all duration-200 ease-linear" style={{ width: `${autoCapturaProg}%` }} />
        </div>
      )}

      {/* === BOTTOM: Instrução + Indicadores + Botão === */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-16"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))' }}>

          {/* Instrucao + indicadores de qualidade */}
          {cameraAtiva && !todasPosesCapturadas && detectando && (
            <div className="px-4 mb-3">
              <div className={`rounded-2xl px-4 py-3 backdrop-blur-md border ${
                faceDetectada
                  ? 'bg-green-500/20 border-green-500/30'
                  : 'bg-white/10 border-white/10'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl shrink-0">{poseConfig.seta}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                      {poseConfig.instrucao}
                    </p>
                    {anguloDetectado && anguloDetectado !== poseConfig.key && (
                      <p className="text-sm text-orange-300 mt-0.5 font-medium">Vire para {poseConfig.label.toLowerCase()}</p>
                    )}
                  </div>
                  {/* Indicadores compactos */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <IndicadorMobile ok={qualidadeOk} />
                    <IndicadorMobile ok={tamanhoOk} />
                    <IndicadorMobile ok={luzOk} />
                  </div>
                </div>
                {/* Barra de amostras */}
                {amostras > 0 && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (amostras / AMOSTRAS_POR_POSE) * 100)}%` }} />
                    </div>
                    <span className="text-xs font-bold text-white/80">{amostras}/{AMOSTRAS_POR_POSE}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botão de ação */}
          <div className="px-4 pb-2">
            {!todasPosesCapturadas ? (
              <button onClick={onCapturarPose} disabled={!faceDetectada || amostras < AMOSTRAS_POR_POSE}
                className="w-full h-14 text-base font-bold text-white bg-indigo-600 active:bg-indigo-700 rounded-2xl disabled:bg-white/10 disabled:text-white/30 transition-all flex items-center justify-center gap-2">
                <Camera className="w-5 h-5" />
                Capturar {poseConfig.label} ({poseAtual + 1}/{POSES.length})
              </button>
            ) : (
              <button onClick={onSalvarEmbedding} disabled={enviandoEmbed || capturado}
                className="w-full h-14 text-base font-bold text-white bg-green-600 active:bg-green-700 rounded-2xl disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {enviandoEmbed ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Salvar Cadastro
              </button>
            )}
          </div>

          {/* Dica auto-captura */}
          {cameraAtiva && !todasPosesCapturadas && detectando && (
            <p className="text-center text-[11px] text-white/30 pb-1 flex items-center justify-center gap-1">
              <Zap className="w-3 h-3" /> Captura automatica ao manter posicao
            </p>
          )}
        </div>
      </div>

      {/* === Loading overlay === */}
      {(carregandoModelos || !cameraAtiva) && !capturado && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40">
          <div className="text-center text-white">
            <RefreshCw className="w-12 h-12 mx-auto mb-3 animate-spin opacity-60" />
            <p className="text-base font-medium">{carregandoModelos ? 'Carregando modelos...' : 'Iniciando camera...'}</p>
          </div>
        </div>
      )}

      {/* === Sucesso overlay === */}
      {capturado && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-900/85 z-40">
          <div className="text-center text-white px-8">
            <div className="flex justify-center gap-4 mb-5">
              {POSES.map(p => posesCapturadas[p.key]?.foto && (
                <img key={p.key} src={posesCapturadas[p.key]!.foto} alt={p.label}
                  className="w-16 h-16 rounded-full object-cover border-2 border-green-400 shadow-lg" />
              ))}
            </div>
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
            <p className="text-xl font-bold">Cadastro concluido!</p>
            <p className="text-sm text-green-200 mt-1">3 angulos registrados com sucesso</p>
          </div>
        </div>
      )}
    </div>
  )

  // ===========================================================================
  // DESKTOP: Modal centralizado com 2 colunas (>= lg)
  // ===========================================================================
  const desktopView = (
    <div className="fixed inset-0 bg-black/85 z-[60] hidden lg:flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-indigo-100 dark:bg-indigo-900/40 rounded-lg p-2 shrink-0">
                <Camera className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white truncate">Cadastro Facial</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{alunoNome}</p>
              </div>
            </div>
            <button onClick={onAlternarCamera}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
              <SwitchCamera className="w-3.5 h-3.5" />
              {cameraMode === 'user' ? 'Frontal' : 'Traseira'}
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 overflow-y-auto">
          {/* Camera */}
          <div className="flex-1 px-6 py-4">
            {/* Instrucao */}
            {cameraAtiva && !todasPosesCapturadas && !capturado && (
              <div className={`mb-3 rounded-xl p-3 flex items-center gap-3 ${
                faceDetectada ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800'
              }`}>
                <span className="text-3xl shrink-0">{poseConfig.seta}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${faceDetectada ? 'text-green-700 dark:text-green-300' : 'text-indigo-700 dark:text-indigo-300'}`}>
                    {poseConfig.instrucao}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{poseConfig.dica}</p>
                  {anguloDetectado && anguloDetectado !== poseConfig.key && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">
                      Detectado: {anguloDetectado} — vire para {poseConfig.label.toLowerCase()}
                    </p>
                  )}
                </div>
                {faceDetectada && (
                  <div className="text-center shrink-0">
                    <div className="text-xs font-bold text-green-600 dark:text-green-400">{amostras}/{AMOSTRAS_POR_POSE}</div>
                    <div className="text-[10px] text-green-500">amostras</div>
                  </div>
                )}
              </div>
            )}

            {/* Video */}
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
              <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

              {/* Guia oval desktop */}
              {cameraAtiva && !faceDetectada && detectando && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-64 border-2 border-dashed border-white/30 rounded-[50%]" />
                </div>
              )}

              {autoCapturaProg > 0 && autoCapturaProg < 100 && detectando && (
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30">
                  <div className="h-full bg-green-400 transition-all duration-200" style={{ width: `${autoCapturaProg}%` }} />
                </div>
              )}

              {cameraAtiva && iluminacao.status !== 'bom' && detectando && (
                <div className="absolute top-2 left-2 right-2">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                    iluminacao.status === 'escuro' ? 'bg-amber-900/80 text-amber-200' : 'bg-yellow-900/80 text-yellow-200'
                  }`}>
                    <Sun className="w-3.5 h-3.5 shrink-0" /><span>{iluminacao.mensagem}</span>
                  </div>
                </div>
              )}

              {(carregandoModelos || !cameraAtiva) && !capturado && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <div className="text-center text-white">
                    <RefreshCw className="w-10 h-10 mx-auto mb-3 animate-spin opacity-70" />
                    <p className="text-sm">{carregandoModelos ? 'Carregando modelos...' : 'Iniciando camera...'}</p>
                  </div>
                </div>
              )}

              {capturado && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-900/80">
                  <div className="text-center text-white">
                    <div className="flex justify-center gap-3 mb-4">
                      {POSES.map(p => posesCapturadas[p.key]?.foto && (
                        <img key={p.key} src={posesCapturadas[p.key]!.foto} alt={p.label}
                          className="w-20 h-20 rounded-full object-cover border-2 border-green-400 shadow-lg" />
                      ))}
                    </div>
                    <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
                    <p className="text-xl font-bold">Cadastro concluido!</p>
                  </div>
                </div>
              )}
            </div>

            {/* Qualidade */}
            {cameraAtiva && !todasPosesCapturadas && detectando && (
              <div className="mt-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3 space-y-1.5">
                <QualidadeBarraDesktop label="Qualidade" valor={qualidadeFace} min={0} max={100} />
                <QualidadeBarraDesktop label="Tamanho" valor={tamanhoRosto} min={0} max={50} />
                <QualidadeBarraDesktop label="Luz" valor={iluminacao.nivel} min={0} max={255} unidade="" />
              </div>
            )}
          </div>

          {/* Painel lateral */}
          <div className="w-72 border-l border-gray-200 dark:border-slate-700 px-4 py-4 shrink-0">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Poses ({posesConcluidasCount}/{POSES.length})
            </h4>
            <div className="space-y-2">
              {POSES.map((pose, i) => {
                const cap = posesCapturadas[pose.key] !== null
                const atual = i === poseAtual && !todasPosesCapturadas
                return (
                  <div key={pose.key} className={`rounded-xl p-3 transition-all border-2 ${
                    cap ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' :
                    atual ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-600 shadow-sm' :
                    'bg-gray-50 dark:bg-slate-700/50 border-transparent'
                  }`}>
                    <div className="flex items-center gap-3">
                      {cap && posesCapturadas[pose.key]?.foto ? (
                        <img src={posesCapturadas[pose.key]!.foto} alt={pose.label}
                          className="w-12 h-12 rounded-full object-cover border-2 border-green-400 shrink-0" />
                      ) : (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 ${
                          atual ? 'bg-indigo-100 dark:bg-indigo-800' : 'bg-gray-200 dark:bg-slate-600'
                        }`}>{pose.seta}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${
                          cap ? 'text-green-700 dark:text-green-400' : atual ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-500'
                        }`}>{pose.label}</p>
                        {cap && <p className="text-[10px] text-green-600 dark:text-green-400">Qualidade: {Math.round(posesCapturadas[pose.key]!.score * 100)}%</p>}
                        {atual && !cap && <p className="text-[10px] text-indigo-500">{amostras >= AMOSTRAS_POR_POSE ? 'Pronto!' : `${amostras}/${AMOSTRAS_POR_POSE}`}</p>}
                      </div>
                      {cap && detectando && (
                        <button onClick={() => onRecapturarPose(i)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {atual && autoCapturaProg > 0 && (
                      <div className="mt-2 h-1 bg-indigo-100 dark:bg-indigo-800 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all duration-200" style={{ width: `${autoCapturaProg}%` }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {cameraAtiva && !todasPosesCapturadas && detectando && (
              <div className="mt-4 flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2.5">
                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>Captura <strong>automatica</strong> ao manter posicao por 1.5s.</span>
              </div>
            )}
            <div className="mt-4 space-y-2">
              {!todasPosesCapturadas ? (
                <button onClick={onCapturarPose} disabled={!faceDetectada || amostras < AMOSTRAS_POR_POSE}
                  className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                  <Camera className="w-4 h-4" /> Capturar {poseConfig.label}
                </button>
              ) : (
                <button onClick={onSalvarEmbedding} disabled={enviandoEmbed || capturado}
                  className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                  {enviandoEmbed ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Salvar Cadastro
                </button>
              )}
              <button onClick={onCancelar}
                className="w-full px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const isMobile = useIsMobile()
  return isMobile ? mobileView : desktopView
}
