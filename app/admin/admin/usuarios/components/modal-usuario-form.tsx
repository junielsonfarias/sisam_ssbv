'use client'

import { useState } from 'react'
import { X, Eye, EyeOff, RefreshCw } from 'lucide-react'
import type { TipoUsuario } from '@/lib/types'
import { gerarSenhaForte } from '@/lib/utils/gerar-senha'
import { Escola, FormDataUsuario, Polo, Usuario } from './types'
import { ToggleModulo } from './toggle-modulo'

interface Props {
  aberto: boolean
  usuarioEditando: Usuario | null
  form: FormDataUsuario
  polos: Polo[]
  escolas: Escola[]
  salvando: boolean
  onChange: (form: FormDataUsuario) => void
  onFechar: () => void
  onSalvar: () => void
}

export function ModalUsuarioForm({
  aberto, usuarioEditando, form, polos, escolas, salvando, onChange, onFechar, onSalvar,
}: Props) {
  const [mostrarSenha, setMostrarSenha] = useState(false)

  if (!aberto) return null

  const set = (patch: Partial<FormDataUsuario>) => onChange({ ...form, ...patch })

  const escolasFiltradas = form.tipo_usuario === 'escola' && form.polo_id
    ? escolas.filter((e) => e.polo_id === form.polo_id)
    : escolas

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-slate-700'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-usuario-titulo">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500/75 dark:bg-gray-900/75" onClick={onFechar}></div>
        <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-6">
              <h3 id="modal-usuario-titulo" className="text-xl font-bold text-gray-900 dark:text-white">
                {usuarioEditando ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button onClick={onFechar} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300" aria-label="Fechar modal">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
                <input type="text" value={form.nome} onChange={(e) => set({ nome: e.target.value })} className={inputCls} placeholder="Nome completo" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} className={inputCls} placeholder="email@exemplo.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {usuarioEditando ? 'Nova Senha (opcional)' : 'Senha *'}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      value={form.senha}
                      onChange={(e) => set({ senha: e.target.value })}
                      className={`${inputCls} pr-10`}
                      placeholder={usuarioEditando ? 'Deixe vazio para manter' : 'Mínimo 12 caracteres'}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => { set({ senha: gerarSenhaForte() }); setMostrarSenha(true) }}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors whitespace-nowrap"
                    title="Gerar senha forte"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Gerar
                  </button>
                </div>
                {mostrarSenha && form.senha && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    Copie e repasse esta senha ao usuário — ela não será exibida depois.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Usuário *</label>
                <select
                  value={form.tipo_usuario}
                  onChange={(e) => {
                    const tipo = e.target.value as TipoUsuario
                    const gestorDefault = tipo === 'administrador' || tipo === 'tecnico'
                    set({ tipo_usuario: tipo, polo_id: '', escola_id: '', acesso_gestor: gestorDefault })
                  }}
                  className={inputCls}
                >
                  <option value="escola">Escola</option>
                  <option value="polo">Polo</option>
                  <option value="tecnico">Técnico</option>
                  <option value="administrador">Administrador</option>
                  <option value="professor">Professor</option>
                  <option value="editor">Editor de Notícias</option>
                  <option value="publicador">Publicador</option>
                  <option value="responsavel">Responsável</option>
                </select>
              </div>

              {form.tipo_usuario === 'polo' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Polo *</label>
                  <select value={form.polo_id} onChange={(e) => set({ polo_id: e.target.value })} className={inputCls}>
                    <option value="">Selecione um polo</option>
                    {polos.map((polo) => (
                      <option key={polo.id} value={polo.id}>{polo.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              {form.tipo_usuario === 'escola' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Polo (opcional)</label>
                    <select value={form.polo_id} onChange={(e) => set({ polo_id: e.target.value, escola_id: '' })} className={inputCls}>
                      <option value="">Todos os polos</option>
                      {polos.map((polo) => (
                        <option key={polo.id} value={polo.id}>{polo.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Escola *</label>
                    <select value={form.escola_id} onChange={(e) => set({ escola_id: e.target.value })} className={inputCls}>
                      <option value="">Selecione uma escola</option>
                      {escolasFiltradas.map((escola) => (
                        <option key={escola.id} value={escola.id}>{escola.nome}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg space-y-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Acesso aos Modulos</span>
                <ToggleModulo titulo="SISAM" descricao="Avaliacoes diagnosticas" checked={form.acesso_sisam} ariaLabel="Acesso ao módulo SISAM" cor="indigo" onChange={() => set({ acesso_sisam: !form.acesso_sisam })} />
                <ToggleModulo titulo="Gestor Escolar" descricao="Gestao academica completa" checked={form.acesso_gestor} ariaLabel="Acesso ao módulo Gestor" cor="emerald" onChange={() => set({ acesso_gestor: !form.acesso_gestor })} />
                <ToggleModulo titulo="SEMED" descricao="Programas federais + recursos" checked={form.acesso_semed} ariaLabel="Acesso ao módulo SEMED" cor="amber" onChange={() => set({ acesso_semed: !form.acesso_semed })} />
                <ToggleModulo titulo="Transparência" descricao="Site, notícias, ouvidoria" checked={form.acesso_transparencia} ariaLabel="Acesso ao módulo Transparência" cor="sky" onChange={() => set({ acesso_transparencia: !form.acesso_transparencia })} />
                <ToggleModulo titulo="Administração" descricao="Backup, segurança, LGPD, logs" checked={form.acesso_admin} ariaLabel="Acesso ao módulo Admin" cor="slate" onChange={() => set({ acesso_admin: !form.acesso_admin })} />
              </div>

              {usuarioEditando && (
                <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <ToggleModulo
                    titulo="Status do usuário"
                    descricao={form.ativo ? 'Usuário pode acessar o sistema' : 'Usuário bloqueado'}
                    checked={form.ativo}
                    ariaLabel="Usuário ativo"
                    cor="green"
                    onChange={() => set({ ativo: !form.ativo })}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={onFechar}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={onSalvar}
                  disabled={salvando || !form.nome || !form.email || (!usuarioEditando && !form.senha)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
