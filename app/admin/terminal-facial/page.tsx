'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import ProtectedRoute from '@/components/protected-route'
import { useSeries } from '@/lib/use-series'
import { useEscolas } from '@/lib/hooks/useEscolas'
import { useTurmas } from '@/lib/hooks/useTurmas'

import type { AlunoEmbedding, RegistroPresenca, ConfigTerminal, StatusModelo, StatusCamera } from './types'
import { ConfigScreen } from './components/ConfigScreen'
import { TerminalTopBar } from './components/TerminalTopBar'
import { VideoPanel } from './components/VideoPanel'
import { RegistrosSidebar } from './components/RegistrosSidebar'
import { useReconhecimento } from './hooks/useReconhecimento'

// ============================================================================
// Componente Principal
// ============================================================================

function TerminalFacialContent() {
  const { formatSerie } = useSeries()

  // Estado do sistema
  const [statusModelo, setStatusModelo] = useState<StatusModelo>('carregando')
  const [statusCamera, setStatusCamera] = useState<StatusCamera>('desligada')
  const [online, setOnline] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [somAtivo, setSomAtivo] = useState(true)
  const [reconhecendo, setReconhecendo] = useState(false)

  // Configuracao
  const [fase, setFase] = useState<'config' | 'terminal'>('config')
  const [config, setConfig] = useState<ConfigTerminal>({
    escola_id: '',
    turma_id: '',
    confianca_minima: 0.85,
    cooldown_segundos: 1800,
  })

  // Dados
  const { escolas } = useEscolas()
  const { turmas } = useTurmas(config.escola_id)
  const [alunos, setAlunos] = useState<AlunoEmbedding[]>([])
  const [registros, setRegistros] = useState<RegistroPresenca[]>([])
  const [mensagem, setMensagem] = useState('')
  const [mensagemTipo, setMensagemTipo] = useState<'sucesso' | 'info' | 'erro'>('info')
  const [erroModelo, setErroModelo] = useState('')
  const [, setUnknownCount] = useState(0)

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faceapiRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ============================================================================
  // Reconhecimento (hook extraido)
  // ============================================================================

  const { iniciarReconhecimento, pararReconhecimento } = useReconhecimento({
    alunos, config, somAtivo,
    videoRef, canvasRef, faceapiRef,
    setReconhecendo, setUnknownCount, setRegistros,
    setMensagem, setMensagemTipo, setOnline,
  })

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setErroModelo(err.message || 'Falha ao carregar modelos de reconhecimento')
        setStatusModelo('erro')
      }
    }
    carregarModelos()
  }, [])

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
          const allFloats = new Float32Array(bytes.buffer)
          // Suporta 1 descriptor (128 floats/512 bytes) ou 3 concatenados (384 floats/1536 bytes)
          const descriptors: Float32Array[] = []
          for (let i = 0; i < allFloats.length; i += 128) {
            descriptors.push(new Float32Array(allFloats.buffer, i * 4, 128))
          }
          if (descriptors.length === 0) continue
          alunosCarregados.push({
            aluno_id: aluno.aluno_id,
            nome: aluno.nome,
            codigo: aluno.codigo,
            turma_id: aluno.turma_id,
            serie: aluno.serie,
            descriptors,
          })
        } catch {
          // Ignora aluno com embedding invalido
        }
      }

      setAlunos(alunosCarregados)
      return alunosCarregados.length
    } catch {
      return 0
    }
  }, [config.escola_id, config.turma_id])

  // ============================================================================
  // Camera
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
    } catch {
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

    // Iniciar camera
    await iniciarCamera()
  }

  // Iniciar reconhecimento quando camera e alunos estiverem prontos
  useEffect(() => {
    if (fase === 'terminal' && statusCamera === 'ativa' && alunos.length > 0 && statusModelo === 'pronto') {
      iniciarReconhecimento()
    }
    return () => pararReconhecimento()
  }, [fase, statusCamera, alunos.length, statusModelo, iniciarReconhecimento, pararReconhecimento])

  // ============================================================================
  // Render: Tela de Configuracao
  // ============================================================================

  if (fase === 'config') {
    return (
      <ConfigScreen
        config={config}
        setConfig={setConfig}
        escolas={escolas}
        turmas={turmas}
        statusModelo={statusModelo}
        erroModelo={erroModelo}
        formatSerie={formatSerie}
        onIniciarTerminal={iniciarTerminal}
      />
    )
  }

  // ============================================================================
  // Render: Terminal em modo Quiosque
  // ============================================================================

  return (
    <div ref={containerRef} className="h-screen bg-black flex flex-col overflow-hidden select-none">
      <TerminalTopBar
        online={online}
        alunos={alunos}
        registros={registros}
        somAtivo={somAtivo}
        setSomAtivo={setSomAtivo}
        fullscreen={fullscreen}
        toggleFullscreen={toggleFullscreen}
        onVoltarConfig={() => { pararReconhecimento(); pararCamera(); setFase('config') }}
      />

      {/* Conteudo Principal */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <VideoPanel
          videoRef={videoRef}
          canvasRef={canvasRef}
          statusCamera={statusCamera}
          reconhecendo={reconhecendo}
          mensagem={mensagem}
          mensagemTipo={mensagemTipo}
          onRetryCamera={iniciarCamera}
        />
        <RegistrosSidebar registros={registros} alunos={alunos} />
      </div>
    </div>
  )
}

export default function TerminalFacialPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <TerminalFacialContent />
    </ProtectedRoute>
  )
}
