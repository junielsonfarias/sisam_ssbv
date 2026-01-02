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

