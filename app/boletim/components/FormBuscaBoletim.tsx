'use client'

import { Search, AlertTriangle } from 'lucide-react'

interface FormBuscaBoletimProps {
  modo: 'codigo' | 'cpf'
  onModoChange: (modo: 'codigo' | 'cpf') => void
  codigo: string
  onCodigoChange: (valor: string) => void
  cpf: string
  onCpfChange: (valor: string) => void
  dataNasc: string
  onDataNascChange: (valor: string) => void
  anoLetivo: string
  onAnoLetivoChange: (valor: string) => void
  erro: string
  carregando: boolean
  onBuscar: () => void
}

function cpfMask(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return d.slice(0, 3) + '.' + d.slice(3)
  if (d.length <= 9) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6)
  return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9)
}

export default function FormBuscaBoletim({
  modo,
  onModoChange,
  codigo,
  onCodigoChange,
  cpf,
  onCpfChange,
  dataNasc,
  onDataNascChange,
  anoLetivo,
  onAnoLetivoChange,
  erro,
  carregando,
  onBuscar,
}: FormBuscaBoletimProps) {
  const inputClass = 'w-full rounded-xl border border-gray-200 bg-slate-50 px-5 py-4 sm:py-5 text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all'

  return (
    <div className="w-full max-w-none">
      <div className="text-center mb-6 sm:mb-10">
        <h1 className="text-xl sm:text-4xl font-bold text-slate-800">Consulta de Boletim</h1>
        <p className="text-sm sm:text-lg text-slate-500 mt-1 sm:mt-3">Consulte as notas e frequência do aluno</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-10 lg:p-16 space-y-5 sm:space-y-8">
        {/* Modo toggle */}
        <div className="flex bg-slate-100 rounded-xl p-1">
          <button onClick={() => onModoChange('codigo')}
            className={`flex-1 py-3 sm:py-4 rounded-lg text-sm sm:text-base font-semibold transition-all ${modo === 'codigo' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Buscar por Codigo
          </button>
          <button onClick={() => onModoChange('cpf')}
            className={`flex-1 py-3 sm:py-4 rounded-lg text-sm sm:text-base font-semibold transition-all ${modo === 'cpf' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Buscar por CPF
          </button>
        </div>

        {modo === 'codigo' ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Codigo do Aluno</label>
            <input type="search" inputMode="search" value={codigo} onChange={e => onCodigoChange(e.target.value)}
              placeholder="Ex: NSL-2026-0001" className={inputClass}
              onKeyDown={e => e.key === 'Enter' && onBuscar()} />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">CPF do Aluno</label>
              <input type="text" inputMode="numeric" autoComplete="off" value={cpf} onChange={e => onCpfChange(cpfMask(e.target.value))}
                placeholder="000.000.000-00" maxLength={14} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Data de Nascimento</label>
              <input type="date" value={dataNasc} onChange={e => onDataNascChange(e.target.value)}
                className={inputClass} />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Ano Letivo</label>
          <select value={anoLetivo} onChange={e => onAnoLetivoChange(e.target.value)} className={inputClass}>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {erro && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {erro}
          </div>
        )}

        <button onClick={onBuscar} disabled={carregando}
          className="w-full py-4 sm:py-5 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-bold text-base sm:text-lg rounded-xl hover:from-blue-800 hover:to-blue-900 transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 flex items-center justify-center gap-2">
          {carregando ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <><Search className="w-5 h-5" /> Consultar Boletim</>
          )}
        </button>
      </div>
    </div>
  )
}
