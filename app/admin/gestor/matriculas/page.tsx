'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/protected-route'
import WizardSteps from '@/components/matriculas/wizard-steps'
import EtapaEscola from '@/components/matriculas/etapa-escola'
import EtapaSerie from '@/components/matriculas/etapa-serie'
import EtapaTurma from '@/components/matriculas/etapa-turma'
import EtapaAlunos from '@/components/matriculas/etapa-alunos'
import ResumoMatricula from '@/components/matriculas/resumo-matricula'
import { useToast } from '@/components/toast'

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

const ETAPAS = ['Escola', 'Série', 'Turma', 'Alunos']
const ANO_LETIVO_ATUAL = new Date().getFullYear().toString()

export default function MatriculasPage() {
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

  // Estado do wizard
  const [poloId, setPoloId] = useState('')
  const [escolaId, setEscolaId] = useState('')
  const [escolaNome, setEscolaNome] = useState('')
  const [serie, setSerie] = useState('')
  const [serieName, setSerieName] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [turmaNome, setTurmaNome] = useState('')
  const [turmaMultiserie, setTurmaMultiserie] = useState(false)
  const [turmaMultietapa, setTurmaMultietapa] = useState(false)
  const [alunosSelecionados, setAlunosSelecionados] = useState<AlunoParaMatricula[]>([])
  const [matriculando, setMatriculando] = useState(false)
  const [resultado, setResultado] = useState<any>(null)

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
        setEtapaAtual(5) // Resumo
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
    setPoloId('')
    setEscolaId('')
    setEscolaNome('')
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
    setEtapaAtual(4)
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
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
            Cadastre e vincule alunos a turmas para o ano letivo {anoLetivo}
          </p>
        </div>

        {etapaAtual <= 4 && (
          <WizardSteps etapaAtual={etapaAtual} etapas={ETAPAS} />
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 lg:p-8">
          {etapaAtual === 1 && (
            <EtapaEscola
              poloId={poloId}
              escolaId={escolaId}
              anoLetivo={anoLetivo}
              onPoloChange={setPoloId}
              onEscolaChange={(id, nome) => { setEscolaId(id); setEscolaNome(nome) }}
              onProximo={() => setEtapaAtual(2)}
            />
          )}

          {etapaAtual === 2 && (
            <EtapaSerie
              serieSelecionada={serie}
              onSerieChange={(s, nome) => { setSerie(s); setSerieName(nome) }}
              onProximo={() => setEtapaAtual(3)}
              onVoltar={() => setEtapaAtual(1)}
            />
          )}

          {etapaAtual === 3 && (
            <EtapaTurma
              escolaId={escolaId}
              serie={serie}
              anoLetivo={anoLetivo}
              turmaSelecionada={turmaId}
              onTurmaChange={(id, nome, turma) => { setTurmaId(id); setTurmaNome(nome); setTurmaMultiserie(turma?.multiserie || false); setTurmaMultietapa(turma?.multietapa || false) }}
              onProximo={() => setEtapaAtual(4)}
              onVoltar={() => setEtapaAtual(2)}
            />
          )}

          {etapaAtual === 4 && (
            <EtapaAlunos
              escolaId={escolaId}
              turmaId={turmaId}
              serie={serie}
              alunosSelecionados={alunosSelecionados}
              onAlunosChange={setAlunosSelecionados}
              onMatricular={handleMatricular}
              onVoltar={() => setEtapaAtual(3)}
              matriculando={matriculando}
              turmaMultiserie={turmaMultiserie}
              turmaMultietapa={turmaMultietapa}
            />
          )}

          {etapaAtual === 5 && resultado && (
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
