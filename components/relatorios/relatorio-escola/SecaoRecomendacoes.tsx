import { DadosRelatorioEscola } from '@/lib/relatorios/tipos';
import {
  AlertTriangle,
  CheckCircle,
  Target
} from 'lucide-react';

export function SecaoRecomendacoes({ projecoes }: { projecoes: DadosRelatorioEscola['projecoes'] }) {
  return (
    <section className="secao-relatorio mb-8">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="w-6 h-6 text-green-600" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white print:text-black">
          Recomendações Pedagógicas
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pontos Fortes */}
        {projecoes.pontos_fortes.length > 0 && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-5 border border-green-200 dark:border-green-800">
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Pontos Fortes
            </h3>
            <ul className="space-y-3">
              {projecoes.pontos_fortes.map((ponto, index) => (
                <li key={index} className="flex items-start gap-3 text-green-800 dark:text-green-200">
                  <CheckCircle className="w-4 h-4 mt-1 flex-shrink-0 text-green-600" />
                  <span className="text-sm">{ponto}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Áreas de Atenção */}
        {projecoes.areas_atencao.length > 0 && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg p-5 border border-amber-200 dark:border-amber-800">
            <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Áreas de Atenção
            </h3>
            <ul className="space-y-3">
              {projecoes.areas_atencao.map((area, index) => (
                <li key={index} className="flex items-start gap-3 text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 mt-1 flex-shrink-0 text-amber-600" />
                  <span className="text-sm">{area}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recomendações */}
      {projecoes.recomendacoes.length > 0 && (
        <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-5 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Recomendações de Ação
          </h3>
          <ol className="space-y-3">
            {projecoes.recomendacoes.map((rec, index) => (
              <li key={index} className="flex items-start gap-3 text-blue-800 dark:text-blue-200">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <span className="text-sm">{rec}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
