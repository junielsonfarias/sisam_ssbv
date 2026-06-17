'use client'

import { GraduationCap, Save, BookOpen, Check } from 'lucide-react'

interface SerieEscolar {
  id: string
  codigo: string
  nome: string
  etapa: string
  ordem: number
  media_aprovacao: number | null
  media_recuperacao: number | null
  nota_maxima: number | null
  max_dependencias: number
  formula_nota_final: string
  permite_recuperacao: boolean
  idade_minima: number | null
  idade_maxima: number | null
  ativo: boolean
  total_disciplinas: number
  tipo_avaliacao_id: string | null
  regra_avaliacao_id: string | null
}

interface TipoAvaliacao {
  id: string
  codigo: string
  nome: string
  tipo_resultado: string
}

interface RegraAvaliacao {
  id: string
  nome: string
  tipo_avaliacao_id: string
  tipo_avaliacao_nome: string
  tipo_periodo: string
  qtd_periodos: number
  media_aprovacao: number | null
  media_recuperacao: number | null
  nota_maxima: number | null
  permite_recuperacao: boolean
  max_dependencias: number
  formula_media: string
  aprovacao_automatica: boolean
}

interface Disciplina {
  id: string
  nome: string
  codigo: string | null
  abreviacao: string | null
}

interface DisciplinaForm {
  disciplina_id: string
  habilitada: boolean
  obrigatoria: boolean
  carga_horaria_semanal: number
}

interface EtapaInfo {
  valor: string
  label: string
  cor: string
}

interface PainelSerieProps {
  serieSelecionada: SerieEscolar | null
  formSerie: Partial<SerieEscolar>
  setFormSerie: React.Dispatch<React.SetStateAction<Partial<SerieEscolar>>>
  disciplinas: Disciplina[]
  disciplinasForm: DisciplinaForm[]
  tiposAvaliacao: TipoAvaliacao[]
  regrasAvaliacao: RegraAvaliacao[]
  regrasFiltradas: RegraAvaliacao[]
  setRegrasFiltradas: React.Dispatch<React.SetStateAction<RegraAvaliacao[]>>
  salvando: boolean
  salvandoDisciplinas: boolean
  etapas: EtapaInfo[]
  formulas: { valor: string; label: string }[]
  onSalvarSerie: () => void
  onSalvarDisciplinas: () => void
  onToggleDisciplina: (idx: number) => void
  onAtualizarDisciplina: (idx: number, campo: string, valor: any) => void
}

