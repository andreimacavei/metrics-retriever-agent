import { readFileSync } from 'fs';
import { join } from 'path';

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  foreignKey?: {
    table: string;
    column: string;
  };
  defaultValue?: string;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
}

export interface EnumInfo {
  name: string;
  values: string[];
}

export interface ParsedSchema {
  tables: TableInfo[];
  enums: EnumInfo[];
}

/**
 * Parses the schema.sql file and extracts table definitions, columns, types, and relationships
 */
export function parseSchemaSQL(schemaPath?: string): ParsedSchema {
  const path = schemaPath ?? join(process.cwd(), 'supabase', 'schema.sql');
  const sql = readFileSync(path, 'utf-8');

  const enums = parseEnums(sql);
  const tables = parseTables(sql);

  return { tables, enums };
}

function parseEnums(sql: string): EnumInfo[] {
  const enums: EnumInfo[] = [];
  const enumRegex = /CREATE TYPE\s+(\w+)\s+AS\s+ENUM\s*\(([^)]+)\)/gi;

  let match;
  while ((match = enumRegex.exec(sql)) !== null) {
    const name = match[1];
    const valuesStr = match[2];
    const values = valuesStr
      .split(',')
      .map(v => v.trim().replace(/'/g, ''));
    
    enums.push({ name, values });
  }

  return enums;
}

function parseTables(sql: string): TableInfo[] {
  const tables: TableInfo[] = [];
  const tableRegex = /CREATE TABLE\s+(\w+)\s*\(([\s\S]*?)\);/gi;

  let match;
  while ((match = tableRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const columnsBlock = match[2];
    const columns = parseColumns(columnsBlock);
    
    tables.push({ name: tableName, columns });
  }

  return tables;
}

function parseColumns(columnsBlock: string): ColumnInfo[] {
  const columns: ColumnInfo[] = [];
  
  // Split by comma, but handle nested parentheses
  const lines = splitColumnDefinitions(columnsBlock);

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip constraints like CREATE INDEX, FOREIGN KEY constraints at table level
    if (
      trimmed.startsWith('CONSTRAINT') ||
      trimmed.startsWith('PRIMARY KEY') ||
      trimmed.startsWith('FOREIGN KEY') ||
      trimmed.startsWith('UNIQUE') ||
      trimmed.startsWith('CHECK') ||
      trimmed === ''
    ) {
      continue;
    }

    const column = parseColumnDefinition(trimmed);
    if (column) {
      columns.push(column);
    }
  }

  return columns;
}

function splitColumnDefinitions(block: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;

  for (const char of block) {
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ',' && depth === 0) {
      result.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  
  if (current.trim()) {
    result.push(current);
  }

  return result;
}

function parseColumnDefinition(line: string): ColumnInfo | null {
  // Match column name (handles quoted names like "order")
  const columnMatch = line.match(/^"?(\w+)"?\s+(.+)$/i);
  if (!columnMatch) return null;

  const name = columnMatch[1];
  const rest = columnMatch[2];

  // Extract type (first word or words until a keyword)
  const typeMatch = rest.match(/^([\w\s(),.]+?)(?:\s+(?:PRIMARY|NOT|NULL|DEFAULT|REFERENCES|UNIQUE|CHECK)|$)/i);
  const type = typeMatch ? typeMatch[1].trim() : rest.split(/\s+/)[0];

  const isPrimaryKey = /PRIMARY KEY/i.test(rest);
  const isNotNull = /NOT NULL/i.test(rest);
  const nullable = !isNotNull && !isPrimaryKey;

  // Extract default value
  const defaultMatch = rest.match(/DEFAULT\s+([^,\s]+(?:\([^)]*\))?)/i);
  const defaultValue = defaultMatch ? defaultMatch[1] : undefined;

  // Extract foreign key reference
  let foreignKey: ColumnInfo['foreignKey'] = undefined;
  const fkMatch = rest.match(/REFERENCES\s+(\w+)\((\w+)\)/i);
  if (fkMatch) {
    foreignKey = {
      table: fkMatch[1],
      column: fkMatch[2]
    };
  }

  return {
    name,
    type,
    nullable,
    isPrimaryKey,
    foreignKey,
    defaultValue
  };
}

/**
 * Formats the parsed schema into a human-readable string for the AI prompt
 */
export function formatSchemaForPrompt(schema: ParsedSchema): string {
  let output = '## Database Schema\n\n';

  // Enums section
  if (schema.enums.length > 0) {
    output += '### Enums\n';
    for (const enumInfo of schema.enums) {
      output += `- **${enumInfo.name}**: ${enumInfo.values.map(v => `'${v}'`).join(', ')}\n`;
    }
    output += '\n';
  }

  // Tables section
  output += '### Tables\n\n';
  for (const table of schema.tables) {
    output += `#### ${table.name}\n`;
    output += '| Column | Type | Nullable | Notes |\n';
    output += '|--------|------|----------|-------|\n';
    
    for (const col of table.columns) {
      const notes: string[] = [];
      if (col.isPrimaryKey) notes.push('PK');
      if (col.foreignKey) notes.push(`FK → ${col.foreignKey.table}.${col.foreignKey.column}`);
      if (col.defaultValue) notes.push(`default: ${col.defaultValue}`);
      
      output += `| ${col.name} | ${col.type} | ${col.nullable ? 'yes' : 'no'} | ${notes.join(', ')} |\n`;
    }
    output += '\n';
  }

  // Relationships section
  const relationships = extractRelationships(schema);
  if (relationships.length > 0) {
    output += '### Relationships\n';
    for (const rel of relationships) {
      output += `- ${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}.${rel.toColumn}\n`;
    }
    output += '\n';
  }

  return output;
}

function extractRelationships(schema: ParsedSchema): Array<{
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}> {
  const relationships: Array<{
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
  }> = [];

  for (const table of schema.tables) {
    for (const col of table.columns) {
      if (col.foreignKey) {
        relationships.push({
          fromTable: table.name,
          fromColumn: col.name,
          toTable: col.foreignKey.table,
          toColumn: col.foreignKey.column
        });
      }
    }
  }

  return relationships;
}

/**
 * Get the schema formatted for AI prompt - cached for performance
 */
let cachedSchemaPrompt: string | null = null;

export function getSchemaForPrompt(): string {
  if (cachedSchemaPrompt) {
    return cachedSchemaPrompt;
  }

  const schema = parseSchemaSQL();
  cachedSchemaPrompt = formatSchemaForPrompt(schema);
  return cachedSchemaPrompt;
}

/**
 * Clear the cached schema (call when schema.sql changes)
 */
export function clearSchemaCache(): void {
  cachedSchemaPrompt = null;
}
