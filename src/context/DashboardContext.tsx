// ============================================================
// DashboardContext — Provider wrapping Zustand store
// ============================================================

import { createContext, useContext, type ReactNode } from 'react'
import { useDashboardStore } from '../store/dashboardStore.js'
import type { Language, Sector, DashboardFilters } from '../types/index.js'

interface DashboardContextValue {
  /** Currently selected sectors */
  activeSectors: Sector[]
  /** Currently selected states */
  activeStates: string[]
  /** Current UI language */
  language: Language
  /** Dashboard sidebar open state */
  sidebarOpen: boolean
  /** Alert badge count */
  alertCount: number
  /** Full filters object */
  filters: DashboardFilters
  /** Set active sectors */
  setSectors: (sectors: Sector[]) => void
  /** Set active states */
  setStates: (states: string[]) => void
  /** Set display language */
  setLanguage: (lang: Language) => void
  /** Toggle sidebar */
  toggleSidebar: () => void
  /** Set partial filters */
  setFilters: (filters: Partial<DashboardFilters>) => void
  /** Set time range */
  setTimeRange: (range: DashboardFilters['timeRange']) => void
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const store = useDashboardStore()

  const value: DashboardContextValue = {
    activeSectors: store.filters.sectors,
    activeStates: store.filters.states,
    language: store.filters.language,
    sidebarOpen: store.sidebarOpen,
    alertCount: store.alertCount,
    filters: store.filters,
    setSectors: store.setSectors,
    setStates: (states: string[]) => store.setFilters({ states }),
    setLanguage: store.setLanguage,
    toggleSidebar: store.toggleSidebar,
    setFilters: store.setFilters,
    setTimeRange: store.setTimeRange,
  }

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}

/**
 * Access dashboard context. Must be used within a DashboardProvider.
 */
export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext)
  if (!ctx) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return ctx
}
