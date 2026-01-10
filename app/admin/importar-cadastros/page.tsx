'use client'

import ProtectedRoute from '@/components/protected-route'
import { useState } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, School, MapPin, Users } from 'lucide-react'

export default function ImportarCadastrosPage() {
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

      const response = await fetch('/api/admin/importar-cadastros', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setErro(data.mensagem || 'Erro ao importar cadastros')
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
        <div className="p-3 sm:p-4 md:p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6 md:mb-8">Importar Cadastros</h1>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
                Carregar Arquivo Excel com Cadastros
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                Esta funcionalidade importa automaticamente:
              </p>
              <ul className="list-disc list-inside text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 space-y-1 sm:space-y-2">
                <li><strong>Polos</strong> - Extraídos da coluna POLO</li>
                <li><strong>Escolas</strong> - Extraídas da coluna ESCOLA e vinculadas aos polos</li>
                <li><strong>Turmas</strong> - Extraídas da coluna TURMA e vinculadas às escolas</li>
                <li><strong>Alunos</strong> - Extraídos da coluna ALUNO e vinculados às escolas e turmas</li>
                <li><strong>Questões</strong> - Cria questões Q1 a Q60 automaticamente</li>
              </ul>

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
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                <XCircle className="w-5 h-5 mr-2" />
                {erro}
              </div>
            )}

            {resultado && (
              <div className="mb-6 space-y-4">
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <strong>Cadastros importados com sucesso!</strong>
                  </div>
                </div>

                {resultado.resumo && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                        <h3 className="font-semibold text-gray-800 dark:text-white">Polos</h3>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Total encontrados: {resultado.resumo.polos.total}</p>
                        <p className="text-green-600 dark:text-green-400">Criados: {resultado.resumo.polos.criados}</p>
                        <p className="text-gray-500 dark:text-gray-400">Já existiam: {resultado.resumo.polos.existentes}</p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <School className="w-5 h-5 text-green-600 mr-2" />
                        <h3 className="font-semibold text-gray-800 dark:text-white">Escolas</h3>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Total encontradas: {resultado.resumo.escolas.total}</p>
                        <p className="text-green-600 dark:text-green-400">Criadas: {resultado.resumo.escolas.criados}</p>
                        <p className="text-gray-500 dark:text-gray-400">Já existiam: {resultado.resumo.escolas.existentes}</p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <Users className="w-5 h-5 text-purple-600 mr-2" />
                        <h3 className="font-semibold text-gray-800 dark:text-white">Turmas</h3>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Total encontradas: {resultado.resumo.turmas.total}</p>
                        <p className="text-green-600 dark:text-green-400">Criadas: {resultado.resumo.turmas.criados}</p>
                        <p className="text-gray-500 dark:text-gray-400">Já existiam: {resultado.resumo.turmas.existentes}</p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <Users className="w-5 h-5 text-indigo-600 mr-2" />
                        <h3 className="font-semibold text-gray-800 dark:text-white">Alunos</h3>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Total encontrados: {resultado.resumo.alunos.total}</p>
                        <p className="text-green-600 dark:text-green-400">Criados: {resultado.resumo.alunos.criados}</p>
                        <p className="text-gray-500 dark:text-gray-400">Já existiam: {resultado.resumo.alunos.existentes}</p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <FileSpreadsheet className="w-5 h-5 text-indigo-600 mr-2" />
                        <h3 className="font-semibold text-gray-800 dark:text-white">Questões</h3>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p className="text-green-600 dark:text-green-400">Criadas: {resultado.resumo.questoes.criadas}</p>
                        <p className="text-gray-500 dark:text-gray-400">Já existiam: {resultado.resumo.questoes.existentes}</p>
                      </div>
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

                {resultado.resultado && (
                  <>
                    {(resultado.resultado.polos.erros.length > 0 || 
                      resultado.resultado.escolas.erros.length > 0 ||
                      resultado.resultado.turmas.erros.length > 0 ||
                      resultado.resultado.alunos.erros.length > 0) && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="font-semibold text-yellow-800 mb-2">Avisos:</p>
                        <div className="text-sm text-yellow-700 space-y-1">
                          {resultado.resultado.polos.erros.map((erro: string, index: number) => (
                            <p key={index}>{erro}</p>
                          ))}
                          {resultado.resultado.escolas.erros.map((erro: string, index: number) => (
                            <p key={index}>{erro}</p>
                          ))}
                          {resultado.resultado.turmas.erros.map((erro: string, index: number) => (
                            <p key={index}>{erro}</p>
                          ))}
                          {resultado.resultado.alunos.erros.map((erro: string, index: number) => (
                            <p key={index}>{erro}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!arquivo || carregando}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {carregando ? 'Importando Cadastros...' : 'Importar Cadastros'}
            </button>

            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Instruções:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>O arquivo deve conter as colunas: <strong>POLO</strong> e <strong>ESCOLA</strong></li>
                    <li>Os cadastros já existentes não serão duplicados</li>
                    <li>Após importar os cadastros, você pode importar os resultados das provas</li>
                    <li>As questões Q1 a Q60 serão criadas automaticamente</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
    </ProtectedRoute>
  )
}

