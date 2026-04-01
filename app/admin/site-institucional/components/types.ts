export interface TabProps {
  formData: Record<string, any>
  updateField: (path: string, value: any) => void
  addItem?: (arrayPath: string, template: any) => void
  removeItem?: (arrayPath: string, index: number) => void
}

export const inputClass = 'w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
export const labelClass = 'block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
export const cardClass = 'bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6'
