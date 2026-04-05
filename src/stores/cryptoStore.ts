import { create } from 'zustand';
import { decryptLEK, importPublicKey } from '@/lib/crypto';

interface CryptoState {
  // In-memory keys — cleared on logout/timeout
  privateKey: CryptoKey | null;
  publicKeyJwk: string | null;
  // Stored to allow re-derivation on lock screen unlock
  encryptedPrivateKey: string | null;
  keySalt: string | null;
  keyIv: string | null;
  // Per-list LEK cache: listId → decrypted CryptoKey
  lekCache: Map<string, CryptoKey>;

  setKeys: (opts: {
    privateKey: CryptoKey;
    publicKeyJwk: string;
    encryptedPrivateKey: string;
    keySalt: string;
    keyIv: string;
  }) => void;

  /** Called on lock screen — clears private key but keeps encrypted data for re-unlock */
  lockKeys: () => void;

  /** Called on logout or absolute timeout — clears everything */
  clearKeys: () => void;

  /** Restore private key after lock screen unlock (without re-fetching encrypted data) */
  restorePrivateKey: (privateKey: CryptoKey) => void;

  /** Fetch or return cached LEK for a list */
  getListKey: (listId: string) => Promise<CryptoKey | null>;

  /** Manually cache a LEK (e.g., after creating a list) */
  cacheListKey: (listId: string, lek: CryptoKey) => void;
}

export const useCryptoStore = create<CryptoState>((set, get) => ({
  privateKey: null,
  publicKeyJwk: null,
  encryptedPrivateKey: null,
  keySalt: null,
  keyIv: null,
  lekCache: new Map(),

  setKeys: ({ privateKey, publicKeyJwk, encryptedPrivateKey, keySalt, keyIv }) => {
    set({ privateKey, publicKeyJwk, encryptedPrivateKey, keySalt, keyIv });
  },

  lockKeys: () => {
    set({ privateKey: null, lekCache: new Map() });
  },

  clearKeys: () => {
    set({
      privateKey: null,
      publicKeyJwk: null,
      encryptedPrivateKey: null,
      keySalt: null,
      keyIv: null,
      lekCache: new Map(),
    });
  },

  restorePrivateKey: (privateKey: CryptoKey) => {
    set({ privateKey });
  },

  getListKey: async (listId: string) => {
    const { privateKey, lekCache } = get();
    if (!privateKey) return null;

    // Return from cache if available
    const cached = lekCache.get(listId);
    if (cached) return cached;

    try {
      const res = await fetch(`/api/lists/${listId}/key`);
      if (!res.ok) return null;

      const { encryptedLEK, iv, senderPublicKey } = (await res.json()) as {
        encryptedLEK: string;
        iv: string;
        senderPublicKey: string;
      };

      const senderPubKey = await importPublicKey(senderPublicKey);
      const lek = await decryptLEK(encryptedLEK, iv, privateKey, senderPubKey);

      set((state) => {
        const newCache = new Map(state.lekCache);
        newCache.set(listId, lek);
        return { lekCache: newCache };
      });

      return lek;
    } catch {
      return null;
    }
  },

  cacheListKey: (listId: string, lek: CryptoKey) => {
    set((state) => {
      const newCache = new Map(state.lekCache);
      newCache.set(listId, lek);
      return { lekCache: newCache };
    });
  },
}));
