'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';

interface FaixaNota {
  faixa: string;
  quantidade: number;
}

interface Props {
  distribuicao: FaixaNota[];
  titulo?: string;
}

const CORES_FAIXAS = [
  '#EF4444', // 0-2 (vermelho)
  '#F97316', // 2-4 (laranja)
  '#F59E0B', // 4-6 (amarelo)
  '#84CC16', // 6-8 (verde claro)
  '#22C55E', // 8-10 (verde)
];

export function GraficoDistribuicao({ distribuicao, titulo = 'Distribuição de Notas' }: Props) {
  const total = distribuicao.reduce((acc, item) => acc + item.quantidade, 0);

  const dados = distribuicao.map((item, index) => ({
    ...item,
    percentual: total > 0 ? ((item.quantidade / total) * 100).toFixed(1) : '0',
    cor: CORES_FAIXAS[index] || '#6B7280'
  }));

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">Sem dados de notas</p>
      </div>
    );
  }

  const renderLabel = ({ faixa, percentual }: { faixa: string; percentual: string }) => {
    if (parseFloat(percentual) < 5) return '';
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
              nameKey="faixa"
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
    </div>
  );
}
