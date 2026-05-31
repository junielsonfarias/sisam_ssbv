'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, X } from 'lucide-react'
import {
  AlunoAeeRow, AlunoBusca, CadastroAee, CADASTRO_VAZIO, INPUT_CLS,
  RECURSOS_DISPONIVEIS, RECURSO_LABEL, TIPOS_DEFICIENCIA, toggleArray,
} from './types'

interface Props {
  aberto: boolean
  alunoSelecionado: AlunoAeeRow | AlunoBusca | null
  cadastro: CadastroAee
  carregando: boolean
  salvando: boolean
  onChangeCadastro: (c: CadastroAee) => void
  onSelecionarAluno: (a: AlunoBusca) => void
  onFechar: () => void
  onSalvar: () => void
}

export function ModalCadastroAee({
  aberto, alunoSelecionado, cadastro, carregando, salvando,
  onChangeCadastro, onSelecionarAluno, onFechar, onSalvar,
}: Props) {
  const [buscaAluno, setBuscaAluno] = useState('')
  const [resultados, setResultados] = useState<AlunoBusca[]>([])
  const [buscando, setBuscando] = useState(false)
  const [cidInput, setCidInput] = useState('')

  useEffect(() => {
    if (!aberto) {
      setBuscaAluno('')
      setResultados([])
      setCidInput('')
    }
  }, [aberto])

  useEffect(() => {
    if (!aberto || alunoSelecionado) return
    if (buscaAluno.trim().length < 2) { setResultados([]); return }
    const controller = new AbortController()
    const t = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await fetch(`/api/admin/alunos?busca=${encodeURIComponent(buscaAluno)}&limite=20`, { signal: controller.signal })
        const data = await res.json()
        setResultados(Array.isArray(data.alunos) ? data.alunos : data.alunos || [])
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setResultados([])
      } finally {
        setBuscando(false)
      }
    }, 350)
    return () => { clearTimeout(t); controller.abort() }
  }, [aberto, buscaAluno, alunoSelecionado])

  if (!aberto) return null

  const set = (patch: Partial<CadastroAee>) => onChangeCadastro({ ...cadastro, ...patch })
  const nomeAluno = alunoSelecionado
    ? ('aluno_nome' in alunoSelecionado ? alunoSelecionado.aluno_nome : alunoSelecionado.nome)
    : null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-cadastro-titulo">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center z-10">
          <h2 id="modal-cadastro-titulo" className="text-lg font-bold text-gray-800 dark:text-gray-200">
            {nomeAluno ? `AEE — ${nomeAluno}` : 'Cadastrar aluno AEE'}
          </h2>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Fechar modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        {carregando ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {!alunoSelecionado && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Buscar aluno</label>
                <input
                  type="text"
                  value={buscaAluno}
                  onChange={(e) => setBuscaAluno(e.target.value)}
                  placeholder="Digite nome ou código (mín. 2 caracteres)"
                  className={`${INPUT_CLS} w-full`}
                  aria-label="Buscar aluno"
                />
                {buscando && <p className="text-xs text-gray-400 mt-2">Buscando...</p>}
                {resultados.length > 0 && (
                  <div className="mt-2 border border-gray-200 dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto">
                    {resultados.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          onSelecionarAluno(r)
                          setBuscaAluno('')
                          setResultados([])
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm"
                      >
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{r.nome}</p>
                        <p className="text-xs text-gray-400">{r.codigo} {r.serie && `• ${r.serie}`}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {alunoSelecionado && (
              <>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-sm">
                  <strong className="text-purple-700 dark:text-purple-300">{nomeAluno}</strong>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-2 block">Tipos de deficiência *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TIPOS_DEFICIENCIA.map((t) => (
                      <label key={t.v} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <input
                          type="checkbox"
                          checked={cadastro.tipos_deficiencia.includes(t.v)}
                          onChange={() => set({ tipos_deficiencia: toggleArray(cadastro.tipos_deficiencia, t.v) })}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        {t.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Códigos CID-10 / CID-11</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={cidInput}
                      onChange={(e) => setCidInput(e.target.value)}
                      placeholder="Ex: F84.0"
                      className={`${INPUT_CLS} flex-1`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && cidInput.trim()) {
                          e.preventDefault()
                          set({ cid_codigos: [...cadastro.cid_codigos, cidInput.trim()] })
                          setCidInput('')
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (cidInput.trim()) {
                          set({ cid_codigos: [...cadastro.cid_codigos, cidInput.trim()] })
                          setCidInput('')
                        }
                      }}
                      className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm"
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {cadastro.cid_codigos.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 flex items-center gap-1">
                        {c}
                        <button
                          onClick={() => set({ cid_codigos: cadastro.cid_codigos.filter((_, j) => j !== i) })}
                          aria-label={`Remover CID ${c}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-4 space-y-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cadastro.laudo_medico}
                      onChange={(e) => set({ laudo_medico: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="font-semibold text-gray-700 dark:text-gray-200">Possui laudo médico</span>
                  </label>
                  {cadastro.laudo_medico && (
                    <div className="grid sm:grid-cols-2 gap-3 pl-6">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Data do laudo</label>
                        <input type="date" value={cadastro.laudo_data} onChange={(e) => set({ laudo_data: e.target.value })} className={`${INPUT_CLS} w-full`} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Emitido por</label>
                        <input type="text" value={cadastro.laudo_emitido_por} onChange={(e) => set({ laudo_emitido_por: e.target.value })} placeholder="Médico/Instituição" className={`${INPUT_CLS} w-full`} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs text-gray-500 block mb-1">URL do arquivo do laudo</label>
                        <input type="url" value={cadastro.laudo_arquivo_url} onChange={(e) => set({ laudo_arquivo_url: e.target.value })} placeholder="https://..." className={`${INPUT_CLS} w-full`} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <input
                      type="checkbox"
                      checked={cadastro.necessita_cuidador}
                      onChange={(e) => set({ necessita_cuidador: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    Necessita cuidador
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <input
                      type="checkbox"
                      checked={cadastro.necessita_interprete}
                      onChange={(e) => set({ necessita_interprete: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    Necessita intérprete
                  </label>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-2 block">Recursos especiais</label>
                  <div className="flex flex-wrap gap-2">
                    {RECURSOS_DISPONIVEIS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => set({ recursos_especiais: toggleArray(cadastro.recursos_especiais, r) })}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                          cadastro.recursos_especiais.includes(r)
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {RECURSO_LABEL[r]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Frequência do AEE</label>
                  <input
                    type="text"
                    value={cadastro.frequencia_aee}
                    onChange={(e) => set({ frequencia_aee: e.target.value })}
                    placeholder="Ex: 2x por semana"
                    className={`${INPUT_CLS} w-full`}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                  <textarea
                    value={cadastro.observacoes}
                    onChange={(e) => set({ observacoes: e.target.value })}
                    rows={3}
                    className={`${INPUT_CLS} w-full`}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {alunoSelecionado && (
          <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
            <button onClick={onFechar} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
            <button
              onClick={onSalvar}
              disabled={salvando}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 disabled:opacity-50"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Reaproveita CADASTRO_VAZIO de types.ts — sem export local.
void CADASTRO_VAZIO
