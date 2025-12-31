'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useState } from 'react'
import { Download, Upload, FileImage, Loader2 } from 'lucide-react'

export default function CartaoRespostaPage() {
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString())
  const [serie, setSerie] = useState('')
  const [alunoId, setAlunoId] = useState('')
  const [gerando, setGerando] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [resultado, setResultado] = useState<any>(null)

  const handleGerarPDF = () => {
    setGerando(true)
    const params = new URLSearchParams({ ano_letivo: anoLetivo })
    if (serie) params.append('serie', serie)
    if (alunoId) params.append('aluno_id', alunoId)

    window.open(`/api/admin/cartao-resposta/gerar?${params}`, '_blank')
    setTimeout(() => setGerando(false), 1000)
  }

  const handleProcessarImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setProcessando(true)
    setResultado(null)
    
    const formData = new FormData()
    formData.append('imagem', file)
    formData.append('ano_letivo', anoLetivo)
    if (alunoId) formData.append('aluno_id', alunoId)

    try {
      const response = await fetch('/api/admin/cartao-resposta/ler', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      
      if (response.ok) {
        setResultado(data)
      } else {
        alert(data.mensagem || 'Erro ao processar imagem')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao processar imagem')
    } finally {
      setProcessando(false)
    }
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <LayoutDashboard tipoUsuario="admin">
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Cartão-Resposta</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gerar PDF */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Download className="w-6 h-6" />
                Gerar Cartão-Resposta
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ano Letivo *
                  </label>
                  <input
                    type="text"
                    value={anoLetivo}
                    onChange={(e) => setAnoLetivo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="Ex: 2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Série
                  </label>
                  <select
                    value={serie}
                    onChange={(e) => setSerie(e.target.value)}
                    className="select-custom w-full"
                  >
                    <option value="">Todas</option>
                    <option value="6º Ano">6º Ano</option>
                    <option value="7º Ano">7º Ano</option>
                    <option value="8º Ano">8º Ano</option>
                    <option value="9º Ano">9º Ano</option>
                  </select>
                </div>

                <button
                  onClick={handleGerarPDF}
                  disabled={gerando || !anoLetivo}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {gerando ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Gerar PDF
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Processar Imagem */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Upload className="w-6 h-6" />
                Processar Cartão Escaneado
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ano Letivo *
                  </label>
                  <input
                    type="text"
                    value={anoLetivo}
                    onChange={(e) => setAnoLetivo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="Ex: 2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Imagem Escaneada *
                  </label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileImage className="w-10 h-10 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Clique para selecionar</span> ou arraste a imagem
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG ou PDF</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={handleProcessarImagem}
                      disabled={processando}
                    />
                  </label>
                </div>

                {processando && (
                  <div className="flex items-center justify-center gap-2 text-indigo-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando imagem...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resultado */}
          {resultado && (
            <div className="mt-6 bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Resultado do Processamento</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total de Questões</p>
                  <p className="text-2xl font-bold text-blue-600">{resultado.total_questoes}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Respostas Detectadas</p>
                  <p className="text-2xl font-bold text-green-600">{resultado.respostas_detectadas}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Taxa de Sucesso</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {resultado.total_questoes > 0
                      ? Math.round((resultado.respostas_detectadas / resultado.total_questoes) * 100)
                      : 0}%
                  </p>
                </div>
              </div>

              {resultado.aluno_salvo && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✅ Respostas salvas no banco de dados com sucesso!
                  </p>
                </div>
              )}

              {Object.keys(resultado.respostas || {}).length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2 text-gray-700">Respostas Detectadas:</h3>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 max-h-96 overflow-y-auto">
                    {Object.entries(resultado.respostas).map(([questao, alternativa]: any) => (
                      <div key={questao} className="bg-gray-50 p-2 rounded text-center border border-gray-200">
                        <span className="font-mono text-xs text-gray-600 block">{questao}</span>
                        <span className="block font-bold text-indigo-600 text-lg">{alternativa}</span>
                        <span className="text-xs text-gray-500">
                          {resultado.confianca?.[questao]?.toFixed(0) || 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(resultado.respostas || {}).length === 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Nenhuma resposta foi detectada. Verifique se a imagem está nítida e as marcações estão completas.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

