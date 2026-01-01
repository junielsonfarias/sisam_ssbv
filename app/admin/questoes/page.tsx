'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Search, X, Calendar, FileText } from 'lucide-react'

interface GabaritoPorSerie {
  serie: string
  gabarito: string
}

interface Questao {
  id: string
  codigo: string | null
  descricao: string | null
  disciplina: string | null
  area_conhecimento: string | null
  dificuldade: string | null
  gabarito: string | null
  ano_letivo: string | null
  tipo: string | null
  gabaritos_por_serie?: GabaritoPorSerie[]
  criado_em: Date
}

export default function QuestoesPage() {
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroAno, setFiltroAno] = useState<string>('')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [questaoEditando, setQuestaoEditando] = useState<Questao | null>(null)
  const [formData, setFormData] = useState({
    codigo: '',
    descricao: '',
    disciplina: '',
    area_conhecimento: '',
    dificuldade: '',
    gabarito: '',
    ano_letivo: '',
    tipo: 'objetiva',
    gabaritos_por_serie: [] as GabaritoPorSerie[],
  })
  const [salvando, setSalvando] = useState(false)
  const [seriesDisponiveis] = useState(['6º Ano', '7º Ano', '8º Ano', '9º Ano'])

  useEffect(() => {
    carregarQuestoes()
  }, [])

  const carregarQuestoes = async () => {
    try {
      const response = await fetch('/api/admin/questoes')
      const data = await response.json()
      setQuestoes(data)
    } catch (error) {
      console.error('Erro ao carregar questões:', error)
    } finally {
      setCarregando(false)
    }
  }

  const questoesFiltradas = questoes.filter(
    (q) => {
      const matchBusca = !busca || 
        (q.codigo && q.codigo.toLowerCase().includes(busca.toLowerCase())) ||
        (q.descricao && q.descricao.toLowerCase().includes(busca.toLowerCase())) ||
        (q.disciplina && q.disciplina.toLowerCase().includes(busca.toLowerCase()))
      
      const matchAno = !filtroAno || q.ano_letivo === filtroAno
      
      return matchBusca && matchAno
    }
  )

  // Agrupar questões por ano letivo
  const questoesPorAno = questoesFiltradas.reduce((acc, questao) => {
    const ano = questao.ano_letivo || 'Sem ano'
    if (!acc[ano]) {
      acc[ano] = []
    }
    acc[ano].push(questao)
    return acc
  }, {} as Record<string, Questao[]>)

  const anosDisponiveis = [...new Set(questoes.map(q => q.ano_letivo).filter((ano): ano is string => Boolean(ano)))].sort().reverse()

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      const url = '/api/admin/questoes'
      const method = questaoEditando ? 'PUT' : 'POST'
      
      const body = questaoEditando
        ? { id: questaoEditando.id, ...formData }
        : formData

      console.log('Enviando requisição:', { method, body })

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok) {
        await carregarQuestoes()
        setMostrarModal(false)
        setQuestaoEditando(null)
        setFormData({
          codigo: '',
          descricao: '',
          disciplina: '',
          area_conhecimento: '',
          dificuldade: '',
          gabarito: '',
          ano_letivo: '',
          tipo: 'objetiva',
          gabaritos_por_serie: [],
        })
      } else {
        console.error('Erro na resposta:', data)
        alert(data.mensagem || data.detalhes || 'Erro ao salvar questão')
      }
    } catch (error: any) {
      console.error('Erro ao salvar questão:', error)
      alert(`Erro ao salvar questão: ${error.message || 'Erro desconhecido'}`)
    } finally {
      setSalvando(false)
    }
  }

  const handleAbrirModal = (questao?: Questao) => {
    if (questao) {
      setQuestaoEditando(questao)
      setFormData({
        codigo: questao.codigo || '',
        descricao: questao.descricao || '',
        disciplina: questao.disciplina || '',
        area_conhecimento: questao.area_conhecimento || '',
        dificuldade: questao.dificuldade || '',
        gabarito: questao.gabarito || '',
        ano_letivo: questao.ano_letivo || '',
        tipo: questao.tipo || 'objetiva',
        gabaritos_por_serie: questao.gabaritos_por_serie || [],
      })
    } else {
      setQuestaoEditando(null)
      setFormData({
        codigo: '',
        descricao: '',
        disciplina: '',
        area_conhecimento: '',
        dificuldade: '',
        gabarito: '',
        ano_letivo: new Date().getFullYear().toString(),
        tipo: 'objetiva',
        gabaritos_por_serie: [],
      })
    }
    setMostrarModal(true)
  }

  const handleAdicionarGabaritoSerie = () => {
    setFormData({
      ...formData,
      gabaritos_por_serie: [
        ...formData.gabaritos_por_serie,
        { serie: '', gabarito: '' }
      ]
    })
  }

  const handleRemoverGabaritoSerie = (index: number) => {
    setFormData({
      ...formData,
      gabaritos_por_serie: formData.gabaritos_por_serie.filter((_, i) => i !== index)
    })
  }

  const handleAtualizarGabaritoSerie = (index: number, field: 'serie' | 'gabarito', value: string) => {
    const novosGabaritos = [...formData.gabaritos_por_serie]
    novosGabaritos[index] = { ...novosGabaritos[index], [field]: value }
    setFormData({ ...formData, gabaritos_por_serie: novosGabaritos })
  }

  const handleExcluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta questão?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/questoes?id=${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        await carregarQuestoes()
      } else {
        alert(data.mensagem || 'Erro ao excluir questão')
      }
    } catch (error) {
      console.error('Erro ao excluir questão:', error)
      alert('Erro ao excluir questão')
    }
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador']}>
      <LayoutDashboard tipoUsuario="admin">
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Gestão de Questões</h1>
            <button
              onClick={() => handleAbrirModal()}
              className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Nova Questão
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar questões..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                />
              </div>
              <div>
                <select
                  value={filtroAno}
                  onChange={(e) => setFiltroAno(e.target.value)}
                  className="select-custom w-full"
                >
                  <option value="">Todos os anos</option>
                  {anosDisponiveis.map((ano) => (
                    <option key={ano} value={ano}>
                      {ano}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {carregando ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Carregando questões...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.keys(questoesPorAno).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg font-medium">Nenhuma questão encontrada</p>
                    <p className="text-sm">Tente ajustar os filtros de busca</p>
                  </div>
                ) : (
                  Object.entries(questoesPorAno).map(([ano, questoesAno]) => (
                    <div key={ano} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-6 py-4 border-b border-indigo-200">
                        <h3 className="text-xl font-bold text-indigo-900 flex items-center">
                          <Calendar className="w-5 h-5 mr-2" />
                          {ano}
                          <span className="ml-3 text-sm font-normal text-indigo-700">
                            ({questoesAno.length} questão{questoesAno.length !== 1 ? 'ões' : ''})
                          </span>
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left py-3 px-3 md:py-4 md:px-4 lg:px-6 font-semibold text-gray-700 text-xs md:text-sm uppercase tracking-wider whitespace-nowrap min-w-[100px]">
                                Código
                              </th>
                              <th className="text-left py-3 px-3 md:py-4 md:px-4 lg:px-6 font-semibold text-gray-700 text-xs md:text-sm uppercase tracking-wider min-w-[200px]">
                                Descrição
                              </th>
                              <th className="text-left py-3 px-3 md:py-4 md:px-4 lg:px-6 font-semibold text-gray-700 text-xs md:text-sm uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                                Disciplina
                              </th>
                              <th className="text-left py-3 px-3 md:py-4 md:px-4 lg:px-6 font-semibold text-gray-700 text-xs md:text-sm uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                                Área
                              </th>
                              <th className="text-left py-3 px-3 md:py-4 md:px-4 lg:px-6 font-semibold text-gray-700 text-xs md:text-sm uppercase tracking-wider whitespace-nowrap min-w-[100px]">
                                Tipo
                              </th>
                              <th className="text-left py-3 px-3 md:py-4 md:px-4 lg:px-6 font-semibold text-gray-700 text-xs md:text-sm uppercase tracking-wider whitespace-nowrap min-w-[80px]">
                                Gabarito
                              </th>
                              <th className="text-right py-3 px-3 md:py-4 md:px-4 lg:px-6 font-semibold text-gray-700 text-xs md:text-sm uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                                Ações
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {questoesAno.map((questao) => {
                        const getDisciplinaColor = (disciplina: string | null) => {
                          if (!disciplina) return 'bg-gray-100 text-gray-700'
                          const disc = disciplina.toLowerCase()
                          if (disc.includes('português') || disc.includes('língua')) return 'bg-blue-100 text-blue-800'
                          if (disc.includes('matemática') || disc.includes('mat')) return 'bg-purple-100 text-purple-800'
                          if (disc.includes('humanas') || disc.includes('ch')) return 'bg-green-100 text-green-800'
                          if (disc.includes('natureza') || disc.includes('cn')) return 'bg-yellow-100 text-yellow-800'
                          return 'bg-gray-100 text-gray-700'
                        }

                        return (
                          <tr key={questao.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-3 md:py-4 md:px-4 lg:px-6 whitespace-nowrap">
                              <span className="font-mono font-semibold text-gray-900 text-xs sm:text-sm">
                                {questao.codigo || '-'}
                              </span>
                            </td>
                            <td className="py-3 px-3 md:py-4 md:px-4 lg:px-6">
                              <span className="text-gray-700 text-xs sm:text-sm">
                                {questao.descricao ? (
                                  questao.descricao.length > 60
                                    ? `${questao.descricao.substring(0, 60)}...`
                                    : questao.descricao
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </span>
                            </td>
                            <td className="py-3 px-3 md:py-4 md:px-4 lg:px-6 whitespace-nowrap">
                              {questao.disciplina ? (
                                <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getDisciplinaColor(questao.disciplina)}`}>
                                  {questao.disciplina}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-3 md:py-4 md:px-4 lg:px-6 whitespace-nowrap">
                              {questao.area_conhecimento ? (
                                <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getDisciplinaColor(questao.area_conhecimento)}`}>
                                  {questao.area_conhecimento}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-3 md:py-4 md:px-4 lg:px-6">
                              <div className="flex flex-col gap-1">
                                {questao.gabarito && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-100 text-indigo-800 font-semibold text-xs">
                                    Geral: {questao.gabarito}
                                  </span>
                                )}
                                {questao.gabaritos_por_serie && questao.gabaritos_por_serie.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {questao.gabaritos_por_serie.map((gab, idx) => (
                                      <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs">
                                        {gab.serie}: {gab.gabarito}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {!questao.gabarito && (!questao.gabaritos_por_serie || questao.gabaritos_por_serie.length === 0) && (
                                  <span className="text-gray-400 text-xs sm:text-sm">-</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 md:py-4 md:px-4 lg:px-6 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                                questao.tipo === 'objetiva' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                <FileText className="w-3 h-3 mr-1" />
                                {questao.tipo === 'objetiva' ? 'Objetiva' : 'Discursiva'}
                              </span>
                            </td>
                            <td className="py-3 px-3 md:py-4 md:px-4 lg:px-6 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1 sm:gap-2">
                                <button
                                  onClick={() => handleAbrirModal(questao)}
                                  className="p-1.5 sm:p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  aria-label="Editar"
                                  title="Editar"
                                >
                                  <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                                <button
                                  onClick={() => handleExcluir(questao.id)}
                                  className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  aria-label="Excluir"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
            )}

            {questoesFiltradas.length > 0 && (
              <div className="mt-4 text-sm text-gray-600 text-center">
                Mostrando {questoesFiltradas.length} de {questoes.length} questões
              </div>
            )}
          </div>

          {/* Modal de Cadastro/Edição */}
          {mostrarModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setMostrarModal(false)}></div>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                  <div className="bg-white px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {questaoEditando ? 'Editar Questão' : 'Nova Questão'}
                      </h3>
                      <button
                        onClick={() => setMostrarModal(false)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                        <input
                          type="text"
                          value={formData.codigo}
                          onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                          placeholder="Ex: Q1, Q2, Q60"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                        <textarea
                          value={formData.descricao}
                          onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                          placeholder="Descrição da questão"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Ano Letivo *</label>
                          <input
                            type="text"
                            value={formData.ano_letivo}
                            onChange={(e) => setFormData({ ...formData, ano_letivo: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                            placeholder="Ex: 2025"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Questão *</label>
                          <select
                            value={formData.tipo}
                            onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                            className="select-custom w-full"
                          >
                            <option value="objetiva">Objetiva</option>
                            <option value="discursiva">Discursiva</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
                          <select
                            value={formData.disciplina}
                            onChange={(e) => setFormData({ ...formData, disciplina: e.target.value })}
                            className="select-custom w-full"
                          >
                            <option value="">Selecione</option>
                            <option value="Língua Portuguesa">Língua Portuguesa</option>
                            <option value="Matemática">Matemática</option>
                            <option value="Ciências Humanas">Ciências Humanas</option>
                            <option value="Ciências da Natureza">Ciências da Natureza</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Área de Conhecimento</label>
                          <select
                            value={formData.area_conhecimento}
                            onChange={(e) => setFormData({ ...formData, area_conhecimento: e.target.value })}
                            className="select-custom w-full"
                          >
                            <option value="">Selecione</option>
                            <option value="Língua Portuguesa">Língua Portuguesa</option>
                            <option value="Matemática">Matemática</option>
                            <option value="Ciências Humanas">Ciências Humanas</option>
                            <option value="Ciências da Natureza">Ciências da Natureza</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Dificuldade</label>
                          <select
                            value={formData.dificuldade}
                            onChange={(e) => setFormData({ ...formData, dificuldade: e.target.value })}
                            className="select-custom w-full"
                          >
                            <option value="">Selecione</option>
                            <option value="Fácil">Fácil</option>
                            <option value="Média">Média</option>
                            <option value="Difícil">Difícil</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Gabarito Geral (opcional)</label>
                          <select
                            value={formData.gabarito}
                            onChange={(e) => setFormData({ ...formData, gabarito: e.target.value })}
                            className="select-custom w-full"
                          >
                            <option value="">Selecione</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                            <option value="E">E</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">Use gabaritos por série abaixo para diferentes séries</p>
                        </div>
                      </div>

                      {/* Gabaritos por Série */}
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-medium text-gray-700">
                            Gabaritos por Série
                          </label>
                          <button
                            type="button"
                            onClick={handleAdicionarGabaritoSerie}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            Adicionar Gabarito
                          </button>
                        </div>
                        {formData.gabaritos_por_serie.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-2">
                            Nenhum gabarito por série cadastrado
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {formData.gabaritos_por_serie.map((gab, index) => (
                              <div key={index} className="flex gap-2 items-center bg-white p-2 rounded">
                                <select
                                  value={gab.serie}
                                  onChange={(e) => handleAtualizarGabaritoSerie(index, 'serie', e.target.value)}
                                  className="select-custom flex-1"
                                >
                                  <option value="">Selecione a série</option>
                                  {seriesDisponiveis.map((serie) => (
                                    <option key={serie} value={serie}>
                                      {serie}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={gab.gabarito}
                                  onChange={(e) => handleAtualizarGabaritoSerie(index, 'gabarito', e.target.value)}
                                  className="select-custom w-24"
                                >
                                  <option value="">Gabarito</option>
                                  <option value="A">A</option>
                                  <option value="B">B</option>
                                  <option value="C">C</option>
                                  <option value="D">D</option>
                                  <option value="E">E</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleRemoverGabaritoSerie(index)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                        <button
                          onClick={() => setMostrarModal(false)}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSalvar}
                          disabled={salvando}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {salvando ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

