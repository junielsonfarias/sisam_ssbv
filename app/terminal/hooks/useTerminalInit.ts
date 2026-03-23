'use client'

import { useEffect, useState, useRef } from 'react'
import {
  obterConfig, obterEmbeddings, contarEmbeddings,
  contarPresencasPendentes,
} from '@/lib/terminal-db'
import type { AlunoEmMemoria, Fase, StatusModelo } from '../types'

interface UseTerminalInitReturn {
  fase: Fase
  setFase: (f: Fase) => void
  inicializando: boolean
  statusModelo: StatusModelo
  setStatusModelo: (s: StatusModelo) => void
  online: boolean
  setOnline: (v: boolean) => void
  horaAtual: string
  pendentesSync: number
  setPendentesSync: React.Dispatch<React.SetStateAction<number>>
  // Config loaded from IndexedDB
  savedConfig: {
    serverUrl: string
    token: string
    escolaId: string
    escolaNome: string
    turmaId: string
    confianca: number
    cooldown: number
    configSalva: boolean
    totalEmbeddings: number
  } | null
  // Alunos loaded during init
  initialAlunos: AlunoEmMemoria[]
  faceapiRef: React.MutableRefObject<any>
}

export function useTerminalInit(): UseTerminalInitReturn {
  const [fase, setFase] = useState<Fase>('setup')
  const [inicializando, setInicializando] = useState(true)
  const [statusModelo, setStatusModelo] = useState<StatusModelo>('carregando')
  const [online, setOnline] = useState(true)
  const [horaAtual, setHoraAtual] = useState('')
  const [pendentesSync, setPendentesSync] = useState(0)
  const [savedConfig, setSavedConfig] = useState<UseTerminalInitReturn['savedConfig']>(null)
  const [initialAlunos, setInitialAlunos] = useState<AlunoEmMemoria[]>([])
  const faceapiRef = useRef<any>(null)
  const faseRef = useRef<Fase>('setup')

  useEffect(() => {
    const init = async () => {
      // Carregar config do IndexedDB
      const cfg = await obterConfig()
      if (cfg) {
        const count = await contarEmbeddings()
        let loadedAlunos: AlunoEmMemoria[] = []
        let goToTerminal = false

        if (count > 0) {
          const embsLocais = await obterEmbeddings()
          const alunosCarregados: AlunoEmMemoria[] = []
          for (const emb of embsLocais) {
            try {
              const bytes = Uint8Array.from(atob(emb.embedding_base64.replace(/\s/g, '')), c => c.charCodeAt(0))
              const descriptor = new Float32Array(bytes.buffer)
              alunosCarregados.push({ aluno_id: emb.aluno_id, nome: emb.nome, codigo: emb.codigo, serie: emb.serie, turma_codigo: emb.turma_codigo, descriptor })
            } catch { /* Ignora invalido */ }
          }
          loadedAlunos = alunosCarregados
          goToTerminal = true
          console.info(`[TerminalInit] ${alunosCarregados.length} embeddings carregados de ${count} no IndexedDB`)
        }

        setSavedConfig({
          serverUrl: cfg.server_url,
          token: cfg.api_token,
          escolaId: cfg.escola_id,
          escolaNome: cfg.escola_nome,
          turmaId: cfg.turma_id || '',
          confianca: cfg.confianca_minima,
          cooldown: cfg.cooldown_segundos,
          configSalva: true,
          totalEmbeddings: count,
        })
        setInitialAlunos(loadedAlunos)
        if (goToTerminal) {
          setFase('terminal')
          faseRef.current = 'terminal'
        }
      } else {
        // Primeiro uso - detectar URL do servidor
        setSavedConfig({
          serverUrl: window.location.origin,
          token: '',
          escolaId: '',
          escolaNome: '',
          turmaId: '',
          confianca: 0.85,
          cooldown: 1800,
          configSalva: false,
          totalEmbeddings: 0,
        })
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
      setInicializando(false)
    }
    init()

    // Relogio
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

  return {
    fase, setFase,
    inicializando,
    statusModelo, setStatusModelo,
    online, setOnline,
    horaAtual,
    pendentesSync, setPendentesSync,
    savedConfig,
    initialAlunos,
    faceapiRef,
  }
}
