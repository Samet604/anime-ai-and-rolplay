export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  sources?: { uri: string; title: string }[];
  isThinking?: boolean;
}

export enum Tab {
  CHAT = 'chat',
  LIVE = 'live',
  ROLEPLAY = 'roleplay',
  SETTINGS = 'settings',
}

export type Theme = 'yandere' | 'kuudere' | 'deredere' | 'tsundere' | 'dandere' | 'himedere' | 'sadodere' | 'mayadere' | 'undere';

export interface CustomBot {
  name: string;
  avatarUrl: string;
  systemInstruction: string;
  subtitle: string;
}

export interface AuthStatus {
  isLoggedIn: boolean;
  username?: string;
}