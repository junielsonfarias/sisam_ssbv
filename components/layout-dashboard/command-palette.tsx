'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, X, Database, BookOpen, Building2, Globe, Settings,
  ArrowLeftRight, CornerDownLeft, type LucideIcon,
} from 'lucide-react'
import * as offlineStorage from '@/lib/offline-storage'
import type { MenuItem } from './types'

interface CommandPaletteProps {
  aberto: boolean
  onFechar: () => void
  menuItems: MenuItem[]
  moduloAtivo: offlineStorage.ModuloAtivo
  usuario: offlineStorage.OfflineUser | null
  onTrocarModulo: (modulo: offlineStorage.ModuloAtivo) => void
}

type Item = {
  tipo: 'modulo' | 'pagina'
  label: string
  grupo?: string
  icon: LucideIcon
  acao: () => void
  ativo?: boolean
}

const MODULOS_META: Record<offlineStorage.ModuloAtivo, { label: string; Icon: LucideIcon; permissao: keyof offlineStorage.OfflineUser }> = {
  sisam: { label: 'SISAM — Avaliações', Icon: Database, permissao: 'acesso_sisam' },
  educatec: { label: 'SISAM — Avaliações', Icon: Database, permissao: 'acesso_sisam' },
  gestor: { label: 'Gestor Escolar', Icon: BookOpen, permissao: 'acesso_gestor' },
  semed: { label: 'SEMED — Programas & Recursos', Icon: Building2, permissao: 'acesso_semed' },
  transparencia: { label: 'Transparência — Site & Comunicação', Icon: Globe, permissao: 'acesso_transparencia' },
  admin: { label: 'Administração — Sistema & Segurança', Icon: Settings, permissao: 'acesso_admin' },
  professor: { label: 'Professor', Icon: BookOpen, permissao: 'acesso_sisam' },
  responsavel: { label: 'Responsável', Icon: BookOpen, permissao: 'acesso_sisam' },
}

const MODULOS_DISPONIVEIS: offlineStorage.ModuloAtivo[] = ['sisam', 'gestor', 'semed', 'transparencia', 'admin']

