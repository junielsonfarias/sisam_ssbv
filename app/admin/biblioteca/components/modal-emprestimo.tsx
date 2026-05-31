'use client'

import { useEffect, useState } from 'react'
import { ArrowLeftRight, Bookmark, Loader2, Search, X } from 'lucide-react'
import {
  AlunoBusca,
  FormEmprestimo,
  INPUT_CLS,
  ItemAcervo,
  Pessoa,
  ServidorBusca,
  TipoTomador,
} from './types'

interface Props {
  aberto: boolean
  modoReserva: boolean
  acervo: ItemAcervo[]
  form: FormEmprestimo
  salvando: boolean
  onChange: (form: FormEmprestimo) => void
  onFechar: () => void
  onConfirmar: (pessoa: Pessoa, tipoTomador: TipoTomador) => void
}

export function ModalEmprestimo({
  aberto, modoReserva, acervo, form, salvando, onChange, onFechar, onConfirmar,
}: Props) {
  const [tipoTomador, setTipoTomador] = useState<TipoTomador>('aluno')
  const [buscaPessoa, setBuscaPessoa] = useState('')
  const [pessoasResultado, setPessoasResultado] = useState<Pessoa[]>([])
  const [buscandoPessoa, setBuscandoPessoa] = useState(false)
  const [pessoaSelecionada, setPessoaSelecionada] = useState<Pessoa | null>(null)

  // Reset ao abrir
  useEffect(() => {
    if (aberto) {
      setTipoTomador('aluno')
      setBuscaPessoa('')
      setPessoasResultado([])
      setPessoaSelecionada(null)
    }
  }, [aberto])

  // Debounce busca aluno/servidor — só dispara se ≥2 chars
  useEffect(() => {
    if (!aberto || pessoaSelecionada) return
    if (buscaPessoa.trim().length < 2) {
      setPessoasResultado([])
      return
    }
    const controller = new AbortController()
    const t = setTimeout(async () => {
      setBuscandoPessoa(true)
      try {
        if (tipoTomador === 'aluno') {
          const res = await fetch(
            `/api/admin/alunos?busca=${encodeURIComponent(buscaPessoa.trim())}&limite=15`,
            { signal: controller.signal }
          )
          const data = await res.json()
          const lista: AlunoBusca[] = Array.isArray(data) ? data : data.alunos || []
          setPessoasResultado(lista)
        } else {
          const res = await fetch(
            `/api/admin/rh?recurso=servidores&busca=${encodeURIComponent(buscaPessoa.trim())}&limite=15`,
            { signal: controller.signal }
          )
          const data = await res.json()
          setPessoasResultado(data.servidores || [])
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setPessoasResultado([])
      } finally {
        setBuscandoPessoa(false)
      }
    }, 350)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [aberto, buscaPessoa, tipoTomador, pessoaSelecionada])

  if (!aberto) return null

  const itensFiltrados = modoReserva ? acervo : acervo.filter((a) => a.qtd_disponivel > 0)

  function handleConfirmar() {
    if (!pessoaSelecionada) return
    onConfirmar(pessoaSelecionada, tipoTomador)
  }

  function detalhePessoa(p: Pessoa): string | null {
    if (tipoTomador === 'aluno') {
      const a = p as AlunoBusca
      return [a.codigo && `#${a.codigo}`, a.serie, a.escola_nome].filter(Boolean).join(' • ') || null
    }
    const s = p as ServidorBusca
    return [s.matricula_funcional && `#${s.matricula_funcional}`, s.cargo].filter(Boolean).join(' • ') || null
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-emprestimo-titulo">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
          <h2 id="modal-emprestimo-titulo" className="text-lg font-bold text-gray-800 dark:text-gray-200">
            {modoReserva ? 'Nova reserva' : 'Novo empréstimo'}
          </h2>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Fechar modal">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Item *</label>
            <select
              value={form.acervo_id}
              onChange={(e) => onChange({ ...form, acervo_id: e.target.value })}
              className={`${INPUT_CLS} w-full`}
            >
              <option value="">Selecione</option>
              {itensFiltrados.map((a) => (
                <option key={a.id} value={a.id}>{a.titulo} ({a.qtd_disponivel} disp)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Quem está retirando *</label>
            <div className="flex gap-2 mb-3">
              {(['aluno', 'servidor'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setTipoTomador(v)
                    setPessoaSelecionada(null)
                    setBuscaPessoa('')
                    setPessoasResultado([])
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                    tipoTomador === v
                      ? 'bg-rose-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {v === 'aluno' ? 'Aluno' : 'Servidor'}
                </button>
              ))}
            </div>

            {pessoaSelecionada ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-rose-700 dark:text-rose-300 truncate">{pessoaSelecionada.nome}</p>
                  {detalhePessoa(pessoaSelecionada) && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{detalhePessoa(pessoaSelecionada)}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setPessoaSelecionada(null); setBuscaPessoa('') }}
                  className="p-1 rounded text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                  title="Limpar seleção"
                  aria-label="Limpar seleção de pessoa"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={buscaPessoa}
                  onChange={(e) => setBuscaPessoa(e.target.value)}
                  placeholder={tipoTomador === 'aluno' ? 'Buscar aluno por nome ou matrícula...' : 'Buscar servidor por nome, CPF ou matrícula...'}
                  className={`${INPUT_CLS} w-full pl-9`}
                  autoComplete="off"
                />
                {(buscandoPessoa || pessoasResultado.length > 0) && (
                  <div className="mt-2 border border-gray-200 dark:border-slate-700 rounded-lg max-h-56 overflow-y-auto bg-white dark:bg-slate-800">
                    {buscandoPessoa && pessoasResultado.length === 0 && (
                      <p className="text-xs text-gray-400 p-3 flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
                      </p>
                    )}
                    {pessoasResultado.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPessoaSelecionada(p)
                          setBuscaPessoa('')
                          setPessoasResultado([])
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-sm border-b border-gray-100 dark:border-slate-700 last:border-0"
                      >
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{p.nome}</p>
                        <p className="text-xs text-gray-400">{detalhePessoa(p) || (tipoTomador === 'aluno' ? 'aluno' : 'servidor')}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {!modoReserva && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Dias de empréstimo</label>
              <input
                type="number"
                min={1}
                max={60}
                value={form.dias_emprestimo}
                onChange={(e) => onChange({ ...form, dias_emprestimo: e.target.value })}
                className={`${INPUT_CLS} w-full`}
              />
            </div>
          )}
          {modoReserva && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <Bookmark className="w-3 h-3" /> O tomador será notificado quando o item ficar disponível
            </p>
          )}
        </div>
        <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
          <button
            onClick={handleConfirmar}
            disabled={salvando || !pessoaSelecionada || !form.acervo_id}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-bold disabled:opacity-50 ${
              modoReserva ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : (modoReserva ? <Bookmark className="w-4 h-4" /> : <ArrowLeftRight className="w-4 h-4" />)}
            {modoReserva ? 'Reservar' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
