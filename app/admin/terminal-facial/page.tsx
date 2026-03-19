'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Camera, CameraOff, Wifi, WifiOff, Users, Clock,
  CheckCircle, AlertCircle, Maximize, Minimize,
  Volume2, VolumeX, RefreshCw, Settings, ArrowLeft,
  ScanFace, Loader2, UserX
} from 'lucide-react'
import Link from 'next/link'
import { useSeries } from '@/lib/use-series'

// ============================================================================
// Tipos
// ============================================================================

interface AlunoEmbedding {
  aluno_id: string
  nome: string
  codigo: string | null
  turma_id: string | null
  serie: string | null
  descriptor: Float32Array
}

interface RegistroPresenca {
  aluno_id: string
  nome: string
  tipo: 'entrada' | 'saida'
  hora: string
  confianca: number
}

interface ConfigTerminal {
  escola_id: string
  turma_id: string
  confianca_minima: number
  cooldown_segundos: number
}

type StatusModelo = 'carregando' | 'pronto' | 'erro'
type StatusCamera = 'desligada' | 'ligando' | 'ativa' | 'erro'

// ============================================================================
// Componente Principal
// ============================================================================

export default function TerminalFacialPage() {
  const { formatSerie } = useSeries()

  // Estado do sistema
  const [statusModelo, setStatusModelo] = useState<StatusModelo>('carregando')
  const [statusCamera, setStatusCamera] = useState<StatusCamera>('desligada')
  const [online, setOnline] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [somAtivo, setSomAtivo] = useState(true)
  const [reconhecendo, setReconhecendo] = useState(false)

  // Configuração
  const [fase, setFase] = useState<'config' | 'terminal'>('config')
  const [config, setConfig] = useState<ConfigTerminal>({
    escola_id: '',
    turma_id: '',
    confianca_minima: 0.85,
    cooldown_segundos: 1800,
  })

  // Dados
  const [escolas, setEscolas] = useState<{ id: string; nome: string }[]>([])
  const [turmas, setTurmas] = useState<{ id: string; codigo: string; nome: string | null; serie: string }[]>([])
  const [alunos, setAlunos] = useState<AlunoEmbedding[]>([])
  const [registros, setRegistros] = useState<RegistroPresenca[]>([])
  const [mensagem, setMensagem] = useState('')
  const [mensagemTipo, setMensagemTipo] = useState<'sucesso' | 'info' | 'erro'>('info')
  const [erroModelo, setErroModelo] = useState('')
  const [unknownCount, setUnknownCount] = useState(0)

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const faceapiRef = useRef<any>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const cooldownMapRef = useRef<Map<string, number>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)

  // ============================================================================
  // Carregar face-api.js
  // ============================================================================

  useEffect(() => {
    const carregarModelos = async () => {
      try {
        setStatusModelo('carregando')
        const faceapi = await import('@vladmandic/face-api')
        faceapiRef.current = faceapi

        await faceapi.nets.tinyFaceDetector.loadFromUri('/models/face-api')
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models/face-api')
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models/face-api')

        setStatusModelo('pronto')
      } catch (err: any) {
        setErroModelo(err.message || 'Falha ao carregar modelos de reconhecimento')
        setStatusModelo('erro')
      }
    }
    carregarModelos()
  }, [])

  // Carregar escolas
  useEffect(() => {
    fetch('/api/admin/escolas')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setEscolas(Array.isArray(data) ? data : []))
      .catch(() => setEscolas([]))
  }, [])

  // Carregar turmas quando escola muda
  useEffect(() => {
    if (config.escola_id) {
      const ano = new Date().getFullYear()
      fetch(`/api/admin/turmas?escolas_ids=${config.escola_id}&ano_letivo=${ano}`)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => setTurmas(Array.isArray(data) ? data : []))
        .catch(() => setTurmas([]))
    } else {
      setTurmas([])
    }
  }, [config.escola_id])

  // ============================================================================
  // Carregar embeddings dos alunos
  // ============================================================================

  const carregarAlunos = useCallback(async () => {
    try {
      const params = new URLSearchParams({ escola_id: config.escola_id })
      if (config.turma_id) params.set('turma_id', config.turma_id)

      const res = await fetch(`/api/admin/facial/embeddings?${params}`)
      if (!res.ok) return 0

      const data = await res.json()
      const alunosCarregados: AlunoEmbedding[] = []

      for (const aluno of data.alunos || []) {
        try {
          if (!aluno.embedding_base64) continue
          const bytes = Uint8Array.from(atob(aluno.embedding_base64), c => c.charCodeAt(0))
          const descriptor = new Float32Array(bytes.buffer)
          alunosCarregados.push({
            aluno_id: aluno.aluno_id,
            nome: aluno.nome,
            codigo: aluno.codigo,
            turma_id: aluno.turma_id,
            serie: aluno.serie,
            descriptor,
          })
        } catch {
          // Ignora aluno com embedding inválido
        }
      }

      setAlunos(alunosCarregados)
      return alunosCarregados.length
    } catch (err) {
      return 0
    }
  }, [config.escola_id, config.turma_id])

  // ============================================================================
  // Câmera
  // ============================================================================

  const iniciarCamera = useCallback(async () => {
    try {
      setStatusCamera('ligando')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      streamRef.current = stream
      setStatusCamera('ativa')
    } catch (err) {
      setStatusCamera('erro')
    }
  }, [])

  const pararCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setStatusCamera('desligada')
  }, [])

  // ============================================================================
  // Reconhecimento
  // ============================================================================

  const iniciarReconhecimento = useCallback(() => {
    if (!faceapiRef.current || !videoRef.current || alunos.length === 0) return

    const faceapi = faceapiRef.current
    const video = videoRef.current

    // Criar LabeledFaceDescriptors para matching
    const labeledDescriptors = alunos.map(aluno =>
      new faceapi.LabeledFaceDescriptors(
        aluno.aluno_id,
        [aluno.descriptor]
      )
    )

    const matcher = new faceapi.FaceMatcher(labeledDescriptors, 1 - config.confianca_minima)

    setReconhecendo(true)

    // Loop de detecção
    intervalRef.current = setInterval(async () => {
      if (!video || video.paused || video.ended) return
      if (document.hidden) return // Não processar com tab em background

      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
          .withFaceLandmarks(true)
          .withFaceDescriptors()

        // Desenhar no canvas
        if (canvasRef.current) {
          const dims = faceapi.matchDimensions(canvasRef.current, video, true)
          const resized = faceapi.resizeResults(detections, dims)

          const ctx = canvasRef.current.getContext('2d')
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
          }

          // Para cada rosto detectado
          for (const detection of resized) {
            const match = matcher.findBestMatch(detection.descriptor)

            if (match.label !== 'unknown') {
              const alunoId = match.label
              const confianca = 1 - match.distance

              // Verificar cooldown
              const agora = Date.now()
              const ultimoRegistro = cooldownMapRef.current.get(alunoId) || 0
              const cooldownMs = config.cooldown_segundos * 1000

              if (agora - ultimoRegistro < cooldownMs) {
                // Já registrado — desenhar em amarelo
                const box = detection.detection.box
                if (ctx) {
                  ctx.strokeStyle = '#facc15'
                  ctx.lineWidth = 3
                  ctx.strokeRect(box.x, box.y, box.width, box.height)
                  const aluno = alunos.find(a => a.aluno_id === alunoId)
                  ctx.fillStyle = '#facc15'
                  ctx.font = 'bold 14px sans-serif'
                  ctx.fillText(`${aluno?.nome || ''} (já registrado)`, box.x, box.y - 5)
                }
                continue
              }

              // Reset unknown counter on successful recognition
              setUnknownCount(0)

              // Registrar presença
              cooldownMapRef.current.set(alunoId, agora)
              const aluno = alunos.find(a => a.aluno_id === alunoId)

              // Desenhar em verde
              const box = detection.detection.box
              if (ctx) {
                ctx.strokeStyle = '#22c55e'
                ctx.lineWidth = 3
                ctx.strokeRect(box.x, box.y, box.width, box.height)
                ctx.fillStyle = '#22c55e'
                ctx.font = 'bold 16px sans-serif'
                ctx.fillText(`${aluno?.nome || ''} ✓`, box.x, box.y - 5)
              }

              // Enviar para API
              const hora = new Date().toLocaleTimeString('pt-BR')
              try {
                const res = await fetch('/api/admin/facial/presenca-terminal', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    aluno_id: alunoId,
                    timestamp: new Date().toISOString(),
                    confianca: Math.round(confianca * 10000) / 10000,
                  }),
                })

                if (res.ok) {
                  const resData = await res.json()
                  const tipo = resData.tipo || 'entrada'
                  setRegistros(prev => [{
                    aluno_id: alunoId,
                    nome: aluno?.nome || 'Desconhecido',
                    tipo: tipo as 'entrada' | 'saida',
                    hora,
                    confianca,
                  }, ...prev].slice(0, 50))

                  setMensagem(`${aluno?.nome} — ${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada!`)
                  setMensagemTipo('sucesso')
                  setOnline(true)

                  if (somAtivo) tocarSom('sucesso')
                } else {
                  setMensagem(`${aluno?.nome} — Erro ao registrar`)
                  setMensagemTipo('erro')
                }
              } catch {
                // Offline — salvar localmente
                const regOffline: RegistroPresenca = {
                  aluno_id: alunoId,
                  nome: aluno?.nome || 'Desconhecido',
                  tipo: 'entrada' as const,
                  hora,
                  confianca,
                }
                setRegistros(prev => [regOffline, ...prev].slice(0, 50))

                setMensagem(`${aluno?.nome} — Salvo offline`)
                setMensagemTipo('info')
                setOnline(false)
              }

              // Limpar mensagem após 4 segundos
              setTimeout(() => setMensagem(''), 4000)
            } else {
              // Desconhecido — desenhar em vermelho
              const box = detection.detection.box
              if (ctx) {
                ctx.strokeStyle = '#ef4444'
                ctx.lineWidth = 2
                ctx.strokeRect(box.x, box.y, box.width, box.height)
              }
              // Track consecutive unknown detections
              setUnknownCount(prev => {
                const next = prev + 1
                if (next === 6) {
                  setMensagem('Rosto não reconhecido detectado frequentemente. Considere cadastrar novos alunos.')
                  setMensagemTipo('info')
                  setTimeout(() => setMensagem(''), 6000)
                }
                return next
              })
            }
          }
        }
      } catch (err) {
        // Erro silencioso no loop de detecção
      }
    }, 500) // Detectar a cada 500ms
  }, [alunos, config.confianca_minima, config.cooldown_segundos, somAtivo])

  const pararReconhecimento = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setReconhecendo(false)
  }, [])

  // ============================================================================
  // Fullscreen
  // ============================================================================

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setFullscreen(true)
    } else {
      document.exitFullscreen()
      setFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // ============================================================================
  // Som
  // ============================================================================

  const tocarSom = (tipo: 'sucesso' | 'erro') => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.value = 0.3

      if (tipo === 'sucesso') {
        osc.frequency.value = 800
        osc.start()
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.1)
        osc.stop(ctx.currentTime + 0.2)
      } else {
        osc.frequency.value = 300
        osc.start()
        osc.stop(ctx.currentTime + 0.3)
      }
    } catch {
      // Sem suporte a áudio
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  useEffect(() => {
    return () => {
      pararReconhecimento()
      pararCamera()
    }
  }, [pararReconhecimento, pararCamera])

  // ============================================================================
  // Iniciar terminal
  // ============================================================================

  const iniciarTerminal = async () => {
    if (!config.escola_id) return

    setFase('terminal')
    setUnknownCount(0)

    // Auto-register this terminal as a device
    try {
      const escola = escolas.find(e => e.id === config.escola_id)
      await fetch('/api/admin/dispositivos-faciais/auto-registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escola_id: config.escola_id,
          nome: `Terminal Web - ${escola?.nome || 'Escola'}`,
          localizacao: 'Terminal Web (navegador)',
          tipo_dispositivo: 'terminal_web',
        }),
      })
    } catch {
      // Silent - auto-registration is best-effort
    }

    // Carregar alunos
    setMensagem('Carregando alunos...')
    setMensagemTipo('info')
    const total = await carregarAlunos()
    setMensagem(total ? `${total} aluno(s) carregado(s)` : 'Nenhum aluno com cadastro facial')
    setTimeout(() => setMensagem(''), 3000)

    // Iniciar câmera
    await iniciarCamera()
  }

  // Iniciar reconhecimento quando câmera e alunos estiverem prontos
  useEffect(() => {
    if (fase === 'terminal' && statusCamera === 'ativa' && alunos.length > 0 && statusModelo === 'pronto') {
      iniciarReconhecimento()
    }
    return () => pararReconhecimento()
  }, [fase, statusCamera, alunos.length, statusModelo, iniciarReconhecimento, pararReconhecimento])

  // ============================================================================
  // Render: Tela de Configuração
  // ============================================================================

  if (fase === 'config') {
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
              onClick={iniciarTerminal}
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

  // ============================================================================
  // Render: Terminal em modo Quiosque
  // ============================================================================

  return (
    <div ref={containerRef} className="h-screen bg-black flex flex-col overflow-hidden select-none">
      {/* Barra Superior */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900/90 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <ScanFace className="w-6 h-6 text-indigo-400" />
          <span className="text-white font-semibold hidden sm:inline">SISAM Terminal</span>

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
            <CheckCircle className="w-3 h-3" /> {new Set(registros.map(r => r.aluno_id)).size} presentes
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">
            <UserX className="w-3 h-3" /> {alunos.length - new Set(registros.map(r => r.aluno_id)).size} ausentes
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
            onClick={() => { pararReconhecimento(); pararCamera(); setFase('config') }}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Configurações"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Vídeo */}
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
                  <button onClick={iniciarCamera} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">
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

        {/* Painel lateral — Registros recentes */}
        <div className="w-full lg:w-80 bg-gray-900 border-t lg:border-t-0 lg:border-l border-gray-800 flex flex-col max-h-[30vh] lg:max-h-full">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Registros de Hoje
            </span>
            <span className="text-xs text-gray-500">{registros.length}</span>
          </div>

          {/* Aviso frequência por aula */}
          <div className="px-4 py-2 border-b border-gray-800 bg-purple-900/20">
            <p className="text-[11px] text-purple-400">
              <strong>6º-9º Ano:</strong> Este terminal registra a entrada na escola.
              A frequência por aula é gerenciada no{' '}
              <a href="/admin/painel-turma" className="underline hover:text-purple-300">Painel da Turma</a>.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {registros.length === 0 ? (
              <div className="p-6 text-center text-gray-600 text-sm">
                Nenhum registro ainda
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {registros.map((reg, i) => (
                  <div key={`${reg.aluno_id}-${i}`} className="px-4 py-3 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      reg.tipo === 'entrada' ? 'bg-green-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{reg.nome}</p>
                      <p className="text-xs text-gray-500">
                        {reg.tipo === 'entrada' ? 'Entrada' : 'Saída'} — {reg.hora} — {Math.round(reg.confianca * 100)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lista de ausentes */}
          {(() => {
            const idsPresentes = new Set(registros.map(r => r.aluno_id))
            const alunosAusentes = alunos.filter(a => !idsPresentes.has(a.aluno_id))
            return (
              <div className="border-t border-gray-800">
                <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <UserX className="w-4 h-4" /> Ainda não chegaram
                  </span>
                  <span className="text-xs text-gray-500">{alunosAusentes.length}</span>
                </div>
                <div className="max-h-[20vh] overflow-y-auto">
                  {alunosAusentes.length === 0 ? (
                    <div className="p-4 text-center text-gray-600 text-sm">
                      Todos presentes!
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-800">
                      {alunosAusentes.map(aluno => (
                        <div key={aluno.aluno_id} className="px-4 py-2 flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full flex-shrink-0 bg-red-500" />
                          <p className="text-sm text-gray-400 truncate">{aluno.nome}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Componente auxiliar: Hora atualizada em tempo real
// ============================================================================

function HoraAtual() {
  const [hora, setHora] = useState(new Date().toLocaleTimeString('pt-BR'))

  useEffect(() => {
    const timer = setInterval(() => {
      setHora(new Date().toLocaleTimeString('pt-BR'))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <span className="text-gray-400 text-sm font-mono hidden sm:inline">
      <Clock className="w-3.5 h-3.5 inline mr-1" />{hora}
    </span>
  )
}
