import { useState, useCallback } from 'react'

interface UseModalOptions<T, F> {
  /** Dados iniciais do formulário */
  formDataInicial: F
  /** Função para extrair dados do item para o formulário */
  itemParaFormData?: (item: T) => F
}

interface UseModalReturn<T, F> {
  /** Se o modal está visível */
  mostrarModal: boolean
  /** Item sendo editado (null se novo) */
  itemEditando: T | null
  /** Dados do formulário */
  formData: F
  /** Atualiza dados do formulário */
  setFormData: React.Dispatch<React.SetStateAction<F>>
  /** Abre o modal para edição ou criação */
  abrirModal: (item?: T) => void
  /** Fecha o modal e reseta o estado */
  fecharModal: () => void
  /** Verifica se está em modo de edição */
  isEdicao: boolean
}

/**
 * Hook para gerenciar estado de modais de formulário
 *
 * @example
 * const { mostrarModal, itemEditando, formData, setFormData, abrirModal, fecharModal, isEdicao } = useModal({
 *   formDataInicial: { nome: '', codigo: '' },
 *   itemParaFormData: (polo) => ({ nome: polo.nome, codigo: polo.codigo || '' })
 * })
 *
 * // Abrir para novo item
 * abrirModal()
 *
 * // Abrir para editar item existente
 * abrirModal(polo)
 */
export function useModal<T, F extends Record<string, unknown>>({
  formDataInicial,
  itemParaFormData,
}: UseModalOptions<T, F>): UseModalReturn<T, F> {
  const [mostrarModal, setMostrarModal] = useState(false)
  const [itemEditando, setItemEditando] = useState<T | null>(null)
  const [formData, setFormData] = useState<F>(formDataInicial)

  const abrirModal = useCallback(
    (item?: T) => {
      if (item) {
        setItemEditando(item)
        if (itemParaFormData) {
          setFormData(itemParaFormData(item))
        }
      } else {
        setItemEditando(null)
        setFormData(formDataInicial)
      }
      setMostrarModal(true)
    },
    [formDataInicial, itemParaFormData]
  )

  const fecharModal = useCallback(() => {
    setMostrarModal(false)
    setItemEditando(null)
    setFormData(formDataInicial)
  }, [formDataInicial])

  return {
    mostrarModal,
    itemEditando,
    formData,
    setFormData,
    abrirModal,
    fecharModal,
    isEdicao: itemEditando !== null,
  }
}
