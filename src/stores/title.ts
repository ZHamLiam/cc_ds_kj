import { create } from "zustand";
import type { TitleRecord, UserStyleProfile } from "../types";

interface TitleState {
  titleRecords: TitleRecord[];
  styleProfiles: UserStyleProfile[];
  addTitleRecord: (record: TitleRecord) => void;
  addStyleProfile: (profile: UserStyleProfile) => void;
  updateStyleProfile: (region: string, platform: string, profile: Partial<UserStyleProfile>) => void;
  getStyleProfile: (region: string, platform: string) => UserStyleProfile | undefined;
}

export const useTitleStore = create<TitleState>((set, get) => ({
  titleRecords: [],
  styleProfiles: [],
  addTitleRecord: (record) =>
    set((s) => ({ titleRecords: [record, ...s.titleRecords] })),
  addStyleProfile: (profile) =>
    set((s) => ({ styleProfiles: [...s.styleProfiles, profile] })),
  updateStyleProfile: (region, platform, updates) =>
    set((s) => ({
      styleProfiles: s.styleProfiles.map((p) =>
        p.region === region && p.platform === platform
          ? { ...p, ...updates, updatedAt: Date.now() }
          : p
      ),
    })),
  getStyleProfile: (region, platform) =>
    get().styleProfiles.find((p) => p.region === region && p.platform === platform),
}));
