import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic';

// Caminhos dos arquivos locais
const CONFIG_PATH = path.join(process.cwd(), 'config', 'personalizacao.json')
const UPLOADS_PATH = path.join(process.cwd(), 'public', 'uploads')

// Valores padrão
const DEFAULTS = {
  login_titulo: 'SISAM',
  login_subtitulo: 'Sistema de Analise de Provas',
  login_imagem_url: null,
  login_cor_primaria: '#4f46e5',
  login_cor_secundaria: '#818cf8',
  rodape_texto: '2026 SISAM - Todos os direitos reservados',
  rodape_link: null,
  rodape_link_texto: null,
  rodape_ativo: true,
}

// Função para garantir que o diretório existe
function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

// Função para ler configuração do arquivo local
function readLocalConfig() {
  try {
    ensureDirectoryExists(path.dirname(CONFIG_PATH))
    if (fs.existsSync(CONFIG_PATH)) {
      const content = fs.readFileSync(CONFIG_PATH, 'utf-8')
      return JSON.parse(content)
    }
  } catch (error) {
    console.error('Erro ao ler arquivo de configuracao local:', error)
  }
  return null
}

// Função para salvar configuração no arquivo local
function saveLocalConfig(config: any) {
  try {
    ensureDirectoryExists(path.dirname(CONFIG_PATH))
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('Erro ao salvar arquivo de configuracao local:', error)
    return false
  }
}

// Função para salvar imagem localmente
function saveImageLocally(base64Data: string): string | null {
  try {
    ensureDirectoryExists(UPLOADS_PATH)

    // Extrair o tipo e os dados da string base64
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!matches) {
      console.error('Formato de imagem invalido')
      return null
    }

    const extension = matches[1]
    const data = matches[2]
    const buffer = Buffer.from(data, 'base64')

    // Nome do arquivo com timestamp para evitar cache
    const filename = `logo_${Date.now()}.${extension}`
    const filepath = path.join(UPLOADS_PATH, filename)

    // Remover logos antigas
    const files = fs.readdirSync(UPLOADS_PATH)
    files.forEach(file => {
      if (file.startsWith('logo_')) {
        try {
          fs.unlinkSync(path.join(UPLOADS_PATH, file))
        } catch (e) {
          console.error('Erro ao remover logo antiga:', e)
        }
      }
    })

    // Salvar novo arquivo
    fs.writeFileSync(filepath, buffer)

    // Retornar URL relativa
    return `/uploads/${filename}`
  } catch (error) {
    console.error('Erro ao salvar imagem localmente:', error)
    return null
  }
}

// GET - Buscar configurações de personalização
export async function GET(request: NextRequest) {
  try {
    // Primeiro, tentar ler do arquivo local
    const localConfig = readLocalConfig()

    if (localConfig) {
      return NextResponse.json({
        login_titulo: localConfig.login_titulo || DEFAULTS.login_titulo,
        login_subtitulo: localConfig.login_subtitulo || DEFAULTS.login_subtitulo,
        login_imagem_url: localConfig.login_imagem_url || DEFAULTS.login_imagem_url,
        login_cor_primaria: localConfig.login_cor_primaria || DEFAULTS.login_cor_primaria,
        login_cor_secundaria: localConfig.login_cor_secundaria || DEFAULTS.login_cor_secundaria,
        rodape_texto: localConfig.rodape_texto || DEFAULTS.rodape_texto,
        rodape_link: localConfig.rodape_link || DEFAULTS.rodape_link,
        rodape_link_texto: localConfig.rodape_link_texto || DEFAULTS.rodape_link_texto,
        rodape_ativo: localConfig.rodape_ativo !== undefined ? localConfig.rodape_ativo : DEFAULTS.rodape_ativo,
      })
    }

    // Fallback: tentar ler do banco de dados
    try {
      const result = await pool.query(
        'SELECT * FROM personalizacao WHERE tipo = $1',
        ['principal']
      )

      if (result.rows.length > 0) {
        const dbConfig = result.rows[0]
        // Sincronizar com arquivo local
        saveLocalConfig({
          login_titulo: dbConfig.login_titulo,
          login_subtitulo: dbConfig.login_subtitulo,
          login_imagem_url: dbConfig.login_imagem_url,
          login_cor_primaria: dbConfig.login_cor_primaria,
          login_cor_secundaria: dbConfig.login_cor_secundaria,
          rodape_texto: dbConfig.rodape_texto,
          rodape_link: dbConfig.rodape_link,
          rodape_link_texto: dbConfig.rodape_link_texto,
          rodape_ativo: dbConfig.rodape_ativo,
        })
        return NextResponse.json(dbConfig)
      }
    } catch (dbError: any) {
      console.error('Erro ao consultar personalizacao no banco:', dbError)
    }

    // Retornar valores padrão
    return NextResponse.json(DEFAULTS)
  } catch (error: any) {
    console.error('Erro ao buscar personalizacao:', error)
    return NextResponse.json(DEFAULTS)
  }
}

