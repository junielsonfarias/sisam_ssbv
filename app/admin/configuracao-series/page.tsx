'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useEffect, useState } from 'react'
import { Settings, Save, Plus, X, BookOpen, Calculator, FileText, Check, AlertTriangle } from 'lucide-react'

interface ConfiguracaoSerie {
  id: string
  serie: string
  nome_serie: string
  qtd_questoes_lp: number
  qtd_questoes_mat: number
  qtd_questoes_ch: number
  qtd_questoes_cn: number
  total_questoes_objetivas: number
  tem_producao_textual: boolean
  qtd_itens_producao: number
  avalia_lp: boolean
  avalia_mat: boolean
  avalia_ch: boolean
  avalia_cn: boolean
  usa_nivel_aprendizagem: boolean
  ativo: boolean
}

export default function ConfiguracaoSeriesPage() {
  const [series, setSeries] = useState<ConfiguracaoSerie[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<ConfiguracaoSerie>>({})
  const [mostrarNovaSerieModal, setMostrarNovaSerieModal] = useState(false)
  const [novaSerieData, setNovaSerieData] = useState({
    serie: '',
    nome_serie: '',
    qtd_questoes_lp: 0,
    qtd_questoes_mat: 0,
    qtd_questoes_ch: 0,
    qtd_questoes_cn: 0,
    tem_producao_textual: false,
    qtd_itens_producao: 0,
    avalia_lp: true,
    avalia_mat: true,
    avalia_ch: false,
    avalia_cn: false,
    usa_nivel_aprendizagem: false,
  })
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null)

  useEffect(() => {
    carregarSeries()
  }, [])

  const carregarSeries = async () => {
    try {
      const response = await fetch('/api/admin/configuracao-series')
      const data = await response.json()
      if (data.series) {
        setSeries(data.series)
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar configurações' })
    } finally {
      setCarregando(false)
    }
  }

  const handleEditar = (config: ConfiguracaoSerie) => {
    setEditando(config.id)
    setFormData({ ...config })
  }

  const handleCancelarEdicao = () => {
    setEditando(null)
    setFormData({})
  }

  const handleSalvar = async (config: ConfiguracaoSerie) => {
    setSalvando(config.id)
    try {
      const response = await fetch('/api/admin/configuracao-series', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serie: config.serie,
          ...formData,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMensagem({ tipo: 'sucesso', texto: `Configuração do ${config.nome_serie} atualizada com sucesso!` })
        await carregarSeries()
        setEditando(null)
        setFormData({})
      } else {
        setMensagem({ tipo: 'erro', texto: data.mensagem || 'Erro ao salvar' })
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar configuração' })
    } finally {
      setSalvando(null)
    }
  }

  const handleCriarSerie = async () => {
    if (!novaSerieData.serie || !novaSerieData.nome_serie) {
      setMensagem({ tipo: 'erro', texto: 'Preencha o número e nome da série' })
      return
    }

    setSalvando('nova')
    try {
      const response = await fetch('/api/admin/configuracao-series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaSerieData),
      })

      const data = await response.json()

      if (response.ok) {
        setMensagem({ tipo: 'sucesso', texto: 'Nova série criada com sucesso!' })
        await carregarSeries()
        setMostrarNovaSerieModal(false)
        setNovaSerieData({
          serie: '',
          nome_serie: '',
          qtd_questoes_lp: 0,
          qtd_questoes_mat: 0,
          qtd_questoes_ch: 0,
          qtd_questoes_cn: 0,
          tem_producao_textual: false,
          qtd_itens_producao: 0,
          avalia_lp: true,
          avalia_mat: true,
          avalia_ch: false,
          avalia_cn: false,
          usa_nivel_aprendizagem: false,
        })
      } else {
        setMensagem({ tipo: 'erro', texto: data.mensagem || 'Erro ao criar série' })
      }
    } catch (error) {
      console.error('Erro ao criar série:', error)
      setMensagem({ tipo: 'erro', texto: 'Erro ao criar série' })
    } finally {
      setSalvando(null)
    }
  }

  const calcularTotalQuestoes = (config: Partial<ConfiguracaoSerie>) => {
    return (config.qtd_questoes_lp || 0) +
           (config.qtd_questoes_mat || 0) +
           (config.qtd_questoes_ch || 0) +
           (config.qtd_questoes_cn || 0)
  }

  const getTipoAvaliacaoLabel = (config: ConfiguracaoSerie) => {
    if (config.tem_producao_textual) {
      return 'Anos Iniciais (Objetiva + Produção Textual)'
    }
    return 'Anos Finais (Objetiva)'
  }

  const getTipoAvaliacaoColor = (config: ConfiguracaoSerie) => {
    if (config.tem_producao_textual) {
      return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-200'
    }
    return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-200'
  }

  // Limpar mensagem após 5 segundos
  useEffect(() => {
    if (mensagem) {
      const timer = setTimeout(() => setMensagem(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [mensagem])

  return (
    <ProtectedRoute tiposPermitidos={['administrador']}>
      <LayoutDashboard tipoUsuario="admin">
        <div className="space-y-6">
          {/* Cabeçalho */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Settings className="w-8 h-8 text-indigo-600" />
                Configuração de Séries
              </h1>
              <p className="text-gray-600 mt-1">
                Configure a quantidade de questões e tipo de avaliação para cada série
              </p>
            </div>
            <button
              onClick={() => setMostrarNovaSerieModal(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nova Série
            </button>
          </div>

          {/* Mensagem de feedback */}
          {mensagem && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              mensagem.tipo === 'sucesso'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {mensagem.tipo === 'sucesso' ? (
                <Check className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              )}
              <span>{mensagem.texto}</span>
            </div>
          )}

          {/* Cards de Configuração */}
          {carregando ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Carregando configurações...</p>
            </div>
          ) : series.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-12 text-center">
              <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Nenhuma série configurada</p>
              <p className="text-sm text-gray-400 mt-2">Clique em "Nova Série" para começar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {series.map((config) => {
                const estaEditando = editando === config.id
                const dados = estaEditando ? formData : config

                return (
                  <div
                    key={config.id}
                    className={`bg-white dark:bg-slate-800 rounded-xl shadow-md border-2 transition-all ${
                      estaEditando ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'
                    }`}
                  >
                    {/* Cabeçalho do Card */}
                    <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-6 py-4 border-b border-indigo-200 rounded-t-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xl">
                            {config.serie}º
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{config.nome_serie}</h3>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getTipoAvaliacaoColor(config)}`}>
                              {getTipoAvaliacaoLabel(config)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{config.total_questoes_objetivas}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">questões objetivas</p>
                        </div>
                      </div>
                    </div>

                    {/* Corpo do Card */}
                    <div className="p-6 space-y-6">
                      {/* Questões por Disciplina */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          Questões Objetivas por Disciplina
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className={`p-3 rounded-lg border ${dados.avalia_lp ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Língua Portuguesa</label>
                            {estaEditando ? (
                              <input
                                type="number"
                                min="0"
                                value={dados.qtd_questoes_lp || 0}
                                onChange={(e) => setFormData({ ...formData, qtd_questoes_lp: parseInt(e.target.value) || 0 })}
                                className="w-full px-2 py-1 text-lg font-bold border rounded focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : (
                              <p className="text-2xl font-bold text-blue-600">{config.qtd_questoes_lp}</p>
                            )}
                          </div>
                          <div className={`p-3 rounded-lg border ${dados.avalia_mat ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Matemática</label>
                            {estaEditando ? (
                              <input
                                type="number"
                                min="0"
                                value={dados.qtd_questoes_mat || 0}
                                onChange={(e) => setFormData({ ...formData, qtd_questoes_mat: parseInt(e.target.value) || 0 })}
                                className="w-full px-2 py-1 text-lg font-bold border rounded focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : (
                              <p className="text-2xl font-bold text-purple-600">{config.qtd_questoes_mat}</p>
                            )}
                          </div>
                          <div className={`p-3 rounded-lg border ${dados.avalia_ch ? 'bg-green-50 border-green-200' : 'bg-gray-100 border-gray-200'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Ciências Humanas</label>
                              {estaEditando && (
                                <input
                                  type="checkbox"
                                  checked={dados.avalia_ch || false}
                                  onChange={(e) => setFormData({ ...formData, avalia_ch: e.target.checked, qtd_questoes_ch: e.target.checked ? formData.qtd_questoes_ch || 0 : 0 })}
                                  className="w-4 h-4 text-indigo-600 rounded"
                                />
                              )}
                            </div>
                            {estaEditando ? (
                              <input
                                type="number"
                                min="0"
                                value={dados.qtd_questoes_ch || 0}
                                disabled={!dados.avalia_ch}
                                onChange={(e) => setFormData({ ...formData, qtd_questoes_ch: parseInt(e.target.value) || 0 })}
                                className="w-full px-2 py-1 text-lg font-bold border rounded focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            ) : (
                              <p className={`text-2xl font-bold ${config.avalia_ch ? 'text-green-600' : 'text-gray-400'}`}>
                                {config.avalia_ch ? config.qtd_questoes_ch : '-'}
                              </p>
                            )}
                          </div>
                          <div className={`p-3 rounded-lg border ${dados.avalia_cn ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-100 border-gray-200'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Ciências da Natureza</label>
                              {estaEditando && (
                                <input
                                  type="checkbox"
                                  checked={dados.avalia_cn || false}
                                  onChange={(e) => setFormData({ ...formData, avalia_cn: e.target.checked, qtd_questoes_cn: e.target.checked ? formData.qtd_questoes_cn || 0 : 0 })}
                                  className="w-4 h-4 text-indigo-600 rounded"
                                />
                              )}
                            </div>
                            {estaEditando ? (
                              <input
                                type="number"
                                min="0"
                                value={dados.qtd_questoes_cn || 0}
                                disabled={!dados.avalia_cn}
                                onChange={(e) => setFormData({ ...formData, qtd_questoes_cn: parseInt(e.target.value) || 0 })}
                                className="w-full px-2 py-1 text-lg font-bold border rounded focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            ) : (
                              <p className={`text-2xl font-bold ${config.avalia_cn ? 'text-yellow-600' : 'text-gray-400'}`}>
                                {config.avalia_cn ? config.qtd_questoes_cn : '-'}
                              </p>
                            )}
                          </div>
                        </div>
                        {estaEditando && (
                          <p className="text-sm text-gray-500 mt-2 text-right">
                            Total: <span className="font-bold text-indigo-600 dark:text-indigo-400">{calcularTotalQuestoes(formData)} questões</span>
                          </p>
                        )}
                      </div>

                      {/* Produção Textual */}
                      <div className={`p-4 rounded-lg border ${dados.tem_producao_textual ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className={`w-5 h-5 ${dados.tem_producao_textual ? 'text-orange-600' : 'text-gray-400'}`} />
                            <span className="font-medium text-gray-700 dark:text-gray-300">Produção Textual</span>
                          </div>
                          {estaEditando ? (
                            <input
                              type="checkbox"
                              checked={dados.tem_producao_textual || false}
                              onChange={(e) => setFormData({
                                ...formData,
                                tem_producao_textual: e.target.checked,
                                qtd_itens_producao: e.target.checked ? 8 : 0
                              })}
                              className="w-5 h-5 text-indigo-600 rounded"
                            />
                          ) : (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              config.tem_producao_textual ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {config.tem_producao_textual ? 'Habilitado' : 'Desabilitado'}
                            </span>
                          )}
                        </div>
                        {dados.tem_producao_textual && (
                          <div className="mt-3 flex items-center gap-3">
                            <label className="text-sm text-gray-600 dark:text-gray-400">Quantidade de itens:</label>
                            {estaEditando ? (
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={dados.qtd_itens_producao || 8}
                                onChange={(e) => setFormData({ ...formData, qtd_itens_producao: parseInt(e.target.value) || 8 })}
                                className="w-20 px-2 py-1 text-center font-bold border rounded focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : (
                              <span className="text-lg font-bold text-orange-600">{config.qtd_itens_producao}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Nível de Aprendizagem */}
                      <div className={`p-4 rounded-lg border ${dados.usa_nivel_aprendizagem ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calculator className={`w-5 h-5 ${dados.usa_nivel_aprendizagem ? 'text-indigo-600' : 'text-gray-400'}`} />
                            <span className="font-medium text-gray-700 dark:text-gray-300">Nível de Aprendizagem</span>
                          </div>
                          {estaEditando ? (
                            <input
                              type="checkbox"
                              checked={dados.usa_nivel_aprendizagem || false}
                              onChange={(e) => setFormData({ ...formData, usa_nivel_aprendizagem: e.target.checked })}
                              className="w-5 h-5 text-indigo-600 rounded"
                            />
                          ) : (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              config.usa_nivel_aprendizagem ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {config.usa_nivel_aprendizagem ? 'Habilitado' : 'Desabilitado'}
                            </span>
                          )}
                        </div>
                        {dados.usa_nivel_aprendizagem && (
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Classifica alunos em: Insuficiente, Básico, Adequado, Avançado
                          </p>
                        )}
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-slate-700">
                        {estaEditando ? (
                          <>
                            <button
                              onClick={handleCancelarEdicao}
                              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSalvar(config)}
                              disabled={salvando === config.id}
                              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                              {salvando === config.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                  Salvando...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4" />
                                  Salvar
                                </>
                              )}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleEditar(config)}
                            className="flex items-center gap-2 px-4 py-2 border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                          >
                            <Settings className="w-4 h-4" />
                            Editar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Modal Nova Série */}
          {mostrarNovaSerieModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setMostrarNovaSerieModal(false)}></div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full relative z-10 max-h-[90vh] overflow-y-auto">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nova Configuração de Série</h3>
                      <button onClick={() => setMostrarNovaSerieModal(false)} className="text-gray-400 hover:text-gray-500 dark:text-gray-400">
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Dados Básicos */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Número da Série *</label>
                        <input
                          type="text"
                          value={novaSerieData.serie}
                          onChange={(e) => setNovaSerieData({ ...novaSerieData, serie: e.target.value.replace(/\D/g, '') })}
                          placeholder="Ex: 6"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Série *</label>
                        <input
                          type="text"
                          value={novaSerieData.nome_serie}
                          onChange={(e) => setNovaSerieData({ ...novaSerieData, nome_serie: e.target.value })}
                          placeholder="Ex: 6º Ano"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Questões por Disciplina */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Questões Objetivas por Disciplina</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Língua Portuguesa</label>
                          <input
                            type="number"
                            min="0"
                            value={novaSerieData.qtd_questoes_lp}
                            onChange={(e) => setNovaSerieData({ ...novaSerieData, qtd_questoes_lp: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Matemática</label>
                          <input
                            type="number"
                            min="0"
                            value={novaSerieData.qtd_questoes_mat}
                            onChange={(e) => setNovaSerieData({ ...novaSerieData, qtd_questoes_mat: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <input
                              type="checkbox"
                              checked={novaSerieData.avalia_ch}
                              onChange={(e) => setNovaSerieData({ ...novaSerieData, avalia_ch: e.target.checked })}
                              className="w-4 h-4 text-indigo-600 rounded"
                            />
                            <label className="text-xs text-gray-600 dark:text-gray-400">Ciências Humanas</label>
                          </div>
                          <input
                            type="number"
                            min="0"
                            disabled={!novaSerieData.avalia_ch}
                            value={novaSerieData.qtd_questoes_ch}
                            onChange={(e) => setNovaSerieData({ ...novaSerieData, qtd_questoes_ch: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <input
                              type="checkbox"
                              checked={novaSerieData.avalia_cn}
                              onChange={(e) => setNovaSerieData({ ...novaSerieData, avalia_cn: e.target.checked })}
                              className="w-4 h-4 text-indigo-600 rounded"
                            />
                            <label className="text-xs text-gray-600 dark:text-gray-400">Ciências da Natureza</label>
                          </div>
                          <input
                            type="number"
                            min="0"
                            disabled={!novaSerieData.avalia_cn}
                            value={novaSerieData.qtd_questoes_cn}
                            onChange={(e) => setNovaSerieData({ ...novaSerieData, qtd_questoes_cn: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                          />
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-2 text-right">
                        Total: <span className="font-bold">{calcularTotalQuestoes(novaSerieData)} questões objetivas</span>
                      </p>
                    </div>

                    {/* Produção Textual */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-gray-600" />
                        <span className="font-medium text-gray-700 dark:text-gray-300">Produção Textual</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={novaSerieData.tem_producao_textual}
                          onChange={(e) => setNovaSerieData({
                            ...novaSerieData,
                            tem_producao_textual: e.target.checked,
                            qtd_itens_producao: e.target.checked ? 8 : 0
                          })}
                          className="w-5 h-5 text-indigo-600 rounded"
                        />
                        {novaSerieData.tem_producao_textual && (
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={novaSerieData.qtd_itens_producao}
                            onChange={(e) => setNovaSerieData({ ...novaSerieData, qtd_itens_producao: parseInt(e.target.value) || 8 })}
                            className="w-16 px-2 py-1 text-center border rounded"
                          />
                        )}
                      </div>
                    </div>

                    {/* Nível de Aprendizagem */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-gray-600" />
                        <span className="font-medium text-gray-700 dark:text-gray-300">Usa Nível de Aprendizagem</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={novaSerieData.usa_nivel_aprendizagem}
                        onChange={(e) => setNovaSerieData({ ...novaSerieData, usa_nivel_aprendizagem: e.target.checked })}
                        className="w-5 h-5 text-indigo-600 rounded"
                      />
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                      onClick={() => setMostrarNovaSerieModal(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCriarSerie}
                      disabled={salvando === 'nova'}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {salvando === 'nova' ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Criando...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Criar Série
                        </>
                      )}
                    </button>
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
