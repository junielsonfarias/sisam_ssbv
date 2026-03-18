'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, School, Building2, MapPin, ToggleLeft,
  BookOpen, Calendar, Users, BarChart3, CheckCircle, XCircle,
  Link as LinkIcon, GraduationCap, Info
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// ============================================
// Tipos
// ============================================

type AbaId = 'dados' | 'infraestrutura' | 'series' | 'calendario' | 'turmas' | 'estatisticas'

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
      console.error('Erro ao carregar escola:', error)
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
      console.error('Erro ao carregar series:', error)
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
      console.error('Erro ao carregar polos:', error)
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
      const { total_turmas, total_alunos, total_pcd, polo_nome, ...dadosParaSalvar } = formData as any
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
      console.error('Erro ao salvar escola:', error)
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
  const [todasSeries, setTodasSeries] = useState<ConfigSerie[]>([])
  const [carregando, setCarregando] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    const carregar = async () => {
      try {
        const res = await fetch('/api/admin/configuracao-series')
        if (res.ok) {
          const data = await res.json()
          setTodasSeries(data.series || [])
        }
      } catch (error) {
        console.error('Erro ao carregar series:', error)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  const seriesVinculadas = new Set(seriesEscola.map(s => s.serie))

  const handleToggleSerie = async (serie: string) => {
    setToggling(serie)
    try {
      if (seriesVinculadas.has(serie)) {
        const res = await fetch(
          `/api/admin/escolas/${escolaId}/series?serie=${serie}&ano_letivo=${anoLetivo}`,
          { method: 'DELETE' }
        )
        if (res.ok) {
          toast.success(`Serie ${serie} removida`)
          await onRecarregar()
        } else {
          const data = await res.json()
          toast.error(data.mensagem || 'Erro ao remover serie')
        }
      } else {
        const res = await fetch(`/api/admin/escolas/${escolaId}/series`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serie, ano_letivo: anoLetivo }),
        })
        if (res.ok) {
          toast.success(`Serie ${serie} vinculada`)
          await onRecarregar()
        } else {
          const data = await res.json()
          toast.error(data.mensagem || 'Erro ao vincular serie')
        }
      }
    } catch (error) {
      console.error('Erro ao alternar serie:', error)
      toast.error('Erro ao alternar serie')
    } finally {
      setToggling(null)
    }
  }

  if (carregando) {
    return <LoadingSpinner text="Carregando series..." centered />
  }

  // Build full list 1-9 with config data
  const seriesList = Array.from({ length: 9 }, (_, i) => {
    const num = (i + 1).toString()
    const config = todasSeries.find(s => s.serie === num)
    const vinculada = seriesVinculadas.has(num)
    const serieEscola = seriesEscola.find(s => s.serie === num)
    return { num, config, vinculada, serieEscola }
  })

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-emerald-600" />
        Series Oferecidas ({anoLetivo})
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {seriesList.map(({ num, config, vinculada }) => (
          <div
            key={num}
            className={`p-4 rounded-xl border transition-all ${
              vinculada
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-600 shadow-sm'
                : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className={`w-5 h-5 ${vinculada ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className="font-semibold text-gray-900 dark:text-white">
                  {config?.nome_serie || `${num}º Ano`}
                </span>
              </div>
              <button
                onClick={() => handleToggleSerie(num)}
                disabled={toggling === num}
                className={`w-11 h-6 rounded-full relative transition-colors ${
                  vinculada ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-500'
                } ${toggling === num ? 'opacity-50' : ''}`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${
                    vinculada ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {config && (
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>Tipo: {config.tipo_ensino === 'anos_iniciais' ? 'Anos Iniciais' : 'Anos Finais'}</p>
                {config.media_aprovacao != null && <p>Media aprovacao: {config.media_aprovacao}</p>}
                {config.max_dependencias != null && <p>Max dependencias: {config.max_dependencias}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
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
          fetch(`/api/admin/gestor-escolar/periodos?ano_letivo=${anoLetivo}`),
          fetch(`/api/admin/gestor-escolar/configuracao-notas?escola_id=${escolaId}&ano_letivo=${anoLetivo}`),
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
        console.error('Erro ao carregar calendario:', error)
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
        console.error('Erro ao carregar turmas:', error)
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
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">{turma.serie}º Ano</td>
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
        const [sitRes, serieRes] = await Promise.all([
          fetch(`/api/admin/alunos/estatisticas?escola_id=${escolaId}&ano_letivo=${anoLetivo}&tipo=situacao`),
          fetch(`/api/admin/alunos/estatisticas?escola_id=${escolaId}&ano_letivo=${anoLetivo}&tipo=serie`),
        ])

        if (sitRes.ok) {
          const data = await sitRes.json()
          setSituacoes(Array.isArray(data) ? data : data.dados || [])
        }

        if (serieRes.ok) {
          const data = await serieRes.json()
          setPorSerie(Array.isArray(data) ? data : data.dados || [])
        }
      } catch (error) {
        console.error('Erro ao carregar estatisticas:', error)
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
