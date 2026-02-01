import { SiteType } from './Form';

export interface Site {
  id: string;
  codigoTowernex: string;
  codigoSitio: string | null;
  name: string;
  siteType: SiteType;
  latitud: number | null;
  longitud: number | null;
  direccion: string | null;
  regional: string | null;
  contratistaOM: string | null;
  empresaAuditora: string | null;
  tecnicoEA: string | null;
}

export interface InventoryEE {
  id: string;
  idEE: number;
  tipoSoporte: string | null;
  tipoEE: string;
  situacion: string;
  modelo: string | null;
  fabricante: string | null;
  aristaCaraMastil: string | null;
  operadorPropietario: string | null;
  alturaAntena: number | null;
  diametro: number | null;
  largo: number | null;
  ancho: number | null;
  fondo: number | null;
  azimut: number | null;
  epaM2: number | null;
  usoCompartido: boolean;
  sistemaMovil: string | null;
  observaciones: string | null;
  // Flag to indicate if this was added locally (not synced yet)
  isLocal?: boolean;
  // Flag to indicate if this was edited locally
  isEdited?: boolean;
}

export interface InventoryEP {
  id: string;
  idEP: number;
  tipoPiso: string | null;
  ubicacionEquipo: string | null;
  situacion: string;
  estadoPiso: string | null;
  modelo: string | null;
  fabricante: string | null;
  usoEP: string | null;
  operadorPropietario: string | null;
  dimensiones: {
    ancho: number | null;
    profundidad: number | null;
    altura: number | null;
  };
  superficieOcupada: number | null;
  observaciones: string | null;
  // Flag to indicate if this was added locally (not synced yet)
  isLocal?: boolean;
  // Flag to indicate if this was edited locally
  isEdited?: boolean;
}

export interface SiteInventory {
  site: Site;
  inventoryEE: InventoryEE[];
  inventoryEP: InventoryEP[];
  totals: {
    totalEE: number;
    totalEP: number;
  };
}
