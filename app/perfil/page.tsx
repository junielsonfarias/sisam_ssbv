'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import { User, Shield, Building2, MapPin, Loader2, Check, X, Calendar } from 'lucide-react'
import SecaoFoto from './components/SecaoFoto'
import SecaoNome from './components/SecaoNome'
import SecaoEmail from './components/SecaoEmail'
import SecaoSenha from './components/SecaoSenha'

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
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null)

  useEffect(() => { carregarPerfil() }, [])

  const carregarPerfil = async () => {
    try {
      setCarregando(true)
      const response = await fetch('/api/perfil')
      if (!response.ok) throw new Error('Erro ao carregar perfil')
      const data = await response.json()
      setPerfil(data)
    } catch (error) {
      mostrarMensagem('erro', 'Erro ao carregar dados do perfil')
    } finally {
      setCarregando(false)
    }
  }

  const mostrarMensagem = (tipo: 'sucesso' | 'erro', texto: string) => {
    setMensagem({ tipo, texto })
    setTimeout(() => setMensagem(null), 5000)
  }

  const salvarNome = async (novoNome: string) => {
    if (!novoNome.trim() || novoNome.trim().length < 3) {
      mostrarMensagem('erro', 'Nome deve ter pelo menos 3 caracteres')
      return
    }
    try {
      setSalvandoNome(true)
      const response = await fetch('/api/perfil', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoNome.trim() })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.mensagem || 'Erro ao salvar nome')
      setPerfil(prev => prev ? { ...prev, nome: novoNome.trim() } : null)
      mostrarMensagem('sucesso', 'Nome atualizado com sucesso!')
    } catch (error: any) {
      mostrarMensagem('erro', error.message || 'Erro ao salvar nome')
    } finally {
      setSalvandoNome(false)
    }
  }

  const salvarEmail = async (novoEmail: string, senhaAtual: string) => {
    if (!novoEmail.trim()) { mostrarMensagem('erro', 'Email é obrigatório'); return }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(novoEmail.trim())) { mostrarMensagem('erro', 'Email inválido'); return }
    if (!senhaAtual) { mostrarMensagem('erro', 'Digite sua senha atual para confirmar a alteração'); return }
    try {
      setSalvandoEmail(true)
      const response = await fetch('/api/perfil/email', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novoEmail: novoEmail.trim(), senhaAtual })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.mensagem || 'Erro ao salvar email')
      setPerfil(prev => prev ? { ...prev, email: novoEmail.trim() } : null)
      mostrarMensagem('sucesso', 'Email atualizado com sucesso!')
    } catch (error: any) {
      mostrarMensagem('erro', error.message || 'Erro ao salvar email')
    } finally {
      setSalvandoEmail(false)
    }
  }

  const alterarSenha = async (senhaAtual: string, novaSenha: string, confirmarSenha: string) => {
    if (!senhaAtual || !novaSenha || !confirmarSenha) { mostrarMensagem('erro', 'Preencha todos os campos'); return }
    if (novaSenha.length < 6) { mostrarMensagem('erro', 'A nova senha deve ter pelo menos 6 caracteres'); return }
    if (novaSenha !== confirmarSenha) { mostrarMensagem('erro', 'A nova senha e a confirmação não coincidem'); return }
    try {
      setSalvandoSenha(true)
      const response = await fetch('/api/perfil/senha', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senhaAtual, novaSenha, confirmarSenha })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.mensagem || 'Erro ao alterar senha')
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
    if (!file.type.startsWith('image/')) { mostrarMensagem('erro', 'Selecione um arquivo de imagem válido'); return }
    if (file.size > 500 * 1024) { mostrarMensagem('erro', 'Imagem muito grande. Máximo: 500KB'); return }
    try {
      setSalvandoFoto(true)
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target?.result as string
        const response = await fetch('/api/perfil/foto', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ foto_base64: base64 })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.mensagem || 'Erro ao salvar foto')
        setPerfil(prev => prev ? { ...prev, foto_url: data.foto_url } : null)
        mostrarMensagem('sucesso', 'Foto atualizada com sucesso!')
        setSalvandoFoto(false)
      }
      reader.onerror = () => { mostrarMensagem('erro', 'Erro ao ler arquivo'); setSalvandoFoto(false) }
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
    const labels: Record<string, string> = { administrador: 'Administrador', tecnico: 'Tecnico', polo: 'Gestor de Polo', escola: 'Gestor de Escola' }
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

  if (carregando) {
    return (
      <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo', 'escola']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            <p className="text-gray-600 dark:text-gray-400">Carregando perfil...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo', 'escola']}>
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
              <SecaoFoto
                fotoUrl={perfil?.foto_url ?? null}
                salvando={salvandoFoto}
                onFotoChange={handleFotoChange}
                onRemoverFoto={removerFoto}
              />

              <div className="flex-1 text-center sm:text-left">
                <div className="mb-4">
                  <SecaoNome
                    nome={perfil?.nome || ''}
                    onSalvar={salvarNome}
                    salvando={salvandoNome}
                  />
                </div>

                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getTipoUsuarioColor(perfil?.tipo_usuario || '')}`}>
                  <Shield className="w-4 h-4 mr-1.5" />
                  {getTipoUsuarioLabel(perfil?.tipo_usuario || '')}
                </span>
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
              <SecaoEmail
                email={perfil?.email || ''}
                onSalvar={salvarEmail}
                salvando={salvandoEmail}
              />

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
                        <div className="p-2 bg-green-100 rounded-lg"><MapPin className="w-5 h-5 text-green-600" /></div>
                        <div><p className="text-xs text-gray-500">Polo</p><p className="text-gray-800 font-medium">{perfil.polo_nome}</p></div>
                      </div>
                    )}
                    {perfil?.escola_nome && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg"><Building2 className="w-5 h-5 text-orange-600" /></div>
                        <div><p className="text-xs text-gray-500">Escola</p><p className="text-gray-800 font-medium">{perfil.escola_nome}</p></div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Data de criação */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-200 rounded-lg"><Calendar className="w-5 h-5 text-gray-600" /></div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Membro desde</p>
                    <p className="text-gray-800 font-medium mt-0.5">
                      {perfil?.criado_em ? new Date(perfil.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card de Segurança */}
          <SecaoSenha onAlterar={alterarSenha} salvando={salvandoSenha} />
        </div>
      </div>
    </ProtectedRoute>
  )
}
