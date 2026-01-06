'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useState } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function TecnicoImportarPage() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [erro, setErro] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setArquivo(file)
        setErro('')
        setResultado(null)
      } else {
        setErro('Por favor, selecione um arquivo Excel (.xlsx ou .xls)')
        setArquivo(null)
      }
    }
  }

  const handleUpload = async () => {
    if (!arquivo) {
      setErro('Por favor, selecione um arquivo')
      return
    }

    setCarregando(true)
    setErro('')
    setResultado(null)

    try {
      const formData = new FormData()
      formData.append('arquivo', arquivo)

      const response = await fetch('/api/admin/importar', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setErro(data.mensagem || 'Erro ao importar arquivo')
        setCarregando(false)
        return
      }

      setResultado(data)
      setArquivo(null)
      const fileInput = document.getElementById('arquivo') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } catch (error) {
      setErro('Erro ao conectar com o servidor')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <ProtectedRoute tiposPermitidos={['tecnico']}>
      <LayoutDashboard tipoUsuario="tecnico">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">Importar Dados</h1>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                Carregar Arquivo Excel
              </h2>

              <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-8 text-center">
                <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <input
                  id="arquivo"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="arquivo"
                  className="cursor-pointer inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Upload className="w-5 h-5 inline-block mr-2" />
                  Selecionar Arquivo
                </label>
                {arquivo && (
                  <p className="mt-4 text-gray-700 dark:text-gray-300">
                    Arquivo selecionado: <strong>{arquivo.name}</strong>
                  </p>
                )}
              </div>
            </div>

            {erro && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center">
                <XCircle className="w-5 h-5 mr-2" />
                {erro}
              </div>
            )}

            {resultado && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                <div className="flex items-center mb-2">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <strong>Importação concluída com sucesso!</strong>
                </div>
                <div className="ml-7 space-y-1 text-sm">
                  <p>Total de linhas: {resultado.total_linhas}</p>
                  <p>Linhas processadas: {resultado.linhas_processadas}</p>
                  {resultado.linhas_com_erro > 0 && (
                    <p className="text-orange-600">
                      Linhas com erro: {resultado.linhas_com_erro}
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!arquivo || carregando}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {carregando ? 'Importando...' : 'Importar Dados'}
            </button>
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

