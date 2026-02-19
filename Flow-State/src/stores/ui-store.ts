import { create } from 'zustand';

interface UIState {
    // Sidebar
    sidebarCollapsed: boolean;
    activeTab: string;

    // Modals
    activeModal: string | null;
    modalData: any;

    // Notifications
    notifications: Array<{
        id: string;
        type: 'info' | 'success' | 'warning' | 'error';
        title: string;
        message: string;
        timestamp: number;
    }>;

    // Actions
    toggleSidebar: () => void;
    setActiveTab: (tab: string) => void;
    openModal: (modal: string, data?: any) => void;
    closeModal: () => void;
    addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void;
    removeNotification: (id: string) => void;
    clearNotifications: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    sidebarCollapsed: false,
    activeTab: 'dashboard',
    activeModal: null,
    modalData: null,
    notifications: [],

    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

    setActiveTab: (tab) => set({ activeTab: tab }),

    openModal: (modal, data = null) => set({ activeModal: modal, modalData: data }),

    closeModal: () => set({ activeModal: null, modalData: null }),

    addNotification: (notification) =>
        set((s) => ({
            notifications: [
                ...s.notifications,
                {
                    ...notification,
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                },
            ],
        })),

    removeNotification: (id) =>
        set((s) => ({
            notifications: s.notifications.filter((n) => n.id !== id),
        })),

    clearNotifications: () => set({ notifications: [] }),
}));