export function CommandPalette({ aberto, onFechar, menuItems, moduloAtivo, usuario, onTrocarModulo }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [indiceSelecionado, setIndiceSelecionado] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listaRef = useRef<HTMLDivElement>(null)

  // Lista completa de comandos disponíveis (módulos + páginas)
  const itens = useMemo<Item[]>(() => {
    const lista: Item[] = []

    // 1) Módulos — apenas os que o usuário tem acesso
    if (usuario) {
      for (const mod of MODULOS_DISPONIVEIS) {
        const meta = MODULOS_META[mod]
        const temAcesso = usuario[meta.permissao] === true || (mod === 'sisam' && usuario.acesso_sisam !== false)
        if (!temAcesso) continue
        lista.push({
          tipo: 'modulo',
          label: meta.label,
          icon: meta.Icon,
          ativo: mod === moduloAtivo || (mod === 'sisam' && moduloAtivo === 'educatec'),
          acao: () => {
            onTrocarModulo(mod)
            onFechar()
          },
        })
      }
    }

    // 2) Páginas — todas as folhas do menu atual
    function coletar(items: MenuItem[], grupoPai?: string) {
      for (const it of items) {
        if (it.children && it.children.length > 0) {
          coletar(it.children, it.label)
        } else if (it.href) {
          lista.push({
            tipo: 'pagina',
            label: it.label,
            grupo: grupoPai,
            icon: it.icon,
            acao: () => {
              router.push(it.href!)
              onFechar()
            },
          })
        }
      }
    }
    coletar(menuItems)

    return lista
  }, [usuario, moduloAtivo, menuItems, onFechar, onTrocarModulo, router])

  // Filtragem por query (case-insensitive, sem acentos)
  const normalizar = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

  const itensFiltrados = useMemo(() => {
    const q = normalizar(query.trim())
    if (!q) return itens
    return itens.filter((i) => {
      const tudo = normalizar(`${i.label} ${i.grupo || ''}`)
      return tudo.includes(q)
    })
  }, [itens, query])

  // Agrupar por tipo para renderização
  const grupos = useMemo(() => {
    const modulos = itensFiltrados.filter((i) => i.tipo === 'modulo')
    const paginas = itensFiltrados.filter((i) => i.tipo === 'pagina')
    return { modulos, paginas }
  }, [itensFiltrados])

  // Reset ao fechar/abrir
  useEffect(() => {
    if (aberto) {
      setQuery('')
      setIndiceSelecionado(0)
      // Focar input quando abrir (próximo tick)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [aberto])

  // Reset índice quando filtrar
  useEffect(() => {
    setIndiceSelecionado(0)
  }, [query])

  // Garantir que item selecionado fique visível
  useEffect(() => {
    if (!listaRef.current) return
    const item = listaRef.current.querySelector(`[data-idx="${indiceSelecionado}"]`)
    item?.scrollIntoView({ block: 'nearest' })
  }, [indiceSelecionado])

  // Navegação por teclado
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndiceSelecionado((i) => Math.min(i + 1, itensFiltrados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndiceSelecionado((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      itensFiltrados[indiceSelecionado]?.acao()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onFechar()
    }
  }

  if (!aberto) return null

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 flex items-start justify-center pt-[10vh] px-4 backdrop-blur-sm"
      onClick={onFechar}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-slate-700">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar módulo ou página..."
            className="flex-1 bg-transparent text-base text-gray-800 dark:text-gray-100 placeholder:text-gray-400 outline-none"
            autoComplete="off"
          />
          <button
            onClick={onFechar}
            className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista */}
        <div ref={listaRef} className="max-h-[60vh] overflow-y-auto py-2">
          {itensFiltrados.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhum resultado para &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {grupos.modulos.length > 0 && (
                <div>
                  <p className="px-4 pt-2 pb-1 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    Trocar de módulo
                  </p>
                  {grupos.modulos.map((item, idxLocal) => {
                    const idx = idxLocal
                    const Icon = item.icon
                    return (
                      <button
                        key={`mod-${item.label}`}
                        data-idx={idx}
                        onClick={item.acao}
                        onMouseEnter={() => setIndiceSelecionado(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm ${
                          indiceSelecionado === idx
                            ? 'bg-indigo-50 dark:bg-indigo-900/30'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                        <span className="flex-1 text-gray-800 dark:text-gray-200">{item.label}</span>
                        {item.ativo && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                            atual
                          </span>
                        )}
                        <ArrowLeftRight className="w-3 h-3 text-gray-400" />
                      </button>
                    )
                  })}
                </div>
              )}

              {grupos.paginas.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    Ir para página
                  </p>
                  {grupos.paginas.map((item, idxLocal) => {
                    const idx = grupos.modulos.length + idxLocal
                    const Icon = item.icon
                    return (
                      <button
                        key={`pag-${item.label}-${item.grupo || ''}`}
                        data-idx={idx}
                        onClick={item.acao}
                        onMouseEnter={() => setIndiceSelecionado(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm ${
                          indiceSelecionado === idx
                            ? 'bg-indigo-50 dark:bg-indigo-900/30'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                        <span className="flex-1 text-gray-700 dark:text-gray-300 truncate">{item.label}</span>
                        {item.grupo && (
                          <span className="text-[10px] text-gray-400 truncate max-w-[150px]">{item.grupo}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Rodapé com atalhos */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 text-[10px] text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono">↑↓</kbd> navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono">
                <CornerDownLeft className="w-2.5 h-2.5 inline" />
              </kbd> selecionar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono">esc</kbd> fechar
            </span>
          </div>
          <span className="opacity-60">{itensFiltrados.length} {itensFiltrados.length === 1 ? 'item' : 'itens'}</span>
        </div>
      </div>
    </div>
  )
}
