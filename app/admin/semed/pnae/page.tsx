'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ClipboardList, Plus, Stethoscope, TrendingUp, UtensilsCrossed,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { ConfirmModal } from '@/components/ui/confirm-modal'

import { AbaCardapio } from './components/aba-cardapio'
import { AbaAtendimentos } from './components/aba-atendimentos'
import { AbaNutricionistas } from './components/aba-nutricionistas'
import { ModalNovoCardapio } from './components/modal-novo-cardapio'
import { ModalAtendimento } from './components/modal-atendimento'
import { ModalNutricionista } from './components/modal-nutricionista'
import {
  AbaPnae, ATENDIMENTO_VAZIO, Cardapio, CARDAPIO_VAZIO, Escola, FormAtendimento,
  FormCardapio, FormNutricionista, FormRefeicao, NUTRICIONISTA_VAZIA, Nutricionista,
  REFEICAO_VAZIA, ResumoLinha,
} from './components/types'

function PnaeAdmin() {
  const toast = useToast()
  const [aba, setAba] = useState<AbaPnae>('cardapio')
  const [escolas, setEscolas] = useState<Escola[]>([])

  // Cardapio
  const [escolaSelecionada, setEscolaSelecionada] = useState('')
  const [faixaSelecionada, setFaixaSelecionada] = useState<string>('fundamental')
  const [dataReferencia, setDataReferencia] = useState(new Date().toISOString().slice(0, 10))
  const [cardapio, setCardapio] = useState<Cardapio | null>(null)
  const [carregandoCardapio, setCarregandoCardapio] = useState(false)

  // Modais
  const [modalNovoCardapio, setModalNovoCardapio] = useState(false)
  const [modalAtendimento, setModalAtendimento] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [novoCardapio, setNovoCardapio] = useState<FormCardapio>(CARDAPIO_VAZIO)
  const [novaRefeicao, setNovaRefeicao] = useState<FormRefeicao>(REFEICAO_VAZIA)
  const [atendimento, setAtendimento] = useState<FormAtendimento>(ATENDIMENTO_VAZIO)

  // Atendimentos resumo
  const [resumoAno, setResumoAno] = useState(new Date().getFullYear())
  const [resumoMes, setResumoMes] = useState(new Date().getMonth() + 1)
  const [resumoEscola, setResumoEscola] = useState('')
  const [resumo, setResumo] = useState<ResumoLinha[]>([])
  const [carregandoResumo, setCarregandoResumo] = useState(false)

  // Nutricionistas
  const [nutricionistas, setNutricionistas] = useState<Nutricionista[]>([])
  const [incluirInativos, setIncluirInativos] = useState(false)
  const [carregandoNut, setCarregandoNut] = useState(false)
  const [modalNutricionista, setModalNutricionista] = useState(false)
  const [novaNut, setNovaNut] = useState<FormNutricionista>(NUTRICIONISTA_VAZIA)
  const [confirmarToggleNut, setConfirmarToggleNut] = useState<Nutricionista | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/escolas', { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setEscolas(Array.isArray(data) ? data : []))
      .catch(() => {})
    return () => controller.abort()
  }, [])

  // ============================================================================
  // CARDAPIO
  // ============================================================================
  const carregarCardapio = useCallback(async () => {
    if (!escolaSelecionada || !faixaSelecionada) {
      setCardapio(null)
      return
    }
    setCarregandoCardapio(true)
    try {
      const params = new URLSearchParams({
        escola: escolaSelecionada,
        faixa: faixaSelecionada,
        data: dataReferencia,
      })
      const res = await fetch(`/api/admin/pnae/cardapios?${params}`)
      const data = await res.json()
      setCardapio(data.cardapio)
    } catch {
      toast.error('Erro ao carregar cardápio')
    } finally {
      setCarregandoCardapio(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaSelecionada, faixaSelecionada, dataReferencia])

  useEffect(() => {
    if (aba === 'cardapio') carregarCardapio()
  }, [aba, carregarCardapio])

  function adicionarRefeicao() {
    if (!novaRefeicao.descricao.trim()) {
      toast.error('Informe a descrição da refeição')
      return
    }
    setNovoCardapio({
      ...novoCardapio,
      refeicoes: [...novoCardapio.refeicoes, {
        dia_semana: novaRefeicao.dia_semana,
        tipo: novaRefeicao.tipo,
        descricao: novaRefeicao.descricao.trim(),
        kcal: novaRefeicao.kcal ? parseFloat(novaRefeicao.kcal) : undefined,
      }],
    })
    setNovaRefeicao({ ...novaRefeicao, descricao: '', kcal: '' })
  }

  function removerRefeicao(i: number) {
    setNovoCardapio({
      ...novoCardapio,
      refeicoes: novoCardapio.refeicoes.filter((_, j) => j !== i),
    })
  }

  async function salvarCardapio() {
    if (!novoCardapio.semana_inicio || !novoCardapio.semana_fim) {
      toast.error('Informe início e fim da semana')
      return
    }
    if (novoCardapio.refeicoes.length === 0) {
      toast.error('Adicione ao menos uma refeição')
      return
    }
    setSalvando(true)
    try {
      const body = {
        escola_id: novoCardapio.escola_id || null,
        semana_inicio: novoCardapio.semana_inicio,
        semana_fim: novoCardapio.semana_fim,
        faixa_etaria: novoCardapio.faixa_etaria,
        observacoes: novoCardapio.observacoes || undefined,
        publicar: novoCardapio.publicar,
        refeicoes: novoCardapio.refeicoes,
      }
      const res = await fetch('/api/admin/pnae/cardapios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Cardápio criado' + (novoCardapio.publicar ? ' e publicado' : ''))
      setModalNovoCardapio(false)
      setNovoCardapio(CARDAPIO_VAZIO)
      carregarCardapio()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  // ============================================================================
  // ATENDIMENTOS
  // ============================================================================
  const carregarResumo = useCallback(async () => {
    setCarregandoResumo(true)
    try {
      const params = new URLSearchParams({ ano: String(resumoAno), mes: String(resumoMes) })
      if (resumoEscola) params.set('escola', resumoEscola)
      const res = await fetch(`/api/admin/pnae/atendimentos?${params}`)
      const data = await res.json()
      setResumo(data.resumo || [])
    } catch {
      toast.error('Erro ao carregar resumo')
    } finally {
      setCarregandoResumo(false)
    }
  }, [resumoAno, resumoMes, resumoEscola, toast])

  useEffect(() => {
    if (aba === 'atendimentos') carregarResumo()
  }, [aba, carregarResumo])

  async function salvarAtendimento() {
    if (!atendimento.escola_id) {
      toast.error('Selecione a escola')
      return
    }
    if (!atendimento.qtd_alunos || parseInt(atendimento.qtd_alunos, 10) < 0) {
      toast.error('Informe a quantidade de alunos')
      return
    }
    setSalvando(true)
    try {
      const body = {
        escola_id: atendimento.escola_id,
        data_atendimento: atendimento.data_atendimento,
        faixa_etaria: atendimento.faixa_etaria,
        tipo_refeicao: atendimento.tipo_refeicao,
        qtd_alunos: parseInt(atendimento.qtd_alunos, 10),
        qtd_extra: atendimento.qtd_extra ? parseInt(atendimento.qtd_extra, 10) : 0,
        observacoes: atendimento.observacoes || undefined,
      }
      const res = await fetch('/api/admin/pnae/atendimentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Atendimento registrado')
      setModalAtendimento(false)
      setAtendimento({ ...atendimento, qtd_alunos: '', qtd_extra: '', observacoes: '' })
      carregarResumo()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  // ============================================================================
  // NUTRICIONISTAS
  // ============================================================================
  const carregarNutricionistas = useCallback(async (signal?: AbortSignal) => {
    setCarregandoNut(true)
    try {
      const p = new URLSearchParams()
      if (incluirInativos) p.set('inativos', 'true')
      const res = await fetch(`/api/admin/pnae/nutricionistas?${p}`, { signal })
      const data = await res.json()
      setNutricionistas(data.nutricionistas || [])
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error('Erro ao carregar nutricionistas')
    } finally {
      setCarregandoNut(false)
    }
  }, [incluirInativos, toast])

  useEffect(() => {
    if (aba === 'nutricionistas') {
      const controller = new AbortController()
      carregarNutricionistas(controller.signal)
      return () => controller.abort()
    }
  }, [aba, carregarNutricionistas])

  async function salvarNutricionista() {
    if (!novaNut.nome.trim() || !novaNut.crn.trim()) {
      toast.error('Nome e CRN são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        nome: novaNut.nome.trim(),
        crn: novaNut.crn.trim(),
        responsavel_tecnico: novaNut.responsavel_tecnico,
      }
      if (novaNut.telefone) body.telefone = novaNut.telefone
      if (novaNut.email) body.email = novaNut.email

      const res = await fetch('/api/admin/pnae/nutricionistas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Nutricionista cadastrada')
      setModalNutricionista(false)
      setNovaNut(NUTRICIONISTA_VAZIA)
      carregarNutricionistas()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  async function executarToggleStatusNut() {
    if (!confirmarToggleNut) return
    const n = confirmarToggleNut
    try {
      const res = await fetch(`/api/admin/pnae/nutricionistas?id=${n.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativa: !n.ativa }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success(`${n.nome} ${n.ativa ? 'inativada' : 'reativada'}`)
      carregarNutricionistas()
    } catch (e) { toast.error((e as Error).message) } finally { setConfirmarToggleNut(null) }
  }

  return (
    <div>
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">PNAE — Alimentação Escolar</h1>
              <p className="text-green-100 text-sm">Programa Nacional de Alimentação Escolar (Lei 11.947/2009)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setModalNovoCardapio(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold transition-colors">
              <Plus className="w-4 h-4" /> Novo cardápio
            </button>
            <button onClick={() => setModalAtendimento(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-green-700 hover:bg-green-50 text-sm font-bold transition-colors">
              <Plus className="w-4 h-4" /> Registrar atendimento
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
        {[
          { key: 'cardapio' as const, label: 'Cardápio Semanal', icon: ClipboardList },
          { key: 'atendimentos' as const, label: 'Atendimentos (FNDE)', icon: TrendingUp },
          { key: 'nutricionistas' as const, label: 'Nutricionistas', icon: Stethoscope },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setAba(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
              aba === tab.key
                ? 'border-green-600 text-green-700 dark:text-green-300'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {aba === 'cardapio' && (
        <AbaCardapio
          escolas={escolas}
          escolaSelecionada={escolaSelecionada}
          faixaSelecionada={faixaSelecionada}
          dataReferencia={dataReferencia}
          cardapio={cardapio}
          carregando={carregandoCardapio}
          onChangeEscola={setEscolaSelecionada}
          onChangeFaixa={setFaixaSelecionada}
          onChangeData={setDataReferencia}
          onCriarCardapio={() => {
            setNovoCardapio({ ...CARDAPIO_VAZIO, escola_id: escolaSelecionada, faixa_etaria: faixaSelecionada })
            setModalNovoCardapio(true)
          }}
        />
      )}

      {aba === 'atendimentos' && (
        <AbaAtendimentos
          escolas={escolas}
          resumoAno={resumoAno}
          resumoMes={resumoMes}
          resumoEscola={resumoEscola}
          resumo={resumo}
          carregando={carregandoResumo}
          onChangeAno={setResumoAno}
          onChangeMes={setResumoMes}
          onChangeEscola={setResumoEscola}
        />
      )}

      {aba === 'nutricionistas' && (
        <AbaNutricionistas
          nutricionistas={nutricionistas}
          incluirInativos={incluirInativos}
          carregando={carregandoNut}
          onToggleInativos={setIncluirInativos}
          onNova={() => { setNovaNut(NUTRICIONISTA_VAZIA); setModalNutricionista(true) }}
          onAlterarStatus={setConfirmarToggleNut}
        />
      )}

      <ModalNovoCardapio
        aberto={modalNovoCardapio}
        escolas={escolas}
        form={novoCardapio}
        novaRefeicao={novaRefeicao}
        salvando={salvando}
        onChange={setNovoCardapio}
        onChangeNovaRefeicao={setNovaRefeicao}
        onAdicionarRefeicao={adicionarRefeicao}
        onRemoverRefeicao={removerRefeicao}
        onFechar={() => setModalNovoCardapio(false)}
        onSalvar={salvarCardapio}
      />

      <ModalAtendimento
        aberto={modalAtendimento}
        escolas={escolas}
        form={atendimento}
        salvando={salvando}
        onChange={setAtendimento}
        onFechar={() => setModalAtendimento(false)}
        onSalvar={salvarAtendimento}
      />

      <ModalNutricionista
        aberto={modalNutricionista}
        form={novaNut}
        salvando={salvando}
        onChange={setNovaNut}
        onFechar={() => setModalNutricionista(false)}
        onSalvar={salvarNutricionista}
      />

      <ConfirmModal
        aberto={!!confirmarToggleNut}
        titulo={confirmarToggleNut?.ativa ? 'Inativar nutricionista?' : 'Reativar nutricionista?'}
        mensagem={confirmarToggleNut ? `Confirma ${confirmarToggleNut.ativa ? 'inativar' : 'reativar'} ${confirmarToggleNut.nome}?` : ''}
        variant={confirmarToggleNut?.ativa ? 'warning' : 'info'}
        textoConfirmar={confirmarToggleNut?.ativa ? 'Inativar' : 'Reativar'}
        onConfirmar={executarToggleStatusNut}
        onFechar={() => setConfirmarToggleNut(null)}
      />
    </div>
  )
}

export default function PnaeAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <PnaeAdmin />
    </ProtectedRoute>
  )
}
