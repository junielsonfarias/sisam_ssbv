'use client'

import { useEffect, useState } from 'react'
import { School, MapPin, Users, BookOpen } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Polo {
  id: string
  nome: string
}

interface Escola {
  id: string
  nome: string
  polo_id: string
}

interface Resumo {
  total_turmas: number
  total_alunos: number
}

interface EtapaEscolaProps {
  poloId: string
  escolaId: string
  anoLetivo: string
  onPoloChange: (id: string) => void
  onEscolaChange: (id: string, nome: string) => void
  onProximo: () => void
}

export default function EtapaEscola({ poloId, escolaId, anoLetivo, onPoloChange, onEscolaChange, onProximo }: EtapaEscolaProps) {
  const [polos, setPolos] = useState<Polo[]>([])
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    fetch('/api/admin/polos')
      .then(r => r.json())
      .then(data => {
        setPolos(Array.isArray(data) ? data : [])
        setCarregando(false)
      })
      .catch(() => setCarregando(false))
  }, [])

  useEffect(() => {
    if (!poloId) { setEscolas([]); return }
    fetch(`/api/admin/escolas?polo_id=${poloId}`)
      .then(r => r.json())
      .then(data => setEscolas(Array.isArray(data) ? data : []))
      .catch(() => setEscolas([]))
  }, [poloId])

  useEffect(() => {
    if (!escolaId) { setResumo(null); return }
    fetch(`/api/admin/matriculas/resumo?escola_id=${escolaId}&ano_letivo=${anoLetivo}`)
      .then(r => r.json())
      .then(data => setResumo(data))
      .catch(() => setResumo(null))
  }, [escolaId, anoLetivo])

  if (carregando) return <LoadingSpinner size="lg" text="Carregando polos..." centered />

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <School className="w-12 h-12 mx-auto text-indigo-500 mb-2" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Selecione a Escola</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Escolha o polo e a escola para realizar as matrículas</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <MapPin className="inline w-4 h-4 mr-1" /> Polo
          </label>
          <select
            value={poloId}
            onChange={(e) => {
              onPoloChange(e.target.value)
              onEscolaChange('', '')
            }}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Selecione o polo...</option>
            {polos.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <School className="inline w-4 h-4 mr-1" /> Escola
          </label>
          <select
            value={escolaId}
            onChange={(e) => {
              const escola = escolas.find(esc => esc.id === e.target.value)
              onEscolaChange(e.target.value, escola?.nome || '')
            }}
            disabled={!poloId}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
          >
            <option value="">Selecione a escola...</option>
            {escolas.map(e => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {resumo && escolaId && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2">Resumo {anoLetivo}</h3>
          <div className="flex gap-6 text-sm text-indigo-600 dark:text-indigo-400">
            <span className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" /> {resumo.total_turmas} turma(s)
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" /> {resumo.total_alunos} aluno(s) matriculado(s)
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          onClick={onProximo}
          disabled={!escolaId}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          Próximo
        </button>
      </div>
    </div>
  )
}
