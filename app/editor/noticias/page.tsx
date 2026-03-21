'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, AlertTriangle, Newspaper, Eye, Calendar, GripVertical } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'

interface Noticia {
  titulo: string
  resumo: string
  conteudo: string
  data: string
  imagem_url: string | null
  link: string | null
}

function GerenciarNoticias() {
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    fetchNoticias()
  }, [])

  const fetchNoticias = async () => {
    try {
      const res = await fetch('/api/editor/noticias')
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json()
      setTitulo(data.titulo || '')
      setDescricao(data.descricao || '')
      setNoticias(data.noticias || [])
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  const adicionarNoticia = () => {
    setNoticias(prev => [{
      titulo: '',
      resumo: '',
      conteudo: '',
      data: new Date().toISOString().split('T')[0],
      imagem_url: null,
      link: null,
    }, ...prev])
  }

  const removerNoticia = (index: number) => {
    if (!confirm('Remover esta notícia?')) return
    setNoticias(prev => prev.filter((_, i) => i !== index))
  }

  const atualizarNoticia = (index: number, campo: keyof Noticia, valor: string) => {
    setNoticias(prev => prev.map((n, i) => i === index ? { ...n, [campo]: valor } : n))
  }

  const salvar = async () => {
    // Validar que todas têm título
    const semTitulo = noticias.some(n => !n.titulo.trim())
    if (semTitulo) {
      setErro('Todas as notícias precisam ter um título')
      return
    }

    setSalvando(true)
    setMensagem('')
    setErro('')
    try {
      const res = await fetch('/api/editor/noticias', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, descricao, noticias }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.mensagem)
      setMensagem(data.mensagem)
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciar Notícias</h1>
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciar Notícias</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {noticias.length} notícia(s) no site institucional
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200"
          >
            <Eye className="h-4 w-4" />
            Ver Site
          </a>
          <button
            onClick={adicionarNoticia}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm"
          >
            <Plus className="h-4 w-4" />
            Nova Notícia
          </button>
        </div>
      </div>

      {/* Config da seção */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Configuração da Seção</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Título da seção</label>
            <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Notícias e Eventos"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Descrição</label>
            <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Fique por dentro..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
          </div>
        </div>
      </div>

      {/* Mensagens */}
      {mensagem && <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm">{mensagem}</div>}
      {erro && <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{erro}</div>}

      {/* Lista de notícias */}
      {noticias.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center border border-gray-200 dark:border-gray-700">
          <Newspaper className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">Nenhuma notícia publicada</p>
          <button onClick={adicionarNoticia} className="text-pink-600 hover:underline text-sm">
            Criar primeira notícia
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {noticias.map((noticia, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Header da notícia */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {noticia.titulo || `Notícia ${index + 1}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="h-3 w-3" />
                    {noticia.data}
                  </div>
                  <button
                    onClick={() => removerNoticia(index)}
                    className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Campos */}
              <div className="p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Título *</label>
                    <input
                      type="text"
                      value={noticia.titulo}
                      onChange={e => atualizarNoticia(index, 'titulo', e.target.value)}
                      placeholder="Título da notícia"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Data</label>
                    <input
                      type="date"
                      value={noticia.data}
                      onChange={e => atualizarNoticia(index, 'data', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Resumo (exibido na listagem)</label>
                  <textarea
                    value={noticia.resumo}
                    onChange={e => atualizarNoticia(index, 'resumo', e.target.value)}
                    rows={2}
                    placeholder="Resumo breve da notícia..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Conteúdo completo</label>
                  <textarea
                    value={noticia.conteudo}
                    onChange={e => atualizarNoticia(index, 'conteudo', e.target.value)}
                    rows={4}
                    placeholder="Texto completo da notícia..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">URL da imagem (opcional)</label>
                    <input
                      type="url"
                      value={noticia.imagem_url || ''}
                      onChange={e => atualizarNoticia(index, 'imagem_url', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Link externo (opcional)</label>
                    <input
                      type="url"
                      value={noticia.link || ''}
                      onChange={e => atualizarNoticia(index, 'link', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botão salvar fixo */}
      {noticias.length > 0 && (
        <div className="sticky bottom-4">
          <button
            onClick={salvar}
            disabled={salvando}
            className="w-full py-3 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
          >
            <Save className="h-4 w-4" />
            {salvando ? 'Salvando...' : `Publicar ${noticias.length} Notícia(s)`}
          </button>
        </div>
      )}
    </div>
  )
}

export default function NoticiasEditorPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'editor']}>
      <GerenciarNoticias />
    </ProtectedRoute>
  )
}
