import { create } from "zustand";
import type { PricingTemplate } from "../types";

interface PricingState {
  templates: PricingTemplate[];
  currentTemplateId: string | null;
  addTemplate: (t: PricingTemplate) => void;
  updateTemplate: (id: string, updates: Partial<PricingTemplate>) => void;
  deleteTemplate: (id: string) => void;
  setCurrentTemplateId: (id: string | null) => void;
  getCurrentTemplate: () => PricingTemplate | undefined;
}

export const usePricingStore = create<PricingState>((set, get) => ({
  templates: [],
  currentTemplateId: null,
  addTemplate: (t) =>
    set((s) => ({ templates: [...s.templates, t], currentTemplateId: t.id })),
  updateTemplate: (id, updates) =>
    set((s) => ({
      templates: s.templates.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  deleteTemplate: (id) =>
    set((s) => ({
      templates: s.templates.filter((t) => t.id !== id),
      currentTemplateId: s.currentTemplateId === id ? null : s.currentTemplateId,
    })),
  setCurrentTemplateId: (id) => set({ currentTemplateId: id }),
  getCurrentTemplate: () => {
    const { templates, currentTemplateId } = get();
    return templates.find((t) => t.id === currentTemplateId);
  },
}));
