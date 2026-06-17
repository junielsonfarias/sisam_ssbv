import {
  User, CalendarCheck, MapPin, Shield, Heart, Home, Phone, Users
} from 'lucide-react'
import { Campo, Secao } from './shared'
import type { AbaEditavelProps } from './types'

export function AbaDadosPessoais({ aluno, form, editando, updateForm }: AbaEditavelProps) {
  const generoOpcoes = [
    { value: 'masculino', label: 'Masculino' }, { value: 'feminino', label: 'Feminino' },
    { value: 'outro', label: 'Outro' }, { value: 'nao_informado', label: 'Não informado' },
  ]
  const racaOpcoes = [
    { value: 'branca', label: 'Branca' }, { value: 'preta', label: 'Preta' },
    { value: 'parda', label: 'Parda' }, { value: 'amarela', label: 'Amarela' },
    { value: 'indigena', label: 'Indígena' }, { value: 'nao_declarada', label: 'Não declarada' },
  ]

  return (
    <div className="space-y-6">
      <Secao titulo="Identificação" icon={User}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
          <Campo label="Nome Completo" valor={aluno.nome} campo="nome" editando={editando} form={form} updateForm={updateForm} icon={User} />
          <Campo label="Data de Nascimento" valor={aluno.data_nascimento?.split('T')[0]} campo="data_nascimento" tipo="date" editando={editando} form={form} updateForm={updateForm} icon={CalendarCheck} />
          <Campo label="Gênero" valor={generoOpcoes.find(o => o.value === aluno.genero)?.label} campo="genero" editando={editando} form={form} updateForm={updateForm} opcoes={generoOpcoes} />
          <Campo label="Raça/Cor" valor={racaOpcoes.find(o => o.value === aluno.raca_cor)?.label} campo="raca_cor" editando={editando} form={form} updateForm={updateForm} opcoes={racaOpcoes} />
          <Campo label="Naturalidade" valor={aluno.naturalidade} campo="naturalidade" editando={editando} form={form} updateForm={updateForm} icon={MapPin} />
          <Campo label="Nacionalidade" valor={aluno.nacionalidade} campo="nacionalidade" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="CPF" valor={aluno.cpf} campo="cpf" editando={editando} form={form} updateForm={updateForm} icon={Shield} />
          <Campo label="RG" valor={aluno.rg} campo="rg" editando={editando} form={form} updateForm={updateForm} icon={Shield} />
          <Campo label="Certidão de Nascimento" valor={aluno.certidao_nascimento} campo="certidao_nascimento" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Cartão SUS" valor={aluno.sus} campo="sus" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="NIS" valor={aluno.nis} campo="nis" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="PCD" valor={aluno.pcd} campo="pcd" tipo="boolean" editando={editando} form={form} updateForm={updateForm} />
        </div>
      </Secao>

      <Secao titulo="Família e Responsável" icon={Users} cor="purple">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
          <Campo label="Nome da Mãe" valor={aluno.nome_mae} campo="nome_mae" editando={editando} form={form} updateForm={updateForm} icon={Heart} />
          <Campo label="Nome do Pai" valor={aluno.nome_pai} campo="nome_pai" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Responsável" valor={aluno.responsavel} campo="responsavel" editando={editando} form={form} updateForm={updateForm} icon={Users} />
          <Campo label="Telefone" valor={aluno.telefone_responsavel} campo="telefone_responsavel" editando={editando} form={form} updateForm={updateForm} icon={Phone} />
        </div>
      </Secao>

      <Secao titulo="Endereço" icon={Home} cor="blue">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
          <div className="sm:col-span-2">
            <Campo label="Endereço" valor={aluno.endereco} campo="endereco" editando={editando} form={form} updateForm={updateForm} icon={MapPin} />
          </div>
          <Campo label="Bairro" valor={aluno.bairro} campo="bairro" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Cidade" valor={aluno.cidade} campo="cidade" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="CEP" valor={aluno.cep} campo="cep" editando={editando} form={form} updateForm={updateForm} />
        </div>
      </Secao>

      <Secao titulo="Programas Sociais e Saúde" icon={Heart} cor="red">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
          <Campo label="Bolsa Família" valor={aluno.bolsa_familia} campo="bolsa_familia" tipo="boolean" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Projeto Contraturno" valor={aluno.projeto_contraturno} campo="projeto_contraturno" tipo="boolean" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Nome do Projeto" valor={aluno.projeto_nome} campo="projeto_nome" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Tipo de Deficiência" valor={aluno.tipo_deficiencia} campo="tipo_deficiencia" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Alergias" valor={aluno.alergia} campo="alergia" tipo="textarea" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Medicação" valor={aluno.medicacao} campo="medicacao" tipo="textarea" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Observações" valor={aluno.observacoes} campo="observacoes" tipo="textarea" editando={editando} form={form} updateForm={updateForm} />
        </div>
      </Secao>
    </div>
  )
}
