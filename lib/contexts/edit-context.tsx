'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface EditContextType {
  /** Dados do formulario */
  form: Record<string, unknown>
  /** Se esta em modo edicao */
  editando: boolean
  /** Se esta salvando */
  salvando: boolean
  /** Atualizar campo do formulario */
  updateForm: (campo: string, valor: unknown) => void
  /** Setar formulario inteiro */
  setForm: (dados: Record<string, unknown>) => void
  /** Alternar modo edicao */
  setEditando: (v: boolean) => void
  /** Setar salvando */
  setSalvando: (v: boolean) => void
}

const EditContext = createContext<EditContextType | null>(null)

interface EditProviderProps {
  children: ReactNode
  dadosIniciais?: Record<string, unknown>
}

/**
 * Provider para compartilhar estado de edicao entre componentes de abas.
 * Elimina prop drilling de form/editando/updateForm por 4+ niveis.
 *
 * @example
 * // No page.tsx pai:
 * <EditProvider dadosIniciais={aluno}>
 *   <AbaDadosPessoais />
 *   <AbaDocumentos />
 *   <AbaEndereco />
 * </EditProvider>
 *
 * // Em qualquer aba filha:
 * const { form, editando, updateForm } = useEdit()
 */
export function EditProvider({ children, dadosIniciais = {} }: EditProviderProps) {
  const [form, setFormState] = useState<Record<string, unknown>>(dadosIniciais)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const updateForm = useCallback((campo: string, valor: unknown) => {
    setFormState(prev => ({ ...prev, [campo]: valor }))
  }, [])

  const setForm = useCallback((dados: Record<string, unknown>) => {
    setFormState(dados)
  }, [])

  return (
    <EditContext.Provider value={{ form, editando, salvando, updateForm, setForm, setEditando, setSalvando }}>
      {children}
    </EditContext.Provider>
  )
}

/**
 * Hook para acessar o contexto de edicao.
 * Deve ser usado dentro de um EditProvider.
 */
export function useEdit(): EditContextType {
  const context = useContext(EditContext)
  if (!context) {
    throw new Error('useEdit deve ser usado dentro de um EditProvider')
  }
  return context
}
