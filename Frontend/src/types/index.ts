export interface DbConfig {
  preset_name?: string;
  db_type?: "postgres" | "url" | "sqlite";
  connection_url?: string;
  host?: string;
  port?: number;
  dbname?: string;
  user?: string;
  password?: string;
  sslmode?: string;
  sqlite_path?: string;
}

export interface SavedDbPreset {
  id: string;
  name: string;
  config: DbConfig;
  createdAt: string;
}

export interface TestDbResponse {
  success: boolean;
  dialect: string;
  message: string;
}

export interface TableColumnInfo {
  name: string;
  type: string;
}

export interface TableSchemaInfo {
  table_name: string;
  columns: TableColumnInfo[];
}

export interface SchemaResponseData {
  success: boolean;
  dialect: string;
  tables: TableSchemaInfo[];
  raw_schema: string;
  error?: string | null;
}

export interface QueryRequestPayload {
  question: string;
  db_config?: DbConfig | null;
}

export interface QueryResponseData {
  question: string;
  sql_query: string | null;
  query_result: Array<Record<string, unknown>> | null;
  chart_type: "bar" | "line" | "pie" | "table" | "none";
  explanation: string | null;
  retry_count: number;
  error_trace: string | null;
  execution_time_ms?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content?: string;
  data?: QueryResponseData;
  timestamp: string;
  error?: string | null;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface HistoryItem {
  id: string;
  question: string;
  timestamp: string;
  chartType: string;
}