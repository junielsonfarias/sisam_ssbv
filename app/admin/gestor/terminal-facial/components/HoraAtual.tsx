'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

export function HoraAtual() {
  const [hora, setHora] = useState(new Date().toLocaleTimeString('pt-BR'))

  useEffect(() => {
    const timer = setInterval(() => {
      setHora(new Date().toLocaleTimeString('pt-BR'))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <span className="text-gray-400 text-sm font-mono hidden sm:inline">
      <Clock className="w-3.5 h-3.5 inline mr-1" />{hora}
    </span>
  )
}
