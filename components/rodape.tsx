'use client'

import { getPersonalizacaoRodape } from '@/lib/personalizacao'

export default function Rodape() {
  const rodape = getPersonalizacaoRodape()
  const year = new Date().getFullYear()

  if (!rodape.ativo) {
    return null
  }

  return (
    <footer className="bg-slate-900 border-t border-slate-800 py-3 sm:py-4 mt-auto flex-shrink-0 transition-colors duration-300 print:hidden">
      <div className="px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-3 text-xs sm:text-sm text-slate-500">
          <p>
            &copy; {year} SEMED - São Sebastião da Boa Vista
          </p>
          <p>
            Desenvolvido por{' '}
            <a
              href="https://wa.me/5591991666956"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Junielson_Farias
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
