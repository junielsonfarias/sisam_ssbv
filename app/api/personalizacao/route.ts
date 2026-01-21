import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic';

// Verificar se está em producao (Vercel)
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

// Caminhos dos arquivos locais (usado apenas em desenvolvimento)
const CONFIG_PATH = path.join(process.cwd(), 'config', 'personalizacao.json')

// Valores padrao
const DEFAULTS = {
  login_titulo: 'SISAM',
  login_subtitulo: 'Sistema de Avaliação Municipal',
  login_imagem_url: null,
  login_cor_primaria: '#4f46e5',
  login_cor_secundaria: '#818cf8',
  rodape_texto: '2026 SISAM - Todos os direitos reservados',
  rodape_link: null,
  rodape_link_texto: null,
  rodape_ativo: true,
  nome_sistema: 'SISAM',
  logo_url: null,
  cor_primaria: '#4f46e5',
}

// Funcao para ler configuracao do arquivo local (apenas desenvolvimento)
function readLocalConfig() {
  if (IS_PRODUCTION) return null
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const content = fs.readFileSync(CONFIG_PATH, 'utf-8')
      return JSON.parse(content)
    }
  } catch (error: any) {
    console.error('Erro ao ler arquivo de configuracao local:', error)
  }
  return null
}

// GET - Buscar configuracoes de personalizacao (endpoint publico)
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
          nome_sistema: localConfig.login_titulo || DEFAULTS.nome_sistema,
          logo_url: localConfig.login_imagem_url || DEFAULTS.logo_url,
          cor_primaria: localConfig.login_cor_primaria || DEFAULTS.cor_primaria,
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
        return NextResponse.json({
          ...dbConfig,
          nome_sistema: dbConfig.login_titulo || DEFAULTS.nome_sistema,
          logo_url: dbConfig.login_imagem_url || DEFAULTS.logo_url,
          cor_primaria: dbConfig.login_cor_primaria || DEFAULTS.cor_primaria,
        })
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
