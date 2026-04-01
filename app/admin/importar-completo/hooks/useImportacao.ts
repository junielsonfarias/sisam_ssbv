'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface AvaliacaoOpcao { id: string; nome: string; tipo: string }

export interface ProgressoImportacao {
  porcentagem: number
  linhas_processadas: number
  total_linhas: number
  status: string
  linhas_com_erro?: number
  polos_criados?: number
  polos_existentes?: number
  escolas_criadas?: number
  escolas_existentes?: number
  turmas_criadas?: number
  turmas_existentes?: number
  alunos_criados?: number
  alunos_existentes?: number
  questoes_criadas?: number
  questoes_existentes?: number
  resultados_novos?: number
  resultados_atualizados?: number
  resultados_duplicados?: number
}

const STORAGE_KEY = 'sisam_importacao_ativa'

function salvarImportacaoAtiva(id: string) {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, id)
}

function removerImportacaoAtiva() {
  if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY)
}

function carregarImportacaoAtiva(): string | null {
  if (typeof window !== 'undefined') return localStorage.getItem(STORAGE_KEY)
  return null
}

export function useImportacao() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [anoLetivo, setAnoLetivo] = useState<string>(new Date().getFullYear().toString())
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoOpcao[]>([])
  const [avaliacaoId, setAvaliacaoId] = useState<string>('')
  const [carregando, setCarregando] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [erro, setErro] = useState('')
  const [progresso, setProgresso] = useState<ProgressoImportacao | null>(null)
  const intervaloProgressoRef = useRef<NodeJS.Timeout | null>(null)
  const importacaoIdRef = useRef<string | null>(null)

  // Buscar avaliações quando o ano letivo mudar
  useEffect(() => {
    if (anoLetivo.length !== 4) { setAvaliacoes([]); setAvaliacaoId(''); return }
    fetch(`/api/admin/avaliacoes?ano_letivo=${anoLetivo}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const lista: AvaliacaoOpcao[] = Array.isArray(data) ? data : []
        setAvaliacoes(lista)
        if (lista.length === 1) setAvaliacaoId(lista[0].id)
        else setAvaliacaoId('')
      })
      .catch(() => { setAvaliacoes([]); setAvaliacaoId('') })
  }, [anoLetivo])

  const buscarResultadoFinal = useCallback(async (id: string) => {
    try {
      const resultadoResponse = await fetch(`/api/admin/importar-completo/resultado?id=${id}`)
      if (resultadoResponse.ok) {
        const resultadoData = await resultadoResponse.json()
        if (resultadoData && resultadoData.resultado) {
          setResultado(resultadoData)
        }
      }
    } catch (error) {
      // silencioso
    }
  }, [])

  const buscarProgresso = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/admin/importar-completo/progresso?id=${id}`)
      if (response.ok) {
        const data = await response.json()
        setProgresso({
          porcentagem: data.porcentagem || 0,
          linhas_processadas: data.linhas_processadas || 0,
          total_linhas: data.total_linhas || 0,
          status: data.status || 'processando',
          linhas_com_erro: data.linhas_com_erro || 0,
          polos_criados: data.polos_criados || 0,
          polos_existentes: data.polos_existentes || 0,
          escolas_criadas: data.escolas_criadas || 0,
          escolas_existentes: data.escolas_existentes || 0,
          turmas_criadas: data.turmas_criadas || 0,
          turmas_existentes: data.turmas_existentes || 0,
          alunos_criados: data.alunos_criados || 0,
          alunos_existentes: data.alunos_existentes || 0,
          questoes_criadas: data.questoes_criadas || 0,
          questoes_existentes: data.questoes_existentes || 0,
          resultados_novos: data.resultados_novos || 0,
          resultados_duplicados: data.resultados_duplicados || 0,
        })

        if (data.status === 'concluido') {
          if (intervaloProgressoRef.current) {
            clearInterval(intervaloProgressoRef.current)
            intervaloProgressoRef.current = null
          }
          setCarregando(false)
          removerImportacaoAtiva()
          buscarResultadoFinal(id)
        } else if (data.status === 'erro' || data.status === 'cancelado') {
          if (intervaloProgressoRef.current) {
            clearInterval(intervaloProgressoRef.current)
            intervaloProgressoRef.current = null
          }
          setCarregando(false)
          removerImportacaoAtiva()
        }
      }
    } catch (error) {
      // silencioso
    }
  }, [buscarResultadoFinal])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setArquivo(file)
        setErro('')
        setResultado(null)
        setProgresso(null)
      } else {
        setErro('Por favor, selecione um arquivo Excel (.xlsx ou .xls)')
        setArquivo(null)
      }
    }
  }, [])

  const handlePausar = useCallback(async () => {
    if (!importacaoIdRef.current) return
    try {
      const response = await fetch(`/api/admin/importar-completo/pausar?id=${importacaoIdRef.current}`, { method: 'POST' })
      if (response.ok) {
        setProgresso((prev) => prev ? { ...prev, status: 'pausado' } : null)
      } else {
        const errorData = await response.json()
        setErro(errorData.mensagem || 'Erro ao pausar importação')
      }
    } catch (error) {
      setErro('Erro ao conectar com o servidor')
    }
  }, [])

  const handleRetomar = useCallback(async () => {
    if (!importacaoIdRef.current) return
    try {
      const response = await fetch(`/api/admin/importar-completo/retomar?id=${importacaoIdRef.current}`, { method: 'POST' })
      if (response.ok) {
        setProgresso((prev) => prev ? { ...prev, status: 'processando' } : null)
        setCarregando(true)
      } else {
        const errorData = await response.json()
        setErro(errorData.mensagem || 'Erro ao retomar importação')
      }
    } catch (error) {
      setErro('Erro ao conectar com o servidor')
    }
  }, [])

  const handleCancelar = useCallback(async () => {
    if (!importacaoIdRef.current) return
    if (!confirm('Tem certeza que deseja cancelar a importação? Esta ação não pode ser desfeita.')) return
    try {
      const response = await fetch(`/api/admin/importar-completo/cancelar?id=${importacaoIdRef.current}`, { method: 'POST' })
      if (response.ok) {
        setProgresso((prev) => prev ? { ...prev, status: 'cancelado' } : null)
        setCarregando(false)
        removerImportacaoAtiva()
        if (intervaloProgressoRef.current) {
          clearInterval(intervaloProgressoRef.current)
          intervaloProgressoRef.current = null
        }
      } else {
        const errorData = await response.json()
        setErro(errorData.mensagem || 'Erro ao cancelar importação')
      }
    } catch (error) {
      setErro('Erro ao conectar com o servidor')
    }
  }, [])

  // Verificar se há importação em andamento ao carregar
  useEffect(() => {
    const importacaoIdSalva = carregarImportacaoAtiva()

    if (importacaoIdSalva) {
      const verificarEretomar = async () => {
        try {
          const response = await fetch(`/api/admin/importar-completo/progresso?id=${importacaoIdSalva}`)
          if (response.ok) {
            const data = await response.json()
            if (data.status === 'processando' || data.status === 'pausado') {
              importacaoIdRef.current = importacaoIdSalva
              setCarregando(true)
              setProgresso({
                porcentagem: data.porcentagem || 0,
                linhas_processadas: data.linhas_processadas || 0,
                total_linhas: data.total_linhas || 0,
                status: data.status || 'processando',
                linhas_com_erro: data.linhas_com_erro || 0,
                polos_criados: data.polos_criados || 0,
                polos_existentes: data.polos_existentes || 0,
                escolas_criadas: data.escolas_criadas || 0,
                escolas_existentes: data.escolas_existentes || 0,
                turmas_criadas: data.turmas_criadas || 0,
                turmas_existentes: data.turmas_existentes || 0,
                alunos_criados: data.alunos_criados || 0,
                alunos_existentes: data.alunos_existentes || 0,
                questoes_criadas: data.questoes_criadas || 0,
                questoes_existentes: data.questoes_existentes || 0,
                resultados_novos: data.resultados_novos || 0,
                resultados_duplicados: data.resultados_duplicados || 0,
              })
              intervaloProgressoRef.current = setInterval(() => {
                if (importacaoIdRef.current) {
                  buscarProgresso(importacaoIdRef.current)
                }
              }, 1000)
            } else {
              removerImportacaoAtiva()
              if (data.status === 'concluido') {
                buscarResultadoFinal(importacaoIdSalva)
              }
            }
          } else {
            removerImportacaoAtiva()
          }
        } catch (error) {
          removerImportacaoAtiva()
        }
      }
      verificarEretomar()
    }

    return () => {
      if (intervaloProgressoRef.current) {
        clearInterval(intervaloProgressoRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUpload = useCallback(async () => {
    if (!arquivo) {
      setErro('Por favor, selecione um arquivo')
      return
    }

    setCarregando(true)
    setErro('')
    setResultado(null)
    setProgresso(null)
    importacaoIdRef.current = null

    if (intervaloProgressoRef.current) {
      clearInterval(intervaloProgressoRef.current)
    }

    try {
      const formData = new FormData()
      formData.append('arquivo', arquivo)
      formData.append('ano_letivo', anoLetivo)
      if (avaliacaoId) formData.append('avaliacao_id', avaliacaoId)

      const response = await fetch('/api/admin/importar-completo', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        if (data.importacao_id) {
          importacaoIdRef.current = data.importacao_id
          salvarImportacaoAtiva(data.importacao_id)
          setProgresso({
            porcentagem: 0,
            linhas_processadas: 0,
            total_linhas: 0,
            status: 'processando',
          })
          buscarProgresso(data.importacao_id)
          intervaloProgressoRef.current = setInterval(() => {
            if (importacaoIdRef.current) {
              buscarProgresso(importacaoIdRef.current)
            }
          }, 1000)
        } else if (data.resultado) {
          setResultado(data)
          setCarregando(false)
          setArquivo(null)
          const fileInput = document.getElementById('arquivo') as HTMLInputElement
          if (fileInput) fileInput.value = ''
        }
      } else {
        const errorData = await response.json()
        setErro(errorData.mensagem || 'Erro ao importar dados')
        setCarregando(false)
      }
    } catch (error) {
      setErro('Erro ao conectar com o servidor')
      setCarregando(false)
      if (intervaloProgressoRef.current) {
        clearInterval(intervaloProgressoRef.current)
        intervaloProgressoRef.current = null
      }
    }
  }, [arquivo, anoLetivo, avaliacaoId, buscarProgresso])

  return {
    arquivo,
    anoLetivo,
    setAnoLetivo,
    avaliacoes,
    avaliacaoId,
    setAvaliacaoId,
    carregando,
    resultado,
    erro,
    progresso,
    importacaoIdRef,
    handleFileChange,
    handleUpload,
    handlePausar,
    handleRetomar,
    handleCancelar,
  }
}
