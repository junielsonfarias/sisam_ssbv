import type { Usuario } from '@/lib/types'

/**
 * Módulos disponíveis no SISAM (Pt.2).
 * - `sisam`: avaliações, resultados, dashboard pedagógico (legado, padrão)
 * - `gestor`: Gestor Escolar (cadastros, habilitação por escola)
 * - `semed`: SEMED — Programas e Recursos (FICAI, PNAE, PNATE, PNLD, PDDE,
 *   Bolsa Família, AEE, RH, Patrimônio, Biblioteca, Ordens de Serviço)
 * - `transparencia`: Portal Transparência + Site institucional
 * - `admin`: Administração — Usuários, Segurança, Configurações, Logs
 */
export type Modulo = 'sisam' | 'gestor' | 'semed' | 'transparencia' | 'admin'

/**
 * Verifica se o usuário tem permissão para acessar o módulo informado.
 *
 * Default para retrocompatibilidade:
 * - `sisam` é true a menos que explicitamente false (módulo padrão histórico).
 * - Demais são false a menos que explicitamente true (opt-in).
 *
 * USADO POR:
 *  - `withAuthModulo(...)` no backend
 *  - `<ProtectedRoute requerModulo="...">` no frontend
 *
 * CONTEXTO (auditoria 30/05/2026):
 * Antes desta função, `acesso_*` era populado no JWT mas NUNCA validado.
 * Usuário com `acesso_semed=false` podia digitar `/admin/ficai` direto
 * na URL e passar — ProtectedRoute só checava `tipos_permitidos` e o
 * tipo (admin/tecnico) era permitido. A coluna era cosmética.
 */
export function validarModulo(usuario: Pick<Usuario, 'acesso_sisam' | 'acesso_gestor' | 'acesso_semed' | 'acesso_transparencia' | 'acesso_admin' | 'tipo_usuario'>, modulo: Modulo): boolean {
  // Administradores plenos acessam tudo — fallback de segurança para nao
  // travar sistema apos rollout (admin que esqueceu de marcar acesso_*).
  if (usuario.tipo_usuario === 'administrador') return true

  switch (modulo) {
    case 'sisam':         return usuario.acesso_sisam !== false
    case 'gestor':        return usuario.acesso_gestor === true
    case 'semed':         return usuario.acesso_semed === true
    case 'transparencia': return usuario.acesso_transparencia === true
    case 'admin':         return usuario.acesso_admin === true
  }
}
