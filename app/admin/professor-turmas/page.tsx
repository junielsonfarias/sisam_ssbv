'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeftRight, Plus, Trash2, Search, RefreshCw, BookOpen } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useAnoLetivo, AnoLetivoSelect } from '@/lib/contexts/ano-letivo-context'
import { FormNovoVinculo, type Professor, type Turma, type Disciplina } from './components/FormNovoVinculo'

interface Vinculo {
  id: string
  tipo_vinculo: string
  ano_letivo: string
  ativo: boolean
  professor_id: string
  professor_nome: string
  professor_email: string
  turma_id: string
  turma_nome: string
  serie: string
  turno: string
  escola_id: string
  escola_nome: string
  disciplina_id: string | null
  disciplina_nome: string | null
}

function GerenciarVinculos() {
  const { anoLetivo } = useAnoLetivo()
  const [vinculos, setVinculos] = useState<Vinculo[]>([])
  const [professores, setProfessores] = useState<Professor[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [carregando, setCarregando] = useState(true)
  const [carregandoDados, setCarregandoDados] = useState(true)
  const [criando, setCriando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')

  // Form de troca de professor
  const [trocando, setTrocando] = useState<string | null>(null) // vinculo_id
  const [novoProfessor, setNovoProfessor] = useState('')

  const fetchVinculos = async () => {
    try {
      const res = await fetch(`/api/admin/professor-turmas?ano_letivo=${anoLetivo}`)
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json()
      setVinculos(data.vinculos)
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  const fetchDados = async () => {
    setCarregandoDados(true)
    try {
      const [profRes, turmasRes, discRes] = await Promise.all([
        fetch('/api/admin/professores'),
        fetch('/api/admin/turmas?ano_letivo=' + anoLetivo),
        fetch('/api/admin/disciplinas-escolares'),
      ])
      const profData = await profRes.json()
      const turmasData = await turmasRes.json()
      const discData = await discRes.json()
      // /api/admin/professores retorna { professores }; /turmas e /disciplinas retornam array direto
      setProfessores(profData.professores || [])
      setTurmas(Array.isArray(turmasData) ? turmasData : turmasData.turmas || [])
      setDisciplinas(Array.isArray(discData) ? discData : discData.disciplinas || [])
    } catch (err) {
      console.error('[ProfessorTurmas] Erro ao carregar dados:', (err as Error).message)
    } finally {
      setCarregandoDados(false)
    }
  }

  useEffect(() => {
    fetchVinculos()
    fetchDados()
  }, [anoLetivo])

  const criarVinculo = async (payload: {
    professor_id: string
    turma_id: string
    tipo_vinculo: 'polivalente' | 'disciplina'
    disciplina_id?: string
  }) => {
    setMensagem('')
    setErro('')
    const res = await fetch('/api/admin/professor-turmas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, ano_letivo: anoLetivo }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.mensagem || 'Erro ao criar vínculo')
    setMensagem('Vínculo criado com sucesso')
    setCriando(false)
    fetchVinculos()
  }

  const removerVinculo = async (vinculoId: string) => {
    if (!confirm('Remover este vínculo?')) return
    try {
      const res = await fetch('/api/admin/professor-turmas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vinculo_id: vinculoId }),
      })
      if (!res.ok) throw new Error('Erro ao remover')
      setMensagem('Vínculo removido')
      fetchVinculos()
    } catch (err: any) {
      setErro(err.message)
    }
  }

  const trocarProfessor = async (vinculoId: string) => {
    if (!novoProfessor) {
      setErro('Selecione o novo professor')
      return
    }
    setMensagem('')
    setErro('')
    try {
      const res = await fetch('/api/admin/professor-turmas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vinculo_id: vinculoId, novo_professor_id: novoProfessor }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.mensagem)
      setMensagem(data.mensagem)
      setTrocando(null)
      setNovoProfessor('')
      fetchVinculos()
    } catch (err: any) {
      setErro(err.message)
    }
  }

  const filtrados = vinculos.filter(v =>
    v.professor_nome.toLowerCase().includes(busca.toLowerCase()) ||
    v.turma_nome.toLowerCase().includes(busca.toLowerCase()) ||
    v.escola_nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vincular Professores a Turmas</h1>
        <div className="flex gap-2">
          <AnoLetivoSelect />
          <button
            onClick={() => setCriando(!criando)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
          >
            <Plus className="h-4 w-4" />
            Novo Vínculo
          </button>
        </div>
      </div>

      {/* Form */}
      {criando && (
        <FormNovoVinculo
          anoLetivo={anoLetivo}
          professores={professores}
          turmas={turmas}
          disciplinas={disciplinas}
          carregandoDados={carregandoDados}
          onSubmit={criarVinculo}
          onCancel={() => setCriando(false)}
        />
      )}

      {/* Mensagens */}
      {mensagem && (
        <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm">{mensagem}</div>
      )}
      {erro && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{erro}</div>
      )}

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por professor, turma ou escola..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
        />
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />)}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <ArrowLeftRight className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          Nenhum vínculo encontrado
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          {filtrados.map(v => (
            <div key={v.id} className="border-b last:border-b-0 border-gray-200 dark:border-gray-700">
              <div className="p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">{v.professor_nome}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {v.turma_nome} ({v.serie} - {v.turno}) | {v.escola_nome}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      v.tipo_vinculo === 'polivalente'
                        ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                        : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    }`}>
                      {v.tipo_vinculo === 'polivalente' ? 'Polivalente' : v.disciplina_nome}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/admin/turmas/${v.turma_id}/diario`}
                    className="p-2 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg"
                    title="Ver diário de classe (frequência, notas, conteúdo)"
                  >
                    <BookOpen className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => { setTrocando(trocando === v.id ? null : v.id); setNovoProfessor('') }}
                    className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"
                    title="Trocar professor"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removerVinculo(v.id)}
                    className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                    title="Remover vínculo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Formulário inline de troca */}
              {trocando === v.id && (
                <div className="px-4 pb-4 pt-0">
                  <div className="flex gap-2 items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <select
                      value={novoProfessor}
                      onChange={e => setNovoProfessor(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="">Selecione o novo professor</option>
                      {professores.filter(p => p.id !== v.professor_id).map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => trocarProfessor(v.id)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap"
                    >
                      Trocar
                    </button>
                    <button
                      onClick={() => setTrocando(null)}
                      className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Os dados de frequência lançados pelo professor anterior serão preservados.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProfessorTurmasPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <GerenciarVinculos />
    </ProtectedRoute>
  )
}
