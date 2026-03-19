'use client'

import { Search } from 'lucide-react'
import { TabelaPaginada } from '@/components/dados'
import type { ColunaTabela } from '@/lib/dados/types'
import type { AbaEscolasProps } from './types'

export default function AbaEscolas({
  pesquisaRealizada,
  escolasPaginadas,
  escolasOrdenadas,
  filtroSerie,
  filtroTipoEnsino,
  filtroDisciplina,
  ordenacao,
  handleOrdenacao,
  paginaAtual,
  totalPaginas,
  setPaginaAtual,
  itensPorPagina,
}: AbaEscolasProps) {
  if (!pesquisaRealizada) {
    return (
      <div className="mt-4">
        <div className="text-center py-12">
          <Search className="w-12 h-12 mx-auto text-indigo-300 mb-3" />
          <p className="text-base font-medium text-gray-600 dark:text-gray-300">Selecione os filtros desejados</p>
          <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Use os filtros acima e clique em <strong>Pesquisar</strong> para carregar os dados</p>
        </div>
      </div>
    )
  }

  const colunas = (() => {
    // Determinar se e anos iniciais ou finais baseado no filtro de serie OU etapa de ensino
    const numSerie = filtroSerie?.replace(/[^0-9]/g, '') || ''
    const isAnosIniciaisSerie = ['2', '3', '5'].includes(numSerie)
    const isAnosFinaisSerie = ['6', '7', '8', '9'].includes(numSerie)

    // Considerar filtro de etapa de ensino
    const isAnosIniciais = filtroTipoEnsino === 'anos_iniciais' || isAnosIniciaisSerie
    const isAnosFinais = filtroTipoEnsino === 'anos_finais' || isAnosFinaisSerie

    // Tem filtro se tiver serie OU etapa de ensino selecionada
    const temFiltro = (!!filtroSerie && filtroSerie.trim() !== '') || !!filtroTipoEnsino

    const cols: ColunaTabela[] = [
      { key: 'posicao', label: 'N', align: 'center', format: 'posicao' },
      { key: 'escola', label: 'Escola', align: 'left' },
      { key: 'polo', label: 'Polo', align: 'left' },
      { key: 'total_turmas', label: 'Turmas', align: 'center', format: 'badge_turmas' },
      { key: 'total_alunos', label: 'Alunos', align: 'center' },
      { key: 'media_geral', label: 'Media', align: 'center', format: 'nota', destaque: !filtroDisciplina },
    ]

    // Media AI: mostrar quando sem filtro OU quando e anos iniciais
    if (!temFiltro || isAnosIniciais) {
      cols.push({ key: 'media_ai', label: 'Media AI', align: 'center', format: 'media_etapa' })
    }

    // Media AF: mostrar quando sem filtro OU quando e anos finais
    if (!temFiltro || isAnosFinais) {
      cols.push({ key: 'media_af', label: 'Media AF', align: 'center', format: 'media_etapa' })
    }

    cols.push({ key: 'media_lp', label: 'LP', align: 'center', format: 'decimal_com_nivel', destaque: filtroDisciplina === 'LP' })
    cols.push({ key: 'media_mat', label: 'MAT', align: 'center', format: 'decimal_com_nivel', destaque: filtroDisciplina === 'MAT' })

    // PROD.T: mostrar apenas para anos iniciais ou quando sem filtro
    if (!temFiltro || isAnosIniciais) {
      cols.push({ key: 'media_prod', label: 'PROD.T', align: 'center', format: 'decimal_com_nivel', destaque: filtroDisciplina === 'PT' })
    }

    // CH/CN: mostrar apenas para anos finais ou quando sem filtro
    if (!temFiltro || isAnosFinais) {
      cols.push({ key: 'media_ch', label: 'CH', align: 'center', format: 'decimal_com_nivel', destaque: filtroDisciplina === 'CH' })
      cols.push({ key: 'media_cn', label: 'CN', align: 'center', format: 'decimal_com_nivel', destaque: filtroDisciplina === 'CN' })
    }

    cols.push({ key: 'presentes', label: 'Pres.', align: 'center' })
    cols.push({ key: 'faltantes', label: 'Falt.', align: 'center' })

    return cols
  })()

  return (
    <div className="mt-4">
      <TabelaPaginada
        dados={escolasPaginadas.map((escola, index) => ({
          ...escola,
          posicao: (paginaAtual - 1) * itensPorPagina + index + 1
        }))}
        colunas={colunas}
        ordenacao={ordenacao}
        onOrdenar={handleOrdenacao}
        paginaAtual={paginaAtual}
        totalPaginas={totalPaginas}
        onPaginar={setPaginaAtual}
        totalRegistros={escolasOrdenadas.length}
        itensPorPagina={itensPorPagina}
        stickyHeader={true}
      />
    </div>
  )
}
