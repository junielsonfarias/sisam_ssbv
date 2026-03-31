'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, School, Users, BookOpen, Droplets, Zap, Wifi, BookMarked, Dumbbell, Accessibility, UtensilsCrossed, MapPin, Printer } from 'lucide-react'
import SiteHeader from '@/components/site/site-header'
import SiteFooter from '@/components/site/site-footer'

interface Escola {
  id: string
  nome: string
  codigo: string | null
  endereco: string | null
  codigo_inep: string | null
  localizacao: string | null
  situacao_funcionamento: string | null
  agua_potavel: boolean | null
  energia_eletrica: boolean | null
  internet: boolean | null
  biblioteca: boolean | null
  quadra_esportiva: boolean | null
  acessibilidade_deficiente: boolean | null
  alimentacao_escolar: boolean | null
  polo_nome: string | null
  total_alunos: string
  total_turmas: string
}

function InfraIcon({ ativo, label, icon: Icon }: { ativo: boolean | null; label: string; icon: any }) {
  return (
    <div className={`flex items-center gap-1 text-xs ${ativo ? 'text-blue-600' : 'text-slate-300'}`} title={label}>
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </div>
  )
}

export default function TransparenciaPage() {
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [carregando, setCarregando] = useState(true)
  const [anoLetivo, setAnoLetivo] = useState(String(new Date().getFullYear()))
  const [busca, setBusca] = useState('')

  const anos = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i))

  const fetchDados = useCallback(async () => {
    try {
      setCarregando(true)
      const res = await fetch(`/api/transparencia?ano_letivo=${anoLetivo}`)
      if (!res.ok) throw new Error('Erro')
      const data = await res.json()
      setEscolas(data.escolas || [])
    } catch {
      setEscolas([])
    } finally {
      setCarregando(false)
    }
  }, [anoLetivo])

  useEffect(() => {
    fetchDados()
  }, [fetchDados])

  const escolasFiltradas = useMemo(() => {
    if (!busca.trim()) return escolas
    const termo = busca.toLowerCase()
    return escolas.filter(e => e.nome.toLowerCase().includes(termo))
  }, [escolas, busca])

  const totalAlunos = useMemo(() => escolasFiltradas.reduce((acc, e) => acc + parseInt(e.total_alunos || '0'), 0), [escolasFiltradas])
  const totalTurmas = useMemo(() => escolasFiltradas.reduce((acc, e) => acc + parseInt(e.total_turmas || '0'), 0), [escolasFiltradas])

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader data={{}} />

      {/* Hero */}
      <div className="pt-32 pb-16 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-600 mb-4">Dados Abertos</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
              Transparência Escolar
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              SEMED São Sebastião da Boa Vista — Dados públicos das escolas municipais
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Controles */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <select
            value={anoLetivo}
            onChange={(e) => setAnoLetivo(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar escola por nome..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors print:hidden"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 rounded-2xl p-5 text-center">
            <School className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-extrabold text-blue-700">{escolasFiltradas.length}</p>
            <p className="text-xs text-blue-600 font-medium">Escolas Ativas</p>
          </div>
          <div className="bg-blue-50 rounded-2xl p-5 text-center">
            <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-extrabold text-blue-700">{totalAlunos.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-blue-600 font-medium">Alunos Matriculados</p>
          </div>
          <div className="bg-purple-50 rounded-2xl p-5 text-center">
            <BookOpen className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-extrabold text-purple-700">{totalTurmas.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-purple-600 font-medium">Turmas</p>
          </div>
        </div>

        {/* Grid de escolas */}
        {carregando ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <School className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-slate-400 font-medium">Carregando dados...</p>
          </div>
        ) : escolasFiltradas.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg font-semibold">Nenhuma escola encontrada</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {escolasFiltradas.map((escola) => (
              <div
                key={escola.id}
                className="bg-white rounded-2xl p-6 border border-slate-100 hover:shadow-lg hover:shadow-slate-900/5 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{escola.nome}</h3>
                    {escola.polo_nome && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 mt-1">
                        {escola.polo_nome}
                      </span>
                    )}
                  </div>
                  {escola.localizacao && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                      escola.localizacao.toLowerCase() === 'urbana'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      <MapPin className="w-3 h-3" />
                      {escola.localizacao}
                    </span>
                  )}
                </div>

                {escola.codigo_inep && (
                  <p className="text-xs text-slate-400 font-mono mb-3">INEP: {escola.codigo_inep}</p>
                )}

                <div className="flex gap-6 mb-4">
                  <div>
                    <p className="text-xl font-extrabold text-blue-600">{parseInt(escola.total_alunos).toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-slate-500">Alunos</p>
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-purple-600">{parseInt(escola.total_turmas).toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-slate-500">Turmas</p>
                  </div>
                </div>

                {/* Infraestrutura */}
                <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-100">
                  <InfraIcon ativo={escola.agua_potavel} label="Água" icon={Droplets} />
                  <InfraIcon ativo={escola.energia_eletrica} label="Energia" icon={Zap} />
                  <InfraIcon ativo={escola.internet} label="Internet" icon={Wifi} />
                  <InfraIcon ativo={escola.biblioteca} label="Biblioteca" icon={BookMarked} />
                  <InfraIcon ativo={escola.quadra_esportiva} label="Quadra" icon={Dumbbell} />
                  <InfraIcon ativo={escola.acessibilidade_deficiente} label="Acessibilidade" icon={Accessibility} />
                  <InfraIcon ativo={escola.alimentacao_escolar} label="Merenda" icon={UtensilsCrossed} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SiteFooter data={{}} />
    </div>
  )
}
