'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, Eye, EyeOff } from 'lucide-react'
import Rodape from '@/components/rodape'
import { getPersonalizacaoLogin } from '@/lib/personalizacao'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [personalizacao, setPersonalizacao] = useState(getPersonalizacaoLogin())

  useEffect(() => {
    const carregarPersonalizacao = async () => {
      try {
        const response = await fetch('/api/admin/personalizacao')
        const data = await response.json()
        if (data) {
          setPersonalizacao({
            titulo: data.login_titulo || 'SISAM',
            subtitulo: data.login_subtitulo || 'Sistema de Análise de Provas',
            imagem_url: data.login_imagem_url || null,
            cor_primaria: data.login_cor_primaria || '#4f46e5',
            cor_secundaria: data.login_cor_secundaria || '#818cf8',
          })
        }
      } catch (error) {
        console.error('Erro ao carregar personalização:', error)
        // Manter valores padrão em caso de erro
      }
    }
    carregarPersonalizacao()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, senha }),
        credentials: 'include', // Importante para cookies
      })

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        console.error('Erro ao parsear resposta JSON:', jsonError)
        setErro('Erro ao processar resposta do servidor')
        setCarregando(false)
        return
      }

      if (!response.ok) {
        console.error('Erro no login:', data)
        setErro(data.mensagem || data.detalhes || 'Erro ao fazer login')
        setCarregando(false)
        return
      }

      // Redirecionar baseado no tipo de usuário
      if (data.usuario.tipo_usuario === 'administrador') {
        router.push('/admin/dashboard')
      } else if (data.usuario.tipo_usuario === 'tecnico') {
        router.push('/tecnico/dashboard')
      } else if (data.usuario.tipo_usuario === 'polo') {
        router.push('/polo/dashboard')
      } else if (data.usuario.tipo_usuario === 'escola') {
        router.push('/escola/dashboard')
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      setErro('Erro ao conectar com o servidor')
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100" style={{
      background: `linear-gradient(to bottom right, ${personalizacao.cor_secundaria}15, ${personalizacao.cor_primaria}25)`
    }}>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            {personalizacao.imagem_url ? (
              <img
                src={personalizacao.imagem_url}
                alt="Logo"
                className="max-h-20 max-w-full object-contain"
              />
            ) : (
              <div className="p-3 rounded-full" style={{ backgroundColor: personalizacao.cor_primaria }}>
                <LogIn className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
          
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2" style={{ color: personalizacao.cor_primaria }}>
            {personalizacao.titulo}
          </h1>
          <p className="text-center text-gray-600 mb-8">
            {personalizacao.subtitulo}
          </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <div className="relative">
              <input
                id="senha"
                type={mostrarSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {mostrarSenha ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full text-white py-2 px-4 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{
              backgroundColor: personalizacao.cor_primaria,
            } as React.CSSProperties}
            onMouseEnter={(e) => {
              const color = personalizacao.cor_primaria
              const r = parseInt(color.slice(1, 3), 16)
              const g = parseInt(color.slice(3, 5), 16)
              const b = parseInt(color.slice(5, 7), 16)
              const darker = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`
              e.currentTarget.style.backgroundColor = darker
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = personalizacao.cor_primaria
            }}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        </div>
      </div>
      
      {/* Rodapé */}
      <Rodape />
    </div>
  )
}

