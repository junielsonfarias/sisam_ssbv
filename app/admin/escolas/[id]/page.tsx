'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, School, Building2, MapPin, ToggleLeft,
  BookOpen, Calendar, Users, BarChart3, CheckCircle, XCircle,
  Link as LinkIcon, GraduationCap, Info, ClipboardList
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSeries } from '@/lib/use-series'

// ============================================
// Tipos
// ============================================

type AbaId = 'dados' | 'infraestrutura' | 'series' | 'avaliacao' | 'calendario' | 'turmas' | 'estatisticas'

interface EscolaDetalhe {
  id: string
  nome: string
  codigo: string | null
  codigo_inep: string | null
  polo_id: string | null
  polo_nome: string | null
  situacao_funcionamento: string | null
  dependencia_administrativa: string | null
  localizacao: string | null
  localizacao_diferenciada: string | null
  modalidade_ensino: string | null
  tipo_atendimento_escolarizacao: string | null
  etapas_ensino: string[] | null
  endereco: string | null
  complemento: string | null
  bairro: string | null
  cep: string | null
  municipio: string | null
  uf: string | null
  telefone: string | null
  email: string | null
  data_criacao: string | null
  cnpj_mantenedora: string | null
  agua_potavel: boolean
  energia_eletrica: boolean
  esgoto_sanitario: boolean
  coleta_lixo: boolean
  internet: boolean
  banda_larga: boolean
  quadra_esportiva: boolean
  biblioteca: boolean
  laboratorio_informatica: boolean
  laboratorio_ciencias: boolean
  acessibilidade_deficiente: boolean
  alimentacao_escolar: boolean
  latitude: number | null
  longitude: number | null
  ativo: boolean
  total_turmas: number
  total_alunos: number
  total_pcd: number
}

interface SerieEscola {
  id: string
  escola_id: string
  serie: string
  ano_letivo: string
  nome_serie: string | null
  tipo_ensino: string | null
  media_aprovacao: number | null
  max_dependencias: number | null
}

interface ConfigSerie {
  id: string
  serie: string
  nome_serie: string
  tipo_ensino: string
  media_aprovacao?: number
  max_dependencias?: number
}

interface PoloSimples {
  id: string
  nome: string
}

interface Turma {
  id: string
  codigo: string
  nome: string
  serie: string
  turno: string
  total_alunos: number
  capacidade: number | null
}

interface PeriodoLetivo {
  id: string
  nome: string
  tipo: string
  numero: number
  ano_letivo: string
  data_inicio: string | null
  data_fim: string | null
  dias_letivos: number | null
  ativo: boolean
}

interface ConfiguracaoNotasEscola {
  id: string
  escola_id: string
  ano_letivo: string
  media_aprovacao: number
  media_recuperacao: number
  nota_maxima: number
}

interface EstatisticasSituacao {
  situacao: string
  total: number
}

interface EstatisticasSerie {
  serie: string
  nome_serie: string | null
  total: number
}

// ============================================
// Componente Principal
// ============================================

