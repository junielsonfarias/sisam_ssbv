import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, ShieldX, FileText, Calendar, School, Hash } from 'lucide-react'
import { headers } from 'next/headers'

export const metadata: Metadata = {
  title: 'Validar documento — SISAM/Educatec',
  description: 'Validação pública de autenticidade de documentos escolares.',
}

export const dynamic = 'force-dynamic'

interface ResultadoValidacao {
  valido: boolean
  mensagem?: string
  codigo?: string
  tipo?: string
  tipo_label?: string
  aluno_nome?: string | null
  escola_nome?: string | null
  emitido_em?: string
  hash_conteudo?: string
  status?: string
  vezes_validado?: number
}

async function validar(codigo: string): Promise<ResultadoValidacao> {
  // Constrói URL absoluta (server-side fetch)
  const h = headers()
  const host = h.get('host')
  const proto = h.get('x-forwarded-proto') || 'http'
  const baseUrl = `${proto}://${host}`

  try {
    const res = await fetch(`${baseUrl}/api/publico/validar-documento/${codigo}`, {
      cache: 'no-store',
    })
    return await res.json()
  } catch {
    return { valido: false, mensagem: 'Erro ao validar.' }
  }
}

export default async function ValidarPage({
  params,
}: {
  params: { codigo: string }
}) {
  const resultado = await validar(params.codigo)

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-6 inline-block">
          ← Voltar
        </Link>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          {/* Header */}
          <div className={`p-6 ${resultado.valido ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <div className="flex items-center gap-4">
              {resultado.valido ? (
                <ShieldCheck className="w-12 h-12 text-green-600 dark:text-green-400 flex-shrink-0" />
              ) : (
                <ShieldX className="w-12 h-12 text-red-600 dark:text-red-400 flex-shrink-0" />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {resultado.valido ? 'Documento autêntico' : 'Documento não validado'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Código: <span className="font-mono font-medium">{params.codigo}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="p-6 space-y-4">
            {resultado.valido ? (
              <>
                <Info label="Tipo de documento" valor={resultado.tipo_label} icon={<FileText className="w-4 h-4" />} />
                {resultado.aluno_nome && (
                  <Info label="Titular" valor={resultado.aluno_nome} />
                )}
                {resultado.escola_nome && (
                  <Info label="Escola emissora" valor={resultado.escola_nome} icon={<School className="w-4 h-4" />} />
                )}
                {resultado.emitido_em && (
                  <Info
                    label="Emitido em"
                    valor={new Date(resultado.emitido_em).toLocaleString('pt-BR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                    icon={<Calendar className="w-4 h-4" />}
                  />
                )}
                {resultado.hash_conteudo && (
                  <Info
                    label="Hash de integridade (SHA-256)"
                    valor={resultado.hash_conteudo}
                    icon={<Hash className="w-4 h-4" />}
                    monospace
                  />
                )}
                {resultado.vezes_validado != null && resultado.vezes_validado > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    Este documento foi validado {resultado.vezes_validado} vez(es) anteriormente.
                  </p>
                )}

                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Este documento foi emitido pelo SISAM/Educatec e seu conteúdo
                    pode ser confirmado pela Secretaria Municipal de Educação.
                  </p>
                </div>
              </>
            ) : (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {resultado.mensagem || 'Não conseguimos validar este documento. Verifique o código informado ou contate a escola emissora.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-xs text-center text-gray-500 dark:text-gray-400">
          SISAM/Educatec — Sistema da Secretaria Municipal de Educação
        </p>
      </div>
    </main>
  )
}

function Info({
  label, valor, icon, monospace,
}: {
  label: string
  valor?: string | null
  icon?: React.ReactNode
  monospace?: boolean
}) {
  if (!valor) return null
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
        {icon} {label}
      </p>
      <p className={`text-sm text-gray-900 dark:text-white ${monospace ? 'font-mono break-all text-xs' : ''}`}>
        {valor}
      </p>
    </div>
  )
}
