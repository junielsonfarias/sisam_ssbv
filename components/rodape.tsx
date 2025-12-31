'use client'

import { useEffect, useState } from 'react'

interface RodapeData {
  rodape_texto: string | null
  rodape_link: string | null
  rodape_link_texto: string | null
  rodape_ativo: boolean
}

export default function Rodape() {
  const [rodape, setRodape] = useState<RodapeData | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const carregarRodape = async () => {
      try {
        const response = await fetch('/api/admin/personalizacao')
        const data = await response.json()
        if (data) {
          setRodape({
            rodape_texto: data.rodape_texto,
            rodape_link: data.rodape_link,
            rodape_link_texto: data.rodape_link_texto,
            rodape_ativo: data.rodape_ativo !== undefined ? data.rodape_ativo : true,
          })
        }
      } catch (error) {
        console.error('Erro ao carregar rodapé:', error)
        // Valores padrão em caso de erro
        setRodape({
          rodape_texto: '© 2026 SISAM - Todos os direitos reservados',
          rodape_link: null,
          rodape_link_texto: null,
          rodape_ativo: true,
        })
      } finally {
        setCarregando(false)
      }
    }
    carregarRodape()
  }, [])

  if (carregando || !rodape || !rodape.rodape_ativo) {
    return null
  }

  return (
    <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center text-sm text-gray-600">
          {rodape.rodape_link && rodape.rodape_link_texto ? (
            <p>
              {rodape.rodape_texto}{' '}
              <a
                href={rodape.rodape_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 underline"
              >
                {rodape.rodape_link_texto}
              </a>
            </p>
          ) : (
            <p>{rodape.rodape_texto}</p>
          )}
        </div>
      </div>
    </footer>
  )
}

