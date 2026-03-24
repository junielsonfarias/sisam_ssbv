'use client'

import ProtectedRoute from '@/components/protected-route'
import React, { useEffect, useState, useCallback } from 'react'
import { FileText } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSeries } from '@/lib/use-series'

import { PainelSelecao } from './components/painel-selecao'
import { PainelLancamento } from './components/painel-lancamento'
import { PainelBoletim } from './components/painel-boletim'
import type {
  EscolaSimples, TurmaSimples, Disciplina, SerieEscolarSimples,
  Periodo, AlunoTurma, NotaAluno, ConfigNotas, AvaliacaoTurma,
  BoletimDisciplina, Modo, FreqUnificadaAluno,
} from './components/types'
import { isFrequenciaUnificada } from './components/types'

// ============================================
// Componente Principal
// ============================================

export default function NotasEscolaresPage() {
  const toast = useToast()
  const { formatSerie } = useSeries()
  const [modo, setModo] = useState<Modo>('selecao')
  const [tipoUsuario, setTipoUsuario] = useState('')
  const [escolaIdUsuario, setEscolaIdUsuario] = useState('')

  // Seleção
  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [turmas, setTurmas] = useState<TurmaSimples[]>([])
  const [seriesEscolares, setSeriesEscolares] = useState<SerieEscolarSimples[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [periodos, setPeriodos] = useState<Periodo[]>([])

  const [escolaId, setEscolaId] = useState('')
  const [serieFiltro, setSerieFiltro] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [disciplinaId, setDisciplinaId] = useState('')
  const [periodoId, setPeriodoId] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString())

  // Mapear serie da turma → nome bonito da series_escolares
  const mapSerieNome = (serieCodigo: string): string => {
    // Tentar match por código numérico (ex: "1" → "1º Ano")
    const num = serieCodigo.replace(/[^0-9]/g, '')
    const match = seriesEscolares.find(se =>
      se.codigo === num || se.codigo === serieCodigo || se.nome === serieCodigo
    )
    return match?.nome || serieCodigo
  }

  // Séries únicas extraídas das turmas com nomes corretos
  const seriesUnicas = Array.from(new Set(turmas.map(t => t.serie)))
    .map(s => ({ valor: s, nome: mapSerieNome(s) }))
    .sort((a, b) => {
      // Ordenar pelo campo ordem da series_escolares
      const numA = a.valor.replace(/[^0-9]/g, '')
      const numB = b.valor.replace(/[^0-9]/g, '')
      const ordemA = seriesEscolares.find(se => se.codigo === numA)?.ordem ?? 99
      const ordemB = seriesEscolares.find(se => se.codigo === numB)?.ordem ?? 99
      return ordemA - ordemB
    })
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
        const [authRes, discRes, seriesRes] = await Promise.all([
          fetch('/api/auth/verificar'),
          fetch('/api/admin/disciplinas-escolares'),
          fetch('/api/admin/series-escolares'),
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
        if (seriesRes.ok) {
          const data = await seriesRes.json()
          setSeriesEscolares(Array.isArray(data) ? data : data.series || [])
        }
      } catch (e) {
        console.error('[NotasEscolares] Erro ao carregar dados iniciais:', (e as Error).message)
      }
    }
    init()
  }, [])

  // Carregar escolas (só admin/tecnico)
  useEffect(() => {
    if (tipoUsuario && tipoUsuario !== 'escola') {
      fetch('/api/admin/escolas')
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => setEscolas(Array.isArray(data) ? data : []))
        .catch(() => setEscolas([]))
    }
  }, [tipoUsuario])

  // Carregar turmas ao selecionar escola
  useEffect(() => {
    if (escolaId) {
      fetch(`/api/admin/turmas?escolas_ids=${escolaId}&ano_letivo=${anoLetivo}`)
        .then(r => r.ok ? r.json() : Promise.reject())
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
      .then(r => r.ok ? r.json() : Promise.reject())
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
      <table style="margin-bottom:10px;font-size:12px"><tr><td><strong>Aluno:</strong> ${esc(boletimAluno.nome)}</td><td style="padding-left:20px"><strong>Turma:</strong> ${esc(boletimAluno.turma_codigo || '-')}</td><td style="padding-left:20px"><strong>Série:</strong> ${esc(formatSerie(boletimAluno.serie))}</td></tr></table>
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
            turmaNome={turmaSelecionada ? `${turmaSelecionada.codigo} - ${turmaSelecionada.nome || formatSerie(turmaSelecionada.serie)}` : ''}
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
