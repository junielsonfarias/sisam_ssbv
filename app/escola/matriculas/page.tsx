'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/protected-route'
import WizardSteps from '@/components/matriculas/wizard-steps'
import EtapaSerie from '@/components/matriculas/etapa-serie'
import EtapaTurma from '@/components/matriculas/etapa-turma'
import EtapaAlunos from '@/components/matriculas/etapa-alunos'
import ResumoMatricula from '@/components/matriculas/resumo-matricula'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { School, Users, BookOpen } from 'lucide-react'

interface AlunoParaMatricula {
  id?: string
  nome: string
  codigo?: string | null
  cpf?: string | null
  data_nascimento?: string | null
  pcd?: boolean
  existente?: boolean
  serie_individual?: string
}

const ETAPAS = ['Série', 'Turma', 'Alunos']
const ANO_LETIVO_ATUAL = new Date().getFullYear().toString()

export default function MatriculasEscolaPage() {
  const toast = useToast()
  const [etapaAtual, setEtapaAtual] = useState(1)
  const [anoLetivo, setAnoLetivo] = useState(ANO_LETIVO_ATUAL)
  const [anoLetivoAtivo, setAnoLetivoAtivo] = useState<string | null>(null)

  // Carregar ano letivo ativo
  useEffect(() => {
    fetch('/api/admin/anos-letivos/ativo')
      .then(r => r.json())
      .then(data => {
        if (data.ano_ativo) {
          setAnoLetivo(data.ano_ativo.ano)
          setAnoLetivoAtivo(data.ano_ativo.ano)
        }
      })
      .catch(() => {})
  }, [])

  // Dados da escola (carregados automaticamente)
  const [escolaId, setEscolaId] = useState('')
  const [escolaNome, setEscolaNome] = useState('')
  const [carregandoEscola, setCarregandoEscola] = useState(true)
  const [resumoEscola, setResumoEscola] = useState<{ total_turmas: number; total_alunos: number } | null>(null)

  // Estado do wizard
  const [serie, setSerie] = useState('')
  const [serieName, setSerieName] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [turmaNome, setTurmaNome] = useState('')
  const [turmaMultiserie, setTurmaMultiserie] = useState(false)
  const [turmaMultietapa, setTurmaMultietapa] = useState(false)
  const [alunosSelecionados, setAlunosSelecionados] = useState<AlunoParaMatricula[]>([])
  const [matriculando, setMatriculando] = useState(false)
  const [resultado, setResultado] = useState<any>(null)

  // Carregar dados da escola automaticamente
  useEffect(() => {
    const carregarEscola = async () => {
      try {
        const response = await fetch('/api/auth/verificar')
        const data = await response.json()
        if (data.usuario && data.usuario.escola_id) {
          setEscolaId(data.usuario.escola_id)

          const escolaRes = await fetch(`/api/admin/escolas?id=${data.usuario.escola_id}`)
          const escolaData = await escolaRes.json()
          if (Array.isArray(escolaData) && escolaData.length > 0) {
            setEscolaNome(escolaData[0].nome)
          }
        }
      } catch {
        toast.error('Erro ao carregar dados da escola')
      } finally {
        setCarregandoEscola(false)
      }
    }
    carregarEscola()
  }, [])

  // Carregar resumo da escola
  useEffect(() => {
    if (!escolaId) return
    fetch(`/api/admin/matriculas/resumo?escola_id=${escolaId}&ano_letivo=${anoLetivo}`)
      .then(r => r.json())
      .then(data => setResumoEscola(data))
      .catch(() => setResumoEscola(null))
  }, [escolaId, anoLetivo])

  const handleMatricular = async () => {
    if (alunosSelecionados.length === 0) return
    setMatriculando(true)

    try {
      const res = await fetch('/api/admin/matriculas/alunos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escola_id: escolaId,
          turma_id: turmaId,
          serie,
          ano_letivo: anoLetivo,
          alunos: alunosSelecionados.map(a => ({
            id: a.id,
            nome: a.nome,
            codigo: a.codigo,
            cpf: a.cpf || undefined,
            data_nascimento: a.data_nascimento || undefined,
            pcd: a.pcd,
            serie_individual: a.serie_individual || undefined,
          })),
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setResultado(data)
        setEtapaAtual(4) // Resumo
        toast.success(data.mensagem)
      } else {
        toast.error(data.mensagem || 'Erro ao matricular alunos')
      }
    } catch {
      toast.error('Erro de conexão ao matricular alunos')
    } finally {
      setMatriculando(false)
    }
  }

  const resetarWizard = () => {
    setEtapaAtual(1)
    setSerie('')
    setSerieName('')
    setTurmaId('')
    setTurmaNome('')
    setTurmaMultiserie(false)
    setTurmaMultietapa(false)
    setAlunosSelecionados([])
    setResultado(null)
  }

  const voltarParaAlunos = () => {
    setAlunosSelecionados([])
    setResultado(null)
    setEtapaAtual(3)
  }

  if (carregandoEscola) {
    return (
      <ProtectedRoute tiposPermitidos={['escola']}>
        <LoadingSpinner text="Carregando dados da escola..." centered size="lg" />
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute tiposPermitidos={['escola']}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Matrículas {anoLetivo}
            </h1>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 dark:text-gray-400">Ano:</label>
              <input
                type="text"
                value={anoLetivo}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setAnoLetivo(val)
                }}
                className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                maxLength={4}
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {escolaNome}
          </p>
        </div>

        {/* Resumo da escola */}
        {resumoEscola && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
              <School className="inline w-4 h-4 mr-1" /> {escolaNome} — Resumo {anoLetivo}
            </h3>
            <div className="flex gap-6 text-sm text-indigo-600 dark:text-indigo-400">
              <span className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" /> {resumoEscola.total_turmas} turma(s)
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" /> {resumoEscola.total_alunos} aluno(s) matriculado(s)
              </span>
            </div>
          </div>
        )}

        {etapaAtual <= 3 && (
          <WizardSteps etapaAtual={etapaAtual} etapas={ETAPAS} />
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 lg:p-8">
          {etapaAtual === 1 && (
            <EtapaSerie
              serieSelecionada={serie}
              onSerieChange={(s, nome) => { setSerie(s); setSerieName(nome) }}
              onProximo={() => setEtapaAtual(2)}
              onVoltar={() => {}} // Sem voltar na primeira etapa
            />
          )}

          {etapaAtual === 2 && (
            <EtapaTurma
              escolaId={escolaId}
              serie={serie}
              anoLetivo={anoLetivo}
              turmaSelecionada={turmaId}
              onTurmaChange={(id, nome, turma) => { setTurmaId(id); setTurmaNome(nome); setTurmaMultiserie(turma?.multiserie || false); setTurmaMultietapa(turma?.multietapa || false) }}
              onProximo={() => setEtapaAtual(3)}
              onVoltar={() => setEtapaAtual(1)}
            />
          )}

          {etapaAtual === 3 && (
            <EtapaAlunos
              escolaId={escolaId}
              turmaId={turmaId}
              serie={serie}
              alunosSelecionados={alunosSelecionados}
              onAlunosChange={setAlunosSelecionados}
              onMatricular={handleMatricular}
              onVoltar={() => setEtapaAtual(2)}
              matriculando={matriculando}
              turmaMultiserie={turmaMultiserie}
              turmaMultietapa={turmaMultietapa}
            />
          )}

          {etapaAtual === 4 && resultado && (
            <ResumoMatricula
              resultado={resultado}
              escolaNome={escolaNome}
              serieName={serieName}
              turmaNome={turmaNome}
              onNovaMatricula={resetarWizard}
              onMesmaTurma={voltarParaAlunos}
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
