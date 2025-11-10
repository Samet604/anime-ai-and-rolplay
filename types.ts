export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  sources?: { uri: string; title: string }[];
  isThinking?: boolean;
  imageUrl?: string;
  isThinkingImage?: boolean;
  fileData?: string; // Base64 data for sending
  fileMimeType?: string; // Mime type for sending
}

export enum Tab {
  CHAT = 'chat',
  LIVE = 'live',
  ROLEPLAY = 'roleplay',
  STUDY = 'study',
  COMPANION = 'companion',
  SETTINGS = 'settings',
}

export type Theme = 'yandere' | 'kuudere' | 'deredere' | 'tsundere' | 'dandere' | 'himedere' | 'sadodere' | 'mayadere' | 'undere' | 'bakadere' | 'kamidere' | 'shundere';

export interface Companion {
  id: string;
  name: string;
  avatarUrl: string;
  systemInstruction: string;
  subtitle: string;
  avatarPrompt?: string;
}

export interface AuthStatus {
  isLoggedIn: boolean;
  username?: string;
}

export type UiMode = 'dark' | 'light';

export type UserGender = 'male' | 'female' | 'nonbinary' | 'helicopter' | 'toast' | 'potato';
