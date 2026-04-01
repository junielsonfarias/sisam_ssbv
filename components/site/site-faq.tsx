'use client'

import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'

interface PerguntaFAQ {
  pergunta: string
  resposta: string
}

interface SiteFaqProps {
  data?: {
    title?: string
    subtitle?: string
    perguntas?: PerguntaFAQ[]
  }
}

const perguntasPadrao: PerguntaFAQ[] = [
  {
    pergunta: 'Como consultar o boletim escolar do meu filho?',
    resposta: 'Acesse o site da SEMED e clique em "Boletim Online" no menu de serviços. Informe o código do aluno e a data de nascimento para visualizar as notas e frequência de todas as disciplinas.',
  },
  {
    pergunta: 'Quais são as datas do período de matrícula?',
    resposta: 'O período de matrícula para o ano letivo geralmente ocorre entre novembro e janeiro. As datas exatas são divulgadas no site e nas redes sociais da SEMED. A pré-matrícula pode ser feita online pelo nosso sistema.',
  },
  {
    pergunta: 'Quais documentos são necessários para a matrícula?',
    resposta: 'São necessários: certidão de nascimento ou RG do aluno, comprovante de residência, cartão de vacinação atualizado, histórico escolar ou declaração de transferência, CPF do responsável e 2 fotos 3x4.',
  },
  {
    pergunta: 'Como acessar o Portal do Professor?',
    resposta: 'Os professores da rede municipal podem acessar o portal pelo botão "Entrar" no canto superior do site. Utilize o CPF e a senha cadastrada pela coordenação da sua escola. Em caso de problemas, procure a secretaria da escola.',
  },
  {
    pergunta: 'Qual o horário de funcionamento da SEMED?',
    resposta: 'A Secretaria Municipal de Educação funciona de segunda a sexta-feira, das 08h às 14h. O atendimento ao público é realizado na sede da SEMED em São Sebastião da Boa Vista.',
  },
  {
    pergunta: 'Como entro em contato com a SEMED?',
    resposta: 'Você pode entrar em contato pelo telefone (91) 0000-0000, pelo e-mail semed@ssbv.pa.gov.br, ou presencialmente na sede da secretaria. Também é possível utilizar o canal de Ouvidoria disponível no site.',
  },
  {
    pergunta: 'Como funciona o processo de transferência escolar?',
    resposta: 'Para solicitar transferência, o responsável deve comparecer à escola de origem com documento de identificação. A escola emitirá a declaração de transferência e o histórico escolar. Com esses documentos, dirija-se à escola de destino para efetuar a nova matrícula.',
  },
  {
    pergunta: 'O que é o SISAM e como ele beneficia a educação?',
    resposta: 'O SISAM (Sistema de Acompanhamento Municipal) é a plataforma digital da SEMED que integra gestão escolar, acompanhamento pedagógico, boletins online e comunicação entre escola e família. Ele permite que pais, professores e gestores acompanhem o desempenho dos alunos em tempo real.',
  },
]

function ItemFAQ({ pergunta, resposta, aberto, onClick }: PerguntaFAQ & { aberto: boolean; onClick: () => void }) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden transition-colors duration-300 hover:border-blue-300 dark:hover:border-blue-600">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 text-left bg-white dark:bg-slate-800 hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors duration-200"
        aria-expanded={aberto}
      >
        <span className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 leading-snug">
          {pergunta}
        </span>
        <ChevronDown
          className={`w-5 h-5 flex-shrink-0 text-blue-600 dark:text-blue-400 transition-transform duration-300 ${
            aberto ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: aberto ? '300px' : '0px', opacity: aberto ? 1 : 0 }}
      >
        <div className="px-5 sm:px-6 pb-4 sm:pb-5 pt-0 bg-white dark:bg-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {resposta}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SiteFaq({ data }: SiteFaqProps) {
  const titulo = data?.title || 'Perguntas Frequentes'
  const subtitulo = data?.subtitle || 'Encontre respostas para as dúvidas mais comuns sobre a rede municipal de ensino'
  const perguntas = data?.perguntas?.length ? data.perguntas : perguntasPadrao

  const [abertoIndex, setAbertoIndex] = useState<number | null>(null)

  const toggle = (index: number) => {
    setAbertoIndex(prev => (prev === index ? null : index))
  }

  return (
    <section id="faq" className="py-10 sm:py-16 lg:py-20 bg-white dark:bg-slate-900" aria-labelledby="faq-title">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-bold uppercase tracking-widest text-blue-800 dark:text-blue-400">FAQ</p>
          </div>
          <h2 id="faq-title" className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
            {titulo}
          </h2>
          <p className="text-sm sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {subtitulo}
          </p>
        </div>

        {/* Lista de perguntas */}
        <div className="space-y-3" role="list" aria-label="Perguntas frequentes">
          {perguntas.map((item, i) => (
            <div key={i} role="listitem">
              <ItemFAQ
                pergunta={item.pergunta}
                resposta={item.resposta}
                aberto={abertoIndex === i}
                onClick={() => toggle(i)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
