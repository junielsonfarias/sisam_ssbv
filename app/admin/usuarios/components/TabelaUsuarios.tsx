'use client'

import { Edit, Trash2, Users, ToggleLeft, ToggleRight } from 'lucide-react'
import { TipoUsuario } from '@/lib/types'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Usuario {
  id: string
  nome: string
  email: string
  tipo_usuario: TipoUsuario
  polo_id: string | null
  escola_id: string | null
  ativo: boolean
}

interface TabelaUsuariosProps {
  usuarios: Usuario[]
  carregando: boolean
  getTipoColor: (tipo: TipoUsuario | string) => string
  getTipoLabel: (tipo: TipoUsuario | string) => string
  getPoloNome: (poloId: string | null) => string
  getEscolaNome: (escolaId: string | null) => string
  onEditar: (usuario: Usuario) => void
  onExcluir: (usuario: Usuario) => void
  onToggleAtivo: (usuario: Usuario) => void
}

export default function TabelaUsuarios({
  usuarios, carregando,
  getTipoColor, getTipoLabel, getPoloNome, getEscolaNome,
  onEditar, onExcluir, onToggleAtivo,
}: TabelaUsuariosProps) {
  if (carregando) {
    return <LoadingSpinner text="Carregando usuarios..." centered />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] sm:min-w-[500px] md:min-w-[600px]">
        <thead className="bg-gray-50 dark:bg-slate-700">
          <tr>
            <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">
              Usuario
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider hidden lg:table-cell">
              Email
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">
              Tipo
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider hidden md:table-cell">
              Vinculo
            </th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">
              Status
            </th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">
              Acoes
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
          {usuarios.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-12 text-center text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-lg font-medium">Nenhum usuario encontrado</p>
                <p className="text-sm">Tente ajustar os filtros de busca</p>
              </td>
            </tr>
          ) : (
            usuarios.map((usuario) => (
              <tr key={usuario.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${!usuario.ativo ? 'opacity-60' : ''}`}>
                <td className="py-3 px-4">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${usuario.ativo ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-gray-200 dark:bg-gray-700'}`}>
                      <Users className={`w-5 h-5 ${usuario.ativo ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium text-gray-900 dark:text-white text-sm block truncate">{usuario.nome}</span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs lg:hidden block truncate">{usuario.email}</span>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 hidden lg:table-cell">
                  <span className="text-gray-600 dark:text-gray-300 text-sm">{usuario.email}</span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getTipoColor(usuario.tipo_usuario)}`}>
                    {getTipoLabel(usuario.tipo_usuario)}
                  </span>
                </td>
                <td className="py-3 px-4 hidden md:table-cell">
                  <span className="text-gray-600 dark:text-gray-300 text-sm">
                    {usuario.tipo_usuario === 'polo' && usuario.polo_id && getPoloNome(usuario.polo_id)}
                    {usuario.tipo_usuario === 'escola' && usuario.escola_id && getEscolaNome(usuario.escola_id)}
                    {(usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico') && '-'}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => onToggleAtivo(usuario)}
                    className="group"
                    title={usuario.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                  >
                    {usuario.ativo ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 group-hover:bg-green-200 dark:group-hover:bg-green-900 transition-colors">
                        <ToggleRight className="w-4 h-4" />
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 group-hover:bg-red-200 dark:group-hover:bg-red-900 transition-colors">
                        <ToggleLeft className="w-4 h-4" />
                        Inativo
                      </span>
                    )}
                  </button>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEditar(usuario)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                      title="Editar usuario"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onExcluir(usuario)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Excluir usuario"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
