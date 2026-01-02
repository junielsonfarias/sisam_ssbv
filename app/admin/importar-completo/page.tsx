'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useState, useEffect, useRef } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Database, TrendingUp, Loader2, Pause, Play, StopCircle } from 'lucide-react'

export default function ImportarCompletoPage() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [anoLetivo, setAnoLetivo] = useState<string>(new Date().getFullYear().toString())
  const [carregando, setCarregando] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [erro, setErro] = useState('')
  const [progresso, setProgresso] = useState<{
    porcentagem: number
    linhas_processadas: number
    total_linhas: number
    status: string
    linhas_com_erro?: number
    polos_criados?: number
    polos_existentes?: number
    escolas_criadas?: number
    escolas_existentes?: number
    turmas_criadas?: number
    turmas_existentes?: number
    alunos_criados?: number
    alunos_existentes?: number
    questoes_criadas?: number
    questoes_existentes?: number
    resultados_novos?: number
    resultados_atualizados?: number
    resultados_duplicados?: number
  } | null>(null)
  const intervaloProgressoRef = useRef<NodeJS.Timeout | null>(null)
  const importacaoIdRef = useRef<string | null>(null)

  // Chave para localStorage
  const STORAGE_KEY = 'sisam_importacao_ativa'

  // Função para salvar importação ativa no localStorage
  const salvarImportacaoAtiva = (id: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, id)
    }
  }

  // Função para remover importação ativa do localStorage
  const removerImportacaoAtiva = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // Função para carregar importação ativa do localStorage
  const carregarImportacaoAtiva = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY)
    }
    return null
  }

  // Função auxiliar para buscar resultado final
  const buscarResultadoFinal = async (id: string) => {
    try {
      const resultadoResponse = await fetch(`/api/admin/importar-completo/resultado?id=${id}`)
      if (resultadoResponse.ok) {
        const resultadoData = await resultadoResponse.json()
        // Garantir que a estrutura esperada existe
        if (resultadoData && resultadoData.resultado) {
          setResultado(resultadoData)
        }
      }
    } catch (error) {
      console.error('Erro ao buscar resultado final:', error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setArquivo(file)
        setErro('')
        setResultado(null)
        setProgresso(null)
      } else {
        setErro('Por favor, selecione um arquivo Excel (.xlsx ou .xls)')
        setArquivo(null)
      }
    }
  }

  const buscarProgresso = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/importar-completo/progresso?id=${id}`)
      if (response.ok) {
        const data = await response.json()
        setProgresso({
          porcentagem: data.porcentagem || 0,
          linhas_processadas: data.linhas_processadas || 0,
          total_linhas: data.total_linhas || 0,
          status: data.status || 'processando',
          linhas_com_erro: data.linhas_com_erro || 0,
          polos_criados: data.polos_criados || 0,
          polos_existentes: data.polos_existentes || 0,
          escolas_criadas: data.escolas_criadas || 0,
          escolas_existentes: data.escolas_existentes || 0,
          turmas_criadas: data.turmas_criadas || 0,
          turmas_existentes: data.turmas_existentes || 0,
          alunos_criados: data.alunos_criados || 0,
          alunos_existentes: data.alunos_existentes || 0,
          questoes_criadas: data.questoes_criadas || 0,
          questoes_existentes: data.questoes_existentes || 0,
          resultados_novos: data.resultados_novos || 0,
          resultados_duplicados: data.resultados_duplicados || 0,
        })

        // Se concluído, buscar resultado final e parar polling
        if (data.status === 'concluido') {
          if (intervaloProgressoRef.current) {
            clearInterval(intervaloProgressoRef.current)
            intervaloProgressoRef.current = null
          }
          setCarregando(false)
          removerImportacaoAtiva() // Limpar localStorage
          
          // Buscar resultado final da importação
          buscarResultadoFinal(id)
        } else if (data.status === 'erro' || data.status === 'cancelado') {
          if (intervaloProgressoRef.current) {
            clearInterval(intervaloProgressoRef.current)
            intervaloProgressoRef.current = null
          }
          setCarregando(false)
          removerImportacaoAtiva() // Limpar localStorage
        }
      }
    } catch (error) {
      console.error('Erro ao buscar progresso:', error)
    }
  }

  const handlePausar = async () => {
    if (!importacaoIdRef.current) return
    
    try {
      const response = await fetch(`/api/admin/importar-completo/pausar?id=${importacaoIdRef.current}`, {
        method: 'POST',
      })
      
      if (response.ok) {
        const data = await response.json()
        setProgresso((prev) => prev ? { ...prev, status: 'pausado' } : null)
      } else {
        const errorData = await response.json()
        setErro(errorData.mensagem || 'Erro ao pausar importação')
      }
    } catch (error) {
      console.error('Erro ao pausar:', error)
      setErro('Erro ao conectar com o servidor')
    }
  }

  const handleRetomar = async () => {
    if (!importacaoIdRef.current) return
    
    try {
      const response = await fetch(`/api/admin/importar-completo/retomar?id=${importacaoIdRef.current}`, {
        method: 'POST',
      })
      
      if (response.ok) {
        const data = await response.json()
        setProgresso((prev) => prev ? { ...prev, status: 'processando' } : null)
        setCarregando(true)
      } else {
        const errorData = await response.json()
        setErro(errorData.mensagem || 'Erro ao retomar importação')
      }
    } catch (error) {
      console.error('Erro ao retomar:', error)
      setErro('Erro ao conectar com o servidor')
    }
  }

  const handleCancelar = async () => {
    if (!importacaoIdRef.current) return
    
    if (!confirm('Tem certeza que deseja cancelar a importação? Esta ação não pode ser desfeita.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/admin/importar-completo/cancelar?id=${importacaoIdRef.current}`, {
        method: 'POST',
      })
      
      if (response.ok) {
        const data = await response.json()
        setProgresso((prev) => prev ? { ...prev, status: 'cancelado' } : null)
        setCarregando(false)
        removerImportacaoAtiva() // Limpar localStorage
        
        if (intervaloProgressoRef.current) {
          clearInterval(intervaloProgressoRef.current)
          intervaloProgressoRef.current = null
        }
      } else {
        const errorData = await response.json()
        setErro(errorData.mensagem || 'Erro ao cancelar importação')
      }
    } catch (error) {
      console.error('Erro ao cancelar:', error)
      setErro('Erro ao conectar com o servidor')
    }
  }

  // Verificar se há importação em andamento ao carregar a página
  useEffect(() => {
    const importacaoIdSalva = carregarImportacaoAtiva()
    
    if (importacaoIdSalva) {
      // Verificar se a importação ainda está em andamento
      const verificarEretomar = async () => {
        try {
          const response = await fetch(`/api/admin/importar-completo/progresso?id=${importacaoIdSalva}`)
          if (response.ok) {
            const data = await response.json()
            
            // Se ainda está processando ou pausada, retomar acompanhamento
            if (data.status === 'processando' || data.status === 'pausado') {
              importacaoIdRef.current = importacaoIdSalva
              setCarregando(true)
              
              setProgresso({
                porcentagem: data.porcentagem || 0,
                linhas_processadas: data.linhas_processadas || 0,
                total_linhas: data.total_linhas || 0,
                status: data.status || 'processando',
                linhas_com_erro: data.linhas_com_erro || 0,
                polos_criados: data.polos_criados || 0,
                polos_existentes: data.polos_existentes || 0,
                escolas_criadas: data.escolas_criadas || 0,
                escolas_existentes: data.escolas_existentes || 0,
                turmas_criadas: data.turmas_criadas || 0,
                turmas_existentes: data.turmas_existentes || 0,
                alunos_criados: data.alunos_criados || 0,
                alunos_existentes: data.alunos_existentes || 0,
                questoes_criadas: data.questoes_criadas || 0,
                questoes_existentes: data.questoes_existentes || 0,
                resultados_novos: data.resultados_novos || 0,
                resultados_duplicados: data.resultados_duplicados || 0,
              })
              
              // Iniciar polling
              intervaloProgressoRef.current = setInterval(() => {
                if (importacaoIdRef.current) {
                  buscarProgresso(importacaoIdRef.current)
                }
              }, 1000)
            } else {
              // Importação já terminou, limpar localStorage
              removerImportacaoAtiva()
              
              // Se concluída, buscar resultado
              if (data.status === 'concluido') {
                buscarResultadoFinal(importacaoIdSalva)
              }
            }
          } else {
            // Importação não encontrada ou erro, limpar localStorage
            removerImportacaoAtiva()
          }
        } catch (error) {
          console.error('Erro ao verificar importação salva:', error)
          removerImportacaoAtiva()
        }
      }
      
      verificarEretomar()
    }

    // Limpar intervalo ao desmontar componente
    return () => {
      if (intervaloProgressoRef.current) {
        clearInterval(intervaloProgressoRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUpload = async () => {
    if (!arquivo) {
      setErro('Por favor, selecione um arquivo')
      return
    }

    setCarregando(true)
    setErro('')
    setResultado(null)
    setProgresso(null)
    importacaoIdRef.current = null

    // Limpar intervalo anterior se existir
    if (intervaloProgressoRef.current) {
      clearInterval(intervaloProgressoRef.current)
    }

    try {
      const formData = new FormData()
      formData.append('arquivo', arquivo)
      formData.append('ano_letivo', anoLetivo)

      const response = await fetch('/api/admin/importar-completo', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        
        // Se a API retornar o ID da importação, iniciar polling
        if (data.importacao_id) {
          importacaoIdRef.current = data.importacao_id
          salvarImportacaoAtiva(data.importacao_id) // Salvar no localStorage
          
          // Inicializar progresso com dados iniciais
          setProgresso({
            porcentagem: 0,
            linhas_processadas: 0,
            total_linhas: 0,
            status: 'processando',
          })
          
          // Buscar progresso imediatamente
          buscarProgresso(data.importacao_id)
          
          // Iniciar polling a cada 1 segundo
          intervaloProgressoRef.current = setInterval(() => {
            if (importacaoIdRef.current) {
              buscarProgresso(importacaoIdRef.current)
            }
          }, 1000)
        } else if (data.resultado) {
          // Resposta antiga (síncrona) - importação já terminou
          setResultado(data)
          setCarregando(false)
          setArquivo(null)
          const fileInput = document.getElementById('arquivo') as HTMLInputElement
          if (fileInput) fileInput.value = ''
        }
      } else {
        const errorData = await response.json()
        setErro(errorData.mensagem || 'Erro ao importar dados')
        setCarregando(false)
      }
    } catch (error) {
      setErro('Erro ao conectar com o servidor')
      setCarregando(false)
      if (intervaloProgressoRef.current) {
        clearInterval(intervaloProgressoRef.current)
        intervaloProgressoRef.current = null
      }
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

            {(progresso || (carregando && importacaoIdRef.current)) && (
              <div className={`mb-6 rounded-lg p-4 sm:p-6 border ${
                (progresso?.status || 'processando') === 'pausado' 
                  ? 'bg-yellow-50 border-yellow-200' 
                  : (progresso?.status || 'processando') === 'cancelado'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    {(progresso?.status || 'processando') === 'processando' && (
                      <Loader2 className="w-5 h-5 text-blue-600 mr-2 animate-spin" />
                    )}
                    {(progresso?.status || 'processando') === 'pausado' && (
                      <Pause className="w-5 h-5 text-yellow-600 mr-2" />
                    )}
                    {(progresso?.status || 'processando') === 'cancelado' && (
                      <StopCircle className="w-5 h-5 text-red-600 mr-2" />
                    )}
                    <span className={`text-sm sm:text-base font-semibold ${
                      (progresso?.status || 'processando') === 'pausado' 
                        ? 'text-yellow-800' 
                        : (progresso?.status || 'processando') === 'cancelado'
                        ? 'text-red-800'
                        : 'text-blue-800'
                    }`}>
                      {(progresso?.status || 'processando') === 'pausado' 
                        ? 'Importação Pausada' 
                        : (progresso?.status || 'processando') === 'cancelado'
                        ? 'Importação Cancelada'
                        : 'Importando...'}
                    </span>
                  </div>
                  <span className={`text-sm sm:text-base font-bold ${
                    (progresso?.status || 'processando') === 'pausado' 
                      ? 'text-yellow-600' 
                      : (progresso?.status || 'processando') === 'cancelado'
                      ? 'text-red-600'
                      : 'text-blue-600'
                  }`}>
                    {progresso?.porcentagem || 0}%
                  </span>
                </div>
                
                <div className={`w-full rounded-full h-3 sm:h-4 mb-3 ${
                  (progresso?.status || 'processando') === 'pausado' 
                    ? 'bg-yellow-200' 
                    : (progresso?.status || 'processando') === 'cancelado'
                    ? 'bg-red-200'
                    : 'bg-blue-200'
                }`}>
                  <div
                    className={`h-3 sm:h-4 rounded-full transition-all duration-300 ease-out ${
                      (progresso?.status || 'processando') === 'pausado' 
                        ? 'bg-yellow-600' 
                        : (progresso?.status || 'processando') === 'cancelado'
                        ? 'bg-red-600'
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${progresso?.porcentagem || 0}%` }}
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-3">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs sm:text-sm">
                    <span className={
                      (progresso?.status || 'processando') === 'pausado' 
                        ? 'text-yellow-700' 
                        : (progresso?.status || 'processando') === 'cancelado'
                        ? 'text-red-700'
                        : 'text-blue-700'
                    }>
                      Linhas processadas: <strong>{progresso?.linhas_processadas || 0}</strong> / {progresso?.total_linhas || 0}
                    </span>
                    <span className={
                      (progresso?.status || 'processando') === 'pausado' 
                        ? 'text-yellow-700' 
                        : (progresso?.status || 'processando') === 'cancelado'
                        ? 'text-red-700'
                        : 'text-blue-700'
                    }>
                      Status: <strong className="capitalize">{progresso?.status || 'processando'}</strong>
                    </span>
                  </div>
                </div>

                {/* Botões de Controle */}
                {(progresso?.status || 'processando') === 'processando' && (
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <button
                      onClick={handlePausar}
                      className="flex items-center px-3 sm:px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-xs sm:text-sm font-medium"
                    >
                      <Pause className="w-4 h-4 mr-1 sm:mr-2" />
                      Pausar
                    </button>
                    <button
                      onClick={handleCancelar}
                      className="flex items-center px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm font-medium"
                    >
                      <StopCircle className="w-4 h-4 mr-1 sm:mr-2" />
                      Cancelar
                    </button>
                  </div>
                )}

                {(progresso?.status || 'processando') === 'pausado' && (
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <button
                      onClick={handleRetomar}
                      disabled={!importacaoIdRef.current}
                      className="flex items-center px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Play className="w-4 h-4 mr-1 sm:mr-2" />
                      Retomar
                    </button>
                    <button
                      onClick={handleCancelar}
                      disabled={!importacaoIdRef.current}
                      className="flex items-center px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <StopCircle className="w-4 h-4 mr-1 sm:mr-2" />
                      Cancelar
                    </button>
                  </div>
                )}

                {(progresso?.status || 'processando') === 'cancelado' && (
                  <div className="text-xs sm:text-sm text-red-700">
                    <p>A importação foi cancelada. Os dados processados até o momento foram salvos.</p>
                  </div>
                )}
              </div>
            )}

          {resultado && resultado.resultado && (
            <div className="mb-6 space-y-4">
              {resultado.resultado.resultados && resultado.resultado.resultados.processados > 0 ? (
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

              {resultado.resultado && resultado.resultado.resultados && (
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
                        <p className="text-green-600">Questões novas: {resultado.resultado.resultados.novos || 0}</p>
                        {resultado.resultado.resultados.duplicados > 0 && (
                          <p className="text-gray-500">Duplicados ignorados: {resultado.resultado.resultados.duplicados}</p>
                        )}
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

