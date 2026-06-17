'use client'

import { Search } from 'lucide-react'
import { TabelaPaginada } from '@/components/dados'
import type { ColunaTabela } from '@/lib/dados/types'
import { calcularNivelPorMedia } from '@/lib/dados/utils'
import type { AbaTurmasProps } from './types'

export default function AbaTurmas({
  pesquisaRealizada,
  dados,
  turmasPaginadas,
  turmasOrdenadas,
  filtroSerie,
  filtroTipoEnsino,
  filtroDisciplina,
  ordenacao,
  handleOrdenacao,
  paginaAtual,
  setPaginaAtual,
  itensPorPagina,
}: AbaTurmasProps) {
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

  if (!dados.mediasPorTurma) return null

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
      { key: 'turma', label: 'Turma', align: 'left' },
      { key: 'escola', label: 'Escola', align: 'left' },
      { key: 'serie', label: 'Serie', align: 'center', format: 'serie' },
      { key: 'total_alunos', label: 'Alunos', align: 'center' },
      { key: 'media_geral', label: 'Media', align: 'center', format: 'nota', destaque: !filtroDisciplina },
      { key: 'media_lp', label: 'LP', align: 'center', format: 'decimal_com_nivel', destaque: filtroDisciplina === 'LP' },
      { key: 'media_mat', label: 'MAT', align: 'center', format: 'decimal_com_nivel', destaque: filtroDisciplina === 'MAT' },
    ]

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
        dados={turmasPaginadas.map((turma, index) => ({
          ...turma,
          posicao: (paginaAtual - 1) * itensPorPagina + index + 1,
          nivel_turma: calcularNivelPorMedia(turma.media_geral).codigo
        }))}
        colunas={colunas}
        ordenacao={ordenacao}
        onOrdenar={handleOrdenacao}
        paginaAtual={paginaAtual}
        totalPaginas={Math.ceil(turmasOrdenadas.length / itensPorPagina)}
        onPaginar={setPaginaAtual}
        totalRegistros={turmasOrdenadas.length}
        itensPorPagina={itensPorPagina}
        stickyHeader={true}
      />
    </div>
  )
}
