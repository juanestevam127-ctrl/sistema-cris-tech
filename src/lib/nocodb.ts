/**
 * Cliente central de comunicação com o NocoDB
 * Fornece métodos tipados e auxiliares para ler, criar, atualizar e deletar registros.
 */

const NOCODB_URL = process.env.NOCODB_URL || "";
const NOCODB_TOKEN = process.env.NOCODB_API_TOKEN || "";
const NOCODB_BASE_ID = process.env.NOCODB_BASE_ID || "";

// Mapeamento estático dos IDs de tabela para performance máxima
export const NOCO_TABLES = {
  cris_tech_usuarios: "maavyhm2j7usrc8",
  cris_tech_layouts: "m38ao1wsc5prv9a",
  cris_tech_clientes: "mpgirecfls8m0sf",
  cris_tech_ordens_servico: "mpbpendwo5vbkr5",
  cris_tech_orcamentos: "mo3mjz0v7k3lb0t",
  cris_tech_orcamento_itens: "mvtzgv5rhzogj66",
  cris_tech_orcamento_fotos: "mtmc9k1gr9cski6",
  cris_tech_modelos_observacao: "m30f38sydw7wv3e",
  cris_tech_disparos: "mklhm5b54z9986g",
  cris_tech_clientes_disparo: "mrlnxfl65w3enr7",
  cris_tech_postagens_agendadas: "m5sjtim5ujebj4d",
} as const;

export type NocoTableName = keyof typeof NOCO_TABLES;

export interface NocoQueryParams {
  where?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  fields?: string[];
}

export async function nocodbRequest<T = any>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    body?: any;
    params?: Record<string, any>;
  } = {}
): Promise<T> {
  const { method = "GET", body, params } = options;

  let url = `${NOCODB_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        searchParams.append(k, String(v));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }

  const res = await fetch(url, {
    method,
    headers: {
      "xc-token": NOCODB_TOKEN,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`NocoDB Error [${res.status}] ${method} ${path}: ${errorText}`);
  }

  return (await res.json().catch(() => ({}))) as T;
}

/**
 * Operações por tabela
 */
export const nocodb = {
  async findMany<T = any>(tableName: NocoTableName, query: NocoQueryParams = {}): Promise<T[]> {
    const tableId = NOCO_TABLES[tableName];
    const params: Record<string, any> = {};
    if (query.where) params.where = query.where;
    if (query.limit !== undefined) params.limit = query.limit;
    if (query.offset !== undefined) params.offset = query.offset;
    if (query.sort) params.sort = query.sort;
    if (query.fields) params.fields = query.fields.join(",");

    const res = await nocodbRequest<{ list: T[]; pageInfo: any }>(
      `/api/v2/tables/${tableId}/records`,
      { method: "GET", params }
    );
    return res.list || [];
  },

  async findOne<T = any>(tableName: NocoTableName, query: NocoQueryParams = {}): Promise<T | null> {
    const list = await nocodb.findMany<T>(tableName, { ...query, limit: 1 });
    return list[0] || null;
  },

  async findById<T = any>(tableName: NocoTableName, id: string): Promise<T | null> {
    const tableId = NOCO_TABLES[tableName];
    try {
      return await nocodbRequest<T>(`/api/v2/tables/${tableId}/records/${id}`, {
        method: "GET",
      });
    } catch {
      return null;
    }
  },

  async insert<T = any>(tableName: NocoTableName, data: Partial<T> | Partial<T>[]): Promise<T | T[]> {
    const tableId = NOCO_TABLES[tableName];
    const isArray = Array.isArray(data);
    const rawList = isArray ? data : [data];

    // Garante que cada registro tenha um UUID gerado automaticamente caso não fornecido
    const body = rawList.map((item: any) => ({
      id: item.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : undefined),
      ...item,
    }));

    const res = await nocodbRequest<any>(`/api/v2/tables/${tableId}/records`, {
      method: "POST",
      body,
    });
    return isArray ? res : res[0];
  },

  async update<T = any>(tableName: NocoTableName, id: string, data: Partial<T>): Promise<T> {
    const tableId = NOCO_TABLES[tableName];
    return await nocodbRequest<T>(`/api/v2/tables/${tableId}/records`, {
      method: "PATCH",
      body: [{ id, ...data }],
    });
  },

  async delete(tableName: NocoTableName, id: string): Promise<boolean> {
    const tableId = NOCO_TABLES[tableName];
    await nocodbRequest(`/api/v2/tables/${tableId}/records`, {
      method: "DELETE",
      body: [{ id }],
    });
    return true;
  },
};
