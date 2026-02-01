import { Site, InventoryEE, InventoryEP } from '@core/entities/Site';
import { ISiteRepository } from '@core/repositories/ISiteRepository';
import { ApiClient } from '@data/api/apiClient';

export interface SyncSitesResult {
  sites: number;
  inventoryEE: number;
  inventoryEP: number;
}

export class SyncSitesUseCase {
  constructor(
    private apiClient: ApiClient,
    private siteRepository: ISiteRepository,
  ) {}

  async execute(): Promise<SyncSitesResult> {
    try {
      console.log('[SyncSitesUseCase] Fetching sites from API...');

      // Fetch pending data which includes sites and inventory
      const pendingData = await this.apiClient.request<any>('GET', '/sync/pending');

      const sitesData = pendingData?.data?.sites || [];
      const inventoryEEData = pendingData?.data?.inventoryEE || [];
      const inventoryEPData = pendingData?.data?.inventoryEP || [];

      console.log(`[SyncSitesUseCase] Fetched ${sitesData.length} sites, ${inventoryEEData.length} EE, ${inventoryEPData.length} EP`);

      // Debug: log sample site data to check siteType values
      if (sitesData.length > 0) {
        console.log('[SyncSitesUseCase] Sample site data:', {
          id: sitesData[0].id,
          name: sitesData[0].name,
          siteType: sitesData[0].siteType,
          codigoTowernex: sitesData[0].codigoTowernex,
        });
        const siteTypes = [...new Set(sitesData.map((s: any) => s.siteType))];
        console.log('[SyncSitesUseCase] Unique siteTypes in response:', siteTypes);
      }

      // Clear existing data and save new data
      if (sitesData.length > 0) {
        // Delete all inventory first (due to foreign key constraints)
        await this.siteRepository.deleteAllInventoryEE();
        await this.siteRepository.deleteAllInventoryEP();
        console.log('[SyncSitesUseCase] Cleared existing inventory data');

        // Delete all sites
        await this.siteRepository.deleteAll();
        console.log('[SyncSitesUseCase] Cleared existing sites');

        // Save sites
        const sites = sitesData.map((data: any) => this.mapApiDataToSite(data));
        await this.siteRepository.saveMany(sites);
        console.log(`[SyncSitesUseCase] Saved ${sites.length} sites`);
      }

      // Save inventory EE
      if (inventoryEEData.length > 0) {
        await this.siteRepository.saveInventoryEEMany(inventoryEEData);
        console.log(`[SyncSitesUseCase] Saved ${inventoryEEData.length} inventory EE items`);
      }

      // Save inventory EP
      if (inventoryEPData.length > 0) {
        await this.siteRepository.saveInventoryEPMany(inventoryEPData);
        console.log(`[SyncSitesUseCase] Saved ${inventoryEPData.length} inventory EP items`);
      }

      console.log('[SyncSitesUseCase] Sites synced successfully');

      return {
        sites: sitesData.length,
        inventoryEE: inventoryEEData.length,
        inventoryEP: inventoryEPData.length,
      };
    } catch (error: any) {
      console.error('[SyncSitesUseCase] Error syncing sites:', error);
      throw new Error(
        error.response?.data?.error?.message ||
          'Failed to sync sites. Please try again.',
      );
    }
  }

  private mapApiDataToSite(data: any): Site {
    return {
      id: data.id,
      codigoTowernex: data.codigoTowernex,
      codigoSitio: data.codigoSitio,
      name: data.name,
      siteType: data.siteType,
      latitud: data.latitud,
      longitud: data.longitud,
      direccion: data.direccion,
      regional: data.regional,
      contratistaOM: data.contratistaOM,
      empresaAuditora: data.empresaAuditora,
      tecnicoEA: data.tecnicoEA,
    };
  }
}
