'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import { DistribuicaoNivel } from '@/lib/relatorios/tipos';

interface Props {
  niveis: DistribuicaoNivel[];
  titulo?: string;
}

const CORES_NIVEIS: Record<string, string> = {
  'Avançado': '#22C55E',
  'Adequado': '#3B82F6',
  'Básico': '#F59E0B',
  'Insuficiente': '#EF4444',
  'Não classificado': '#6B7280'
};

export function GraficoNiveis({ niveis, titulo = 'Níveis de Aprendizagem' }: Props) {
  const total = niveis.reduce((acc, item) => acc + item.quantidade, 0);

  const dados = niveis.map(item => ({
    ...item,
    cor: item.cor || CORES_NIVEIS[item.nivel] || '#6B7280'
  }));

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">Sem dados de níveis</p>
      </div>
    );
  }

  const renderLabel = ({ nivel, percentual }: { nivel: string; percentual: number }) => {
    if (percentual < 5) return '';
    return `${percentual}%`;
  };

  return (
    <div className="grafico-container">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 print:text-black">
        {titulo}
      </h3>
      <div className="h-64 print:h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dados}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="quantidade"
              nameKey="nivel"
              label={renderLabel}
              labelLine={false}
            >
              {dados.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.cor} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value} alunos (${((value / total) * 100).toFixed(1)}%)`,
                name
              ]}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px'
              }}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              formatter={(value) => (
                <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Cards com totais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 print:grid-cols-4">
        {dados.map(nivel => (
          <div
            key={nivel.nivel}
            className="p-2 rounded-lg text-center"
            style={{ backgroundColor: `${nivel.cor}20` }}
          >
            <div className="text-lg font-bold" style={{ color: nivel.cor }}>
              {nivel.quantidade}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {nivel.nivel}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
