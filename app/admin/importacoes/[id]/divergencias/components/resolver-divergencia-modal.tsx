'use client'

import { useState } from 'react'
import { ModalBase, ModalFooter } from '@/components/ui/modal-base'
import { useToast } from '@/components/toast'
import { campoStr, descricaoDado } from './helpers'
import type { Divergencia } from './tipos'

interface ResolverDivergenciaModalProps {
  importacaoId: string
  divergencia: Divergencia
  acao: 'cadastrar_no_gestor' | 'vincular_a_existente'
  onFechar: () => void
  onResolvido: () => void
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Modal de resolução de uma divergência (ADR-001). Para `cadastrar_no_gestor`
 * apenas confirma; para `vincular_a_existente` exige o id do registro mestre.
 * Chama PATCH /api/admin/importacoes/[id]/triagem/[divergenciaId].
 */
export function ResolverDivergenciaModal({
  importacaoId,
  divergencia,
  acao,
  onFechar,
  onResolvido,
}: ResolverDivergenciaModalProps) {
  const toast = useToast()
  const [vinculadoAId, setVinculadoAId] = useState('')
  const [salvando, setSalvando] = useState(false)

  const ehVincular = acao === 'vincular_a_existente'
  const rotuloTipo = divergencia.tipo === 'turma' ? 'turma' : 'aluno'
  const idValido = !ehVincular || UUID_RE.test(vinculadoAId.trim())

  const salvar = async () => {
    if (!idValido) {
      toast.error('Informe um identificador válido')
      return
    }
    setSalvando(true)
    try {
      const corpo: Record<string, string> = { acao }
      if (ehVincular) corpo.vinculado_a_id = vinculadoAId.trim()

      const res = await fetch(
        `/api/admin/importacoes/${importacaoId}/triagem/${divergencia.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(corpo),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.mensagem || 'Não foi possível resolver a divergência')
        return
      }
      toast.success(data.mensagem || 'Divergência resolvida')
      onResolvido()
    } catch {
      toast.error('Erro ao resolver a divergência')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <ModalBase
      aberto
      onFechar={onFechar}
      titulo={ehVincular ? 'Vincular a registro existente' : 'Cadastrar no Gestor'}
      largura="lg"
    >
      <div className="space-y-4">
        <dl className="rounded-lg bg-gray-50 dark:bg-slate-700/40 border border-gray-200 dark:border-slate-600 px-4 py-3 text-sm">
          <div className="flex justify-between gap-4 py-0.5">
            <dt className="text-gray-500 dark:text-gray-400">Tipo</dt>
            <dd className="text-gray-900 dark:text-white capitalize">{rotuloTipo}</dd>
          </div>
          <div className="flex justify-between gap-4 py-0.5">
            <dt className="text-gray-500 dark:text-gray-400">Registro</dt>
            <dd className="text-gray-900 dark:text-white text-right">{descricaoDado(divergencia)}</dd>
          </div>
          {campoStr(divergencia.dado_etl, 'serie') && (
            <div className="flex justify-between gap-4 py-0.5">
              <dt className="text-gray-500 dark:text-gray-400">Série</dt>
              <dd className="text-gray-900 dark:text-white text-right">
                {campoStr(divergencia.dado_etl, 'serie')}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-4 py-0.5">
            <dt className="text-gray-500 dark:text-gray-400">Chave tentada</dt>
            <dd className="text-gray-900 dark:text-white text-right">
              {divergencia.chave_tentada || '—'}
            </dd>
          </div>
        </dl>

        {ehVincular ? (
          <div>
            <label
              htmlFor="vinculado-a-id"
              className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
            >
              Identificador do {rotuloTipo} no Gestor
            </label>
            <input
              id="vinculado-a-id"
              type="text"
              value={vinculadoAId}
              onChange={(e) => setVinculadoAId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Cole o ID (UUID) do {rotuloTipo} já cadastrado para vincular esta divergência.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Esta ação criará um novo registro de {rotuloTipo} no Gestor com os dados
            de origem e marcará a divergência como vinculada.
          </p>
        )}
      </div>

      <ModalFooter
        onFechar={onFechar}
        onSalvar={salvar}
        salvando={salvando}
        desabilitado={!idValido}
        textoSalvar={ehVincular ? 'Vincular' : 'Cadastrar no Gestor'}
        textoSalvando="Salvando..."
      />
    </ModalBase>
  )
}
