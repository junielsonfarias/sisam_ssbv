'use client'

import { getPersonalizacaoRodape } from '@/lib/personalizacao'

export default function Rodape() {
  const rodape = getPersonalizacaoRodape()

  if (!rodape.ativo) {
    return null
  }

  return (
    <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center text-sm text-gray-600">
          {rodape.link && rodape.link_texto ? (
            <p>
              {rodape.texto}{' '}
              <a
                href={rodape.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 underline"
              >
                {rodape.link_texto}
              </a>
            </p>
          ) : (
            <p>{rodape.texto}</p>
          )}
        </div>
      </div>
    </footer>
  )
}

