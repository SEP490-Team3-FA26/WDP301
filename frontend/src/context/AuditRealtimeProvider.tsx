import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { auditRealtimeService, ConnectionStatus } from '../services/audit/audit-realtime.service';
import { auditService, AuditLogItem, AuditLogQuery } from '../services/audit/audit.service';

interface AuditRealtimeContextType {
  visibleLogs: AuditLogItem[];
  incomingLogs: AuditLogItem[];
  connectionStatus: ConnectionStatus;
  loading: boolean;
  total: number;
  isScrolledDown: boolean;
  setIsScrolledDown: (scrolled: boolean) => void;
  fetchLogs: (query: AuditLogQuery) => Promise<void>;
  flushIncomingLogs: () => void;
  setLastKnownId: (id: string | null) => void;
}

const AuditRealtimeContext = createContext<AuditRealtimeContextType | undefined>(undefined);

export const useAuditRealtime = () => {
  const context = useContext(AuditRealtimeContext);
  if (!context) {
    throw new Error('useAuditRealtime must be used within an AuditRealtimeProvider');
  }
  return context;
};

export const AuditRealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visibleLogs, setVisibleLogs] = useState<AuditLogItem[]>([]);
  const [incomingLogs, setIncomingLogs] = useState<AuditLogItem[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('OFFLINE');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState<number>(0);
  const [currentFilters, setCurrentFilters] = useState<AuditLogQuery>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [isScrolledDown, setIsScrolledDown] = useState(false);

  // Use refs to prevent stale closures in the real-time event listener callback
  const currentPageRef = useRef(1);
  const isScrolledDownRef = useRef(false);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    isScrolledDownRef.current = isScrolledDown;
  }, [isScrolledDown]);

  // Sync latest logs for reconnect sync reference
  useEffect(() => {
    if (visibleLogs.length > 0) {
      auditRealtimeService.setLastEventId(visibleLogs[0].auditEventId);
    }
  }, [visibleLogs]);

  // Load logs via REST API initially or when filters/page change
  const fetchLogs = useCallback(async (query: AuditLogQuery) => {
    setLoading(true);
    try {
      setCurrentFilters(query);
      setCurrentPage(query.page || 1);
      
      // Update filters in service to perform matching Client-side filter checking on streaming events
      auditRealtimeService.setFilters(query);

      const res = await auditService.getAuditLogs(query);
      if (res && !('error' in res)) {
        setVisibleLogs(res.items || []);
        setTotal(res.total || 0);
        
        // Reset pending incoming queue when filters/page are updated
        setIncomingLogs([]);
      }
    } catch (err) {
      console.error('Failed to load logs', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update lastEventId on reconnect sync
  const setLastKnownId = useCallback((id: string | null) => {
    auditRealtimeService.setLastEventId(id);
  }, []);

  // Append incoming logs to the top of visibleLogs when requested
  const flushIncomingLogs = useCallback(() => {
    if (incomingLogs.length === 0) return;
    
    setVisibleLogs(prev => {
      const prevMap = new Map<string, AuditLogItem>(prev.map(item => [item.auditEventId, item]));
      // Prepend incoming items (reversing to insert newest first)
      const sortedIncoming = [...incomingLogs];
      for (const item of sortedIncoming) {
        prevMap.set(item.auditEventId, item);
      }
      return Array.from(prevMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    setTotal(prev => prev + incomingLogs.length);
    setIncomingLogs([]);
  }, [incomingLogs]);

  // Subscribe to real-time events on service activation
  useEffect(() => {
    // Start streaming service
    auditRealtimeService.start();

    // Subscribe to status changes
    const unsubStatus = auditRealtimeService.onStatusChanged(status => {
      setConnectionStatus(status);
    });

    // Subscribe to incoming stream events
    const unsubLog = auditRealtimeService.onLogReceived(log => {
      // Determine how to handle incoming event based on client view state:
      // If user is browsing page 1 AND not scrolled down: prepend immediately.
      // If page > 1 OR user is scrolled down: hold in incomingLogs queue.
      if (currentPageRef.current === 1 && !isScrolledDownRef.current) {
        setVisibleLogs(prev => {
          if (prev.some(item => item.auditEventId === log.auditEventId)) {
            return prev;
          }
          return [log, ...prev];
        });
        setTotal(prev => prev + 1);
      } else {
        setIncomingLogs(prev => {
          if (prev.some(item => item.auditEventId === log.auditEventId)) {
            return prev;
          }
          return [log, ...prev];
        });
      }
    });

    return () => {
      unsubStatus();
      unsubLog();
      auditRealtimeService.stop();
    };
  }, []);

  return (
    <AuditRealtimeContext.Provider
      value={{
        visibleLogs,
        incomingLogs,
        connectionStatus,
        loading,
        total,
        isScrolledDown,
        setIsScrolledDown,
        fetchLogs,
        flushIncomingLogs,
        setLastKnownId
      }}
    >
      {children}
    </AuditRealtimeContext.Provider>
  );
};
