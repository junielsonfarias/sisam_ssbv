'use client'

import {
  FileText, Phone, MapPin, Heart, User, History, School, ArrowRightLeft,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { CardCampos, EmptyState } from './shared'
import { corSit, labelSit, fmtData, fmtGenero, simNao } from './helpers'

interface AbaMatriculaProps {
  carregandoHist: boolean
  dadosAluno: any
  matriculaInfo: any
  historico: any[]
}

export function AbaMatricula({ carregandoHist, dadosAluno, matriculaInfo, historico }: AbaMatriculaProps) {
  if (carregandoHist) {
    return <div className="py-10"><LoadingSpinner centered /></div>
  }
  return (
    <>
      {dadosAluno && (
        <>
          <div className="bg-violet-50 dark:bg-violet-900/15 rounded-2xl border border-violet-100 dark:border-violet-800 p-3.5 flex items-start gap-2.5">
            <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
            <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
              Dados cadastrais do(a) aluno(a) — <strong>somente leitura</strong>. Para corrigir alguma informação, procure a secretaria da escola.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">
            <div className="lg:col-span-2">
              <CardCampos titulo="Identificação" Icon={User} cols={3} campos={[
                ['Nome', dadosAluno.nome],
                ['Matrícula nº', dadosAluno.codigo],
                ['CPF', dadosAluno.cpf],
                ['RG', dadosAluno.rg],
                ['Nascimento', fmtData(dadosAluno.data_nascimento)],
                ['Gênero', fmtGenero(dadosAluno.genero)],
                ['Raça/cor', dadosAluno.raca_cor],
                ['Naturalidade', dadosAluno.naturalidade],
                ['Nacionalidade', dadosAluno.nacionalidade],
                ['Nº SUS', dadosAluno.sus],
                ['Código INEP', dadosAluno.codigo_inep_aluno],
              ]} />
            </div>

            <CardCampos titulo="Filiação e contato" Icon={Phone} cols={2} campos={[
              ['Nome da mãe', dadosAluno.nome_mae],
              ['Nome do pai', dadosAluno.nome_pai],
              ['Responsável', dadosAluno.responsavel],
              ['Telefone', dadosAluno.telefone_responsavel],
            ]} />

            <CardCampos titulo="Endereço e transporte" Icon={MapPin} cols={2} campos={[
              ['Endereço', dadosAluno.endereco],
              ['Bairro', dadosAluno.bairro],
              ['Cidade', dadosAluno.cidade],
              ['CEP', dadosAluno.cep],
              ['Zona', dadosAluno.zona_residencia],
              ['Transporte escolar', simNao(dadosAluno.utiliza_transporte_publico)],
              ['Tipo de transporte', dadosAluno.tipo_transporte],
            ]} />

            <CardCampos titulo="Saúde" Icon={Heart} cols={2} campos={[
              ['PCD', simNao(dadosAluno.pcd)],
              ['Tipo de deficiência', dadosAluno.tipo_deficiencia],
              ['Alergia', dadosAluno.alergia],
              ['Medicação', dadosAluno.medicacao],
            ]} />
          </div>

          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1 pt-1">Matrícula</p>
        </>
      )}
      {matriculaInfo && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 dark:border-slate-700/60 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <School className="w-4 h-4 text-violet-600 dark:text-violet-400" /> Matrícula atual
            </p>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${corSit(matriculaInfo.situacao)}`}>{labelSit(matriculaInfo.situacao)}</span>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 p-4 text-sm">
            {[
              ['Ano letivo', matriculaInfo.ano_letivo],
              ['Escola', matriculaInfo.escola_nome],
              ['Turma', matriculaInfo.turma_codigo ? `${matriculaInfo.turma_codigo}${matriculaInfo.turma_nome ? ` · ${matriculaInfo.turma_nome}` : ''}` : '—'],
              ['Série', matriculaInfo.serie],
              ['Matrícula nº', matriculaInfo.codigo || '—'],
              ['Data de matrícula', fmtData(matriculaInfo.data_matricula)],
            ].map(([k, v]) => (
              <div key={k as string} className="min-w-0">
                <dt className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 truncate">{k}</dt>
                <dd className="font-medium text-gray-800 dark:text-gray-100 break-words leading-snug">{(v as string) || '—'}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1 pt-1">Linha do tempo</p>
      {historico.length === 0 ? (
        <EmptyState Icon={History} texto="Nenhuma movimentação registrada." />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4">
          {historico.map((h, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="w-3.5 h-3.5 rounded-full bg-violet-500 ring-4 ring-violet-100 dark:ring-violet-900/40 mt-1 shrink-0" />
                {i < historico.length - 1 && <span className="w-0.5 flex-1 bg-gray-100 dark:bg-slate-700 my-1" />}
              </div>
              <div className="flex-1 pb-4 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${corSit(h.situacao)}`}>{labelSit(h.situacao)}</span>
                  <span className="text-xs text-gray-400">{fmtData(h.data)}</span>
                </div>
                {(h.escola_origem_nome || h.escola_destino_nome) && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3 h-3 shrink-0" />
                    <span className="truncate">{h.escola_origem_nome || '—'} → {h.escola_destino_nome || '—'}</span>
                  </p>
                )}
                {h.observacao && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{h.observacao}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
