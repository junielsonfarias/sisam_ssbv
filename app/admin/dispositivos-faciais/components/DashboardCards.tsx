import { Smartphone, Wifi, WifiOff, Users } from 'lucide-react'

interface DashboardCardsProps {
  totalDispositivos: number
  onlineAgora: number
  offlineAgora: number
  presencasHoje: number
}

export function DashboardCards({
  totalDispositivos,
  onlineAgora,
  offlineAgora,
  presencasHoje,
}: DashboardCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Dispositivos */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Dispositivos</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalDispositivos}
            </p>
          </div>
        </div>
      </div>

      {/* Online Agora */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-l-4 border-green-500">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
            <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Online Agora</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {onlineAgora}
            </p>
          </div>
        </div>
      </div>

      {/* Offline */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-l-4 border-red-500">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
            <WifiOff className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Offline</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {offlineAgora}
            </p>
          </div>
        </div>
      </div>

      {/* Presencas Hoje */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Presencas Hoje</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {presencasHoje}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
