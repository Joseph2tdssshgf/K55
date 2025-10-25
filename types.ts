export interface Message {
  role: 'user' | 'model';
  text?: string;
  imageUrl?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}
