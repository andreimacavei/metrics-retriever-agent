/**
 * SQL Validator for AI-generated queries
 * Ensures only read-only SELECT statements are executed
 */

const FORBIDDEN_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'DROP',
  'ALTER',
  'TRUNCATE',
  'CREATE',
  'REPLACE',
  'GRANT',
  'REVOKE',
  'EXECUTE',
  'EXEC',
  'CALL',
  'BEGIN',
  'COMMIT',
  'ROLLBACK',
  'SAVEPOINT',
  'SET ',
  'COPY',
  'VACUUM',
  'ANALYZE',
  'CLUSTER',
  'REINDEX',
  'LOCK',
  'UNLOCK',
  'LOAD',
  'UNLOAD'
];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates that a SQL query is read-only (SELECT only)
 */
export function validateReadOnlySQL(query: string): ValidationResult {
  if (!query || typeof query !== 'string') {
    return { isValid: false, error: 'Query must be a non-empty string' };
  }

  // Normalize the query: remove extra whitespace and convert to uppercase for checking
  const normalizedQuery = query
    .replace(/--.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .toUpperCase();

  if (!normalizedQuery) {
    return { isValid: false, error: 'Query is empty after removing comments' };
  }

  // Check if query starts with SELECT or WITH (for CTEs)
  if (!normalizedQuery.startsWith('SELECT') && !normalizedQuery.startsWith('WITH')) {
    return { 
      isValid: false, 
      error: 'Query must start with SELECT or WITH (for CTEs). Only read-only queries are allowed.' 
    };
  }

  // Check for forbidden keywords
  for (const keyword of FORBIDDEN_KEYWORDS) {
    // Use word boundary matching to avoid false positives
    // e.g., "UPDATES" in a column name should not match "UPDATE"
    const pattern = new RegExp(`\\b${keyword}\\b`, 'i');
    if (pattern.test(normalizedQuery)) {
      return { 
        isValid: false, 
        error: `Forbidden SQL keyword detected: ${keyword}. Only SELECT queries are allowed.` 
      };
    }
  }

  // Check for potential SQL injection patterns
  if (normalizedQuery.includes(';') && normalizedQuery.indexOf(';') < normalizedQuery.length - 1) {
    // Allow semicolon only at the end
    const afterSemicolon = normalizedQuery.substring(normalizedQuery.lastIndexOf(';') + 1).trim();
    
    if (afterSemicolon.length > 0) {
      return { 
        isValid: false, 
        error: 'Multiple SQL statements detected. Only single SELECT queries are allowed.' 
      };
    }
  }

  return { isValid: true };
}

/**
 * Sanitizes a SQL query by removing potential dangerous elements
 * Note: This is a basic sanitization - the primary defense is validateReadOnlySQL
 */
export function sanitizeSQL(query: string): string {
  return query
    .replace(/--.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .trim();
}
