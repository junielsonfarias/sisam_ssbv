'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Award, Briefcase, GraduationCap, Plus, Search, Users } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

import { ListaServidores } from './components/lista-servidores'
import { ModalServidor } from './components/modal-servidor'
import { ModalDetalheServidor } from './components/modal-detalhe-servidor'
import { ModalLotacao } from './components/modal-lotacao'
import { ModalFormacao } from './components/modal-formacao'
import {
  Escola, FORMACAO_VAZIA, FormFormacao, FormLotacao, FormServidor,
  INPUT_CLS, LOTACAO_VAZIA, SERVIDOR_VAZIO, ServidorDetalhe, ServidorRow, TIPOS_VINCULO,
} from './components/types'

function RhAdmin() {
  const toast = useToast()
  const [servidores, setServidores] = useState<ServidorRow[]>([])
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroVinculo, setFiltroVinculo] = useState('')
  const [filtroEscola, setFiltroEscola] = useState('')

  const [modalServidor, setModalServidor] = useState(false)
  const [modalDetalhe, setModalDetalhe] = useState(false)
  const [modalLotacao, setModalLotacao] = useState(false)
  const [modalFormacao, setModalFormacao] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [detalhe, setDetalhe] = useState<ServidorDetalhe | null>(null)
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)

  const [novoServidor, setNovoServidor] = useState<FormServidor>(SERVIDOR_VAZIO)
  const [novaLotacao, setNovaLotacao] = useState<FormLotacao>(LOTACAO_VAZIA())
  const [novaFormacao, setNovaFormacao] = useState<FormFormacao>(FORMACAO_VAZIA)

  const carregar = useCallback(async (signal?: AbortSignal) => {
    try {
      setCarregando(true)
      const params = new URLSearchParams({ recurso: 'servidores', limite: '200' })
      if (busca.trim().length > 2) params.set('busca', busca.trim())
      if (filtroVinculo) params.set('vinculo', filtroVinculo)
      if (filtroEscola) params.set('escola', filtroEscola)
      const res = await fetch(`/api/admin/rh?${params}`, { signal })
      const data = await res.json()
      setServidores(data.servidores || [])
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      toast.error('Erro ao carregar servidores')
    } finally {
      setCarregando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, filtroVinculo, filtroEscola])

  useEffect(() => {
    fetch('/api/admin/escolas')
      .then((r) => r.json())
      .then((data) => setEscolas(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const t = setTimeout(() => carregar(controller.signal), 300)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [carregar])

  const abrirDetalheAbortRef = useRef<AbortController | null>(null)

  async function abrirDetalhe(id: string) {
    abrirDetalheAbortRef.current?.abort()
    const controller = new AbortController()
    abrirDetalheAbortRef.current = controller

    setModalDetalhe(true)
    setCarregandoDetalhe(true)
    setDetalhe(null)
    try {
      const res = await fetch(`/api/admin/rh?recurso=servidor&id=${id}`, { signal: controller.signal })
      const data = await res.json()
      setDetalhe(data.servidor)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error('Erro ao carregar detalhe')
    } finally {
      if (abrirDetalheAbortRef.current === controller) setCarregandoDetalhe(false)
    }
  }

  async function salvarServidor() {
    if (!novoServidor.cpf.trim() || !novoServidor.nome.trim() || !novoServidor.data_admissao) {
      toast.error('CPF, nome e data de admissão são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        cpf: novoServidor.cpf.replace(/\D/g, ''),
        nome: novoServidor.nome.trim(),
        tipo_vinculo: novoServidor.tipo_vinculo,
        data_admissao: novoServidor.data_admissao,
      }
      if (novoServidor.matricula_funcional) body.matricula_funcional = novoServidor.matricula_funcional
      if (novoServidor.data_nascimento) body.data_nascimento = novoServidor.data_nascimento
      if (novoServidor.sexo) body.sexo = novoServidor.sexo
      if (novoServidor.rg) body.rg = novoServidor.rg
      if (novoServidor.pis) body.pis = novoServidor.pis.replace(/\D/g, '')
      if (novoServidor.email) body.email = novoServidor.email
      if (novoServidor.telefone) body.telefone = novoServidor.telefone
      if (novoServidor.endereco) body.endereco = novoServidor.endereco
      if (novoServidor.cargo) body.cargo = novoServidor.cargo
      if (novoServidor.formacao_maxima) body.formacao_maxima = novoServidor.formacao_maxima
      if (novoServidor.area_formacao) body.area_formacao = novoServidor.area_formacao

      const res = await fetch('/api/admin/rh?acao=servidor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Servidor cadastrado')
      setModalServidor(false)
      setNovoServidor(SERVIDOR_VAZIO)
      carregar()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function salvarLotacao() {
    if (!detalhe) return
    if (!novaLotacao.funcao.trim()) {
      toast.error('Informe a função')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        servidor_id: detalhe.id,
        escola_id: novaLotacao.escola_id || null,
        funcao: novaLotacao.funcao.trim(),
        carga_horaria_semanal: parseInt(novaLotacao.carga_horaria_semanal, 10),
        vigencia_inicio: novaLotacao.vigencia_inicio,
        e_principal: novaLotacao.e_principal,
      }
      if (novaLotacao.turno) body.turno = novaLotacao.turno
      if (novaLotacao.vigencia_fim) body.vigencia_fim = novaLotacao.vigencia_fim
      if (novaLotacao.observacoes) body.observacoes = novaLotacao.observacoes

      const res = await fetch('/api/admin/rh?acao=lotacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Lotação registrada')
      setModalLotacao(false)
      setNovaLotacao(LOTACAO_VAZIA())
      abrirDetalhe(detalhe.id)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function salvarFormacao() {
    if (!detalhe) return
    if (!novaFormacao.nome_curso.trim() || !novaFormacao.carga_horaria) {
      toast.error('Nome do curso e carga horária são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        servidor_id: detalhe.id,
        nome_curso: novaFormacao.nome_curso.trim(),
        carga_horaria: parseInt(novaFormacao.carga_horaria, 10),
        status: novaFormacao.status,
      }
      if (novaFormacao.instituicao) body.instituicao = novaFormacao.instituicao
      if (novaFormacao.modalidade) body.modalidade = novaFormacao.modalidade
      if (novaFormacao.data_inicio) body.data_inicio = novaFormacao.data_inicio
      if (novaFormacao.data_conclusao) body.data_conclusao = novaFormacao.data_conclusao
      if (novaFormacao.certificado_url) body.certificado_url = novaFormacao.certificado_url
      if (novaFormacao.categoria) body.categoria = novaFormacao.categoria
      if (novaFormacao.observacoes) body.observacoes = novaFormacao.observacoes

      const res = await fetch('/api/admin/rh?acao=formacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Formação registrada')
      setModalFormacao(false)
      setNovaFormacao(FORMACAO_VAZIA)
      abrirDetalhe(detalhe.id)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  const total = servidores.length
  const efetivos = servidores.filter((s) => s.tipo_vinculo === 'concursado_efetivo' || s.tipo_vinculo === 'concursado_estavel').length
  const temporarios = servidores.filter((s) => s.tipo_vinculo === 'contrato_temporario').length
  const superior = servidores.filter(
    (s) => s.formacao_maxima && ['superior_completo_licenciatura', 'superior_completo_bacharelado', 'especializacao', 'mestrado', 'doutorado'].includes(s.formacao_maxima)
  ).length

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Briefcase className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">RH Escolar</h1>
              <p className="text-blue-100 text-sm">Servidores, lotações e formação continuada</p>
            </div>
          </div>
          <button
            onClick={() => { setNovoServidor(SERVIDOR_VAZIO); setModalServidor(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo servidor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
          <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{total}</p>
          <p className="text-xs text-blue-600">Servidores ativos</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
          <Award className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{efetivos}</p>
          <p className="text-xs text-green-600">Efetivos</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center">
          <Briefcase className="w-5 h-5 text-amber-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{temporarios}</p>
          <p className="text-xs text-amber-600">Temporários</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 text-center">
          <GraduationCap className="w-5 h-5 text-purple-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{superior}</p>
          <p className="text-xs text-purple-600">Com Ensino Superior</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, CPF ou matrícula (mín. 3 caracteres)..."
              className={`${INPUT_CLS} w-full pl-9`}
            />
          </div>
          <select value={filtroVinculo} onChange={(e) => setFiltroVinculo(e.target.value)} className={INPUT_CLS}>
            <option value="">Todos os vínculos</option>
            {TIPOS_VINCULO.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
          </select>
          <select value={filtroEscola} onChange={(e) => setFiltroEscola(e.target.value)} className={INPUT_CLS}>
            <option value="">Todas as escolas</option>
            {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
      </div>

      {carregando ? <LoadingSpinner centered /> : <ListaServidores servidores={servidores} onAbrirDetalhe={abrirDetalhe} />}

      <ModalServidor
        aberto={modalServidor}
        form={novoServidor}
        salvando={salvando}
        onChange={setNovoServidor}
        onFechar={() => setModalServidor(false)}
        onSalvar={salvarServidor}
      />

      <ModalDetalheServidor
        aberto={modalDetalhe}
        carregando={carregandoDetalhe}
        detalhe={detalhe}
        onFechar={() => setModalDetalhe(false)}
        onNovaLotacao={() => setModalLotacao(true)}
        onNovaFormacao={() => setModalFormacao(true)}
      />

      <ModalLotacao
        aberto={modalLotacao && !!detalhe}
        servidorNome={detalhe?.nome || ''}
        escolas={escolas}
        form={novaLotacao}
        salvando={salvando}
        onChange={setNovaLotacao}
        onFechar={() => setModalLotacao(false)}
        onSalvar={salvarLotacao}
      />

      <ModalFormacao
        aberto={modalFormacao && !!detalhe}
        servidorNome={detalhe?.nome || ''}
        form={novaFormacao}
        salvando={salvando}
        onChange={setNovaFormacao}
        onFechar={() => setModalFormacao(false)}
        onSalvar={salvarFormacao}
      />
    </div>
  )
}

export default function RhAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <RhAdmin />
    </ProtectedRoute>
  )
}
