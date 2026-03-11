/**
 * TypeScript types for Wispro API responses.
 * Estos tipos representan la estructura de las respuestas de la API de Wispro.
 */

/**
 * Respuesta completa del endpoint /users/current
 */
export interface WisproCurrentUserResponse {
  user: {
    id: string;
    userable_type: string;
    email: string;
    active: boolean;
    roles_name: string[];
    userable: {
      id: string;
      details: any;
      name: string;
      phone: string;
      phone_mobile: string;
      avatar_url: string;
    };
  };
  isp: {
    id: string;
    name: string;
    city: string;
    language: string;
    country_name: string;
    time_zone: string;
    blocked: boolean;
    has_invoicing: boolean;
    has_mikrotik: boolean;
    has_bmu: boolean;
    has_olt: boolean;
    has_help_desk: boolean;
    service_dgo: boolean;
    service_wispro_box: boolean;
    country_code: string;
    gps_location: {
      latitude: string;
      longitude: string;
    };
  };
  cloud_license: {
    vendor_status: string;
  };
}

/**
 * Estructura individual de un plan en la respuesta de la API pública
 */
export interface WisproPublicPlanData {
  id: string;
  name: string;
  public_id: number;
  cir: string;
  ceil_down_kbps: number;
  ceil_up_kbps: number;
  price: number;
  currency?: string;
  [key: string]: any; // Permitir propiedades adicionales del API
}

/**
 * Respuesta completa del endpoint /api/v1/plans (API pública)
 */
export interface WisproPublicPlansResponse {
  status: number;
  meta: {
    object: string;
    pagination: {
      total_records: number;
      total_pages: number;
      per_page: number;
      current_page: number;
    };
  };
  data: WisproPublicPlanData[];
}


