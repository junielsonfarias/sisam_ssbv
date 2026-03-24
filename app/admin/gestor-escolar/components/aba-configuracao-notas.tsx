'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit, Save, X, Settings, Trash2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ConfiguracaoNotas, EscolaSimples } from './types'

/** parseFloat que aceita 0 como valor válido (0 é falsy em JS, || default o ignora) */
function parseNum(value: string, fallback: number): number {
  const parsed = parseFloat(value)
  return isNaN(parsed) ? fallback : parsed
}

function FormConfiguracao({
  form,
  setForm,
  escolas,
  tipoUsuario,
  escolaIdUsuario,
  onSalvar,
  onCancelar,
  salvando,
}: {
  form: any
  setForm: (f: any) => void
  escolas: EscolaSimples[]
  tipoUsuario: string
  escolaIdUsuario: string
  onSalvar: () => void
  onCancelar: () => void
  salvando: boolean
}) {
  return (
    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-4">
      <h3 className="font-medium text-gray-800 dark:text-white">Configuração de Notas</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tipoUsuario === 'escola' ? (
          <input type="hidden" value={escolaIdUsuario} />
        ) : (
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Escola *</label>
            <select
              value={form.escola_id}
              onChange={e => setForm({ ...form, escola_id: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              <option value="">Selecione...</option>
              {escolas.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Ano Letivo</label>
          <input
            type="text"
            value={form.ano_letivo}
            onChange={e => setForm({ ...form, ano_letivo: e.target.value })}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Tipo de Período</label>
          <select
            value={form.tipo_periodo}
            onChange={e => setForm({ ...form, tipo_periodo: e.target.value })}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          >
            <option value="bimestre">Bimestral</option>
            <option value="trimestre">Trimestral</option>
            <option value="semestre">Semestral</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Nota Máxima</label>
          <input
            type="number"
            value={form.nota_maxima}
            onChange={e => setForm({ ...form, nota_maxima: parseNum(e.target.value, 10) })}
            min={1}
            max={100}
            step={0.5}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Média de Aprovação</label>
          <input
            type="number"
            value={form.media_aprovacao}
            onChange={e => setForm({ ...form, media_aprovacao: parseNum(e.target.value, 6) })}
            min={0}
            max={100}
            step={0.5}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Média para Recuperação</label>
          <input
            type="number"
            value={form.media_recuperacao}
            onChange={e => setForm({ ...form, media_recuperacao: parseNum(e.target.value, 5) })}
            min={0}
            max={100}
            step={0.5}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={form.permite_recuperacao}
            onChange={e => setForm({ ...form, permite_recuperacao: e.target.checked })}
            className="rounded border-gray-300 text-indigo-600"
          />
          Permite Recuperação
        </label>

        {form.permite_recuperacao && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 dark:text-gray-400">Peso Avaliação:</label>
              <input
                type="number"
                value={form.peso_avaliacao}
                onChange={e => {
                  const val = parseNum(e.target.value, 0.6)
                  setForm({ ...form, peso_avaliacao: val, peso_recuperacao: Math.round((1 - val) * 100) / 100 })
                }}
                min={0}
                max={1}
                step={0.1}
                className="w-20 rounded-lg border border-gray-300 dark:border-slate-600 px-2 py-1 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 dark:text-gray-400">Peso Recuperação:</label>
              <input
                type="number"
                value={form.peso_recuperacao}
                onChange={e => {
                  const val = parseNum(e.target.value, 0.4)
                  setForm({ ...form, peso_recuperacao: val, peso_avaliacao: Math.round((1 - val) * 100) / 100 })
                }}
                min={0}
                max={1}
                step={0.1}
                className="w-20 rounded-lg border border-gray-300 dark:border-slate-600 px-2 py-1 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={onSalvar} disabled={salvando} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 text-sm transition-colors">
          <Save className="w-4 h-4" />{salvando ? 'Salvando...' : 'Salvar'}
        </button>
        <button onClick={onCancelar} className="flex items-center gap-2 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 text-sm transition-colors">
          <X className="w-4 h-4" />Cancelar
        </button>
      </div>
    </div>
  )
}

export function AbaConfiguracaoNotas({
  podeEditar,
  tipoUsuario,
  escolaIdUsuario,
  toast,
}: {
  podeEditar: boolean
  tipoUsuario: string
  escolaIdUsuario: string
  toast: any
}) {
  const [configs, setConfigs] = useState<ConfiguracaoNotas[]>([])
  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString())

  const formInicial = {
    escola_id: escolaIdUsuario || '',
    ano_letivo: new Date().getFullYear().toString(),
    tipo_periodo: 'bimestre',
    nota_maxima: 10,
    media_aprovacao: 6,
    media_recuperacao: 5,
    peso_avaliacao: 0.6,
    peso_recuperacao: 0.4,
    permite_recuperacao: true,
  }

  const [form, setForm] = useState(formInicial)

  const carregarDados = async () => {
    try {
      const params = new URLSearchParams()
      if (filtroAno) params.set('ano_letivo', filtroAno)
      if (escolaIdUsuario) params.set('escola_id', escolaIdUsuario)

      const [configRes, escolasRes] = await Promise.all([
        fetch(`/api/admin/configuracao-notas?${params}`),
        tipoUsuario !== 'escola' ? fetch('/api/admin/escolas') : Promise.resolve(null),
      ])

      if (configRes.ok) setConfigs(await configRes.json())
      if (escolasRes?.ok) {
        const data = await escolasRes.json()
        setEscolas(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      toast.error('Erro ao carregar configurações')
    } finally {
      setCarregando(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregarDados() }, [filtroAno, tipoUsuario, escolaIdUsuario])

  const iniciarCriacao = () => {
    setCriando(true)
    setEditando(null)
    setForm({ ...formInicial, ano_letivo: filtroAno })
  }

  const iniciarEdicao = (c: ConfiguracaoNotas) => {
    setEditando(c.id)
    setCriando(false)
    setForm({
      escola_id: c.escola_id,
      ano_letivo: c.ano_letivo,
      tipo_periodo: c.tipo_periodo,
      nota_maxima: c.nota_maxima,
      media_aprovacao: c.media_aprovacao,
      media_recuperacao: c.media_recuperacao,
      peso_avaliacao: c.peso_avaliacao,
      peso_recuperacao: c.peso_recuperacao,
      permite_recuperacao: c.permite_recuperacao,
    })
  }

  const cancelar = () => {
    setEditando(null)
    setCriando(false)
  }

  const excluir = async (configId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta configuração de notas?')) return
    try {
      const res = await fetch(`/api/admin/configuracao-notas?id=${configId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.mensagem)
      toast.success('Configuração excluída')
      await carregarDados()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir')
    }
  }

  const salvar = async () => {
    if (!form.escola_id) {
      toast.error('Selecione uma escola')
      return
    }
    setSalvando(true)
    try {
      const method = criando ? 'POST' : 'PUT'
      const body = criando ? form : { ...form, id: editando }
      const res = await fetch('/api/admin/configuracao-notas', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(criando ? 'Configuração criada!' : 'Configuração atualizada!')
        cancelar()
        await carregarDados()
      } else {
        toast.error(data.mensagem || 'Erro ao salvar')
      }
    } catch (e) {
      toast.error('Erro ao salvar configuração')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <LoadingSpinner text="Carregando configurações..." centered />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Configuração de Notas por Escola</h2>
        <div className="flex items-center gap-2">
          <select
            value={filtroAno}
            onChange={e => setFiltroAno(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          >
            {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          {podeEditar && !criando && (
            <button
              onClick={iniciarCriacao}
              className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Configuração</span>
            </button>
          )}
        </div>
      </div>

      {(criando || editando) && (
        <FormConfiguracao
          form={form}
          setForm={setForm}
          escolas={escolas}
          tipoUsuario={tipoUsuario}
          escolaIdUsuario={escolaIdUsuario}
          onSalvar={salvar}
          onCancelar={cancelar}
          salvando={salvando}
        />
      )}

      {/* Cards de configuração */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.map(c => (
          <div key={c.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{c.escola_nome || 'Escola'}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ano: {c.ano_letivo} | Tipo: {({'bimestre':'Bimestre','trimestre':'Trimestre','semestre':'Semestre','anual':'Anual','bimestral':'Bimestral','trimestral':'Trimestral','semestral':'Semestral'} as any)[c.tipo_periodo] || c.tipo_periodo}</p>
              </div>
              {podeEditar && (
                <div className="flex gap-1">
                  <button onClick={() => iniciarEdicao(c)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg" title="Editar">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => excluir(c.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Nota Máxima</p>
                <p className="font-semibold text-gray-900 dark:text-white">{c.nota_maxima}</p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Média Aprovação</p>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">{c.media_aprovacao}</p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Média Recuperação</p>
                <p className="font-semibold text-orange-600 dark:text-orange-400">{c.media_recuperacao}</p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Recuperação</p>
                <p className="font-semibold text-gray-900 dark:text-white">{c.permite_recuperacao ? 'Sim' : 'Não'}</p>
              </div>
            </div>
            {c.permite_recuperacao && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Peso: Avaliação {(c.peso_avaliacao * 100).toFixed(0)}% | Recuperação {(c.peso_recuperacao * 100).toFixed(0)}%
              </div>
            )}
          </div>
        ))}
      </div>

      {configs.length === 0 && !criando && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Settings className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p>Nenhuma configuração de notas para {filtroAno}</p>
          {podeEditar && <p className="text-sm mt-1">Clique em &quot;Nova Configuração&quot; para definir as regras de notas de uma escola</p>}
        </div>
      )}
    </div>
  )
}
