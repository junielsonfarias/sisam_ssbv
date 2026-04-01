'use client'

import { X } from 'lucide-react'

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
}

interface FormData {
  codigo: string
  descricao: string
  disciplina: string
  area_conhecimento: string
  dificuldade: string
  gabarito: string
  serie_aplicavel: string
  tipo_questao: string
}

interface ModalQuestaoProps {
  editando: boolean
  formData: FormData
  onFormDataChange: (data: FormData) => void
  configSeries: ConfiguracaoSerie[]
  salvando: boolean
  onSalvar: () => void
  onFechar: () => void
}

export default function ModalQuestao({
  editando,
  formData,
  onFormDataChange,
  configSeries,
  salvando,
  onSalvar,
  onFechar,
}: ModalQuestaoProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
        <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80" onClick={onFechar}></div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl dark:shadow-slate-900/50 max-w-2xl w-full relative z-10 max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editando ? 'Editar Questão' : 'Nova Questão'}
              </h3>
              <button onClick={onFechar} className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código</label>
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) => onFormDataChange({ ...formData, codigo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  placeholder="Ex: Q1, Q2..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Série Aplicável</label>
                <select
                  value={formData.serie_aplicavel}
                  onChange={(e) => onFormDataChange({ ...formData, serie_aplicavel: e.target.value })}
                  className="select-custom w-full"
                >
                  <option value="">Selecione a série</option>
                  {configSeries.map(config => (
                    <option key={config.id} value={config.nome_serie}>
                      {config.nome_serie}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
              <textarea
                value={formData.descricao}
                onChange={(e) => onFormDataChange({ ...formData, descricao: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                placeholder="Descrição da questão"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Questão</label>
                <select
                  value={formData.tipo_questao}
                  onChange={(e) => onFormDataChange({ ...formData, tipo_questao: e.target.value })}
                  className="select-custom w-full"
                >
                  <option value="objetiva">Objetiva</option>
                  <option value="discursiva">Discursiva</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Disciplina</label>
                <select
                  value={formData.disciplina}
                  onChange={(e) => onFormDataChange({ ...formData, disciplina: e.target.value, area_conhecimento: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dificuldade</label>
                <select
                  value={formData.dificuldade}
                  onChange={(e) => onFormDataChange({ ...formData, dificuldade: e.target.value })}
                  className="select-custom w-full"
                >
                  <option value="">Selecione</option>
                  <option value="Fácil">Fácil</option>
                  <option value="Média">Média</option>
                  <option value="Difícil">Difícil</option>
                </select>
              </div>
              {formData.tipo_questao === 'objetiva' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gabarito</label>
                  <select
                    value={formData.gabarito}
                    onChange={(e) => onFormDataChange({ ...formData, gabarito: e.target.value })}
                    className="select-custom w-full"
                  >
                    <option value="">Selecione</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
            <button
              onClick={onFechar}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={onSalvar}
              disabled={salvando}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
