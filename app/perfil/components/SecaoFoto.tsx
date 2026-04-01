'use client'

import { useRef } from 'react'
import { User, Camera, Loader2 } from 'lucide-react'

interface SecaoFotoProps {
  fotoUrl: string | null
  salvando: boolean
  onFotoChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRemoverFoto: () => void
}

export default function SecaoFoto({
  fotoUrl,
  salvando,
  onFotoChange,
  onRemoverFoto,
}: SecaoFotoProps) {
  const inputFotoRef = useRef<HTMLInputElement>(null)

  return (
    <div className="relative">
      <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center border-4 border-indigo-100 dark:border-indigo-900/50">
        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt="Foto de perfil"
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-16 h-16 text-gray-400 dark:text-gray-500" />
        )}
      </div>

      {/* Botão de upload */}
      <button
        onClick={() => inputFotoRef.current?.click()}
        disabled={salvando}
        className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-lg disabled:opacity-50"
        title="Alterar foto"
      >
        {salvando ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Camera className="w-5 h-5" />
        )}
      </button>
      <input
        ref={inputFotoRef}
        type="file"
        accept="image/*"
        onChange={onFotoChange}
        className="hidden"
      />

      {/* Botão remover foto */}
      {fotoUrl && (
        <button
          onClick={onRemoverFoto}
          disabled={salvando}
          className="mt-4 block text-sm text-red-600 hover:text-red-700 underline disabled:opacity-50"
        >
          Remover foto
        </button>
      )}
    </div>
  )
}
