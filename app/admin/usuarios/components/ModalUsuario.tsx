'use client'

import { X, Trash2, UserX } from 'lucide-react'
import { TipoUsuario } from '@/lib/types'

interface Usuario {
  id: string
  nome: string
  email: string
  tipo_usuario: TipoUsuario
  polo_id: string | null
  escola_id: string | null
  ativo: boolean
}

interface Polo {
  id: string
  nome: string
}

interface Escola {
  id: string
  nome: string
  polo_id: string
}

interface FormData {
  nome: string
  email: string
  senha: string
  tipo_usuario: TipoUsuario
  polo_id: string
  escola_id: string
  ativo: boolean
  acesso_sisam: boolean
  acesso_gestor: boolean
}

interface ModalUsuarioProps {
  mostrar: boolean
  usuarioEditando: Usuario | null
  formData: FormData
  setFormData: (data: FormData) => void
  polos: Polo[]
  escolasFiltradas: Escola[]
  salvando: boolean
  onClose: () => void
  onSalvar: () => void
}

export default function ModalUsuario({
  mostrar, usuarioEditando, formData, setFormData,
  polos, escolasFiltradas, salvando,
  onClose, onSalvar,
}: ModalUsuarioProps) {
  if (!mostrar) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500/75 dark:bg-gray-900/75" onClick={onClose}></div>
        <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {usuarioEditando ? 'Editar Usuario' : 'Novo Usuario'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-slate-700"
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-slate-700"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {usuarioEditando ? 'Nova Senha (opcional)' : 'Senha *'}
                </label>
                <input
                  type="password"
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-slate-700"
                  placeholder={usuarioEditando ? 'Deixe vazio para manter' : 'Minimo 12 caracteres (letra + numero)'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Usuario *</label>
                <select
                  value={formData.tipo_usuario}
                  onChange={(e) => setFormData({ ...formData, tipo_usuario: e.target.value as TipoUsuario, polo_id: '', escola_id: '' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-slate-700"
                >
                  <option value="escola">Escola</option>
                  <option value="polo">Polo</option>
                  <option value="tecnico">Tecnico</option>
                  <option value="administrador">Administrador</option>
                  <option value="professor">Professor</option>
                  <option value="editor">Editor de Noticias</option>
                  <option value="publicador">Publicador</option>
                  <option value="responsavel">Responsavel</option>
                </select>
              </div>

              {formData.tipo_usuario === 'polo' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Polo *</label>
                  <select
                    value={formData.polo_id}
                    onChange={(e) => setFormData({ ...formData, polo_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-slate-700"
                  >
                    <option value="">Selecione um polo</option>
                    {polos.map((polo) => (
                      <option key={polo.id} value={polo.id}>
                        {polo.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.tipo_usuario === 'escola' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Polo (opcional)</label>
                    <select
                      value={formData.polo_id}
                      onChange={(e) => setFormData({ ...formData, polo_id: e.target.value, escola_id: '' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-slate-700"
                    >
                      <option value="">Todos os polos</option>
                      {polos.map((polo) => (
                        <option key={polo.id} value={polo.id}>
                          {polo.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Escola *</label>
                    <select
                      value={formData.escola_id}
                      onChange={(e) => setFormData({ ...formData, escola_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-slate-700"
                    >
                      <option value="">Selecione uma escola</option>
                      {escolasFiltradas.map((escola) => (
                        <option key={escola.id} value={escola.id}>
                          {escola.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Acesso aos Modulos */}
              <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg space-y-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Acesso aos Modulos</span>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">SISAM</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Avaliacoes diagnosticas</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, acesso_sisam: !formData.acesso_sisam })}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      formData.acesso_sisam ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.acesso_sisam ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Gestor Escolar</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Gestao academica completa</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, acesso_gestor: !formData.acesso_gestor })}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                      formData.acesso_gestor ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.acesso_gestor ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>

              {usuarioEditando && (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status do usuario</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formData.ativo ? 'Usuario pode acessar o sistema' : 'Usuario bloqueado'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, ativo: !formData.ativo })}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      formData.ativo ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.ativo ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={onSalvar}
                  disabled={salvando || !formData.nome || !formData.email || (!usuarioEditando && !formData.senha)}
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

// Modal de exclusao separado
interface ModalExcluirUsuarioProps {
  mostrar: boolean
  usuario: { id: string; nome: string } | null
  excluindo: boolean
  onClose: () => void
  onExcluir: (hardDelete: boolean) => void
}

export function ModalExcluirUsuario({
  mostrar, usuario, excluindo, onClose, onExcluir,
}: ModalExcluirUsuarioProps) {
  if (!mostrar || !usuario) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500/75 dark:bg-gray-900/75" onClick={onClose}></div>
        <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          <div className="px-6 py-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Excluir Usuario
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {usuario.nome}
                </p>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Escolha uma opcao para este usuario:
            </p>

            <div className="space-y-3">
              <button
                onClick={() => onExcluir(false)}
                disabled={excluindo}
                className="w-full px-4 py-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg text-left hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <UserX className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <div>
                    <span className="font-medium text-yellow-800 dark:text-yellow-200">Desativar</span>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">O usuario nao podera mais fazer login, mas os dados serao mantidos</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => onExcluir(true)}
                disabled={excluindo}
                className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-left hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <div>
                    <span className="font-medium text-red-800 dark:text-red-200">Excluir permanentemente</span>
                    <p className="text-xs text-red-600 dark:text-red-400">Remove o usuario completamente. Esta acao nao pode ser desfeita!</p>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
