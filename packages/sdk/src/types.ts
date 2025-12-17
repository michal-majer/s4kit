export interface S4KitConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface QueryOptions {
  select?: string[];
  filter?: string;
  top?: number;
  skip?: number;
  orderBy?: string;
  expand?: string[];
}

export interface EntityHandler<T = any> {
  list(options?: QueryOptions): Promise<T[]>;
  get(id: string | number, options?: QueryOptions): Promise<T>;
  create(data: T): Promise<T>;
  update(id: string | number, data: Partial<T>): Promise<T>;
  delete(id: string | number): Promise<void>;
}
