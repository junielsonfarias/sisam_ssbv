# Operação FICAI — Busca Ativa Escolar

> **Base legal:** ECA Art. 56 (obrigatoriedade de comunicar infrequência ao Conselho Tutelar).

Este guia explica como operar o módulo FICAI implementado na Fase 2.

---

## 1. Visão geral do fluxo

```
[Aluno com infrequência]
        │
        ▼
[Sistema detecta automaticamente (cron diário)]
   - 5+ dias consecutivos de ausência   OU
   - 50%+ faltas no mês corrente
        │
        ▼
[Caso FICAI aberto — status: 'aberto']
        │
        ▼
[Escola contata responsável]
   → POST /api/admin/ficai/[id]/acao  (contato_telefone, contato_visita...)
   → PATCH /api/admin/ficai/[id]  status='contato_responsavel'
        │
   ┌────┴─────┐
   │          │
   ▼          ▼
[Aluno     [Persiste infrequência]
 retorna]      │
   │          ▼
   │       [Encaminha Conselho Tutelar]
   │          → PATCH status='encaminhado_conselho_tutelar'
   │              │
   │              ▼
   │           [Se não resolver]
   │              │
   │              ▼
   │           [Encaminha Ministério Público]
   │              → PATCH status='encaminhado_ministerio_publico'
   │
   ▼
[PATCH status='aluno_retornou' ou 'concluido_resolvido']
```

---

## 2. Agendamento da detecção automática

A detecção precisa rodar periodicamente (recomendado: diário, madrugada).

### 2.1 Endpoint

```
POST /api/admin/ficai/detectar
Body: { "anoLetivo": "2026" }
Autenticação: JWT de administrador ou técnico
```

Retorna:
```json
{
  "ausencias_consecutivas": 3,
  "infrequencia_50pct": 1,
  "total_casos_abertos": 4,
  "mensagem": "Detecção concluída. 4 novos casos abertos."
}
```

### 2.2 Opções de agendamento

#### Opção A — Vercel Cron Jobs (recomendado se estiver na Vercel)

Adicione em `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/admin/ficai/detectar-cron",
      "schedule": "0 5 * * *"
    }
  ]
}
```

> **Atenção:** Vercel Cron faz GET sem body. Crie uma rota wrapper `detectar-cron` que usa o ano letivo ativo atual e protege com `CRON_SECRET` (env var) verificado pelo header `Authorization: Bearer $CRON_SECRET`.

Exemplo de wrapper:

```ts
// app/api/admin/ficai/detectar-cron/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { detectarInfrequencia } from '@/lib/services/ficai.service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 401 })
  }
  const ano = String(new Date().getFullYear())
  const r = await detectarInfrequencia(ano)
  return NextResponse.json(r)
}
```

#### Opção B — Cron Linux (servidor próprio)

```cron
# Detecção FICAI diária às 5h da manhã
0 5 * * * curl -s -X POST https://seu-dominio.gov.br/api/admin/ficai/detectar-cron \
  -H "Authorization: Bearer $CRON_SECRET" >> /var/log/ficai-cron.log 2>&1
```

#### Opção C — Task Scheduler Windows

Programa: `powershell.exe`
Argumentos:
```
-Command "Invoke-RestMethod -Uri 'https://seu-dominio.gov.br/api/admin/ficai/detectar-cron' -Method GET -Headers @{Authorization='Bearer SEU_CRON_SECRET'}"
```
Acionador: Diário, 05:00

#### Opção D — GitHub Actions

