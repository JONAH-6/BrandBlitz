import { randomUUID } from "node:crypto";

const DEFAULT_TEST_SCHEMA_PREFIX = "vitest_";
const TEST_SCHEMA_ENV_VAR = "TEST_DB_SCHEMA";

type SqlExecutor = (sql: string) => Promise<unknown>;

async function importOptionalModule<T>(moduleName: string): Promise<T> {
  const dynamicImport = new Function("name", "return import(name)") as (
    name: string,
  ) => Promise<T>;
  return dynamicImport(moduleName);
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll("\"", "\"\"")}"`;
}

export function createTestSchemaName(prefix = DEFAULT_TEST_SCHEMA_PREFIX): string {
  const suffix = randomUUID().replaceAll("-", "");
  return `${prefix}${suffix}`;
}

export async function createTestSchema(
  executeSql: SqlExecutor,
  schemaName = createTestSchemaName(),
): Promise<string> {
  await executeSql(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(schemaName)}`);
  return schemaName;
}

export async function dropTestSchema(executeSql: SqlExecutor, schemaName: string): Promise<void> {
  await executeSql(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE`);
}

export async function withTestSchema<T>(
  executeSql: SqlExecutor,
  run: (schemaName: string) => Promise<T>,
  prefix = DEFAULT_TEST_SCHEMA_PREFIX,
): Promise<T> {
  const schemaName = await createTestSchema(executeSql, createTestSchemaName(prefix));
  process.env[TEST_SCHEMA_ENV_VAR] = schemaName;

  try {
    return await run(schemaName);
  } finally {
    await dropTestSchema(executeSql, schemaName);
  }
}

export async function withPgTestSchema<T>(
  run: (schemaName: string) => Promise<T>,
  options?: {
    connectionString?: string;
    prefix?: string;
  },
): Promise<T> {
  const connectionString = options?.connectionString ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to use withPgTestSchema");
  }

  const { Pool } = await importOptionalModule<{ Pool: new (config: { connectionString: string }) => { query: (sql: string) => Promise<unknown>; end: () => Promise<void> } }>("pg");
  const pool = new Pool({ connectionString });
  const executeSql: SqlExecutor = async (sql: string) => {
    await pool.query(sql);
  };

  try {
    return await withTestSchema(executeSql, run, options?.prefix);
  } finally {
    await pool.end();
  }
}
