'use client'

import ProtectedRoute from '@/components/protected-route'
import React, { useEffect, useState, useCallback } from 'react'
import {
  BookOpen, Save, Search, FileText, AlertCircle, CheckCircle,
  ChevronDown, Printer, Eye, ArrowLeft
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// ============================================
// Tipos
// ============================================

interface EscolaSimples { id: string; nome: string }
interface TurmaSimples { id: string; codigo: string; nome: string | null; serie: string; ano_letivo: string; total_alunos?: number }
interface Disciplina { id: string; nome: string; codigo: string | null; abreviacao: string | null }
interface Periodo { id: string; nome: string; tipo: string; numero: number; ano_letivo: string }
interface AlunoTurma {
  id: string; nome: string; codigo: string | null; situacao: string | null; pcd: boolean
}
interface NotaAluno {
  aluno_id: string
  nota: number | null
  nota_recuperacao: number | null
  nota_final: number | null
  faltas: number
  observacao: string
  conceito: string | null
  parecer_descritivo: string | null
}
interface ConfigNotas {
  nota_maxima: number; media_aprovacao: number; media_recuperacao: number
  peso_avaliacao: number; peso_recuperacao: number; permite_recuperacao: boolean
  formula_media?: string
  pesos_periodos?: { periodo: number; peso: number }[]
  arredondamento?: string
  casas_decimais?: number
  aprovacao_automatica?: boolean
}

interface ConceitoEscala {
  codigo: string; nome: string; valor_numerico: number
}

interface TipoAvaliacao {
  id: string | null
  codigo: string
  nome: string
  tipo_resultado: 'parecer' | 'conceito' | 'numerico' | 'misto'
  escala_conceitos: ConceitoEscala[] | null
  nota_minima: number
  nota_maxima: number
  permite_decimal: boolean
}

interface RegraAvaliacao {
  id: string
  nome: string
  tipo_periodo: string
  qtd_periodos: number
  media_aprovacao: number
  media_recuperacao: number
  nota_maxima: number
  permite_recuperacao: boolean
  aprovacao_automatica: boolean
  casas_decimais: number
  arredondamento: string
}

interface AvaliacaoTurma {
  tipo_avaliacao: TipoAvaliacao
  regra_avaliacao: RegraAvaliacao | null
  serie_codigo: string | null
  etapa: string | null
}

interface BoletimDisciplina {
  disciplina_id: string; disciplina_nome: string; disciplina_codigo: string | null
  periodos: { periodo_id: string; periodo_nome: string; periodo_numero: number; nota: number | null; nota_recuperacao: number | null; nota_final: number | null; faltas: number }[]
  media_anual: number | null; total_faltas: number; situacao: string | null
}

type Modo = 'selecao' | 'lancamento' | 'boletim'

// Helper: verifica se a série tem frequência unificada (pré-escola + 1º ao 5º)
function isFrequenciaUnificada(serie: string | null | undefined): boolean {
  if (!serie) return true
  const num = serie.match(/(\d+)/)?.[1]
  return !num || !['6', '7', '8', '9'].includes(num)
}

interface FreqUnificadaAluno {
  presencas: number
  faltas: number
  faltas_justificadas: number
}

// ============================================
// Componente Principal
// ============================================

export default function NotasEscolaresPage() {
  const toast = useToast()
  const [modo, setModo] = useState<Modo>('selecao')
  const [tipoUsuario, setTipoUsuario] = useState('')
  const [escolaIdUsuario, setEscolaIdUsuario] = useState('')

  // Seleção
  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [turmas, setTurmas] = useState<TurmaSimples[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [periodos, setPeriodos] = useState<Periodo[]>([])

  const [escolaId, setEscolaId] = useState('')
  const [serieFiltro, setSerieFiltro] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [disciplinaId, setDisciplinaId] = useState('')
  const [periodoId, setPeriodoId] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString())

  // Séries únicas extraídas das turmas + turmas filtradas pela série
  const seriesUnicas = Array.from(new Set(turmas.map(t => t.serie))).sort()
  const turmasFiltradas = serieFiltro ? turmas.filter(t => t.serie === serieFiltro) : turmas

  // Tipo de avaliação da turma
  const [avaliacaoTurma, setAvaliacaoTurma] = useState<AvaliacaoTurma | null>(null)

  // Frequência unificada (anos iniciais)
  const [freqUnificada, setFreqUnificada] = useState(false)
  const [diasLetivos, setDiasLetivos] = useState(50)
  const [frequencias, setFrequencias] = useState<Record<string, FreqUnificadaAluno>>({})

  // Lançamento
  const [alunos, setAlunos] = useState<AlunoTurma[]>([])
  const [notas, setNotas] = useState<Record<string, NotaAluno>>({})
  const [config, setConfig] = useState<ConfigNotas>({
    nota_maxima: 10, media_aprovacao: 6, media_recuperacao: 5,
    peso_avaliacao: 0.6, peso_recuperacao: 0.4, permite_recuperacao: true,
  })
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mostrarRecuperacao, setMostrarRecuperacao] = useState(false)

  // Boletim
  const [boletimAluno, setBoletimAluno] = useState<any>(null)
  const [boletimData, setBoletimData] = useState<{
    periodos: Periodo[]; boletim: BoletimDisciplina[]; config: ConfigNotas
    frequencia?: { periodo_id: string; periodo_nome: string; dias_letivos: number | null; presencas: number | null; faltas: number | null; percentual: number | null }[]
    recuperacao?: { disciplina: string; disciplina_codigo: string | null; periodos: { periodo: string; nota_original: number | null; nota_recuperacao: number | null; nota_final: number | null; substituiu: boolean }[] }[]
  } | null>(null)

  // Labels selecionados
  const turmaSelecionada = turmas.find(t => t.id === turmaId)
  const disciplinaSelecionada = disciplinas.find(d => d.id === disciplinaId)
  const periodoSelecionado = periodos.find(p => p.id === periodoId)

  // Derivados do tipo de avaliação
  const tipoResultado = avaliacaoTurma?.tipo_avaliacao?.tipo_resultado || 'numerico'
  const isParecer = tipoResultado === 'parecer'
  const isConceito = tipoResultado === 'conceito'
  const isNumerico = tipoResultado === 'numerico'

  // Carregar dados iniciais
  useEffect(() => {
    const init = async () => {
      try {
        const [authRes, discRes] = await Promise.all([
          fetch('/api/auth/verificar'),
          fetch('/api/admin/disciplinas-escolares'),
        ])

        if (authRes.ok) {
          const data = await authRes.json()
          if (data.usuario) {
            const tipo = data.usuario.tipo_usuario === 'administrador' ? 'admin' : data.usuario.tipo_usuario
            setTipoUsuario(tipo)
            if (data.usuario.escola_id) {
              setEscolaIdUsuario(data.usuario.escola_id)
              setEscolaId(data.usuario.escola_id)
            }
          }
        }

        if (discRes.ok) setDisciplinas(await discRes.json())
      } catch (e) {
        console.error('Erro ao carregar dados iniciais:', e)
      }
    }
    init()
  }, [])

  // Carregar escolas (só admin/tecnico)
  useEffect(() => {
    if (tipoUsuario && tipoUsuario !== 'escola') {
      fetch('/api/admin/escolas')
        .then(r => r.json())
        .then(data => setEscolas(Array.isArray(data) ? data : []))
        .catch(() => setEscolas([]))
    }
  }, [tipoUsuario])

  // Carregar turmas ao selecionar escola
  useEffect(() => {
    if (escolaId) {
      fetch(`/api/admin/turmas?escolas_ids=${escolaId}&ano_letivo=${anoLetivo}`)
        .then(r => r.json())
        .then(data => setTurmas(Array.isArray(data) ? data : []))
        .catch(() => setTurmas([]))
    } else {
      setTurmas([])
    }
    setSerieFiltro('')
    setTurmaId('')
  }, [escolaId, anoLetivo])

  // Carregar períodos ao mudar ano
  useEffect(() => {
    fetch(`/api/admin/periodos-letivos?ano_letivo=${anoLetivo}`)
      .then(r => r.json())
      .then(data => setPeriodos(Array.isArray(data) ? data : []))
      .catch(() => setPeriodos([]))
  }, [anoLetivo])

  // Buscar tipo de avaliação ao selecionar turma
  useEffect(() => {
    if (turmaId) {
      fetch(`/api/admin/turmas/${turmaId}/avaliacao`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setAvaliacaoTurma(data)
            // Atualizar config com dados da regra de avaliação
            if (data.regra_avaliacao) {
              const regra = data.regra_avaliacao
              setConfig(prev => ({
                ...prev,
                nota_maxima: regra.nota_maxima || prev.nota_maxima,
                media_aprovacao: regra.media_aprovacao ?? prev.media_aprovacao,
                media_recuperacao: regra.media_recuperacao ?? prev.media_recuperacao,
                permite_recuperacao: regra.permite_recuperacao ?? prev.permite_recuperacao,
              }))
            }
          }
        })
        .catch(() => setAvaliacaoTurma(null))
    } else {
      setAvaliacaoTurma(null)
    }
  }, [turmaId])

  // Carregar notas para lançamento
  const carregarNotasLancamento = useCallback(async () => {
    if (!turmaId || !periodoId) return
    // Parecer não precisa de disciplina; conceito e numérico precisam
    if (!isParecer && !disciplinaId) return

    setCarregando(true)
    try {
      // Verificar se turma tem frequência unificada
      const turma = turmas.find(t => t.id === turmaId)
      const unificada = isFrequenciaUnificada(turma?.serie)
      setFreqUnificada(unificada)

      // Buscar alunos da turma, notas e config em paralelo
      const notasUrl = isParecer
        ? `/api/admin/notas-escolares?turma_id=${turmaId}&periodo_id=${periodoId}`
        : `/api/admin/notas-escolares?turma_id=${turmaId}&disciplina_id=${disciplinaId}&periodo_id=${periodoId}`

      const fetches: Promise<Response>[] = [
        fetch(`/api/admin/turmas/${turmaId}/alunos`),
        fetch(notasUrl),
        fetch(`/api/admin/configuracao-notas?escola_id=${escolaId}&ano_letivo=${anoLetivo}`),
      ]
      // Se frequência unificada, buscar também frequencia_bimestral
      if (unificada && !isParecer) {
        fetches.push(fetch(`/api/admin/frequencia?turma_id=${turmaId}&periodo_id=${periodoId}`))
      }

      const [alunosRes, notasRes, configRes, freqRes] = await Promise.all(fetches)

      if (alunosRes.ok) {
        const alunosData = await alunosRes.json()
        setAlunos(alunosData.alunos || [])
      }

      // Montar mapa de notas existentes
      const notasMap: Record<string, NotaAluno> = {}
      if (notasRes.ok) {
        const notasData = await notasRes.json()
        for (const n of notasData) {
          notasMap[n.aluno_id] = {
            aluno_id: n.aluno_id,
            nota: n.nota,
            nota_recuperacao: n.nota_recuperacao,
            nota_final: n.nota_final,
            faltas: n.faltas || 0,
            observacao: n.observacao || '',
            conceito: n.conceito || null,
            parecer_descritivo: n.parecer_descritivo || null,
          }
        }
      }
      setNotas(notasMap)

      // Verificar se algum aluno tem nota de recuperação
      const temRecuperacao = Object.values(notasMap).some(n => n.nota_recuperacao !== null)
      setMostrarRecuperacao(temRecuperacao)

      if (configRes.ok) {
        const configData = await configRes.json()
        if (configData.length > 0) {
          setConfig(prev => ({ ...prev, ...configData[0] }))
        }
      }

      // Carregar frequência unificada se aplicável
      if (unificada && !isParecer && freqRes && freqRes.ok) {
        const freqData = await freqRes.json()
        const freqMap: Record<string, FreqUnificadaAluno> = {}
        if (freqData.frequencias) {
          for (const [alunoId, f] of Object.entries(freqData.frequencias) as [string, any][]) {
            freqMap[alunoId] = {
              presencas: f.presencas || 0,
              faltas: f.faltas || 0,
              faltas_justificadas: f.faltas_justificadas || 0,
            }
            if (f.dias_letivos > 0) setDiasLetivos(f.dias_letivos)
          }
        }
        setFrequencias(freqMap)
      } else if (!unificada || isParecer) {
        setFrequencias({})
      }

      setModo('lancamento')
    } catch (e) {
      toast.error('Erro ao carregar dados')
    } finally {
      setCarregando(false)
    }
  }, [turmaId, disciplinaId, periodoId, escolaId, anoLetivo, turmas, isParecer])

  // Atualizar nota de um aluno
  const atualizarNota = (alunoId: string, campo: keyof NotaAluno, valor: any) => {
    setNotas(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId] || { aluno_id: alunoId, nota: null, nota_recuperacao: null, nota_final: null, faltas: 0, observacao: '', conceito: null, parecer_descritivo: null },
        [campo]: valor,
      },
    }))
  }

  // Atualizar frequência unificada de um aluno
  const atualizarFrequencia = (alunoId: string, campo: keyof FreqUnificadaAluno, valor: number) => {
    setFrequencias(prev => {
      const atual = prev[alunoId] || { presencas: diasLetivos, faltas: 0, faltas_justificadas: 0 }
      const nova = { ...atual, [campo]: valor }
      if (campo === 'faltas') {
        nova.presencas = Math.max(0, diasLetivos - valor - nova.faltas_justificadas)
      } else if (campo === 'presencas') {
        nova.faltas = Math.max(0, diasLetivos - valor - nova.faltas_justificadas)
      } else if (campo === 'faltas_justificadas') {
        nova.presencas = Math.max(0, diasLetivos - nova.faltas - valor)
      }
      return { ...prev, [alunoId]: nova }
    })
  }

  // Atualizar dias letivos e recalcular presenças de todos
  const handleDiasLetivosChange = (novoDias: number) => {
    setDiasLetivos(novoDias)
    setFrequencias(prev => {
      const novo: Record<string, FreqUnificadaAluno> = {}
      for (const [alunoId, f] of Object.entries(prev)) {
        novo[alunoId] = {
          ...f,
          presencas: Math.max(0, novoDias - f.faltas - f.faltas_justificadas),
        }
      }
      return novo
    })
  }

  // Salvar notas
  const salvarNotas = async () => {
    setSalvando(true)
    try {
      const notasArray = alunos
        .filter(a => a.situacao === 'cursando' || !a.situacao)
        .map(a => {
          const nota = notas[a.id]
          return {
            aluno_id: a.id,
            nota: nota?.nota ?? null,
            nota_recuperacao: nota?.nota_recuperacao ?? null,
            faltas: nota?.faltas ?? 0,
            observacao: nota?.observacao || null,
            conceito: nota?.conceito ?? null,
            parecer_descritivo: nota?.parecer_descritivo ?? null,
          }
        })
        .filter(n => {
          if (isParecer) return n.parecer_descritivo !== null && n.parecer_descritivo !== ''
          if (isConceito) return n.conceito !== null
          return n.nota !== null || n.nota_recuperacao !== null || n.faltas > 0
        })

      if (notasArray.length === 0) {
        toast.info('Nenhuma nota para salvar')
        setSalvando(false)
        return
      }

      // Salvar notas e frequência unificada em paralelo
      const promises: Promise<Response>[] = [
        fetch('/api/admin/notas-escolares', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            turma_id: turmaId,
            disciplina_id: isParecer ? undefined : disciplinaId,
            periodo_id: periodoId,
            notas: notasArray,
          }),
        })
      ]

      // Se frequência unificada e não é parecer, salvar também
      if (freqUnificada && !isParecer && diasLetivos > 0) {
        const freqArray = alunos
          .filter(a => a.situacao === 'cursando' || !a.situacao)
          .map(a => {
            const f = frequencias[a.id]
            return {
              aluno_id: a.id,
              presencas: f?.presencas ?? diasLetivos,
              faltas: f?.faltas ?? 0,
              faltas_justificadas: f?.faltas_justificadas ?? 0,
            }
          })

        promises.push(
          fetch('/api/admin/frequencia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              turma_id: turmaId,
              periodo_id: periodoId,
              dias_letivos: diasLetivos,
              frequencias: freqArray,
            }),
          })
        )
      }

      const [notasResponse, freqResponse] = await Promise.all(promises)

      const data = await notasResponse.json()
      if (notasResponse.ok) {
        const msgs = [data.mensagem || 'Notas salvas!']
        if (freqResponse && freqResponse.ok) {
          msgs.push('Frequência salva!')
        } else if (freqResponse && !freqResponse.ok) {
          msgs.push('Erro ao salvar frequência')
        }
        toast.success(msgs.join(' '))
        await carregarNotasLancamento()
      } else {
        toast.error(data.mensagem || 'Erro ao salvar notas')
      }
    } catch (e) {
      toast.error('Erro ao salvar notas')
    } finally {
      setSalvando(false)
    }
  }

  // Ver boletim de um aluno
  const verBoletim = async (aluno: AlunoTurma) => {
    setCarregando(true)
    try {
      const res = await fetch(`/api/admin/notas-escolares/boletim?aluno_id=${aluno.id}&ano_letivo=${anoLetivo}`)
      if (res.ok) {
        const data = await res.json()
        setBoletimAluno(data.aluno)
        setBoletimData({
          periodos: data.periodos,
          boletim: data.boletim,
          config: data.config,
          frequencia: data.frequencia,
          recuperacao: data.recuperacao,
        })
        setModo('boletim')
      } else {
        toast.error('Erro ao carregar boletim')
      }
    } catch (e) {
      toast.error('Erro ao carregar boletim')
    } finally {
      setCarregando(false)
    }
  }

  // Imprimir boletim
  const imprimirBoletim = () => {
    if (!boletimAluno || !boletimData) return
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

    const th = 'padding:4px 8px;border:1px solid #999;background:#e8f0fe;text-align:center;font-size:11px;font-weight:600'
    const td = 'padding:4px 8px;border:1px solid #ccc;text-align:center;font-size:11px'

    // Header com 2 linhas: período + Av/Rec
    const periodosHeader1 = boletimData.periodos.map(p => `<th colspan="2" style="${th}">${esc(p.nome)}</th>`).join('')
    const periodosHeader2 = boletimData.periodos.map(() => `<th style="${th};font-size:9px;background:#f0f4ff">Av.</th><th style="${th};font-size:9px;background:#fff7ed;color:#c2410c">Rec.</th>`).join('')

    const linhas = boletimData.boletim.map(d => {
      const notas = d.periodos.map(p => {
        const substituiu = p.nota_recuperacao !== null && p.nota !== null && p.nota_recuperacao > p.nota
        const notaStr = p.nota !== null ? p.nota.toFixed(1) : '-'
        const recStr = p.nota_recuperacao !== null ? p.nota_recuperacao.toFixed(1) : '-'
        const corNota = p.nota !== null && p.nota < boletimData.config.media_aprovacao ? 'color:#dc2626' : ''
        const estiloNota = substituiu ? `${corNota};text-decoration:line-through;opacity:0.5` : corNota
        const corRec = substituiu ? 'color:#16a34a;font-weight:bold' : (p.nota_recuperacao !== null ? 'color:#c2410c' : '')
        return `<td style="${td};${estiloNota}">${notaStr}</td><td style="${td};${corRec}">${recStr}</td>`
      }).join('')
      const media = d.media_anual !== null ? d.media_anual.toFixed(1) : '-'
      const corMedia = d.media_anual !== null && d.media_anual < boletimData.config.media_aprovacao ? 'color:#dc2626' : 'color:#16a34a'
      const sit = d.situacao === 'aprovado' ? '<span style="color:#16a34a">Aprovado</span>' : d.situacao === 'reprovado' ? '<span style="color:#dc2626">Reprovado</span>' : '-'
      return `<tr><td style="${td};text-align:left;font-weight:500">${esc(d.disciplina_nome)}</td>${notas}<td style="${td};font-weight:bold;${corMedia}">${media}</td><td style="${td}">${d.total_faltas}</td><td style="${td}">${sit}</td></tr>`
    }).join('')

    // Frequência unificada
    let freqHtml = ''
    if (boletimData.frequencia && boletimData.frequencia.some(f => f.dias_letivos !== null)) {
      const freqCells = boletimData.frequencia.map(f => {
        if (f.dias_letivos === null) return `<td colspan="2" style="${td}">-</td>`
        const cor = f.percentual !== null ? (f.percentual >= 75 ? 'color:#16a34a' : 'color:#dc2626') : ''
        return `<td colspan="2" style="${td};${cor};font-weight:bold">${f.percentual !== null ? f.percentual.toFixed(0) + '%' : '-'}<br><span style="font-size:9px;color:#888;font-weight:normal">${f.presencas}/${f.dias_letivos} | ${f.faltas}F</span></td>`
      }).join('')
      const totalFaltas = boletimData.frequencia.reduce((s, f) => s + (f.faltas || 0), 0)
      freqHtml = `<tr style="background:#f5f3ff"><td style="${td};text-align:left;font-weight:500;color:#7c3aed">Frequência</td>${freqCells}<td style="${td}">-</td><td style="${td};font-weight:bold;color:#7c3aed">${totalFaltas}</td><td style="${td}">-</td></tr>`
    }

    const html = `<!DOCTYPE html><html><head><title>Boletim - ${esc(boletimAluno.nome)}</title><style>body{font-family:Arial,sans-serif;margin:15px}@media print{body{margin:8px}}table{border-collapse:collapse;width:100%}</style></head><body>
      <h2 style="text-align:center;margin-bottom:3px;font-size:16px">Boletim Escolar ${esc(anoLetivo)}</h2>
      <p style="text-align:center;color:#666;margin-top:0;font-size:13px">${esc(boletimAluno.escola_nome || '')}</p>
      <table style="margin-bottom:10px;font-size:12px"><tr><td><strong>Aluno:</strong> ${esc(boletimAluno.nome)}</td><td style="padding-left:20px"><strong>Turma:</strong> ${esc(boletimAluno.turma_codigo || '-')}</td><td style="padding-left:20px"><strong>Série:</strong> ${esc(boletimAluno.serie || '-')}</td></tr></table>
      <table>
        <thead>
          <tr><th rowspan="2" style="${th};text-align:left">Disciplina</th>${periodosHeader1}<th rowspan="2" style="${th};background:#dbeafe">Média</th><th rowspan="2" style="${th}">Faltas</th><th rowspan="2" style="${th}">Situação</th></tr>
          <tr>${periodosHeader2}</tr>
        </thead>
        <tbody>${linhas}${freqHtml}</tbody>
      </table>
      <p style="margin-top:10px;font-size:10px;color:#888">Média de aprovação: ${boletimData.config.media_aprovacao} | Nota máxima: ${boletimData.config.nota_maxima} | Rec. = Recuperação (substitui quando maior)${
        (boletimData.config as ConfigNotas).formula_media === 'media_ponderada' && (boletimData.config as ConfigNotas).pesos_periodos?.length
          ? ` | Fórmula: Média Ponderada (pesos: ${(boletimData.config as ConfigNotas).pesos_periodos!.map((p: any) => p.peso).join(', ')})`
          : ''
      }</p>
      <p style="font-size:10px;color:#888"><span style="color:#16a34a">Verde</span> = nota de recuperação que substituiu | <span style="text-decoration:line-through">Riscado</span> = nota original substituída</p>
      <script>window.print()</script></body></html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  const voltar = () => {
    setModo('selecao')
    setBoletimAluno(null)
    setBoletimData(null)
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Lançamento de Notas</h1>
              <p className="text-sm opacity-90">Notas escolares por turma, disciplina e período</p>
            </div>
          </div>
        </div>

        {carregando ? (
          <LoadingSpinner text="Carregando..." centered />
        ) : modo === 'selecao' ? (
          <PainelSelecao
            tipoUsuario={tipoUsuario}
            escolas={escolas}
            turmas={turmasFiltradas}
            series={seriesUnicas}
            disciplinas={disciplinas}
            periodos={periodos}
            escolaId={escolaId}
            serieFiltro={serieFiltro}
            turmaId={turmaId}
            disciplinaId={disciplinaId}
            periodoId={periodoId}
            anoLetivo={anoLetivo}
            setEscolaId={setEscolaId}
            setSerieFiltro={(v: string) => { setSerieFiltro(v); setTurmaId('') }}
            setTurmaId={setTurmaId}
            setDisciplinaId={setDisciplinaId}
            setPeriodoId={setPeriodoId}
            setAnoLetivo={setAnoLetivo}
            onIniciar={carregarNotasLancamento}
            avaliacaoTurma={avaliacaoTurma}
          />
        ) : modo === 'lancamento' ? (
          <PainelLancamento
            alunos={alunos}
            notas={notas}
            config={config}
            turmaNome={turmaSelecionada ? `${turmaSelecionada.codigo} - ${turmaSelecionada.nome || turmaSelecionada.serie}` : ''}
            disciplinaNome={disciplinaSelecionada?.nome || ''}
            periodoNome={periodoSelecionado?.nome || ''}
            mostrarRecuperacao={mostrarRecuperacao}
            setMostrarRecuperacao={setMostrarRecuperacao}
            atualizarNota={atualizarNota}
            salvarNotas={salvarNotas}
            salvando={salvando}
            voltar={voltar}
            verBoletim={verBoletim}
            freqUnificada={freqUnificada}
            diasLetivos={diasLetivos}
            setDiasLetivos={handleDiasLetivosChange}
            frequencias={frequencias}
            atualizarFrequencia={atualizarFrequencia}
            avaliacaoTurma={avaliacaoTurma}
          />
        ) : modo === 'boletim' && boletimAluno && boletimData ? (
          <PainelBoletim
            aluno={boletimAluno}
            periodos={boletimData.periodos}
            boletim={boletimData.boletim}
            config={boletimData.config}
            voltar={() => setModo('lancamento')}
            imprimir={imprimirBoletim}
            frequencia={boletimData.frequencia}
            recuperacao={boletimData.recuperacao}
          />
        ) : null}
      </div>
    </ProtectedRoute>
  )
}

// ============================================
// Painel de Seleção
// ============================================

function PainelSelecao({
  tipoUsuario, escolas, turmas, series, disciplinas, periodos,
  escolaId, serieFiltro, turmaId, disciplinaId, periodoId, anoLetivo,
  setEscolaId, setSerieFiltro, setTurmaId, setDisciplinaId, setPeriodoId, setAnoLetivo,
  onIniciar, avaliacaoTurma,
}: any) {
  const tipoResultado = avaliacaoTurma?.tipo_avaliacao?.tipo_resultado
  const isParecer = tipoResultado === 'parecer'
  // Parecer não precisa de disciplina
  const podeIniciar = turmaId && periodoId && (isParecer || disciplinaId)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Selecione a turma e disciplina</h2>

      {/* Badge do tipo de avaliação */}
      {avaliacaoTurma && (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
          tipoResultado === 'parecer' ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' :
          tipoResultado === 'conceito' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
          'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
        }`}>
          <span className="w-2 h-2 rounded-full bg-current" />
          {avaliacaoTurma.tipo_avaliacao.nome}
          {avaliacaoTurma.regra_avaliacao && (
            <span className="text-xs opacity-70">| {avaliacaoTurma.regra_avaliacao.nome}</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Ano letivo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ano Letivo</label>
          <select
            value={anoLetivo}
            onChange={e => setAnoLetivo(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* Escola (só admin/tecnico) */}
        {tipoUsuario !== 'escola' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Escola</label>
            <select
              value={escolaId}
              onChange={e => setEscolaId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="">Selecione a escola...</option>
              {escolas.map((e: any) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>
        )}

        {/* Série */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Série</label>
          <select
            value={serieFiltro}
            onChange={e => setSerieFiltro(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            <option value="">Todas as séries</option>
            {series.map((s: string) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Turma */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turma</label>
          <select
            value={turmaId}
            onChange={e => setTurmaId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            <option value="">Selecione a turma...</option>
            {turmas.map((t: any) => (
              <option key={t.id} value={t.id}>{t.codigo} - {t.nome || t.serie}</option>
            ))}
          </select>
        </div>

        {/* Disciplina — ocultar para Parecer */}
        {!isParecer && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Disciplina</label>
            <select
              value={disciplinaId}
              onChange={e => setDisciplinaId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="">Selecione a disciplina...</option>
              {disciplinas.map((d: any) => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </div>
        )}

        {/* Período */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Período</label>
          <select
            value={periodoId}
            onChange={e => setPeriodoId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            <option value="">Selecione o período...</option>
            {periodos.map((p: any) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={onIniciar}
        disabled={!podeIniciar}
        className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-colors ${
          podeIniciar
            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
            : 'bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed'
        }`}
      >
        <FileText className="w-4 h-4" />
        {isParecer ? 'Lançar Pareceres' : 'Lançar Notas'}
      </button>
    </div>
  )
}

// ============================================
// Painel de Lançamento
// ============================================

function PainelLancamento({
  alunos, notas, config,
  turmaNome, disciplinaNome, periodoNome,
  mostrarRecuperacao, setMostrarRecuperacao,
  atualizarNota, salvarNotas, salvando,
  voltar, verBoletim,
  freqUnificada, diasLetivos, setDiasLetivos,
  frequencias, atualizarFrequencia,
  avaliacaoTurma,
}: any) {
  const alunosAtivos = alunos.filter((a: AlunoTurma) => a.situacao === 'cursando' || !a.situacao)

  const tipoResultado = avaliacaoTurma?.tipo_avaliacao?.tipo_resultado || 'numerico'
  const isParecer = tipoResultado === 'parecer'
  const isConceito = tipoResultado === 'conceito'
  const escalaConceitos: ConceitoEscala[] = avaliacaoTurma?.tipo_avaliacao?.escala_conceitos || []

  // Contadores
  const totalLancados = alunosAtivos.filter((a: AlunoTurma) => {
    const n = notas[a.id]
    if (isParecer) return n?.parecer_descritivo
    if (isConceito) return n?.conceito
    return n?.nota !== null && n?.nota !== undefined
  }).length

  const totalAbaixoMedia = !isParecer ? alunosAtivos.filter((a: AlunoTurma) => {
    const n = notas[a.id]
    if (isConceito) {
      if (!n?.conceito || escalaConceitos.length === 0) return false
      const c = escalaConceitos.find((c: ConceitoEscala) => c.codigo === n.conceito)
      return c ? c.valor_numerico < config.media_aprovacao : false
    }
    return n?.nota !== null && n?.nota !== undefined && n.nota < config.media_aprovacao
  }).length : 0

  const totalBaixaFreq = freqUnificada && !isParecer ? alunosAtivos.filter((a: AlunoTurma) => {
    const f = frequencias[a.id]
    if (!f || diasLetivos <= 0) return false
    const pct = (f.presencas / diasLetivos) * 100
    return pct < 75
  }).length : 0

  // Label do tipo
  const tipoLabel = isParecer ? 'Parecer Descritivo' : isConceito ? 'Conceito' : `Nota (0-${config.nota_maxima})`
  const subtitulo = isParecer ? `${turmaNome} | ${periodoNome}` : `${turmaNome} | ${periodoNome}`

  return (
    <div className="space-y-4">
      {/* Barra de contexto */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={voltar} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                {isParecer ? 'Parecer Descritivo' : disciplinaNome}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{subtitulo}</p>
            </div>
            {/* Badge tipo de avaliação */}
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              isParecer ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' :
              isConceito ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
              'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            }`}>
              {tipoLabel}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
              {totalLancados}/{alunosAtivos.length} lançados
            </span>
            {totalAbaixoMedia > 0 && (
              <span className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-3 py-1 rounded-full">
                {totalAbaixoMedia} abaixo da média
              </span>
            )}
            {freqUnificada && !isParecer && totalBaixaFreq > 0 && (
              <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full">
                {totalBaixaFreq} abaixo de 75% freq.
              </span>
            )}
            {freqUnificada && !isParecer && (
              <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-xs">
                Freq. Unificada
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dias Letivos (frequência unificada, não para parecer) */}
      {freqUnificada && !isParecer && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 flex items-center gap-4">
          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Dias Letivos no Período:</span>
          <input
            type="number"
            value={diasLetivos}
            onChange={e => setDiasLetivos(parseInt(e.target.value) || 0)}
            min={0}
            max={200}
            className="w-20 text-center rounded-lg border border-purple-300 dark:border-purple-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-semibold"
          />
          <span className="text-xs text-purple-500 dark:text-purple-400">
            Frequência unificada — vale para todas as disciplinas deste período
          </span>
        </div>
      )}

      {/* Aviso frequência por aula (6º-9º) */}
      {!freqUnificada && !isParecer && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-amber-600 dark:text-amber-400 text-lg">&#9432;</span>
            <span className="text-sm text-amber-700 dark:text-amber-300">
              <strong>Faltas por disciplina</strong> — calculadas automaticamente a partir da frequência por aula.
              Gerencie no <strong>Painel da Turma</strong> e agregue os dados ao final do período.
            </span>
          </div>
          <a
            href="/admin/painel-turma"
            className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            Painel da Turma
          </a>
        </div>
      )}

      {/* Info parecer */}
      {isParecer && (
        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4 flex items-center gap-3">
          <span className="text-violet-600 dark:text-violet-400 text-lg">&#9998;</span>
          <span className="text-sm text-violet-700 dark:text-violet-300">
            <strong>Avaliação por Parecer Descritivo</strong> — escreva o parecer individual de cada aluno.
            Não há nota numérica. A aprovação é automática para esta etapa.
          </span>
        </div>
      )}

      {/* Info conceito */}
      {isConceito && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3">
          <span className="text-amber-600 dark:text-amber-400 text-lg">&#9733;</span>
          <div className="text-sm text-amber-700 dark:text-amber-300">
            <strong>Avaliação por Conceito</strong> — selecione o conceito de cada aluno.
            <span className="ml-2">
              {escalaConceitos.map((c: ConceitoEscala) => (
                <span key={c.codigo} className="inline-flex items-center gap-0.5 mr-2">
                  <strong>{c.codigo}</strong>={c.nome} ({c.valor_numerico})
                </span>
              ))}
            </span>
          </div>
        </div>
      )}

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3">
        {!isParecer && !isConceito && config.permite_recuperacao && (
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg shadow-sm">
            <input
              type="checkbox"
              checked={mostrarRecuperacao}
              onChange={e => setMostrarRecuperacao(e.target.checked)}
              className="rounded border-gray-300 text-emerald-600"
            />
            Mostrar Recuperação
          </label>
        )}
        <button
          onClick={salvarNotas}
          disabled={salvando}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-400 text-sm font-medium transition-colors ml-auto"
        >
          <Save className="w-4 h-4" />
          {salvando ? 'Salvando...' : isParecer ? 'Salvar Pareceres' : freqUnificada ? 'Salvar Notas e Frequência' : 'Salvar Notas'}
        </button>
      </div>

      {/* ============================================ */}
      {/* TABELA: PARECER DESCRITIVO */}
      {/* ============================================ */}
      {isParecer ? (
        <div className="space-y-4">
          {alunosAtivos.map((aluno: AlunoTurma, idx: number) => {
            const nota = notas[aluno.id]
            const parecer = nota?.parecer_descritivo || ''

            return (
              <div key={aluno.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-gray-400 font-mono w-6">{idx + 1}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{aluno.nome}</span>
                  {aluno.pcd && (
                    <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full">PCD</span>
                  )}
                  {parecer.length > 0 && (
                    <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" />
                  )}
                </div>
                <textarea
                  value={parecer}
                  onChange={e => atualizarNota(aluno.id, 'parecer_descritivo', e.target.value)}
                  placeholder="Escreva o parecer descritivo do aluno..."
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-y placeholder:text-gray-400"
                />
              </div>
            )
          })}
          {alunosAtivos.length === 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-8 text-center text-gray-500 dark:text-gray-400">
              Nenhum aluno ativo nesta turma
            </div>
          )}
        </div>
      ) : (
        /* ============================================ */
        /* TABELA: CONCEITO / NUMÉRICO */
        /* ============================================ */
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-8">#</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Aluno</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-28">
                    {isConceito ? 'Conceito' : `Nota (0-${config.nota_maxima})`}
                  </th>
                  {!isConceito && mostrarRecuperacao && (
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-24">Recuperação</th>
                  )}
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-20">
                    {isConceito ? 'Valor' : 'Nota Final'}
                  </th>
                  {freqUnificada ? (
                    <>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-purple-600 dark:text-purple-300 uppercase w-16 bg-purple-50/50 dark:bg-purple-900/10">Faltas</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-purple-600 dark:text-purple-300 uppercase w-16 bg-purple-50/50 dark:bg-purple-900/10">Pres.</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-purple-600 dark:text-purple-300 uppercase w-16 bg-purple-50/50 dark:bg-purple-900/10">%</th>
                    </>
                  ) : (
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-16">Faltas</th>
                  )}
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-20">Status</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-16">Boletim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {alunosAtivos.map((aluno: AlunoTurma, idx: number) => {
                  const nota = notas[aluno.id]
                  const notaVal = nota?.nota
                  const notaFinal = nota?.nota_final
                  const conceitoVal = nota?.conceito

                  // Para conceito, calcular valor numérico localmente
                  let conceitoNumerico: number | null = null
                  if (isConceito && conceitoVal && escalaConceitos.length > 0) {
                    const c = escalaConceitos.find((c: ConceitoEscala) => c.codigo === conceitoVal)
                    if (c) conceitoNumerico = c.valor_numerico
                  }

                  const valorExibicao = isConceito ? conceitoNumerico : notaFinal
                  const abaixo = valorExibicao !== null && valorExibicao !== undefined && valorExibicao < config.media_aprovacao

                  return (
                    <tr key={aluno.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-slate-800/50'}`}>
                      <td className="py-2 px-3 text-sm text-gray-500">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{aluno.nome}</span>
                          {aluno.pcd && (
                            <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full">PCD</span>
                          )}
                        </div>
                      </td>

                      {/* Input de conceito ou nota */}
                      <td className="py-2 px-3 text-center">
                        {isConceito ? (
                          <select
                            value={conceitoVal || ''}
                            onChange={e => atualizarNota(aluno.id, 'conceito', e.target.value || null)}
                            className={`w-24 text-center rounded-lg border px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-semibold
                              ${abaixo ? 'border-red-300 dark:border-red-600' : 'border-amber-300 dark:border-amber-600'}`}
                          >
                            <option value="">-</option>
                            {escalaConceitos.map((c: ConceitoEscala) => (
                              <option key={c.codigo} value={c.codigo}>{c.codigo} - {c.nome}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="number"
                            value={notaVal ?? ''}
                            onChange={e => {
                              const v = e.target.value === '' ? null : parseFloat(e.target.value)
                              atualizarNota(aluno.id, 'nota', v)
                            }}
                            min={0}
                            max={config.nota_maxima}
                            step={0.1}
                            className={`w-20 text-center rounded-lg border px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                              ${abaixo && !mostrarRecuperacao ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'}`}
                          />
                        )}
                      </td>

                      {/* Recuperação (só numérico) */}
                      {!isConceito && mostrarRecuperacao && (
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            value={nota?.nota_recuperacao ?? ''}
                            onChange={e => {
                              const v = e.target.value === '' ? null : parseFloat(e.target.value)
                              atualizarNota(aluno.id, 'nota_recuperacao', v)
                            }}
                            min={0}
                            max={config.nota_maxima}
                            step={0.1}
                            className="w-20 text-center rounded-lg border border-orange-300 dark:border-orange-600 px-2 py-1.5 text-sm bg-orange-50 dark:bg-orange-900/20 text-gray-900 dark:text-white"
                            placeholder="-"
                          />
                        </td>
                      )}

                      {/* Nota Final / Valor */}
                      <td className="py-2 px-3 text-center">
                        {isConceito ? (
                          <span className={`text-sm font-semibold ${
                            conceitoNumerico !== null
                              ? (conceitoNumerico >= config.media_aprovacao
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400')
                              : 'text-gray-400'
                          }`}>
                            {conceitoNumerico !== null ? conceitoNumerico.toFixed(1) : '-'}
                          </span>
                        ) : (
                          <span className={`text-sm font-semibold ${
                            notaFinal !== null && notaFinal !== undefined
                              ? (notaFinal >= config.media_aprovacao
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400')
                              : 'text-gray-400'
                          }`}>
                            {notaFinal !== null && notaFinal !== undefined ? notaFinal.toFixed(1) : '-'}
                          </span>
                        )}
                      </td>

                      {/* Frequência */}
                      {freqUnificada ? (() => {
                        const freq = frequencias[aluno.id] || { presencas: diasLetivos, faltas: 0, faltas_justificadas: 0 }
                        const pct = diasLetivos > 0 ? ((freq.presencas / diasLetivos) * 100) : 0
                        const corPct = pct >= 90 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 75 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                        return (
                          <>
                            <td className="py-2 px-3 text-center bg-purple-50/30 dark:bg-purple-900/5">
                              <input
                                type="number"
                                value={freq.faltas}
                                onChange={e => atualizarFrequencia(aluno.id, 'faltas', parseInt(e.target.value) || 0)}
                                min={0}
                                max={diasLetivos}
                                className="w-14 text-center rounded-lg border border-purple-300 dark:border-purple-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                              />
                            </td>
                            <td className="py-2 px-3 text-center bg-purple-50/30 dark:bg-purple-900/5">
                              <input
                                type="number"
                                value={freq.presencas}
                                onChange={e => atualizarFrequencia(aluno.id, 'presencas', parseInt(e.target.value) || 0)}
                                min={0}
                                max={diasLetivos}
                                className="w-14 text-center rounded-lg border border-purple-300 dark:border-purple-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                              />
                            </td>
                            <td className="py-2 px-3 text-center bg-purple-50/30 dark:bg-purple-900/5">
                              <span className={`text-sm font-semibold ${corPct}`}>
                                {pct.toFixed(0)}%
                              </span>
                            </td>
                          </>
                        )
                      })() : (
                        <td className="py-2 px-3 text-center" title="Faltas calculadas automaticamente a partir da frequência por aula. Acesse o Painel da Turma para gerenciar.">
                          <span className="inline-block w-14 text-center rounded-lg border border-gray-200 dark:border-slate-600 px-2 py-1.5 text-sm bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-gray-400 cursor-help">
                            {nota?.faltas ?? 0}
                          </span>
                        </td>
                      )}

                      {/* Status */}
                      <td className="py-2 px-3 text-center">
                        {isConceito ? (
                          conceitoNumerico !== null ? (
                            conceitoNumerico >= config.media_aprovacao ? (
                              <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-500 mx-auto" />
                            )
                          ) : (
                            <span className="text-gray-300">-</span>
                          )
                        ) : (
                          notaFinal !== null && notaFinal !== undefined ? (
                            notaFinal >= config.media_aprovacao ? (
                              <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-500 mx-auto" />
                            )
                          ) : (
                            <span className="text-gray-300">-</span>
                          )
                        )}
                      </td>

                      {/* Boletim */}
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => verBoletim(aluno)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                          title="Ver boletim"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {alunosAtivos.length === 0 && (
                  <tr>
                    <td colSpan={!isConceito && mostrarRecuperacao ? (freqUnificada ? 10 : 8) : (freqUnificada ? 9 : 7)} className="py-8 text-center text-gray-500 dark:text-gray-400">
                      Nenhum aluno ativo nesta turma
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Botão salvar fixo no mobile */}
      <div className="sm:hidden fixed bottom-4 left-4 right-4 z-40">
        <button
          onClick={salvarNotas}
          disabled={salvando}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl shadow-lg hover:bg-emerald-700 disabled:bg-emerald-400 text-sm font-medium"
        >
          <Save className="w-4 h-4" />
          {salvando ? 'Salvando...' : isParecer ? 'Salvar Pareceres' : freqUnificada ? 'Salvar Notas e Frequência' : 'Salvar Notas'}
        </button>
      </div>
    </div>
  )
}

// ============================================
// Painel Boletim
// ============================================

function PainelBoletim({
  aluno, periodos, boletim, config, voltar, imprimir,
  frequencia, recuperacao,
}: {
  aluno: any; periodos: Periodo[]; boletim: BoletimDisciplina[]; config: ConfigNotas
  voltar: () => void; imprimir: () => void
  frequencia?: any[]; recuperacao?: any[]
}) {
  const [abaAtiva, setAbaAtiva] = useState<'notas' | 'recuperacao'>('notas')
  const temRecuperacao = recuperacao && recuperacao.length > 0

  return (
    <div className="space-y-4">
      {/* Header do boletim */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={voltar} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Boletim de {aluno.nome}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {aluno.escola_nome} | Turma: {aluno.turma_codigo || '-'} | Série: {aluno.serie || '-'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={imprimir}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-1 mt-3 border-b border-gray-200 dark:border-slate-700">
          <button
            onClick={() => setAbaAtiva('notas')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              abaAtiva === 'notas'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Boletim Geral
          </button>
          <button
            onClick={() => setAbaAtiva('recuperacao')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              abaAtiva === 'recuperacao'
                ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Recuperação
            {temRecuperacao && (
              <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[10px] px-1.5 py-0.5 rounded-full">
                {recuperacao!.reduce((s, d) => s + d.periodos.length, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {abaAtiva === 'notas' ? (
        <>
          {/* Tabela do boletim */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th rowSpan={2} className="text-left py-2 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase border-r border-gray-200 dark:border-slate-600">Disciplina</th>
                    {periodos.map(p => (
                      <th key={p.id} colSpan={2} className="text-center py-2 px-1 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase border-r border-gray-200 dark:border-slate-600">
                        {p.nome}
                      </th>
                    ))}
                    <th rowSpan={2} className="text-center py-2 px-2 text-xs font-semibold text-blue-600 dark:text-blue-300 uppercase bg-blue-50 dark:bg-blue-900/20 w-16">Média</th>
                    <th rowSpan={2} className="text-center py-2 px-2 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-14">Faltas</th>
                    <th rowSpan={2} className="text-center py-2 px-2 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-20">Situação</th>
                  </tr>
                  <tr>
                    {periodos.map(p => (
                      <React.Fragment key={`sub-${p.id}`}>
                        <th className="text-center py-1 px-1 text-[10px] font-medium text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-slate-600/50">Av.</th>
                        <th className="text-center py-1 px-1 text-[10px] font-medium text-orange-500 dark:text-orange-400 border-r border-gray-200 dark:border-slate-600">Rec.</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {boletim.map((d, idx) => (
                    <tr key={d.disciplina_id} className={idx % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-slate-800/50'}>
                      <td className="py-2.5 px-4 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-slate-600 whitespace-nowrap">{d.disciplina_nome}</td>
                      {d.periodos.map(p => {
                        const abaixo = p.nota !== null && p.nota < config.media_aprovacao
                        const substituiu = p.nota_recuperacao !== null && p.nota !== null && p.nota_recuperacao > p.nota
                        return (
                          <React.Fragment key={p.periodo_id}>
                            <td className={`py-2.5 px-1 text-center border-r border-gray-100 dark:border-slate-600/50 ${substituiu ? 'line-through opacity-50' : ''}`}>
                              <span className={`text-sm ${abaixo && !substituiu ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                                {p.nota !== null ? p.nota.toFixed(1) : '-'}
                              </span>
                            </td>
                            <td className="py-2.5 px-1 text-center border-r border-gray-200 dark:border-slate-600">
                              {p.nota_recuperacao !== null ? (
                                <span className={`text-sm font-semibold ${substituiu ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-500 dark:text-orange-400'}`}>
                                  {p.nota_recuperacao.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600 text-sm">-</span>
                              )}
                            </td>
                          </React.Fragment>
                        )
                      })}
                      <td className="py-2.5 px-2 text-center bg-blue-50/50 dark:bg-blue-900/10">
                        <span className={`text-sm font-bold ${
                          d.media_anual !== null
                            ? (d.media_anual >= config.media_aprovacao ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')
                            : 'text-gray-400'
                        }`}>
                          {d.media_anual !== null ? d.media_anual.toFixed(1) : '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-sm text-gray-700 dark:text-gray-300">{d.total_faltas}</td>
                      <td className="py-2.5 px-2 text-center">
                        {d.situacao === 'aprovado' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            Aprovado
                          </span>
                        ) : d.situacao === 'reprovado' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                            Reprovado
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Frequência Unificada */}
            {frequencia && frequencia.some(f => f.dias_letivos !== null) && (
              <div className="border-t border-gray-200 dark:border-slate-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-purple-50 dark:bg-purple-900/20">
                      <tr>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase border-r border-gray-200 dark:border-slate-600">Frequência Geral</th>
                        {frequencia.map(f => (
                          <th key={f.periodo_id} colSpan={2} className="text-center py-2 px-1 text-xs font-semibold text-purple-600 dark:text-purple-300 uppercase border-r border-gray-200 dark:border-slate-600">
                            {f.periodo_nome}
                          </th>
                        ))}
                        <th className="text-center py-2 px-2 text-xs font-semibold text-purple-600 dark:text-purple-300 w-16">Média</th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-purple-600 dark:text-purple-300 w-14">Total</th>
                        <th className="w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-purple-50/30 dark:bg-purple-900/5">
                        <td className="py-2 px-4 text-sm font-medium text-purple-700 dark:text-purple-300 border-r border-gray-200 dark:border-slate-600">Presenças / Faltas</td>
                        {frequencia.map(f => (
                          <td key={f.periodo_id} colSpan={2} className="py-2 px-1 text-center border-r border-gray-200 dark:border-slate-600">
                            {f.dias_letivos !== null ? (
                              <div>
                                <span className={`text-sm font-semibold ${
                                  f.percentual !== null ? (f.percentual >= 75 ? 'text-emerald-600' : 'text-red-600') : 'text-gray-500'
                                }`}>
                                  {f.percentual !== null ? `${f.percentual.toFixed(0)}%` : '-'}
                                </span>
                                <span className="block text-[10px] text-gray-400">
                                  {f.presencas}/{f.dias_letivos} dias | {f.faltas}F
                                </span>
                              </div>
                            ) : <span className="text-gray-300 text-sm">-</span>}
                          </td>
                        ))}
                        <td className="py-2 px-2 text-center">
                          {(() => {
                            const comDados = frequencia.filter(f => f.percentual !== null)
                            if (comDados.length === 0) return <span className="text-gray-300">-</span>
                            const media = comDados.reduce((s, f) => s + f.percentual, 0) / comDados.length
                            return <span className={`text-sm font-bold ${media >= 75 ? 'text-emerald-600' : 'text-red-600'}`}>{media.toFixed(0)}%</span>
                          })()}
                        </td>
                        <td className="py-2 px-2 text-center text-sm text-gray-700 dark:text-gray-300">
                          {frequencia.reduce((s, f) => s + (f.faltas || 0), 0)}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Legenda */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-4">
              <span>Média aprovação: <strong>{config.media_aprovacao}</strong></span>
              <span>Nota máxima: <strong>{config.nota_maxima}</strong></span>
              {config.formula_media === 'media_ponderada' && config.pesos_periodos?.length && (
                <span className="text-blue-500">
                  Média Ponderada (pesos: {config.pesos_periodos.map(p => p.peso).join(', ')})
                </span>
              )}
              <span className="text-red-500">Vermelho = abaixo da média</span>
              <span className="text-emerald-500">Verde na Rec. = substituiu a nota</span>
              <span className="line-through opacity-50">Riscado = substituída pela recuperação</span>
            </div>
          </div>
        </>
      ) : (
        /* Aba de Recuperação */
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
          {temRecuperacao ? (
            <>
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  <strong>Regra de recuperação:</strong> A nota de recuperação substitui a avaliação quando for maior.
                  São 4 avaliações e 4 recuperações (1 por bimestre).
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Disciplina</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Período</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Nota Avaliação</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-orange-600 dark:text-orange-300 uppercase">Nota Recuperação</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-blue-600 dark:text-blue-300 uppercase">Nota Final</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {recuperacao!.flatMap((d, di) =>
                      d.periodos.map((p: any, pi: number) => (
                        <tr key={`${di}-${pi}`} className={pi % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-slate-800/50'}>
                          {pi === 0 && (
                            <td rowSpan={d.periodos.length} className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-slate-600">
                              {d.disciplina}
                            </td>
                          )}
                          <td className="py-3 px-3 text-center text-sm text-gray-700 dark:text-gray-300">{p.periodo}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`text-sm ${p.substituiu ? 'line-through opacity-50' : 'font-semibold text-red-600 dark:text-red-400'}`}>
                              {p.nota_original !== null ? p.nota_original.toFixed(1) : '-'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`text-sm font-semibold ${p.substituiu ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-500'}`}>
                              {p.nota_recuperacao !== null ? p.nota_recuperacao.toFixed(1) : '-'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`text-sm font-bold ${
                              p.nota_final !== null && p.nota_final >= config.media_aprovacao
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {p.nota_final !== null ? p.nota_final.toFixed(1) : '-'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {p.substituiu ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                <CheckCircle className="w-3 h-3" /> Substituiu
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                Manteve original
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Resumo da recuperação */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-4">
                <span>{recuperacao!.length} disciplina(s) com recuperação</span>
                <span>{recuperacao!.reduce((s, d) => s + d.periodos.length, 0)} prova(s) de recuperação</span>
                <span className="text-emerald-500">
                  {recuperacao!.reduce((s, d) => s + d.periodos.filter((p: any) => p.substituiu).length, 0)} nota(s) substituída(s)
                </span>
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-300 dark:text-emerald-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Nenhuma prova de recuperação registrada</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">O aluno não realizou recuperação em nenhum bimestre</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
