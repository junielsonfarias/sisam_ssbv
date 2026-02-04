'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';
import { DesempenhoDisciplina } from '@/lib/relatorios/tipos';

interface Props {
  disciplinas: DesempenhoDisciplina[];
  titulo?: string;
}

const CORES_DISCIPLINAS: Record<string, string> = {
  'LP': '#3B82F6',
  'MAT': '#10B981',
  'CH': '#F59E0B',
  'CN': '#8B5CF6'
};

export function GraficoDisciplinas({ disciplinas, titulo = 'Desempenho por Disciplina' }: Props) {
  const dados = disciplinas.map(d => ({
    nome: d.disciplina_nome,
    sigla: d.disciplina,
    media: d.media,
    cor: CORES_DISCIPLINAS[d.disciplina] || '#6B7280'
  }));

  if (dados.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">Sem dados de disciplinas</p>
      </div>
    );
  }

  return (
    <div className="grafico-container">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 print:text-black">
        {titulo}
      </h3>
      <div className="h-64 print:h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dados}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              type="number"
              domain={[0, 10]}
              tickCount={6}
              tick={{ fill: '#6B7280', fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="nome"
              tick={{ fill: '#374151', fontSize: 12 }}
              width={95}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(2)}`, 'Média']}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="media" radius={[0, 4, 4, 0]} maxBarSize={40}>
              {dados.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.cor} />
              ))}
              <LabelList
                dataKey="media"
                position="right"
                formatter={(value: number) => value.toFixed(1)}
                fill="#374151"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
