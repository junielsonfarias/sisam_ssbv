'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Plus, Check } from 'lucide-react'
import { ModalBase, ModalFooter } from '@/components/ui/modal-base'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToast } from '@/components/toast'

interface Serie {
  id: string
  serie: string
  nome_serie: string
  avalia_lp: boolean
  avalia_mat: boolean
  avalia_ch: boolean
  avalia_cn: boolean
  tem_producao_textual: boolean
}

interface EtapaSerieProps {
  serieSelecionada: string
  onSerieChange: (serie: string, nomeSerie: string) => void
  onProximo: () => void
  onVoltar: () => void
}

export default function EtapaSerie({ serieSelecionada, onSerieChange, onProximo, onVoltar }: EtapaSerieProps) {
  const toast = useToast()
  const [series, setSeries] = useState<Serie[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [novaSerie, setNovaSerie] = useState({ serie: '', nome_serie: '', avalia_ch: false, avalia_cn: false, tem_producao_textual: false })

  const carregarSeries = () => {
    setCarregando(true)
    fetch('/api/admin/matriculas/series')
      .then(r => r.json())
      .then(data => {
        setSeries(Array.isArray(data) ? data : [])
        setCarregando(false)
      })
      .catch(() => setCarregando(false))
  }

  useEffect(() => { carregarSeries() }, [])

  const handleCriarSerie = async () => {
    if (!novaSerie.serie || !novaSerie.nome_serie) return
    setSalvando(true)
    try {
      const res = await fetch('/api/admin/matriculas/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaSerie),
      })
      const data = await res.json()
      if (res.ok) {
        setMostrarModal(false)
        setNovaSerie({ serie: '', nome_serie: '', avalia_ch: false, avalia_cn: false, tem_producao_textual: false })
        toast.success('Série criada com sucesso')
        carregarSeries()
      } else {
        toast.error(data.mensagem || 'Erro ao criar série')
      }
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <LoadingSpinner size="lg" text="Carregando séries..." centered />

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <BookOpen className="w-12 h-12 mx-auto text-indigo-500 mb-2" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Selecione a Série</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Escolha a série para a matrícula dos alunos</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {series.map(s => (
          <button
            key={s.id}
            onClick={() => onSerieChange(s.serie, s.nome_serie)}
            className={`relative p-4 rounded-lg border-2 text-left transition-all ${
              serieSelecionada === s.serie
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-200 dark:ring-indigo-800'
                : 'border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 bg-white dark:bg-slate-800'
            }`}
          >
            {serieSelecionada === s.serie && (
              <Check className="absolute top-2 right-2 w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            )}
            <div className="font-bold text-lg text-gray-900 dark:text-white">{s.nome_serie}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap gap-1">
              {s.avalia_lp && <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">LP</span>}
              {s.avalia_mat && <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">MAT</span>}
              {s.avalia_ch && <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded">CH</span>}
              {s.avalia_cn && <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">CN</span>}
              {s.tem_producao_textual && <span className="bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 px-1.5 py-0.5 rounded">Prod. Textual</span>}
            </div>
          </button>
        ))}

        <button
          onClick={() => setMostrarModal(true)}
          className="p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex flex-col items-center justify-center"
        >
          <Plus className="w-8 h-8 mb-1" />
          <span className="text-sm font-medium">Nova Série</span>
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
          disabled={!serieSelecionada}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          Próximo
        </button>
      </div>

      <ModalBase aberto={mostrarModal} onFechar={() => setMostrarModal(false)} titulo="Nova Série">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Número da Série</label>
            <input
              type="text"
              value={novaSerie.serie}
              onChange={e => setNovaSerie({ ...novaSerie, serie: e.target.value })}
              placeholder="Ex: 4"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Série</label>
            <input
              type="text"
              value={novaSerie.nome_serie}
              onChange={e => setNovaSerie({ ...novaSerie, nome_serie: e.target.value })}
              placeholder="Ex: 4º Ano"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 min-h-[44px] text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={novaSerie.avalia_ch} onChange={e => setNovaSerie({ ...novaSerie, avalia_ch: e.target.checked })} className="w-5 h-5 rounded" />
              Avalia CH
            </label>
            <label className="flex items-center gap-2 min-h-[44px] text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={novaSerie.avalia_cn} onChange={e => setNovaSerie({ ...novaSerie, avalia_cn: e.target.checked })} className="w-5 h-5 rounded" />
              Avalia CN
            </label>
            <label className="flex items-center gap-2 min-h-[44px] text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={novaSerie.tem_producao_textual} onChange={e => setNovaSerie({ ...novaSerie, tem_producao_textual: e.target.checked })} className="w-5 h-5 rounded" />
              Produção Textual
            </label>
          </div>
          <ModalFooter
            onFechar={() => setMostrarModal(false)}
            onSalvar={handleCriarSerie}
            salvando={salvando}
            desabilitado={!novaSerie.serie || !novaSerie.nome_serie}
            textoSalvar="Criar Série"
            textoSalvando="Criando..."
          />
        </div>
      </ModalBase>
    </div>
  )
}
