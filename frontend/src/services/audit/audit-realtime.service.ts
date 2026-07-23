import { auditService, AuditLogItem, AuditLogQuery } from './audit.service';

export type ConnectionStatus = 'LIVE' | 'RECONNECTING' | 'OFFLINE';

export class AuditRealtimeService {
  private active = false;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private status: ConnectionStatus = 'OFFLINE';
  private lastEventId: string | null = null;
  
  // Exponential backoff properties
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  
  // Callbacks
  private logCallbacks: Set<(log: AuditLogItem) => void> = new Set();
  private statusCallbacks: Set<(status: ConnectionStatus) => void> = new Set();
  
  // Filter state for client-side matching
  private activeFilters: AuditLogQuery = {};
  
  // Deduplication cache to prevent displaying duplicates (max 1000 items)
  private processedEventIds: Set<string> = new Set();
  private eventIdHistory: string[] = [];

  constructor() {}

  public onLogReceived(cb: (log: AuditLogItem) => void): () => void {
    this.logCallbacks.add(cb);
    return () => this.logCallbacks.delete(cb);
  }

  public onStatusChanged(cb: (status: ConnectionStatus) => void): () => void {
    this.statusCallbacks.add(cb);
    cb(this.status); // Immediately trigger with current status
    return () => this.statusCallbacks.delete(cb);
  }

  public setFilters(filters: AuditLogQuery) {
    this.activeFilters = { ...filters };
  }

  public setLastEventId(eventId: string | null) {
    if (eventId) {
      this.lastEventId = eventId;
      this.addToDeduplicationCache(eventId);
    }
  }

  private setStatus(newStatus: ConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusCallbacks.forEach(cb => cb(newStatus));
    }
  }

  public start() {
    if (this.active) return;
    this.active = true;
    this.reconnectDelay = 1000;
    this.connect();
  }

  public stop() {
    this.active = false;
    if (this.reader) {
      try {
        this.reader.cancel();
      } catch (e) {
        console.error('Failed to cancel stream reader', e);
      }
      this.reader = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.setStatus('OFFLINE');
  }

  private async connect() {
    if (!this.active) return;
    const token = localStorage.getItem('token');
    if (!token) {
      this.setStatus('OFFLINE');
      this.scheduleReconnect();
      return;
    }

    try {
      // 1. If we have a lastEventId, pull any missing events from downtime first
      if (this.lastEventId) {
        this.setStatus('RECONNECTING');
        await this.syncMissingEvents(this.lastEventId);
      }

      // 2. Open standard HTTP Stream using native fetch
      const baseUrl = process.env.REACT_APP_API_URL || '';
      const url = `${baseUrl}/api/users/audit-logs/stream`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP Stream response status: ${response.status}`);
      }

      const body = response.body;
      if (!body) {
        throw new Error('Response body is null');
      }

      this.reader = body.getReader();
      this.setStatus('LIVE');
      this.reconnectDelay = 1000; // Reset backoff on successful connect

      const decoder = new TextDecoder();
      let buffer = '';

      while (this.active) {
        const { value, done } = await this.reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Hold partial line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            try {
              const dataJsonStr = trimmed.substring(5).trim();
              const log: AuditLogItem = JSON.parse(dataJsonStr);
              this.handleIncomingLog(log);
            } catch (err) {
              // Ignore ping keep-alives or format mismatches
            }
          }
        }
      }
    } catch (err) {
      console.warn('Real-time Audit stream connection failed. Reconnecting...', err);
      this.setStatus('RECONNECTING');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    // Apply exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
  }

  private async syncMissingEvents(eventId: string) {
    try {
      const missedRes = await auditService.getAuditLogs({
        page: 1,
        limit: 50,
        afterEventId: eventId,
      });

      if (missedRes && missedRes.items && missedRes.items.length > 0) {
        // Reverse array to process them in oldest-to-newest chronological order
        const sortedMissed = [...missedRes.items].reverse();
        for (const log of sortedMissed) {
          this.handleIncomingLog(log);
        }
      }
    } catch (err) {
      console.error('Failed to sync missing logs during reconnect', err);
    }
  }

  private handleIncomingLog(log: AuditLogItem) {
    if (!log || !log.auditEventId) return;

    // Check for duplicates
    if (this.processedEventIds.has(log.auditEventId)) {
      return;
    }

    this.lastEventId = log.auditEventId;
    this.addToDeduplicationCache(log.auditEventId);

    // Check client-side filters
    if (this.matchesFilters(log)) {
      this.logCallbacks.forEach(cb => cb(log));
    }
  }

  private addToDeduplicationCache(eventId: string) {
    this.processedEventIds.add(eventId);
    this.eventIdHistory.push(eventId);

    // Maintain max size of 1000 items to prevent infinite memory growth
    if (this.eventIdHistory.length > 1000) {
      const oldest = this.eventIdHistory.shift();
      if (oldest) {
        this.processedEventIds.delete(oldest);
      }
    }
  }

  private matchesFilters(log: AuditLogItem): boolean {
    const filters = this.activeFilters;

    // 1. Search Query Match
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const match =
        log.username.toLowerCase().includes(q) ||
        log.actionCode.toLowerCase().includes(q) ||
        log.actionName.toLowerCase().includes(q) ||
        log.summary.toLowerCase().includes(q) ||
        log.ip.includes(q);
      if (!match) return false;
    }

    // 2. Role Match
    if (filters.role && log.role !== filters.role) {
      return false;
    }

    // 3. Module Match
    if (filters.module) {
      // Split allowed modules (e.g. "Inventory,Purchase" from warehouse Scope)
      const allowed = filters.module.split(',');
      if (!allowed.includes(log.module)) {
        return false;
      }
    }

    // 4. Event Type Match
    if (filters.eventType && log.eventType !== filters.eventType) {
      return false;
    }

    // 5. Severity Match
    if (filters.severity && log.severity !== filters.severity) {
      return false;
    }

    // 6. Status Match
    if (filters.status && log.status !== filters.status) {
      return false;
    }

    return true;
  }
}

// Singleton instances can be instantiated here
export const auditRealtimeService = new AuditRealtimeService();
