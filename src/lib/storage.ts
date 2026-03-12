import type { ChannelProfile, Topic, Script, ContentHistory } from '../types';

const KEYS = {
  channels: 'yta_channels',
  topics: 'yta_topics',
  scripts: 'yta_scripts',
  history: 'yta_history',
  activeChannel: 'yta_active_channel',
};

function get<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]');
  } catch {
    return [];
  }
}

function set<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Channels ──────────────────────────────────────────────────
export const channelStore = {
  getAll: (): ChannelProfile[] => get<ChannelProfile>(KEYS.channels),

  save: (channel: Omit<ChannelProfile, 'id' | 'createdAt'>): ChannelProfile => {
    const all = channelStore.getAll();
    const newChannel: ChannelProfile = {
      ...channel,
      id: genId(),
      createdAt: new Date().toISOString(),
    };
    set(KEYS.channels, [...all, newChannel]);
    return newChannel;
  },

  update: (id: string, patch: Partial<ChannelProfile>): void => {
    const all = channelStore.getAll().map((c) => (c.id === id ? { ...c, ...patch } : c));
    set(KEYS.channels, all);
  },

  delete: (id: string): void => {
    set(KEYS.channels, channelStore.getAll().filter((c) => c.id !== id));
  },

  getActive: (): string | null => localStorage.getItem(KEYS.activeChannel),
  setActive: (id: string): void => localStorage.setItem(KEYS.activeChannel, id),
};

// ── Topics ────────────────────────────────────────────────────
export const topicStore = {
  getByChannel: (channelId: string): Topic[] =>
    get<Topic>(KEYS.topics).filter((t) => t.channelId === channelId),

  saveAll: (channelId: string, topics: Omit<Topic, 'id' | 'channelId' | 'createdAt'>[]): Topic[] => {
    const existing = get<Topic>(KEYS.topics).filter((t) => t.channelId !== channelId);
    const newTopics: Topic[] = topics.map((t) => ({
      ...t,
      id: genId(),
      channelId,
      createdAt: new Date().toISOString(),
    }));
    set(KEYS.topics, [...existing, ...newTopics]);
    return newTopics;
  },
};

// ── Scripts ───────────────────────────────────────────────────
export const scriptStore = {
  getByChannel: (channelId: string): Script[] =>
    get<Script>(KEYS.scripts).filter((s) => s.channelId === channelId),

  getById: (id: string): Script | undefined =>
    get<Script>(KEYS.scripts).find((s) => s.id === id),

  save: (script: Omit<Script, 'id' | 'createdAt'>): Script => {
    const all = get<Script>(KEYS.scripts);
    const newScript: Script = {
      ...script,
      id: genId(),
      createdAt: new Date().toISOString(),
    };
    set(KEYS.scripts, [...all, newScript]);
    return newScript;
  },

  update: (id: string, patch: Partial<Script>): void => {
    const all = get<Script>(KEYS.scripts).map((s) => (s.id === id ? { ...s, ...patch } : s));
    set(KEYS.scripts, all);
  },

  delete: (id: string): void => {
    set(KEYS.scripts, get<Script>(KEYS.scripts).filter((s) => s.id !== id));
  },
};

// ── History ───────────────────────────────────────────────────
export const historyStore = {
  getByChannel: (channelId: string): ContentHistory[] =>
    get<ContentHistory>(KEYS.history)
      .filter((h) => h.channelId === channelId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20),

  add: (entry: Omit<ContentHistory, 'id'>): void => {
    const all = get<ContentHistory>(KEYS.history);
    set(KEYS.history, [{ ...entry, id: genId() }, ...all].slice(0, 100));
  },
};

// ── Notion Settings ───────────────────────────────────────────
const NOTION_KEY = 'yta_notion';

export interface NotionSettings {
  token: string;
  databaseId: string;
  titleProp: string;
}

export const notionStore = {
  get: (): NotionSettings => {
    try {
      const raw = localStorage.getItem(NOTION_KEY);
      return raw ? JSON.parse(raw) : { token: '', databaseId: '', titleProp: '이름' };
    } catch {
      return { token: '', databaseId: '', titleProp: '이름' };
    }
  },
  save: (settings: NotionSettings): void => {
    localStorage.setItem(NOTION_KEY, JSON.stringify(settings));
  },
};

export { genId };
