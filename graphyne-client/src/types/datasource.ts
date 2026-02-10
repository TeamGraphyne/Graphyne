export type DataSourceType = 'json-file' | 'csv-file' | 'rest-api' | 'google-sheets';

export interface DataSourceConfig {
  id: string;
  name: string;
  type: DataSourceType;

  // Connection
  url?: string;          // REST API / Google Sheets
  filePath?: string;     // JSON/CSV

  // Polling
  pollingInterval: number; // Seconds (0 = manual only)
  autoStart: boolean;      // Start polling when playout begins

  // Data shape
  rootPath?: string;     // JSON path to data root, e.g., "data.match"
  fields: DataField[];
}

export interface DataField {
  path: string;          // e.g., "homeTeam.score"
  type: 'string' | 'number' | 'boolean' | 'image-url';
  sampleValue?: string;  // Last known value for preview
}