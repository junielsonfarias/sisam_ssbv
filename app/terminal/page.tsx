'use client'

import { useEffect, useState, useRef } from 'react'
import { ScanFace } from 'lucide-react'
import { useTerminalInit } from './hooks/useTerminalInit'
import { useCamera } from './hooks/useCamera'
import { useSync } from './hooks/useSync'
import { useFaceRecognition } from './hooks/useFaceRecognition'
import { SetupPanel } from './components/SetupPanel'
import { TerminalView } from './components/TerminalView'
import type { AlunoEmMemoria, RegistroLocal } from './types'

// ============================================================================
// Componente Principal — Orquestrador
// ============================================================================

export default function TerminalPWA() {
  // Inicializacao central (config, modelos, clock, online)
  const {
    fase, setFase,
    inicializando,
    statusModelo,
    online,
    horaAtual,
    pendentesSync, setPendentesSync,
    savedConfig,
    initialAlunos,
    faceapiRef,
  } = useTerminalInit()

  // Estado local do terminal
  const [serverUrl, setServerUrl] = useState('')
  const [token, setToken] = useState('')
  const [escolaId, setEscolaId] = useState('')
  const [escolaNome, setEscolaNome] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [confianca, setConfianca] = useState(0.85)
  const [cooldown, setCooldown] = useState(1800)
  const [configSalva, setConfigSalva] = useState(false)
  const [totalEmbeddings, setTotalEmbeddings] = useState(0)

  const [cameraAtiva, setCameraAtiva] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [somAtivo, setSomAtivo] = useState(true)
  const [reconhecendo, setReconhecendo] = useState(false)
  const [alunos, setAlunos] = useState<AlunoEmMemoria[]>([])
  const [registros, setRegistros] = useState<RegistroLocal[]>([])
  const [mensagem, setMensagem] = useState('')
  const [mensagemTipo, setMensagemTipo] = useState<'sucesso' | 'info' | 'erro'>('info')
  const [ultimoAlunoNome, setUltimoAlunoNome] = useState('')
  const [ultimoAlunoInfo, setUltimoAlunoInfo] = useState('')
  const [ultimoAlunoHora, setUltimoAlunoHora] = useState('')
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false)
  const [confirmacaoTipo, setConfirmacaoTipo] = useState<'entrada' | 'ja_registrado'>('entrada')
  const [sincronizando, setSincronizando] = useState(false)

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Sincronizar config carregada do IndexedDB
  useEffect(() => {
    if (!savedConfig) return
    setServerUrl(savedConfig.serverUrl)
    setToken(savedConfig.token)
    setEscolaId(savedConfig.escolaId)
    setEscolaNome(savedConfig.escolaNome)
    setTurmaId(savedConfig.turmaId)
    setConfianca(savedConfig.confianca)
    setCooldown(savedConfig.cooldown)
    setConfigSalva(savedConfig.configSalva)
    setTotalEmbeddings(savedConfig.totalEmbeddings)
  }, [savedConfig])

  // Sincronizar alunos carregados na init
  useEffect(() => {
    if (initialAlunos.length > 0) {
      setAlunos(initialAlunos)
    }
  }, [initialAlunos])

  // Camera auto-start + wake lock
  useCamera({
    fase, statusModelo, alunosCount: alunos.length,
    cameraAtiva, setCameraAtiva,
    setMensagem, setMensagemTipo,
    videoRef, streamRef,
  })

  // Sync automatico de presencas
  useSync({
    fase, token, serverUrl,
    setPendentesSync, sincronizando, setSincronizando,
  })

  // Reconhecimento facial
  useFaceRecognition({
    fase, cameraAtiva, faceapiRef, alunos, confianca, cooldown, somAtivo,
    serverUrl, token, videoRef, canvasRef,
    setReconhecendo, setRegistros, setUltimoAlunoNome, setUltimoAlunoInfo,
    setUltimoAlunoHora, setConfirmacaoTipo, setMostrarConfirmacao, setPendentesSync,
  })

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {})
      setFullscreen(true)
    } else {
      await document.exitFullscreen().catch(() => {})
      setFullscreen(false)
    }
  }

  // ============================================================================
  // RENDER — LOADING INICIAL
  // ============================================================================

  if (inicializando) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <ScanFace className="w-16 h-16 mx-auto mb-4 text-teal-400 animate-pulse" />
          <p className="text-lg font-medium">Carregando terminal...</p>
        </div>
      </div>
    )
  }

  // ============================================================================
  // RENDER — SETUP
  // ============================================================================

  if (fase === 'setup') {
    return (
      <SetupPanel
        statusModelo={statusModelo}
        serverUrl={serverUrl} setServerUrl={setServerUrl}
        token={token} setToken={setToken}
        escolaId={escolaId} setEscolaId={setEscolaId}
        escolaNome={escolaNome} setEscolaNome={setEscolaNome}
        turmaId={turmaId} setTurmaId={setTurmaId}
        confianca={confianca} setConfianca={setConfianca}
        cooldown={cooldown} setCooldown={setCooldown}
        configSalva={configSalva} setConfigSalva={setConfigSalva}
        totalEmbeddings={totalEmbeddings} setTotalEmbeddings={setTotalEmbeddings}
        setAlunos={setAlunos} setFase={setFase}
        setCameraAtiva={setCameraAtiva}
        setMensagem={setMensagem} setMensagemTipo={setMensagemTipo}
        streamRef={streamRef} videoRef={videoRef}
      />
    )
  }

  // ============================================================================
  // RENDER — TERMINAL
  // ============================================================================

  return (
    <TerminalView
      escolaNome={escolaNome} horaAtual={horaAtual}
      online={online} fullscreen={fullscreen}
      somAtivo={somAtivo} setSomAtivo={setSomAtivo}
      reconhecendo={reconhecendo}
      alunos={alunos} setAlunos={setAlunos}
      registros={registros}
      mensagem={mensagem} setMensagem={setMensagem}
      mensagemTipo={mensagemTipo} setMensagemTipo={setMensagemTipo}
      ultimoAlunoNome={ultimoAlunoNome}
      ultimoAlunoInfo={ultimoAlunoInfo}
      ultimoAlunoHora={ultimoAlunoHora}
      mostrarConfirmacao={mostrarConfirmacao}
      confirmacaoTipo={confirmacaoTipo}
      pendentesSync={pendentesSync}
      sincronizando={sincronizando}
      serverUrl={serverUrl} escolaId={escolaId}
      videoRef={videoRef} canvasRef={canvasRef}
      faceapiRef={faceapiRef} streamRef={streamRef}
      intervalRef={intervalRef}
      setCameraAtiva={setCameraAtiva}
      setReconhecendo={setReconhecendo}
      setFase={setFase}
      toggleFullscreen={toggleFullscreen}
    />
  )
}
