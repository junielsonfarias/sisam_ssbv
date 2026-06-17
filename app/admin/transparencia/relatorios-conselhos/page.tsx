'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import {
  FileText, Users, Printer, Building2, GraduationCap,
  CalendarCheck, BarChart3, ChevronRight
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

type Conselho = 'CACSFUNDEB' | 'CAE' | 'CME'

const conselhosInfo: Record<Conselho, { nome: string; desc: string; cor: string; icon: any }> = {
  CACSFUNDEB: {
    nome: 'CACS/FUNDEB',
    desc: 'Conselho de Acompanhamento e Controle Social do FUNDEB',
    cor: 'from-indigo-500 to-indigo-700',
    icon: Building2,
  },
  CAE: {
    nome: 'CAE',
    desc: 'Conselho de Alimentação Escolar',
    cor: 'from-emerald-500 to-emerald-700',
    icon: Users,
  },
  CME: {
    nome: 'CME',
    desc: 'Conselho Municipal de Educação',
    cor: 'from-purple-500 to-purple-700',
    icon: GraduationCap,
  },
}

function imprimirRelatorioConselho(conselho: Conselho, ano: string, dados: any) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const info = conselhosInfo[conselho]
  const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  let tabelaHtml = ''
  const escolas = dados.escolas || []

  if (conselho === 'CACSFUNDEB') {
    tabelaHtml = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align: left;">Escola</th>
            <th>Alunos</th>
            <th>Turmas</th>
            <th>Professores</th>
            <th>Freq. Média</th>
          </tr>
        </thead>
        <tbody>
          ${escolas.map((e: any) => `
            <tr>
              <td style="text-align: left;">${e.escola}</td>
              <td>${e.total_alunos}</td>
              <td>${e.total_turmas}</td>
              <td>${e.total_professores || 0}</td>
              <td>${e.frequencia_media ? e.frequencia_media + '%' : '-'}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td style="text-align: left; font-weight: bold;">TOTAL</td>
            <td style="font-weight: bold;">${dados.resumo?.total_alunos || 0}</td>
            <td style="font-weight: bold;">${dados.resumo?.total_turmas || 0}</td>
            <td style="font-weight: bold;">${dados.resumo?.total_professores || 0}</td>
            <td style="font-weight: bold;">${dados.resumo?.frequencia_geral ? dados.resumo.frequencia_geral + '%' : '-'}</td>
          </tr>
        </tbody>
      </table>
    `
  }

  if (conselho === 'CAE') {
    tabelaHtml = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align: left;">Escola</th>
            <th>Alunos</th>
            <th>Turmas</th>
            <th>Turnos</th>
          </tr>
        </thead>
        <tbody>
          ${escolas.filter((e: any) => parseInt(e.total_alunos) > 0).map((e: any) => `
            <tr>
              <td style="text-align: left;">${e.escola}</td>
              <td>${e.total_alunos}</td>
              <td>${e.total_turmas}</td>
              <td style="text-align: left; font-size: 10px;">${(e.turnos || []).map((t: any) => `${t.turno || 'N/I'}: ${t.total} turma(s)`).join(', ') || '-'}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td style="text-align: left; font-weight: bold;">TOTAL</td>
            <td style="font-weight: bold;">${dados.resumo?.total_alunos || 0}</td>
            <td style="font-weight: bold;">${dados.resumo?.total_turmas || 0}</td>
            <td>-</td>
          </tr>
        </tbody>
      </table>
    `
  }

  if (conselho === 'CME') {
    tabelaHtml = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align: left;">Escola</th>
            <th>Alunos</th>
            <th>Aprovados</th>
            <th>Reprovados</th>
            <th>Freq. Média</th>
            <th>Média SISAM</th>
          </tr>
        </thead>
        <tbody>
          ${escolas.filter((e: any) => parseInt(e.total_alunos) > 0).map((e: any) => `
            <tr>
              <td style="text-align: left;">${e.escola}</td>
              <td>${e.total_alunos}</td>
              <td>${e.situacoes?.aprovado || 0}</td>
              <td>${e.situacoes?.reprovado || 0}</td>
              <td>${e.frequencia_media ? e.frequencia_media + '%' : '-'}</td>
              <td>${e.media_sisam ? parseFloat(e.media_sisam).toFixed(2) : '-'}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td style="text-align: left; font-weight: bold;">TOTAL</td>
            <td style="font-weight: bold;">${dados.resumo?.total_alunos || 0}</td>
            <td style="font-weight: bold;">${dados.resumo?.total_aprovados || 0}</td>
            <td style="font-weight: bold;">${dados.resumo?.total_reprovados || 0}</td>
            <td>-</td>
            <td>-</td>
          </tr>
        </tbody>
      </table>
    `
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório ${info.nome} - ${ano}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; margin: 15mm 18mm; color: #222; font-size: 11px; line-height: 1.4; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 14px; }
        .header h2 { font-size: 14px; margin-bottom: 2px; text-transform: uppercase; }
        .header h1 { font-size: 16px; letter-spacing: 1px; margin-top: 6px; }
        .header p { font-size: 11px; color: #555; margin-top: 2px; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 12px 0; }
        .data-table th { background: #f0f0f0; padding: 5px 6px; border: 1px solid #ccc; text-align: center; font-size: 9px; text-transform: uppercase; font-weight: 700; }
        .data-table td { padding: 4px 6px; border: 1px solid #ddd; text-align: center; }
        .total-row td { background: #f5f5f5; border-top: 2px solid #999; }
        .assinaturas { margin-top: 40px; display: flex; justify-content: space-between; gap: 20px; }
        .assinatura { flex: 1; text-align: center; }
        .assinatura .linha { border-top: 1px solid #333; margin-top: 50px; padding-top: 4px; font-size: 10px; }
        .data-local { margin-top: 20px; font-size: 11px; text-align: right; }
        .footer-note { margin-top: 12px; font-size: 9px; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 6px; }
        @media print { body { margin: 10mm 15mm; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>SEMED — São Sebastião da Boa Vista</h2>
        <p>Secretaria Municipal de Educação</p>
        <h1>Relatório para o ${info.nome}</h1>
        <p>${info.desc}</p>
        <p>Ano Letivo: ${ano}</p>
      </div>

      ${tabelaHtml}

      <div class="data-local">
        São Sebastião da Boa Vista — PA, ${dataHoje}
      </div>

      <div class="assinaturas">
        <div class="assinatura">
          <div class="linha">Presidente do ${info.nome}</div>
        </div>
        <div class="assinatura">
          <div class="linha">Secretário(a) de Educação</div>
        </div>
      </div>

      <div class="footer-note">
        Documento gerado pelo sistema Educatec — SEMED SSBV | ${dataHoje}
      </div>

      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `)
  printWindow.document.close()
}

export default function RelatoriosConselhosPage() {
  const [conselhoAtivo, setConselhoAtivo] = useState<Conselho>('CACSFUNDEB')
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString())
  const [dados, setDados] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      setCarregando(true)
      try {
        const res = await fetch(`/api/admin/relatorios-conselhos?conselho=${conselhoAtivo}&ano_letivo=${anoLetivo}`)
        if (res.ok) setDados(await res.json())
      } catch (err) {
        console.error('[RelatoriosConselhos] Erro:', (err as Error).message)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [conselhoAtivo, anoLetivo])

  const info = conselhosInfo[conselhoAtivo]

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 dark:from-indigo-800 dark:to-indigo-900 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Relatórios para Conselhos</h1>
          </div>
          <p className="text-indigo-200 text-sm">Geração de relatórios para CACS/FUNDEB, CAE e CME</p>
        </div>

        {/* Seletor de Conselho */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.entries(conselhosInfo) as [Conselho, typeof conselhosInfo[Conselho]][]).map(([key, c]) => {
            const Icon = c.icon
            const ativo = conselhoAtivo === key
            return (
              <button key={key} onClick={() => setConselhoAtivo(key)}
                className={`relative overflow-hidden rounded-xl p-4 text-left transition-all ${ativo ? 'ring-2 ring-indigo-500 shadow-lg' : 'shadow-md hover:shadow-lg'} bg-white dark:bg-slate-800`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${c.cor} text-white`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white">{c.nome}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{c.desc}</p>
                  </div>
                  {ativo && <ChevronRight className="w-5 h-5 text-indigo-500 ml-auto" />}
                </div>
              </button>
            )
          })}
        </div>

        {/* Filtro ano */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 flex items-center gap-4">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Ano Letivo:</label>
          <select value={anoLetivo} onChange={e => setAnoLetivo(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm">
            {['2024', '2025', '2026'].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={() => dados && imprimirRelatorioConselho(conselhoAtivo, anoLetivo, dados)}
            disabled={carregando || !dados}
            className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition">
            <Printer className="w-4 h-4" /> Imprimir Relatório
          </button>
        </div>

        {carregando ? <LoadingSpinner text="Gerando relatório..." centered /> : dados && (
          <>
            {/* Cards resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {conselhoAtivo === 'CACSFUNDEB' && (
                <>
                  <ResumoCard icon={Users} label="Total de Alunos" valor={dados.resumo?.total_alunos || 0} />
                  <ResumoCard icon={Building2} label="Total de Turmas" valor={dados.resumo?.total_turmas || 0} />
                  <ResumoCard icon={GraduationCap} label="Professores" valor={dados.resumo?.total_professores || 0} />
                  <ResumoCard icon={CalendarCheck} label="Frequência Média" valor={`${dados.resumo?.frequencia_geral || 0}%`} />
                </>
              )}
              {conselhoAtivo === 'CAE' && (
                <>
                  <ResumoCard icon={Users} label="Total de Alunos" valor={dados.resumo?.total_alunos || 0} />
                  <ResumoCard icon={Building2} label="Total de Turmas" valor={dados.resumo?.total_turmas || 0} />
                  <ResumoCard icon={Building2} label="Escolas Ativas" valor={dados.resumo?.total_escolas || 0} />
                </>
              )}
              {conselhoAtivo === 'CME' && (
                <>
                  <ResumoCard icon={Users} label="Total de Alunos" valor={dados.resumo?.total_alunos || 0} />
                  <ResumoCard icon={Building2} label="Escolas" valor={dados.resumo?.total_escolas || 0} />
                  <ResumoCard icon={GraduationCap} label="Aprovados" valor={dados.resumo?.total_aprovados || 0} cor="text-emerald-600" />
                  <ResumoCard icon={BarChart3} label="Reprovados" valor={dados.resumo?.total_reprovados || 0} cor="text-red-600" />
                </>
              )}
            </div>

            {/* Tabela */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Detalhamento por Escola — {info.nome}</h3>
              </div>
              <div className="overflow-x-auto">
                {conselhoAtivo === 'CACSFUNDEB' && (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Escola</th>
                        <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Alunos</th>
                        <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Turmas</th>
                        <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Professores</th>
                        <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Freq. Média</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.escolas?.filter((e: any) => parseInt(e.total_alunos) > 0).map((e: any) => (
                        <tr key={e.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                          <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-200">{e.escola}</td>
                          <td className="py-2.5 px-3 text-center">{e.total_alunos}</td>
                          <td className="py-2.5 px-3 text-center">{e.total_turmas}</td>
                          <td className="py-2.5 px-3 text-center">{e.total_professores || 0}</td>
                          <td className="py-2.5 px-3 text-center">{e.frequencia_media ? `${e.frequencia_media}%` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {conselhoAtivo === 'CAE' && (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Escola</th>
                        <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Alunos</th>
                        <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Turmas</th>
                        <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Turnos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.escolas?.filter((e: any) => parseInt(e.total_alunos) > 0).map((e: any) => (
                        <tr key={e.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                          <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-200">{e.escola}</td>
                          <td className="py-2.5 px-3 text-center">{e.total_alunos}</td>
                          <td className="py-2.5 px-3 text-center">{e.total_turmas}</td>
                          <td className="py-2.5 px-3 text-left text-xs text-gray-600 dark:text-gray-400">
                            {(e.turnos || []).map((t: any) => `${t.turno || 'N/I'}: ${t.total}`).join(', ') || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {conselhoAtivo === 'CME' && (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Escola</th>
                        <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Alunos</th>
                        <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Aprovados</th>
                        <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Reprovados</th>
                        <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Freq. Média</th>
                        <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Média SISAM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.escolas?.filter((e: any) => parseInt(e.total_alunos) > 0).map((e: any) => (
                        <tr key={e.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                          <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-200">{e.escola}</td>
                          <td className="py-2.5 px-3 text-center">{e.total_alunos}</td>
                          <td className="py-2.5 px-3 text-center text-emerald-600 font-medium">{e.situacoes?.aprovado || 0}</td>
                          <td className="py-2.5 px-3 text-center text-red-600 font-medium">{e.situacoes?.reprovado || 0}</td>
                          <td className="py-2.5 px-3 text-center">{e.frequencia_media ? `${e.frequencia_media}%` : '-'}</td>
                          <td className="py-2.5 px-3 text-center font-medium">{e.media_sisam ? parseFloat(e.media_sisam).toFixed(2) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}

function ResumoCard({ icon: Icon, label, valor, cor }: { icon: any; label: string; valor: string | number; cor?: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-5 h-5 text-indigo-500" />
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${cor || 'text-gray-900 dark:text-white'}`}>{valor}</p>
    </div>
  )
}
