'use client'

interface SiteManutencaoProps {
  titulo?: string
  mensagem?: string
}

export default function SiteManutencao({ titulo, mensagem }: SiteManutencaoProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Particulas animadas de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-10 animate-float"
            style={{
              width: `${Math.random() * 6 + 2}px`,
              height: `${Math.random() * 6 + 2}px`,
              background: `hsl(${210 + Math.random() * 30}, 80%, 70%)`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 10 + 8}s`,
            }}
          />
        ))}
      </div>

      {/* Grid decorativo */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Icone animado */}
        <div className="relative mb-8 inline-block">
          {/* Anel pulsante externo */}
          <div className="absolute inset-0 -m-4 rounded-full border-2 border-blue-400/20 animate-ping-slow" />
          <div className="absolute inset-0 -m-8 rounded-full border border-blue-400/10 animate-ping-slower" />

          {/* Container do icone */}
          <div className="relative w-28 h-28 mx-auto">
            {/* Engrenagem grande rotacionando */}
            <svg className="absolute inset-0 w-28 h-28 text-blue-400/80 animate-spin-slow" viewBox="0 0 100 100" fill="currentColor">
              <path d="M50 10 L55 20 L65 15 L63 27 L75 28 L68 38 L80 45 L70 50 L80 55 L68 62 L75 72 L63 73 L65 85 L55 80 L50 90 L45 80 L35 85 L37 73 L25 72 L32 62 L20 55 L30 50 L20 45 L32 38 L25 28 L37 27 L35 15 L45 20 Z" />
              <circle cx="50" cy="50" r="18" className="text-slate-900" />
            </svg>

            {/* Engrenagem pequena rotacionando (sentido contrario) */}
            <svg className="absolute -right-3 -bottom-1 w-14 h-14 text-cyan-400/70 animate-spin-reverse" viewBox="0 0 100 100" fill="currentColor">
              <path d="M50 15 L55 25 L65 20 L62 32 L73 34 L67 43 L78 48 L68 52 L78 57 L67 62 L73 71 L62 73 L65 85 L55 80 L50 90 L45 80 L35 85 L38 73 L27 71 L33 62 L22 57 L32 52 L22 48 L33 43 L27 34 L38 32 L35 20 L45 25 Z" />
              <circle cx="50" cy="50" r="16" className="text-slate-900" />
            </svg>

            {/* Icone de ferramenta no centro */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-10 h-10 text-white animate-bounce-gentle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1 5.1a2.12 2.12 0 01-3-3l5.1-5.1m0 0L3.34 6.99a2.12 2.12 0 010-3l.17-.17a2.12 2.12 0 013 0l5.08 5.08m0 3.27l3.27-3.27m0 0l5.08-5.08a2.12 2.12 0 013 0l.17.17a2.12 2.12 0 010 3l-5.08 5.08m-3.27 0l3.27 3.27" />
              </svg>
            </div>
          </div>
        </div>

        {/* Titulo */}
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
          {titulo || 'Site em Manutencao'}
        </h1>

        {/* Barra de progresso animada */}
        <div className="w-64 mx-auto mb-6 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 rounded-full animate-progress" />
        </div>

        {/* Mensagem */}
        <p className="text-lg sm:text-xl text-blue-200/80 mb-8 leading-relaxed">
          {mensagem || 'Estamos trabalhando para melhorar sua experiencia. O site estara de volta em breve!'}
        </p>

        {/* Status dos desenvolvedores */}
        <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-6 py-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <span className="text-sm text-blue-100 font-medium">
            Desenvolvedores trabalhando nas melhorias
          </span>
        </div>

        {/* Icones de ferramentas flutuantes */}
        <div className="mt-12 flex justify-center gap-8 opacity-30">
          <svg className="w-6 h-6 text-blue-300 animate-float-delayed-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
          </svg>
          <svg className="w-6 h-6 text-cyan-300 animate-float-delayed-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
          </svg>
          <svg className="w-6 h-6 text-blue-300 animate-float-delayed-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      </div>

      {/* CSS das animacoes */}
      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.3); opacity: 0; }
          100% { transform: scale(1); opacity: 0.2; }
        }
        @keyframes ping-slower {
          0% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1); opacity: 0.15; }
        }
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes progress {
          0% { transform: translateX(-100%); width: 40%; }
          50% { width: 60%; }
          100% { transform: translateX(350%); width: 40%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(-5px); }
          75% { transform: translateY(-25px) translateX(5px); }
        }
        @keyframes float-d1 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes float-d2 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes float-d3 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-spin-slow { animation: spin-slow 12s linear infinite; }
        .animate-spin-reverse { animation: spin-reverse 8s linear infinite; }
        .animate-ping-slow { animation: ping-slow 3s ease-in-out infinite; }
        .animate-ping-slower { animation: ping-slower 4s ease-in-out infinite; }
        .animate-bounce-gentle { animation: bounce-gentle 2s ease-in-out infinite; }
        .animate-progress { animation: progress 2.5s ease-in-out infinite; }
        .animate-float { animation: float 8s ease-in-out infinite; }
        .animate-float-delayed-1 { animation: float-d1 3s ease-in-out infinite; animation-delay: 0s; }
        .animate-float-delayed-2 { animation: float-d2 3.5s ease-in-out infinite; animation-delay: 0.5s; }
        .animate-float-delayed-3 { animation: float-d3 4s ease-in-out infinite; animation-delay: 1s; }
      `}</style>
    </div>
  )
}
