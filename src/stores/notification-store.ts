import { create } from "zustand";

interface NotificationPreferences {
  soundEnabled: boolean;
  soundVolume: number; // 0-100
  pushEnabled: boolean;
  toastEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  setSoundVolume: (v: number) => void;
  setPushEnabled: (v: boolean) => void;
  setToastEnabled: (v: boolean) => void;
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem("notification_prefs");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePrefs(state: Partial<NotificationPreferences>) {
  localStorage.setItem(
    "notification_prefs",
    JSON.stringify({
      soundEnabled: state.soundEnabled,
      soundVolume: state.soundVolume,
      pushEnabled: state.pushEnabled,
      toastEnabled: state.toastEnabled,
    })
  );
}

const saved = loadPrefs();

export const useNotificationPrefs = create<NotificationPreferences>((set) => ({
  soundEnabled: saved.soundEnabled ?? true,
  soundVolume: saved.soundVolume ?? 70,
  pushEnabled: saved.pushEnabled ?? true,
  toastEnabled: saved.toastEnabled ?? true,
  setSoundEnabled: (v) =>
    set((s) => {
      const next = { ...s, soundEnabled: v };
      savePrefs(next);
      return next;
    }),
  setSoundVolume: (v) =>
    set((s) => {
      const next = { ...s, soundVolume: v };
      savePrefs(next);
      return next;
    }),
  setPushEnabled: (v) =>
    set((s) => {
      const next = { ...s, pushEnabled: v };
      savePrefs(next);
      return next;
    }),
  setToastEnabled: (v) =>
    set((s) => {
      const next = { ...s, toastEnabled: v };
      savePrefs(next);
      return next;
    }),
}));
