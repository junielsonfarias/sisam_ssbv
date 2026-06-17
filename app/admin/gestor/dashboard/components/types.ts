export interface EscolaSimples { id: string; nome: string }

export interface AlunoPcd {
  id: string; nome: string; serie: string; turma_codigo: string; turma_nome: string
  escola_nome: string; data_nascimento: string; tipo_deficiencia: string | null
  responsavel: string; telefone_responsavel: string
}

export interface AlunoSituacao {
  id: string; nome: string; serie: string; situacao: string
  turma_codigo: string; escola_nome: string
}

export interface TurmaDetalhe {
  id: string; codigo: string; nome: string; serie: string
  capacidade_maxima: number; escola_nome: string; total_alunos: number
}

export interface DashboardData {
  alunos: {
    total: number; cursando: number; transferidos: number; abandono: number
    aprovados: number; reprovados: number; pcd: number
  }
  turmas: { total: number; series: number }
  notas: {
    total_alunos_com_nota: number; total_lancamentos: number
    media_geral: number; abaixo_media: number; acima_media: number
    em_recuperacao: number
    por_disciplina: { disciplina: string; abreviacao: string | null; media: number; total: number; abaixo: number }[]
  }
  frequencia: {
    total_com_frequencia: number; media_frequencia: number
    abaixo_75: number; entre_75_90: number; acima_90: number; total_faltas: number
  }
  transferencias: {
    saidas: number; entradas: number; dentro_municipio: number; fora_municipio: number
  }
  conselho: {
    total_conselhos: number; turmas_com_conselho: number; total_pareceres: number
    aprovados: number; reprovados: number; recuperacao: number; progressao: number
  }
  distribuicao_serie: { serie: string; total: number }[]
  alunos_pcd: AlunoPcd[]
  alunos_situacao: AlunoSituacao[]
  turmas_detalhe: TurmaDetalhe[]
}

export type ModalType = 'alunos' | 'turmas' | 'media' | 'frequencia' | 'transferencias' | 'pcd' | null
