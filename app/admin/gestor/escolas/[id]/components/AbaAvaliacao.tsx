'use client'

import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  RegraSerieRow,
  TipoAvaliacaoOpt,
  RegraAvaliacaoOpt,
  ETAPA_LABELS,
  ETAPA_CORES,
} from './types'

export function AbaAvaliacao({ escolaId, toast }: { escolaId: string; toast: any }) {
  const [series, setSeries] = useState<RegraSerieRow[]>([])
  const [tipos, setTipos] = useState<TipoAvaliacaoOpt[]>([])
  const [regras, setRegras] = useState<RegraAvaliacaoOpt[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [form, setForm] = useState<{
    tipo_avaliacao_id: string; regra_avaliacao_id: string
    media_aprovacao: string; media_recuperacao: string; nota_maxima: string
    permite_recuperacao: string
  }>({ tipo_avaliacao_id: '', regra_avaliacao_id: '', media_aprovacao: '', media_recuperacao: '', nota_maxima: '', permite_recuperacao: '' })

  const carregar = async () => {
    try {
      const [seriesRes, tiposRes, regrasRes] = await Promise.all([
        fetch(`/api/admin/escolas/${escolaId}/regras-avaliacao`),
        fetch('/api/admin/tipos-avaliacao'),
        fetch('/api/admin/regras-avaliacao'),
      ])
      if (seriesRes.ok) setSeries(await seriesRes.json())
      if (tiposRes.ok) {
        const t = await tiposRes.json()
        setTipos(Array.isArray(t) ? t : t.tipos || [])
      }
      if (regrasRes.ok) {
        const r = await regrasRes.json()
        setRegras(Array.isArray(r) ? r : r.regras || [])
      }
    } catch (e) {
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [escolaId])

  const iniciarEdicao = (s: RegraSerieRow) => {
    setEditando(s.serie_id)
    setForm({
      tipo_avaliacao_id: s.override_tipo_id || '',
      regra_avaliacao_id: s.override_regra_id || '',
      media_aprovacao: s.override_media_aprovacao != null ? String(s.override_media_aprovacao) : '',
      media_recuperacao: s.override_media_recuperacao != null ? String(s.override_media_recuperacao) : '',
      nota_maxima: s.override_nota_maxima != null ? String(s.override_nota_maxima) : '',
      permite_recuperacao: s.override_permite_recuperacao != null ? String(s.override_permite_recuperacao) : '',
    })
  }

  const salvarOverride = async (serieId: string) => {
    setSalvando(serieId)
    try {
      const res = await fetch(`/api/admin/escolas/${escolaId}/regras-avaliacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serie_escolar_id: serieId,
          tipo_avaliacao_id: form.tipo_avaliacao_id || null,
          regra_avaliacao_id: form.regra_avaliacao_id || null,
          media_aprovacao: form.media_aprovacao !== '' ? parseFloat(form.media_aprovacao) : null,
          media_recuperacao: form.media_recuperacao !== '' ? parseFloat(form.media_recuperacao) : null,
          nota_maxima: form.nota_maxima !== '' ? parseFloat(form.nota_maxima) : null,
          permite_recuperacao: form.permite_recuperacao !== '' ? form.permite_recuperacao === 'true' : null,
        }),
      })
      if (res.ok) {
        toast.success('Override salvo')
        setEditando(null)
        await carregar()
      } else {
        const data = await res.json()
        toast.error(data.mensagem || 'Erro ao salvar')
      }
    } catch (e) {
      toast.error('Erro ao salvar')
    } finally {
      setSalvando(null)
    }
  }

  const removerOverride = async (serieId: string) => {
    setSalvando(serieId)
    try {
      const res = await fetch(`/api/admin/escolas/${escolaId}/regras-avaliacao?serie_id=${serieId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Override removido')
        setEditando(null)
        await carregar()
      }
    } catch (e) {
      toast.error('Erro ao remover')
    } finally {
      setSalvando(null)
    }
  }

  if (carregando) return <LoadingSpinner text="Carregando regras..." centered />

  const etapas = ['educacao_infantil', 'fundamental_anos_iniciais', 'fundamental_anos_finais', 'eja']
  const porEtapa = etapas.map(etapa => ({
    etapa,
    label: ETAPA_LABELS[etapa] || etapa,
    series: series.filter(s => s.etapa === etapa).sort((a, b) => a.ordem - b.ordem),
  })).filter(g => g.series.length > 0)

  const totalOverrides = series.filter(s => s.override_id).length

  // Regras filtradas pelo tipo selecionado no form
  const regrasFiltradas = form.tipo_avaliacao_id
    ? regras.filter(r => r.tipo_avaliacao_id === form.tipo_avaliacao_id)
    : regras

  const TIPO_CORES: Record<string, string> = {
    parecer: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    conceito: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    numerico: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    misto: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-emerald-600" />
          Regras de Avaliacao por Serie
        </h3>
        {totalOverrides > 0 && (
          <span className="text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full">
            {totalOverrides} override(s) ativo(s)
          </span>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
        <strong>Como funciona:</strong> Cada serie tem uma regra padrao definida no sistema.
        Voce pode criar <strong>overrides</strong> para customizar o tipo de avaliacao, media de aprovacao
        ou nota maxima especificamente para esta escola. Campos em branco usam o padrao.
      </div>

      {porEtapa.map(grupo => (
        <div key={grupo.etapa}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${ETAPA_CORES[grupo.etapa] || 'bg-gray-100 text-gray-700'}`}>
              {grupo.label}
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-slate-600" />
          </div>

          <div className="space-y-3 mb-6">
            {grupo.series.map(s => {
              const temOverride = !!s.override_id
              const isEditando = editando === s.serie_id
              const tipoResultado = s.override_tipo_resultado || s.padrao_tipo_resultado || 'numerico'

              return (
                <div
                  key={s.serie_id}
                  className={`rounded-xl border transition-all ${
                    temOverride
                      ? 'border-orange-400 bg-orange-50/50 dark:bg-orange-900/10 dark:border-orange-600'
                      : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700/50'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">{s.serie_nome}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TIPO_CORES[tipoResultado] || 'bg-gray-100 text-gray-600'}`}>
                        {temOverride ? (s.override_tipo_nome || s.padrao_tipo_nome) : s.padrao_tipo_nome || 'Numerico'}
                      </span>
                      {temOverride && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-orange-200 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                          Override
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isEditando ? (
                        <button
                          onClick={() => iniciarEdicao(s)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-500 transition-colors"
                        >
                          {temOverride ? 'Editar' : 'Personalizar'}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => salvarOverride(s.serie_id)}
                            disabled={salvando === s.serie_id}
                            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            {salvando === s.serie_id ? 'Salvando...' : 'Salvar'}
                          </button>
                          {temOverride && (
                            <button
                              onClick={() => removerOverride(s.serie_id)}
                              disabled={salvando === s.serie_id}
                              className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 transition-colors"
                            >
                              Remover
                            </button>
                          )}
                          <button
                            onClick={() => setEditando(null)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Info resumida (nao editando) */}
                  {!isEditando && (
                    <div className="px-4 pb-3 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Regra: <strong>{temOverride ? (s.override_regra_nome || s.padrao_regra_nome || '-') : (s.padrao_regra_nome || '-')}</strong></span>
                      <span>Media: <strong>{temOverride && s.override_media_aprovacao != null ? s.override_media_aprovacao : s.padrao_media_aprovacao ?? '-'}</strong></span>
                      <span>Nota max: <strong>{temOverride && s.override_nota_maxima != null ? s.override_nota_maxima : s.padrao_nota_maxima ?? '-'}</strong></span>
                      <span>Recuperacao: <strong>{temOverride && s.override_permite_recuperacao != null ? (s.override_permite_recuperacao ? 'Sim' : 'Nao') : (s.padrao_permite_recuperacao ? 'Sim' : 'Nao')}</strong></span>
                    </div>
                  )}

                  {/* Form de edicao */}
                  {isEditando && (
                    <div className="px-4 pb-4 border-t border-gray-200 dark:border-slate-600 pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Tipo de Avaliacao
                            <span className="text-gray-400 ml-1">(padrao: {s.padrao_tipo_nome || '-'})</span>
                          </label>
                          <select
                            value={form.tipo_avaliacao_id}
                            onChange={e => setForm(f => ({ ...f, tipo_avaliacao_id: e.target.value, regra_avaliacao_id: '' }))}
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Usar padrao</option>
                            {tipos.map(t => (
                              <option key={t.id} value={t.id}>{t.nome}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Regra de Avaliacao
                            <span className="text-gray-400 ml-1">(padrao: {s.padrao_regra_nome || '-'})</span>
                          </label>
                          <select
                            value={form.regra_avaliacao_id}
                            onChange={e => setForm(f => ({ ...f, regra_avaliacao_id: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Usar padrao</option>
                            {regrasFiltradas.map(r => (
                              <option key={r.id} value={r.id}>{r.nome}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Media Aprovacao
                            <span className="text-gray-400 ml-1">(padrao: {s.padrao_media_aprovacao ?? '-'})</span>
                          </label>
                          <input
                            type="number"
                            value={form.media_aprovacao}
                            onChange={e => setForm(f => ({ ...f, media_aprovacao: e.target.value }))}
                            min={0} max={100} step={0.5}
                            placeholder="Usar padrao"
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Media Recuperacao
                          </label>
                          <input
                            type="number"
                            value={form.media_recuperacao}
                            onChange={e => setForm(f => ({ ...f, media_recuperacao: e.target.value }))}
                            min={0} max={100} step={0.5}
                            placeholder="Usar padrao"
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Nota Maxima
                            <span className="text-gray-400 ml-1">(padrao: {s.padrao_nota_maxima ?? '-'})</span>
                          </label>
                          <input
                            type="number"
                            value={form.nota_maxima}
                            onChange={e => setForm(f => ({ ...f, nota_maxima: e.target.value }))}
                            min={0} max={100} step={0.5}
                            placeholder="Usar padrao"
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Permite Recuperacao
                          </label>
                          <select
                            value={form.permite_recuperacao}
                            onChange={e => setForm(f => ({ ...f, permite_recuperacao: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Usar padrao</option>
                            <option value="true">Sim</option>
                            <option value="false">Nao</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
