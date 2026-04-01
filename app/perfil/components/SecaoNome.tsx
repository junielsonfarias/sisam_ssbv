'use client'

import { useState } from 'react'
import { Edit2, Check, X, Loader2 } from 'lucide-react'

interface SecaoNomeProps {
  nome: string
  onSalvar: (novoNome: string) => Promise<void>
  salvando: boolean
}

export default function SecaoNome({ nome, onSalvar, salvando }: SecaoNomeProps) {
  const [editando, setEditando] = useState(false)
  const [novoNome, setNovoNome] = useState(nome)

  const handleSalvar = async () => {
    await onSalvar(novoNome)
    setEditando(false)
  }

  const handleCancelar = () => {
    setEditando(false)
    setNovoNome(nome)
  }

  if (editando) {
    return (
      <div className="flex flex-col sm:flex-row gap-2 items-center">
        <input
          type="text"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-semibold w-full sm:w-auto"
          placeholder="Seu nome"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
          </button>
          <button
            onClick={handleCancelar}
            className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 justify-center sm:justify-start">
      <h2 className="text-2xl font-bold text-gray-800">{nome}</h2>
      <button
        onClick={() => setEditando(true)}
        className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
        title="Editar nome"
      >
        <Edit2 className="w-4 h-4" />
      </button>
    </div>
  )
}
