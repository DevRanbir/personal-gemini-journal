const LOCAL_USER_STORAGE_KEY = 'harmony_local_user_id';

const normalizeUserId = (value: string): string => {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
};

const hashString = (value: string): number => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
};

export const getLocalUserId = (): string => {
  if (typeof window === 'undefined') {
    return 'local-user';
  }

  const existing = window.localStorage.getItem(LOCAL_USER_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const generated = `local-${crypto.randomUUID()}`;
  window.localStorage.setItem(LOCAL_USER_STORAGE_KEY, generated);
  return generated;
};

export const getChatOwnerId = (user: any): string => {
  return normalizeUserId(user?.uid || user?.displayName || user?.username || user?.id || user?.email || getLocalUserId());
};

export const getDiceBearAvatarUrl = (seed: string): string => {
  return `https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=${encodeURIComponent(normalizeUserId(seed))}`;
};

export const getUserAvatarUrl = (user: any): string => {
  if (user?.photoURL) {
    return user.photoURL;
  }
  return getDiceBearAvatarUrl(getChatOwnerId(user));
};

export const getHarmonyAvatarUrl = (chatSeed: string = 'harmony-ai'): string => {
  const normalizedSeed = normalizeUserId(`harmony-ai-${chatSeed}`);
  const palettes = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf', 'c7f9cc', 'fde68a'];
  const backgroundColor = palettes[hashString(normalizedSeed) % palettes.length];

  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(normalizedSeed)}&backgroundColor=${backgroundColor}`;
};
