import { create } from "zustand";
import type { LLMProvider } from "../types";

interface AppState {
  sidebarOpen: boolean;
  currentPage: string;
  currentModel: string;
  currentProvider: LLMProvider | null;
  setSidebarOpen: (open: boolean) => void;
  setCurrentPage: (page: string) => void;
  setCurrentModel: (model: string) => void;
  setCurrentProvider: (provider: LLMProvider | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  currentPage: "translate-popup",
  currentModel: "deepseek-chat",
  currentProvider: null,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setCurrentModel: (model) => set({ currentModel: model }),
  setCurrentProvider: (provider) => set({ currentProvider: provider }),
}));
