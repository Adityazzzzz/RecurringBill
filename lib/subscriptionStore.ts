import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { HOME_SUBSCRIPTIONS } from '@/constants/data';
import { scheduleNotification, cancelNotification } from './notifications';

interface SubscriptionStore {
  subscriptions: Subscription[];
  baseCurrency: string;
  theme: string;
  pushNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  reminderOffsetDays: number;
  
  addSubscription: (subscription: Subscription) => void;
  setSubscriptions: (subscriptions: Subscription[]) => void;
  setBaseCurrency: (baseCurrency: string) => void;
  setTheme: (theme: string) => void;
  setPushNotificationsEnabled: (enabled: boolean) => void;
  setEmailNotificationsEnabled: (enabled: boolean) => void;
  setReminderOffsetDays: (days: number) => void;
}

const secureStoreAdapter = {
  getItem: async (name: string) => {
    const value = await SecureStore.getItemAsync(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set, get) => ({
      subscriptions: HOME_SUBSCRIPTIONS,
      baseCurrency: 'USD',
      theme: 'system',
      pushNotificationsEnabled: true,
      emailNotificationsEnabled: true,
      reminderOffsetDays: 3,

      addSubscription: async (subscription) => {
        const offset = get().reminderOffsetDays;
        const pushEnabled = get().pushNotificationsEnabled;
        
        let notificationId: string | undefined;
        if (pushEnabled && subscription.status === 'active') {
          const id = await scheduleNotification(subscription, offset);
          if (id) notificationId = id;
        }
        
        const newSub = { ...subscription, notificationId };
        set((state) => ({ subscriptions: [newSub, ...state.subscriptions] }));
      },
      
      setSubscriptions: (subscriptions) => set({ subscriptions }),
      
      setBaseCurrency: (baseCurrency) => set({ baseCurrency }),
      
      setTheme: (theme) => set({ theme }),
      
      setPushNotificationsEnabled: async (enabled) => {
        const { subscriptions, reminderOffsetDays } = get();
        
        if (!enabled) {
          // Cancel all scheduled notifications
          for (const sub of subscriptions) {
            if (sub.notificationId) {
              await cancelNotification(sub.notificationId);
              sub.notificationId = undefined;
            }
          }
        } else {
          // Re-schedule all active notifications
          for (const sub of subscriptions) {
            if (sub.status === 'active' && !sub.notificationId) {
              const id = await scheduleNotification(sub, reminderOffsetDays);
              if (id) sub.notificationId = id;
            }
          }
        }
        
        set({ pushNotificationsEnabled: enabled, subscriptions: [...subscriptions] });
      },
      
      setEmailNotificationsEnabled: (enabled) => set({ emailNotificationsEnabled: enabled }),
      
      setReminderOffsetDays: async (days) => {
        const { subscriptions, pushNotificationsEnabled } = get();
        
        if (pushNotificationsEnabled) {
          // Re-schedule all active notifications with new offset
          for (const sub of subscriptions) {
            if (sub.status === 'active') {
              if (sub.notificationId) {
                await cancelNotification(sub.notificationId);
              }
              const id = await scheduleNotification(sub, days);
              sub.notificationId = id || undefined;
            }
          }
        }
        
        set({ reminderOffsetDays: days, subscriptions: [...subscriptions] });
      },
    }),
    {
      name: 'recurringbill-storage',
      storage: createJSONStorage(() => secureStoreAdapter),
    }
  )
);