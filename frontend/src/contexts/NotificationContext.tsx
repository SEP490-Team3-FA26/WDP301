import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';
import notificationService from '../services/notification.service';

interface Notification {
  id: string;
  type: 'NEW_PR' | 'PR_APPROVED' | 'PR_REJECTED' | 'NEW_PO' | 'GRN_COMPLETED' | 'INFO' | 'SUCCESS' | 'ERROR';
  prId?: string;
  prCode?: string;
  poId?: string;
  grnId?: string;
  branchName?: string;
  branchId?: string;
  itemsCount?: number;
  totalAmount?: number;
  supplierName?: string;
  rejectionReason?: string;
  approvedBy?: string;
  receivedBy?: string;
  message: string;
  timestamp: string;
  read: boolean;
  createdBy?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isSocketConnected: boolean;
  connectionMode: 'realtime' | 'polling' | 'offline';
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const POLLING_INTERVAL = 30000; // 30 seconds
const MAX_NOTIFICATIONS = 100; // Max notifications to store

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    // Load notifications from localStorage on initial mount
    const saved = localStorage.getItem('notifications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved notifications:', e);
        return [];
      }
    }
    return [];
  });
  
  const { socket, isConnected: isSocketConnected, connectionError } = useSocket();
  const [connectionMode, setConnectionMode] = useState<'realtime' | 'polling' | 'offline'>('offline');
  const [lastPolledTimestamp, setLastPolledTimestamp] = useState<string>(new Date().toISOString());

  // Determine connection mode
  useEffect(() => {
    if (isSocketConnected) {
      setConnectionMode('realtime');
      console.log('📡 Notification mode: REALTIME (WebSocket)');
    } else if (connectionError) {
      setConnectionMode('polling');
      console.log('📡 Notification mode: POLLING (Fallback)');
    } else {
      setConnectionMode('offline');
      console.log('📡 Notification mode: OFFLINE');
    }
  }, [isSocketConnected, connectionError]);

  // Save to localStorage whenever notifications change
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Polling mechanism (fallback when WebSocket fails)
  useEffect(() => {
    if (connectionMode !== 'polling') return;

    console.log('🔄 Starting notification polling...');
    
    const pollNotifications = async () => {
      try {
        const response = await notificationService.getNewNotifications(lastPolledTimestamp);
        
        if (response.success && response.data?.length > 0) {
          console.log(`📥 Polled ${response.data.length} new notifications`);
          
          response.data.forEach((notif: any) => {
            addNotification({
              type: notif.type,
              message: notif.message,
              prId: notif.prId,
              prCode: notif.prCode,
              poId: notif.poId,
              grnId: notif.grnId,
              branchName: notif.branchName,
              branchId: notif.branchId,
              itemsCount: notif.itemsCount,
              totalAmount: notif.totalAmount,
              supplierName: notif.supplierName,
              rejectionReason: notif.rejectionReason,
              approvedBy: notif.approvedBy,
              receivedBy: notif.receivedBy,
            });
          });
          
          setLastPolledTimestamp(new Date().toISOString());
        }
      } catch (error) {
        console.error('❌ Polling failed:', error);
      }
    };

    // Initial poll
    pollNotifications();
    
    // Set up interval
    const intervalId = setInterval(pollNotifications, POLLING_INTERVAL);
    
    return () => {
      console.log('🛑 Stopping notification polling');
      clearInterval(intervalId);
    };
  }, [connectionMode, lastPolledTimestamp]);

  // Listen to socket events (real-time)
  useEffect(() => {
    if (!socket || !isSocketConnected) return;

    console.log('👂 Setting up real-time notification listeners...');

    const handleNewPR = (data: any) => {
      console.log('🔔 New PR notification received:', data);
      addNotification({
        type: 'NEW_PR',
        prId: data.prId,
        prCode: data.prCode || 'PR-???',
        branchName: data.branchName || 'Chi nhánh',
        branchId: data.branchId,
        itemsCount: data.itemsCount || 0,
        message: data.message || `Có yêu cầu nhập hàng mới từ ${data.branchName || 'chi nhánh'}`,
        createdBy: data.createdBy,
      });
    };

    const handlePRApproved = (data: any) => {
      console.log('✅ PR approved notification received:', data);
      addNotification({
        type: 'PR_APPROVED',
        prId: data.prId,
        prCode: data.prCode || 'PR-???',
        approvedBy: data.approvedBy,
        message: data.message || `Yêu cầu ${data.prCode || 'PR'} đã được phê duyệt`,
      });
    };

    const handlePRRejected = (data: any) => {
      console.log('❌ PR rejected notification received:', data);
      addNotification({
        type: 'PR_REJECTED',
        prId: data.prId,
        prCode: data.prCode || 'PR-???',
        rejectionReason: data.rejectionReason,
        message: data.message || `Yêu cầu ${data.prCode || 'PR'} bị từ chối`,
      });
    };

    const handleNewPO = (data: any) => {
      console.log('📦 New PO notification received:', data);
      addNotification({
        type: 'NEW_PO',
        poId: data.poId,
        supplierName: data.supplierName || 'Nhà cung cấp',
        itemsCount: data.itemsCount || 0,
        totalAmount: data.totalAmount || 0,
        message: data.message || `Đơn đặt hàng mới cho ${data.supplierName || 'nhà cung cấp'}`,
      });
    };

    const handleGRNCompleted = (data: any) => {
      console.log('📥 GRN completed notification received:', data);
      addNotification({
        type: 'GRN_COMPLETED',
        grnId: data.grnId,
        poId: data.poId,
        itemsCount: data.itemsCount || 0,
        totalAmount: data.totalAmount || 0,
        receivedBy: data.receivedBy,
        message: data.message || `Đã nhập kho ${data.itemsCount || 0} loại thuốc`,
      });
    };

    socket.on('new_pr_notification', handleNewPR);
    socket.on('pr_approved_notification', handlePRApproved);
    socket.on('pr_rejected_notification', handlePRRejected);
    socket.on('new_po_notification', handleNewPO);
    socket.on('grn_completed_notification', handleGRNCompleted);

    console.log('✅ Real-time notification listeners registered');

    return () => {
      socket.off('new_pr_notification', handleNewPR);
      socket.off('pr_approved_notification', handlePRApproved);
      socket.off('pr_rejected_notification', handlePRRejected);
      socket.off('new_po_notification', handleNewPO);
      socket.off('grn_completed_notification', handleGRNCompleted);
      console.log('🧹 Real-time notification listeners cleaned up');
    };
  }, [socket, isSocketConnected]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      read: false,
      timestamp: new Date().toISOString(),
    };

    setNotifications((prev) => {
      // Prevent duplicates (check last 10 notifications)
      const isDuplicate = prev.slice(0, 10).some(n => 
        n.type === newNotification.type && 
        n.message === newNotification.message &&
        Math.abs(new Date(n.timestamp).getTime() - new Date(newNotification.timestamp).getTime()) < 5000 // Within 5 seconds
      );
      
      if (isDuplicate) {
        console.log('⚠️  Duplicate notification detected, skipping');
        return prev;
      }
      
      // Keep only MAX_NOTIFICATIONS most recent
      const updated = [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS);
      return updated;
    });

    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('WDP301 - Thông báo mới', {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: newNotification.id, // Prevent duplicate browser notifications
      });
    }
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      console.log('🔄 Refreshing notifications from server...');
      const response = await notificationService.getMyNotifications({ limit: 50 });
      
      if (response.success && response.data) {
        // Merge with existing notifications (avoid duplicates)
        const serverNotifications = response.data.map((notif: any) => ({
          id: notif._id,
          type: notif.type,
          message: notif.message,
          timestamp: notif.createdAt,
          read: notif.read,
          prId: notif.prId,
          prCode: notif.prCode,
          poId: notif.poId,
          grnId: notif.grnId,
          branchName: notif.branchName,
          branchId: notif.branchId,
          itemsCount: notif.itemsCount,
          totalAmount: notif.totalAmount,
          supplierName: notif.supplierName,
          rejectionReason: notif.rejectionReason,
          approvedBy: notif.approvedBy,
          receivedBy: notif.receivedBy,
        }));
        
        setNotifications(serverNotifications);
        console.log(`✅ Loaded ${serverNotifications.length} notifications from server`);
      }
    } catch (error) {
      console.error('❌ Failed to refresh notifications:', error);
    }
  }, []);

  // Auto cleanup old notifications (> 30 days)
  useEffect(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    setNotifications(prev => 
      prev.filter(n => new Date(n.timestamp).getTime() > thirtyDaysAgo)
    );
  }, []);

  // Load notifications from server on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      refreshNotifications();
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isSocketConnected,
        connectionMode,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
