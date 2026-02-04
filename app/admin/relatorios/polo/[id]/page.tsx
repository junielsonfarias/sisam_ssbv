'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { RelatorioPoloWeb } from '@/components/relatorios/RelatorioPoloWeb';
import { DadosRelatorioPolo } from '@/lib/relatorios/tipos';
import {
  Loader2,
  AlertCircle,
  Printer,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

export default function RelatorioPoloPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const poloId = params.id as string;
  const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString();
  const serie = searchParams.get('serie') || undefined;

  const [dados, setDados] = useState<DadosRelatorioPolo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function carregarDados() {
      setCarregando(true);
      setErro(null);

      try {
        const queryParams = new URLSearchParams({
          ano_letivo: anoLetivo,
          ...(serie && { serie })
        });

        const response = await fetch(`/api/admin/relatorios/polo/${poloId}/dados?${queryParams}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.detalhes
            ? `${errorData.error}: ${errorData.detalhes}`
            : errorData.error || 'Erro ao carregar dados do relatório';
          throw new Error(errorMsg);
        }

        const dadosRelatorio = await response.json();
        setDados(dadosRelatorio);
      } catch (error) {
        console.error('Erro ao carregar relatório:', error);
        setErro(error instanceof Error ? error.message : 'Erro desconhecido');
      } finally {
        setCarregando(false);
      }
    }

    if (poloId) {
      carregarDados();
    }
  }, [poloId, anoLetivo, serie]);

  const handleImprimir = () => {
    window.print();
  };

  const handleRecarregar = () => {
    window.location.reload();
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600 dark:text-gray-300">Carregando relatório do polo...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Buscando dados para o ano {anoLetivo}
            {serie && ` - ${serie}`}
          </p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="w-8 h-8" />
            <h1 className="text-xl font-bold">Erro ao Carregar Relatório</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{erro}</p>
          <div className="flex gap-3">
            <Link
              href="/admin/relatorios"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
            <button
              onClick={handleRecarregar}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Nenhum Dado Encontrado
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Não foram encontrados dados para este polo no ano letivo {anoLetivo}.
          </p>
          <Link
            href="/admin/relatorios"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Relatórios
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Estilos de impressão inline */}
      <style jsx global>{`
        @media print {
          .print\\:hidden,
          .barra-acoes-relatorio,
          nav,
          header:not(.cabecalho-relatorio),
          aside,
          footer:not(.rodape-relatorio) {
            display: none !important;
          }

          @page {
            size: A4;
            margin: 15mm;
          }

          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .relatorio-container {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .secao-relatorio {
            break-inside: avoid;
          }

          .print\\:break-before-page {
            break-before: page;
          }

          .cabecalho-relatorio {
            background: #7c3aed !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            border-radius: 0 !important;
            margin: -15mm -15mm 15mm -15mm !important;
            padding: 15mm !important;
          }

          .grafico-container {
            break-inside: avoid;
          }

          .grafico-container svg {
            max-width: 100%;
          }

          table {
            font-size: 10pt;
          }

          th, td {
            padding: 4px 8px !important;
          }

          .bg-white,
          .dark\\:bg-slate-800 {
            background: white !important;
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
          }

          .text-gray-900,
          .dark\\:text-white {
            color: #111827 !important;
          }

          .text-gray-500,
          .text-gray-600,
          .dark\\:text-gray-300,
          .dark\\:text-gray-400 {
            color: #4b5563 !important;
          }

          .text-green-600 { color: #16a34a !important; }
          .text-amber-600 { color: #d97706 !important; }
          .text-red-600 { color: #dc2626 !important; }
          .text-blue-600 { color: #2563eb !important; }
          .text-purple-600 { color: #9333ea !important; }

          .bg-green-50,
          .bg-amber-50,
          .bg-red-50,
          .bg-blue-50,
          .bg-purple-50 {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .rodape-relatorio {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            border-top: 1px solid #e5e7eb;
            padding: 10mm 15mm;
            background: white;
          }
        }

        @media screen {
          .relatorio-container {
            padding: 1rem;
          }
        }
      `}</style>

      {/* Barra de ações (oculta na impressão) */}
      <div className="barra-acoes-relatorio sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 shadow-sm print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/admin/relatorios"
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {dados.polo.nome} - {anoLetivo}
              {serie && ` (${serie})`}
            </span>

            <button
              onClick={handleImprimir}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo do relatório */}
      <main className="min-h-screen bg-gray-50 dark:bg-slate-900 py-6 print:bg-white print:py-0">
        <div ref={containerRef}>
          <RelatorioPoloWeb dados={dados} />
        </div>
      </main>

      {/* Instruções (ocultas na impressão) */}
      <div className="print:hidden max-w-5xl mx-auto px-4 py-6">
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-2">
            Como salvar como PDF
          </h3>
          <ul className="text-sm text-purple-700 dark:text-purple-400 space-y-1">
            <li>1. Clique no botão &quot;Imprimir / Salvar PDF&quot; acima</li>
            <li>2. Na janela de impressão, selecione &quot;Salvar como PDF&quot; como destino</li>
            <li>3. Ajuste as configurações conforme necessário e clique em &quot;Salvar&quot;</li>
            <li className="text-purple-600 dark:text-purple-300 font-medium">
              Dica: Para melhores resultados, use o Chrome ou Edge
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
