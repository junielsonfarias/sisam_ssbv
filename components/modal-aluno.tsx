'use client'

import { X } from 'lucide-react'

interface ModalAlunoProps {
  mostrar: boolean
  alunoEditando: any
  formData: any
  setFormData: (data: any) => void
  polos: any[]
  escolas: any[]
  turmas: any[]
  seriesDisponiveis: string[]
  salvando: boolean
  onClose: () => void
  onSalvar: () => void
  onPoloChange: (poloId: string) => void
  onEscolaChange: (escolaId: string) => void
}

export default function ModalAluno({
  mostrar,
  alunoEditando,
  formData,
  setFormData,
  polos,
  escolas,
  turmas,
  seriesDisponiveis,
  salvando,
  onClose,
  onSalvar,
  onPoloChange,
  onEscolaChange,
}: ModalAlunoProps) {
  if (!mostrar) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-3 sm:px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full mx-3 sm:mx-0">
          <div className="bg-white px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                {alunoEditando ? 'Editar Aluno' : 'Novo Aluno'}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500 p-1">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                  placeholder="Código do aluno (opcional)"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                  placeholder="Nome completo do aluno"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Polo *</label>
                  <select
                    value={formData.polo_id}
                    onChange={(e) => {
                      setFormData({ ...formData, polo_id: e.target.value, escola_id: '', turma_id: '' })
                      onPoloChange(e.target.value)
                    }}
                    className="select-custom w-full"
                    required
                  >
                    <option value="">Selecione o polo</option>
                    {polos.map((polo) => (
                      <option key={polo.id} value={polo.id}>
                        {polo.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Escola *</label>
                  <select
                    value={formData.escola_id}
                    onChange={(e) => {
                      setFormData({ ...formData, escola_id: e.target.value, turma_id: '' })
                      onEscolaChange(e.target.value)
                    }}
                    className="select-custom w-full"
                    disabled={!formData.polo_id}
                    required
                  >
                    <option value="">Selecione a escola</option>
                    {escolas.map((escola) => (
                      <option key={escola.id} value={escola.id}>
                        {escola.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Turma</label>
                  <select
                    value={formData.turma_id}
                    onChange={(e) => setFormData({ ...formData, turma_id: e.target.value })}
                    className="select-custom w-full text-sm sm:text-base"
                    disabled={!formData.escola_id}
                  >
                    <option value="">Selecione a turma (opcional)</option>
                    {turmas.map((turma) => (
                      <option key={turma.id} value={turma.id}>
                        {turma.codigo} - {turma.nome || ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Série</label>
                  <select
                    value={formData.serie}
                    onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
                    className="select-custom w-full text-sm sm:text-base"
                  >
                    <option value="">Selecione a série (opcional)</option>
                    {seriesDisponiveis.map((serie) => (
                      <option key={serie} value={serie}>
                        {serie}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Ano Letivo</label>
                <input
                  type="text"
                  value={formData.ano_letivo}
                  onChange={(e) => setFormData({ ...formData, ano_letivo: e.target.value })}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                  placeholder="Ex: 2025"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
                >
                  Cancelar
                </button>
                <button
                  onClick={onSalvar}
                  disabled={salvando}
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

