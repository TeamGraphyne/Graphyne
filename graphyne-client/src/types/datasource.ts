export type DataSourceType = 'rest-api' | 'json-file' | 'csv-file';

// A field within the data source
export interface DataField {
  path: string;           // Dot-notation (batting.runs)
  type: 'string' | 'number' | 'boolean' | 'image-url';
  sampleValue?: string;   // Last known value
}

// The connection configuration (varies by type)
export interface DataSourceConnectionConfig {
  url?: string;           // For REST APIs
  filePath?: string;      // For local JSON/CSV files
  headers?: Record<string, string>;  // Optional HTTP headers
  rootPath?: string;      // JSON path to navigate into 
}

// The full data source record as stored in the DB
export interface DataSourceData {
  id: string;
  projectId: string;
  name: string;
  type: DataSourceType;
  config: DataSourceConnectionConfig;
  pollingInterval: number;   // Seconds (0 = manual only)
  autoStart: boolean;
  fields: DataField[];
  createdAt?: string;
  updatedAt?: string;
}

// Socket.io event payloads
export interface DataUpdatePayload {
  sourceId: string;
  data: Record<string, unknown>;  // Flat key-value: { "homeTeam.score": 3 }
}

export interface DataErrorPayload {
  sourceId: string;
  error: string;
}