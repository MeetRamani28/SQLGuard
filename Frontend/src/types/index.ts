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
  chat_history?: Array<{ question?: string; sql_query?: string }>;
}

export interface AnomalyItem {
  column: string;
  value: unknown;
  row_index: number;
  type: "outlier" | "zero_value" | "null_burst";
  message: string;
}

export interface SqlOptimizationResult {
  success: boolean;
  dialect: string;
  sql_query: string;
  complexity_score: "Low" | "Medium" | "High" | "Unknown";
  performance_score: number;
  recommendations: string[];
}

export interface DialectTranslationResult {
  success: boolean;
  source_dialect: string;
  target_dialect: string;
  original_sql: string;
  translated_sql: string;
}

export interface SavedQueryItem {
  id: string;
  title: string;
  question: string;
  sql_query: string;
  tag?: string;
  created_at: string;
}

export interface ScheduleItem {
  id: string;
  name: string;
  question: string;
  cron_expression: string;
  status: string;
  created_at: string;
}

export interface QueryResponseData {
  question: string;
  sql_query: string | null;
  query_result: Array<Record<string, unknown>> | null;
  chart_type: "bar" | "line" | "pie" | "table" | "none";
  explanation: string | null;
  executive_summary?: string[] | null;
  anomalies?: AnomalyItem[] | null;
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

export interface PinnedCardItem {
  id: string;
  title: string;
  data: QueryResponseData;
  pinnedAt: string;
}