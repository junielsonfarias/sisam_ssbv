// Tipos compartilhados da gestão de alunos da escola.
// Extraídos de page.tsx sem mudança de lógica.

export interface Aluno {
  id: string
  codigo: string | null
  nome: string
  escola_id: string
  turma_id: string | null
  serie: string | null
  ano_letivo: string | null
  ativo: boolean
  situacao?: string | null
  cpf?: string | null
  data_nascimento?: string | null
  pcd?: boolean
  sexo?: string | null
  escola_nome?: string
  turma_codigo?: string
  turma_nome?: string
}

export interface FormAluno {
  nome: string
  cpf: string
  data_nascimento: string
  sexo: string
  pcd: boolean
  turma_id: string
  serie: string
  ano_letivo: string
}

export const formInicial: FormAluno = {
  nome: '', cpf: '', data_nascimento: '', sexo: '',
  pcd: false, turma_id: '', serie: '', ano_letivo: new Date().getFullYear().toString(),
}
