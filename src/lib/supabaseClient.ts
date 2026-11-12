/**
 * Adaptador do NocoDB compatível com a interface do Supabase Client
 * Suporta chainings (.select(), .eq(), .in(), .order(), .range(), .update().eq(), .delete().eq(), storage.from().getPublicUrl(), etc.)
 */

export class NocoQueryBuilder {
  private tableName: string;
  private whereFilters: string[] = [];
  private orderFields: string[] = [];
  private limitCount?: number;
  private offsetCount?: number;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields = "*", options?: { count?: "exact"; head?: boolean }): this {
    return this;
  }

  eq(column: string, value: any): this {
    const val = typeof value === "string" ? value : String(value);
    this.whereFilters.push(`(${column},eq,${val})`);
    return this;
  }

  neq(column: string, value: any): this {
    const val = typeof value === "string" ? value : String(value);
    this.whereFilters.push(`(${column},neq,${val})`);
    return this;
  }

  gte(column: string, value: any): this {
    this.whereFilters.push(`(${column},gte,${value})`);
    return this;
  }

  lte(column: string, value: any): this {
    this.whereFilters.push(`(${column},lte,${value})`);
    return this;
  }

  in(column: string, values: any[]): this {
    const list = values.join("~");
    this.whereFilters.push(`(${column},in,${list})`);
    return this;
  }

  or(query: string): this {
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}): this {
    const prefix = options.ascending === false ? "-" : "";
    this.orderFields.push(`${prefix}${column}`);
    return this;
  }

  range(from: number, to: number): this {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
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
        const res = await fetch(`/api/data/${this.tableName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(records),
        });
        const json = await res.json();
        return { data: json.data, error: json.error ? new Error(json.error) : null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    })();
    // Suportar .select() após .insert()
    (p as any).select = () => p;
    return p;
  }

  upsert(records: any | any[]): Promise<{ data: any; error: any }> {
    return this.insert(records);
  }

  update(values: any): any {
    const helper = {
      eq: async (col: string, val: any) => {
        try {
          const res = await fetch(`/api/data/${this.tableName}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: val, ...values }),
          });
          const json = await res.json();
          return { data: json.data, error: json.error ? new Error(json.error) : null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
      in: async (col: string, vals: any[]) => {
        try {
          for (const v of vals) {
            await fetch(`/api/data/${this.tableName}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: v, ...values }),
            });
          }
          return { data: true, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
    };
    return helper;
  }

  delete(): any {
    const helper = {
      eq: async (col: string, val: any) => {
        try {
          const res = await fetch(`/api/data/${this.tableName}?id=${encodeURIComponent(val)}`, {
            method: "DELETE",
          });
          const json = await res.json();
          return { data: json.success, error: json.error ? new Error(json.error) : null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
    };
    return helper;
  }

  then(resolve: (value: { data: any; error: any }) => any, reject?: (reason: any) => any): Promise<any> {
    const run = async () => {
      try {
        const params = new URLSearchParams();
        if (this.whereFilters.length > 0) {
          params.set("where", this.whereFilters.join("~and"));
        }
        if (this.orderFields.length > 0) {
          params.set("sort", this.orderFields.join(","));
        }
        if (this.limitCount !== undefined) {
          params.set("limit", String(this.limitCount));
        }
        if (this.offsetCount !== undefined) {
          params.set("offset", String(this.offsetCount));
        }

        const qs = params.toString();
        const url = `/api/data/${this.tableName}${qs ? `?${qs}` : ""}`;
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();

        return resolve({
          data: json.data || [],
          error: json.error ? new Error(json.error) : null,
        });
      } catch (err) {
        if (reject) return reject(err);
        return resolve({ data: null, error: err });
      }
    };
    return run();
  }
}

export const supabase = {
  from(tableName: string) {
    return new NocoQueryBuilder(tableName);
  },
  auth: {
    async getUser() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) return { data: { user: null }, error: null };
        const json = await res.json();
        return { data: { user: json.user }, error: null };
      } catch {
        return { data: { user: null }, error: null };
      }
    },
    async getSession() {
      const { data } = await this.getUser();
      return { data: { session: data.user ? { access_token: "r2-nocodb-token", user: data.user } : null }, error: null };
    },
    async signOut() {
      await fetch("/api/auth/logout", { method: "POST" });
      return { error: null };
    },
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe() {} } } };
    },
  },
  storage: {
    from(bucketName: string) {
      return {
        async upload(path: string, file: File | Blob, options?: any) {
          try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("layoutId", "disparos");
            const res = await fetch("/api/upload", {
              method: "POST",
              body: formData,
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Erro no upload.");
            return { data: { path: json.url, publicUrl: json.url }, error: null };
          } catch (err: any) {
            return { data: null, error: err };
          }
        },
        getPublicUrl(path: string) {
          if (path.startsWith("http")) return { data: { publicUrl: path } };
          const publicBase = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "https://pub-639d29aa8e994aac94c1471392d55f2f.r2.dev").replace(/\/$/, "");
          const cleanPath = `${publicBase}/${path.replace(/^\/+/, "")}`;
          return { data: { publicUrl: cleanPath } };
        },
      };
    },
  },
};
