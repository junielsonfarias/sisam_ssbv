'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Save, X, Calendar } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Periodo } from './types'

function FormPeriodo({
  form,
  setForm,
  onSalvar,
  onCancelar,
  salvando,
}: {
  form: { nome: string; tipo: string; numero: number; ano_letivo: string; data_inicio: string; data_fim: string; ativo: boolean }
  setForm: (f: any) => void
  onSalvar: () => void
  onCancelar: () => void
  salvando: boolean
}) {
  return (
    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input
          type="text"
          placeholder="Nome (ex: 1º Bimestre) *"
          value={form.nome}
          onChange={e => setForm({ ...form, nome: e.target.value })}
          className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
        <select
          value={form.tipo}
          onChange={e => setForm({ ...form, tipo: e.target.value })}
          className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        >
          <option value="bimestre">Bimestre</option>
          <option value="trimestre">Trimestre</option>
          <option value="semestre">Semestre</option>
          <option value="anual">Anual</option>
        </select>
        <input
          type="number"
          placeholder="Número"
          value={form.numero}
          onChange={e => setForm({ ...form, numero: parseInt(e.target.value) || 1 })}
          min={1}
          max={4}
          className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
        <input
          type="text"
          placeholder="Ano Letivo"
          value={form.ano_letivo}
          onChange={e => setForm({ ...form, ano_letivo: e.target.value })}
          className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="date"
          value={form.data_inicio}
          onChange={e => setForm({ ...form, data_inicio: e.target.value })}
          className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
        <input
          type="date"
          value={form.data_fim}
          onChange={e => setForm({ ...form, data_fim: e.target.value })}
          className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
        <label className="flex items-center gap-2 min-h-[44px] text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-indigo-600" />
          Ativo
        </label>
      </div>
      <div className="flex gap-2">
        <button onClick={onSalvar} disabled={salvando} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 text-sm">
          <Save className="w-4 h-4" />{salvando ? 'Salvando...' : 'Salvar'}
        </button>
        <button onClick={onCancelar} className="flex items-center gap-2 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 text-sm">
          <X className="w-4 h-4" />Cancelar
        </button>
      </div>
    </div>
  )
}

export function AbaPeriodos({ podeEditar, toast }: { podeEditar: boolean; toast: any }) {
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString())
  const [form, setForm] = useState({
    nome: '', tipo: 'bimestre', numero: 1, ano_letivo: new Date().getFullYear().toString(),
    data_inicio: '', data_fim: '', ativo: true,
  })

  const carregarPeriodos = async () => {
    try {
      const url = filtroAno
        ? `/api/admin/periodos-letivos?ano_letivo=${filtroAno}`
        : '/api/admin/periodos-letivos'
      const res = await fetch(url)
      if (res.ok) setPeriodos(await res.json())
    } catch (e) {
      toast.error('Erro ao carregar períodos')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregarPeriodos() }, [filtroAno])

  const iniciarCriacao = () => {
    setCriando(true)
    setEditando(null)
    setForm({
      nome: '', tipo: 'bimestre', numero: 1, ano_letivo: filtroAno || new Date().getFullYear().toString(),
      data_inicio: '', data_fim: '', ativo: true,
    })
  }

  const iniciarEdicao = (p: Periodo) => {
    setEditando(p.id)
    setCriando(false)
    setForm({
      nome: p.nome, tipo: p.tipo, numero: p.numero, ano_letivo: p.ano_letivo,
      data_inicio: p.data_inicio || '', data_fim: p.data_fim || '', ativo: p.ativo,
    })
  }

  const cancelar = () => {
    setEditando(null)
    setCriando(false)
  }

  const salvar = async () => {
    if (!form.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    setSalvando(true)
    try {
      const method = criando ? 'POST' : 'PUT'
      const body = criando ? form : { ...form, id: editando }
      const res = await fetch('/api/admin/periodos-letivos', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(criando ? 'Período criado!' : 'Período atualizado!')
        cancelar()
        await carregarPeriodos()
      } else {
        toast.error(data.mensagem || 'Erro ao salvar')
      }
    } catch (e) {
      toast.error('Erro ao salvar período')
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este período?')) return
    try {
      const res = await fetch(`/api/admin/periodos-letivos?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Período excluído!')
        await carregarPeriodos()
      } else {
        toast.error(data.mensagem || 'Erro ao excluir')
      }
    } catch (e) {
      toast.error('Erro ao excluir período')
    }
  }

  // Gerar períodos automaticamente
  const gerarPeriodos = async () => {
    const ano = filtroAno || new Date().getFullYear().toString()
    const bimestres = [
      { nome: `1º Bimestre`, numero: 1 },
      { nome: `2º Bimestre`, numero: 2 },
      { nome: `3º Bimestre`, numero: 3 },
      { nome: `4º Bimestre`, numero: 4 },
    ]

    let criados = 0
    for (const bim of bimestres) {
      try {
        const res = await fetch('/api/admin/periodos-letivos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: bim.nome,
            tipo: 'bimestre',
            numero: bim.numero,
            ano_letivo: ano,
            ativo: true,
          }),
        })
        if (res.ok) criados++
      } catch (e) {
        // ignora erros de duplicidade
      }
    }

    if (criados > 0) {
      toast.success(`${criados} período(s) criado(s)!`)
      await carregarPeriodos()
    } else {
      toast.info('Todos os bimestres já existem para este ano')
    }
  }

  if (carregando) return <LoadingSpinner text="Carregando períodos..." centered />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Períodos Letivos</h2>
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
          {podeEditar && (
            <>
              <button
                onClick={gerarPeriodos}
                className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 text-sm transition-colors"
                title="Gerar 4 bimestres automaticamente"
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Gerar Bimestres</span>
              </button>
              <button
                onClick={iniciarCriacao}
                className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Novo</span>
              </button>
            </>
          )}
        </div>
      </div>

      {criando && (
        <FormPeriodo form={form} setForm={setForm} onSalvar={salvar} onCancelar={cancelar} salvando={salvando} />
      )}

      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Nº</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Nome</th>
              <th className="hidden sm:table-cell text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Tipo</th>
              <th className="hidden md:table-cell text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Início</th>
              <th className="hidden md:table-cell text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Fim</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
              {podeEditar && (
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {periodos.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                {editando === p.id ? (
                  <td colSpan={podeEditar ? 7 : 6} className="p-2">
                    <FormPeriodo form={form} setForm={setForm} onSalvar={salvar} onCancelar={cancelar} salvando={salvando} />
                  </td>
                ) : (
                  <>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{p.numero}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{p.nome}</td>
                    <td className="hidden sm:table-cell py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 capitalize">
                        {p.tipo}
                      </span>
                    </td>
                    <td className="hidden md:table-cell py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                      {p.data_inicio ? new Date(p.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="hidden md:table-cell py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                      {p.data_fim ? new Date(p.data_fim + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.ativo
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    {podeEditar && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => iniciarEdicao(p)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg" title="Editar">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => excluir(p.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
            {periodos.length === 0 && (
              <tr>
                <td colSpan={podeEditar ? 7 : 6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                  <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p>Nenhum período cadastrado para {filtroAno}</p>
                  {podeEditar && (
                    <p className="text-sm mt-1">Clique em &quot;Gerar Bimestres&quot; para criar os 4 bimestres automaticamente</p>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
