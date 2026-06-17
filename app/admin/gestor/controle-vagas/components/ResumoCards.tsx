import {
  Users, School, AlertTriangle, CheckCircle,
  UserPlus, Clock, BarChart3
} from 'lucide-react'
import { Resumo } from './types'

interface ResumoCardsProps {
  resumo: Resumo
}

export default function ResumoCards({ resumo }: ResumoCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {[
        { label: 'Turmas', valor: resumo.total_turmas, icon: School, cor: 'text-blue-600' },
        { label: 'Capacidade', valor: resumo.total_vagas, icon: Users, cor: 'text-gray-600' },
        { label: 'Matriculados', valor: resumo.total_matriculados, icon: CheckCircle, cor: 'text-emerald-600' },
        { label: 'Vagas Livres', valor: resumo.total_disponiveis, icon: UserPlus, cor: 'text-indigo-600' },
        { label: 'Fila de Espera', valor: resumo.total_fila, icon: Clock, cor: 'text-orange-600' },
        { label: 'Lotadas', valor: resumo.turmas_lotadas, icon: AlertTriangle, cor: 'text-red-600' },
        { label: 'Ocupação', valor: `${resumo.ocupacao_media}%`, icon: BarChart3, cor: 'text-purple-600' }
      ].map((c, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 text-center">
          <c.icon className={`w-5 h-5 mx-auto mb-1 ${c.cor}`} />
          <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{c.valor}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
        </div>
      ))}
    </div>
  )
}
