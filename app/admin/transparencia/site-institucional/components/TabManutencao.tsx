import { TabProps, inputClass, labelClass } from './types'
import { Construction } from 'lucide-react'

export function TabManutencao({ formData, updateField }: TabProps) {
  return (
    <div className="space-y-6">
      {/* Toggle principal */}
      <div className={`p-4 rounded-xl border-2 transition-colors ${formData.ativo ? 'border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-600' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50'}`}>
        <label className="flex items-center gap-4 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={formData.ativo ?? false}
              onChange={e => updateField('ativo', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-300 dark:bg-slate-600 peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-500"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Construction className={`w-5 h-5 ${formData.ativo ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`} />
              <span className={`text-base font-semibold ${formData.ativo ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>
                Modo Manutencao {formData.ativo ? 'ATIVADO' : 'Desativado'}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {formData.ativo
                ? 'O site esta exibindo a tela de manutencao para todos os visitantes.'
                : 'O site esta funcionando normalmente para os visitantes.'}
            </p>
          </div>
        </label>
      </div>

      {formData.ativo && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
            Atencao: O painel administrativo e as APIs internas continuam funcionando normalmente. Apenas a pagina principal do site sera substituida pela tela de manutencao.
          </p>
        </div>
      )}

      <div>
        <label className={labelClass}>Titulo da Pagina de Manutencao</label>
        <input type="text" className={inputClass} value={formData.titulo || ''} onChange={e => updateField('titulo', e.target.value)} placeholder="Ex: Site em Manutencao" />
      </div>
      <div>
        <label className={labelClass}>Mensagem para os Visitantes</label>
        <textarea className={inputClass} rows={4} value={formData.mensagem || ''} onChange={e => updateField('mensagem', e.target.value)} placeholder="Mensagem que sera exibida na tela de manutencao" />
      </div>
    </div>
  )
}
