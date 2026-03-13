'use client'

import ProtectedRoute from '@/components/protected-route'
import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, User, BookOpen, CalendarCheck, FileText,
  History, GraduationCap, Edit, AlertTriangle, CheckCircle,
  XCircle, RotateCcw, ArrowLeftRight, Heart, Home, Phone,
  Shield, Users
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

const SITUACAO_CORES: Record<string, { bg: string; text: string; label: string }> = {
  cursando: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', label: 'Cursando' },
  aprovado: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', label: 'Aprovado' },
  reprovado: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', label: 'Reprovado' },
  transferido: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', label: 'Transferido' },
  abandono: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', label: 'Abandono' },
  remanejado: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300', label: 'Remanejado' },
}

const PARECER_CORES: Record<string, { bg: string; text: string; label: string }> = {
  aprovado: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Aprovado' },
  reprovado: { bg: 'bg-red-100', text: 'text-red-700', label: 'Reprovado' },
  recuperacao: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Recuperação' },
  progressao_parcial: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Progressão Parcial' },
  sem_parecer: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Sem Parecer' },
}

type Aba = 'pessoal' | 'escolar' | 'notas' | 'frequencia' | 'historico' | 'sisam'

export default function AlunoDetalhePage() {
  const toast = useToast()
  const router = useRouter()
  const params = useParams()
  const alunoId = params.id as string

  const [aluno, setAluno] = useState<any>(null)
  const [dados, setDados] = useState<any>(null)
  const [abaAtiva, setAbaAtiva] = useState<Aba>('pessoal')
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Modal de transferência
  const [mostrarModalTransf, setMostrarModalTransf] = useState(false)
  const [tipoTransf, setTipoTransf] = useState<'dentro_municipio' | 'fora_municipio'>('dentro_municipio')
  const [escolaDestinoId, setEscolaDestinoId] = useState('')
  const [escolaDestinoNome, setEscolaDestinoNome] = useState('')
  const [dataTransf, setDataTransf] = useState(new Date().toISOString().split('T')[0])
  const [obsTransf, setObsTransf] = useState('')
  const [escolasLista, setEscolasLista] = useState<{ id: string; nome: string }[]>([])
  const [salvandoTransf, setSalvandoTransf] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch(`/api/admin/alunos/${alunoId}`)
      if (res.ok) {
        const data = await res.json()
        setAluno(data.aluno)
        setDados(data)
        setForm({ ...data.aluno })
      } else {
        toast.error('Aluno não encontrado')
        router.push('/admin/alunos')
      }
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setCarregando(false)
    }
  }, [alunoId])

  useEffect(() => { carregar() }, [carregar])

  const salvar = async () => {
    setSalvando(true)
    try {
      const res = await fetch(`/api/admin/alunos/${alunoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.mensagem || 'Salvo!')
        setEditando(false)
        await carregar()
      } else {
        toast.error(data.mensagem || 'Erro ao salvar')
      }
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const updateForm = (campo: string, valor: any) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  // Abrir modal de transferência
  const abrirModalTransferencia = async () => {
    setTipoTransf('dentro_municipio')
    setEscolaDestinoId('')
    setEscolaDestinoNome('')
    setDataTransf(new Date().toISOString().split('T')[0])
    setObsTransf('')
    setMostrarModalTransf(true)

    // Carregar lista de escolas
    try {
      const res = await fetch('/api/admin/escolas')
      if (res.ok) {
        const data = await res.json()
        const lista = (data.escolas || data || [])
          .filter((e: any) => e.id !== aluno?.escola_id)
          .map((e: any) => ({ id: e.id, nome: e.nome }))
          .sort((a: any, b: any) => a.nome.localeCompare(b.nome))
        setEscolasLista(lista)
      }
    } catch { /* silencia */ }
  }

  // Executar transferência
  const executarTransferencia = async () => {
    if (!dataTransf) {
      toast.error('Informe a data da transferência')
      return
    }
    if (tipoTransf === 'dentro_municipio' && !escolaDestinoId) {
      toast.error('Selecione a escola destino')
      return
    }
    // Escola destino é opcional para fora do município

    setSalvandoTransf(true)
    try {
      const body: any = {
        situacao: 'transferido',
        data: dataTransf,
        observacao: obsTransf || null,
        tipo_transferencia: tipoTransf,
      }
      if (tipoTransf === 'dentro_municipio') {
        body.escola_destino_id = escolaDestinoId
      } else if (escolaDestinoNome.trim()) {
        body.escola_destino_nome = escolaDestinoNome.trim()
      }

      const res = await fetch(`/api/admin/alunos/${alunoId}/situacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (res.ok) {
        toast.success('Transferência registrada com sucesso')
        setMostrarModalTransf(false)
        carregar() // recarregar dados do aluno
      } else {
        toast.error(data.mensagem || 'Erro ao registrar transferência')
      }
    } catch {
      toast.error('Erro ao registrar transferência')
    } finally {
      setSalvandoTransf(false)
    }
  }

  if (carregando) return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola', 'polo']}>
      <LoadingSpinner text="Carregando dados do aluno..." centered />
    </ProtectedRoute>
  )

  if (!aluno || !dados) return null

  const sit = SITUACAO_CORES[aluno.situacao || 'cursando'] || SITUACAO_CORES.cursando
  const idade = aluno.data_nascimento ? Math.floor((Date.now() - new Date(aluno.data_nascimento).getTime()) / 31557600000) : null

  const abas: { id: Aba; label: string; icon: any }[] = [
    { id: 'pessoal', label: 'Dados Pessoais', icon: User },
    { id: 'escolar', label: 'Escola e Turma', icon: GraduationCap },
    { id: 'notas', label: 'Notas Escolares', icon: BookOpen },
    { id: 'frequencia', label: 'Frequência', icon: CalendarCheck },
    { id: 'historico', label: 'Histórico', icon: History },
    { id: 'sisam', label: 'SISAM', icon: FileText },
  ]

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola', 'polo']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/admin/alunos')} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="bg-indigo-100 dark:bg-indigo-900/40 rounded-full p-3">
                <User className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{aluno.nome}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Código: {aluno.codigo || '-'}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sit.bg} ${sit.text}`}>
                    {sit.label}
                  </span>
                  {aluno.pcd && <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full text-xs font-medium">PCD</span>}
                  {aluno.bolsa_familia && <span className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full text-xs font-medium">Bolsa Família</span>}
                  {aluno.projeto_contraturno && <span className="bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded-full text-xs font-medium">{aluno.projeto_nome || 'Projeto'}</span>}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {aluno.escola_nome} | {aluno.turma_codigo || '-'} | {aluno.serie || '-'} | {aluno.ano_letivo}
                  {idade !== null && ` | ${idade} anos`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!editando ? (
                <button onClick={() => setEditando(true)}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
                  <Edit className="w-4 h-4" /> Editar
                </button>
              ) : (
                <>
                  <button onClick={() => { setEditando(false); setForm({ ...aluno }) }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-slate-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-slate-700">
                    Cancelar
                  </button>
                  <button onClick={salvar} disabled={salvando}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-400 text-sm font-medium">
                    <Save className="w-4 h-4" /> {salvando ? 'Salvando...' : 'Salvar'}
                  </button>
                </>
              )}
              {aluno.situacao !== 'transferido' && (
                <button onClick={abrirModalTransferencia}
                  className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm font-medium"
                  title="Transferir aluno">
                  <ArrowLeftRight className="w-4 h-4" /> Transferir
                </button>
              )}
            </div>
          </div>

          {/* Abas */}
          <div className="flex gap-1 mt-4 border-t border-gray-200 dark:border-slate-700 pt-3 overflow-x-auto">
            {abas.map(aba => (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  abaAtiva === aba.id
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <aba.icon className="w-4 h-4" /> {aba.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo da aba */}
        {abaAtiva === 'pessoal' && <AbaDadosPessoais aluno={aluno} form={form} editando={editando} updateForm={updateForm} />}
        {abaAtiva === 'escolar' && <AbaEscolar aluno={aluno} dados={dados} />}
        {abaAtiva === 'notas' && <AbaNotas dados={dados} />}
        {abaAtiva === 'frequencia' && <AbaFrequencia dados={dados} />}
        {abaAtiva === 'historico' && <AbaHistorico dados={dados} />}
        {abaAtiva === 'sisam' && <AbaSisam dados={dados} />}

        {/* Modal de Transferência */}
        {mostrarModalTransf && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setMostrarModalTransf(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header — fixo */}
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 sm:px-6 py-3 sm:py-4 rounded-t-2xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-full p-2">
                    <ArrowLeftRight className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white">Transferência de Aluno</h3>
                    <p className="text-orange-100 text-sm truncate">{aluno.nome}</p>
                  </div>
                </div>
              </div>

              {/* Conteúdo — scrollável */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* Info atual */}
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-sm">
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Vínculo atual</p>
                  <p className="text-gray-800 dark:text-white font-medium">{aluno.escola_nome}</p>
                  {aluno.turma_codigo && (
                    <p className="text-gray-600 dark:text-gray-300">Turma: {aluno.turma_codigo} — {aluno.serie}</p>
                  )}
                </div>

                {/* Alerta */}
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    O aluno será desvinculado da escola e turma atuais.
                    Nova matrícula só com data igual ou posterior à transferência.
                  </p>
                </div>

                {/* Tipo de transferência */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Tipo de Transferência</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTipoTransf('dentro_municipio')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                        tipoTransf === 'dentro_municipio'
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                          : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      Dentro do Município
                    </button>
                    <button
                      onClick={() => setTipoTransf('fora_municipio')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                        tipoTransf === 'fora_municipio'
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                          : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      Fora do Município
                    </button>
                  </div>
                </div>

                {/* Escola destino */}
                {tipoTransf === 'dentro_municipio' ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                      Escola Destino <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={escolaDestinoId}
                      onChange={e => setEscolaDestinoId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Selecione a escola destino...</option>
                      {escolasLista.map(e => (
                        <option key={e.id} value={e.id}>{e.nome}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                      Escola Destino <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={escolaDestinoNome}
                      onChange={e => setEscolaDestinoNome(e.target.value)}
                      placeholder="Nome da escola, se conhecido..."
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                )}

                {/* Data da transferência */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Data da Transferência <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dataTransf}
                    onChange={e => setDataTransf(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Registra até que data o aluno ficou vinculado a esta escola.
                  </p>
                </div>

                {/* Observação */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Observação</label>
                  <textarea
                    value={obsTransf}
                    onChange={e => setObsTransf(e.target.value)}
                    maxLength={500}
                    rows={2}
                    placeholder="Motivo ou informações adicionais..."
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-400 text-right">{obsTransf.length}/500</p>
                </div>
              </div>

              {/* Footer — fixo */}
              <div className="border-t border-gray-200 dark:border-slate-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-end gap-3 flex-shrink-0">
                <button
                  onClick={() => setMostrarModalTransf(false)}
                  disabled={salvandoTransf}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={executarTransferencia}
                  disabled={salvandoTransf || (tipoTransf === 'dentro_municipio' && !escolaDestinoId)}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2.5 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  {salvandoTransf ? 'Processando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}

// ============================================
// Componente de campo
// ============================================
function Campo({ label, valor, editando, campo, form, updateForm, tipo = 'text', opcoes, placeholder }: any) {
  const displayVal = editando ? (form[campo] ?? '') : (valor ?? '-')

  if (editando) {
    if (opcoes) {
      return (
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
          <select value={form[campo] ?? ''} onChange={e => updateForm(campo, e.target.value || null)}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
            <option value="">-</option>
            {opcoes.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )
    }
    if (tipo === 'boolean') {
      return (
        <div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={!!form[campo]} onChange={e => updateForm(campo, e.target.checked)}
              className="rounded border-gray-300 text-indigo-600" />
            {label}
          </label>
        </div>
      )
    }
    if (tipo === 'textarea') {
      return (
        <div className="col-span-full">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
          <textarea value={form[campo] ?? ''} onChange={e => updateForm(campo, e.target.value || null)} rows={2} placeholder={placeholder}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-y" />
        </div>
      )
    }
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
        <input type={tipo} value={form[campo] ?? ''} onChange={e => updateForm(campo, e.target.value || null)} placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
      </div>
    )
  }

  return (
    <div>
      <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm text-gray-900 dark:text-white">{typeof displayVal === 'boolean' ? (displayVal ? 'Sim' : 'Não') : (displayVal || '-')}</span>
    </div>
  )
}

// ============================================
// Aba Dados Pessoais
// ============================================
function AbaDadosPessoais({ aluno, form, editando, updateForm }: any) {
  const generoOpcoes = [
    { value: 'masculino', label: 'Masculino' }, { value: 'feminino', label: 'Feminino' },
    { value: 'outro', label: 'Outro' }, { value: 'nao_informado', label: 'Não informado' },
  ]
  const racaOpcoes = [
    { value: 'branca', label: 'Branca' }, { value: 'preta', label: 'Preta' },
    { value: 'parda', label: 'Parda' }, { value: 'amarela', label: 'Amarela' },
    { value: 'indigena', label: 'Indígena' }, { value: 'nao_declarada', label: 'Não declarada' },
  ]

  return (
    <div className="space-y-6">
      {/* Identificação */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-4">
          <User className="w-4 h-4" /> Identificação
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Campo label="Nome Completo" valor={aluno.nome} campo="nome" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Data de Nascimento" valor={aluno.data_nascimento?.split('T')[0]} campo="data_nascimento" tipo="date" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Gênero" valor={generoOpcoes.find(o => o.value === aluno.genero)?.label} campo="genero" editando={editando} form={form} updateForm={updateForm} opcoes={generoOpcoes} />
          <Campo label="Raça/Cor" valor={racaOpcoes.find(o => o.value === aluno.raca_cor)?.label} campo="raca_cor" editando={editando} form={form} updateForm={updateForm} opcoes={racaOpcoes} />
          <Campo label="Naturalidade" valor={aluno.naturalidade} campo="naturalidade" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Nacionalidade" valor={aluno.nacionalidade} campo="nacionalidade" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="CPF" valor={aluno.cpf} campo="cpf" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="RG" valor={aluno.rg} campo="rg" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Certidão de Nascimento" valor={aluno.certidao_nascimento} campo="certidao_nascimento" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Cartão SUS" valor={aluno.sus} campo="sus" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="NIS" valor={aluno.nis} campo="nis" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="PCD" valor={aluno.pcd} campo="pcd" tipo="boolean" editando={editando} form={form} updateForm={updateForm} />
        </div>
      </div>

      {/* Família */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-4">
          <Users className="w-4 h-4" /> Família e Responsável
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Campo label="Nome da Mãe" valor={aluno.nome_mae} campo="nome_mae" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Nome do Pai" valor={aluno.nome_pai} campo="nome_pai" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Responsável" valor={aluno.responsavel} campo="responsavel" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Telefone" valor={aluno.telefone_responsavel} campo="telefone_responsavel" editando={editando} form={form} updateForm={updateForm} />
        </div>
      </div>

      {/* Endereço */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-4">
          <Home className="w-4 h-4" /> Endereço
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <Campo label="Endereço" valor={aluno.endereco} campo="endereco" editando={editando} form={form} updateForm={updateForm} />
          </div>
          <Campo label="Bairro" valor={aluno.bairro} campo="bairro" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Cidade" valor={aluno.cidade} campo="cidade" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="CEP" valor={aluno.cep} campo="cep" editando={editando} form={form} updateForm={updateForm} />
        </div>
      </div>

      {/* Programas e Saúde */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-4">
          <Heart className="w-4 h-4" /> Programas Sociais, Projetos e Saúde
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Campo label="Bolsa Família" valor={aluno.bolsa_familia} campo="bolsa_familia" tipo="boolean" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Projeto Contraturno" valor={aluno.projeto_contraturno} campo="projeto_contraturno" tipo="boolean" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Nome do Projeto" valor={aluno.projeto_nome} campo="projeto_nome" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Tipo de Deficiência" valor={aluno.tipo_deficiencia} campo="tipo_deficiencia" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Alergias" valor={aluno.alergia} campo="alergia" tipo="textarea" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Medicação" valor={aluno.medicacao} campo="medicacao" tipo="textarea" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Observações Gerais" valor={aluno.observacoes} campo="observacoes" tipo="textarea" editando={editando} form={form} updateForm={updateForm} />
        </div>
      </div>
    </div>
  )
}

// ============================================
// Aba Escolar
// ============================================
function AbaEscolar({ aluno, dados }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-4">
          <GraduationCap className="w-4 h-4" /> Dados Escolares Atuais
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div><span className="block text-xs text-gray-500">Escola</span><span className="text-sm font-medium text-gray-900 dark:text-white">{aluno.escola_nome}</span></div>
          <div><span className="block text-xs text-gray-500">Polo</span><span className="text-sm text-gray-900 dark:text-white">{aluno.polo_nome || '-'}</span></div>
          <div><span className="block text-xs text-gray-500">Turma</span><span className="text-sm text-gray-900 dark:text-white">{aluno.turma_codigo || '-'} {aluno.turma_nome ? `(${aluno.turma_nome})` : ''}</span></div>
          <div><span className="block text-xs text-gray-500">Série</span><span className="text-sm text-gray-900 dark:text-white">{aluno.serie || '-'}</span></div>
          <div><span className="block text-xs text-gray-500">Ano Letivo</span><span className="text-sm text-gray-900 dark:text-white">{aluno.ano_letivo}</span></div>
          <div><span className="block text-xs text-gray-500">Matrícula</span><span className="text-sm text-gray-900 dark:text-white">{aluno.data_matricula?.split('T')[0] || '-'}</span></div>
          <div><span className="block text-xs text-gray-500">Situação</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SITUACAO_CORES[aluno.situacao || 'cursando']?.bg} ${SITUACAO_CORES[aluno.situacao || 'cursando']?.text}`}>
              {SITUACAO_CORES[aluno.situacao || 'cursando']?.label}
            </span>
          </div>
          <div><span className="block text-xs text-gray-500">Código</span><span className="text-sm text-gray-900 dark:text-white">{aluno.codigo || '-'}</span></div>
        </div>
      </div>

      {/* Histórico de Matrículas */}
      {dados.historico_turmas?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-4">
            <History className="w-4 h-4" /> Histórico de Matrículas
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Ano</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Série</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Turma</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Escola</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Matrícula</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {dados.historico_turmas.map((h: any, i: number) => {
                  const s = SITUACAO_CORES[h.situacao || 'cursando'] || SITUACAO_CORES.cursando
                  return (
                    <tr key={i}>
                      <td className="py-2 px-3 font-medium">{h.ano_letivo}</td>
                      <td className="py-2 px-3">{h.serie || '-'}</td>
                      <td className="py-2 px-3">{h.turma_codigo || '-'}</td>
                      <td className="py-2 px-3">{h.escola_nome}</td>
                      <td className="py-2 px-3 text-center text-gray-500">{h.data_matricula?.split('T')[0] || '-'}</td>
                      <td className="py-2 px-3 text-center"><span className={`${s.bg} ${s.text} px-2 py-0.5 rounded-full text-xs font-medium`}>{s.label}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conselho de Classe */}
      {dados.conselho?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Users className="w-4 h-4" /> Pareceres do Conselho de Classe
          </h3>
          <div className="flex flex-wrap gap-2">
            {dados.conselho.map((c: any, i: number) => {
              const p = PARECER_CORES[c.parecer] || PARECER_CORES.sem_parecer
              return (
                <div key={i} className={`${p.bg} ${p.text} px-3 py-2 rounded-lg text-sm`}>
                  <strong>{c.periodo_nome} ({c.ano_letivo})</strong>: {p.label}
                  {c.observacao && <span className="block text-xs opacity-75">{c.observacao}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Aba Notas
// ============================================
function AbaNotas({ dados }: any) {
  const anos = Object.keys(dados.notas || {}).sort().reverse()

  if (anos.length === 0) return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center">
      <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">Nenhuma nota escolar lançada</p>
    </div>
  )

  return (
    <div className="space-y-6">
      {anos.map(ano => {
        const notas = dados.notas[ano]
        // Agrupar por disciplina
        const porDisc: Record<string, any[]> = {}
        for (const n of notas) {
          const key = n.disciplina || n.abreviacao
          if (!porDisc[key]) porDisc[key] = []
          porDisc[key].push(n)
        }

        return (
          <div key={ano} className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 px-5 py-3 border-b border-emerald-200 dark:border-emerald-800">
              <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Notas Escolares — {ano}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Disciplina</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Período</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Avaliação</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-orange-600">Recuperação</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-blue-600">Nota Final</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Faltas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {Object.entries(porDisc).flatMap(([disc, periodos]) =>
                    periodos.map((n: any, pi: number) => (
                      <tr key={`${disc}-${pi}`}>
                        {pi === 0 && <td rowSpan={periodos.length} className="py-2 px-3 font-medium border-r border-gray-200 dark:border-slate-600">{disc}</td>}
                        <td className="py-2 px-3 text-center text-gray-500">{n.periodo}</td>
                        <td className="py-2 px-3 text-center">{n.nota?.toFixed(1) ?? '-'}</td>
                        <td className="py-2 px-3 text-center text-orange-600">{n.nota_recuperacao?.toFixed(1) ?? '-'}</td>
                        <td className="py-2 px-3 text-center font-semibold">
                          <span className={n.nota_final !== null && n.nota_final < 6 ? 'text-red-600' : 'text-emerald-600'}>
                            {n.nota_final?.toFixed(1) ?? '-'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center text-gray-500">{n.faltas}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================
// Aba Frequência
// ============================================
function AbaFrequencia({ dados }: any) {
  const freq = dados.frequencia || []
  if (freq.length === 0) return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center">
      <CalendarCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">Nenhuma frequência registrada</p>
    </div>
  )

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Ano</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Período</th>
              <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Dias Letivos</th>
              <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Presenças</th>
              <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Faltas</th>
              <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {freq.map((f: any, i: number) => {
              const pct = f.percentual_frequencia
              const cor = pct !== null ? (pct >= 90 ? 'text-emerald-600' : pct >= 75 ? 'text-yellow-600' : 'text-red-600 font-bold') : ''
              return (
                <tr key={i}>
                  <td className="py-2 px-3 font-medium">{f.ano_letivo}</td>
                  <td className="py-2 px-3">{f.periodo_nome}</td>
                  <td className="py-2 px-3 text-center">{f.dias_letivos}</td>
                  <td className="py-2 px-3 text-center">{f.presencas}</td>
                  <td className="py-2 px-3 text-center">{f.faltas}</td>
                  <td className={`py-2 px-3 text-center font-semibold ${cor}`}>{pct !== null ? `${pct.toFixed(0)}%` : '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================
// Aba Histórico de Situação
// ============================================
function AbaHistorico({ dados }: any) {
  const historico = dados.historico_situacao || []
  if (historico.length === 0) return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center">
      <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">Nenhuma mudança de situação registrada</p>
    </div>
  )

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-4">
        <History className="w-4 h-4" /> Linha do Tempo
      </h3>
      <div className="space-y-4">
        {historico.map((h: any, i: number) => {
          const sit = SITUACAO_CORES[h.situacao] || SITUACAO_CORES.cursando
          const sitAnt = h.situacao_anterior ? SITUACAO_CORES[h.situacao_anterior] : null
          return (
            <div key={i} className="flex gap-4 relative">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${sit.bg.replace('bg-', 'bg-').replace('/40', '')} border-2 border-white dark:border-slate-800 z-10`} />
                {i < historico.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 dark:bg-slate-700" />}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{h.data?.split('T')[0]}</span>
                  {sitAnt && <span className={`${sitAnt.bg} ${sitAnt.text} px-2 py-0.5 rounded-full text-[10px] font-medium`}>{sitAnt.label}</span>}
                  {sitAnt && <span className="text-gray-400">→</span>}
                  <span className={`${sit.bg} ${sit.text} px-2 py-0.5 rounded-full text-[10px] font-medium`}>{sit.label}</span>
                  {h.tipo_movimentacao && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${h.tipo_movimentacao === 'saida' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                      {h.tipo_movimentacao === 'saida' ? 'Saída' : 'Entrada'}
                    </span>
                  )}
                  {h.tipo_transferencia && (
                    <span className="text-[10px] text-gray-400">{h.tipo_transferencia === 'dentro_municipio' ? 'Dentro do município' : 'Fora do município'}</span>
                  )}
                </div>
                {(h.escola_destino_ref_nome || h.escola_destino_nome) && (
                  <p className="text-xs text-gray-500 mt-1">Destino: {h.escola_destino_ref_nome || h.escola_destino_nome}</p>
                )}
                {(h.escola_origem_ref_nome || h.escola_origem_nome) && (
                  <p className="text-xs text-gray-500">Origem: {h.escola_origem_ref_nome || h.escola_origem_nome}</p>
                )}
                {h.observacao && <p className="text-xs text-gray-500 mt-1 italic">{h.observacao}</p>}
                {h.registrado_por_nome && <p className="text-[10px] text-gray-400 mt-1">Por: {h.registrado_por_nome}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// Aba SISAM — Helpers
// ============================================
function NivelBadge({ nivel }: { nivel: any }) {
  if (!nivel) return <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
  const raw = typeof nivel === 'string' ? nivel.toUpperCase().trim() : `N${nivel}`
  const n = parseInt(raw.replace('N', ''))
  const cores: Record<number, string> = {
    1: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    2: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    3: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    4: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${cores[n] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      N{n}
    </span>
  )
}

function PresencaBadge({ presenca }: { presenca: any }) {
  if (!presenca || presenca === '-') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
      Não avaliado
    </span>
  )
  if (presenca === 'P') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
      <CheckCircle className="w-3 h-3" /> Presente
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
      <XCircle className="w-3 h-3" /> Faltou
    </span>
  )
}

/** Configuração padrão por série (fallback caso a API não retorne config) */
function getConfigSerie(serie: string | null) {
  if (!serie) return null
  const match = serie.toString().match(/(\d+)/)
  const num = match ? match[1] : null
  if (!num) return null

  const configs: Record<string, { lp: number; mat: number; ch: number; cn: number; prod: boolean; prodItens: number; niveis: boolean }> = {
    '2': { lp: 14, mat: 14, ch: 0, cn: 0, prod: true, prodItens: 8, niveis: true },
    '3': { lp: 14, mat: 14, ch: 0, cn: 0, prod: true, prodItens: 8, niveis: true },
    '5': { lp: 14, mat: 20, ch: 0, cn: 0, prod: true, prodItens: 8, niveis: true },
    '8': { lp: 20, mat: 20, ch: 10, cn: 10, prod: false, prodItens: 0, niveis: false },
    '9': { lp: 20, mat: 20, ch: 10, cn: 10, prod: false, prodItens: 0, niveis: false },
  }
  return configs[num] || null
}

// ============================================
// Aba SISAM
// ============================================
function AbaSisam({ dados }: any) {
  const sisam = dados.sisam || []
  if (sisam.length === 0) return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center">
      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">Nenhum resultado SISAM encontrado</p>
    </div>
  )

  return (
    <div className="space-y-6">
      {sisam.map((r: any, i: number) => {
        const media = r.media_aluno != null ? parseFloat(r.media_aluno) : null
        const nivelNum = r.nivel_aluno ? (typeof r.nivel_aluno === 'string' ? parseInt(r.nivel_aluno.replace('N', '')) : r.nivel_aluno) : null

        // Config da série: prioriza dados da API, fallback para config local
        const apiConfig = r.qtd_questoes_lp != null
        const cfg = apiConfig ? {
          lp: parseInt(r.qtd_questoes_lp) || 0,
          mat: parseInt(r.qtd_questoes_mat) || 0,
          ch: parseInt(r.qtd_questoes_ch) || 0,
          cn: parseInt(r.qtd_questoes_cn) || 0,
          prod: r.tem_producao_textual === true,
          prodItens: parseInt(r.qtd_itens_producao) || 0,
          niveis: r.usa_nivel_aprendizagem === true,
        } : getConfigSerie(r.serie)

        // Montar lista de disciplinas baseada na configuração da série
        const disciplinas: {
          key: string; label: string; abrev: string; nota: any; acertos: any;
          totalQ: number; nivel: any; cor: string
        }[] = []

        if (!cfg || cfg.lp > 0) {
          disciplinas.push({
            key: 'lp', label: 'Língua Portuguesa', abrev: 'LP',
            nota: r.nota_lp, acertos: r.total_acertos_lp,
            totalQ: cfg?.lp || 0, nivel: r.nivel_lp, cor: 'blue',
          })
        }
        if (!cfg || cfg.mat > 0) {
          disciplinas.push({
            key: 'mat', label: 'Matemática', abrev: 'MAT',
            nota: r.nota_mat, acertos: r.total_acertos_mat,
            totalQ: cfg?.mat || 0, nivel: r.nivel_mat, cor: 'violet',
          })
        }
        if (cfg && cfg.ch > 0) {
          disciplinas.push({
            key: 'ch', label: 'Ciências Humanas', abrev: 'CH',
            nota: r.nota_ch, acertos: r.total_acertos_ch,
            totalQ: cfg.ch, nivel: null, cor: 'amber',
          })
        }
        if (cfg && cfg.cn > 0) {
          disciplinas.push({
            key: 'cn', label: 'Ciências da Natureza', abrev: 'CN',
            nota: r.nota_cn, acertos: r.total_acertos_cn,
            totalQ: cfg.cn, nivel: null, cor: 'teal',
          })
        }
        if (!cfg || cfg.prod) {
          disciplinas.push({
            key: 'prod', label: 'Produção Textual', abrev: 'PT',
            nota: r.nota_producao, acertos: null,
            totalQ: cfg?.prodItens || 0, nivel: r.nivel_prod, cor: 'rose',
          })
        }

        const coresMap: Record<string, { bg: string; border: string; text: string; accent: string }> = {
          blue:   { bg: 'bg-blue-50 dark:bg-blue-950/30',     border: 'border-blue-200 dark:border-blue-800',     text: 'text-blue-700 dark:text-blue-300',     accent: 'text-blue-500 dark:text-blue-400' },
          violet: { bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200 dark:border-violet-800', text: 'text-violet-700 dark:text-violet-300', accent: 'text-violet-500 dark:text-violet-400' },
          amber:  { bg: 'bg-amber-50 dark:bg-amber-950/30',   border: 'border-amber-200 dark:border-amber-800',   text: 'text-amber-700 dark:text-amber-300',   accent: 'text-amber-500 dark:text-amber-400' },
          teal:   { bg: 'bg-teal-50 dark:bg-teal-950/30',     border: 'border-teal-200 dark:border-teal-800',     text: 'text-teal-700 dark:text-teal-300',     accent: 'text-teal-500 dark:text-teal-400' },
          rose:   { bg: 'bg-rose-50 dark:bg-rose-950/30',     border: 'border-rose-200 dark:border-rose-800',     text: 'text-rose-700 dark:text-rose-300',     accent: 'text-rose-500 dark:text-rose-400' },
        }

        // Calcular grid cols dinâmico
        const gridCols = disciplinas.length <= 2 ? 'grid-cols-2' :
                         disciplinas.length <= 3 ? 'grid-cols-2 sm:grid-cols-3' :
                         disciplinas.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' :
                         'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'

        return (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-slate-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-indigo-200 text-xs font-medium">Ano Letivo</span>
                    <p className="text-white text-lg font-bold">{r.ano_letivo}</p>
                  </div>
                  <div className="w-px h-10 bg-white/20" />
                  <div>
                    <span className="text-indigo-200 text-xs font-medium">Série</span>
                    <p className="text-white text-lg font-bold">{r.serie || '-'}</p>
                  </div>
                  <div className="w-px h-10 bg-white/20" />
                  <PresencaBadge presenca={r.presenca} />
                </div>
                <div className="flex items-center gap-3">
                  {media != null && (
                    <div className="bg-white/15 backdrop-blur-sm rounded-lg px-4 py-2 text-center min-w-[80px]">
                      <span className="text-indigo-200 text-[10px] font-semibold block uppercase tracking-wider">Média</span>
                      <p className={`text-2xl font-black ${media >= 7 ? 'text-emerald-200' : media >= 5 ? 'text-yellow-200' : 'text-red-200'}`}>
                        {media.toFixed(1)}
                      </p>
                    </div>
                  )}
                  {nivelNum != null && (
                    <div className="bg-white/15 backdrop-blur-sm rounded-lg px-4 py-2 text-center min-w-[70px]">
                      <span className="text-indigo-200 text-[10px] font-semibold block uppercase tracking-wider">Nível</span>
                      <p className={`text-2xl font-black ${
                        nivelNum >= 4 ? 'text-emerald-200' : nivelNum >= 3 ? 'text-yellow-200' : nivelNum >= 2 ? 'text-orange-200' : 'text-red-200'
                      }`}>N{nivelNum}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Grid de disciplinas */}
            <div className="p-5">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Desempenho por Disciplina
              </h4>
              <div className={`grid ${gridCols} gap-3`}>
                {disciplinas.map((disc) => {
                  const c = coresMap[disc.cor]
                  const nota = disc.nota != null ? parseFloat(disc.nota) : null
                  const acertos = disc.acertos != null ? parseInt(disc.acertos) : null
                  const notaCor = nota != null
                    ? (nota >= 7 ? 'text-emerald-600 dark:text-emerald-400' : nota >= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400')
                    : 'text-gray-400 dark:text-gray-500'

                  return (
                    <div key={disc.key} className={`${c.bg} border ${c.border} rounded-xl p-4 flex flex-col items-center`}>
                      {/* Abreviação */}
                      <span className={`text-[11px] font-bold uppercase tracking-widest ${c.accent}`}>{disc.abrev}</span>

                      {/* Nota grande */}
                      <p className={`text-3xl font-black mt-1 ${notaCor}`}>
                        {nota != null ? nota.toFixed(1) : '-'}
                      </p>

                      {/* Nome completo */}
                      <p className={`text-[10px] ${c.text} mt-0.5 text-center leading-tight`}>{disc.label}</p>

                      {/* Separador */}
                      <div className={`w-full border-t ${c.border} my-2`} />

                      {/* Acertos / Total */}
                      {acertos != null && disc.totalQ > 0 ? (
                        <div className="text-center">
                          <div className="flex items-baseline justify-center gap-0.5">
                            <span className="text-lg font-bold text-gray-800 dark:text-white">{acertos}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">/{disc.totalQ}</span>
                          </div>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">acertos</span>
                          {/* Barra de progresso */}
                          <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 mt-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                (acertos / disc.totalQ) >= 0.7 ? 'bg-emerald-500' :
                                (acertos / disc.totalQ) >= 0.5 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, (acertos / disc.totalQ) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : disc.key === 'prod' && disc.totalQ > 0 ? (
                        <div className="text-center">
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">{disc.totalQ} itens avaliados</span>
                        </div>
                      ) : null}

                      {/* Nível */}
                      {disc.nivel && (
                        <div className="mt-2">
                          <NivelBadge nivel={disc.nivel} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
