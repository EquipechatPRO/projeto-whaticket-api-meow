import { create } from "zustand";

interface ConnectionStore {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  baseUrl: localStorage.getItem("api_base_url") || "http://localhost:8080",
  setBaseUrl: (url: string) => {
    localStorage.setItem("api_base_url", url);
    set({ baseUrl: url });
  },
}));
