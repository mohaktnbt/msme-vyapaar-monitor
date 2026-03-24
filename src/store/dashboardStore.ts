import { create } from 'zustand'
import type { DashboardState, DashboardFilters, Language, Sector, DataFreshnessInfo } from '../types/index.js'

export const useDashboardStore = create<DashboardState>((set) => ({
  filters: {
    sectors: [],
    states: [],
    timeRange: '24h',
    language: 'en',
  },
  alertCount: 0,
  freshness: {},
  sidebarOpen: false,
  setFilters: (filters: Partial<DashboardFilters>) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  setSectors: (sectors: Sector[]) =>
    set((state) => ({ filters: { ...state.filters, sectors } })),
  setTimeRange: (timeRange: DashboardFilters['timeRange']) =>
    set((state) => ({ filters: { ...state.filters, timeRange } })),
  setLanguage: (language: Language) =>
    set((state) => ({ filters: { ...state.filters, language } })),
  setAlertCount: (alertCount: number) => set({ alertCount }),
  updateFreshness: (source: string, info: Partial<DataFreshnessInfo>) =>
    set((state) => ({
      freshness: {
        ...state.freshness,
        [source]: { ...state.freshness[source], ...info },
      },
    })),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}))
