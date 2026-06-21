'use client'

import { Link2, PlusCircle, Inbox } from 'lucide-react'
import { formatarDataHora } from '@/lib/format'
import { EmptyCard } from '@/components/ui/empty-card'
import { BadgeStatus, BadgeTipo, campoStr, descricaoDado } from './helpers'
import type { Divergencia } from './tipos'

interface TabelaDivergenciasProps {
  divergencias: Divergencia[]
  onCadastrar: (divergencia: Divergencia) => void
  onVincular: (divergencia: Divergencia) => void
}

/** Tabela (desktop) + cards (mobile) das divergências de triagem. */
export function TabelaDivergencias({
  divergencias,
  onCadastrar,
  onVincular,
}: TabelaDivergenciasProps) {
  if (divergencias.length === 0) {
    return (
      <EmptyCard
        Icon={Inbox}
        titulo="Nenhuma divergência"
        texto="Não há divergências para os filtros selecionados."
      />
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
      {/* Desktop */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Registro proposto</th>
              <th className="px-4 py-3">Chave tentada</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Detectado em</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {divergencias.map((d) => (
              <tr
                key={d.id}
                className="border-b border-gray-100 dark:border-slate-700/60 last:border-0"
              >
                <td className="px-4 py-3">
                  <BadgeTipo tipo={d.tipo} />
                </td>
                <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                  {descricaoDado(d)}
                  {campoStr(d.dado_etl, 'serie') && (
                    <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">
                      Série: {campoStr(d.dado_etl, 'serie')}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {d.chave_tentada || '—'}
                </td>
                <td className="px-4 py-3">
                  <BadgeStatus status={d.status} />
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {formatarDataHora(d.criado_em)}
                </td>
                <td className="px-4 py-3">
                  <AcoesDivergencia
                    divergencia={d}
                    onCadastrar={onCadastrar}
                    onVincular={onVincular}
                    alinharDireita
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="sm:hidden divide-y divide-gray-100 dark:divide-slate-700/60">
        {divergencias.map((d) => (
          <div key={d.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <BadgeTipo tipo={d.tipo} />
              <BadgeStatus status={d.status} />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {descricaoDado(d)}
            </p>
            {campoStr(d.dado_etl, 'serie') && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Série: {campoStr(d.dado_etl, 'serie')}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Chave: {d.chave_tentada || '—'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Detectado em {formatarDataHora(d.criado_em)}
            </p>
            <AcoesDivergencia
              divergencia={d}
              onCadastrar={onCadastrar}
              onVincular={onVincular}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

interface AcoesProps {
  divergencia: Divergencia
  onCadastrar: (d: Divergencia) => void
  onVincular: (d: Divergencia) => void
  alinharDireita?: boolean
}

/** Botões "Cadastrar no Gestor" / "Vincular a existente" (só para pendentes). */
function AcoesDivergencia({
  divergencia,
  onCadastrar,
  onVincular,
  alinharDireita,
}: AcoesProps) {
  if (divergencia.status !== 'pendente') {
    return (
      <p
        className={`text-xs text-gray-400 dark:text-gray-500 ${alinharDireita ? 'text-right' : ''}`}
      >
        {divergencia.resolvido_por_nome
          ? `Resolvido por ${divergencia.resolvido_por_nome}`
          : 'Já resolvido'}
      </p>
    )
  }

  return (
    <div
      className={`flex flex-wrap gap-2 ${alinharDireita ? 'sm:justify-end' : ''}`}
    >
      <button
        onClick={() => onCadastrar(divergencia)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-3 py-2 text-xs font-medium min-h-[44px]"
      >
        <PlusCircle className="w-4 h-4" />
        Cadastrar no Gestor
      </button>
      <button
        onClick={() => onVincular(divergencia)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 active:opacity-80 px-3 py-2 text-xs font-medium min-h-[44px]"
      >
        <Link2 className="w-4 h-4" />
        Vincular a existente
      </button>
    </div>
  )
}
