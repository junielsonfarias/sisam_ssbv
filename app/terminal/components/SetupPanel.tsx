'use client'

import { useState } from 'react'
import {
  Camera, CheckCircle, AlertCircle, Loader2, Download, ScanFace,
} from 'lucide-react'
import {
  salvarConfig, obterEmbeddings, baixarEmbeddings,
} from '@/lib/terminal-db'
import type { AlunoEmMemoria, StatusModelo } from '../types'

interface SetupPanelProps {
  statusModelo: StatusModelo
  serverUrl: string
  setServerUrl: (v: string) => void
  token: string
  setToken: (v: string) => void
  escolaId: string
  setEscolaId: (v: string) => void
  escolaNome: string
  setEscolaNome: (v: string) => void
  turmaId: string
  setTurmaId: (v: string) => void
  confianca: number
  setConfianca: (v: number) => void
  cooldown: number
  setCooldown: (v: number) => void
  configSalva: boolean
  setConfigSalva: (v: boolean) => void
  totalEmbeddings: number
  setTotalEmbeddings: (v: number) => void
  setAlunos: (a: AlunoEmMemoria[]) => void
  setFase: (f: 'setup' | 'terminal') => void
  setCameraAtiva: (v: boolean) => void
  setMensagem: (m: string) => void
  setMensagemTipo: (t: 'sucesso' | 'info' | 'erro') => void
  streamRef: React.MutableRefObject<MediaStream | null>
  videoRef: React.RefObject<HTMLVideoElement>
}

export function SetupPanel({
  statusModelo, serverUrl, setServerUrl, token, setToken,
  escolaId, setEscolaId, escolaNome, setEscolaNome,
  turmaId, setTurmaId, confianca, setConfianca, cooldown, setCooldown,
  configSalva, setConfigSalva, totalEmbeddings, setTotalEmbeddings,
  setAlunos, setFase, setCameraAtiva, setMensagem, setMensagemTipo,
  streamRef, videoRef,
}: SetupPanelProps) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [logado, setLogado] = useState(false)
  const [loginCarregando, setLoginCarregando] = useState(false)
  const [baixandoEmbed, setBaixandoEmbed] = useState(false)
  const [escolas, setEscolas] = useState<{ id: string; nome: string }[]>([])
  const [mensagemSetup, setMensagemSetup] = useState('')

  const buscarEscolas = async (baseUrl?: string) => {
    try {
      const url = baseUrl || serverUrl || window.location.origin

      const res = await fetch(`${url}/api/admin/escolas`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setEscolas(Array.isArray(data) ? data.map((e: any) => ({ id: e.id, nome: e.nome })) : [])
      } else {
        setMensagemSetup('Sessao expirada. Faca login novamente.')
        setLogado(false)
      }
    } catch {
      setMensagemSetup('Erro ao carregar escolas.')
    }
  }

  const fazerLogin = async () => {
    if (!email || !senha) {
      setMensagemSetup('Informe email e senha')
      return
    }

    setLoginCarregando(true)
    setMensagemSetup('')

    try {
      const baseUrl = serverUrl || window.location.origin

      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim().toLowerCase(), senha }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMensagemSetup(data.mensagem || 'Email ou senha incorretos')
        return
      }

      setLogado(true)
      setToken('authenticated')
      setMensagemSetup('')

      if (data.usuario?.escola_id) {
        setEscolaId(data.usuario.escola_id)
        setEscolaNome(data.usuario.escola_nome || '')
      }

      await buscarEscolas(baseUrl)
    } catch {
      setMensagemSetup('Servidor inacessivel. Verifique a URL.')
    } finally {
      setLoginCarregando(false)
    }
  }

  const baixarESalvar = async () => {
    if (!escolaId || !logado) return
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
      if (total === 0) {
        setMensagemSetup('Nenhum aluno com rosto cadastrado nesta escola. Primeiro cadastre os rostos em Cadastro Facial (/admin/facial-enrollment).')
      } else {
        setMensagemSetup(`${total} aluno(s) com rosto cadastrado carregado(s). Pronto para iniciar!`)
      }
    } catch {
      setMensagemSetup('Erro ao baixar embeddings. Verifique a conexao.')
    } finally {
      setBaixandoEmbed(false)
    }
  }

  const iniciarTerminal = async () => {
    const embsLocais = await obterEmbeddings()
    if (embsLocais.length === 0) {
      setMensagemSetup('Nenhum embedding encontrado. Baixe os dados primeiro.')
      return
    }

    const alunosCarregados: AlunoEmMemoria[] = []
    for (const emb of embsLocais) {
      try {
        const cleanBase64 = emb.embedding_base64.replace(/\s/g, '')
        const bytes = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0))
        const allFloats = new Float32Array(bytes.buffer)
        // Suporta 1 descriptor (128 floats) ou 3 concatenados (384 floats)
        if (allFloats.length !== 128 && allFloats.length !== 384) continue
        const descriptors: Float32Array[] = []
        for (let i = 0; i < allFloats.length; i += 128) {
          descriptors.push(new Float32Array(allFloats.buffer, i * 4, 128))
        }
        alunosCarregados.push({ aluno_id: emb.aluno_id, nome: emb.nome, codigo: emb.codigo, serie: emb.serie, turma_codigo: emb.turma_codigo, descriptors })
      } catch {
        // Expected: skip individual invalid embeddings without breaking the loop
      }
    }

    setAlunos(alunosCarregados)
    setFase('terminal')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
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

        {/* Login do terminal */}
        {!logado ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@semed.gov.br" autoComplete="email"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                onKeyDown={e => e.key === 'Enter' && fazerLogin()} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha</label>
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
                placeholder="Sua senha" autoComplete="current-password"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                onKeyDown={e => e.key === 'Enter' && fazerLogin()} />
            </div>
            <button onClick={fazerLogin} disabled={!email || !senha || loginCarregando}
              className="w-full py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {loginCarregando ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              {loginCarregando ? 'Conectando...' : 'Entrar'}
            </button>
          </div>
        ) : null}

        {/* Escola - aparece apos login */}
        {logado && escolas.length > 0 && (
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
            <button onClick={baixarESalvar} disabled={!escolaId || baixandoEmbed || statusModelo !== 'pronto' || !logado}
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
