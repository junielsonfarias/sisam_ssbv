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
  ReferenceLine
} from 'recharts';
import { AnaliseQuestao } from '@/lib/relatorios/tipos';

interface Props {
  questoes: AnaliseQuestao[];
  titulo?: string;
  disciplinaFiltro?: string;
}

const CORES_DIFICULDADE = {
  facil: '#22C55E',
  media: '#F59E0B',
  dificil: '#EF4444'
};

export function GraficoQuestoes({ questoes, titulo = 'Taxa de Acerto por Questão', disciplinaFiltro }: Props) {
  // Filtrar por disciplina se especificado e limitar a 20 questões
  let dadosFiltrados = disciplinaFiltro
    ? questoes.filter(q => q.disciplina === disciplinaFiltro)
    : questoes;

  dadosFiltrados = dadosFiltrados.slice(0, 20);

  const dados = dadosFiltrados.map(q => ({
    numero: `Q${q.numero}`,
    percentual: q.percentual_acerto,
    dificuldade: q.dificuldade_calculada,
    disciplina: q.disciplina,
    cor: CORES_DIFICULDADE[q.dificuldade_calculada]
  }));

  if (dados.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">Sem dados de questões</p>
      </div>
    );
  }

  return (
    <div className="grafico-container">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 print:text-black">
        {titulo}
        {disciplinaFiltro && <span className="text-sm font-normal text-gray-500 ml-2">({disciplinaFiltro})</span>}
      </h3>
      <div className="h-64 print:h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dados}
            margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="numero"
              tick={{ fill: '#6B7280', fontSize: 10 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis
              domain={[0, 100]}
              tickCount={6}
              tick={{ fill: '#6B7280', fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'Taxa de Acerto']}
              labelFormatter={(label) => `Questão ${label}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px'
              }}
            />
            <ReferenceLine
              y={70}
              stroke="#22C55E"
              strokeDasharray="5 5"
              label={{ value: 'Meta 70%', position: 'right', fill: '#22C55E', fontSize: 10 }}
            />
            <ReferenceLine
              y={40}
              stroke="#F59E0B"
              strokeDasharray="5 5"
              label={{ value: 'Atenção 40%', position: 'right', fill: '#F59E0B', fontSize: 10 }}
            />
            <Bar dataKey="percentual" radius={[4, 4, 0, 0]} maxBarSize={30}>
              {dados.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.cor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda */}
      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Fácil (&ge;70%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Média (40-70%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Difícil (&lt;40%)</span>
        </div>
      </div>
    </div>
  );
}
