export class ExportJobStatusDto {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  filename?: string;
  totalRecords?: number;
  progress?: number;
  error?: string;
  createdAt: Date;
}
