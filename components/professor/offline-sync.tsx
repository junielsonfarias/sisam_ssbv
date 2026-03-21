'use client'

import { useState, useEffect } from 'react'
import { Download, Upload, Wifi, WifiOff, CheckCircle, Loader2 } from 'lucide-react'
import * as professorDB from '@/lib/professor-db'

type EtapaSync = '' | 'baixando_servidor' | 'salvando_turmas' | 'salvando_alunos' | 'salvando_periodos' | 'limpando' | 'concluido' | 'enviando_frequencias' | 'enviando_notas' | 'limpando_filas'

const ETAPA_LABELS: Record<EtapaSync, string> = {
  '': '',
  baixando_servidor: 'Baixando dados do servidor...',
  salvando_turmas: 'Salvando turmas...',
  salvando_alunos: 'Salvando alunos...',
  salvando_periodos: 'Salvando períodos...',
  limpando: 'Limpando dados antigos...',
  concluido: 'Concluído!',
  enviando_frequencias: 'Enviando frequências...',
  enviando_notas: 'Enviando notas...',
  limpando_filas: 'Limpando filas locais...',
}

export default function OfflineSyncProfessor() {
  const [online, setOnline] = useState(true)
  const [pendentes, setPendentes] = useState({ frequencias: 0, notas: 0 })
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [baixando, setBaixando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [etapa, setEtapa] = useState<EtapaSync>('')
  const [progresso, setProgresso] = useState(0) // 0-100
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    setOnline(navigator.onLine)
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    atualizarContagem()
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-sync quando voltar online
  useEffect(() => {
    if (online && (pendentes.frequencias > 0 || pendentes.notas > 0)) {
      enviarPendentes()
    }
  }, [online])

  const atualizarContagem = async () => {
    try {
      const counts = await professorDB.contarPendentes()
      setPendentes(counts)
      const date = await professorDB.obterSyncDate()
      setLastSync(date)
    } catch { }
  }

  const baixarDados = async () => {
    setBaixando(true)
    setMensagem('')
    setProgresso(0)
    try {
      // Etapa 1: Baixar do servidor
      setEtapa('baixando_servidor')
      setProgresso(10)
      const res = await fetch('/api/professor/sync')
      if (!res.ok) throw new Error('Erro ao baixar dados')
      const data = await res.json()
      setProgresso(30)

      // Etapa 2: Salvar turmas
      setEtapa('salvando_turmas')
      setProgresso(40)
      await professorDB.salvarTurmas(data.turmas)

      // Etapa 3: Salvar períodos
      setEtapa('salvando_periodos')
      setProgresso(50)
      await professorDB.salvarPeriodos(data.periodos)

      // Etapa 4: Salvar alunos por turma
      setEtapa('salvando_alunos')
      const alunosPorTurma: Record<string, any[]> = {}
      for (const a of data.alunos) {
        if (!alunosPorTurma[a.turma_id]) alunosPorTurma[a.turma_id] = []
        alunosPorTurma[a.turma_id].push(a)
      }
      const turmaEntries = Object.entries(alunosPorTurma)
      for (let i = 0; i < turmaEntries.length; i++) {
        const [turmaId, alunos] = turmaEntries[i]
        await professorDB.salvarAlunos(turmaId, alunos)
        setProgresso(50 + Math.round((i / turmaEntries.length) * 30))
      }
      setProgresso(80)

      // Etapa 5: Limpeza
      setEtapa('limpando')
      setProgresso(85)
      const turmaIdsValidos = data.turmas.map((t: any) => t.turma_id)
      const limpeza = await professorDB.limparDadosOrfaos(turmaIdsValidos)
      const pendentesAntigos = await professorDB.limparPendentesAntigos()
      setProgresso(95)

      await professorDB.salvarSyncDate()
      await atualizarContagem()

      // Concluído
      setEtapa('concluido')
      setProgresso(100)

      const totalAlunos = data.alunos.length
      const totalTurmas = data.turmas.length
      let msg = `${totalTurmas} turma(s), ${totalAlunos} aluno(s), ${data.periodos.length} período(s)`
      if (limpeza.turmasRemovidas > 0) msg += ` | ${limpeza.turmasRemovidas} órfão(s) removido(s)`
      if (pendentesAntigos > 0) msg += ` | ${pendentesAntigos} antigo(s) limpo(s)`
      setMensagem(msg)

      // Reset etapa após 3s
      setTimeout(() => { setEtapa(''); setProgresso(0) }, 3000)
    } catch (err: any) {
      setMensagem(err.message || 'Erro ao baixar')
      setEtapa('')
      setProgresso(0)
    } finally {
      setBaixando(false)
    }
  }

  const enviarPendentes = async () => {
    setEnviando(true)
    setMensagem('')
    setProgresso(0)
    try {
      setEtapa('enviando_frequencias')
      setProgresso(10)
      const frequencias = await professorDB.obterFrequenciasPendentes()

      setEtapa('enviando_notas')
      setProgresso(20)
      const notas = await professorDB.obterNotasPendentes()

      if (frequencias.length === 0 && notas.length === 0) {
        setMensagem('Nenhum dado pendente')
        setEnviando(false)
        setEtapa('')
        return
      }

      setProgresso(40)
      const res = await fetch('/api/professor/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequencias, notas }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.mensagem)
      setProgresso(80)

      setEtapa('limpando_filas')
      await professorDB.limparFrequenciasPendentes()
      await professorDB.limparNotasPendentes()
      await atualizarContagem()
      setProgresso(100)

      setEtapa('concluido')
      setMensagem(data.mensagem)
      setTimeout(() => { setEtapa(''); setProgresso(0) }, 3000)
    } catch (err: any) {
      setMensagem(err.message || 'Erro ao enviar')
      setEtapa('')
      setProgresso(0)
    } finally {
      setEnviando(false)
    }
  }

  const totalPendentes = pendentes.frequencias + pendentes.notas
  const emOperacao = baixando || enviando

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header: status + pendentes */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {online ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {online ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {pendentes.frequencias > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-full">
              {pendentes.frequencias} freq
            </span>
          )}
          {pendentes.notas > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
              {pendentes.notas} notas
            </span>
          )}
        </div>
      </div>

      {lastSync && (
        <p className="text-[10px] text-gray-400 mb-2">
          Sincronizado: {new Date(lastSync).toLocaleString('pt-BR')}
        </p>
      )}

      {/* Barra de progresso */}
      {emOperacao && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <Loader2 className="h-3 w-3 text-emerald-500 animate-spin" />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {ETAPA_LABELS[etapa] || 'Processando...'}
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      )}

      {/* Etapa concluída */}
      {etapa === 'concluido' && !emOperacao && (
        <div className="flex items-center gap-2 mb-2 text-xs text-green-600 dark:text-green-400">
          <CheckCircle className="h-3 w-3" />
          <span>Sincronização concluída!</span>
        </div>
      )}

      {/* Botões */}
      <div className="flex gap-2">
        <button
          onClick={baixarDados}
          disabled={emOperacao || !online}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors"
        >
          <Download className="h-3 w-3" />
          {baixando ? 'Baixando...' : 'Baixar Dados'}
        </button>

        {totalPendentes > 0 && (
          <button
            onClick={enviarPendentes}
            disabled={emOperacao || !online}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 disabled:opacity-50 transition-colors"
          >
            <Upload className="h-3 w-3" />
            {enviando ? 'Enviando...' : `Enviar (${totalPendentes})`}
          </button>
        )}
      </div>

      {/* Mensagem de resultado */}
      {mensagem && !emOperacao && (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-[10px] text-gray-600 dark:text-gray-400">
          {mensagem}
        </div>
      )}
    </div>
  )
}
