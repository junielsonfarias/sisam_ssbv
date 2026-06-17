import { ModalBase, ModalFooter } from '@/components/ui/modal-base'
import { Dispositivo, FormData } from './types'

interface ModalEditarProps {
  dispositivo: Dispositivo
  formData: FormData
  setFormData: (data: FormData) => void
  salvando: boolean
  onEditar: () => void
  onClose: () => void
}

export function ModalEditar({
  formData,
  setFormData,
  salvando,
  onEditar,
  onClose,
}: ModalEditarProps) {
  return (
    <ModalBase aberto onFechar={onClose} titulo="Editar Dispositivo" largura="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nome do Dispositivo *
          </label>
          <input
            type="text"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ativo' | 'inativo' | 'bloqueado' })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="bloqueado">Bloqueado</option>
          </select>
        </div>
      </div>

      <ModalFooter
        onFechar={onClose}
        onSalvar={onEditar}
        salvando={salvando}
        textoSalvar="Salvar"
      />
    </ModalBase>
  )
}
