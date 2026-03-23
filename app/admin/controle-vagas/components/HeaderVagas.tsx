import { Users, RefreshCw } from 'lucide-react'
import { PoloSimples, EscolaSimples } from './types'

interface HeaderVagasProps {
  anoLetivo: string
  setAnoLetivo: (v: string) => void
  tipoUsuario: string
  poloId: string
  setPoloId: (v: string) => void
  setEscolaId: (v: string) => void
  escolaId: string
  polos: PoloSimples[]
  escolas: EscolaSimples[]
  carregarDados: () => void
}

export default function HeaderVagas({
  anoLetivo, setAnoLetivo, tipoUsuario, poloId, setPoloId,
  setEscolaId, escolaId, polos, escolas, carregarDados
}: HeaderVagasProps) {
  return (
    <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl shadow-lg p-6 text-white">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-lg p-2">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Controle de Vagas</h1>
            <p className="text-sm text-gray-300">Capacidade, ocupação e fila de espera</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={anoLetivo}
            onChange={e => setAnoLetivo(e.target.value)}
            className="bg-white/20 border border-white/30 rounded-lg px-3 py-1.5 text-sm"
          >
            {[2024, 2025, 2026].map(a => <option key={a} value={a} className="text-gray-800">{a}</option>)}
          </select>
          {tipoUsuario !== 'escola' && tipoUsuario !== 'polo' && (
            <select
              value={poloId}
              onChange={e => { setPoloId(e.target.value); setEscolaId('') }}
              className="bg-white/20 border border-white/30 rounded-lg px-3 py-1.5 text-sm max-w-44"
            >
              <option value="" className="text-gray-800">Todos os polos</option>
              {polos.map(p => <option key={p.id} value={p.id} className="text-gray-800">{p.nome}</option>)}
            </select>
          )}
          {tipoUsuario !== 'escola' && (
            <select
              value={escolaId}
              onChange={e => setEscolaId(e.target.value)}
              className="bg-white/20 border border-white/30 rounded-lg px-3 py-1.5 text-sm max-w-48"
            >
              <option value="" className="text-gray-800">{poloId ? 'Todas do polo' : 'Todas as escolas'}</option>
              {escolas.map(e => <option key={e.id} value={e.id} className="text-gray-800">{e.nome}</option>)}
            </select>
          )}
          <button onClick={carregarDados} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition" title="Atualizar">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
