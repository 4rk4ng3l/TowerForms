import { create } from 'zustand';
import { Site, SiteInventory } from '@core/entities/Site';
import { SiteType } from '@core/entities/Form';
import { SyncSitesUseCase } from '@core/use-cases/sites/SyncSitesUseCase';
import { ApiClient } from '@data/api/apiClient';
import { SQLiteSiteRepository } from '@data/repositories/SQLiteSiteRepository';

interface SitesState {
  sites: Site[];
  currentSite: Site | null;
  currentInventory: SiteInventory | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  lastSyncAt: Date | null;
}

interface SitesActions {
  loadSites: () => Promise<void>;
  loadSitesByType: (siteType: SiteType) => Promise<Site[]>;
  syncSites: () => Promise<void>;
  getSiteByCode: (codigoTowernex: string) => Promise<Site | null>;
  getSiteWithInventory: (codigoTowernex: string) => Promise<SiteInventory | null>;
  setCurrentSite: (site: Site | null) => void;
  clearError: () => void;
}

type SitesStore = SitesState & SitesActions;

// Initialize dependencies
const apiClient = ApiClient.getInstance();
const siteRepository = new SQLiteSiteRepository();
const syncSitesUseCase = new SyncSitesUseCase(apiClient, siteRepository);

export const useSitesStore = create<SitesStore>((set, get) => ({
  // Initial state
  sites: [],
  currentSite: null,
  currentInventory: null,
  isLoading: false,
  isSyncing: false,
  error: null,
  lastSyncAt: null,

  // Actions
  loadSites: async () => {
    set({ isLoading: true, error: null });
    try {
      const sites = await siteRepository.getAll();
      set({
        sites,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to load sites',
      });
      throw error;
    }
  },

  loadSitesByType: async (siteType: SiteType) => {
    set({ isLoading: true, error: null });
    try {
      const sites = await siteRepository.getByType(siteType);
      set({
        sites,
        isLoading: false,
        error: null,
      });
      return sites;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to load sites',
      });
      throw error;
    }
  },

  syncSites: async () => {
    set({ isSyncing: true, error: null });
    try {
      const result = await syncSitesUseCase.execute();
      console.log('[SitesStore] Sync result:', result);

      // Reload sites from local database
      const sites = await siteRepository.getAll();

      set({
        sites,
        isSyncing: false,
        error: null,
        lastSyncAt: new Date(),
      });
    } catch (error: any) {
      set({
        isSyncing: false,
        error: error.message || 'Failed to sync sites',
      });
      throw error;
    }
  },

  getSiteByCode: async (codigoTowernex: string) => {
    try {
      const site = await siteRepository.getByCode(codigoTowernex);
      return site;
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load site',
      });
      throw error;
    }
  },

  getSiteWithInventory: async (codigoTowernex: string) => {
    set({ isLoading: true, error: null });
    try {
      const inventory = await siteRepository.getSiteWithInventory(codigoTowernex);

      if (inventory) {
        set({
          currentSite: inventory.site,
          currentInventory: inventory,
          isLoading: false,
        });
      }

      return inventory;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to load site inventory',
      });
      throw error;
    }
  },

  setCurrentSite: (site: Site | null) => {
    set({ currentSite: site });
  },

  clearError: () => {
    set({ error: null });
  },
}));
