'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Camera, Wifi, WifiOff, Users, Clock, CheckCircle, AlertCircle,
  Maximize, Minimize, Volume2, VolumeX, Settings, ScanFace,
  Loader2, UserX, RefreshCw, Download, CloudOff, Cloud
} from 'lucide-react'
import {
  obterConfig, salvarConfig, obterEmbeddings, contarEmbeddings,
  registrarPresenca, contarPresencasPendentes, sincronizarPresencas,
  baixarEmbeddings, limparPresencasEnviadas,
  type TerminalConfig, type EmbeddingLocal
} from '@/lib/terminal-db'

// ============================================================================
// Tipos
// ============================================================================

interface AlunoEmMemoria {
  aluno_id: string
  nome: string
  codigo: string | null
  descriptor: Float32Array
}

interface RegistroLocal {
  aluno_id: string
  nome: string
  tipo: 'entrada' | 'saida'
  hora: string
  confianca: number
}

type Fase = 'setup' | 'terminal'
type StatusModelo = 'carregando' | 'pronto' | 'erro'

// ============================================================================
// Componente Principal
// ============================================================================

export default function TerminalPWA() {
  // Fase
  const [fase, setFase] = useState<Fase>('setup')

  // Setup
  const [serverUrl, setServerUrl] = useState('')
  const [token, setToken] = useState('')
  const [escolaId, setEscolaId] = useState('')
  const [escolaNome, setEscolaNome] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [confianca, setConfianca] = useState(0.85)
  const [cooldown, setCooldown] = useState(1800)
  const [configSalva, setConfigSalva] = useState(false)
  const [baixandoEmbed, setBaixandoEmbed] = useState(false)
  const [totalEmbeddings, setTotalEmbeddings] = useState(0)
  const [escolas, setEscolas] = useState<{ id: string; nome: string }[]>([])
  const [mensagemSetup, setMensagemSetup] = useState('')

  // Terminal
  const [statusModelo, setStatusModelo] = useState<StatusModelo>('carregando')
  const [cameraAtiva, setCameraAtiva] = useState(false)
  const [online, setOnline] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [somAtivo, setSomAtivo] = useState(true)
  const [reconhecendo, setReconhecendo] = useState(false)
  const [alunos, setAlunos] = useState<AlunoEmMemoria[]>([])
  const [registros, setRegistros] = useState<RegistroLocal[]>([])
  const [mensagem, setMensagem] = useState('')
  const [mensagemTipo, setMensagemTipo] = useState<'sucesso' | 'info' | 'erro'>('info')
  const [pendentesSync, setPendentesSync] = useState(0)
  const [horaAtual, setHoraAtual] = useState('')
  const [sincronizando, setSincronizando] = useState(false)

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const faceapiRef = useRef<any>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const cooldownMapRef = useRef<Map<string, number>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)
  const wakeLockRef = useRef<any>(null)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const sincronizandoRef = useRef(false)
  const mensagemTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ============================================================================
  // INICIALIZAÇÃO — Carregar config salva + modelos
  // ============================================================================

  useEffect(() => {
    const init = async () => {
      // Carregar config do IndexedDB
      const cfg = await obterConfig()
      if (cfg) {
        setServerUrl(cfg.server_url)
        setToken(cfg.api_token)
        setEscolaId(cfg.escola_id)
        setEscolaNome(cfg.escola_nome)
        setTurmaId(cfg.turma_id || '')
        setConfianca(cfg.confianca_minima)
        setCooldown(cfg.cooldown_segundos)
        setConfigSalva(true)

        const count = await contarEmbeddings()
        setTotalEmbeddings(count)
        if (count > 0) {
          // Config + embeddings existem → ir direto para terminal
          setFase('terminal')
        }
      } else {
        // Primeiro uso — tentar detectar URL do servidor
        setServerUrl(window.location.origin)
      }

      // Carregar modelos face-api
      try {
        const faceapi = await import('@vladmandic/face-api')
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models/face-api')
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models/face-api')
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models/face-api')
        faceapiRef.current = faceapi
        setStatusModelo('pronto')
      } catch {
        setStatusModelo('erro')
      }

      // Pendentes de sync
      setPendentesSync(await contarPresencasPendentes())
    }
    init()

    // Relógio
    const clockInterval = setInterval(() => {
      setHoraAtual(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)

    // Online/offline
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setOnline(navigator.onLine)

    return () => {
      clearInterval(clockInterval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // ============================================================================
  // WAKE LOCK — Impedir tela de apagar
  // ============================================================================

  useEffect(() => {
    if (fase !== 'terminal') return

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
        }
      } catch { /* Não suportado */ }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock()
    }

    requestWakeLock()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {})
    }
  }, [fase])

  // ============================================================================
  // SYNC AUTOMÁTICO — Enviar presenças quando online
  // ============================================================================

  useEffect(() => {
    if (fase !== 'terminal') return

    const sync = async () => {
      if (!navigator.onLine || !token || sincronizandoRef.current) return
      const count = await contarPresencasPendentes()
      if (count === 0) {
        setPendentesSync(0)
        return
      }

      sincronizandoRef.current = true
      setSincronizando(true)
      try {
        const result = await sincronizarPresencas(serverUrl, token)
        if (result.enviados > 0) {
          await limparPresencasEnviadas()
        }
      } catch { /* Retry no próximo ciclo */ }
      setPendentesSync(await contarPresencasPendentes())
      sincronizandoRef.current = false
      setSincronizando(false)
    }

    // Sync a cada 30 segundos
    syncIntervalRef.current = setInterval(sync, 30000)
    sync() // Sync imediato ao entrar no terminal

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
    }
  }, [fase, token, serverUrl])

  // ============================================================================
  // SETUP — Buscar escolas e salvar config
  // ============================================================================

  const buscarEscolas = async () => {
    try {
      const res = await fetch(`${serverUrl}/api/admin/escolas`, {
        headers: { 'Cookie': `token=${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setEscolas(Array.isArray(data) ? data.map((e: any) => ({ id: e.id, nome: e.nome })) : [])
        setMensagemSetup('')
      } else {
        setMensagemSetup('Erro ao conectar. Verifique o token.')
      }
    } catch {
      setMensagemSetup('Servidor inacessivel. Verifique a URL.')
    }
  }

  const baixarESalvar = async () => {
    if (!escolaId || !token) return
    setBaixandoEmbed(true)
    setMensagemSetup('Baixando embeddings dos alunos...')

    try {
      const total = await baixarEmbeddings(serverUrl, token, escolaId, turmaId || undefined)
      setTotalEmbeddings(total)

      const escola = escolas.find(e => e.id === escolaId)
      await salvarConfig({
        escola_id: escolaId,
        escola_nome: escola?.nome || '',
        turma_id: turmaId || undefined,
        confianca_minima: confianca,
        cooldown_segundos: cooldown,
        server_url: serverUrl,
        api_token: token,
        ultima_sync_embeddings: new Date().toISOString(),
      })

      setConfigSalva(true)
      setMensagemSetup(`${total} aluno(s) carregado(s). Pronto para iniciar!`)
    } catch {
      setMensagemSetup('Erro ao baixar embeddings. Verifique a conexao.')
    } finally {
      setBaixandoEmbed(false)
    }
  }

  // ============================================================================
  // INICIAR TERMINAL
  // ============================================================================

  const iniciarTerminal = async () => {
    // Carregar embeddings do IndexedDB para memória
    const embsLocais = await obterEmbeddings()
    if (embsLocais.length === 0) {
      setMensagemSetup('Nenhum embedding encontrado. Baixe os dados primeiro.')
      return
    }

    const alunosCarregados: AlunoEmMemoria[] = []
    for (const emb of embsLocais) {
      try {
        const bytes = Uint8Array.from(atob(emb.embedding_base64), c => c.charCodeAt(0))
        const descriptor = new Float32Array(bytes.buffer)
        alunosCarregados.push({ aluno_id: emb.aluno_id, nome: emb.nome, codigo: emb.codigo, descriptor })
      } catch { /* Ignora embedding inválido */ }
    }

    setAlunos(alunosCarregados)
    setFase('terminal')

    // Iniciar câmera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraAtiva(true)
    } catch {
      setMensagem('Erro ao acessar camera')
      setMensagemTipo('erro')
    }
  }

  // ============================================================================
  // RECONHECIMENTO FACIAL
  // ============================================================================

  useEffect(() => {
    if (fase !== 'terminal' || !cameraAtiva || !faceapiRef.current || alunos.length === 0) return

    const faceapi = faceapiRef.current

    const labeledDescriptors = alunos.map(a =>
      new faceapi.LabeledFaceDescriptors(a.aluno_id, [a.descriptor])
    )
    const matcher = new faceapi.FaceMatcher(labeledDescriptors, 1 - confianca)

    setReconhecendo(true)

    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused) return
      if (document.hidden) return

      try {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
          .withFaceLandmarks(true)
          .withFaceDescriptors()

        if (!canvasRef.current || !videoRef.current) return
        const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight }
        faceapi.matchDimensions(canvasRef.current, displaySize)
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

        const resized = faceapi.resizeResults(detections, displaySize)

        for (const det of resized) {
          const match = matcher.findBestMatch(det.descriptor)
          const box = det.detection.box

          if (match.label !== 'unknown') {
            const alunoId = match.label
            const conf = 1 - match.distance
            const aluno = alunos.find(a => a.aluno_id === alunoId)

            // Verificar cooldown
            const ultimoRegistro = cooldownMapRef.current.get(alunoId)
            const agora = Date.now()
            const emCooldown = ultimoRegistro && (agora - ultimoRegistro) < cooldown * 1000

            if (ctx) {
              ctx.strokeStyle = emCooldown ? '#eab308' : '#10b981'
              ctx.lineWidth = 3
              ctx.strokeRect(box.x, box.y, box.width, box.height)
              ctx.fillStyle = emCooldown ? '#eab308' : '#10b981'
              ctx.font = 'bold 14px sans-serif'
              ctx.fillText(aluno?.nome || alunoId, box.x, box.y - 8)
            }

            if (!emCooldown && aluno) {
              cooldownMapRef.current.set(alunoId, agora)

              // Registrar no IndexedDB
              await registrarPresenca({
                aluno_id: alunoId,
                nome: aluno.nome,
                timestamp: new Date().toISOString(),
                confianca: conf,
              })

              const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              setRegistros(prev => [{ aluno_id: alunoId, nome: aluno.nome, tipo: 'entrada' as const, hora, confianca: conf }, ...prev].slice(0, 50))
              setMensagem(`${aluno.nome}`)
              setMensagemTipo('sucesso')
              setPendentesSync(prev => prev + 1)

              // Limpar mensagem após 3 segundos
              if (mensagemTimeoutRef.current) clearTimeout(mensagemTimeoutRef.current)
              mensagemTimeoutRef.current = setTimeout(() => setMensagem(''), 3000)

              // Som
              if (somAtivo) {
                try {
                  const ctx = new AudioContext()
                  const osc = ctx.createOscillator()
                  osc.frequency.value = 880
                  osc.connect(ctx.destination)
                  osc.start()
                  setTimeout(() => { osc.stop(); ctx.close() }, 150)
                } catch { /* Sem som */ }
              }
            }
          } else {
            if (ctx) {
              ctx.strokeStyle = '#ef4444'
              ctx.lineWidth = 2
              ctx.strokeRect(box.x, box.y, box.width, box.height)
            }
          }
        }
      } catch { /* Erro no loop — continua */ }
    }, 600)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setReconhecendo(false)
    }
  }, [fase, cameraAtiva, alunos, confianca, cooldown, somAtivo])

  // ============================================================================
  // FULLSCREEN
  // ============================================================================

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen().catch(() => {})
      setFullscreen(true)
    } else {
      await document.exitFullscreen().catch(() => {})
      setFullscreen(false)
    }
  }

  // ============================================================================
  // RENDER — SETUP
  // ============================================================================

  if (fase === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-8 space-y-6">
          {/* Logo */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-100 mb-4">
              <ScanFace className="w-8 h-8 text-teal-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Terminal Facial</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configurar dispositivo para reconhecimento</p>
          </div>

          {/* Status dos modelos */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
            statusModelo === 'pronto' ? 'bg-green-50 text-green-700' :
            statusModelo === 'erro' ? 'bg-red-50 text-red-700' :
            'bg-blue-50 text-blue-700'
          }`}>
            {statusModelo === 'carregando' && <Loader2 className="w-4 h-4 animate-spin" />}
            {statusModelo === 'pronto' && <CheckCircle className="w-4 h-4" />}
            {statusModelo === 'erro' && <AlertCircle className="w-4 h-4" />}
            <span>Modelos IA: {statusModelo === 'pronto' ? 'Prontos' : statusModelo === 'erro' ? 'Erro ao carregar' : 'Carregando...'}</span>
          </div>

          {/* Servidor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL do Servidor</label>
            <input type="url" value={serverUrl} onChange={e => setServerUrl(e.target.value)}
              placeholder="https://sisam.cidade.gov.br"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
          </div>

          {/* Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Token de Acesso</label>
            <div className="flex gap-2">
              <input type="password" value={token} onChange={e => setToken(e.target.value)}
                placeholder="Cole o token JWT aqui"
                className="flex-1 px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
              <button onClick={buscarEscolas} disabled={!serverUrl || !token}
                className="px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
                Conectar
              </button>
            </div>
          </div>

          {/* Escola */}
          {escolas.length > 0 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Escola</label>
                <select value={escolaId} onChange={e => { setEscolaId(e.target.value); setEscolaNome(escolas.find(x => x.id === e.target.value)?.nome || '') }}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                  <option value="">Selecione a escola</option>
                  {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confianca</label>
                  <select value={confianca} onChange={e => setConfianca(parseFloat(e.target.value))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                    <option value={0.7}>70%</option>
                    <option value={0.8}>80%</option>
                    <option value={0.85}>85% (padrao)</option>
                    <option value={0.9}>90%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cooldown</label>
                  <select value={cooldown} onChange={e => setCooldown(parseInt(e.target.value))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                    <option value={300}>5 min</option>
                    <option value={900}>15 min</option>
                    <option value={1800}>30 min (padrao)</option>
                    <option value={3600}>1 hora</option>
                  </select>
                </div>
              </div>

              {/* Baixar embeddings */}
              <button onClick={baixarESalvar} disabled={!escolaId || baixandoEmbed || statusModelo !== 'pronto'}
                className="w-full py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {baixandoEmbed ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                {baixandoEmbed ? 'Baixando...' : `Baixar Dados dos Alunos${totalEmbeddings > 0 ? ` (${totalEmbeddings} salvos)` : ''}`}
              </button>
            </>
          )}

          {/* Mensagem */}
          {mensagemSetup && (
            <p className={`text-sm text-center ${mensagemSetup.includes('Erro') || mensagemSetup.includes('inacessivel') ? 'text-red-600' : 'text-teal-600'}`}>
              {mensagemSetup}
            </p>
          )}

          {/* Iniciar Terminal */}
          {totalEmbeddings > 0 && statusModelo === 'pronto' && (
            <button onClick={iniciarTerminal}
              className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-3 shadow-lg">
              <Camera className="w-6 h-6" />
              Iniciar Terminal ({totalEmbeddings} alunos)
            </button>
          )}

          {/* Voltar para config */}
          {configSalva && (
            <button onClick={() => setFase('terminal')} className="w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Voltar ao terminal
            </button>
          )}
        </div>
      </div>
    )
  }

  // ============================================================================
  // RENDER — TERMINAL (Kiosk Mode)
  // ============================================================================

  const presentes = new Set(registros.map(r => r.aluno_id)).size
  const ausentes = alunos.length - presentes

  return (
    <div ref={containerRef} className="min-h-screen bg-black text-white flex flex-col select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 backdrop-blur-sm border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <ScanFace className="w-6 h-6 text-teal-400" />
          <div>
            <h1 className="text-sm font-bold">{escolaNome || 'Terminal Facial'}</h1>
            <p className="text-[10px] text-gray-400">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sync status */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium ${
            pendentesSync > 0 ? (sincronizando ? 'bg-blue-900/50 text-blue-300' : 'bg-yellow-900/50 text-yellow-300') : 'bg-green-900/50 text-green-300'
          }`}>
            {sincronizando ? <RefreshCw className="w-3 h-3 animate-spin" /> :
             pendentesSync > 0 ? <CloudOff className="w-3 h-3" /> : <Cloud className="w-3 h-3" />}
            {pendentesSync > 0 ? `${pendentesSync} pendente(s)` : 'Sincronizado'}
          </div>

          {/* Online/Offline */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium ${online ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
            {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          </div>

          {/* Hora */}
          <div className="flex items-center gap-1 text-sm font-mono text-gray-300">
            <Clock className="w-3.5 h-3.5" />
            {horaAtual}
          </div>

          {/* Controles */}
          <button onClick={() => setSomAtivo(!somAtivo)} className="p-1.5 hover:bg-slate-700 rounded transition-colors">
            {somAtivo ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
          </button>
          <button onClick={toggleFullscreen} className="p-1.5 hover:bg-slate-700 rounded transition-colors">
            {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
          <button onClick={() => {
            // Parar câmera e reconhecimento ao voltar para setup
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(t => t.stop())
              streamRef.current = null
            }
            if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
            setCameraAtiva(false)
            setReconhecendo(false)
            setFase('setup')
          }} className="p-1.5 hover:bg-slate-700 rounded transition-colors" title="Configuracoes">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 relative">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

          {/* Mensagem grande no centro */}
          {mensagem && (
            <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl text-2xl font-bold shadow-2xl transition-all ${
              mensagemTipo === 'sucesso' ? 'bg-green-600' : mensagemTipo === 'erro' ? 'bg-red-600' : 'bg-blue-600'
            }`}>
              {mensagemTipo === 'sucesso' && <CheckCircle className="w-7 h-7 inline mr-2 -mt-1" />}
              {mensagem}
            </div>
          )}

          {/* Contadores no vídeo */}
          <div className="absolute top-4 left-4 flex gap-2">
            <div className="bg-green-600/80 backdrop-blur px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span className="text-sm font-bold">{presentes}</span>
              <span className="text-xs opacity-80">presentes</span>
            </div>
            <div className="bg-slate-700/80 backdrop-blur px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <UserX className="w-4 h-4" />
              <span className="text-sm font-bold">{ausentes}</span>
              <span className="text-xs opacity-80">ausentes</span>
            </div>
          </div>

          {/* Status de reconhecimento */}
          {!reconhecendo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-teal-400" />
                <p className="text-lg">Iniciando reconhecimento...</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — Últimos registros */}
        <div className="w-72 bg-slate-900 border-l border-slate-700/50 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-700/50">
            <h2 className="text-sm font-semibold text-gray-300">Registros de Hoje</h2>
            <p className="text-xs text-gray-500">{registros.length} registro(s)</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {registros.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600">
                <ScanFace className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-xs">Aguardando alunos...</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/30">
                {registros.map((r, i) => (
                  <div key={i} className="px-4 py-2 hover:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{r.nome}</p>
                        <p className="text-[10px] text-gray-500">{r.hora} • {Math.round(r.confianca * 100)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
