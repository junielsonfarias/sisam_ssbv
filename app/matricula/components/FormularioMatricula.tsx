'use client'

import {
  ArrowLeft, ArrowRight, CheckCircle, AlertTriangle, Loader2,
} from 'lucide-react'
import { cpfMask, phoneMask } from '@/app/matricula/utils'
import { GENEROS, PARENTESCOS, SERIES, SERIES_LABELS, type EscolaOption } from '@/app/matricula/constants'

export interface MatriculaForm {
  aluno_nome: string; aluno_data_nascimento: string; aluno_cpf: string; aluno_genero: string; aluno_pcd: boolean
  responsavel_nome: string; responsavel_cpf: string; responsavel_telefone: string; responsavel_email: string; parentesco: string
  endereco: string; bairro: string; escola_pretendida_id: string; serie_pretendida: string
  ano_letivo: string
}

interface FormularioMatriculaProps {
  etapa: number
  form: MatriculaForm
  escolas: EscolaOption[]
  erro: string
  carregando: boolean
  setField: (field: string, value: any) => void
  onVoltar: () => void
  onAvancar: () => void
  onEnviar: () => void
  inputClass: string
  labelClass: string
}

export default function FormularioMatricula({
  etapa,
  form,
  escolas,
  erro,
  carregando,
  setField,
  onVoltar,
  onAvancar,
  onEnviar,
  inputClass,
  labelClass,
}: FormularioMatriculaProps) {
  return (
    <div className="max-w-lg mx-auto">
      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3].map(n => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              etapa === n ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' :
              etapa > n ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500'
            }`}>{n}</div>
            {n < 3 && <div className={`w-8 h-0.5 ${etapa > n ? 'bg-blue-500' : 'bg-gray-200 dark:bg-slate-600'}`} />}
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">
        {etapa === 1 && 'Dados do Aluno'}
        {etapa === 2 && 'Dados do Responsável'}
        {etapa === 3 && 'Escola e Série'}
      </p>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6 space-y-4">
        {/* Etapa 1: Dados do Aluno */}
        {etapa === 1 && (
          <>
            <div>
              <label className={labelClass}>Nome completo do aluno *</label>
              <input type="text" value={form.aluno_nome} onChange={e => setField('aluno_nome', e.target.value)}
                placeholder="Nome completo" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Data de nascimento *</label>
              <input type="date" value={form.aluno_data_nascimento}
                onChange={e => setField('aluno_data_nascimento', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>CPF do aluno (opcional)</label>
              <input type="text" inputMode="numeric" autoComplete="off" value={form.aluno_cpf} onChange={e => setField('aluno_cpf', cpfMask(e.target.value))}
                placeholder="000.000.000-00" maxLength={14} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Gênero</label>
                <select value={form.aluno_genero} onChange={e => setField('aluno_genero', e.target.value)} className={inputClass}>
                  <option value="">Selecione</option>
                  {GENEROS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
                  <input type="checkbox" checked={form.aluno_pcd} onChange={e => setField('aluno_pcd', e.target.checked)}
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">PCD (Pessoa com Deficiência)</span>
                </label>
              </div>
            </div>
          </>
        )}

        {/* Etapa 2: Responsável */}
        {etapa === 2 && (
          <>
            <div>
              <label className={labelClass}>Nome do responsável *</label>
              <input type="text" value={form.responsavel_nome} onChange={e => setField('responsavel_nome', e.target.value)}
                placeholder="Nome completo" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>CPF do responsável (opcional)</label>
              <input type="text" inputMode="numeric" autoComplete="off" value={form.responsavel_cpf} onChange={e => setField('responsavel_cpf', cpfMask(e.target.value))}
                placeholder="000.000.000-00" maxLength={14} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Telefone *</label>
              <input type="tel" inputMode="tel" autoComplete="tel" value={form.responsavel_telefone}
                onChange={e => setField('responsavel_telefone', phoneMask(e.target.value))}
                placeholder="(91) 99999-0000" maxLength={15} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email (opcional)</label>
              <input type="email" inputMode="email" autoComplete="email" value={form.responsavel_email} onChange={e => setField('responsavel_email', e.target.value)}
                placeholder="email@exemplo.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Parentesco</label>
              <select value={form.parentesco} onChange={e => setField('parentesco', e.target.value)} className={inputClass}>
                <option value="">Selecione</option>
                {PARENTESCOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Endereço</label>
              <input type="text" value={form.endereco} onChange={e => setField('endereco', e.target.value)}
                placeholder="Rua, número, comunidade" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Bairro</label>
              <input type="text" value={form.bairro} onChange={e => setField('bairro', e.target.value)}
                placeholder="Bairro" className={inputClass} />
            </div>
          </>
        )}

        {/* Etapa 3: Escola e Série */}
        {etapa === 3 && (
          <>
            <div>
              <label className={labelClass}>Escola pretendida</label>
              <select value={form.escola_pretendida_id} onChange={e => setField('escola_pretendida_id', e.target.value)} className={inputClass}>
                <option value="">Sem preferência</option>
                {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Série pretendida *</label>
              <select value={form.serie_pretendida} onChange={e => setField('serie_pretendida', e.target.value)} className={inputClass}>
                <option value="">Selecione a série</option>
                {SERIES.map(s => <option key={s} value={s}>{SERIES_LABELS[s] || s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Ano letivo</label>
              <input type="text" value={form.ano_letivo} readOnly className={`${inputClass} bg-gray-50 dark:bg-slate-800`} />
            </div>
          </>
        )}

        {/* Erro */}
        {erro && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {erro}
          </div>
        )}

        {/* Botões navegação */}
        <div className="flex gap-3 pt-2">
          {etapa > 1 && (
            <button onClick={onVoltar}
              className="flex-1 py-3 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          )}
          {etapa < 3 ? (
            <button onClick={onAvancar}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2">
              Próximo <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={onEnviar} disabled={carregando}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 flex items-center justify-center gap-2">
              {carregando ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Enviar Pré-Matrícula</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
