'use client'

import { Clock, UserX } from 'lucide-react'
import { AlunoEmbedding, RegistroPresenca } from '../types'

interface RegistrosSidebarProps {
  registros: RegistroPresenca[]
  alunos: AlunoEmbedding[]
}

export function RegistrosSidebar({ registros, alunos }: RegistrosSidebarProps) {
  const idsPresentes = new Set(registros.map(r => r.aluno_id))
  const alunosAusentes = alunos.filter(a => !idsPresentes.has(a.aluno_id))

  return (
    <div className="w-full lg:w-80 bg-gray-900 border-t lg:border-t-0 lg:border-l border-gray-800 flex flex-col max-h-[30vh] lg:max-h-full">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Registros de Hoje
        </span>
        <span className="text-xs text-gray-500">{registros.length}</span>
      </div>

      {/* Aviso frequência por aula */}
      <div className="px-4 py-2 border-b border-gray-800 bg-purple-900/20">
        <p className="text-[11px] text-purple-400">
          <strong>6º-9º Ano:</strong> Este terminal registra a entrada na escola.
          A frequência por aula é gerenciada no{' '}
          <a href="/admin/painel-turma" className="underline hover:text-purple-300">Painel da Turma</a>.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {registros.length === 0 ? (
          <div className="p-6 text-center text-gray-600 text-sm">
            Nenhum registro ainda
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {registros.map((reg, i) => (
              <div key={`${reg.aluno_id}-${i}`} className="px-4 py-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  reg.tipo === 'entrada' ? 'bg-green-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{reg.nome}</p>
                  <p className="text-xs text-gray-500">
                    {reg.tipo === 'entrada' ? 'Entrada' : 'Saída'} — {reg.hora} — {Math.round(reg.confianca * 100)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista de ausentes */}
      <div className="border-t border-gray-800">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <UserX className="w-4 h-4" /> Ainda não chegaram
          </span>
          <span className="text-xs text-gray-500">{alunosAusentes.length}</span>
        </div>
        <div className="max-h-[20vh] overflow-y-auto">
          {alunosAusentes.length === 0 ? (
            <div className="p-4 text-center text-gray-600 text-sm">
              Todos presentes!
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {alunosAusentes.map(aluno => (
                <div key={aluno.aluno_id} className="px-4 py-2 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0 bg-red-500" />
                  <p className="text-sm text-gray-400 truncate">{aluno.nome}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
