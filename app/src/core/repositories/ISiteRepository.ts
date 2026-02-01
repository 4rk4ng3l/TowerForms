import { Site, InventoryEE, InventoryEP, SiteInventory } from '@core/entities/Site';
import { SiteType } from '@core/entities/Form';

export interface ISiteRepository {
  // Sites
  getById(id: string): Promise<Site | null>;
  getByCode(codigoTowernex: string): Promise<Site | null>;
  getAll(): Promise<Site[]>;
  getByType(siteType: SiteType): Promise<Site[]>;
  save(site: Site): Promise<void>;
  saveMany(sites: Site[]): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<void>;

  // Inventory EE
  getInventoryEEBySiteId(siteId: string): Promise<InventoryEE[]>;
  saveInventoryEE(item: InventoryEE): Promise<void>;
  saveInventoryEEMany(items: InventoryEE[]): Promise<void>;
  deleteInventoryEEBySiteId(siteId: string): Promise<void>;
  deleteAllInventoryEE(): Promise<void>;

  // Inventory EP
  getInventoryEPBySiteId(siteId: string): Promise<InventoryEP[]>;
  saveInventoryEP(item: InventoryEP): Promise<void>;
  saveInventoryEPMany(items: InventoryEP[]): Promise<void>;
  deleteInventoryEPBySiteId(siteId: string): Promise<void>;
  deleteAllInventoryEP(): Promise<void>;

  // Combined
  getSiteWithInventory(codigoTowernex: string): Promise<SiteInventory | null>;
}
