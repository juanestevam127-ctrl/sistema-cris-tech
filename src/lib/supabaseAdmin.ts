/**
 * Admin client legado agora apontando diretamente para o NocoDB no servidor
 */
import { nocodb, NocoTableName } from "./nocodb";

class NocoAdminQueryBuilder {
  private tableName: NocoTableName;
  private whereFilters: string[] = [];
  private orderFields: string[] = [];
  private limitCount?: number;

  constructor(tableName: NocoTableName) {
    this.tableName = tableName;
  }

  select(fields = "*"): this {
    return this;
  }

  eq(column: string, value: any): this {
    this.whereFilters.push(`(${column},eq,${value})`);
    return this;
  }

  lte(column: string, value: any): this {
    this.whereFilters.push(`(${column},lte,${value})`);
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}): this {
    const prefix = options.ascending === false ? "-" : "";
    this.orderFields.push(`${prefix}${column}`);
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  single(): Promise<{ data: any; error: any }> {
    this.limitCount = 1;
    return this.then((res: any) => {
      if (res.error) return res;
      return { data: res.data ? res.data[0] || null : null, error: null };
    });
  }

  maybeSingle(): Promise<{ data: any; error: any }> {
    return this.single();
  }

  insert(records: any | any[]): any {
    const p = (async () => {
      try {
        const data = await nocodb.insert(this.tableName, records);
        return { data, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    })();
    (p as any).select = () => p;
    return p;
  }

  async upsert(records: any | any[], options?: any): Promise<{ data: any; error: any }> {
    return this.insert(records);
  }

  update(values: any): any {
    return {
      eq: async (col: string, val: any) => {
        try {
          const res = await nocodb.update(this.tableName, val, values);
          return { data: res, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
    };
  }

  delete(): any {
    return {
      eq: async (col: string, val: any) => {
        try {
          await nocodb.delete(this.tableName, val);
          return { data: true, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
    };
  }

  then(resolve: (value: { data: any; error: any }) => any, reject?: (reason: any) => any): Promise<any> {
    const run = async () => {
      try {
        const where = this.whereFilters.length > 0 ? this.whereFilters.join("~and") : undefined;
        const sort = this.orderFields.length > 0 ? this.orderFields.join(",") : undefined;
        const data = await nocodb.findMany(this.tableName, { where, sort, limit: this.limitCount });
        return resolve({ data, error: null });
      } catch (err) {
        if (reject) return reject(err);
        return resolve({ data: null, error: err });
      }
    };
    return run();
  }
}

export const supabaseAdmin = {
  from(tableName: string) {
    return new NocoAdminQueryBuilder(tableName as NocoTableName);
  },
  auth: {
    admin: {
      async createUser(params?: any): Promise<{ data: { user: any }; error: any }> {
        return { data: { user: { id: params?.email, email: params?.email } }, error: null };
      },
      async deleteUser(id?: string): Promise<{ data: any; error: any }> {
        return { data: null, error: null };
      },
      async updateUserById(id: string, params?: any): Promise<{ data: any; error: any }> {
        return { data: null, error: null };
      },
      async listUsers(params?: any): Promise<{ data: { users: any[] }; error: any }> {
        return { data: { users: [] }, error: null };
      },
    },
  },
  storage: {
    from(bucketName: string) {
      return {
        async upload() {
          return { error: null };
        },
        getPublicUrl(path: string) {
          const base = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "https://pub-639d29aa8e994aac94c1471392d55f2f.r2.dev").replace(/\/$/, "");
          const cleanPath = path.startsWith("http") ? path : `${base}/${path.replace(/^\/+/, "")}`;
          return { data: { publicUrl: cleanPath } };
        },
      };
    },
  },
};
