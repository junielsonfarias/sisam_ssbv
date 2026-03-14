'use client'

import { useEffect, useState } from 'react'
import { Users, Plus, Check } from 'lucide-react'
import { ModalBase, ModalFooter } from '@/components/ui/modal-base'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToast } from '@/components/toast'

interface Turma {
  id: string
  codigo: string
  nome: string | null
  serie: string | null
  total_alunos: number
  capacidade_maxima?: number
  multiserie?: boolean
  multietapa?: boolean
}

interface EtapaTurmaProps {
  escolaId: string
  serie: string
  anoLetivo: string
  turmaSelecionada: string
  onTurmaChange: (id: string, nome: string, turma?: Turma) => void
  onProximo: () => void
  onVoltar: () => void
}

export default function EtapaTurma({ escolaId, serie, anoLetivo, turmaSelecionada, onTurmaChange, onProximo, onVoltar }: EtapaTurmaProps) {
  const toast = useToast()
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [novaTurma, setNovaTurma] = useState({ codigo: '', nome: '' })

  const carregarTurmas = () => {
    setCarregando(true)
    fetch(`/api/admin/matriculas/turmas?escola_id=${escolaId}&serie=${serie}&ano_letivo=${anoLetivo}`)
      .then(r => r.json())
      .then(data => {
        setTurmas(Array.isArray(data) ? data : [])
        setCarregando(false)
      })
      .catch(() => setCarregando(false))
  }

  useEffect(() => {
    if (escolaId && serie) carregarTurmas()
  }, [escolaId, serie])

  const handleCriarTurma = async () => {
    if (!novaTurma.codigo) return
    setSalvando(true)
    try {
      const res = await fetch('/api/admin/matriculas/turmas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: novaTurma.codigo,
          nome: novaTurma.nome || null,
          escola_id: escolaId,
          serie,
          ano_letivo: anoLetivo,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMostrarModal(false)
        setNovaTurma({ codigo: '', nome: '' })
        toast.success('Turma criada com sucesso')
        carregarTurmas()
      } else {
        toast.error(data.mensagem || 'Erro ao criar turma')
      }
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <LoadingSpinner size="lg" text="Carregando turmas..." centered />

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Users className="w-12 h-12 mx-auto text-indigo-500 mb-2" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Selecione a Turma</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Escolha ou crie uma turma para a série selecionada</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {turmas.map(t => (
          <button
            key={t.id}
            onClick={() => onTurmaChange(t.id, t.nome || t.codigo, t)}
            className={`relative p-4 rounded-lg border-2 text-left transition-all ${
              turmaSelecionada === t.id
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-200 dark:ring-indigo-800'
                : 'border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 bg-white dark:bg-slate-800'
            }`}
          >
            {turmaSelecionada === t.id && (
              <Check className="absolute top-2 right-2 w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            )}
            <div className="font-bold text-gray-900 dark:text-white">{t.codigo}</div>
            {t.nome && <div className="text-sm text-gray-600 dark:text-gray-400">{t.nome}</div>}
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1 flex-wrap">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {t.total_alunos}{t.capacidade_maxima ? `/${t.capacidade_maxima}` : ''}</span>
              {t.multiserie && (
                <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-[10px] font-medium">Multi</span>
              )}
              {t.multietapa && (
                <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-[10px] font-medium">Etapa</span>
              )}
            </div>
          </button>
        ))}

        <button
          onClick={() => setMostrarModal(true)}
          className="p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex flex-col items-center justify-center min-h-[100px]"
        >
          <Plus className="w-8 h-8 mb-1" />
          <span className="text-sm font-medium">Nova Turma</span>
        </button>
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onVoltar}
          className="px-6 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition-colors"
        >
          Voltar
        </button>
        <button
          onClick={onProximo}
          disabled={!turmaSelecionada}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          Próximo
        </button>
      </div>

      <ModalBase aberto={mostrarModal} onFechar={() => setMostrarModal(false)} titulo="Nova Turma">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código da Turma</label>
            <input
              type="text"
              value={novaTurma.codigo}
              onChange={e => setNovaTurma({ ...novaTurma, codigo: e.target.value })}
              placeholder="Ex: 6A, 3B"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome (opcional)</label>
            <input
              type="text"
              value={novaTurma.nome}
              onChange={e => setNovaTurma({ ...novaTurma, nome: e.target.value })}
              placeholder="Ex: Turma A - Manhã"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
          <ModalFooter
            onFechar={() => setMostrarModal(false)}
            onSalvar={handleCriarTurma}
            salvando={salvando}
            desabilitado={!novaTurma.codigo}
            textoSalvar="Criar Turma"
            textoSalvando="Criando..."
          />
        </div>
      </ModalBase>
    </div>
  )
}
