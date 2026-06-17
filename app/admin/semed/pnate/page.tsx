'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AlertCircle, Bus, Car, CreditCard, Plus, Route,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'

import { AbaRotas } from './components/aba-rotas'
import { AbaVeiculos } from './components/aba-veiculos'
import { AbaMotoristas } from './components/aba-motoristas'
import { AbaAlertas } from './components/aba-alertas'
import { ModalVeiculo } from './components/modal-veiculo'
import { ModalMotorista } from './components/modal-motorista'
import { ModalVincularAluno } from './components/modal-vincular-aluno'
import { ModalRota } from './components/modal-rota'
import {
  AbaPnate, Alerta, AlunoBuscaPnate, Escola, FormMotorista, FormParada,
  FormRota, FormVeiculo, MOTORISTA_VAZIO, Motorista, PARADA_VAZIA,
  ROTA_VAZIA, RotaResumo, TipoUso, VEICULO_VAZIO, Veiculo,
} from './components/types'

function PnateAdmin() {
  const toast = useToast()
  const [aba, setAba] = useState<AbaPnate>('rotas')
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [rotas, setRotas] = useState<RotaResumo[]>([])
  const [alertaVeiculos, setAlertaVeiculos] = useState<Alerta[]>([])
  const [alertaMotoristas, setAlertaMotoristas] = useState<Alerta[]>([])
  const [carregando, setCarregando] = useState(false)
  const [filtroEscola, setFiltroEscola] = useState('')

  const [modalVeiculo, setModalVeiculo] = useState(false)
  const [modalMotorista, setModalMotorista] = useState(false)
  const [modalRota, setModalRota] = useState(false)
  const [modalVincular, setModalVincular] = useState<RotaResumo | null>(null)
  const [salvando, setSalvando] = useState(false)

  // Vincular aluno à rota
  const [alunoVincSelecionado, setAlunoVincSelecionado] = useState<AlunoBuscaPnate | null>(null)
  const [tipoUso, setTipoUso] = useState<TipoUso>('ida_volta')
  const [vigenciaInicio, setVigenciaInicio] = useState(new Date().toISOString().slice(0, 10))

  const [novoVeiculo, setNovoVeiculo] = useState<FormVeiculo>(VEICULO_VAZIO)
  const [novoMotorista, setNovoMotorista] = useState<FormMotorista>(MOTORISTA_VAZIO)
  const [novaRota, setNovaRota] = useState<FormRota>(ROTA_VAZIA)
  const [novaParada, setNovaParada] = useState<FormParada>(PARADA_VAZIA)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      if (aba === 'rotas') {
        const p = new URLSearchParams({ recurso: 'rotas' })
        if (filtroEscola) p.set('escola', filtroEscola)
        const res = await fetch(`/api/admin/pnate?${p}`)
        const data = await res.json()
        setRotas(data.rotas || [])
      } else if (aba === 'veiculos') {
        const res = await fetch('/api/admin/pnate?recurso=veiculos')
        const data = await res.json()
        setVeiculos(data.veiculos || [])
      } else if (aba === 'motoristas') {
        const res = await fetch('/api/admin/pnate?recurso=motoristas')
        const data = await res.json()
        setMotoristas(data.motoristas || [])
      } else if (aba === 'alertas') {
        const res = await fetch('/api/admin/pnate?recurso=alertas')
        const data = await res.json()
        setAlertaVeiculos(data.veiculos || [])
        setAlertaMotoristas(data.motoristas || [])
      }
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setCarregando(false)
    }
  }, [aba, filtroEscola, toast])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/escolas', { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setEscolas(Array.isArray(data) ? data : []))
      .catch((e) => { if ((e as Error).name !== 'AbortError') console.error('[PNATE] escolas', e) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    carregar()
    // pré-carrega veículos+motoristas pra montar selects do modal de rota
    if (veiculos.length === 0) {
      fetch('/api/admin/pnate?recurso=veiculos', { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => setVeiculos(d.veiculos || []))
        .catch((e) => { if ((e as Error).name !== 'AbortError') console.error('[PNATE] veiculos', e) })
    }
    if (motoristas.length === 0) {
      fetch('/api/admin/pnate?recurso=motoristas', { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => setMotoristas(d.motoristas || []))
        .catch((e) => { if ((e as Error).name !== 'AbortError') console.error('[PNATE] motoristas', e) })
    }
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregar])

  function abrirVincular(r: RotaResumo) {
    setModalVincular(r)
    setAlunoVincSelecionado(null)
    setTipoUso('ida_volta')
    setVigenciaInicio(new Date().toISOString().slice(0, 10))
  }

  async function vincularAluno() {
    if (!modalVincular || !alunoVincSelecionado) {
      toast.error('Selecione um aluno')
      return
    }
    setSalvando(true)
    try {
      const res = await fetch('/api/admin/pnate?acao=vincular_aluno', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aluno_id: alunoVincSelecionado.id,
          rota_id: modalVincular.id,
          tipo_uso: tipoUso,
          vigencia_inicio: vigenciaInicio,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success(`${alunoVincSelecionado.nome} vinculado(a) à rota ${modalVincular.codigo}`)
      setModalVincular(null)
      setAlunoVincSelecionado(null)
      setTipoUso('ida_volta')
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  async function salvarVeiculo() {
    if (!novoVeiculo.placa.trim() || !novoVeiculo.capacidade) {
      toast.error('Placa e capacidade são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        placa: novoVeiculo.placa.trim().toUpperCase(),
        tipo: novoVeiculo.tipo,
        capacidade: parseInt(novoVeiculo.capacidade, 10),
        vinculo: novoVeiculo.vinculo,
        acessivel_pcd: novoVeiculo.acessivel_pcd,
      }
      if (novoVeiculo.marca) body.marca = novoVeiculo.marca
      if (novoVeiculo.modelo) body.modelo = novoVeiculo.modelo
      if (novoVeiculo.ano_fabricacao) body.ano_fabricacao = parseInt(novoVeiculo.ano_fabricacao, 10)
      if (novoVeiculo.combustivel) body.combustivel = novoVeiculo.combustivel
      if (novoVeiculo.empresa_terceirizada) body.empresa_terceirizada = novoVeiculo.empresa_terceirizada
      if (novoVeiculo.vistoria_data) body.vistoria_data = novoVeiculo.vistoria_data
      if (novoVeiculo.vistoria_validade) body.vistoria_validade = novoVeiculo.vistoria_validade
      if (novoVeiculo.observacoes) body.observacoes = novoVeiculo.observacoes

      const res = await fetch('/api/admin/pnate?acao=veiculo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Veículo cadastrado')
      setModalVeiculo(false)
      setNovoVeiculo(VEICULO_VAZIO)
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  async function salvarMotorista() {
    if (!novoMotorista.nome.trim() || !novoMotorista.cpf || !novoMotorista.cnh_numero || !novoMotorista.cnh_validade) {
      toast.error('Nome, CPF, CNH e validade são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        nome: novoMotorista.nome.trim(),
        cpf: novoMotorista.cpf.replace(/\D/g, ''),
        cnh_numero: novoMotorista.cnh_numero,
        cnh_categoria: novoMotorista.cnh_categoria,
        cnh_validade: novoMotorista.cnh_validade,
        vinculo: novoMotorista.vinculo,
      }
      if (novoMotorista.curso_escolar_validade) body.curso_escolar_validade = novoMotorista.curso_escolar_validade
      if (novoMotorista.telefone) body.telefone = novoMotorista.telefone

      const res = await fetch('/api/admin/pnate?acao=motorista', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Motorista cadastrado')
      setModalMotorista(false)
      setNovoMotorista(MOTORISTA_VAZIO)
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  function adicionarParada() {
    if (!novaParada.endereco.trim()) {
      toast.error('Informe o endereço da parada')
      return
    }
    setNovaRota({
      ...novaRota,
      paradas: [...novaRota.paradas, {
        ordem: novaRota.paradas.length + 1,
        endereco: novaParada.endereco.trim(),
        ponto_referencia: novaParada.ponto_referencia.trim(),
        hora_estimada: novaParada.hora_estimada,
      }],
    })
    setNovaParada(PARADA_VAZIA)
  }

  async function salvarRota() {
    if (!novaRota.codigo.trim() || !novaRota.descricao.trim() || novaRota.escolas_ids.length === 0) {
      toast.error('Código, descrição e ao menos uma escola são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        codigo: novaRota.codigo.trim(),
        descricao: novaRota.descricao.trim(),
        escolas_ids: novaRota.escolas_ids,
        paradas: novaRota.paradas.map((p) => ({
          ordem: p.ordem,
          endereco: p.endereco,
          ponto_referencia: p.ponto_referencia || undefined,
          hora_estimada: p.hora_estimada || undefined,
        })),
      }
      if (novaRota.veiculo_id) body.veiculo_id = novaRota.veiculo_id
      if (novaRota.motorista_id) body.motorista_id = novaRota.motorista_id
      if (novaRota.turno) body.turno = novaRota.turno
      if (novaRota.distancia_km) body.distancia_km = parseFloat(novaRota.distancia_km)
      if (novaRota.hora_inicio) body.hora_inicio = novaRota.hora_inicio
      if (novaRota.hora_fim) body.hora_fim = novaRota.hora_fim

      const res = await fetch('/api/admin/pnate?acao=rota', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Rota criada')
      setModalRota(false)
      setNovaRota(ROTA_VAZIA)
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  const totalAlertas = alertaVeiculos.length + alertaMotoristas.length

  return (
    <div>
      <div className="bg-gradient-to-r from-cyan-600 to-sky-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bus className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">PNATE — Transporte Escolar</h1>
              <p className="text-cyan-100 text-sm">Programa Nacional de Apoio ao Transporte do Escolar</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setModalVeiculo(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold">
              <Plus className="w-4 h-4" /> Veículo
            </button>
            <button onClick={() => setModalMotorista(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold">
              <Plus className="w-4 h-4" /> Motorista
            </button>
            <button onClick={() => setModalRota(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-cyan-700 text-sm font-bold hover:bg-cyan-50">
              <Plus className="w-4 h-4" /> Rota
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
        {[
          { k: 'rotas' as const, label: 'Rotas', icon: Route },
          { k: 'veiculos' as const, label: 'Veículos', icon: Car },
          { k: 'motoristas' as const, label: 'Motoristas', icon: CreditCard },
          { k: 'alertas' as const, label: `Alertas ${totalAlertas > 0 ? `(${totalAlertas})` : ''}`, icon: AlertCircle },
        ].map((tab) => (
          <button
            key={tab.k}
            onClick={() => setAba(tab.k)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
              aba === tab.k
                ? 'border-cyan-600 text-cyan-700 dark:text-cyan-300'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {aba === 'rotas' && (
        <AbaRotas
          rotas={rotas}
          escolas={escolas}
          filtroEscola={filtroEscola}
          carregando={carregando}
          onChangeFiltroEscola={setFiltroEscola}
          onVincularAluno={abrirVincular}
        />
      )}

      {aba === 'veiculos' && <AbaVeiculos veiculos={veiculos} carregando={carregando} />}

      {aba === 'motoristas' && <AbaMotoristas motoristas={motoristas} carregando={carregando} />}

      {aba === 'alertas' && (
        <AbaAlertas
          alertaVeiculos={alertaVeiculos}
          alertaMotoristas={alertaMotoristas}
          carregando={carregando}
        />
      )}

      <ModalVeiculo
        aberto={modalVeiculo}
        form={novoVeiculo}
        salvando={salvando}
        onChange={setNovoVeiculo}
        onFechar={() => setModalVeiculo(false)}
        onSalvar={salvarVeiculo}
      />

      <ModalMotorista
        aberto={modalMotorista}
        form={novoMotorista}
        salvando={salvando}
        onChange={setNovoMotorista}
        onFechar={() => setModalMotorista(false)}
        onSalvar={salvarMotorista}
      />

      <ModalVincularAluno
        rota={modalVincular}
        alunoSelecionado={alunoVincSelecionado}
        tipoUso={tipoUso}
        vigenciaInicio={vigenciaInicio}
        salvando={salvando}
        onChangeAluno={setAlunoVincSelecionado}
        onChangeTipoUso={setTipoUso}
        onChangeVigencia={setVigenciaInicio}
        onFechar={() => setModalVincular(null)}
        onVincular={vincularAluno}
      />

      <ModalRota
        aberto={modalRota}
        escolas={escolas}
        veiculos={veiculos}
        motoristas={motoristas}
        form={novaRota}
        novaParada={novaParada}
        salvando={salvando}
        onChange={setNovaRota}
        onChangeNovaParada={setNovaParada}
        onAdicionarParada={adicionarParada}
        onFechar={() => setModalRota(false)}
        onSalvar={salvarRota}
      />
    </div>
  )
}

export default function PnateAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <PnateAdmin />
    </ProtectedRoute>
  )
}
