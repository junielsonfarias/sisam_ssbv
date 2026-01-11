'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import { Search, School, MapPin } from 'lucide-react'

interface Escola {
  id: string
  nome: string
  codigo: string | null
  polo_id: string
  endereco?: string
  telefone?: string
  email?: string
  ativo: boolean
}

export default function EscolasPoloPage() {
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [poloNome, setPoloNome] = useState('')

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      // Carregar escolas do polo
      const escolasRes = await fetch('/api/polo/escolas')
      const escolasData = await escolasRes.json()

      if (Array.isArray(escolasData)) {
        setEscolas(escolasData)
      }

      // Carregar nome do polo
      const userRes = await fetch('/api/auth/verificar')
      const userData = await userRes.json()
      if (userData.usuario?.polo_nome) {
        setPoloNome(userData.usuario.polo_nome)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setCarregando(false)
    }
  }

  const escolasFiltradas = escolas.filter(
    (e) =>
      e.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (e.codigo && e.codigo.toLowerCase().includes(busca.toLowerCase()))
  )

  return (
    <ProtectedRoute tiposPermitidos={['polo']}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <School className="w-7 h-7 text-indigo-600" />
              Escolas do Polo
            </h1>
            {poloNome && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {poloNome}
              </p>
            )}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {escolas.length} escola(s) vinculada(s)
          </div>
        </div>

        {/* Barra de busca */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar escola por nome ou codigo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Lista de escolas */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          {carregando ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : escolasFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <School className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {busca ? 'Nenhuma escola encontrada com esse termo' : 'Nenhuma escola vinculada ao polo'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase">
                      Nome
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase hidden sm:table-cell">
                      Codigo
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase hidden md:table-cell">
                      Endereco
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase hidden lg:table-cell">
                      Telefone
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {escolasFiltradas.map((escola) => (
                    <tr key={escola.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                            <School className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{escola.nome}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">
                              {escola.codigo || 'Sem codigo'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300 hidden sm:table-cell">
                        {escola.codigo || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300 hidden md:table-cell">
                        {escola.endereco || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300 hidden lg:table-cell">
                        {escola.telefone || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            escola.ativo
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                          }`}
                        >
                          {escola.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
