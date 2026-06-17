import { BarChart3 } from 'lucide-react'

interface EstadoVazioProps {
  escolasSelecionadas: string[]
  poloId: string
}

export default function EstadoVazio({ escolasSelecionadas, poloId }: EstadoVazioProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 p-12 text-center">
      <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
        {escolasSelecionadas.length === 0 && !poloId
          ? 'Selecione escolas para comparar'
          : 'Nenhum dado encontrado'}
      </p>
      <p className="text-sm text-gray-400 mt-2">
        {escolasSelecionadas.length === 0 && !poloId
          ? 'Escolha uma ou mais escolas e configure os filtros'
          : 'Verifique se há dados para as escolas selecionadas no ano letivo informado'}
      </p>
    </div>
  )
}
