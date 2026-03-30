import { faker } from '@faker-js/faker';

/**
 * Telegram WebApp User interface
 */
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

/**
 * Telegram WebApp Chat interface
 */
export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  photo_url?: string;
}

/**
 * Telegram WebApp initDataUnsafe interface
 */
export interface InitDataUnsafe {
  query_id?: string;
  user?: TelegramUser;
  receiver?: TelegramUser;
  chat?: TelegramChat;
  chat_type?: string;
  chat_instance?: string;
  start_param?: string;
  can_send_after?: number;
  auth_date: number;
  hash: string;
}

/**
 * BackButton interface with state management
 */
export interface MockBackButton {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
}

/**
 * MainButton interface with state management
 */
export interface MockMainButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;
  show: () => void;
  hide: () => void;
  enable: () => void;
  disable: () => void;
  showProgress: (leaveActive: boolean) => void;
  hideProgress: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
  setText: (text: string) => void;
  setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
}

/**
 * Mock Telegram WebApp object
 */
export interface MockTelegramWebApp {
  initData: string;
  initDataUnsafe: InitDataUnsafe;
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  isClosingConfirmationEnabled: boolean;
  headerColor: string;
  backgroundColor: string;
  BackButton: MockBackButton;
  MainButton: MockMainButton;
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  // Methods
  ready: () => void;
  expand: () => void;
  close: () => void;
  sendData: (data: string) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  showPopup: (params: { title?: string; message: string; buttons?: Array<{ id?: string; type?: string; text?: string }> }, callback?: (buttonId: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  // Event system
  onEvent: (eventType: string, callback: () => void) => void;
  offEvent: (eventType: string, callback: () => void) => void;
}

/**
 * Create a mock Telegram user
 */
export function createMockTelegramUser(overrides: Partial<TelegramUser> = {}): TelegramUser {
  return {
    id: faker.number.int({ min: 100000000, max: 999999999 }),
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    username: faker.internet.username().toLowerCase(),
    language_code: faker.helpers.arrayElement(['es', 'en', 'pt', 'ru']),
    is_premium: faker.datatype.boolean({ probability: 0.15 }),
    ...overrides,
  };
}

/**
 * Create a minimal mock Telegram user (no username, no lastName)
 */
export function createMockMinimalUser(overrides: Partial<TelegramUser> = {}): TelegramUser {
  return {
    id: faker.number.int({ min: 100000000, max: 999999999 }),
    first_name: faker.person.firstName(),
    language_code: 'es',
    is_premium: false,
    ...overrides,
  };
}

/**
 * Create mock initData string (NOT cryptographically valid - for UI testing only)
 */
export function createMockInitData(user: TelegramUser, startParam?: string): string {
  const authDate = Math.floor(Date.now() / 1000);
  const queryId = faker.string.alphanumeric(24);

  const params = new URLSearchParams();
  params.set('query_id', queryId);
  params.set('user', JSON.stringify(user));
  params.set('auth_date', String(authDate));
  if (startParam) {
    params.set('start_param', startParam);
  }
  params.set('hash', faker.string.hexadecimal({ length: 64, casing: 'lower' }).slice(2));

  return params.toString();
}

/**
 * Create mock initDataUnsafe object
 */
export function createMockInitDataUnsafe(overrides: Partial<InitDataUnsafe> = {}): InitDataUnsafe {
  const user = createMockTelegramUser();

  return {
    query_id: faker.string.alphanumeric(24),
    user,
    auth_date: Math.floor(Date.now() / 1000),
    hash: faker.string.hexadecimal({ length: 64, casing: 'lower' }).slice(2),
    ...overrides,
  };
}

/**
 * Create a full mock Telegram WebApp object for testing
 * State is properly managed - methods update their corresponding properties
 */
export function createMockTelegramWebApp(
  userOverrides: Partial<TelegramUser> = {},
  startParam?: string
): MockTelegramWebApp {
  const user = createMockTelegramUser(userOverrides);
  const initDataUnsafe = createMockInitDataUnsafe({ user });
  const initData = createMockInitData(user, startParam);

  const mainButtonCallbacks: Array<() => void> = [];
  const backButtonCallbacks: Array<() => void> = [];
  const eventListeners: Map<string, Set<() => void>> = new Map();

  // Create stateful objects
  const backButton: MockBackButton = {
    isVisible: false,
    show() {
      this.isVisible = true;
    },
    hide() {
      this.isVisible = false;
    },
    onClick(callback) {
      backButtonCallbacks.push(callback);
    },
    offClick(callback) {
      const index = backButtonCallbacks.indexOf(callback);
      if (index > -1) backButtonCallbacks.splice(index, 1);
    },
  };

  const mainButton: MockMainButton = {
    text: '',
    color: '#2481cc',
    textColor: '#ffffff',
    isVisible: false,
    isActive: true,
    isProgressVisible: false,
    show() {
      this.isVisible = true;
    },
    hide() {
      this.isVisible = false;
    },
    enable() {
      this.isActive = true;
    },
    disable() {
      this.isActive = false;
    },
    showProgress(leaveActive) {
      this.isProgressVisible = true;
      if (!leaveActive) this.isActive = false;
    },
    hideProgress() {
      this.isProgressVisible = false;
    },
    onClick(callback) {
      mainButtonCallbacks.push(callback);
    },
    offClick(callback) {
      const index = mainButtonCallbacks.indexOf(callback);
      if (index > -1) mainButtonCallbacks.splice(index, 1);
    },
    setText(text) {
      this.text = text;
    },
    setParams(params) {
      if (params.text !== undefined) this.text = params.text;
      if (params.color !== undefined) this.color = params.color;
      if (params.text_color !== undefined) this.textColor = params.text_color;
      if (params.is_active !== undefined) this.isActive = params.is_active;
      if (params.is_visible !== undefined) this.isVisible = params.is_visible;
    },
  };

  const webApp: MockTelegramWebApp = {
    initData,
    initDataUnsafe,
    version: '7.0',
    platform: 'tdesktop',
    colorScheme: 'dark',
    themeParams: {
      bg_color: '#1a1a1a',
      text_color: '#ffffff',
      hint_color: '#999999',
      link_color: '#2481cc',
      button_color: '#2481cc',
      button_text_color: '#ffffff',
      secondary_bg_color: '#232323',
    },
    isExpanded: true,
    viewportHeight: 600,
    viewportStableHeight: 600,
    isClosingConfirmationEnabled: false,
    headerColor: '#1a1a1a',
    backgroundColor: '#1a1a1a',
    BackButton: backButton,
    MainButton: mainButton,
    HapticFeedback: {
      impactOccurred: () => {},
      notificationOccurred: () => {},
      selectionChanged: () => {},
    },
    ready: () => {},
    expand() {
      this.isExpanded = true;
    },
    close: () => {},
    sendData: () => {},
    openLink: () => {},
    openTelegramLink: () => {},
    showPopup: (_params, callback) => callback?.('ok'),
    showAlert: (_message, callback) => callback?.(),
    showConfirm: (_message, callback) => callback?.(true),
    enableClosingConfirmation() {
      this.isClosingConfirmationEnabled = true;
    },
    disableClosingConfirmation() {
      this.isClosingConfirmationEnabled = false;
    },
    setHeaderColor(color) {
      this.headerColor = color;
    },
    setBackgroundColor(color) {
      this.backgroundColor = color;
    },
    onEvent(eventType, callback) {
      if (!eventListeners.has(eventType)) {
        eventListeners.set(eventType, new Set());
      }
      eventListeners.get(eventType)!.add(callback);
    },
    offEvent(eventType, callback) {
      eventListeners.get(eventType)?.delete(callback);
    },
  };

  return webApp;
}

/**
 * Install mock Telegram WebApp on window object
 * For use in browser/JSDOM tests
 */
export function installTelegramMock(
  userOverrides: Partial<TelegramUser> = {},
  startParam?: string
): MockTelegramWebApp {
  const mock = createMockTelegramWebApp(userOverrides, startParam);

  if (typeof window !== 'undefined') {
    (window as unknown as { Telegram: { WebApp: MockTelegramWebApp } }).Telegram = {
      WebApp: mock,
    };
  }

  return mock;
}

/**
 * Remove mock Telegram WebApp from window
 */
export function uninstallTelegramMock(): void {
  if (typeof window !== 'undefined') {
    delete (window as unknown as { Telegram?: unknown }).Telegram;
  }
}
