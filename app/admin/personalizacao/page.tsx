'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useEffect, useState } from 'react'
import { Settings, Image, Palette, Type, Link as LinkIcon, Save, Upload, X } from 'lucide-react'

interface Personalizacao {
  login_titulo: string
  login_subtitulo: string
  login_imagem_url: string | null
  login_cor_primaria: string
  login_cor_secundaria: string
  rodape_texto: string
  rodape_link: string | null
  rodape_link_texto: string | null
  rodape_ativo: boolean
}

export default function PersonalizacaoPage() {
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [formData, setFormData] = useState<Personalizacao>({
    login_titulo: 'SISAM',
    login_subtitulo: 'Sistema de Análise de Provas',
    login_imagem_url: null,
    login_cor_primaria: '#4f46e5',
    login_cor_secundaria: '#818cf8',
    rodape_texto: '© 2026 SISAM - Todos os direitos reservados',
    rodape_link: null,
    rodape_link_texto: null,
    rodape_ativo: true,
  })
  const [previewImagem, setPreviewImagem] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    carregarPersonalizacao()
  }, [])

  const carregarPersonalizacao = async () => {
    try {
      const response = await fetch('/api/admin/personalizacao')
      const data = await response.json()
      if (data) {
        setFormData({
          login_titulo: data.login_titulo || 'SISAM',
          login_subtitulo: data.login_subtitulo || 'Sistema de Análise de Provas',
          login_imagem_url: data.login_imagem_url || null,
          login_cor_primaria: data.login_cor_primaria || '#4f46e5',
          login_cor_secundaria: data.login_cor_secundaria || '#818cf8',
          rodape_texto: data.rodape_texto || '© 2026 SISAM - Todos os direitos reservados',
          rodape_link: data.rodape_link || null,
          rodape_link_texto: data.rodape_link_texto || null,
          rodape_ativo: data.rodape_ativo !== undefined ? data.rodape_ativo : true,
        })
        if (data.login_imagem_url) {
          setPreviewImagem(data.login_imagem_url)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar personalização:', error)
    } finally {
      setCarregando(false)
    }
  }

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      const response = await fetch('/api/admin/personalizacao', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        alert('Personalização salva com sucesso!')
      } else {
        alert(data.mensagem || 'Erro ao salvar personalização')
      }
    } catch (error) {
      console.error('Erro ao salvar personalização:', error)
      alert('Erro ao salvar personalização')
    } finally {
      setSalvando(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem')
      return
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB')
      return
    }

    setUploadingImage(true)

    try {
      // Converter para base64 para armazenar no banco
      // Em produção, considere usar um serviço de armazenamento (S3, Cloudinary, etc.)
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setFormData({ ...formData, login_imagem_url: base64String })
        setPreviewImagem(base64String)
        setUploadingImage(false)
      }
      reader.onerror = () => {
        alert('Erro ao ler a imagem')
        setUploadingImage(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error)
      alert('Erro ao fazer upload da imagem')
      setUploadingImage(false)
    }
  }

  const handleRemoverImagem = () => {
    setFormData({ ...formData, login_imagem_url: null })
    setPreviewImagem(null)
  }

  if (carregando) {
    return (
      <ProtectedRoute tiposPermitidos={['administrador']}>
        <LayoutDashboard tipoUsuario="admin">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </LayoutDashboard>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador']}>
      <LayoutDashboard tipoUsuario="admin">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Personalização do Sistema</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Configure a aparência da página de login e rodapé</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Seção: Personalização do Login */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="bg-indigo-100 p-1.5 sm:p-2 rounded-lg">
                  <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">Página de Login</h2>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {/* Título */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    <Type className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                    Título
                  </label>
                  <input
                    type="text"
                    value={formData.login_titulo}
                    onChange={(e) => setFormData({ ...formData, login_titulo: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="Ex: SISAM"
                  />
                </div>

                {/* Subtítulo */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    <Type className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                    Subtítulo
                  </label>
                  <textarea
                    value={formData.login_subtitulo}
                    onChange={(e) => setFormData({ ...formData, login_subtitulo: e.target.value })}
                    rows={2}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="Ex: Sistema de Análise de Provas"
                  />
                </div>

                {/* Imagem */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    <Image className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                    Imagem/Logo
                  </label>
                  {previewImagem ? (
                    <div className="relative">
                      <img
                        src={previewImagem}
                        alt="Preview"
                        className="w-full h-32 sm:h-48 object-contain border border-gray-300 dark:border-slate-600 rounded-lg mb-2 bg-gray-50"
                      />
                      <button
                        onClick={handleRemoverImagem}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-4 sm:p-6 text-center">
                      <Image className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs sm:text-sm text-gray-600 mb-2">Nenhuma imagem selecionada</p>
                      <label className="inline-block bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-indigo-700 cursor-pointer text-xs sm:text-sm">
                        <Upload className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                        Selecionar Imagem
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                      </label>
                    </div>
                  )}
                  {uploadingImage && (
                    <p className="text-xs sm:text-sm text-gray-500 mt-2">Carregando imagem...</p>
                  )}
                </div>

                {/* Cores */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      <Palette className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      Cor Primária
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.login_cor_primaria}
                        onChange={(e) => setFormData({ ...formData, login_cor_primaria: e.target.value })}
                        className="w-12 sm:w-16 h-8 sm:h-10 border border-gray-300 dark:border-slate-600 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.login_cor_primaria}
                        onChange={(e) => setFormData({ ...formData, login_cor_primaria: e.target.value })}
                        className="flex-1 px-2 sm:px-4 py-2 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                        placeholder="#4f46e5"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      <Palette className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      Cor Secundária
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.login_cor_secundaria}
                        onChange={(e) => setFormData({ ...formData, login_cor_secundaria: e.target.value })}
                        className="w-12 sm:w-16 h-8 sm:h-10 border border-gray-300 dark:border-slate-600 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.login_cor_secundaria}
                        onChange={(e) => setFormData({ ...formData, login_cor_secundaria: e.target.value })}
                        className="flex-1 px-2 sm:px-4 py-2 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                        placeholder="#818cf8"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção: Rodapé */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="bg-green-100 p-1.5 sm:p-2 rounded-lg">
                  <LinkIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">Rodapé do Sistema</h2>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {/* Texto do Rodapé */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    <Type className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                    Texto do Rodapé
                  </label>
                  <textarea
                    value={formData.rodape_texto}
                    onChange={(e) => setFormData({ ...formData, rodape_texto: e.target.value })}
                    rows={3}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="Ex: © 2026 SISAM - Todos os direitos reservados"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Este texto aparecerá no rodapé de todas as páginas do sistema
                  </p>
                </div>

                {/* Link do Rodapé */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    <LinkIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                    Link do Rodapé (opcional)
                  </label>
                  <input
                    type="url"
                    value={formData.rodape_link || ''}
                    onChange={(e) => setFormData({ ...formData, rodape_link: e.target.value || null })}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white mb-2"
                    placeholder="https://exemplo.com"
                  />
                  <input
                    type="text"
                    value={formData.rodape_link_texto || ''}
                    onChange={(e) => setFormData({ ...formData, rodape_link_texto: e.target.value || null })}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="Texto do link (ex: Visite nosso site)"
                  />
                </div>

                {/* Ativar/Desativar Rodapé */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.rodape_ativo}
                      onChange={(e) => setFormData({ ...formData, rodape_ativo: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-slate-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Exibir rodapé no sistema</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Botão Salvar */}
          <div className="flex justify-end">
            <button
              onClick={handleSalvar}
              disabled={salvando}
              className="w-full sm:w-auto bg-indigo-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-sm transition-colors text-sm sm:text-base"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5" />
              {salvando ? 'Salvando...' : 'Salvar Personalização'}
            </button>
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