export default function EscolaDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const escolaId = params.id as string
  const anoLetivo = new Date().getFullYear().toString()

  const [abaAtiva, setAbaAtiva] = useState<AbaId>('dados')
  const [escola, setEscola] = useState<EscolaDetalhe | null>(null)
  const [seriesEscola, setSeriesEscola] = useState<SerieEscola[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Form data state (mirrors escola fields)
  const [formData, setFormData] = useState<Partial<EscolaDetalhe>>({})
  const [polos, setPolos] = useState<PoloSimples[]>([])

  const carregarEscola = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/escolas/${escolaId}?ano_letivo=${anoLetivo}`)
      if (!res.ok) {
        toast.error('Escola nao encontrada')
        router.push('/admin/escolas')
        return
      }
      const data = await res.json()
      setEscola(data)
      setFormData(data)
    } catch (error) {
      toast.error('Erro ao carregar dados da escola')
    }
  }, [escolaId, anoLetivo])

  const carregarSeries = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/escolas/${escolaId}/series?ano_letivo=${anoLetivo}`)
      if (res.ok) {
        const data = await res.json()
        setSeriesEscola(data.series || [])
      }
    } catch (error) {
    }
  }, [escolaId, anoLetivo])

  const carregarPolos = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/polos')
      if (res.ok) {
        const data = await res.json()
        setPolos(data)
      }
    } catch (error) {
    }
  }, [])

  useEffect(() => {
    const carregarTudo = async () => {
      setCarregando(true)
      await Promise.all([carregarEscola(), carregarSeries(), carregarPolos()])
      setCarregando(false)
    }
    carregarTudo()
  }, [carregarEscola, carregarSeries, carregarPolos])

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      // Remover campos computados/readonly que nao sao colunas da tabela
      const { total_turmas, total_alunos, total_pcd, polo_nome, id, criado_em, atualizado_em, ...dadosParaSalvar } = formData as any
      const res = await fetch(`/api/admin/escolas/${escolaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosParaSalvar),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Escola atualizada com sucesso!')
        await carregarEscola()
      } else {
        toast.error(data.mensagem || 'Erro ao salvar escola')
      }
    } catch (error) {
      toast.error('Erro ao salvar escola')
    } finally {
      setSalvando(false)
    }
  }

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const abas: { id: AbaId; label: string; icon: any }[] = [
    { id: 'dados', label: 'Dados Gerais', icon: Building2 },
    { id: 'infraestrutura', label: 'Infraestrutura', icon: MapPin },
    { id: 'series', label: 'Series Oferecidas', icon: BookOpen },
    { id: 'avaliacao', label: 'Avaliacao', icon: ClipboardList },
    { id: 'calendario', label: 'Calendario Letivo', icon: Calendar },
    { id: 'turmas', label: 'Turmas', icon: Users },
    { id: 'estatisticas', label: 'Estatisticas', icon: BarChart3 },
  ]

  if (carregando) {
    return (
      <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
        <LoadingSpinner text="Carregando escola..." centered />
      </ProtectedRoute>
    )
  }

  if (!escola) {
    return (
      <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
        <div className="text-center py-12">
          <School className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-lg font-medium text-gray-500">Escola nao encontrada</p>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/escolas')}
                className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors"
                title="Voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="bg-white/20 rounded-lg p-2">
                <School className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{escola.nome}</h1>
                <div className="flex items-center gap-2 mt-1">
                  {escola.codigo_inep && (
                    <span className="bg-white/20 text-white text-xs font-mono px-2 py-0.5 rounded">
                      INEP: {escola.codigo_inep}
                    </span>
                  )}
                  {escola.codigo && (
                    <span className="bg-white/20 text-white text-xs font-mono px-2 py-0.5 rounded">
                      Cod: {escola.codigo}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleSalvar}
              disabled={salvando}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-all font-medium"
            >
              <Save className="w-4 h-4" />
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
            {abas.map(aba => {
              const Icon = aba.icon
              return (
                <button
                  key={aba.id}
                  onClick={() => setAbaAtiva(aba.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors whitespace-nowrap min-w-[120px]
                    ${abaAtiva === aba.id
                      ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{aba.label}</span>
                </button>
              )
            })}
          </div>

          <div className="p-4 sm:p-6">
            {abaAtiva === 'dados' && (
              <AbaDadosGerais formData={formData} updateField={updateField} polos={polos} />
            )}
            {abaAtiva === 'infraestrutura' && (
              <AbaInfraestrutura formData={formData} updateField={updateField} />
            )}
            {abaAtiva === 'series' && (
              <AbaSeriesOferecidas
                escolaId={escolaId}
                anoLetivo={anoLetivo}
                seriesEscola={seriesEscola}
                onRecarregar={carregarSeries}
                toast={toast}
              />
            )}
            {abaAtiva === 'avaliacao' && (
              <AbaAvaliacao escolaId={escolaId} toast={toast} />
            )}
            {abaAtiva === 'calendario' && (
              <AbaCalendarioLetivo escolaId={escolaId} anoLetivo={anoLetivo} />
            )}
            {abaAtiva === 'turmas' && (
              <AbaTurmas escolaId={escolaId} anoLetivo={anoLetivo} />
            )}
            {abaAtiva === 'estatisticas' && (
              <AbaEstatisticas escola={escola} escolaId={escolaId} anoLetivo={anoLetivo} />
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

// ============================================
// Componentes auxiliares
// ============================================

const inputClassName = "w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
const selectClassName = "w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
const labelClassName = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"

// ============================================
// Aba 1: Dados Gerais
// ============================================

function AbaDadosGerais({
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
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                ${etapasAtuais.includes(etapa.value)
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-600'
                  : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                }`}
            >
              <input
                type="checkbox"
                checked={etapasAtuais.includes(etapa.value)}
                onChange={() => toggleEtapa(etapa.value)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
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

// ============================================
// Aba 2: Infraestrutura
// ============================================

function AbaInfraestrutura({
  formData,
  updateField,
}: {
  formData: Partial<EscolaDetalhe>
  updateField: (field: string, value: any) => void
}) {
  const toggles = [
    { field: 'agua_potavel', label: 'Agua Potavel', icon: '💧' },
    { field: 'energia_eletrica', label: 'Energia Eletrica', icon: '⚡' },
    { field: 'esgoto_sanitario', label: 'Esgoto Sanitario', icon: '🚰' },
    { field: 'coleta_lixo', label: 'Coleta de Lixo', icon: '🗑' },
    { field: 'internet', label: 'Internet', icon: '🌐' },
    { field: 'banda_larga', label: 'Banda Larga', icon: '📡' },
    { field: 'quadra_esportiva', label: 'Quadra Esportiva', icon: '🏟' },
    { field: 'biblioteca', label: 'Biblioteca', icon: '📚' },
    { field: 'laboratorio_informatica', label: 'Laboratorio de Informatica', icon: '💻' },
    { field: 'laboratorio_ciencias', label: 'Laboratorio de Ciencias', icon: '🔬' },
    { field: 'acessibilidade_deficiente', label: 'Acessibilidade PCD', icon: '♿' },
    { field: 'alimentacao_escolar', label: 'Alimentacao Escolar', icon: '🍽' },
  ]

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <MapPin className="w-5 h-5 text-emerald-600" />
        Infraestrutura
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {toggles.map(toggle => {
          const isAtivo = !!(formData as any)[toggle.field]
          return (
            <div
              key={toggle.field}
              className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all
                ${isAtivo
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-600 shadow-sm'
                  : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 hover:border-gray-300'
                }`}
              onClick={() => updateField(toggle.field, !isAtivo)}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{toggle.icon}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{toggle.label}</span>
              </div>
              <div
                className={`w-11 h-6 rounded-full relative transition-colors ${
                  isAtivo ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-500'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${
                    isAtivo ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Coordenadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div>
          <label className={labelClassName}>Latitude</label>
          <input
            type="number"
            step="any"
            value={formData.latitude ?? ''}
            onChange={(e) => updateField('latitude', e.target.value ? parseFloat(e.target.value) : null)}
            className={inputClassName}
            placeholder="-1.7022"
          />
        </div>
        <div>
          <label className={labelClassName}>Longitude</label>
          <input
            type="number"
            step="any"
            value={formData.longitude ?? ''}
            onChange={(e) => updateField('longitude', e.target.value ? parseFloat(e.target.value) : null)}
            className={inputClassName}
            placeholder="-49.7347"
          />
        </div>
      </div>
    </div>
  )
}

// ============================================
// Aba 3: Series Oferecidas
// ============================================

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
  total_disciplinas: number
}

const ETAPA_LABELS: Record<string, string> = {
  educacao_infantil: 'Educacao Infantil',
  fundamental_anos_iniciais: 'Fund. Anos Iniciais',
  fundamental_anos_finais: 'Fund. Anos Finais',
  eja: 'EJA',
}

const ETAPA_CORES: Record<string, string> = {
  educacao_infantil: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border-pink-300',
  fundamental_anos_iniciais: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300',
  fundamental_anos_finais: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-300',
  eja: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300',
}

function AbaSeriesOferecidas({
  escolaId,
  anoLetivo,
  seriesEscola,
  onRecarregar,
  toast,
}: {
  escolaId: string
  anoLetivo: string
  seriesEscola: SerieEscola[]
  onRecarregar: () => Promise<void>
  toast: any
}) {
  const [todasSeries, setTodasSeries] = useState<SerieEscolar[]>([])
  const [carregando, setCarregando] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    const carregar = async () => {
      try {
        const res = await fetch('/api/admin/series-escolares')
        if (res.ok) {
          const data = await res.json()
          setTodasSeries(Array.isArray(data) ? data : data.series || [])
        }
      } catch (error) {
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  const seriesVinculadas = new Set(seriesEscola.map(s => s.serie))

  const handleToggleSerie = async (codigo: string) => {
    setToggling(codigo)
    try {
      if (seriesVinculadas.has(codigo)) {
        const res = await fetch(
          `/api/admin/escolas/${escolaId}/series?serie=${codigo}&ano_letivo=${anoLetivo}`,
          { method: 'DELETE' }
        )
        if (res.ok) {
          toast.success('Serie removida')
          await onRecarregar()
        } else {
          const data = await res.json()
          toast.error(data.mensagem || 'Erro ao remover serie')
        }
      } else {
        const res = await fetch(`/api/admin/escolas/${escolaId}/series`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serie: codigo, ano_letivo: anoLetivo }),
        })
        if (res.ok) {
          toast.success('Serie vinculada')
          await onRecarregar()
        } else {
          const data = await res.json()
          toast.error(data.mensagem || 'Erro ao vincular serie')
        }
      }
    } catch (error) {
      toast.error('Erro ao alternar serie')
    } finally {
      setToggling(null)
    }
  }

  if (carregando) {
    return <LoadingSpinner text="Carregando series..." centered />
  }

  // Agrupar por etapa
  const etapas = ['educacao_infantil', 'fundamental_anos_iniciais', 'fundamental_anos_finais', 'eja']
  const porEtapa = etapas.map(etapa => ({
    etapa,
    label: ETAPA_LABELS[etapa] || etapa,
    series: todasSeries.filter(s => s.etapa === etapa).sort((a, b) => a.ordem - b.ordem),
  })).filter(g => g.series.length > 0)

  const totalVinculadas = seriesVinculadas.size

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-600" />
          Series Oferecidas ({anoLetivo})
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {totalVinculadas} de {todasSeries.length} series ativas
        </span>
      </div>

      {porEtapa.map(grupo => (
        <div key={grupo.etapa}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${ETAPA_CORES[grupo.etapa] || 'bg-gray-100 text-gray-700'}`}>
              {grupo.label}
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-slate-600" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {grupo.series.map(serie => {
              const vinculada = seriesVinculadas.has(serie.codigo)
              return (
                <div
                  key={serie.id}
                  className={`p-4 rounded-xl border transition-all ${
                    vinculada
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-600 shadow-sm'
                      : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GraduationCap className={`w-5 h-5 ${vinculada ? 'text-emerald-600' : 'text-gray-400'}`} />
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">{serie.nome}</span>
                    </div>
                    <button
                      onClick={() => handleToggleSerie(serie.codigo)}
                      disabled={toggling === serie.codigo}
                      className={`w-11 h-6 rounded-full relative transition-colors ${
                        vinculada ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-500'
                      } ${toggling === serie.codigo ? 'opacity-50' : ''}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${
                        vinculada ? 'translate-x-[22px]' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                    {serie.media_aprovacao != null && (
                      <p>Media: <strong>{serie.media_aprovacao}</strong> | Rec: <strong>{serie.media_recuperacao ?? '-'}</strong> | Nota max: <strong>{serie.nota_maxima ?? 10}</strong></p>
                    )}
                    {serie.max_dependencias > 0 && (
                      <p>Max dependencias: <strong>{serie.max_dependencias}</strong></p>
                    )}
                    <p>
                      {serie.total_disciplinas > 0 ? `${serie.total_disciplinas} disciplinas` : 'Sem disciplinas'}
                      {serie.permite_recuperacao && ' | Recuperacao'}
                    </p>
                    {(serie.idade_minima || serie.idade_maxima) && (
                      <p>Idade: {serie.idade_minima ?? '?'} - {serie.idade_maxima ?? '?'} anos</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Configure as regras de cada serie em <a href="/admin/series-escolares" className="text-emerald-600 hover:underline">Series Escolares</a>.
      </p>
    </div>
  )
}

// ============================================
// Aba: Avaliacao (overrides por escola)
// ============================================

interface RegraSerieRow {
  serie_id: string
  codigo: string
  serie_nome: string
  etapa: string
  ordem: number
  padrao_tipo_id: string | null
  padrao_tipo_codigo: string | null
  padrao_tipo_nome: string | null
  padrao_tipo_resultado: string | null
  padrao_regra_id: string | null
  padrao_regra_nome: string | null
  padrao_media_aprovacao: number | null
  padrao_nota_maxima: number | null
  padrao_permite_recuperacao: boolean | null
  override_id: string | null
  override_tipo_id: string | null
  override_regra_id: string | null
  override_media_aprovacao: number | null
  override_media_recuperacao: number | null
  override_nota_maxima: number | null
  override_permite_recuperacao: boolean | null
  override_observacao: string | null
  override_tipo_codigo: string | null
  override_tipo_nome: string | null
  override_tipo_resultado: string | null
  override_regra_nome: string | null
}

interface TipoAvaliacaoOpt { id: string; codigo: string; nome: string; tipo_resultado: string }
interface RegraAvaliacaoOpt { id: string; nome: string; tipo_avaliacao_id: string }

function AbaAvaliacao({ escolaId, toast }: { escolaId: string; toast: any }) {
  const [series, setSeries] = useState<RegraSerieRow[]>([])
  const [tipos, setTipos] = useState<TipoAvaliacaoOpt[]>([])
  const [regras, setRegras] = useState<RegraAvaliacaoOpt[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [form, setForm] = useState<{
    tipo_avaliacao_id: string; regra_avaliacao_id: string
    media_aprovacao: string; media_recuperacao: string; nota_maxima: string
    permite_recuperacao: string
  }>({ tipo_avaliacao_id: '', regra_avaliacao_id: '', media_aprovacao: '', media_recuperacao: '', nota_maxima: '', permite_recuperacao: '' })

  const carregar = async () => {
    try {
      const [seriesRes, tiposRes, regrasRes] = await Promise.all([
        fetch(`/api/admin/escolas/${escolaId}/regras-avaliacao`),
        fetch('/api/admin/tipos-avaliacao'),
        fetch('/api/admin/regras-avaliacao'),
      ])
      if (seriesRes.ok) setSeries(await seriesRes.json())
      if (tiposRes.ok) {
        const t = await tiposRes.json()
        setTipos(Array.isArray(t) ? t : t.tipos || [])
      }
      if (regrasRes.ok) {
        const r = await regrasRes.json()
        setRegras(Array.isArray(r) ? r : r.regras || [])
      }
    } catch (e) {
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [escolaId])

  const iniciarEdicao = (s: RegraSerieRow) => {
    setEditando(s.serie_id)
    setForm({
      tipo_avaliacao_id: s.override_tipo_id || '',
      regra_avaliacao_id: s.override_regra_id || '',
      media_aprovacao: s.override_media_aprovacao != null ? String(s.override_media_aprovacao) : '',
      media_recuperacao: s.override_media_recuperacao != null ? String(s.override_media_recuperacao) : '',
      nota_maxima: s.override_nota_maxima != null ? String(s.override_nota_maxima) : '',
      permite_recuperacao: s.override_permite_recuperacao != null ? String(s.override_permite_recuperacao) : '',
    })
  }

  const salvarOverride = async (serieId: string) => {
    setSalvando(serieId)
    try {
      const res = await fetch(`/api/admin/escolas/${escolaId}/regras-avaliacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serie_escolar_id: serieId,
          tipo_avaliacao_id: form.tipo_avaliacao_id || null,
          regra_avaliacao_id: form.regra_avaliacao_id || null,
          media_aprovacao: form.media_aprovacao !== '' ? parseFloat(form.media_aprovacao) : null,
          media_recuperacao: form.media_recuperacao !== '' ? parseFloat(form.media_recuperacao) : null,
          nota_maxima: form.nota_maxima !== '' ? parseFloat(form.nota_maxima) : null,
          permite_recuperacao: form.permite_recuperacao !== '' ? form.permite_recuperacao === 'true' : null,
        }),
      })
      if (res.ok) {
        toast.success('Override salvo')
        setEditando(null)
        await carregar()
      } else {
        const data = await res.json()
        toast.error(data.mensagem || 'Erro ao salvar')
      }
    } catch (e) {
      toast.error('Erro ao salvar')
    } finally {
      setSalvando(null)
    }
  }

  const removerOverride = async (serieId: string) => {
    setSalvando(serieId)
    try {
      const res = await fetch(`/api/admin/escolas/${escolaId}/regras-avaliacao?serie_id=${serieId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Override removido')
        setEditando(null)
        await carregar()
      }
    } catch (e) {
      toast.error('Erro ao remover')
    } finally {
      setSalvando(null)
    }
  }

  if (carregando) return <LoadingSpinner text="Carregando regras..." centered />

  const etapas = ['educacao_infantil', 'fundamental_anos_iniciais', 'fundamental_anos_finais', 'eja']
  const porEtapa = etapas.map(etapa => ({
    etapa,
    label: ETAPA_LABELS[etapa] || etapa,
    series: series.filter(s => s.etapa === etapa).sort((a, b) => a.ordem - b.ordem),
  })).filter(g => g.series.length > 0)

  const totalOverrides = series.filter(s => s.override_id).length

  // Regras filtradas pelo tipo selecionado no form
  const regrasFiltradas = form.tipo_avaliacao_id
    ? regras.filter(r => r.tipo_avaliacao_id === form.tipo_avaliacao_id)
    : regras

  const TIPO_CORES: Record<string, string> = {
    parecer: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    conceito: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    numerico: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    misto: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-emerald-600" />
          Regras de Avaliacao por Serie
        </h3>
        {totalOverrides > 0 && (
          <span className="text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full">
            {totalOverrides} override(s) ativo(s)
          </span>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
        <strong>Como funciona:</strong> Cada serie tem uma regra padrao definida no sistema.
        Voce pode criar <strong>overrides</strong> para customizar o tipo de avaliacao, media de aprovacao
        ou nota maxima especificamente para esta escola. Campos em branco usam o padrao.
      </div>

      {porEtapa.map(grupo => (
        <div key={grupo.etapa}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${ETAPA_CORES[grupo.etapa] || 'bg-gray-100 text-gray-700'}`}>
              {grupo.label}
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-slate-600" />
          </div>

          <div className="space-y-3 mb-6">
            {grupo.series.map(s => {
              const temOverride = !!s.override_id
              const isEditando = editando === s.serie_id
              const tipoResultado = s.override_tipo_resultado || s.padrao_tipo_resultado || 'numerico'

              return (
                <div
                  key={s.serie_id}
                  className={`rounded-xl border transition-all ${
                    temOverride
                      ? 'border-orange-400 bg-orange-50/50 dark:bg-orange-900/10 dark:border-orange-600'
                      : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700/50'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">{s.serie_nome}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TIPO_CORES[tipoResultado] || 'bg-gray-100 text-gray-600'}`}>
                        {temOverride ? (s.override_tipo_nome || s.padrao_tipo_nome) : s.padrao_tipo_nome || 'Numerico'}
                      </span>
                      {temOverride && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-orange-200 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                          Override
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isEditando ? (
                        <button
                          onClick={() => iniciarEdicao(s)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-500 transition-colors"
                        >
                          {temOverride ? 'Editar' : 'Personalizar'}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => salvarOverride(s.serie_id)}
                            disabled={salvando === s.serie_id}
                            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            {salvando === s.serie_id ? 'Salvando...' : 'Salvar'}
                          </button>
                          {temOverride && (
                            <button
                              onClick={() => removerOverride(s.serie_id)}
                              disabled={salvando === s.serie_id}
                              className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 transition-colors"
                            >
                              Remover
                            </button>
                          )}
                          <button
                            onClick={() => setEditando(null)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Info resumida (não editando) */}
                  {!isEditando && (
                    <div className="px-4 pb-3 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Regra: <strong>{temOverride ? (s.override_regra_nome || s.padrao_regra_nome || '-') : (s.padrao_regra_nome || '-')}</strong></span>
                      <span>Media: <strong>{temOverride && s.override_media_aprovacao != null ? s.override_media_aprovacao : s.padrao_media_aprovacao ?? '-'}</strong></span>
                      <span>Nota max: <strong>{temOverride && s.override_nota_maxima != null ? s.override_nota_maxima : s.padrao_nota_maxima ?? '-'}</strong></span>
                      <span>Recuperacao: <strong>{temOverride && s.override_permite_recuperacao != null ? (s.override_permite_recuperacao ? 'Sim' : 'Nao') : (s.padrao_permite_recuperacao ? 'Sim' : 'Nao')}</strong></span>
                    </div>
                  )}

                  {/* Form de edição */}
                  {isEditando && (
                    <div className="px-4 pb-4 border-t border-gray-200 dark:border-slate-600 pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Tipo de Avaliacao
                            <span className="text-gray-400 ml-1">(padrao: {s.padrao_tipo_nome || '-'})</span>
                          </label>
                          <select
                            value={form.tipo_avaliacao_id}
                            onChange={e => setForm(f => ({ ...f, tipo_avaliacao_id: e.target.value, regra_avaliacao_id: '' }))}
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Usar padrao</option>
                            {tipos.map(t => (
                              <option key={t.id} value={t.id}>{t.nome}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Regra de Avaliacao
                            <span className="text-gray-400 ml-1">(padrao: {s.padrao_regra_nome || '-'})</span>
                          </label>
                          <select
                            value={form.regra_avaliacao_id}
                            onChange={e => setForm(f => ({ ...f, regra_avaliacao_id: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Usar padrao</option>
                            {regrasFiltradas.map(r => (
                              <option key={r.id} value={r.id}>{r.nome}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Media Aprovacao
                            <span className="text-gray-400 ml-1">(padrao: {s.padrao_media_aprovacao ?? '-'})</span>
                          </label>
                          <input
                            type="number"
                            value={form.media_aprovacao}
                            onChange={e => setForm(f => ({ ...f, media_aprovacao: e.target.value }))}
                            min={0} max={100} step={0.5}
                            placeholder="Usar padrao"
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Media Recuperacao
                          </label>
                          <input
                            type="number"
                            value={form.media_recuperacao}
                            onChange={e => setForm(f => ({ ...f, media_recuperacao: e.target.value }))}
                            min={0} max={100} step={0.5}
                            placeholder="Usar padrao"
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Nota Maxima
                            <span className="text-gray-400 ml-1">(padrao: {s.padrao_nota_maxima ?? '-'})</span>
                          </label>
                          <input
                            type="number"
                            value={form.nota_maxima}
                            onChange={e => setForm(f => ({ ...f, nota_maxima: e.target.value }))}
                            min={0} max={100} step={0.5}
                            placeholder="Usar padrao"
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Permite Recuperacao
                          </label>
                          <select
                            value={form.permite_recuperacao}
                            onChange={e => setForm(f => ({ ...f, permite_recuperacao: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Usar padrao</option>
                            <option value="true">Sim</option>
                            <option value="false">Nao</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================
// Aba 4: Calendario Letivo
// ============================================

function AbaCalendarioLetivo({
  escolaId,
  anoLetivo,
}: {
  escolaId: string
  anoLetivo: string
}) {
  const [periodos, setPeriodos] = useState<PeriodoLetivo[]>([])
  const [configNotas, setConfigNotas] = useState<ConfiguracaoNotasEscola | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      try {
        const [periodosRes, configRes] = await Promise.all([
          fetch(`/api/admin/periodos-letivos?ano_letivo=${anoLetivo}`),
          fetch(`/api/admin/configuracao-notas?escola_id=${escolaId}&ano_letivo=${anoLetivo}`),
        ])

        if (periodosRes.ok) {
          const data = await periodosRes.json()
          setPeriodos(Array.isArray(data) ? data : data.periodos || [])
        }

        if (configRes.ok) {
          const data = await configRes.json()
          const configs = Array.isArray(data) ? data : data.configuracoes || []
          if (configs.length > 0) setConfigNotas(configs[0])
        }
      } catch (error) {
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [escolaId, anoLetivo])

  if (carregando) {
    return <LoadingSpinner text="Carregando calendario..." centered />
  }

  const formatarData = (data: string | null) => {
    if (!data) return '-'
    return new Date(data).toLocaleDateString('pt-BR')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600" />
          Calendario Letivo ({anoLetivo})
        </h3>
        <a
          href="/admin/gestor-escolar"
          className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          Editar no Gestor Escolar
        </a>
      </div>

      {/* Periodos */}
      {periodos.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Calendar className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p>Nenhum periodo letivo configurado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {periodos.map(periodo => (
            <div key={periodo.id} className="bg-white dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{periodo.nome}</h4>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>Inicio: {formatarData(periodo.data_inicio)}</p>
                <p>Fim: {formatarData(periodo.data_fim)}</p>
                {periodo.dias_letivos != null && <p>Dias letivos: {periodo.dias_letivos}</p>}
              </div>
              <div className="mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  periodo.ativo
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-400'
                }`}>
                  {periodo.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Configuracao de Notas */}
      {configNotas && (
        <div className="bg-white dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-600" />
            Configuracao de Notas
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Media de Aprovacao:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">{configNotas.media_aprovacao}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Media de Recuperacao:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">{configNotas.media_recuperacao}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Nota Maxima:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">{configNotas.nota_maxima}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Aba 5: Turmas
// ============================================

function AbaTurmas({
  escolaId,
  anoLetivo,
}: {
  escolaId: string
  anoLetivo: string
}) {
  const { formatSerie } = useSeries()
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      try {
        const res = await fetch(`/api/admin/turmas?escola_id=${escolaId}&ano_letivo=${anoLetivo}`)
        if (res.ok) {
          const data = await res.json()
          setTurmas(Array.isArray(data) ? data : data.turmas || [])
        }
      } catch (error) {
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [escolaId, anoLetivo])

  if (carregando) {
    return <LoadingSpinner text="Carregando turmas..." centered />
  }

  const turnoLabel = (turno: string) => {
    const map: Record<string, string> = {
      matutino: 'Matutino',
      vespertino: 'Vespertino',
      noturno: 'Noturno',
      integral: 'Integral',
    }
    return map[turno] || turno
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-600" />
          Turmas ({anoLetivo})
        </h3>
        <a
          href={`/admin/turmas?escola_id=${escolaId}`}
          className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          Gerenciar Turmas
        </a>
      </div>

      {turmas.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Users className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p>Nenhuma turma cadastrada</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">Codigo</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">Nome</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">Serie</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">Turno</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">Alunos</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">Ocupacao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {turmas.map(turma => {
                const ocupacao = turma.capacidade
                  ? Math.round((turma.total_alunos / turma.capacidade) * 100)
                  : null
                return (
                  <tr key={turma.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                    <td className="py-3 px-4 text-sm font-mono text-gray-600 dark:text-gray-300">{turma.codigo || '-'}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{turma.nome}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">{formatSerie(turma.serie)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">{turnoLabel(turma.turno)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                      {turma.total_alunos}{turma.capacidade ? `/${turma.capacidade}` : ''}
                    </td>
                    <td className="py-3 px-4">
                      {ocupacao !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                ocupacao > 90 ? 'bg-red-500' : ocupacao > 70 ? 'bg-yellow-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(ocupacao, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{ocupacao}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ============================================
// Aba 6: Estatisticas
// ============================================

function AbaEstatisticas({
  escola,
  escolaId,
  anoLetivo,
}: {
  escola: EscolaDetalhe
  escolaId: string
  anoLetivo: string
}) {
  const [situacoes, setSituacoes] = useState<EstatisticasSituacao[]>([])
  const [porSerie, setPorSerie] = useState<EstatisticasSerie[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      try {
        const res = await fetch(`/api/admin/dashboard-gestor?escola_id=${escolaId}&ano_letivo=${anoLetivo}`)
        if (res.ok) {
          const data = await res.json()
          // Montar situacoes a partir dos dados do dashboard
          const sits: EstatisticasSituacao[] = []
          if (data.alunos?.cursando) sits.push({ situacao: 'cursando', total: data.alunos.cursando })
          if (data.alunos?.transferidos) sits.push({ situacao: 'transferido', total: data.alunos.transferidos })
          if (data.alunos?.abandono) sits.push({ situacao: 'abandono', total: data.alunos.abandono })
          if (data.alunos?.aprovados) sits.push({ situacao: 'aprovado', total: data.alunos.aprovados })
          if (data.alunos?.reprovados) sits.push({ situacao: 'reprovado', total: data.alunos.reprovados })
          setSituacoes(sits)

          // Montar por serie a partir da distribuicao
          if (data.distribuicao_serie) {
            setPorSerie(data.distribuicao_serie.map((s: any) => ({
              serie: s.serie,
              nome_serie: `${s.serie}º Ano`,
              total: s.total,
            })))
          }
        }
      } catch (error) {
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [escolaId, anoLetivo])

  const situacaoLabel = (sit: string) => {
    const map: Record<string, string> = {
      cursando: 'Cursando',
      transferido: 'Transferido',
      evadido: 'Evadido',
      aprovado: 'Aprovado',
      reprovado: 'Reprovado',
      concluido: 'Concluido',
      desistente: 'Desistente',
      remanejado: 'Remanejado',
    }
    return map[sit] || sit
  }

  const situacaoCor = (sit: string) => {
    const map: Record<string, string> = {
      cursando: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      transferido: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
      evadido: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      aprovado: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
      reprovado: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      concluido: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    }
    return map[sit] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-emerald-600" />
        Estatisticas ({anoLetivo})
      </h3>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 p-5">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{escola.total_alunos}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total de Alunos</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 p-5">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-lg p-2">
              <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{escola.total_turmas}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total de Turmas</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 p-5">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-2">
              <GraduationCap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{escola.total_pcd}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Alunos PCD</p>
            </div>
          </div>
        </div>
      </div>

      {carregando ? (
        <LoadingSpinner text="Carregando estatisticas..." centered />
      ) : (
        <>
          {/* Por situacao */}
          {situacoes.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Alunos por Situacao</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {situacoes.map(s => (
                  <div key={s.situacao} className={`rounded-lg p-3 ${situacaoCor(s.situacao)}`}>
                    <p className="text-xl font-bold">{s.total}</p>
                    <p className="text-sm">{situacaoLabel(s.situacao)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Por serie */}
          {porSerie.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Alunos por Serie</h4>
              <div className="space-y-2">
                {porSerie.map(s => {
                  const maxTotal = Math.max(...porSerie.map(x => x.total), 1)
                  const percent = (s.total / maxTotal) * 100
                  return (
                    <div key={s.serie} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-24 text-right">
                        {s.nome_serie || `${s.serie}º Ano`}
                      </span>
                      <div className="flex-1 h-6 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${Math.max(percent, 8)}%` }}
                        >
                          <span className="text-xs font-semibold text-white">{s.total}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
