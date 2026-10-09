/**
 * Minimal PostgreSQL client types for the API workspace.
 * This avoids TS7016 when @types/pg is not present in the pnpm lockfile.
 * The runtime dependency remains the official `pg` package.
 */
declare module 'pg' {
  export interface QueryResult<Row = any> {
    rows: Row[];
    rowCount: number | null;
  }

  export class Pool {
    constructor(config?: {
      connectionString?: string;
      max?: number;
      idleTimeoutMillis?: number;
      connectionTimeoutMillis?: number;
      [key: string]: unknown;
    });

    query<Row = any>(
      text: string,
      values?: unknown[]
    ): Promise<QueryResult<Row>>;

    end(): Promise<void>;
  }
}
