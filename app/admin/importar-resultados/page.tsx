'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useState } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function ImportarResultadosPage() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [anoLetivo, setAnoLetivo] = useState<string>(new Date().getFullYear().toString())
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
      formData.append('ano_letivo', anoLetivo)

      const response = await fetch('/api/admin/importar-resultados', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setErro(data.mensagem || 'Erro ao importar resultados')
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
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <LayoutDashboard tipoUsuario="admin">
        <div className="p-3 sm:p-4 md:p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6 md:mb-8">Importar Resultados das Provas</h1>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
                Carregar Arquivo Excel com Resultados
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-3 sm:mb-4">
                Esta funcionalidade importa os resultados das provas. Cada linha do arquivo representa um aluno.
                As questões Q1 a Q60 serão processadas automaticamente.
              </p>

              <div className="mb-3 sm:mb-4">
                <label htmlFor="ano_letivo" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Ano Letivo
                </label>
                <input
                  id="ano_letivo"
                  type="text"
                  value={anoLetivo}
                  onChange={(e) => setAnoLetivo(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ex: 2024"
                />
                <p className="text-xs text-gray-500 mt-1">Ano letivo ao qual se referem os dados</p>
              </div>

              <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-4 sm:p-6 md:p-8 text-center">
                <FileSpreadsheet className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
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
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                <XCircle className="w-5 h-5 mr-2" />
                {erro}
              </div>
            )}

            {resultado && (
              <div className="mb-6 space-y-4">
                {resultado.linhas_processadas > 0 ? (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <strong>Resultados importados com sucesso!</strong>
                    </div>
                    <div className="ml-7 space-y-1 text-sm">
                      <p>Total de alunos processados: {resultado.linhas_processadas}</p>
                      <p>Total de questões importadas: {resultado.total_questoes_importadas || resultado.linhas_processadas * 60}</p>
                      {resultado.linhas_com_erro > 0 && (
                        <p className="text-orange-600">
                          Linhas com erro: {resultado.linhas_com_erro}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    <div className="flex items-center mb-2">
                      <XCircle className="w-5 h-5 mr-2" />
                      <strong>Nenhuma linha foi processada!</strong>
                    </div>
                    <div className="ml-7 space-y-1 text-sm">
                      <p>Total de linhas: {resultado.total_linhas}</p>
                      <p className="font-semibold">Linhas com erro: {resultado.linhas_com_erro}</p>
                    </div>
                  </div>
                )}

                {resultado.ano_letivo && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Ano Letivo:</strong> {resultado.ano_letivo}
                    </p>
                  </div>
                )}

                {resultado.erros && resultado.erros.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="font-semibold text-yellow-800 mb-2">Primeiros Erros Encontrados:</p>
                    <div className="max-h-60 overflow-y-auto text-sm">
                      {resultado.erros.map((erro: string, index: number) => (
                        <p key={index} className="text-yellow-700 mb-1">{erro}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!arquivo || carregando}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {carregando ? 'Importando Resultados...' : 'Importar Resultados'}
            </button>

            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Instruções:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>O arquivo deve conter as colunas: <strong>ESCOLA</strong>, <strong>ALUNO</strong>, <strong>TURMA</strong>, <strong>ANO/SÉRIE</strong></li>
                    <li>As questões devem estar nas colunas <strong>Q1</strong> a <strong>Q60</strong> com valores 0 ou 1</li>
                    <li>Certifique-se de que as escolas já foram cadastradas (use "Importar Cadastros" primeiro)</li>
                    <li>Cada linha do arquivo representa um aluno e será convertida em 60 registros de questões</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

