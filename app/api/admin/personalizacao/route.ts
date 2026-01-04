import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic';

// Verificar se está em producao (Vercel)
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

// Caminhos dos arquivos locais (usado apenas em desenvolvimento)
const CONFIG_PATH = path.join(process.cwd(), 'config', 'personalizacao.json')
const UPLOADS_PATH = path.join(process.cwd(), 'public', 'uploads')

// Valores padrao
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

// Funcao para garantir que o diretorio existe (apenas desenvolvimento)
function ensureDirectoryExists(dirPath: string) {
  if (IS_PRODUCTION) return
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
  } catch (error) {
    console.error('Erro ao criar diretorio:', error)
  }
}

// Funcao para ler configuracao do arquivo local (apenas desenvolvimento)
function readLocalConfig() {
  if (IS_PRODUCTION) return null
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

// Funcao para salvar configuracao no arquivo local (apenas desenvolvimento)
function saveLocalConfig(config: any) {
  if (IS_PRODUCTION) return false
  try {
    ensureDirectoryExists(path.dirname(CONFIG_PATH))
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('Erro ao salvar arquivo de configuracao local:', error)
    return false
  }
}

// Funcao para salvar imagem localmente (apenas desenvolvimento)
function saveImageLocally(base64Data: string): string | null {
  if (IS_PRODUCTION) return null
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
    try {
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
    } catch (e) {
      // Ignorar erro ao listar arquivos
    }

    // Salvar novo arquivo
    fs.writeFileSync(filepath, buffer)

    // Retornar URL relativa
    return `/uploads/${filename}`
  } catch (error) {
    console.error('Erro ao salvar imagem localmente:', error)
    return null
  }
}

// GET - Buscar configuracoes de personalizacao
export async function GET(request: NextRequest) {
  try {
    // Em desenvolvimento, tentar ler do arquivo local primeiro
    if (!IS_PRODUCTION) {
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
    }

    // Buscar do banco de dados
    try {
      const result = await pool.query(
        'SELECT * FROM personalizacao WHERE tipo = $1',
        ['principal']
      )

      if (result.rows.length > 0) {
        const dbConfig = result.rows[0]
        // Em desenvolvimento, sincronizar com arquivo local
        if (!IS_PRODUCTION) {
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
        }
        return NextResponse.json(dbConfig)
      }
    } catch (dbError: any) {
      console.error('Erro ao consultar personalizacao no banco:', dbError)
    }

    // Retornar valores padrao
    return NextResponse.json(DEFAULTS)
  } catch (error: any) {
    console.error('Erro ao buscar personalizacao:', error)
    return NextResponse.json(DEFAULTS)
  }
}

// PUT - Atualizar configuracoes de personalizacao
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

    // Processar imagem
    let imagemFinal = login_imagem_url

    // Em desenvolvimento, tentar salvar imagem localmente
    if (!IS_PRODUCTION && login_imagem_url && login_imagem_url.startsWith('data:image/')) {
      const savedPath = saveImageLocally(login_imagem_url)
      if (savedPath) {
        imagemFinal = savedPath
      }
    }
    // Em producao, manter base64 ou URL no banco

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

    // Em desenvolvimento, salvar no arquivo local
    if (!IS_PRODUCTION) {
      saveLocalConfig(configData)
    }

    // Salvar no banco de dados (obrigatorio em producao, backup em desenvolvimento)
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
    } catch (dbError: any) {
      console.error('Erro ao salvar no banco de dados:', dbError)
      // Em producao, falhar se o banco der erro
      if (IS_PRODUCTION) {
        return NextResponse.json(
          { mensagem: 'Erro ao salvar personalizacao: ' + dbError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      ...configData,
      mensagem: 'Personalizacao salva com sucesso'
    })
  } catch (error: any) {
    console.error('Erro ao atualizar personalizacao:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor: ' + error.message },
      { status: 500 }
    )
  }
}
