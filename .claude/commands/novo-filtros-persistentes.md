Crie um hook de filtros com persistencia e cascade clearing no padrao SISAM.

Entrada: $ARGUMENTS (campos de filtro, ex: "poloId,escolaId,turmaId,anoLetivo,busca")

## Criar `lib/hooks/useFiltros.ts`

```typescript
'use client'

import { useState, useMemo, useCallback } from 'react'

interface Filtros {
  poloId: string
  escolaId: string
  turmaId: string
  anoLetivo: string
  serie: string
  busca: string
  // Adaptar campos conforme $ARGUMENTS
}

const FILTROS_INICIAIS: Filtros = {
  poloId: '',
  escolaId: '',
  turmaId: '',
  anoLetivo: new Date().getFullYear().toString(),
  serie: '',
  busca: '',
}

export function useFiltros() {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS)

  /**
   * Atualizar filtro com CASCADE CLEARING:
   * - Mudar polo → limpa escola e turma
   * - Mudar escola → limpa turma
   * - Mudar ano → limpa avaliacao
   */
  const setFiltro = useCallback((campo: keyof Filtros, valor: string) => {
    setFiltros(prev => {
      const novo = { ...prev, [campo]: valor }

      // Cascade clearing
      if (campo === 'poloId') {
        novo.escolaId = ''
        novo.turmaId = ''
      }
      if (campo === 'escolaId') {
        novo.turmaId = ''
      }

      return novo
    })
  }, [])

  const limparFiltros = useCallback(() => {
    setFiltros(FILTROS_INICIAIS)
  }, [])

  const temFiltrosAtivos = useMemo(() => {
    return Object.entries(filtros).some(([key, val]) =>
      key !== 'anoLetivo' && val !== '' && val !== FILTROS_INICIAIS[key as keyof Filtros]
    )
  }, [filtros])

  const qtdFiltrosAtivos = useMemo(() => {
    return Object.entries(filtros).filter(([key, val]) =>
      key !== 'anoLetivo' && val !== '' && val !== FILTROS_INICIAIS[key as keyof Filtros]
    ).length
  }, [filtros])

  // Query string para fetch
  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([key, val]) => {
      if (val) params.set(key, val)
    })
    return params.toString()
  }, [filtros])

  return {
    filtros,
    setFiltro,
    limparFiltros,
    temFiltrosAtivos,
    qtdFiltrosAtivos,
    queryString,
  }
}
```

## Uso na pagina
```tsx
const { filtros, setFiltro, limparFiltros, temFiltrosAtivos, qtdFiltrosAtivos, queryString } = useFiltros()

// Buscar dados com filtros
useEffect(() => {
  fetch(\`/api/admin/dados?\${queryString}\`).then(...)
}, [queryString])

// UI de filtros
<select value={filtros.poloId} onChange={e => setFiltro('poloId', e.target.value)}>
  <option value="">Todos os polos</option>
  {polos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
</select>

// Botao limpar
{temFiltrosAtivos && (
  <button onClick={limparFiltros} className="text-sm text-indigo-600">
    Limpar filtros ({qtdFiltrosAtivos})
  </button>
)}
```

## O que deu certo
- **Cascade clearing** — mudar polo SEMPRE limpa escola/turma (evita dados orfaos)
- **Memoized queryString** — so recalcula quando filtros mudam
- **qtdFiltrosAtivos** como badge — usuario sabe quantos filtros estao ativos
- Ano letivo NAO conta como filtro ativo (sempre tem valor)
