import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

export function readMigrations(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(join(MIGRATIONS_DIR, name), "utf8"))
    .join("\n");
}

/** Strip line comments so commented-out DDL is never mistaken for real DDL. */
function withoutComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, "");
}

function createTableBody(sql: string, table: string): string | null {
  const start = new RegExp(
    String.raw`create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?${table}\s*\(`,
    "i",
  ).exec(sql);
  if (!start) return null;

  // Walk to the matching close paren so nested parens in types and defaults,
  // e.g. numeric(12,2), do not truncate the body.
  let depth = 1;
  let index = start.index + start[0].length;
  const bodyStart = index;
  while (index < sql.length && depth > 0) {
    if (sql[index] === "(") depth += 1;
    else if (sql[index] === ")") depth -= 1;
    index += 1;
  }
  return sql.slice(bodyStart, index - 1);
}

function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of body) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts;
}

const TABLE_CONSTRAINT_KEYWORDS = new Set([
  "primary",
  "unique",
  "constraint",
  "foreign",
  "check",
  "exclude",
]);

/**
 * Every column name on a table, as the migrations actually define it.
 *
 * Reads `create table` plus any later `alter table ... add column`, so a column
 * added by a migration counts the same as one in the baseline.
 */
export function columnsOf(table: string): Set<string> {
  const sql = withoutComments(readMigrations());
  const columns = new Set<string>();

  const body = createTableBody(sql, table);
  if (body) {
    for (const definition of splitTopLevel(body)) {
      const name = definition.trim().split(/\s+/)[0]?.toLowerCase();
      if (!name || TABLE_CONSTRAINT_KEYWORDS.has(name)) continue;
      columns.add(name);
    }
  }

  const addColumn = new RegExp(
    String.raw`alter\s+table\s+(?:public\.)?${table}\s+([\s\S]*?);`,
    "gi",
  );
  for (const statement of sql.matchAll(addColumn)) {
    const clauses = statement[1].matchAll(
      /add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)/gi,
    );
    for (const clause of clauses) {
      columns.add(clause[1].toLowerCase());
    }
  }

  for (const column of templatedColumnsFor(sql, table)) {
    columns.add(column);
  }

  return columns;
}

/**
 * Columns added to many tables at once by a `DO` block that loops over a list of
 * table names and runs `format('ALTER TABLE public.%I ADD COLUMN ...')`. This is
 * how organization_id reached every tenant table, and a plain `alter table`
 * search cannot see it.
 */
function templatedColumnsFor(sql: string, table: string): string[] {
  const found: string[] = [];

  for (const block of sql.matchAll(/do\s+\$\$([\s\S]*?)\$\$\s*;/gi)) {
    const body = block[1];

    const listed = new Set<string>();
    for (const array of body.matchAll(/array\s*\[([\s\S]*?)\]/gi)) {
      for (const quoted of array[1].matchAll(/'([a-z_][a-z0-9_]*)'/gi)) {
        listed.add(quoted[1].toLowerCase());
      }
    }
    if (!listed.has(table.toLowerCase())) continue;

    const templated = body.matchAll(
      /alter\s+table\s+public\.%I\s+add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)/gi,
    );
    for (const match of templated) {
      found.push(match[1].toLowerCase());
    }
  }

  return found;
}
