'use client'

import { MapPin } from 'lucide-react'
import { PoloSimples } from '@/lib/dados/types'

interface SeletorPolosProps {
  polos: PoloSimples[]
  polosSelecionados: string[]
  togglePolo: (poloId: string) => void
}

export function SeletorPolos({ polos, polosSelecionados, togglePolo }: SeletorPolosProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Selecionar 2 Polos para Comparar ({polosSelecionados.length}/2 selecionados)
      </label>
      <div className="max-h-64 overflow-y-auto border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-br from-gray-50 to-white shadow-inner">
        {polos.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum polo disponível</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {polos.map((polo) => {
              const selecionado = polosSelecionados.includes(polo.id)
              const desabilitado = !selecionado && polosSelecionados.length >= 2
              return (
                <label
                  key={polo.id}
                  className={`
                    flex items-center space-x-3 cursor-pointer
                    p-3 rounded-lg border-2 transition-all duration-200
                    ${selecionado
                      ? 'bg-indigo-50 border-indigo-500 shadow-md'
                      : desabilitado
                      ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                      : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30/50 hover:shadow-sm'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selecionado}
                    onChange={() => !desabilitado && togglePolo(polo.id)}
                    disabled={desabilitado}
                    className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span className={`text-sm font-medium flex-1 ${selecionado ? 'text-indigo-900' : desabilitado ? 'text-gray-400' : 'text-gray-700'}`}>
                    {polo.nome}
                  </span>
                  {selecionado && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {polosSelecionados.indexOf(polo.id) + 1}º
                      </span>
                    </div>
                  )}
                  {desabilitado && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">(máx. 2)</span>
                  )}
                </label>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
