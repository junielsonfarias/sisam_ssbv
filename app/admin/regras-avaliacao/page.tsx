'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useCallback } from 'react'
import { ClipboardList } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

import { TipoAvaliacao, RegraAvaliacao, ConceitoEscala } from './components/types'
import { TiposAvaliacaoTab } from './components/TiposAvaliacaoTab'
import { RegrasAvaliacaoTab } from './components/RegrasAvaliacaoTab'
import { ModalTipoAvaliacao, FormTipo } from './components/ModalTipoAvaliacao'
import { ModalRegraAvaliacao, FormRegra } from './components/ModalRegraAvaliacao'

// ============================================
// Componente Principal
// ============================================

export default function RegrasAvaliacaoPage() {
  const toast = useToast()
  const [abaAtiva, setAbaAtiva] = useState<'tipos' | 'regras'>('tipos')
  const [tipos, setTipos] = useState<TipoAvaliacao[]>([])
  const [regras, setRegras] = useState<RegraAvaliacao[]>([])
  const [carregando, setCarregando] = useState(true)

  // Modal tipo
  const [modalTipo, setModalTipo] = useState(false)
  const [tipoEditando, setTipoEditando] = useState<TipoAvaliacao | null>(null)
  const [formTipo, setFormTipo] = useState<FormTipo>({
    codigo: '', nome: '', descricao: '', tipo_resultado: 'numerico' as string,
    nota_minima: 0, nota_maxima: 10, permite_decimal: true,
    escala_conceitos: [] as ConceitoEscala[],
  })
  const [salvandoTipo, setSalvandoTipo] = useState(false)

  // Modal regra
  const [modalRegra, setModalRegra] = useState(false)
  const [regraEditando, setRegraEditando] = useState<RegraAvaliacao | null>(null)
  const [formRegra, setFormRegra] = useState<FormRegra>({
    nome: '', descricao: '', tipo_avaliacao_id: '',
    tipo_periodo: 'bimestral', qtd_periodos: 4,
    media_aprovacao: 6, media_recuperacao: 5, nota_maxima: 10,
    permite_recuperacao: true, recuperacao_por_periodo: false,
    max_dependencias: 0, formula_media: 'media_aritmetica',
    arredondamento: 'normal', casas_decimais: 1, aprovacao_automatica: false,
  })
  const [salvandoRegra, setSalvandoRegra] = useState(false)

  // Regras expandidas
  const [regrasExpandidas, setRegrasExpandidas] = useState<string[]>([])

  // ============================================
  // Carregar dados
  // ============================================

  const carregarDados = useCallback(async () => {
    try {
      const [tiposRes, regrasRes] = await Promise.all([
        fetch('/api/admin/tipos-avaliacao?todos=true'),
        fetch('/api/admin/regras-avaliacao?todos=true'),
      ])
      if (tiposRes.ok) setTipos(await tiposRes.json())
      if (regrasRes.ok) setRegras(await regrasRes.json())
    } catch (error) {
      toast.error('Erro ao carregar dados')
    } finally {
      setCarregando(false)
    }
  }, [toast])

  useEffect(() => { carregarDados() }, [carregarDados])

  // ============================================
  // Tipos - CRUD
  // ============================================

  const abrirModalTipo = (tipo?: TipoAvaliacao) => {
    if (tipo) {
      setTipoEditando(tipo)
      setFormTipo({
        codigo: tipo.codigo,
        nome: tipo.nome,
        descricao: tipo.descricao || '',
        tipo_resultado: tipo.tipo_resultado,
        nota_minima: parseFloat(String(tipo.nota_minima)) || 0,
        nota_maxima: parseFloat(String(tipo.nota_maxima)) || 10,
        permite_decimal: tipo.permite_decimal,
        escala_conceitos: tipo.escala_conceitos || [],
      })
    } else {
      setTipoEditando(null)
      setFormTipo({
        codigo: '', nome: '', descricao: '', tipo_resultado: 'numerico',
        nota_minima: 0, nota_maxima: 10, permite_decimal: true,
        escala_conceitos: [],
      })
    }
    setModalTipo(true)
  }

  const salvarTipo = async () => {
    if (!formTipo.codigo || !formTipo.nome || !formTipo.tipo_resultado) {
      toast.error('Preencha codigo, nome e tipo de resultado')
      return
    }
    setSalvandoTipo(true)
    try {
      const payload = {
        ...formTipo,
        escala_conceitos: formTipo.tipo_resultado === 'conceito' ? formTipo.escala_conceitos : null,
        ...(tipoEditando ? { id: tipoEditando.id } : {}),
      }
      const res = await fetch('/api/admin/tipos-avaliacao', {
        method: tipoEditando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(tipoEditando ? 'Tipo atualizado com sucesso' : 'Tipo criado com sucesso')
        setModalTipo(false)
        await carregarDados()
      } else {
        toast.error(data.mensagem || 'Erro ao salvar tipo')
      }
    } catch (error) {
      toast.error('Erro ao salvar tipo')
    } finally {
      setSalvandoTipo(false)
    }
  }

  // ============================================
  // Regras - CRUD
  // ============================================

  const abrirModalRegra = (regra?: RegraAvaliacao) => {
    if (regra) {
      setRegraEditando(regra)
      setFormRegra({
        nome: regra.nome,
        descricao: regra.descricao || '',
        tipo_avaliacao_id: regra.tipo_avaliacao_id,
        tipo_periodo: regra.tipo_periodo,
        qtd_periodos: regra.qtd_periodos,
        media_aprovacao: parseFloat(String(regra.media_aprovacao)) || 0,
        media_recuperacao: parseFloat(String(regra.media_recuperacao)) || 0,
        nota_maxima: parseFloat(String(regra.nota_maxima)) || 10,
        permite_recuperacao: regra.permite_recuperacao,
        recuperacao_por_periodo: regra.recuperacao_por_periodo,
        max_dependencias: regra.max_dependencias,
        formula_media: regra.formula_media,
        arredondamento: regra.arredondamento,
        casas_decimais: regra.casas_decimais,
        aprovacao_automatica: regra.aprovacao_automatica,
      })
    } else {
      setRegraEditando(null)
      setFormRegra({
        nome: '', descricao: '', tipo_avaliacao_id: '',
        tipo_periodo: 'bimestral', qtd_periodos: 4,
        media_aprovacao: 6, media_recuperacao: 5, nota_maxima: 10,
        permite_recuperacao: true, recuperacao_por_periodo: false,
        max_dependencias: 0, formula_media: 'media_aritmetica',
        arredondamento: 'normal', casas_decimais: 1, aprovacao_automatica: false,
      })
    }
    setModalRegra(true)
  }

  const salvarRegra = async () => {
    if (!formRegra.nome || !formRegra.tipo_avaliacao_id) {
      toast.error('Preencha nome e tipo de avaliacao')
      return
    }
    setSalvandoRegra(true)
    try {
      const payload = {
        ...formRegra,
        ...(regraEditando ? { id: regraEditando.id } : {}),
      }
      const res = await fetch('/api/admin/regras-avaliacao', {
        method: regraEditando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(regraEditando ? 'Regra atualizada com sucesso' : 'Regra criada com sucesso')
        setModalRegra(false)
        await carregarDados()
      } else {
        toast.error(data.mensagem || 'Erro ao salvar regra')
      }
    } catch (error) {
      toast.error('Erro ao salvar regra')
    } finally {
      setSalvandoRegra(false)
    }
  }

  const excluirRegra = async (regra: RegraAvaliacao) => {
    if (parseInt(String(regra.total_series)) > 0) {
      toast.warning(`Esta regra esta vinculada a ${regra.total_series} serie(s). Desvincule antes de excluir.`)
      return
    }
    if (!confirm(`Deseja desativar a regra "${regra.nome}"?`)) return
    try {
      const res = await fetch(`/api/admin/regras-avaliacao?id=${regra.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Regra desativada com sucesso')
        await carregarDados()
      } else {
        toast.error(data.mensagem || 'Erro ao desativar regra')
      }
    } catch (error) {
      toast.error('Erro ao desativar regra')
    }
  }

  const toggleRegraExpandida = (id: string) => {
    setRegrasExpandidas(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    )
  }

  // ============================================
  // Conceitos helpers
  // ============================================

  const adicionarConceito = () => {
    setFormTipo(prev => ({
      ...prev,
      escala_conceitos: [...prev.escala_conceitos, { codigo: '', nome: '', valor_numerico: 0 }],
    }))
  }

  const removerConceito = (idx: number) => {
    setFormTipo(prev => ({
      ...prev,
      escala_conceitos: prev.escala_conceitos.filter((_, i) => i !== idx),
    }))
  }

  const atualizarConceito = (idx: number, campo: string, valor: any) => {
    setFormTipo(prev => ({
      ...prev,
      escala_conceitos: prev.escala_conceitos.map((c, i) =>
        i === idx ? { ...c, [campo]: campo === 'valor_numerico' ? parseFloat(valor) || 0 : valor } : c
      ),
    }))
  }

  // ============================================
  // Ajustar qtd_periodos automaticamente
  // ============================================

  const handleTipoPeriodoChange = (valor: string) => {
    const mapa: Record<string, number> = { anual: 1, semestral: 2, trimestral: 3, bimestral: 4 }
    setFormRegra(prev => ({
      ...prev,
      tipo_periodo: valor,
      qtd_periodos: mapa[valor] || 4,
    }))
  }

  // ============================================
  // Conceito chips colors
  // ============================================

  const getConceitoColor = (codigo: string) => {
    const cores: Record<string, string> = {
      E: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      B: 'bg-blue-100 text-blue-800 border-blue-300',
      R: 'bg-amber-100 text-amber-800 border-amber-300',
      I: 'bg-red-100 text-red-800 border-red-300',
    }
    return cores[codigo] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  // ============================================
  // Render
  // ============================================

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white p-6 rounded-b-lg shadow-lg">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Regras de Avaliacao</h1>
                <p className="text-slate-300 text-sm mt-1">Gerencie os tipos e regras de avaliacao do municipio (padrao INEP)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4">
          {/* Abas */}
          <div className="flex border-b border-gray-200 dark:border-slate-700 mb-6">
            <button
              onClick={() => setAbaAtiva('tipos')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                abaAtiva === 'tipos'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Tipos de Avaliacao
            </button>
            <button
              onClick={() => setAbaAtiva('regras')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                abaAtiva === 'regras'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Regras de Avaliacao
            </button>
          </div>

          {carregando ? (
            <div className="flex justify-center items-center py-20">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {abaAtiva === 'tipos' && (
                <TiposAvaliacaoTab
                  tipos={tipos}
                  abrirModalTipo={abrirModalTipo}
                  getConceitoColor={getConceitoColor}
                />
              )}

              {abaAtiva === 'regras' && (
                <RegrasAvaliacaoTab
                  regras={regras}
                  regrasExpandidas={regrasExpandidas}
                  toggleRegraExpandida={toggleRegraExpandida}
                  abrirModalRegra={abrirModalRegra}
                  excluirRegra={excluirRegra}
                />
              )}
            </>
          )}
        </div>

        {/* Modals */}
        {modalTipo && (
          <ModalTipoAvaliacao
            tipoEditando={tipoEditando}
            formTipo={formTipo}
            setFormTipo={setFormTipo}
            salvandoTipo={salvandoTipo}
            salvarTipo={salvarTipo}
            fechar={() => setModalTipo(false)}
            adicionarConceito={adicionarConceito}
            removerConceito={removerConceito}
            atualizarConceito={atualizarConceito}
          />
        )}

        {modalRegra && (
          <ModalRegraAvaliacao
            regraEditando={regraEditando}
            formRegra={formRegra}
            setFormRegra={setFormRegra}
            salvandoRegra={salvandoRegra}
            salvarRegra={salvarRegra}
            fechar={() => setModalRegra(false)}
            tipos={tipos}
            handleTipoPeriodoChange={handleTipoPeriodoChange}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}