// PUT - Atualizar configurações de personalização
export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Nao autorizado' },
        { status: 403 }
      )
    }

    const {
      login_titulo,
      login_subtitulo,
      login_imagem_url,
      login_cor_primaria,
      login_cor_secundaria,
      rodape_texto,
      rodape_link,
      rodape_link_texto,
      rodape_ativo,
    } = await request.json()

    // Processar imagem: se for base64, salvar localmente
    let imagemFinal = login_imagem_url
    if (login_imagem_url && login_imagem_url.startsWith('data:image/')) {
      const savedPath = saveImageLocally(login_imagem_url)
      if (savedPath) {
        imagemFinal = savedPath
      } else {
        // Se falhar ao salvar localmente, manter o base64
        console.warn('Falha ao salvar imagem localmente, mantendo base64')
      }
    }

    // Preparar dados para salvar
    const configData = {
      login_titulo: login_titulo || DEFAULTS.login_titulo,
      login_subtitulo: login_subtitulo || DEFAULTS.login_subtitulo,
      login_imagem_url: imagemFinal,
      login_cor_primaria: login_cor_primaria || DEFAULTS.login_cor_primaria,
      login_cor_secundaria: login_cor_secundaria || DEFAULTS.login_cor_secundaria,
      rodape_texto: rodape_texto || DEFAULTS.rodape_texto,
      rodape_link: rodape_link || null,
      rodape_link_texto: rodape_link_texto || null,
      rodape_ativo: rodape_ativo !== undefined ? rodape_ativo : true,
    }

    // Salvar no arquivo local (fonte primária)
    const savedLocally = saveLocalConfig(configData)

    if (!savedLocally) {
      return NextResponse.json(
        { mensagem: 'Erro ao salvar configuracao local' },
        { status: 500 }
      )
    }

    // Sincronizar com banco de dados (backup)
    try {
      const existe = await pool.query(
        'SELECT id FROM personalizacao WHERE tipo = $1',
        ['principal']
      )

      if (existe.rows.length > 0) {
        await pool.query(
          `UPDATE personalizacao SET
            login_titulo = $1,
            login_subtitulo = $2,
            login_imagem_url = $3,
            login_cor_primaria = $4,
            login_cor_secundaria = $5,
            rodape_texto = $6,
            rodape_link = $7,
            rodape_link_texto = $8,
            rodape_ativo = $9,
            atualizado_em = CURRENT_TIMESTAMP
          WHERE tipo = 'principal'`,
          [
            configData.login_titulo,
            configData.login_subtitulo,
            configData.login_imagem_url,
            configData.login_cor_primaria,
            configData.login_cor_secundaria,
            configData.rodape_texto,
            configData.rodape_link,
            configData.rodape_link_texto,
            configData.rodape_ativo,
          ]
        )
      } else {
        await pool.query(
          `INSERT INTO personalizacao (
            tipo, login_titulo, login_subtitulo, login_imagem_url,
            login_cor_primaria, login_cor_secundaria,
            rodape_texto, rodape_link, rodape_link_texto, rodape_ativo
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            'principal',
            configData.login_titulo,
            configData.login_subtitulo,
            configData.login_imagem_url,
            configData.login_cor_primaria,
            configData.login_cor_secundaria,
            configData.rodape_texto,
            configData.rodape_link,
            configData.rodape_link_texto,
            configData.rodape_ativo,
          ]
        )
      }
    } catch (dbError) {
      console.error('Erro ao sincronizar com banco de dados:', dbError)
      // Não falhar se o banco der erro, já salvamos localmente
    }

    return NextResponse.json({
      ...configData,
      mensagem: 'Personalizacao salva com sucesso'
    })
  } catch (error) {
    console.error('Erro ao atualizar personalizacao:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
