import { create } from "zustand";

interface WSStatusState {
  isConnected: boolean;
  setConnected: (val: boolean) => void;
}

export const useWSStatus = create<WSStatusState>((set) => ({
  isConnected: false,
  setConnected: (val) => set({ isConnected: val }),
}));
