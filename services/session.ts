import { ChatSession, ChatMessage } from '@/lib/models';
import StorageService from '@/services/storage';

export class SessionService {
  private storageService: StorageService;
  private tabSessions: Map<string, ChatSession> = new Map();
  private debug: boolean;

  constructor(storageService: StorageService, debug: boolean = false) {
    this.storageService = storageService;
    this.debug = debug;
  }

  /**
   * Load or create a session for a specific tab
   */
  async loadOrCreateTabSession(tabId: string): Promise<ChatSession> {
    // Check if tab session is in memory cache
    if (this.tabSessions.has(tabId)) {
      return this.tabSessions.get(tabId)!;
    }

    // Try to load from storage
    const storageKey = `tab_session_${tabId}`;
    const storedSession = await this.storageService.getItem<ChatSession>(
      storageKey,
      'session'
    );

    if (storedSession) {
      this.tabSessions.set(tabId, storedSession);
      this.log('Loaded tab session from storage', { tabId });
      return storedSession;
    }

    // Create new session for tab
    const newSession: ChatSession = {
      id: tabId,
      title: `Tab ${tabId}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.tabSessions.set(tabId, newSession);
    await this.storageService.setItem<ChatSession>(storageKey, newSession, 'session');
    this.log('Created new tab session', { tabId });

    return newSession;
  }

  /**
   * Get a tab's session
   */
  async getTabSession(tabId: string): Promise<ChatSession | null> {
    // Check in-memory cache first
    if (this.tabSessions.has(tabId)) {
      return this.tabSessions.get(tabId)!;
    }

    // Load from storage
    const storageKey = `tab_session_${tabId}`;
    const session = await this.storageService.getItem<ChatSession>(
      storageKey,
      'session'
    );

    if (session) {
      this.tabSessions.set(tabId, session);
    }

    return session || null;
  }

  /**
   * Add message to a tab's session
   */
  async addMessageToTabSession(tabId: string, message: ChatMessage): Promise<void> {
    let session: ChatSession | null | undefined = this.tabSessions.get(tabId);

    if (!session) {
      // Try loading from storage
      const storedSession = await this.getTabSession(tabId);
      if (!storedSession) {
        session = await this.loadOrCreateTabSession(tabId);
      } else {
        session = storedSession;
      }
    }

    session.messages.push({
      ...message,
      id: message.id || `${Date.now()}-${Math.random()}`,
      timestamp: message.timestamp || Date.now(),
    });

    session.updatedAt = Date.now();
    this.tabSessions.set(tabId, session);

    // Persist to storage
    const storageKey = `tab_session_${tabId}`;
    await this.storageService.setItem<ChatSession>(storageKey, session, 'session');

    this.log('Added message to tab session', {
      tabId,
      messageCount: session.messages.length,
    });
  }

  /**
   * Clear a tab's session
   */
  async clearTabSession(tabId: string): Promise<void> {
    this.tabSessions.delete(tabId);
    // Clear from storage by setting to null
    const storageKey = `tab_session_${tabId}`;
    await this.storageService.setItem(storageKey, null, 'session');
    this.log('Cleared tab session', { tabId });
  }

  private log(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[SessionService] ${message}`, data ?? '');
    }
  }
}
