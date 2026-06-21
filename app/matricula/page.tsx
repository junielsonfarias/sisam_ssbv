'use client'

import { useState, useEffect } from 'react'
import Rodape from '@/components/rodape'
import { ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { type EscolaOption, type ConsultaResult } from '@/app/matricula/constants'
import FormularioMatricula, { type MatriculaForm } from '@/app/matricula/components/FormularioMatricula'
import ResultadoSucesso from '@/app/matricula/components/ResultadoSucesso'
import ConsultaProtocolo from '@/app/matricula/components/ConsultaProtocolo'

const FORM_INICIAL: MatriculaForm = {
  aluno_nome: '', aluno_data_nascimento: '', aluno_cpf: '', aluno_genero: '', aluno_pcd: false,
  responsavel_nome: '', responsavel_cpf: '', responsavel_telefone: '', responsavel_email: '', parentesco: '',
  endereco: '', bairro: '', escola_pretendida_id: '', serie_pretendida: '',
  ano_letivo: String(new Date().getFullYear()),
}

export default function MatriculaPage() {
  const [aba, setAba] = useState<'formulario' | 'consulta'>('formulario')
  const [etapa, setEtapa] = useState(1)
  const [escolas, setEscolas] = useState<EscolaOption[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState<{ protocolo: string } | null>(null)

  // Formulário
  const [form, setForm] = useState<MatriculaForm>({ ...FORM_INICIAL })

  // Consulta
  const [protocolo, setProtocolo] = useState('')
  const [consultaResult, setConsultaResult] = useState<ConsultaResult | null>(null)
  const [consultaErro, setConsultaErro] = useState('')

  useEffect(() => {
    fetch('/api/offline/escolas')
      .then(r => r.json())
      .then(data => {
        const lista = Array.isArray(data) ? data : data.escolas || []
        setEscolas(lista.map((e: any) => ({ id: e.id, nome: e.nome })))
      })
      .catch(() => {})
  }, [])

  const setField = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }))

  const validarEtapa = (n: number): string | null => {
    if (n === 1) {
      if (!form.aluno_nome.trim()) return 'Informe o nome do aluno.'
      if (!form.aluno_data_nascimento) return 'Informe a data de nascimento.'
    }
    if (n === 2) {
      if (!form.responsavel_nome.trim()) return 'Informe o nome do responsável.'
      if (!form.responsavel_telefone.trim() || form.responsavel_telefone.replace(/\D/g, '').length < 10)
        return 'Informe um telefone válido.'
    }
    if (n === 3) {
      if (!form.serie_pretendida) return 'Selecione a série pretendida.'
    }
    return null
  }

  const avancar = () => {
    const erro = validarEtapa(etapa)
    if (erro) { setErro(erro); return }
    setErro('')
    setEtapa(etapa + 1)
  }

  const enviar = async () => {
    const erro = validarEtapa(3)
    if (erro) { setErro(erro); return }
    setErro('')
    setCarregando(true)
    try {
      const res = await fetch('/api/pre-matricula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          aluno_cpf: form.aluno_cpf || null,
          responsavel_cpf: form.responsavel_cpf || null,
          responsavel_email: form.responsavel_email || null,
          escola_pretendida_id: form.escola_pretendida_id || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.mensagem || 'Erro ao enviar.'); return }
      setSucesso({ protocolo: data.protocolo })
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  const consultar = async () => {
    if (!protocolo.trim()) { setConsultaErro('Informe o protocolo.'); return }
    setConsultaErro('')
    setConsultaResult(null)
    setCarregando(true)
    try {
      const res = await fetch(`/api/pre-matricula?protocolo=${encodeURIComponent(protocolo.trim())}`)
      const data = await res.json()
      if (!res.ok) { setConsultaErro(data.mensagem || 'Não encontrado.'); return }
      setConsultaResult(data)
    } catch {
      setConsultaErro('Erro de conexão.')
    } finally {
      setCarregando(false)
    }
  }

  const inputClass = 'w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo-semed.png" alt="SEMED" width={56} height={56} className="h-12 sm:h-14 w-auto object-contain" />
            <div className="w-px h-10 bg-slate-200 flex-shrink-0" />
            <Image src="/logo-prefeitura.png" alt="Prefeitura" width={56} height={56} className="h-12 sm:h-14 w-auto object-contain" />
            <div className="hidden sm:block">
              <span className="font-bold text-sm text-blue-900 dark:text-blue-300">Pré-Matrícula</span>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">SEMED — São Sebastião da Boa Vista</p>
            </div>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 flex-1">
        {/* Título */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-xl shadow-blue-600/25">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Pré-Matrícula Online</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">SEMED - São Sebastião da Boa Vista</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 max-w-md mx-auto mb-8">
          <button onClick={() => { setAba('formulario'); setSucesso(null); setErro('') }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${aba === 'formulario' ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
            Nova Pré-Matrícula
          </button>
          <button onClick={() => { setAba('consulta'); setErro('') }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${aba === 'consulta' ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
            Consultar Protocolo
          </button>
        </div>

        {/* FORMULÁRIO */}
        {aba === 'formulario' && !sucesso && (
          <FormularioMatricula
            etapa={etapa}
            form={form}
            escolas={escolas}
            erro={erro}
            carregando={carregando}
            setField={setField}
            onVoltar={() => { setEtapa(etapa - 1); setErro('') }}
            onAvancar={avancar}
            onEnviar={enviar}
            inputClass={inputClass}
            labelClass={labelClass}
          />
        )}

        {/* SUCESSO */}
        {aba === 'formulario' && sucesso && (
          <ResultadoSucesso
            protocolo={sucesso.protocolo}
            onNovaMatricula={() => { setSucesso(null); setEtapa(1); setForm({ ...FORM_INICIAL }) }}
            onConsultarStatus={() => { setAba('consulta'); setProtocolo(sucesso.protocolo) }}
          />
        )}

        {/* CONSULTA */}
        {aba === 'consulta' && (
          <ConsultaProtocolo
            protocolo={protocolo}
            consultaResult={consultaResult}
            consultaErro={consultaErro}
            carregando={carregando}
            onProtocoloChange={setProtocolo}
            onConsultar={consultar}
            inputClass={inputClass}
            labelClass={labelClass}
          />
        )}
      </main>

      <Rodape />
    </div>
  )
}
