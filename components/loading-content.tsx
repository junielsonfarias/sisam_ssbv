'use client'

import { Loader2 } from 'lucide-react'

export default function LoadingContent() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded-lg w-48"></div>
        <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded-lg w-32"></div>
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-20"></div>
              <div className="h-8 w-8 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
            </div>
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-24"></div>
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-40"></div>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded flex-1"></div>
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24"></div>
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-20"></div>
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Loading indicator */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-lg border border-gray-200 dark:border-slate-700">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
        <span className="text-sm text-gray-600 dark:text-gray-300">Carregando...</span>
      </div>
    </div>
  )
}
