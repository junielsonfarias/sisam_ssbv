'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import { BookOpen, Plus, Edit, Trash2, Save, X, Calendar, Settings } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// ============================================
// Tipos
// ============================================

interface Disciplina {
  id: string
  nome: string
  codigo: string | null
  abreviacao: string | null
  ordem: number
  ativo: boolean
}

interface Periodo {
  id: string
  nome: string
  tipo: string
  numero: number
  ano_letivo: string
  data_inicio: string | null
  data_fim: string | null
  ativo: boolean
}

interface ConfiguracaoNotas {
  id: string
  escola_id: string
  ano_letivo: string
  tipo_periodo: string
  nota_maxima: number
  media_aprovacao: number
  media_recuperacao: number
  peso_avaliacao: number
  peso_recuperacao: number
  permite_recuperacao: boolean
  escola_nome?: string
}

interface EscolaSimples {
  id: string
  nome: string
}

type Aba = 'disciplinas' | 'periodos' | 'configuracao'

// ============================================
// Componente Principal
// ============================================

export default function GestorEscolarPage() {
  const toast = useToast()
  const [abaAtiva, setAbaAtiva] = useState<Aba>('disciplinas')
  const [tipoUsuario, setTipoUsuario] = useState<string>('')
  const [escolaIdUsuario, setEscolaIdUsuario] = useState<string>('')

  useEffect(() => {
    fetch('/api/auth/verificar')
      .then(r => r.json())
      .then(data => {
        if (data.usuario) {
          const tipo = data.usuario.tipo_usuario === 'administrador' ? 'admin' : data.usuario.tipo_usuario
          setTipoUsuario(tipo)
          if (data.usuario.escola_id) setEscolaIdUsuario(data.usuario.escola_id)
        }
      })
      .catch(() => {})
  }, [])

  const abas: { id: Aba; label: string; icon: any }[] = [
    { id: 'disciplinas', label: 'Disciplinas', icon: BookOpen },
    { id: 'periodos', label: 'Períodos Letivos', icon: Calendar },
    { id: 'configuracao', label: 'Configuração de Notas', icon: Settings },
  ]

  const podeEditar = tipoUsuario === 'admin' || tipoUsuario === 'tecnico'

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Gestor Escolar</h1>
              <p className="text-sm opacity-90">Disciplinas, períodos letivos e configuração de notas</p>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-slate-700">
            {abas.map(aba => {
              const Icon = aba.icon
              return (
                <button
                  key={aba.id}
                  onClick={() => setAbaAtiva(aba.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors
                    ${abaAtiva === aba.id
                      ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{aba.label}</span>
                </button>
              )
            })}
          </div>

          <div className="p-4 sm:p-6">
            {abaAtiva === 'disciplinas' && (
              <AbaDisciplinas podeEditar={podeEditar} toast={toast} />
            )}
            {abaAtiva === 'periodos' && (
              <AbaPeriodos podeEditar={podeEditar} toast={toast} />
            )}
            {abaAtiva === 'configuracao' && (
              <AbaConfiguracaoNotas
                podeEditar={podeEditar || tipoUsuario === 'escola'}
                tipoUsuario={tipoUsuario}
                escolaIdUsuario={escolaIdUsuario}
                toast={toast}
              />
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

// ============================================
// Aba: Disciplinas
// ============================================

function AbaDisciplinas({ podeEditar, toast }: { podeEditar: boolean; toast: any }) {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ nome: '', codigo: '', abreviacao: '', ordem: 0, ativo: true })

  const carregarDisciplinas = async () => {
    try {
      const res = await fetch('/api/admin/disciplinas-escolares?ativas=false')
      if (res.ok) setDisciplinas(await res.json())
    } catch (e) {
      toast.error('Erro ao carregar disciplinas')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregarDisciplinas() }, [])

  const iniciarEdicao = (d: Disciplina) => {
    setEditando(d.id)
    setCriando(false)
    setForm({ nome: d.nome, codigo: d.codigo || '', abreviacao: d.abreviacao || '', ordem: d.ordem, ativo: d.ativo })
  }

  const iniciarCriacao = () => {
    setCriando(true)
    setEditando(null)
    setForm({ nome: '', codigo: '', abreviacao: '', ordem: disciplinas.length + 1, ativo: true })
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
      const res = await fetch('/api/admin/disciplinas-escolares', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(criando ? 'Disciplina criada!' : 'Disciplina atualizada!')
        cancelar()
        await carregarDisciplinas()
      } else {
        toast.error(data.mensagem || 'Erro ao salvar')
      }
    } catch (e) {
      toast.error('Erro ao salvar disciplina')
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta disciplina?')) return
    try {
      const res = await fetch(`/api/admin/disciplinas-escolares?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Disciplina excluída!')
        await carregarDisciplinas()
      } else {
        toast.error(data.mensagem || 'Erro ao excluir')
      }
    } catch (e) {
      toast.error('Erro ao excluir disciplina')
    }
  }

  if (carregando) return <LoadingSpinner text="Carregando disciplinas..." centered />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Disciplinas Escolares</h2>
        {podeEditar && !criando && (
          <button
            onClick={iniciarCriacao}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Disciplina
          </button>
        )}
      </div>

      {/* Formulário de criação */}
      {criando && (
        <FormDisciplina
          form={form}
          setForm={setForm}
          onSalvar={salvar}
          onCancelar={cancelar}
          salvando={salvando}
          titulo="Nova Disciplina"
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Ordem</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Nome</th>
              <th className="hidden sm:table-cell text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Código</th>
              <th className="hidden sm:table-cell text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Abreviação</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
              {podeEditar && (
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {disciplinas.map(d => (
              <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                {editando === d.id ? (
                  <td colSpan={podeEditar ? 6 : 5} className="p-2">
                    <FormDisciplina
                      form={form}
                      setForm={setForm}
                      onSalvar={salvar}
                      onCancelar={cancelar}
                      salvando={salvando}
                      titulo="Editar Disciplina"
                      inline
                    />
                  </td>
                ) : (
                  <>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{d.ordem}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{d.nome}</td>
                    <td className="hidden sm:table-cell py-3 px-4 text-sm text-gray-500 dark:text-gray-400 font-mono">{d.codigo || '-'}</td>
                    <td className="hidden sm:table-cell py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{d.abreviacao || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        d.ativo
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {d.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    {podeEditar && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => iniciarEdicao(d)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg" title="Editar">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => excluir(d.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
            {disciplinas.length === 0 && (
              <tr>
                <td colSpan={podeEditar ? 6 : 5} className="py-8 text-center text-gray-500 dark:text-gray-400">
                  Nenhuma disciplina cadastrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FormDisciplina({
  form,
  setForm,
  onSalvar,
  onCancelar,
  salvando,
  titulo,
  inline = false,
}: {
  form: { nome: string; codigo: string; abreviacao: string; ordem: number; ativo: boolean }
  setForm: (f: any) => void
  onSalvar: () => void
  onCancelar: () => void
  salvando: boolean
  titulo: string
  inline?: boolean
}) {
  return (
    <div className={`${inline ? '' : 'bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4'} space-y-3`}>
      {!inline && <h3 className="font-medium text-gray-800 dark:text-white">{titulo}</h3>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <input
          type="text"
          placeholder="Nome *"
          value={form.nome}
          onChange={e => setForm({ ...form, nome: e.target.value })}
          className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
        <input
          type="text"
          placeholder="Código (ex: LP)"
          value={form.codigo}
          onChange={e => setForm({ ...form, codigo: e.target.value })}
          className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
        <input
          type="text"
          placeholder="Abreviação"
          value={form.abreviacao}
          onChange={e => setForm({ ...form, abreviacao: e.target.value })}
          className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
        <input
          type="number"
          placeholder="Ordem"
          value={form.ordem}
          onChange={e => setForm({ ...form, ordem: parseInt(e.target.value) || 0 })}
          className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={e => setForm({ ...form, ativo: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600"
            />
            Ativa
          </label>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSalvar}
          disabled={salvando}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 text-sm transition-colors"
        >
          <Save className="w-4 h-4" />
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          onClick={onCancelar}
          className="flex items-center gap-2 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 text-sm transition-colors"
        >
          <X className="w-4 h-4" />
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ============================================
// Aba: Períodos Letivos
// ============================================

function AbaPeriodos({ podeEditar, toast }: { podeEditar: boolean; toast: any }) {
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
                    <p className="text-sm mt-1">Clique em "Gerar Bimestres" para criar os 4 bimestres automaticamente</p>
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
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} className="rounded border-gray-300 text-indigo-600" />
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

// ============================================
// Aba: Configuração de Notas
// ============================================

function AbaConfiguracaoNotas({
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

  useEffect(() => { carregarDados() }, [filtroAno])

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
                <p className="text-xs text-gray-500 dark:text-gray-400">Ano: {c.ano_letivo} | Tipo: {c.tipo_periodo}</p>
              </div>
              {podeEditar && (
                <button onClick={() => iniciarEdicao(c)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg" title="Editar">
                  <Edit className="w-4 h-4" />
                </button>
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
          {podeEditar && <p className="text-sm mt-1">Clique em "Nova Configuração" para definir as regras de notas de uma escola</p>}
        </div>
      )}
    </div>
  )
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
            onChange={e => setForm({ ...form, nota_maxima: parseFloat(e.target.value) || 10 })}
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
            onChange={e => setForm({ ...form, media_aprovacao: parseFloat(e.target.value) || 6 })}
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
            onChange={e => setForm({ ...form, media_recuperacao: parseFloat(e.target.value) || 5 })}
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
                  const val = parseFloat(e.target.value) || 0.6
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
                  const val = parseFloat(e.target.value) || 0.4
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
