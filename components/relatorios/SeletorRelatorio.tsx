'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Download,
  Building2,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle,
  Calendar,
  ExternalLink
} from 'lucide-react';

interface Polo {
  id: string;
  nome: string;
}

interface Escola {
  id: string;
  nome: string;
  polo_id: string;
}

interface Props {
  polos: Polo[];
  escolas: Escola[];
  anoLetivo: string;
  anosDisponiveis?: string[];
  tipoUsuario: string;
  poloIdUsuario?: string | null;
  escolaIdUsuario?: string | null;
}

type TipoRelatorio = 'escola' | 'polo';

export function SeletorRelatorio({
  polos,
  escolas,
  anoLetivo: anoLetivoInicial,
  anosDisponiveis = [],
  tipoUsuario,
  poloIdUsuario,
  escolaIdUsuario
}: Props) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoRelatorio>('escola');
  const [poloSelecionado, setPoloSelecionado] = useState<string>('');
  const [escolaSelecionada, setEscolaSelecionada] = useState<string>('');
  const [serie, setSerie] = useState<string>('');
  const [anoLetivo, setAnoLetivo] = useState<string>(anoLetivoInicial);
  const [gerando, setGerando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Gerar lista de anos se não foi passada
  const anosParaExibir = anosDisponiveis.length > 0
    ? anosDisponiveis
    : Array.from({ length: 3 }, (_, i) => String(new Date().getFullYear() - i));

  // Atualizar ano quando anosDisponiveis mudar (garante usar ano com dados)
  useEffect(() => {
    if (anosDisponiveis.length > 0 && !anosDisponiveis.includes(anoLetivo)) {
      setAnoLetivo(anosDisponiveis[0]);
    }
  }, [anosDisponiveis, anoLetivo]);

  // Inicializar seleções baseadas no tipo de usuário
  useEffect(() => {
    if (tipoUsuario === 'escola' && escolaIdUsuario) {
      setTipo('escola');
      setEscolaSelecionada(escolaIdUsuario);
      // Encontrar polo da escola
      const escola = escolas.find(e => e.id === escolaIdUsuario);
      if (escola) {
        setPoloSelecionado(escola.polo_id);
      }
    } else if (tipoUsuario === 'polo' && poloIdUsuario) {
      setPoloSelecionado(poloIdUsuario);
    }
  }, [tipoUsuario, escolaIdUsuario, poloIdUsuario, escolas]);

  // Filtrar escolas por polo selecionado
  const escolasFiltradas = poloSelecionado
    ? escolas.filter(e => e.polo_id === poloSelecionado)
    : escolas;

  // Verificar se pode gerar relatório de polo
  const podeGerarPolo = tipoUsuario === 'administrador' ||
    tipoUsuario === 'admin' ||
    tipoUsuario === 'tecnico' ||
    tipoUsuario === 'polo';

  // Abrir relatório web (nova abordagem otimizada)
  const handleVisualizarRelatorio = () => {
    const id = tipo === 'escola' ? escolaSelecionada : poloSelecionado;
    if (!id) {
      setMensagem({ tipo: 'erro', texto: 'Selecione uma escola ou polo' });
      return;
    }

    const params = new URLSearchParams({
      ano_letivo: anoLetivo,
      ...(serie && { serie })
    });

    // Redireciona para a página de visualização do relatório
    router.push(`/admin/relatorios/${tipo}/${id}?${params}`);
  };

  // Gerar PDF via servidor (método legado, pode causar timeout)
  const handleGerarRelatorio = async () => {
    const id = tipo === 'escola' ? escolaSelecionada : poloSelecionado;
    if (!id) {
      setMensagem({ tipo: 'erro', texto: 'Selecione uma escola ou polo' });
      return;
    }

    setGerando(true);
    setMensagem(null);

    try {
      const params = new URLSearchParams({
        ano_letivo: anoLetivo,
        ...(serie && { serie })
      });

      const response = await fetch(
        `/api/admin/relatorios/${tipo}/${id}?${params}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao gerar relatório');
      }

      // Download do PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Extrair nome do arquivo do header ou usar padrão
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `relatorio_${tipo}_${anoLetivo}.pdf`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setMensagem({ tipo: 'sucesso', texto: 'Relatório gerado com sucesso!' });

    } catch (error) {
      console.error('Erro:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMensagem({ tipo: 'erro', texto: errorMessage });
    } finally {
      setGerando(false);
    }
  };

  const podeGerar = tipo === 'escola' ? !!escolaSelecionada : !!poloSelecionado;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 max-w-2xl transition-colors">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
          <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Gerar Relatório PDF
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Selecione o tipo de relatório e a unidade desejada
          </p>
        </div>
      </div>

      {/* Tipo de Relatório */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Tipo de Relatório
        </label>
        <div className="flex gap-4">
          <button
            onClick={() => setTipo('escola')}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all flex-1 ${
              tipo === 'escola'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Building2 className="w-5 h-5" />
            <div className="text-left">
              <div className="font-medium">Por Escola</div>
              <div className="text-xs opacity-75">Relatório detalhado da escola</div>
            </div>
          </button>

          {podeGerarPolo && (
            <button
              onClick={() => setTipo('polo')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all flex-1 ${
                tipo === 'polo'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 text-gray-700 dark:text-gray-300'
              }`}
            >
              <MapPin className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Por Polo</div>
                <div className="text-xs opacity-75">Comparativo das escolas</div>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Seleção de Polo */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Polo
        </label>
        <select
          value={poloSelecionado}
          onChange={(e) => {
            setPoloSelecionado(e.target.value);
            setEscolaSelecionada('');
          }}
          disabled={tipoUsuario === 'polo' || tipoUsuario === 'escola'}
          className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                     disabled:bg-gray-100 dark:disabled:bg-slate-600 disabled:cursor-not-allowed
                     transition-colors"
        >
          <option value="">Selecione um polo</option>
          {polos.map(polo => (
            <option key={polo.id} value={polo.id}>{polo.nome}</option>
          ))}
        </select>
      </div>

      {/* Seleção de Escola (apenas se tipo = escola) */}
      {tipo === 'escola' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Escola
          </label>
          <select
            value={escolaSelecionada}
            onChange={(e) => setEscolaSelecionada(e.target.value)}
            disabled={tipoUsuario === 'escola' || !poloSelecionado}
            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                       disabled:bg-gray-100 dark:disabled:bg-slate-600 disabled:cursor-not-allowed
                       transition-colors"
          >
            <option value="">Selecione uma escola</option>
            {escolasFiltradas.map(escola => (
              <option key={escola.id} value={escola.id}>{escola.nome}</option>
            ))}
          </select>
          {!poloSelecionado && tipoUsuario !== 'escola' && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Selecione um polo primeiro
            </p>
          )}
        </div>
      )}

      {/* Seleção de Ano Letivo */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Calendar className="w-4 h-4 inline mr-1" />
          Ano Letivo
        </label>
        <select
          value={anoLetivo}
          onChange={(e) => setAnoLetivo(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                     transition-colors"
        >
          {anosParaExibir.map(ano => (
            <option key={ano} value={ano}>{ano}</option>
          ))}
        </select>
        {anosDisponiveis.length > 0 && !anosDisponiveis.includes(anoLetivo) && (
          <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
            O ano {anoLetivo} pode não ter dados disponíveis
          </p>
        )}
      </div>

      {/* Filtro por Série (opcional) */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Série (opcional)
        </label>
        <select
          value={serie}
          onChange={(e) => setSerie(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                     transition-colors"
        >
          <option value="">Todas as séries</option>
          <optgroup label="Anos Iniciais">
            <option value="2º Ano">2º Ano</option>
            <option value="3º Ano">3º Ano</option>
            <option value="5º Ano">5º Ano</option>
          </optgroup>
          <optgroup label="Anos Finais">
            <option value="8º Ano">8º Ano</option>
            <option value="9º Ano">9º Ano</option>
          </optgroup>
        </select>
      </div>

      {/* Mensagem de feedback */}
      {mensagem && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
          mensagem.tipo === 'sucesso'
            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
        }`}>
          {mensagem.tipo === 'sucesso' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{mensagem.texto}</span>
        </div>
      )}

      {/* Botões de ação */}
      <div className="space-y-3">
        {/* Botão principal - Visualizar Relatório (recomendado) */}
        <button
          onClick={handleVisualizarRelatorio}
          disabled={!podeGerar}
          className="w-full flex items-center justify-center gap-3 px-4 py-4
                     bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                     font-medium transition-colors
                     disabled:bg-gray-300 dark:disabled:bg-slate-600
                     disabled:cursor-not-allowed disabled:text-gray-500"
        >
          <ExternalLink className="w-5 h-5" />
          Visualizar Relatório
        </button>

        {/* Botão secundário - Download PDF (legado) */}
        <button
          onClick={handleGerarRelatorio}
          disabled={gerando || !podeGerar}
          className="w-full flex items-center justify-center gap-3 px-4 py-3
                     bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600
                     text-gray-700 dark:text-gray-300 rounded-lg
                     font-medium transition-colors border border-gray-300 dark:border-slate-600
                     disabled:bg-gray-100 dark:disabled:bg-slate-700
                     disabled:cursor-not-allowed disabled:text-gray-400"
        >
          {gerando ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Gerando PDF...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Download PDF Direto
            </>
          )}
        </button>
      </div>

      {/* Nota sobre os métodos */}
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
        Recomendamos &quot;Visualizar Relatório&quot; para melhor desempenho.
        Use Ctrl+P para salvar como PDF.
      </p>

      {/* Informações adicionais */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          O relatório inclui:
        </h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Estatísticas gerais (alunos, turmas, média, participação)</li>
          <li>• Gráficos de desempenho por disciplina</li>
          <li>• Distribuição de notas e níveis de aprendizagem</li>
          <li>• Análise de questões (acertos e erros)</li>
          <li>• Recomendações pedagógicas</li>
          {tipo === 'polo' && <li>• Ranking comparativo das escolas</li>}
        </ul>
      </div>
    </div>
  );
}
