import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Termos de Uso — SISAM/Educatec',
  description: 'Condições de uso da plataforma SISAM/Educatec.',
}

const ULTIMA_ATUALIZACAO = '2026-05-25'

export default function TermosDeUsoPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-900 py-8 px-4">
      <article className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        <header className="mb-8 pb-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Termos de Uso</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Última atualização: {new Date(ULTIMA_ATUALIZACAO).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </header>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-200 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">1. Aceitação</h2>
            <p>
              Ao acessar e utilizar o SISAM/Educatec, você concorda com estes Termos de Uso e com
              a nossa{' '}
              <Link href="/politica-de-privacidade" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                Política de Privacidade
              </Link>
              . Se não concordar, não utilize a plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">2. Quem pode usar</h2>
            <p>
              O sistema é destinado a servidores da Secretaria Municipal de Educação, equipes das
              escolas municipais, professores, alunos e responsáveis vinculados à rede municipal de ensino.
            </p>
            <p>
              Cada conta é pessoal e intransferível. Você é responsável por manter a confidencialidade
              da sua senha e por toda atividade realizada com sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">3. Uso aceitável</h2>
            <p>Ao usar o sistema, você concorda em <strong>não</strong>:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Acessar dados de outros usuários sem autorização.</li>
              <li>Tentar contornar mecanismos de segurança ou autenticação.</li>
              <li>Inserir dados falsos, fraudulentos ou ofensivos.</li>
              <li>Usar a plataforma para fins comerciais não autorizados.</li>
              <li>Sobrecarregar a infraestrutura com requisições automatizadas.</li>
              <li>Compartilhar capturas de tela com dados pessoais de terceiros.</li>
            </ul>
            <p>
              Condutas em desacordo com estes Termos podem resultar em suspensão ou cancelamento
              da conta, sem prejuízo de medidas legais cabíveis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">4. Conteúdo gerado pelo usuário</h2>
            <p>
              Comunicados, mensagens, anotações, planos de aula e demais conteúdos inseridos
              permanecem sob a responsabilidade de quem os criou. A Secretaria Municipal de
              Educação se reserva o direito de moderar ou remover conteúdos inadequados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">5. Disponibilidade do serviço</h2>
            <p>
              Buscamos a maior disponibilidade possível, mas o sistema pode passar por períodos de
              manutenção planejada ou indisponibilidade não planejada. Comunicaremos sempre que
              possível por meio dos canais oficiais.
            </p>
            <p>
              Funcionalidades offline (boletim, frequência, terminal facial) podem operar mesmo
              sem internet, sincronizando os dados quando a conexão for restabelecida.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">6. Propriedade intelectual</h2>
            <p>
              O SISAM/Educatec, incluindo seu código, design e marcas, é de propriedade da Secretaria
              Municipal de Educação e está protegido por leis de direitos autorais e propriedade
              intelectual.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">7. Limitação de responsabilidade</h2>
            <p>
              O sistema é fornecido <em>como está</em>. A Secretaria Municipal de Educação se
              empenha em manter sua estabilidade, segurança e exatidão, mas não pode garantir
              ausência total de falhas. Em caso de divergência entre dados do sistema e documentos
              oficiais físicos, prevalecem os documentos oficiais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">8. Alterações nos Termos</h2>
            <p>
              Estes Termos podem ser atualizados. A data da última atualização está no topo desta
              página. O uso continuado do sistema após a publicação de mudanças implica aceitação
              dos novos Termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">9. Foro</h2>
            <p>
              Fica eleito o foro da Comarca onde se localiza o município responsável pela operação
              deste sistema, com renúncia a qualquer outro, por mais privilegiado que seja, para
              dirimir questões oriundas destes Termos.
            </p>
          </section>
        </div>

        <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-slate-700 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/politica-de-privacidade" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Política de Privacidade
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
