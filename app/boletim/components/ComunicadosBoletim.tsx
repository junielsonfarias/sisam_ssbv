'use client'

import { MessageSquare, Megaphone, User, Building2 } from 'lucide-react'

interface Comunicado {
  id: string
  titulo: string
  mensagem: string
  tipo: string
  data_publicacao: string
  professor_nome?: string
  orgao?: string
  origem: 'turma' | 'semed'
}

interface ComunicadosBoletimProps {
  comunicadosTurma: Comunicado[]
  publicacoesGerais: Comunicado[]
  carregando: boolean
}

/** Badge de tipo do comunicado */
function tipoBadge(tipo: string) {
  const cores: Record<string, string> = {
    aviso: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    comunicado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    portaria: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    lembrete: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  }
  const cls = cores[tipo] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${cls}`}>
      {tipo}
    </span>
  )
}

/** Formata data para exibição */
function formatarData(dataStr: string): string {
  try {
    return new Date(dataStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

/** Card de comunicado individual */
function CardComunicado({ comunicado }: { comunicado: Comunicado }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {comunicado.origem === 'turma' ? (
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          ) : (
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          )}
          <h4 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base truncate">
            {comunicado.titulo}
          </h4>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {tipoBadge(comunicado.tipo)}
          <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
            {formatarData(comunicado.data_publicacao)}
          </span>
        </div>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
        {comunicado.mensagem || ''}
      </p>
      <div className="flex items-center gap-2 mt-3">
        {comunicado.professor_nome && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Prof. {comunicado.professor_nome}
          </span>
        )}
        {comunicado.orgao && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {comunicado.orgao}
          </span>
        )}
        <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium ${
          comunicado.origem === 'turma'
            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
            : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
        }`}>
          {comunicado.origem === 'turma' ? 'Turma' : 'SEMED'}
        </span>
      </div>
    </div>
  )
}

export default function ComunicadosBoletim({
  comunicadosTurma,
  publicacoesGerais,
  carregando,
}: ComunicadosBoletimProps) {
  if (carregando) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  const temComunicados = comunicadosTurma.length > 0 || publicacoesGerais.length > 0

  if (!temComunicados) {
    return (
      <div className="text-center py-12 text-slate-400 dark:text-slate-500">
        <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>Nenhum comunicado no momento</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Comunicados da turma */}
      {comunicadosTurma.length > 0 && (
        <div>
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Comunicados da Turma
          </h3>
          <div className="space-y-3">
            {comunicadosTurma.map((c) => (
              <CardComunicado key={c.id} comunicado={c} />
            ))}
          </div>
        </div>
      )}

      {/* Publicações gerais da SEMED */}
      {publicacoesGerais.length > 0 && (
        <div>
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <Megaphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Avisos da Secretaria de Educação
          </h3>
          <div className="space-y-3">
            {publicacoesGerais.map((p) => (
              <CardComunicado key={p.id} comunicado={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