export default function PainelSerie({
  serieSelecionada,
  formSerie,
  setFormSerie,
  disciplinas,
  disciplinasForm,
  tiposAvaliacao,
  regrasAvaliacao,
  regrasFiltradas,
  setRegrasFiltradas,
  salvando,
  salvandoDisciplinas,
  etapas,
  formulas,
  onSalvarSerie,
  onSalvarDisciplinas,
  onToggleDisciplina,
  onAtualizarDisciplina,
}: PainelSerieProps) {
  const getEtapaInfo = (etapa: string) => etapas.find(e => e.valor === etapa)

  if (!serieSelecionada) {
    return (
      <div className="lg:w-2/3">
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500">Selecione uma serie</h3>
          <p className="text-sm text-gray-400 mt-1">Clique em uma serie na lista ao lado para ver e editar seus detalhes</p>
        </div>
      </div>
    )
  }

  return (
    <div className="lg:w-2/3">
      <div className="space-y-4">
        {/* Cabeçalho da série */}
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{serieSelecionada.nome}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">Codigo: <strong>{serieSelecionada.codigo}</strong></span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getEtapaInfo(serieSelecionada.etapa)?.cor}`}>
                  {getEtapaInfo(serieSelecionada.etapa)?.label}
                </span>
              </div>
            </div>
          </div>

          {/* Campos editáveis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Media Aprovacao</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="10"
                value={formSerie.media_aprovacao ?? ''}
                onChange={e => setFormSerie(prev => ({ ...prev, media_aprovacao: e.target.value ? parseFloat(e.target.value) : null }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Ex: 6.0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Media Recuperacao</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="10"
                value={formSerie.media_recuperacao ?? ''}
                onChange={e => setFormSerie(prev => ({ ...prev, media_recuperacao: e.target.value ? parseFloat(e.target.value) : null }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Ex: 5.0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nota Maxima</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formSerie.nota_maxima ?? ''}
                onChange={e => setFormSerie(prev => ({ ...prev, nota_maxima: e.target.value ? parseFloat(e.target.value) : null }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Ex: 10.0"
              />
            </div>

            {serieSelecionada.etapa === 'fundamental_anos_finais' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max. Dependencias</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={formSerie.max_dependencias ?? 0}
                  onChange={e => setFormSerie(prev => ({ ...prev, max_dependencias: parseInt(e.target.value) || 0 }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Formula Nota Final</label>
              <select
                value={formSerie.formula_nota_final ?? 'media_aritmetica'}
                onChange={e => setFormSerie(prev => ({ ...prev, formula_nota_final: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {formulas.map(f => (
                  <option key={f.valor} value={f.valor}>{f.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-5">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formSerie.permite_recuperacao ?? true}
                  onChange={e => setFormSerie(prev => ({ ...prev, permite_recuperacao: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                <span className="ml-2 text-sm text-gray-600">Permite Recuperacao</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Idade Minima</label>
              <input
                type="number"
                min="0"
                max="99"
                value={formSerie.idade_minima ?? ''}
                onChange={e => setFormSerie(prev => ({ ...prev, idade_minima: e.target.value ? parseInt(e.target.value) : null }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Opcional"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Idade Maxima</label>
              <input
                type="number"
                min="0"
                max="99"
                value={formSerie.idade_maxima ?? ''}
                onChange={e => setFormSerie(prev => ({ ...prev, idade_maxima: e.target.value ? parseInt(e.target.value) : null }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Opcional"
              />
            </div>
          </div>

          {/* Tipo e Regra de Avaliacao */}
          <div className="mt-5 pt-4 border-t border-gray-200 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Avaliacao (Padrao INEP)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Avaliacao</label>
                <select
                  value={formSerie.tipo_avaliacao_id || ''}
                  onChange={e => {
                    const tipoId = e.target.value || null
                    setFormSerie(prev => ({ ...prev, tipo_avaliacao_id: tipoId, regra_avaliacao_id: null }))
                    if (tipoId) {
                      setRegrasFiltradas(regrasAvaliacao.filter(r => r.tipo_avaliacao_id === tipoId))
                    } else {
                      setRegrasFiltradas(regrasAvaliacao)
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Selecione o tipo...</option>
                  {tiposAvaliacao.map(t => (
                    <option key={t.id} value={t.id}>{t.nome} ({t.tipo_resultado})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Regra de Avaliacao</label>
                <select
                  value={formSerie.regra_avaliacao_id || ''}
                  onChange={e => {
                    const regraId = e.target.value || null
                    setFormSerie(prev => ({ ...prev, regra_avaliacao_id: regraId }))
                    if (regraId) {
                      const regra = regrasAvaliacao.find(r => r.id === regraId)
                      if (regra) {
                        setFormSerie(prev => ({
                          ...prev,
                          regra_avaliacao_id: regraId,
                          media_aprovacao: regra.media_aprovacao != null ? parseFloat(String(regra.media_aprovacao)) : prev.media_aprovacao,
                          media_recuperacao: regra.media_recuperacao != null ? parseFloat(String(regra.media_recuperacao)) : prev.media_recuperacao,
                          nota_maxima: regra.nota_maxima != null ? parseFloat(String(regra.nota_maxima)) : prev.nota_maxima,
                          max_dependencias: regra.max_dependencias,
                          permite_recuperacao: regra.permite_recuperacao,
                        }))
                      }
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Selecione a regra...</option>
                  {regrasFiltradas.map(r => (
                    <option key={r.id} value={r.id}>{r.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Resumo da regra selecionada */}
            {formSerie.regra_avaliacao_id && (() => {
              const regra = regrasAvaliacao.find(r => r.id === formSerie.regra_avaliacao_id)
              if (!regra) return null
              return (
                <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-gray-700 dark:text-gray-300">
                  <div className="flex flex-wrap gap-3">
                    <span><strong>Periodo:</strong> {({'bimestral':'Bimestral','trimestral':'Trimestral','semestral':'Semestral','anual':'Anual'} as any)[regra.tipo_periodo] || regra.tipo_periodo} ({regra.qtd_periodos}p)</span>
                    <span><strong>Formula:</strong> {regra.formula_media}</span>
                    {regra.aprovacao_automatica && (
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Aprovacao automatica</span>
                    )}
                    {regra.permite_recuperacao && <span><strong>Recuperacao:</strong> Sim</span>}
                  </div>
                </div>
              )
            })()}
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={onSalvarSerie}
              disabled={salvando}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {salvando ? 'Salvando...' : 'Salvar Serie'}
            </button>
          </div>
        </div>

        {/* Disciplinas */}
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-slate-600" />
              <h3 className="text-lg font-semibold text-gray-800">Disciplinas</h3>
            </div>
            <span className="text-xs text-gray-400">
              {disciplinasForm.filter(d => d.habilitada).length} de {disciplinasForm.length} habilitadas
            </span>
          </div>

          {disciplinasForm.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhuma disciplina cadastrada. Cadastre disciplinas em &quot;Disciplinas e Periodos&quot;.
            </p>
          ) : (
            <div className="space-y-2">
              {disciplinasForm.map((df, idx) => {
                const disc = disciplinas.find(d => d.id === df.disciplina_id)
                if (!disc) return null
                return (
                  <div
                    key={df.disciplina_id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      df.habilitada ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <button
                      onClick={() => onToggleDisciplina(idx)}
                      className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${
                        df.habilitada
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {df.habilitada && <Check className="w-4 h-4" />}
                    </button>

                    <span className={`flex-1 text-sm font-medium ${df.habilitada ? 'text-gray-800' : 'text-gray-400'}`}>
                      {disc.nome}
                      {disc.abreviacao && <span className="text-xs text-gray-400 ml-1">({disc.abreviacao})</span>}
                    </span>

                    {df.habilitada && (
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 min-h-[44px] text-xs">
                          <input
                            type="checkbox"
                            checked={df.obrigatoria}
                            onChange={e => onAtualizarDisciplina(idx, 'obrigatoria', e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                          />
                          Obrig.
                        </label>
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-gray-500">CH:</label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={df.carga_horaria_semanal}
                            onChange={e => onAtualizarDisciplina(idx, 'carga_horaria_semanal', parseInt(e.target.value) || 1)}
                            className="w-14 border rounded px-2 py-1 text-xs text-center focus:ring-2 focus:ring-emerald-500"
                          />
                          <span className="text-xs text-gray-400">h/sem</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {disciplinasForm.length > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={onSalvarDisciplinas}
                disabled={salvandoDisciplinas}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {salvandoDisciplinas ? 'Salvando...' : 'Salvar Disciplinas'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
