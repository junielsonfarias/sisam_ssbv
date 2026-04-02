import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/app-version
 * Retorna a versão atual do app e URL de download.
 * Usado pelo app nativo para verificar atualizações.
 * Endpoint público (sem auth) para o app conseguir verificar antes do login.
 */
export async function GET() {
  const versao = {
    // Atualizar estes valores a cada release do APK
    versao: '2.0.0',
    versao_codigo: 260402,
    obrigatoria: false,
    data_lancamento: '2026-04-02',
    changelog: [
      'Portal do Responsável — pais acompanham notas e frequência',
      'Chat professor ↔ pais com mensagens bidirecionais',
      'Presença por QR Code — alternativa ao reconhecimento facial',
      'Calendário escolar + sistema de tarefas',
      'Push notifications para notas, faltas e mensagens',
      'Modo kiosk para terminal facial',
      'Reconhecimento facial melhorado — 3 ângulos + auto-captura',
    ],
    download: {
      android: {
        // GitHub Releases: subir APK em github.com/junielsonfarias/sisam_ssbv/releases
        // Enquanto não tiver release, usa link direto (colocar APK no servidor)
        url: process.env.NEXT_PUBLIC_APK_URL || 'https://github.com/junielsonfarias/sisam_ssbv/releases/latest/download/sisam.apk',
        tamanho_mb: 5,
        min_android: '7.0',
      },
      // iOS será adicionado quando disponível
      // ios: { url: 'https://apps.apple.com/...', min_ios: '15.0' },
    },
    playstore: null, // Quando publicar: 'https://play.google.com/store/apps/details?id=br.com.educacaossbv.sisam'
  }

  return NextResponse.json(versao, {
    headers: {
      'Cache-Control': 'public, max-age=3600', // Cache 1h
    },
  })
}
