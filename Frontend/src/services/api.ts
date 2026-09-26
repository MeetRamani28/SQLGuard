import axios from "axios";
import type {
  DbConfig,
  QueryRequestPayload,
  QueryResponseData,
  SchemaResponseData,
  TestDbResponse,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000,
});

export const submitAnalyticsQuery = async (
  question: string,
  dbConfig?: DbConfig | null,
): Promise<QueryResponseData> => {
  try {
    const payload: QueryRequestPayload = {
      question,
      db_config: dbConfig || null,
    };
    const response = await apiClient.post<QueryResponseData>(
      "/api/v1/query",
      payload,
    );
    return response.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data?.detail || "Failed to process query on server",
        { cause: error },
      );
    }
    throw new Error("Network error: Unable to reach SQLGuard API backend.", {
      cause: error,
    });
  }
};

export const testDbConnection = async (
  dbConfig: DbConfig,
): Promise<TestDbResponse> => {
  try {
    const response = await apiClient.post<TestDbResponse>(
      "/api/v1/test-db",
      dbConfig,
    );
    return response.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        dialect: "unknown",
        message: error.response.data?.detail || "Connection test failed",
      };
    }
    return {
      success: false,
      dialect: "unknown",
      message: "Network error: Unable to reach SQLGuard backend.",
    };
  }
};

export const fetchDatabaseSchema = async (
  dbConfig?: DbConfig | null,
): Promise<SchemaResponseData> => {
  try {
    const response = await apiClient.post<SchemaResponseData>("/api/v1/schema", {
      db_config: dbConfig || null,
    });
    return response.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return {
      success: false,
      dialect: "unknown",
      tables: [],
      raw_schema: "",
      error: error.message || "Failed to retrieve schema information.",
    };
  }
};
