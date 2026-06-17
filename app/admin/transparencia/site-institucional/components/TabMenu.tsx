'use client'

import { useState } from 'react'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Link as LinkIcon, ExternalLink } from 'lucide-react'
import { TabProps, inputClass, labelClass } from './types'

interface MenuItem {
  label: string
  href: string
  ordem: number
  visivel: boolean
  abrir_nova_aba: boolean
  children: SubMenuItem[]
}

interface SubMenuItem {
  label: string
  href: string
  ordem: number
  visivel: boolean
  abrir_nova_aba: boolean
}

const menuItemTemplate: MenuItem = {
  label: '',
  href: '#',
  ordem: 0,
  visivel: true,
  abrir_nova_aba: false,
  children: [],
}

const subMenuItemTemplate: SubMenuItem = {
  label: '',
  href: '#',
  ordem: 0,
  visivel: true,
  abrir_nova_aba: false,
}

export function TabMenu({ formData, updateField }: TabProps) {
  const [expandido, setExpandido] = useState<number | null>(null)
  const items: MenuItem[] = formData.items || []

  // Logos config
  const logoSemed = formData.logo_semed_url || '/'
  const logoPrefeitura = formData.logo_prefeitura_url || 'https://saosebastiaodaboavista.pa.gov.br'

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items]
    ;(updated[index] as any)[field] = value
    updateField('items', updated)
  }

  const updateSubItem = (parentIdx: number, childIdx: number, field: string, value: any) => {
    const updated = [...items]
    ;(updated[parentIdx].children[childIdx] as any)[field] = value
    updateField('items', updated)
  }

  const addMenuItem = () => {
    const updated = [...items, { ...menuItemTemplate, ordem: items.length }]
    updateField('items', updated)
    setExpandido(updated.length - 1)
  }

  const removeMenuItem = (index: number) => {
    if (items.length <= 1) return
    const updated = items.filter((_, i) => i !== index)
    updated.forEach((item, i) => item.ordem = i)
    updateField('items', updated)
    setExpandido(null)
  }

  const addSubMenuItem = (parentIdx: number) => {
    const updated = [...items]
    updated[parentIdx].children = [
      ...(updated[parentIdx].children || []),
      { ...subMenuItemTemplate, ordem: updated[parentIdx].children.length },
    ]
    updateField('items', updated)
  }

  const removeSubMenuItem = (parentIdx: number, childIdx: number) => {
    const updated = [...items]
    updated[parentIdx].children = updated[parentIdx].children.filter((_, i) => i !== childIdx)
    updated[parentIdx].children.forEach((item, i) => item.ordem = i)
    updateField('items', updated)
  }

  const moverItem = (index: number, direcao: 'cima' | 'baixo') => {
    if (direcao === 'cima' && index === 0) return
    if (direcao === 'baixo' && index === items.length - 1) return
    const updated = [...items]
    const target = direcao === 'cima' ? index - 1 : index + 1
    ;[updated[index], updated[target]] = [updated[target], updated[index]]
    updated.forEach((item, i) => item.ordem = i)
    updateField('items', updated)
    setExpandido(target)
  }

  const moverSubItem = (parentIdx: number, childIdx: number, direcao: 'cima' | 'baixo') => {
    const children = items[parentIdx].children
    if (direcao === 'cima' && childIdx === 0) return
    if (direcao === 'baixo' && childIdx === children.length - 1) return
    const updated = [...items]
    const target = direcao === 'cima' ? childIdx - 1 : childIdx + 1
    ;[updated[parentIdx].children[childIdx], updated[parentIdx].children[target]] =
      [updated[parentIdx].children[target], updated[parentIdx].children[childIdx]]
    updated[parentIdx].children.forEach((item, i) => item.ordem = i)
    updateField('items', updated)
  }

  return (
    <div className="space-y-6">
      {/* Seção: URLs das Logos */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-indigo-500" />
          Links das Logos (clique redireciona)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Logo SEMED — URL de destino</label>
            <input
              type="text"
              value={logoSemed}
              onChange={(e) => updateField('logo_semed_url', e.target.value)}
              className={inputClass}
              placeholder="/ (página inicial)"
            />
            <p className="text-[11px] text-gray-400 mt-1">Ao clicar na logo da SEMED, abre este link</p>
          </div>
          <div>
            <label className={labelClass}>Logo Prefeitura — URL de destino</label>
            <input
              type="text"
              value={logoPrefeitura}
              onChange={(e) => updateField('logo_prefeitura_url', e.target.value)}
              className={inputClass}
              placeholder="https://saosebastiaodaboavista.pa.gov.br"
            />
            <p className="text-[11px] text-gray-400 mt-1">Ao clicar na logo da Prefeitura, abre este link</p>
          </div>
        </div>
      </div>

      {/* Separador */}
      <hr className="border-gray-200 dark:border-slate-700" />

      {/* Seção: Itens do Menu */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-indigo-500" />
            Itens do Menu ({items.length})
          </h3>
          <button
            onClick={addMenuItem}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Item
          </button>
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className={`border rounded-lg transition-all ${
                expandido === idx
                  ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10'
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'
              }`}
            >
              {/* Cabeçalho do item */}
              <div className="flex items-center gap-2 px-3 py-2">
                {/* Ordem */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moverItem(idx, 'cima')}
                    disabled={idx === 0}
                    className="p-0.5 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Mover para cima"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moverItem(idx, 'baixo')}
                    disabled={idx === items.length - 1}
                    className="p-0.5 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Mover para baixo"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Número da ordem */}
                <span className="text-xs font-mono text-gray-400 w-5 text-center">{idx + 1}</span>

                {/* Label preview */}
                <span className="flex-1 text-sm font-medium text-gray-800 dark:text-white truncate">
                  {item.label || '(sem título)'}
                </span>

                {/* Badge de submenus */}
                {item.children?.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold">
                    {item.children.length} sub
                  </span>
                )}

                {/* Visibilidade */}
                <button
                  onClick={() => updateItem(idx, 'visivel', !item.visivel)}
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    item.visivel
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-400'
                  }`}
                >
                  {item.visivel ? 'Visível' : 'Oculto'}
                </button>

                {/* Expandir/Recolher */}
                <button
                  onClick={() => setExpandido(expandido === idx ? null : idx)}
                  className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                  title={expandido === idx ? 'Recolher' : 'Expandir'}
                >
                  {expandido === idx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {/* Remover */}
                <button
                  onClick={() => removeMenuItem(idx)}
                  disabled={items.length <= 1}
                  className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Remover item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Campos expandidos */}
              {expandido === idx && (
                <div className="px-3 pb-3 border-t border-gray-100 dark:border-slate-700 pt-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Título do menu</label>
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => updateItem(idx, 'label', e.target.value)}
                        className={inputClass}
                        placeholder="Ex: Sobre, Serviços"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Link (href)</label>
                      <input
                        type="text"
                        value={item.href}
                        onChange={(e) => updateItem(idx, 'href', e.target.value)}
                        className={inputClass}
                        placeholder="Ex: #sobre, /pagina, https://..."
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={item.abrir_nova_aba}
                      onChange={(e) => updateItem(idx, 'abrir_nova_aba', e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Abrir em nova aba
                    <ExternalLink className="w-3 h-3" />
                  </label>

                  {/* Submenus */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Submenus ({item.children?.length || 0})
                      </span>
                      <button
                        onClick={() => addSubMenuItem(idx)}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded hover:bg-blue-100 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Submenu
                      </button>
                    </div>

                    {item.children?.length > 0 && (
                      <div className="space-y-2 ml-4 border-l-2 border-indigo-200 dark:border-indigo-800 pl-3">
                        {item.children.map((sub, sIdx) => (
                          <div key={sIdx} className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 p-2">
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => moverSubItem(idx, sIdx, 'cima')}
                                disabled={sIdx === 0}
                                className="p-0.5 text-gray-400 hover:text-indigo-600 disabled:opacity-30"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => moverSubItem(idx, sIdx, 'baixo')}
                                disabled={sIdx === item.children.length - 1}
                                className="p-0.5 text-gray-400 hover:text-indigo-600 disabled:opacity-30"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={sub.label}
                              onChange={(e) => updateSubItem(idx, sIdx, 'label', e.target.value)}
                              className="flex-1 rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-xs text-gray-900 dark:text-white"
                              placeholder="Título"
                            />
                            <input
                              type="text"
                              value={sub.href}
                              onChange={(e) => updateSubItem(idx, sIdx, 'href', e.target.value)}
                              className="flex-1 rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-xs text-gray-900 dark:text-white"
                              placeholder="/link"
                            />
                            <button
                              onClick={() => updateSubItem(idx, sIdx, 'visivel', !sub.visivel)}
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                                sub.visivel
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                  : 'bg-gray-100 dark:bg-slate-700 text-gray-400'
                              }`}
                            >
                              {sub.visivel ? '✓' : '—'}
                            </button>
                            <button
                              onClick={() => removeSubMenuItem(idx, sIdx)}
                              className="p-1 text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dica */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
        <strong>Dica:</strong> Use <code>#secao</code> para links internos da página (ex: <code>#sobre</code>, <code>#contato</code>),
        <code>/caminho</code> para páginas do sistema (ex: <code>/boletim</code>),
        ou URLs completas para sites externos (ex: <code>https://...</code>).
      </div>
    </div>
  )
}
