'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useEffect, useState, useRef } from 'react'
import { User, Mail, Shield, Building2, MapPin, Camera, Save, Lock, Eye, EyeOff, Check, X, Loader2, Edit2, Calendar } from 'lucide-react'

interface Perfil {
  id: string
  nome: string
  email: string
  tipo_usuario: string
  polo_id: string | null
  escola_id: string | null
  foto_url: string | null
  polo_nome: string | null
  escola_nome: string | null
  criado_em: string
}

export default function PerfilPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [salvandoEmail, setSalvandoEmail] = useState(false)
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [salvandoFoto, setSalvandoFoto] = useState(false)

  // Estados para edição de nome
  const [editandoNome, setEditandoNome] = useState(false)
  const [novoNome, setNovoNome] = useState('')

  // Estados para edição de email
  const [editandoEmail, setEditandoEmail] = useState(false)
  const [novoEmail, setNovoEmail] = useState('')
  const [senhaParaEmail, setSenhaParaEmail] = useState('')

  // Estados para alteração de senha
  const [mostrarFormSenha, setMostrarFormSenha] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false)
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)
  const [mostrarSenhaEmail, setMostrarSenhaEmail] = useState(false)

  // Estados para mensagens
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null)

  // Ref para input de arquivo
  const inputFotoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    carregarPerfil()
  }, [])

  const carregarPerfil = async () => {
    try {
      setCarregando(true)
      const response = await fetch('/api/perfil')

      if (!response.ok) {
        throw new Error('Erro ao carregar perfil')
      }

      const data = await response.json()
      setPerfil(data)
      setNovoNome(data.nome)
      setNovoEmail(data.email)
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
      mostrarMensagem('erro', 'Erro ao carregar dados do perfil')
    } finally {
      setCarregando(false)
    }
  }

  const mostrarMensagem = (tipo: 'sucesso' | 'erro', texto: string) => {
    setMensagem({ tipo, texto })
    setTimeout(() => setMensagem(null), 5000)
  }

  const salvarNome = async () => {
    if (!novoNome.trim() || novoNome.trim().length < 3) {
      mostrarMensagem('erro', 'Nome deve ter pelo menos 3 caracteres')
      return
    }

    try {
      setSalvandoNome(true)
      const response = await fetch('/api/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoNome.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.mensagem || 'Erro ao salvar nome')
      }

      setPerfil(prev => prev ? { ...prev, nome: novoNome.trim() } : null)
      setEditandoNome(false)
      mostrarMensagem('sucesso', 'Nome atualizado com sucesso!')
    } catch (error: any) {
      mostrarMensagem('erro', error.message || 'Erro ao salvar nome')
    } finally {
      setSalvandoNome(false)
    }
  }

  const salvarEmail = async () => {
    if (!novoEmail.trim()) {
      mostrarMensagem('erro', 'Email é obrigatório')
      return
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(novoEmail.trim())) {
      mostrarMensagem('erro', 'Email inválido')
      return
    }

    if (!senhaParaEmail) {
      mostrarMensagem('erro', 'Digite sua senha atual para confirmar a alteração')
      return
    }

    try {
      setSalvandoEmail(true)
      const response = await fetch('/api/perfil/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novoEmail: novoEmail.trim(),
          senhaAtual: senhaParaEmail
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.mensagem || 'Erro ao salvar email')
      }

      setPerfil(prev => prev ? { ...prev, email: novoEmail.trim() } : null)
      setEditandoEmail(false)
      setSenhaParaEmail('')
      mostrarMensagem('sucesso', 'Email atualizado com sucesso!')
    } catch (error: any) {
      mostrarMensagem('erro', error.message || 'Erro ao salvar email')
    } finally {
      setSalvandoEmail(false)
    }
  }

  const alterarSenha = async () => {
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      mostrarMensagem('erro', 'Preencha todos os campos')
      return
    }

    if (novaSenha.length < 6) {
      mostrarMensagem('erro', 'A nova senha deve ter pelo menos 6 caracteres')
      return
    }

    if (novaSenha !== confirmarSenha) {
      mostrarMensagem('erro', 'A nova senha e a confirmação não coincidem')
      return
    }

    try {
      setSalvandoSenha(true)
      const response = await fetch('/api/perfil/senha', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senhaAtual, novaSenha, confirmarSenha })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.mensagem || 'Erro ao alterar senha')
      }

      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarSenha('')
      setMostrarFormSenha(false)
      mostrarMensagem('sucesso', 'Senha alterada com sucesso!')
    } catch (error: any) {
      mostrarMensagem('erro', error.message || 'Erro ao alterar senha')
    } finally {
      setSalvandoSenha(false)
    }
  }

  const handleFotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      mostrarMensagem('erro', 'Selecione um arquivo de imagem válido')
      return
    }

    // Validar tamanho (máximo 500KB)
    if (file.size > 500 * 1024) {
      mostrarMensagem('erro', 'Imagem muito grande. Máximo: 500KB')
      return
    }

    try {
      setSalvandoFoto(true)

      // Converter para base64
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target?.result as string

        const response = await fetch('/api/perfil/foto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ foto_base64: base64 })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.mensagem || 'Erro ao salvar foto')
        }

        setPerfil(prev => prev ? { ...prev, foto_url: data.foto_url } : null)
        mostrarMensagem('sucesso', 'Foto atualizada com sucesso!')
        setSalvandoFoto(false)
      }
      reader.onerror = () => {
        mostrarMensagem('erro', 'Erro ao ler arquivo')
        setSalvandoFoto(false)
      }
      reader.readAsDataURL(file)
    } catch (error: any) {
      mostrarMensagem('erro', error.message || 'Erro ao salvar foto')
      setSalvandoFoto(false)
    }
  }

  const removerFoto = async () => {
    try {
      setSalvandoFoto(true)
      const response = await fetch('/api/perfil/foto', { method: 'DELETE' })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.mensagem || 'Erro ao remover foto')
      }

      setPerfil(prev => prev ? { ...prev, foto_url: null } : null)
      mostrarMensagem('sucesso', 'Foto removida com sucesso!')
    } catch (error: any) {
      mostrarMensagem('erro', error.message || 'Erro ao remover foto')
    } finally {
      setSalvandoFoto(false)
    }
  }

  const getTipoUsuarioLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      administrador: 'Administrador',
      tecnico: 'Tecnico',
      polo: 'Gestor de Polo',
      escola: 'Gestor de Escola'
    }
    return labels[tipo] || tipo
  }

  const getTipoUsuarioColor = (tipo: string) => {
    const colors: Record<string, string> = {
      administrador: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800',
      tecnico: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
      polo: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800',
      escola: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800'
    }
    return colors[tipo] || 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-slate-600'
  }

  // Determinar o tipo de usuário para o layout
  const tipoLayout = perfil?.tipo_usuario === 'administrador' ? 'admin' : (perfil?.tipo_usuario || 'admin')

  if (carregando) {
    return (
      <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo', 'escola']}>
        <LayoutDashboard tipoUsuario={tipoLayout}>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
              <p className="text-gray-600 dark:text-gray-400">Carregando perfil...</p>
            </div>
          </div>
        </LayoutDashboard>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo', 'escola']}>
      <LayoutDashboard tipoUsuario={tipoLayout}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-6">Meu Perfil</h1>

          {/* Mensagem de feedback */}
          {mensagem && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
              mensagem.tipo === 'sucesso' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
            }`}>
              {mensagem.tipo === 'sucesso' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
              {mensagem.texto}
            </div>
          )}

          <div className="grid gap-6">
            {/* Card de Foto e Informações Básicas */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-slate-900/50 border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                {/* Foto de Perfil */}
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center border-4 border-indigo-100 dark:border-indigo-900/50">
                    {perfil?.foto_url ? (
                      <img
                        src={perfil.foto_url}
                        alt="Foto de perfil"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>

                  {/* Botão de upload */}
                  <button
                    onClick={() => inputFotoRef.current?.click()}
                    disabled={salvandoFoto}
                    className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-lg disabled:opacity-50"
                    title="Alterar foto"
                  >
                    {salvandoFoto ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    ref={inputFotoRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFotoChange}
                    className="hidden"
                  />
                </div>

                {/* Informações */}
                <div className="flex-1 text-center sm:text-left">
                  {/* Nome */}
                  <div className="mb-4">
                    {editandoNome ? (
                      <div className="flex flex-col sm:flex-row gap-2 items-center">
                        <input
                          type="text"
                          value={novoNome}
                          onChange={(e) => setNovoNome(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-semibold w-full sm:w-auto"
                          placeholder="Seu nome"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={salvarNome}
                            disabled={salvandoNome}
                            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            {salvandoNome ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                          </button>
                          <button
                            onClick={() => {
                              setEditandoNome(false)
                              setNovoNome(perfil?.nome || '')
                            }}
                            className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <h2 className="text-2xl font-bold text-gray-800">{perfil?.nome}</h2>
                        <button
                          onClick={() => setEditandoNome(true)}
                          className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Editar nome"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Badge de tipo */}
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getTipoUsuarioColor(perfil?.tipo_usuario || '')}`}>
                    <Shield className="w-4 h-4 mr-1.5" />
                    {getTipoUsuarioLabel(perfil?.tipo_usuario || '')}
                  </span>

                  {/* Botão remover foto */}
                  {perfil?.foto_url && (
                    <button
                      onClick={removerFoto}
                      disabled={salvandoFoto}
                      className="mt-4 block text-sm text-red-600 hover:text-red-700 underline disabled:opacity-50"
                    >
                      Remover foto
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Card de Informações da Conta */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                Informacoes da Conta
              </h3>

              <div className="grid gap-4">
                {/* Email */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Mail className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email de Acesso</p>
                        {editandoEmail ? (
                          <div className="mt-2 space-y-3">
                            <input
                              type="email"
                              value={novoEmail}
                              onChange={(e) => setNovoEmail(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                              placeholder="Novo email"
                            />
                            <div className="relative">
                              <input
                                type={mostrarSenhaEmail ? 'text' : 'password'}
                                value={senhaParaEmail}
                                onChange={(e) => setSenhaParaEmail(e.target.value)}
                                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                placeholder="Senha atual para confirmar"
                              />
                              <button
                                type="button"
                                onClick={() => setMostrarSenhaEmail(!mostrarSenhaEmail)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {mostrarSenhaEmail ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={salvarEmail}
                                disabled={salvandoEmail}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                              >
                                {salvandoEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Salvar
                              </button>
                              <button
                                onClick={() => {
                                  setEditandoEmail(false)
                                  setNovoEmail(perfil?.email || '')
                                  setSenhaParaEmail('')
                                }}
                                className="px-3 py-1.5 bg-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-300"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-800 font-medium mt-0.5">{perfil?.email}</p>
                        )}
                      </div>
                    </div>
                    {!editandoEmail && (
                      <button
                        onClick={() => setEditandoEmail(true)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Alterar email"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Tipo de Acesso */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Shield className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tipo de Acesso</p>
                      <p className="text-gray-800 font-medium mt-0.5">{getTipoUsuarioLabel(perfil?.tipo_usuario || '')}</p>
                    </div>
                  </div>
                </div>

                {/* Vínculos */}
                {(perfil?.polo_nome || perfil?.escola_nome) && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Vinculos de Acesso</p>
                    <div className="space-y-3">
                      {perfil?.polo_nome && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <MapPin className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Polo</p>
                            <p className="text-gray-800 font-medium">{perfil.polo_nome}</p>
                          </div>
                        </div>
                      )}
                      {perfil?.escola_nome && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            <Building2 className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Escola</p>
                            <p className="text-gray-800 font-medium">{perfil.escola_nome}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Data de criação */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-200 rounded-lg">
                      <Calendar className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Membro desde</p>
                      <p className="text-gray-800 font-medium mt-0.5">
                        {perfil?.criado_em ? new Date(perfil.criado_em).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        }) : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card de Segurança */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-600" />
                  Seguranca
                </h3>
                {!mostrarFormSenha && (
                  <button
                    onClick={() => setMostrarFormSenha(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                  >
                    <Lock className="w-4 h-4" />
                    Alterar Senha
                  </button>
                )}
              </div>

              {mostrarFormSenha && (
                <div className="space-y-4">
                  {/* Senha Atual */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Senha Atual
                    </label>
                    <div className="relative">
                      <input
                        type={mostrarSenhaAtual ? 'text' : 'password'}
                        value={senhaAtual}
                        onChange={(e) => setSenhaAtual(e.target.value)}
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Digite sua senha atual"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarSenhaAtual(!mostrarSenhaAtual)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {mostrarSenhaAtual ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Nova Senha */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nova Senha
                    </label>
                    <div className="relative">
                      <input
                        type={mostrarNovaSenha ? 'text' : 'password'}
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Digite sua nova senha (min. 6 caracteres)"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {mostrarNovaSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmar Nova Senha */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmar Nova Senha
                    </label>
                    <div className="relative">
                      <input
                        type={mostrarConfirmarSenha ? 'text' : 'password'}
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Confirme sua nova senha"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {mostrarConfirmarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Botões */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={alterarSenha}
                      disabled={salvandoSenha}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {salvandoSenha ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          Salvar Nova Senha
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setMostrarFormSenha(false)
                        setSenhaAtual('')
                        setNovaSenha('')
                        setConfirmarSenha('')
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {!mostrarFormSenha && (
                <p className="text-sm text-gray-500">
                  Recomendamos alterar sua senha periodicamente para manter sua conta segura.
                </p>
              )}
            </div>
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}
