import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSocket } from '../hooks/useSocket';

interface Notification {
  id: string;
  type: 'NEW_PR' | 'PR_APPROVED' | 'PR_REJECTED' | 'INFO' | 'SUCCESS' | 'ERROR';
  prId?: string;
  prCode?: string;
  branchName?: string;
  branchId?: string;
  itemsCount?: number;
  message: string;
  timestamp: string;
  read: boolean;
  createdBy?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { socket, isConnected } = useSocket();

  // Listen to socket events
  useEffect(() => {
    if (!socket || !isConnected) return;

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
        prCode: data.prCode,
        message: data.message,
      });
    };

    const handlePRRejected = (data: any) => {
      console.log('❌ PR rejected notification received:', data);
      addNotification({
        type: 'PR_REJECTED',
        prId: data.prId,
        prCode: data.prCode,
        message: data.message,
      });
    };

    socket.on('new_pr_notification', handleNewPR);
    socket.on('pr_approved_notification', handlePRApproved);
    socket.on('pr_rejected_notification', handlePRRejected);

    return () => {
      socket.off('new_pr_notification', handleNewPR);
      socket.off('pr_approved_notification', handlePRApproved);
      socket.off('pr_rejected_notification', handlePRRejected);
    };
  }, [socket, isConnected]);

  const addNotification = (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      read: false,
      timestamp: new Date().toISOString(),
    };

    setNotifications((prev) => [newNotification, ...prev]);

    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('WDP301 - Thông báo mới', {
        body: notification.message,
        icon: '/favicon.ico',
      });
    }
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
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
