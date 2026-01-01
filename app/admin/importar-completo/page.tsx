'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useState } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Database, TrendingUp } from 'lucide-react'

export default function ImportarCompletoPage() {
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

      const response = await fetch('/api/admin/importar-completo', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setErro(data.mensagem || 'Erro ao importar dados')
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6 md:mb-8">Importação Completa</h1>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
                Importação Completa de Dados
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                Esta funcionalidade importa <strong>tudo de uma vez</strong>:
              </p>
              <ul className="list-disc list-inside text-xs sm:text-sm text-gray-600 mb-4 space-y-1 sm:space-y-2 bg-blue-50 p-3 sm:p-4 rounded-lg">
                <li><strong>Polos</strong> - Extraídos da coluna POLO</li>
                <li><strong>Escolas</strong> - Extraídas da coluna ESCOLA e vinculadas aos polos</li>
                <li><strong>Turmas</strong> - Extraídas da coluna TURMA com série e ano letivo</li>
                <li><strong>Alunos</strong> - Extraídos da coluna ALUNO com série e vinculados às turmas</li>
                <li><strong>Questões</strong> - Cria questões Q1 a Q60 automaticamente</li>
                <li><strong>Resultados</strong> - Processa todas as questões (Q1 a Q60) de cada aluno</li>
                <li><strong>Presença</strong> - Extraída da coluna FALTA (P = Presente, F = Falta)</li>
                <li><strong>Série</strong> - Extraída da coluna ANO/SÉRIE</li>
              </ul>

              <div className="mb-4">
                <label htmlFor="ano_letivo" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Ano Letivo
                </label>
                <input
                  id="ano_letivo"
                  type="text"
                  value={anoLetivo}
                  onChange={(e) => setAnoLetivo(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ex: 2024"
                />
                <p className="text-xs text-gray-500 mt-1">Ano letivo ao qual se referem os dados</p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 md:p-8 text-center">
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
                  className="cursor-pointer inline-block bg-indigo-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-indigo-700 transition-colors text-sm sm:text-base"
                >
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5 inline-block mr-2" />
                  Selecionar Arquivo Excel
                </label>
                {arquivo && (
                  <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-700">
                    Arquivo selecionado: <strong className="break-all">{arquivo.name}</strong>
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
                {resultado.resultado.resultados.processados > 0 ? (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <strong>Importação completa realizada com sucesso!</strong>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    <div className="flex items-center mb-2">
                      <XCircle className="w-5 h-5 mr-2" />
                      <strong>Nenhuma linha foi processada!</strong>
                    </div>
                  </div>
                )}

                {resultado.resultado && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <Database className="w-5 h-5 text-blue-600 mr-2" />
                        <h3 className="font-semibold text-gray-800">Polos</h3>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Total: {resultado.resultado.polos.total}</p>
                        <p className="text-green-600">Criados: {resultado.resultado.polos.criados}</p>
                        <p className="text-gray-500">Existentes: {resultado.resultado.polos.existentes}</p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <Database className="w-5 h-5 text-green-600 mr-2" />
                        <h3 className="font-semibold text-gray-800">Escolas</h3>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Total: {resultado.resultado.escolas.total}</p>
                        <p className="text-green-600">Criadas: {resultado.resultado.escolas.criados}</p>
                        <p className="text-gray-500">Existentes: {resultado.resultado.escolas.existentes}</p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <Database className="w-5 h-5 text-purple-600 mr-2" />
                        <h3 className="font-semibold text-gray-800">Turmas</h3>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p className="text-green-600">Criadas: {resultado.resultado.turmas.criados}</p>
                        <p className="text-gray-500">Existentes: {resultado.resultado.turmas.existentes}</p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <Database className="w-5 h-5 text-indigo-600 mr-2" />
                        <h3 className="font-semibold text-gray-800">Alunos</h3>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p className="text-green-600">Criados: {resultado.resultado.alunos.criados}</p>
                        <p className="text-gray-500">Existentes: {resultado.resultado.alunos.existentes}</p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <Database className="w-5 h-5 text-yellow-600 mr-2" />
                        <h3 className="font-semibold text-gray-800">Questões</h3>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p className="text-green-600">Criadas: {resultado.resultado.questoes.criadas}</p>
                        <p className="text-gray-500">Existentes: {resultado.resultado.questoes.existentes}</p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600 mr-2" />
                        <h3 className="font-semibold text-gray-800">Resultados</h3>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Alunos processados: {resultado.resultado.resultados.processados}</p>
                        <p>Questões importadas: {resultado.resultado.resultados.total_questoes}</p>
                        <p className="text-green-600">✓ Notas e médias importadas</p>
                        {resultado.resultado.resultados.erros > 0 && (
                          <p className="text-orange-600">Erros: {resultado.resultado.resultados.erros}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {resultado.resultado && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h3 className="font-semibold text-indigo-800 mb-3">Dados Importados por Aluno:</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-indigo-700 font-medium">✓ Notas por Área</p>
                        <p className="text-gray-600 text-xs">LP, CH, MAT, CN</p>
                      </div>
                      <div>
                        <p className="text-indigo-700 font-medium">✓ Totais de Acertos</p>
                        <p className="text-gray-600 text-xs">Por área de conhecimento</p>
                      </div>
                      <div>
                        <p className="text-indigo-700 font-medium">✓ Média do Aluno</p>
                        <p className="text-gray-600 text-xs">Média geral</p>
                      </div>
                      <div>
                        <p className="text-indigo-700 font-medium">✓ Presença</p>
                        <p className="text-gray-600 text-xs">P (Presente) / F (Falta)</p>
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
              {carregando ? 'Importando Dados Completos...' : 'Importar Tudo'}
            </button>

            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Importação Completa:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Processa tudo em uma única operação</li>
                    <li>Cria automaticamente: polos, escolas, turmas, alunos e questões</li>
                    <li>Importa todos os resultados das provas (Q1 a Q60 por aluno)</li>
                    <li>Inclui presença e série de cada aluno</li>
                    <li>Mantém todas as vinculações entre os dados</li>
                    <li>Evita duplicação de cadastros</li>
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

