import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import pool from '@/database/connection';
import { SeletorRelatorio } from '@/components/relatorios/SeletorRelatorio';

export const dynamic = 'force-dynamic';

async function getUsuarioEDados() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  // Buscar dados do usuário
  const usuarioResult = await pool.query(
    'SELECT id, nome, email, tipo_usuario, polo_id, escola_id FROM usuarios WHERE id = $1 AND ativo = true',
    [payload.userId]
  );

  if (usuarioResult.rows.length === 0) {
    return null;
  }

  const usuario = usuarioResult.rows[0];
  const tipoUsuario = usuario.tipo_usuario === 'administrador' ? 'admin' : usuario.tipo_usuario;

  // Buscar polos e escolas baseado nas permissões do usuário
  let polosQuery = 'SELECT id, nome FROM polos WHERE ativo = true ORDER BY nome';
  let escolasQuery = 'SELECT id, nome, polo_id FROM escolas WHERE ativo = true ORDER BY nome';

  if (usuario.tipo_usuario === 'polo') {
    polosQuery = `SELECT id, nome FROM polos WHERE id = $1 AND ativo = true`;
    escolasQuery = `SELECT id, nome, polo_id FROM escolas WHERE polo_id = $1 AND ativo = true ORDER BY nome`;
  } else if (usuario.tipo_usuario === 'escola') {
    escolasQuery = `SELECT id, nome, polo_id FROM escolas WHERE id = $1 AND ativo = true`;
    polosQuery = `SELECT p.id, p.nome FROM polos p INNER JOIN escolas e ON e.polo_id = p.id WHERE e.id = $1`;
  }

  let polosResult, escolasResult;

  if (usuario.tipo_usuario === 'polo') {
    [polosResult, escolasResult] = await Promise.all([
      pool.query(polosQuery, [usuario.polo_id]),
      pool.query(escolasQuery, [usuario.polo_id])
    ]);
  } else if (usuario.tipo_usuario === 'escola') {
    [polosResult, escolasResult] = await Promise.all([
      pool.query(polosQuery, [usuario.escola_id]),
      pool.query(escolasQuery, [usuario.escola_id])
    ]);
  } else {
    [polosResult, escolasResult] = await Promise.all([
      pool.query(polosQuery),
      pool.query(escolasQuery)
    ]);
  }

  return {
    usuario,
    tipoUsuario,
    polos: polosResult.rows,
    escolas: escolasResult.rows
  };
}

export default async function RelatoriosPage() {
  const dados = await getUsuarioEDados();

  if (!dados) {
    redirect('/login');
  }

  const { usuario, tipoUsuario, polos, escolas } = dados;
  const anoLetivo = new Date().getFullYear().toString();

  return (

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Relatórios
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Gere relatórios detalhados em PDF com análises e gráficos
          </p>
        </div>

        {/* Seletor de Relatório */}
        <div className="flex justify-center">
          <SeletorRelatorio
            polos={polos}
            escolas={escolas}
            anoLetivo={anoLetivo}
            tipoUsuario={tipoUsuario}
            poloIdUsuario={usuario.polo_id}
            escolaIdUsuario={usuario.escola_id}
          />
        </div>

        {/* Informações extras */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
              Dicas para gerar relatórios
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>• Relatórios são gerados com dados do ano letivo atual por padrão</li>
              <li>• Você pode filtrar por série específica para análises mais detalhadas</li>
              <li>• Relatórios de polo incluem ranking comparativo de todas as escolas</li>
              <li>• O download pode demorar alguns segundos dependendo do volume de dados</li>
            </ul>
          </div>
        </div>
      </div>

  );
}
