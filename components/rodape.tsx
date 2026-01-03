'use client'

import { useEffect, useState } from 'react'
import { getPersonalizacaoRodape } from '@/lib/personalizacao'

export default function Rodape() {
  const [rodape, setRodape] = useState(getPersonalizacaoRodape())

  useEffect(() => {
    const carregarPersonalizacao = async () => {
      try {
        const response = await fetch('/api/admin/personalizacao')
        const data = await response.json()
        if (data) {
          setRodape({
            texto: data.rodape_texto || '© 2026 SISAM - Todos os direitos reservados',
            link: data.rodape_link || null,
            link_texto: data.rodape_link_texto || null,
            ativo: data.rodape_ativo !== undefined ? data.rodape_ativo : true,
          })
        }
      } catch (error) {
        console.error('Erro ao carregar personalização:', error)
        // Manter valores padrão em caso de erro
      }
    }
    carregarPersonalizacao()
  }, [])

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

