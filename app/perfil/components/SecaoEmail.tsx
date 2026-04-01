'use client'

import { useState } from 'react'
import { Mail, Edit2, Check, Eye, EyeOff, Loader2 } from 'lucide-react'

interface SecaoEmailProps {
  email: string
  onSalvar: (novoEmail: string, senhaAtual: string) => Promise<void>
  salvando: boolean
}

export default function SecaoEmail({ email, onSalvar, salvando }: SecaoEmailProps) {
  const [editando, setEditando] = useState(false)
  const [novoEmail, setNovoEmail] = useState(email)
  const [senhaParaEmail, setSenhaParaEmail] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const handleSalvar = async () => {
    await onSalvar(novoEmail, senhaParaEmail)
    setEditando(false)
    setSenhaParaEmail('')
  }

  const handleCancelar = () => {
    setEditando(false)
    setNovoEmail(email)
    setSenhaParaEmail('')
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Mail className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email de Acesso</p>
            {editando ? (
              <div className="mt-2 space-y-3">
                <input
                  type="email"
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  placeholder="Novo email"
                />
                <div className="relative">
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senhaParaEmail}
                    onChange={(e) => setSenhaParaEmail(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="Senha atual para confirmar"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSalvar}
                    disabled={salvando}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Salvar
                  </button>
                  <button
                    onClick={handleCancelar}
                    className="px-3 py-1.5 bg-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-800 font-medium mt-0.5">{email}</p>
            )}
          </div>
        </div>
        {!editando && (
          <button
            onClick={() => setEditando(true)}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Alterar email"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
