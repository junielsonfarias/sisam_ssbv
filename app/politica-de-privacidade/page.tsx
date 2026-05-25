import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Privacidade — SISAM/Educatec',
  description: 'Como tratamos seus dados pessoais conforme a Lei Geral de Proteção de Dados (LGPD).',
}

const ULTIMA_ATUALIZACAO = '2026-05-25'

export default function PoliticaPrivacidadePage() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-900 py-8 px-4">
      <article className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        <header className="mb-8 pb-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Política de Privacidade</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Última atualização: {new Date(ULTIMA_ATUALIZACAO).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </header>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-200 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">1. Quem somos</h2>
            <p>
              O <strong>SISAM/Educatec</strong> é uma plataforma de gestão escolar utilizada pela
              Secretaria Municipal de Educação para o registro de alunos, professores, frequência,
              notas, comunicação escolar e avaliações municipais.
            </p>
            <p>
              O controlador dos dados é a Secretaria Municipal de Educação que opera esta instância
              do sistema. Em caso de dúvidas, contate o Encarregado de Dados (DPO) da Secretaria.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">2. Dados que coletamos</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Identificação:</strong> nome, e-mail, CPF, data de nascimento, telefone.</li>
              <li><strong>Acadêmicos:</strong> matrícula, turma, série, notas, frequência, boletim, histórico escolar.</li>
              <li><strong>Vinculação familiar:</strong> dados do responsável quando o titular é menor de idade.</li>
              <li><strong>Biométricos (opcional):</strong> embedding facial para frequência por reconhecimento. Coletado <em>somente</em> com consentimento expresso do responsável.</li>
              <li><strong>Técnicos:</strong> logs de acesso (data, IP parcial, navegador), preferências de tema.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">3. Bases legais (LGPD Art. 7º)</h2>
            <p>O tratamento de dados se baseia em:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Cumprimento de obrigação legal/regulatória</strong> (art. 7º, II) — registros educacionais obrigatórios por LDB, INEP, Censo Escolar.</li>
              <li><strong>Execução de políticas públicas</strong> (art. 7º, III) — gestão da educação municipal.</li>
              <li><strong>Consentimento</strong> (art. 7º, I) — para tratamentos opcionais como reconhecimento facial e comunicação por e-mail.</li>
              <li><strong>Legítimo interesse</strong> (art. 7º, IX) — logs de segurança e auditoria.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">4. Como protegemos seus dados</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Transmissão criptografada por HTTPS/TLS.</li>
              <li>Senhas armazenadas com hash bcrypt (irreversível).</li>
              <li>Autenticação em dois fatores (2FA) obrigatória para administradores e técnicos.</li>
              <li>Reconhecimento facial processado <strong>localmente</strong> no dispositivo — o embedding é armazenado mas a imagem não é enviada para nenhuma nuvem.</li>
              <li>Logs de acesso e auditoria com mascaramento de dados sensíveis.</li>
              <li>Controle de acesso por perfil e por escola/polo.</li>
              <li>Backups periódicos com restauração testada.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">5. Compartilhamento</h2>
            <p>Seus dados <strong>não são vendidos</strong>. Podem ser compartilhados apenas com:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Órgãos públicos competentes (INEP, MEC) por obrigação legal.</li>
              <li>Provedores de infraestrutura essenciais (banco de dados, hospedagem) sob contrato e em conformidade com a LGPD.</li>
              <li>Provedores de e-mail (envio de notificações e recuperação de senha).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">6. Seus direitos (LGPD Art. 18)</h2>
            <p>Você pode, a qualquer momento:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Confirmar se tratamos seus dados.</li>
              <li>Acessar seus dados (baixar arquivo JSON completo).</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
              <li>Solicitar a portabilidade para outro fornecedor.</li>
              <li>Solicitar a eliminação dos dados tratados com consentimento.</li>
              <li>Revogar consentimentos (por exemplo, do reconhecimento facial).</li>
              <li>Reclamar à ANPD (<a href="https://www.gov.br/anpd" target="_blank" rel="noopener" className="text-indigo-600 dark:text-indigo-400 hover:underline">www.gov.br/anpd</a>).</li>
            </ul>
            <p className="mt-3">
              Acesse os direitos diretamente em{' '}
              <Link href="/meus-dados" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                Meus Dados
              </Link>{' '}
              após o login.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">7. Retenção de dados</h2>
            <p>
              Dados acadêmicos são preservados pelo tempo exigido pela legislação educacional
              (incluindo histórico escolar permanente). Logs técnicos são preservados por até 90 dias.
              Após a solicitação de exclusão e o cumprimento das obrigações legais aplicáveis, os
              dados são removidos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">8. Cookies</h2>
            <p>
              Usamos cookies para manter sua sessão autenticada, lembrar seu tema (claro/escuro) e
              proteger contra ataques. Você pode revisar e ajustar suas preferências de cookies a
              qualquer momento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">9. Alterações</h2>
            <p>
              Esta política pode ser atualizada para refletir mudanças legais ou no sistema. A data
              da última atualização está no topo desta página. Mudanças relevantes serão comunicadas
              pelos canais oficiais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">10. Contato</h2>
            <p>
              Para exercer seus direitos ou tirar dúvidas, contate o DPO da Secretaria Municipal
              de Educação por meio dos canais oficiais.
            </p>
          </section>
        </div>

        <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-slate-700 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/termos-de-uso" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Termos de Uso
          </Link>
          {' · '}
          <Link href="/meus-dados" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Meus Dados (LGPD)
          </Link>
        </footer>
      </article>
    </main>
  )
}
