export function tocarSom(tipo: 'sucesso' | 'erro') {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.value = 0.3

    if (tipo === 'sucesso') {
      osc.frequency.value = 800
      osc.start()
      osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.1)
      osc.stop(ctx.currentTime + 0.2)
    } else {
      osc.frequency.value = 300
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
    }
  } catch {
    // Sem suporte a áudio
  }
}