```yaml
# .github/workflows/ficai-detectar.yml
name: FICAI - Deteccao diaria
on:
  schedule:
    - cron: '0 8 * * *' # 8h UTC = 5h Brasilia
  workflow_dispatch:

jobs:
  detectar:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS -X GET "${{ secrets.APP_URL }}/api/admin/ficai/detectar-cron" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

---

## 3. Operação cotidiana pela escola

### 3.1 Visualizar casos abertos

```
GET /api/admin/ficai?apenasAbertos=true&escola=<uuid>
```

Ou na UI (a ser construída): página `/admin/ficai` com lista filtrada.

### 3.2 Registrar contato com responsável

```
POST /api/admin/ficai/[caso_id]/acao
{
  "tipo": "contato_telefone",
  "descricao": "Liguei para a mãe Maria (XX) XXXX-XXXX. Aluno está com problema de saúde, vai retornar segunda."
}
```

Tipos disponíveis:
- `contato_telefone`, `contato_visita`, `contato_email`, `contato_whatsapp`
- `reuniao_responsavel`
- `aluno_retornou`
- `encaminhamento_conselho_tutelar`, `encaminhamento_ministerio_publico`
- `oficio_emitido`
- `observacao`

### 3.3 Atualizar status do caso

```
PATCH /api/admin/ficai/[caso_id]
{
  "status": "contato_responsavel",
  "observacao": "Mãe contatada com sucesso por telefone"
}
```

Status disponíveis:
- `aberto` (inicial)
- `contato_responsavel`
- `aluno_retornou` (sucesso parcial)
- `encaminhado_conselho_tutelar`
- `encaminhado_ministerio_publico`
- `concluido_aluno_transferido`
- `concluido_resolvido` (sucesso definitivo)
- `concluido_evasao_confirmada` (sem recuperação)
- `cancelado`

### 3.4 Encaminhar ao Conselho Tutelar

Quando esgotadas as tentativas de contato (geralmente após 7 dias):

1. Emitir ofício (gerado pela escola — modelo no jurídico)
2. Registrar ação:
   ```
   POST /api/admin/ficai/[caso_id]/acao
   { "tipo": "oficio_emitido", "descricao": "Ofício nº XXX/2026 emitido ao CT" }
   POST /api/admin/ficai/[caso_id]/acao
   { "tipo": "encaminhamento_conselho_tutelar", "descricao": "Protocolo CT-2026-XXX" }
   ```
3. Atualizar status para `encaminhado_conselho_tutelar`

---

## 4. Indicadores SEMED

Endpoint de estatísticas para dashboard:

```
GET /api/admin/ficai?estatisticas=true&ano=2026
```

Retorna:
```json
{
  "estatisticas": {
    "total": 45,
    "abertos": 8,
    "resolvidos": 28,
    "evasao_confirmada": 4,
    "por_status": {
      "aberto": 3,
      "contato_responsavel": 5,
      "aluno_retornou": 22,
      "concluido_resolvido": 6,
      "encaminhado_conselho_tutelar": 2,
      "concluido_evasao_confirmada": 4,
      "cancelado": 3
    }
  }
}
```

---

## 5. Pré-requisitos legais

- **Treinamento da equipe escolar** sobre o fluxo e prazos do ECA
- **Convênio/protocolo** com o Conselho Tutelar local (ofícios padrão)
- **Política municipal** sobre quando encaminhar ao MP (geralmente: 2-3 encaminhamentos sem retorno ao CT)
- **Registro fotográfico/documental** de visitas domiciliares (opcional, mas recomendado — usar campo `anexo_url`)

---

## 6. Configuração inicial recomendada

1. Cadastrar `CRON_SECRET` nas env vars (gerar com `openssl rand -hex 32`)
2. Escolher e configurar a opção de agendamento (A/B/C/D acima)
3. Treinar admins escolares no fluxo
4. Rodar manualmente uma vez para popular casos atuais:
   ```
   POST /api/admin/ficai/detectar
   { "anoLetivo": "2026" }
   ```
5. Validar dados no dashboard
6. Documentar contatos locais (Conselho Tutelar, Promotoria da Infância)

---

## 7. Considerações de segurança

- Endpoint `/api/admin/ficai/*` exige autenticação (já implementado)
- Endpoint `detectar-cron` deve ser protegido por `CRON_SECRET` em produção
- Logs do FICAI ficam na tabela `logs_auditoria` (mascarados conforme `lib/utils/mask-pii`)
- Dados sensíveis (motivos detalhados, observações) ficam restritos ao perfil que cria — sem visibilidade para responsáveis no portal

---

## 8. Próximos passos sugeridos (futuras melhorias)

- UI completa em `/admin/ficai` com filtros e timeline visual
- Notificação push/email para responsáveis do caso quando aberto
- Integração direta com sistema do Conselho Tutelar (se houver API)
- Relatório PDF do caso para arquivo físico
- Dashboard de evasão por escola/polo no painel SEMED
