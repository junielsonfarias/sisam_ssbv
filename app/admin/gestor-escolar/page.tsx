'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { useToast } from '@/components/toast'
import { AbaPesquisarAluno } from './components/aba-pesquisar-aluno'

export default function GestorEscolarPage() {
  const toast = useToast()
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

  const podeEditar = tipoUsuario === 'admin' || tipoUsuario === 'tecnico'

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola', 'polo']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <Search className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Pesquisar Aluno</h1>
              <p className="text-sm opacity-90">Busque por nome, código ou CPF para visualizar dados e matricular</p>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
          <div className="p-4 sm:p-6">
            <AbaPesquisarAluno
              podeEditar={podeEditar || tipoUsuario === 'escola'}
              tipoUsuario={tipoUsuario}
              escolaIdUsuario={escolaIdUsuario}
              toast={toast}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
