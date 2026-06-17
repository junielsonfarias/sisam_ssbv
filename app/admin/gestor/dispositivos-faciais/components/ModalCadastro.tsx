import { ModalBase, ModalFooter } from '@/components/ui/modal-base'
import { Escola, FormData } from './types'

interface ModalCadastroProps {
  formData: FormData
  setFormData: (data: FormData) => void
  escolas: Escola[]
  salvando: boolean
  onCadastrar: () => void
  onClose: () => void
}

export function ModalCadastro({
  formData,
  setFormData,
  escolas,
  salvando,
  onCadastrar,
  onClose,
}: ModalCadastroProps) {
  return (
    <ModalBase aberto onFechar={onClose} titulo="Novo Dispositivo" largura="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nome do Dispositivo *
          </label>
          <input
            type="text"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            placeholder="Ex: Dispositivo Entrada Principal"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Escola *
          </label>
          <select
            value={formData.escola_id}
            onChange={(e) => setFormData({ ...formData, escola_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Selecione a escola</option>
            {escolas.map((escola) => (
              <option key={escola.id} value={escola.id}>
                {escola.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Localizacao
          </label>
          <input
            type="text"
            value={formData.localizacao}
            onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
            placeholder="Ex: Portaria principal"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      <ModalFooter
        onFechar={onClose}
        onSalvar={onCadastrar}
        salvando={salvando}
        textoSalvar="Cadastrar"
        textoSalvando="Cadastrando..."
      />
    </ModalBase>
  )
}
