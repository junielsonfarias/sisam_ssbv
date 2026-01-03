export type TipoUsuario = 'administrador' | 'admin' | 'tecnico' | 'polo' | 'escola';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo_usuario: TipoUsuario;
  polo_id?: string | null;
  escola_id?: string | null;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

export interface Polo {
  id: string;
  nome: string;
  codigo?: string | null;
  descricao?: string | null;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

export interface Escola {
  id: string;
  nome: string;
  codigo?: string | null;
  polo_id: string;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

export interface Questao {
  id: string;
  codigo?: string | null;
  descricao?: string | null;
  disciplina?: string | null;
  area_conhecimento?: string | null;
  dificuldade?: string | null;
  gabarito?: string | null;
  serie_aplicavel?: string | null;
  tipo_questao?: 'objetiva' | 'discursiva';
  numero_questao?: number | null;
  criado_em: Date;
}

export interface ResultadoProva {
  id: string;
  escola_id: string;
  aluno_id?: string | null;
  aluno_codigo?: string | null;
  aluno_nome?: string | null;
  turma_id?: string | null;
  questao_id?: string | null;
  questao_codigo?: string | null;
  resposta_aluno?: string | null;
  acertou?: boolean | null;
  nota?: number | null;
  data_prova?: Date | null;
  ano_letivo?: string | null;
  serie?: string | null;
  turma?: string | null;
  disciplina?: string | null;
  area_conhecimento?: string | null;
  presenca?: string | null;
  criado_em: Date;
  atualizado_em: Date;
}

export interface ResultadoConsolidado {
  id: string;
  aluno_id: string;
  escola_id: string;
  turma_id?: string | null;
  ano_letivo: string;
  serie?: string | null;
  presenca?: string | null;
  total_acertos_lp: number;
  total_acertos_ch: number;
  total_acertos_mat: number;
  total_acertos_cn: number;
  nota_lp?: number | null;
  nota_ch?: number | null;
  nota_mat?: number | null;
  nota_cn?: number | null;
  media_aluno?: number | null;
  // Novos campos para produção textual e nível de aprendizagem
  nota_producao?: number | null;
  nivel_aprendizagem?: string | null;
  nivel_aprendizagem_id?: string | null;
  total_questoes_respondidas?: number | null;
  total_questoes_esperadas?: number | null;
  tipo_avaliacao?: string | null;
  // Notas individuais dos itens de produção
  item_producao_1?: number | null;
  item_producao_2?: number | null;
  item_producao_3?: number | null;
  item_producao_4?: number | null;
  item_producao_5?: number | null;
  item_producao_6?: number | null;
  item_producao_7?: number | null;
  item_producao_8?: number | null;
  criado_em: Date;
  atualizado_em: Date;
}

export interface Importacao {
  id: string;
  usuario_id: string;
  nome_arquivo: string;
  total_linhas?: number | null;
  linhas_processadas: number;
  linhas_com_erro: number;
  status: 'processando' | 'concluido' | 'erro';
  erros?: string | null;
  criado_em: Date;
  concluido_em?: Date | null;
}

export interface FiltrosAnalise {
  escola_id?: string;
  polo_id?: string;
  ano_letivo?: string;
  serie?: string;
  disciplina?: string;
  area_conhecimento?: string;
  data_inicio?: string;
  data_fim?: string;
  taxa_acertos_min?: number;
  taxa_acertos_max?: number;
}

// ========================================
// NOVOS TIPOS: Estrutura de Séries
// ========================================

export interface ConfiguracaoSerie {
  id: string;
  serie: string;
  nome_serie: string;
  qtd_questoes_lp: number;
  qtd_questoes_mat: number;
  qtd_questoes_ch: number;
  qtd_questoes_cn: number;
  total_questoes_objetivas: number;
  tem_producao_textual: boolean;
  qtd_itens_producao: number;
  avalia_lp: boolean;
  avalia_mat: boolean;
  avalia_ch: boolean;
  avalia_cn: boolean;
  peso_lp: number;
  peso_mat: number;
  peso_ch: number;
  peso_cn: number;
  peso_producao: number;
  usa_nivel_aprendizagem: boolean;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

export interface ItemProducao {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string | null;
  ordem: number;
  nota_maxima: number;
  serie_aplicavel?: string | null;
  ativo: boolean;
  criado_em: Date;
}

export interface ResultadoProducao {
  id: string;
  aluno_id: string;
  escola_id: string;
  turma_id?: string | null;
  item_producao_id: string;
  ano_letivo: string;
  serie?: string | null;
  data_avaliacao?: Date | null;
  nota?: number | null;
  observacao?: string | null;
  criado_em: Date;
  atualizado_em: Date;
}

export interface NivelAprendizagem {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string | null;
  cor?: string | null;
  nota_minima: number;
  nota_maxima: number;
  ordem: number;
  serie_aplicavel?: string | null;
  ativo: boolean;
  criado_em: Date;
}

// Tipo para estatísticas por série (view)
export interface EstatisticasSerie {
  serie: string;
  nome_serie: string;
  total_questoes_objetivas: number;
  tem_producao_textual: boolean;
  total_alunos: number;
  total_escolas: number;
  media_lp?: number | null;
  media_mat?: number | null;
  media_ch?: number | null;
  media_cn?: number | null;
  media_producao?: number | null;
  media_geral?: number | null;
  qtd_insuficiente: number;
  qtd_basico: number;
  qtd_adequado: number;
  qtd_avancado: number;
}

// Tipo para resultado consolidado com dados da série
export interface ResultadoConsolidadoCompleto extends ResultadoConsolidado {
  aluno_codigo?: string | null;
  aluno_nome?: string | null;
  escola_nome?: string | null;
  turma_nome?: string | null;
  nome_serie?: string | null;
  nivel_nome?: string | null;
  nivel_cor?: string | null;
  qtd_questoes_esperadas?: number | null;
  avalia_ch?: boolean;
  avalia_cn?: boolean;
}

