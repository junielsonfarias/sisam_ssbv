'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users, Star, Trash2, Plus, Phone, Mail, Fingerprint, Loader2 } from 'lucide-react'
import { useToast } from '@/components/toast'

interface ResponsavelDoAluno {
  vinculo_id: string
  responsavel_id: string
  nome: string
  cpf: string | null
  telefone: string | null
  email: string | null
  data_nascimento: string | null
  parentesco: string
  principal: boolean
  ativo: boolean
  usuario_id: string | null
}

const PARENTESCOS: { value: string; label: string }[] = [
  { value: 'mae', label: 'Mãe' },
  { value: 'pai', label: 'Pai' },
  { value: 'responsavel', label: 'Responsável' },
  { value: 'avo', label: 'Avô/Avó' },
  { value: 'tio', label: 'Tio(a)' },
  { value: 'irmao', label: 'Irmão(ã)' },
  { value: 'outro', label: 'Outro' },
]

function labelParentesco(p: string) {
  return PARENTESCOS.find(x => x.value === p)?.label || p
}

const FORM_VAZIO = { nome: '', parentesco: 'responsavel', cpf: '', telefone: '', email: '', principal: false }

export function ResponsaveisAluno({ alunoId }: { alunoId: string }) {
  const toast = useToast()
  const [lista, setLista] = useState<ResponsavelDoAluno[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({ ...FORM_VAZIO })
  const [salvando, setSalvando] = useState(false)
  const [podeEditar, setPodeEditar] = useState(true)

  useEffect(() => {
    try {
      const u = localStorage.getItem('usuario')
      if (u) setPodeEditar(JSON.parse(u).tipo_usuario !== 'polo')
    } catch { /* silencioso */ }
  }, [])

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch(`/api/admin/alunos/${alunoId}/responsaveis`)
      const data = await res.json()
      if (res.ok) setLista(data.responsaveis || [])
    } catch {
      // silencioso
    } finally {
      setCarregando(false)
    }
  }, [alunoId])

  useEffect(() => { carregar() }, [carregar])

  async function adicionar() {
    if (form.nome.trim().length < 3) {
      toast.error('Informe o nome do responsável (mín. 3 caracteres)')
      return
    }
    setSalvando(true)
    try {
      const res = await fetch(`/api/admin/alunos/${alunoId}/responsaveis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          parentesco: form.parentesco,
          cpf: form.cpf || null,
          telefone: form.telefone || null,
          email: form.email || null,
          principal: form.principal,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.mensagem || 'Erro ao vincular')
      toast.success('Responsável vinculado')
      setForm({ ...FORM_VAZIO })
      setMostrarForm(false)
      carregar()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function definirPrincipal(responsavelId: string) {
    try {
      const res = await fetch(`/api/admin/alunos/${alunoId}/responsaveis/${responsavelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ principal: true }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.mensagem || 'Erro') }
      carregar()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function remover(responsavelId: string, nome: string) {
    if (!confirm(`Remover o vínculo com ${nome}?`)) return
    try {
      const res = await fetch(`/api/admin/alunos/${alunoId}/responsaveis/${responsavelId}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.mensagem || 'Erro') }
      toast.success('Vínculo removido')
      carregar()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Responsáveis
          <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">(cadastro estruturado)</span>
        </h3>
        {podeEditar && !mostrarForm && (
          <button
            onClick={() => setMostrarForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        )}
      </div>

      {carregando ? (
        <div className="flex items-center justify-center py-6 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : lista.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
          Nenhum responsável estruturado vinculado. {podeEditar && 'Use "Adicionar" para cadastrar.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {lista.map((r) => (
            <li key={r.vinculo_id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 dark:border-slate-700 p-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{r.nome}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                    {labelParentesco(r.parentesco)}
                  </span>
                  {r.principal && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      <Star className="w-2.5 h-2.5 fill-current" /> Principal
                    </span>
                  )}
                  {r.usuario_id && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      Portal
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {r.cpf && <span className="inline-flex items-center gap-1"><Fingerprint className="w-3 h-3" /> {r.cpf}</span>}
                  {r.telefone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {r.telefone}</span>}
                  {r.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {r.email}</span>}
                </div>
              </div>
              {podeEditar && (
                <div className="flex items-center gap-1 shrink-0">
                  {!r.principal && (
                    <button
                      onClick={() => definirPrincipal(r.responsavel_id)}
                      title="Definir como contato principal"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => remover(r.responsavel_id, r.nome)}
                    title="Remover vínculo"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {podeEditar && mostrarForm && (
        <div className="mt-4 border-t border-gray-200 dark:border-slate-700 pt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome *</label>
              <input
                value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Parentesco</label>
              <select
                value={form.parentesco} onChange={e => setForm({ ...form, parentesco: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 px-3 py-2 text-sm"
              >
                {PARENTESCOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">CPF</label>
              <input
                value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} placeholder="Somente números"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Telefone</label>
              <input
                value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">E-mail</label>
              <input
                type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={form.principal} onChange={e => setForm({ ...form, principal: e.target.checked })} />
            Definir como contato principal
          </label>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setMostrarForm(false); setForm({ ...FORM_VAZIO }) }}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600"
            >
              Cancelar
            </button>
            <button
              onClick={adicionar}
              disabled={salvando}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {salvando ? 'Salvando...' : 'Vincular'}
            </button>
          </div>
        </div>
      )}

      <p className="mt-3 text-[10px] text-gray-400 dark:text-gray-500">
        Cadastro estruturado de responsáveis (independente dos campos de texto e do acesso ao portal).
      </p>
    </div>
  )
}
