import { UserPlus, Search, Plus } from 'lucide-react'
import { ModalBase } from '@/components/ui/modal-base'
import { AlunoParaFila } from './types'

interface ModalAdicionarFilaProps {
  modalFila: { turmaId: string; turmaCode: string; escolaId: string }
  buscaAluno: string
  setBuscaAluno: (v: string) => void
  resultadosBusca: AlunoParaFila[]
  buscandoAluno: boolean
  adicionandoFila: boolean
  observacaoFila: string
  setObservacaoFila: (v: string) => void
  adicionarAFila: (alunoId: string) => void
  fecharModal: () => void
  formatSerie: (s: string) => string
}

export default function ModalAdicionarFila({
  modalFila, buscaAluno, setBuscaAluno, resultadosBusca,
  buscandoAluno, adicionandoFila, observacaoFila, setObservacaoFila,
  adicionarAFila, fecharModal, formatSerie
}: ModalAdicionarFilaProps) {
  return (
    <ModalBase aberto={true} onFechar={fecharModal} titulo={`Adicionar à Fila — ${modalFila.turmaCode}`} largura="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-2 -mt-1">
          <UserPlus className="w-4 h-4 text-orange-600" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Turma {modalFila.turmaCode}</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buscar Aluno</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={buscaAluno}
              onChange={e => setBuscaAluno(e.target.value)}
              placeholder="Digite nome, código ou CPF..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
              autoFocus
            />
          </div>
        </div>

        {buscandoAluno && <p className="text-sm text-gray-500">Buscando...</p>}

        {resultadosBusca.length > 0 && (
          <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg divide-y divide-gray-100 dark:divide-slate-700">
            {resultadosBusca.map(aluno => (
              <button
                key={aluno.id}
                onClick={() => adicionarAFila(aluno.id)}
                disabled={adicionandoFila}
                aria-label={`Adicionar ${aluno.nome} à fila`}
                className="w-full flex items-center justify-between p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left disabled:opacity-50"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{aluno.nome}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {aluno.codigo && <span>Cód: {aluno.codigo}</span>}
                    {aluno.escola_nome && <span> | {aluno.escola_nome}</span>}
                    {aluno.serie && <span> | {formatSerie(aluno.serie)}</span>}
                  </div>
                </div>
                <Plus className="w-4 h-4 text-orange-600 flex-shrink-0 ml-2" />
              </button>
            ))}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observação (opcional)</label>
          <input
            type="text"
            value={observacaoFila}
            onChange={e => setObservacaoFila(e.target.value)}
            placeholder="Motivo, contato do responsável..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
          />
        </div>
      </div>
    </ModalBase>
  )
}
