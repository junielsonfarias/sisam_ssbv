'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import { Settings, Save, Loader2, CheckCircle2, XCircle, GripVertical } from 'lucide-react'
import { useUserType } from '@/lib/hooks/useUserType'

interface ModuloTecnico {
  id: string
  modulo_key: string
  modulo_label: string
  habilitado: boolean
  ordem: number
}

export default function ModulosTecnicoPage() {
  const { tipoUsuario } = useUserType()
  const [modulos, setModulos] = useState<ModuloTecnico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null)

  useEffect(() => {
    carregarModulos()
  }, [])

  const carregarModulos = async () => {
    try {
      setCarregando(true)
      setMensagem(null)
      const response = await fetch('/api/admin/modulos-tecnico')
      
      if (!response.ok) {
        const errorData = await response.json()
        setMensagem({ tipo: 'erro', texto: errorData.mensagem || 'Erro ao carregar módulos' })
        setModulos([])
        return
      }
      
      const data = await response.json()
      
      if (Array.isArray(data) && data.length > 0) {
        setModulos(data)
      } else if (Array.isArray(data)) {
        setModulos([])
        setMensagem({ tipo: 'erro', texto: 'Nenhum módulo encontrado no banco de dados' })
      } else {
        setModulos([])
        setMensagem({ tipo: 'erro', texto: 'Formato de resposta inválido' })
      }
    } catch (error: any) {
      console.error('Erro ao carregar módulos:', error)
      setMensagem({ tipo: 'erro', texto: `Erro ao carregar módulos: ${error.message || 'Erro desconhecido'}` })
      setModulos([])
    } finally {
      setCarregando(false)
    }
  }

  const toggleModulo = (moduloKey: string) => {
    setModulos((prev) =>
      prev.map((modulo) =>
        modulo.modulo_key === moduloKey
          ? { ...modulo, habilitado: !modulo.habilitado }
          : modulo
      )
    )
  }

  const salvarModulos = async () => {
    try {
      setSalvando(true)
      setMensagem(null)

      const response = await fetch('/api/admin/modulos-tecnico', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ modulos }),
      })

      const data = await response.json()

      if (response.ok) {
        setModulos(data)
        setMensagem({ tipo: 'sucesso', texto: 'Módulos salvos com sucesso!' })
        setTimeout(() => setMensagem(null), 3000)
      } else {
        setMensagem({ tipo: 'erro', texto: data.mensagem || 'Erro ao salvar módulos' })
      }
    } catch (error) {
      console.error('Erro ao salvar módulos:', error)
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar módulos' })
    } finally {
      setSalvando(false)
    }
  }

  const temMudancas = modulos.some((modulo) => {
    // Comparar com estado inicial se necessário
    return true // Simplificado - sempre permite salvar
  })

  return (
    <ProtectedRoute tiposPermitidos={['administrador']}>
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Gerenciar Módulos para Técnico</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Configure quais módulos estarão disponíveis para usuários técnicos</p>
            </div>
          </div>

          {/* Mensagem de sucesso/erro */}
          {mensagem && (
            <div
              className={`p-4 rounded-lg flex items-center space-x-2 ${
                mensagem.tipo === 'sucesso'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {mensagem.tipo === 'sucesso' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span className="font-medium">{mensagem.texto}</span>
            </div>
          )}

          {/* Lista de Módulos */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            {carregando ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Carregando módulos...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-indigo-600" />
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">Módulos Disponíveis</h2>
                  </div>
                  <button
                    onClick={salvarModulos}
                    disabled={salvando || !temMudancas}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {salvando ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Alterações
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-2">
                  {modulos.map((modulo) => (
                    <div
                      key={modulo.id}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
                        modulo.habilitado
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <GripVertical className="w-5 h-5 text-gray-400" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{modulo.modulo_label}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Chave: {modulo.modulo_key}</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={modulo.habilitado}
                          onChange={() => toggleModulo(modulo.modulo_key)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                          {modulo.habilitado ? 'Habilitado' : 'Desabilitado'}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>

                {modulos.length === 0 && (
                  <div className="text-center py-12">
                    <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Nenhum módulo encontrado</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Informações */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Informações</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Módulos habilitados aparecerão no menu lateral para usuários técnicos</li>
              <li>Módulos desabilitados não estarão visíveis para técnicos</li>
              <li>Alterações são aplicadas imediatamente após salvar</li>
            </ul>
          </div>
        </div>
    </ProtectedRoute>
  )
}

