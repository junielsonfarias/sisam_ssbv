'use client'

import { Building2 } from 'lucide-react'
import {
  EscolaDetalhe,
  PoloSimples,
  inputClassName,
  selectClassName,
  labelClassName,
} from './types'

export function AbaDadosGerais({
  formData,
  updateField,
  polos,
}: {
  formData: Partial<EscolaDetalhe>
  updateField: (field: string, value: any) => void
  polos: PoloSimples[]
}) {
  const etapasOpcoes = [
    { value: 'educacao_infantil', label: 'Educacao Infantil' },
    { value: 'fundamental_anos_iniciais', label: 'Fundamental - Anos Iniciais' },
    { value: 'fundamental_anos_finais', label: 'Fundamental - Anos Finais' },
    { value: 'eja', label: 'EJA' },
  ]

  const etapasAtuais = formData.etapas_ensino || []

  const toggleEtapa = (etapa: string) => {
    const novas = etapasAtuais.includes(etapa)
      ? etapasAtuais.filter(e => e !== etapa)
      : [...etapasAtuais, etapa]
    updateField('etapas_ensino', novas)
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Building2 className="w-5 h-5 text-emerald-600" />
        Dados Gerais da Escola
      </h3>

      {/* Identificacao */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <label className={labelClassName}>Nome *</label>
          <input
            type="text"
            value={formData.nome || ''}
            onChange={(e) => updateField('nome', e.target.value)}
            className={inputClassName}
            required
          />
        </div>
        <div>
          <label className={labelClassName}>Codigo</label>
          <input
            type="text"
            value={formData.codigo || ''}
            onChange={(e) => updateField('codigo', e.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label className={labelClassName}>Polo</label>
          <select
            value={formData.polo_id || ''}
            onChange={(e) => updateField('polo_id', e.target.value || null)}
            className={selectClassName}
          >
            <option value="">Selecione um polo</option>
            {polos.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClassName}>Codigo INEP (8 digitos)</label>
          <input
            type="text"
            value={formData.codigo_inep || ''}
            onChange={(e) => updateField('codigo_inep', e.target.value)}
            maxLength={8}
            className={inputClassName}
          />
        </div>
        <div>
          <label className={labelClassName}>Situacao de Funcionamento</label>
          <select
            value={formData.situacao_funcionamento || ''}
            onChange={(e) => updateField('situacao_funcionamento', e.target.value || null)}
            className={selectClassName}
          >
            <option value="">Selecione</option>
            <option value="em_atividade">Em Atividade</option>
            <option value="paralisada">Paralisada</option>
            <option value="extinta">Extinta</option>
          </select>
        </div>
      </div>

      {/* Classificacao */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className={labelClassName}>Dependencia Administrativa</label>
          <select
            value={formData.dependencia_administrativa || ''}
            onChange={(e) => updateField('dependencia_administrativa', e.target.value || null)}
            className={selectClassName}
          >
            <option value="">Selecione</option>
            <option value="federal">Federal</option>
            <option value="estadual">Estadual</option>
            <option value="municipal">Municipal</option>
            <option value="privada">Privada</option>
          </select>
        </div>
        <div>
          <label className={labelClassName}>Localizacao</label>
          <select
            value={formData.localizacao || ''}
            onChange={(e) => updateField('localizacao', e.target.value || null)}
            className={selectClassName}
          >
            <option value="">Selecione</option>
            <option value="urbana">Urbana</option>
            <option value="rural">Rural</option>
          </select>
        </div>
        <div>
          <label className={labelClassName}>Localizacao Diferenciada</label>
          <select
            value={formData.localizacao_diferenciada || ''}
            onChange={(e) => updateField('localizacao_diferenciada', e.target.value || null)}
            className={selectClassName}
          >
            <option value="">Nao se aplica</option>
            <option value="area_assentamento">Area de Assentamento</option>
            <option value="terra_indigena">Terra Indigena</option>
            <option value="area_remanescente_quilombo">Area Remanescente de Quilombo</option>
          </select>
        </div>
        <div>
          <label className={labelClassName}>Modalidade de Ensino</label>
          <select
            value={formData.modalidade_ensino || ''}
            onChange={(e) => updateField('modalidade_ensino', e.target.value || null)}
            className={selectClassName}
          >
            <option value="">Selecione</option>
            <option value="regular">Regular</option>
            <option value="especial">Especial</option>
            <option value="eja">EJA</option>
          </select>
        </div>
        <div>
          <label className={labelClassName}>Tipo de Atendimento</label>
          <select
            value={formData.tipo_atendimento_escolarizacao || ''}
            onChange={(e) => updateField('tipo_atendimento_escolarizacao', e.target.value || null)}
            className={selectClassName}
          >
            <option value="">Selecione</option>
            <option value="escolarizacao">Escolarizacao</option>
            <option value="atividade_complementar">Atividade Complementar</option>
            <option value="aee">AEE</option>
          </select>
        </div>
      </div>

      {/* Etapas de Ensino */}
      <div>
        <label className={labelClassName}>Etapas de Ensino</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
          {etapasOpcoes.map(etapa => (
            <label
              key={etapa.value}
              className={`flex items-center gap-3 p-3 min-h-[44px] rounded-lg border cursor-pointer transition-all
                ${etapasAtuais.includes(etapa.value)
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-600'
                  : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                }`}
            >
              <input
                type="checkbox"
                checked={etapasAtuais.includes(etapa.value)}
                onChange={() => toggleEtapa(etapa.value)}
                className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{etapa.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Endereco */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <label className={labelClassName}>Endereco</label>
          <input
            type="text"
            value={formData.endereco || ''}
            onChange={(e) => updateField('endereco', e.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label className={labelClassName}>Complemento</label>
          <input
            type="text"
            value={formData.complemento || ''}
            onChange={(e) => updateField('complemento', e.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label className={labelClassName}>Bairro</label>
          <input
            type="text"
            value={formData.bairro || ''}
            onChange={(e) => updateField('bairro', e.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label className={labelClassName}>CEP</label>
          <input
            type="text"
            value={formData.cep || ''}
            onChange={(e) => updateField('cep', e.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label className={labelClassName}>Municipio</label>
          <input
            type="text"
            value={formData.municipio || 'Sao Sebastiao da Boa Vista'}
            onChange={(e) => updateField('municipio', e.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label className={labelClassName}>UF</label>
          <input
            type="text"
            value={formData.uf || 'PA'}
            onChange={(e) => updateField('uf', e.target.value)}
            maxLength={2}
            className={inputClassName}
          />
        </div>
        <div>
          <label className={labelClassName}>Telefone</label>
          <input
            type="text"
            value={formData.telefone || ''}
            onChange={(e) => updateField('telefone', e.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label className={labelClassName}>Email</label>
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => updateField('email', e.target.value)}
            className={inputClassName}
          />
        </div>
      </div>

      {/* Dados adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className={labelClassName}>Data de Criacao</label>
          <input
            type="date"
            value={formData.data_criacao ? formData.data_criacao.substring(0, 10) : ''}
            onChange={(e) => updateField('data_criacao', e.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label className={labelClassName}>CNPJ da Mantenedora</label>
          <input
            type="text"
            value={formData.cnpj_mantenedora || ''}
            onChange={(e) => updateField('cnpj_mantenedora', e.target.value)}
            className={inputClassName}
          />
        </div>
      </div>
    </div>
  )
}
