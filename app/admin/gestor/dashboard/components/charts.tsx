'use client'

import dynamic from 'next/dynamic'

export const PieChartComponent = dynamic(() => import('recharts').then(mod => {
  const { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } = mod
  return function PieChartWrapper({ data, colors }: { data: { name: string; value: number }[]; colors: string[] }) {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''} labelLine={false} fontSize={11}>
            {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          <Tooltip formatter={(value: number) => [value, 'Alunos']} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
        </PieChart>
      </ResponsiveContainer>
    )
  }
}), { ssr: false, loading: () => <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Carregando...</div> })

export const BarChartComponent = dynamic(() => import('recharts').then(mod => {
  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } = mod
  return function BarChartWrapper({ data, dataKey, nameKey, media }: {
    data: any[]; dataKey: string; nameKey: string; media?: number
  }) {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
          <Tooltip />
          <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={media !== undefined ? (entry[dataKey] >= media ? '#10b981' : '#ef4444') : '#6366f1'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }
}), { ssr: false, loading: () => <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Carregando...</div> })

export const AreaChartComponent = dynamic(() => import('recharts').then(mod => {
  const { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = mod
  return function AreaChartWrapper({ data }: { data: { name: string; valor: number }[] }) {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Area type="monotone" dataKey="valor" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    )
  }
}), { ssr: false, loading: () => <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Carregando...</div> })
