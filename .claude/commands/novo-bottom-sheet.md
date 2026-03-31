Crie um Bottom Sheet (modal que sobe do rodape) para mobile no padrao moderno.

Entrada: $ARGUMENTS (tipo: "simples", "formulario", "selecao" ou "completo")

## Por que Bottom Sheet?
- Modal centralizado em mobile = dificil de fechar, inputs ficam atras do teclado
- Bottom Sheet = padrao nativo iOS/Android, swipe down pra fechar
- Area do polegar acessivel
- Google Maps, WhatsApp, Instagram — todos usam

## Criar `components/ui/bottom-sheet.tsx`
```typescript
'use client'

import { useEffect, useRef, useState, useCallback, ReactNode } from 'react'
import { X } from 'lucide-react'

interface BottomSheetProps {
  aberto: boolean
  onFechar: () => void
  titulo?: string
  children: ReactNode
  altura?: 'auto' | 'meia' | 'cheia'  // auto: conteudo determina, meia: 50vh, cheia: 90vh
}

export default function BottomSheet({ aberto, onFechar, titulo, children, altura = 'auto' }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const alturaClasses = {
    auto: 'max-h-[85vh]',
    meia: 'h-[50vh]',
    cheia: 'h-[90vh]',
  }[altura]

  // Swipe down para fechar
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY)
    setIsDragging(true)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    const deltaY = e.touches[0].clientY - startY
    if (deltaY > 0) { // So arrasta pra baixo
      setCurrentY(deltaY)
    }
  }, [isDragging, startY])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    if (currentY > 100) { // Se arrastou mais de 100px, fecha
      onFechar()
    }
    setCurrentY(0)
  }, [currentY, onFechar])

  // Escape fecha
  useEffect(() => {
    if (!aberto) return
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [aberto, onFechar])

  // Prevenir scroll do body quando aberto
  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [aberto])

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onFechar}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`fixed inset-x-0 bottom-0 bg-white dark:bg-slate-800
                    rounded-t-2xl shadow-2xl ${alturaClasses}
                    transition-transform duration-300 ease-out overflow-hidden
                    flex flex-col safe-area-inset-bottom`}
        style={{
          transform: currentY > 0 ? `translateY(${currentY}px)` : 'translateY(0)',
          transition: isDragging ? 'none' : undefined,
        }}
      >
        {/* Handle de arraste */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 bg-gray-300 dark:bg-slate-600 rounded-full" />
        </div>

        {/* Header (opcional) */}
        {titulo && (
          <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{titulo}</h3>
            <button onClick={onFechar} className="p-2 -mr-2 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Conteudo (scrollavel) */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Em DESKTOP: usa ModalBase normal
 * Em MOBILE: usa BottomSheet
 * Componente adaptativo que escolhe automaticamente
 */
export function AdaptiveModal({ aberto, onFechar, titulo, children, largura }: {
  aberto: boolean; onFechar: () => void; titulo: string; children: ReactNode; largura?: string
}) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (isMobile) {
    return <BottomSheet aberto={aberto} onFechar={onFechar} titulo={titulo}>{children}</BottomSheet>
  }

  // Desktop: modal normal
  return (
    <ModalBase aberto={aberto} onFechar={onFechar} titulo={titulo} largura={largura}>
      {children}
    </ModalBase>
  )
}
```

## Uso
```typescript
// Bottom Sheet para selecao de filtros no mobile
<BottomSheet aberto={mostrarFiltros} onFechar={() => setMostrarFiltros(false)} titulo="Filtros">
  <div className="space-y-4">
    <select className="w-full rounded-lg ...">...</select>
    <select className="w-full rounded-lg ...">...</select>
    <button onClick={aplicar} className="w-full bg-indigo-600 text-white py-3 rounded-lg">
      Aplicar filtros
    </button>
  </div>
</BottomSheet>

// Adaptive: BottomSheet no mobile, Modal no desktop
<AdaptiveModal aberto={mostrar} onFechar={fechar} titulo="Novo Aluno">
  <FormularioAluno />
</AdaptiveModal>
```

## Padroes importantes
- **Swipe down para fechar** — gesto natural do mobile
- **Handle visual** (barra cinza no topo) — indica que e arrastavel
- **sm:hidden** — SO aparece em mobile, desktop usa modal normal
- **`AdaptiveModal`** — componente que escolhe automatico
- **overflow hidden no body** — previne scroll duplo
- **safe-area-inset-bottom** — iPhone com notch
- **max-h-[85vh]** — nunca cobre o status bar
- **rounded-t-2xl** — cantos arredondados so no topo
