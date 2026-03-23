import { DadosRelatorioEscola } from '@/lib/relatorios/tipos';
import { PieChart } from 'lucide-react';

export function ComparativoPolo({ comparativo }: { comparativo: NonNullable<DadosRelatorioEscola['comparativo_polo']> }) {
  return (
    <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-slate-700/50 dark:to-slate-800/50 rounded-lg p-6 border border-gray-200 dark:border-slate-600">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <PieChart className="w-5 h-5 text-blue-600" />
        Comparativo com o Polo
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Média da Escola</p>
          <p className="text-3xl font-bold text-blue-600">
            {comparativo.media_escola.toFixed(2)}
          </p>
        </div>
        <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Média do Polo</p>
          <p className="text-3xl font-bold text-gray-600 dark:text-gray-300">
            {comparativo.media_polo.toFixed(2)}
          </p>
        </div>
        <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Diferença</p>
          <p className={`text-3xl font-bold ${
            comparativo.diferenca >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {comparativo.diferenca >= 0 ? '+' : ''}{comparativo.diferenca.toFixed(2)}
          </p>
        </div>
        {comparativo.posicao_ranking && comparativo.total_escolas_polo && (
          <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ranking no Polo</p>
            <p className="text-3xl font-bold text-purple-600">
              {comparativo.posicao_ranking}º
              <span className="text-lg text-gray-400">/{comparativo.total_escolas_polo}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
