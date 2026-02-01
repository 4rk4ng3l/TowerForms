import { ISiteRepository } from '@core/repositories/ISiteRepository';
import { Site, InventoryEE, InventoryEP, SiteInventory } from '@core/entities/Site';
import { SiteType } from '@core/entities/Form';
import { Database } from '@infrastructure/database/database';

export class SQLiteSiteRepository implements ISiteRepository {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  // ==================== Sites ====================

  async getById(id: string): Promise<Site | null> {
    const sql = `SELECT * FROM sites WHERE id = ? LIMIT 1`;
    const result = await this.db.executeSql(sql, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSite(result.rows.item(0));
  }

  async getByCode(codigoTowernex: string): Promise<Site | null> {
    const sql = `SELECT * FROM sites WHERE codigo_towernex = ? LIMIT 1`;
    const result = await this.db.executeSql(sql, [codigoTowernex]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSite(result.rows.item(0));
  }

  async getAll(): Promise<Site[]> {
    const sql = `SELECT * FROM sites ORDER BY codigo_towernex ASC`;
    const result = await this.db.executeSql(sql, []);

    const sites: Site[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      sites.push(this.mapRowToSite(result.rows.item(i)));
    }

    return sites;
  }

  async getByType(siteType: SiteType): Promise<Site[]> {
    console.log('[SQLiteSiteRepository] getByType called with:', siteType);

    // First, let's see what site_types exist in the database
    const debugSql = `SELECT DISTINCT site_type FROM sites`;
    const debugResult = await this.db.executeSql(debugSql, []);
    const existingTypes: string[] = [];
    for (let i = 0; i < debugResult.rows.length; i++) {
      existingTypes.push(debugResult.rows.item(i).site_type);
    }
    console.log('[SQLiteSiteRepository] Existing site_types in DB:', existingTypes);

    // Count total sites
    const countSql = `SELECT COUNT(*) as total FROM sites`;
    const countResult = await this.db.executeSql(countSql, []);
    console.log('[SQLiteSiteRepository] Total sites in DB:', countResult.rows.item(0)?.total);

    const sql = `SELECT * FROM sites WHERE site_type = ? ORDER BY codigo_towernex ASC`;
    const result = await this.db.executeSql(sql, [siteType]);
    console.log('[SQLiteSiteRepository] Found sites for type:', result.rows.length);

    const sites: Site[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      sites.push(this.mapRowToSite(result.rows.item(i)));
    }

    return sites;
  }

  async save(site: Site): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO sites (
        id, codigo_towernex, codigo_sitio, name, site_type,
        latitud, longitud, direccion, regional,
        contratista_om, empresa_auditora, tecnico_ea, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.executeSql(sql, [
      site.id,
      site.codigoTowernex,
      site.codigoSitio,
      site.name,
      site.siteType,
      site.latitud,
      site.longitud,
      site.direccion,
      site.regional,
      site.contratistaOM,
      site.empresaAuditora,
      site.tecnicoEA,
      new Date().toISOString(),
    ]);
  }

  async saveMany(sites: Site[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const site of sites) {
        const sql = `
          INSERT OR REPLACE INTO sites (
            id, codigo_towernex, codigo_sitio, name, site_type,
            latitud, longitud, direccion, regional,
            contratista_om, empresa_auditora, tecnico_ea, synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await tx.executeSql(sql, [
          site.id,
          site.codigoTowernex,
          site.codigoSitio,
          site.name,
          site.siteType,
          site.latitud,
          site.longitud,
          site.direccion,
          site.regional,
          site.contratistaOM,
          site.empresaAuditora,
          site.tecnicoEA,
          new Date().toISOString(),
        ]);
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.executeSql('DELETE FROM sites WHERE id = ?', [id]);
  }

  async deleteAll(): Promise<void> {
    await this.db.executeSql('DELETE FROM sites', []);
  }

  // ==================== Inventory EE ====================

  async getInventoryEEBySiteId(siteId: string): Promise<InventoryEE[]> {
    const sql = `SELECT * FROM inventory_ee WHERE site_id = ? ORDER BY id_ee ASC`;
    const result = await this.db.executeSql(sql, [siteId]);

    const items: InventoryEE[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(this.mapRowToInventoryEE(result.rows.item(i)));
    }

    return items;
  }

  async saveInventoryEE(item: InventoryEE): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO inventory_ee (
        id, site_id, id_ee, tipo_soporte, tipo_ee, situacion,
        modelo, fabricante, arista_cara_mastil, operador_propietario,
        altura_antena, azimut, epa_m2, uso_compartido, observaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.executeSql(sql, [
      item.id,
      item.id, // siteId - will be set from the item relationship
      item.idEE,
      item.tipoSoporte,
      item.tipoEE,
      item.situacion,
      item.modelo,
      item.fabricante,
      item.aristaCaraMastil,
      item.operadorPropietario,
      item.alturaAntena,
      item.azimut,
      item.epaM2,
      item.usoCompartido ? 1 : 0,
      item.observaciones,
    ]);
  }

  async saveInventoryEEMany(items: any[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const item of items) {
        const sql = `
          INSERT OR REPLACE INTO inventory_ee (
            id, site_id, id_ee, tipo_soporte, tipo_ee, situacion,
            modelo, fabricante, arista_cara_mastil, operador_propietario,
            altura_antena, azimut, epa_m2, uso_compartido, observaciones
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await tx.executeSql(sql, [
          item.id,
          item.siteId,
          item.idEE,
          item.tipoSoporte,
          item.tipoEE,
          item.situacion,
          item.modelo,
          item.fabricante,
          item.aristaCaraMastil,
          item.operadorPropietario,
          item.alturaAntena,
          item.azimut,
          item.epaM2,
          item.usoCompartido ? 1 : 0,
          item.observaciones,
        ]);
      }
    });
  }

  async deleteInventoryEEBySiteId(siteId: string): Promise<void> {
    await this.db.executeSql('DELETE FROM inventory_ee WHERE site_id = ?', [siteId]);
  }

  async deleteAllInventoryEE(): Promise<void> {
    await this.db.executeSql('DELETE FROM inventory_ee', []);
  }

  // ==================== Inventory EP ====================

  async getInventoryEPBySiteId(siteId: string): Promise<InventoryEP[]> {
    const sql = `SELECT * FROM inventory_ep WHERE site_id = ? ORDER BY id_ep ASC`;
    const result = await this.db.executeSql(sql, [siteId]);

    const items: InventoryEP[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(this.mapRowToInventoryEP(result.rows.item(i)));
    }

    return items;
  }

  async saveInventoryEP(item: InventoryEP): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO inventory_ep (
        id, site_id, id_ep, tipo_piso, ubicacion_equipo, situacion,
        estado_piso, modelo, fabricante, uso_ep, operador_propietario,
        ancho, profundidad, altura, superficie_ocupada, observaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.executeSql(sql, [
      item.id,
      item.id, // siteId - will be set from the item relationship
      item.idEP,
      item.tipoPiso,
      item.ubicacionEquipo,
      item.situacion,
      item.estadoPiso,
      item.modelo,
      item.fabricante,
      item.usoEP,
      item.operadorPropietario,
      item.dimensiones?.ancho,
      item.dimensiones?.profundidad,
      item.dimensiones?.altura,
      item.superficieOcupada,
      item.observaciones,
    ]);
  }

  async saveInventoryEPMany(items: any[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const item of items) {
        const sql = `
          INSERT OR REPLACE INTO inventory_ep (
            id, site_id, id_ep, tipo_piso, ubicacion_equipo, situacion,
            estado_piso, modelo, fabricante, uso_ep, operador_propietario,
            ancho, profundidad, altura, superficie_ocupada, observaciones
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await tx.executeSql(sql, [
          item.id,
          item.siteId,
          item.idEP,
          item.tipoPiso,
          item.ubicacionEquipo,
          item.situacion,
          item.estadoPiso,
          item.modelo,
          item.fabricante,
          item.usoEP,
          item.operadorPropietario,
          item.ancho,
          item.profundidad,
          item.altura,
          item.superficieOcupada,
          item.observaciones,
        ]);
      }
    });
  }

  async deleteInventoryEPBySiteId(siteId: string): Promise<void> {
    await this.db.executeSql('DELETE FROM inventory_ep WHERE site_id = ?', [siteId]);
  }

  async deleteAllInventoryEP(): Promise<void> {
    await this.db.executeSql('DELETE FROM inventory_ep', []);
  }

  // ==================== Combined ====================

  async getSiteWithInventory(codigoTowernex: string): Promise<SiteInventory | null> {
    const site = await this.getByCode(codigoTowernex);
    if (!site) {
      return null;
    }

    const inventoryEE = await this.getInventoryEEBySiteId(site.id);
    const inventoryEP = await this.getInventoryEPBySiteId(site.id);

    return {
      site,
      inventoryEE,
      inventoryEP,
      totals: {
        totalEE: inventoryEE.length,
        totalEP: inventoryEP.length,
      },
    };
  }

  // ==================== Mappers ====================

  private mapRowToSite(row: any): Site {
    return {
      id: row.id,
      codigoTowernex: row.codigo_towernex,
      codigoSitio: row.codigo_sitio,
      name: row.name,
      siteType: row.site_type as SiteType,
      latitud: row.latitud,
      longitud: row.longitud,
      direccion: row.direccion,
      regional: row.regional,
      contratistaOM: row.contratista_om,
      empresaAuditora: row.empresa_auditora,
      tecnicoEA: row.tecnico_ea,
    };
  }

  private mapRowToInventoryEE(row: any): InventoryEE {
    return {
      id: row.id,
      idEE: row.id_ee,
      tipoSoporte: row.tipo_soporte,
      tipoEE: row.tipo_ee,
      situacion: row.situacion,
      modelo: row.modelo,
      fabricante: row.fabricante,
      aristaCaraMastil: row.arista_cara_mastil,
      operadorPropietario: row.operador_propietario,
      alturaAntena: row.altura_antena,
      diametro: row.diametro,
      largo: row.largo,
      ancho: row.ancho,
      fondo: row.fondo,
      azimut: row.azimut,
      epaM2: row.epa_m2,
      usoCompartido: row.uso_compartido === 1,
      sistemaMovil: row.sistema_movil,
      observaciones: row.observaciones,
    };
  }

  private mapRowToInventoryEP(row: any): InventoryEP {
    return {
      id: row.id,
      idEP: row.id_ep,
      tipoPiso: row.tipo_piso,
      ubicacionEquipo: row.ubicacion_equipo,
      situacion: row.situacion,
      estadoPiso: row.estado_piso,
      modelo: row.modelo,
      fabricante: row.fabricante,
      usoEP: row.uso_ep,
      operadorPropietario: row.operador_propietario,
      dimensiones: {
        ancho: row.ancho,
        profundidad: row.profundidad,
        altura: row.altura,
      },
      superficieOcupada: row.superficie_ocupada,
      observaciones: row.observaciones,
    };
  }
}
