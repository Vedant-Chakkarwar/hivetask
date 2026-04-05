// Web Crypto API library — works in browser and Node.js 18+
// No 'use client' directive — this is a utility library, not a React component

/** Convert any Uint8Array to a fresh ArrayBuffer (required for Web Crypto in TypeScript 5.7+) */
function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(arr.byteLength);
  new Uint8Array(ab).set(arr);
  return ab;
}

function b64encode(buffer: ArrayBuffer | Uint8Array): string {
  const arr = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]!);
  }
  return btoa(binary);
}

function b64decode(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** Decode base64 to a proper ArrayBuffer (not Uint8Array, for Web Crypto compatibility) */
function b64decodeToAB(b64: string): ArrayBuffer {
  return toArrayBuffer(b64decode(b64));
}

// ─── User Key Pair (ECDH P-256) ──────────────────────────────────────────────

export async function generateUserKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey'],
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey('jwk', key);
  return JSON.stringify(jwk);
}

export async function importPublicKey(jwkStr: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkStr) as JsonWebKey;
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}

// ─── Password-Derived Wrapping Key (PBKDF2) ──────────────────────────────────

export async function deriveWrappingKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(new TextEncoder().encode(password)),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: toArrayBuffer(salt), iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  );
}

export async function encryptPrivateKey(
  privateKey: CryptoKey,
  wrappingKey: CryptoKey,
): Promise<{ encrypted: string; iv: string }> {
  const ivArr = crypto.getRandomValues(new Uint8Array(12));
  const iv = toArrayBuffer(ivArr);
  const wrapped = await crypto.subtle.wrapKey('pkcs8', privateKey, wrappingKey, {
    name: 'AES-GCM',
    iv,
  });
  return { encrypted: b64encode(wrapped), iv: b64encode(ivArr) };
}

export async function decryptPrivateKey(
  encryptedData: string,
  iv: string,
  wrappingKey: CryptoKey,
): Promise<CryptoKey> {
  const encryptedBytes = b64decodeToAB(encryptedData);
  const ivBytes = b64decodeToAB(iv);
  return crypto.subtle.unwrapKey(
    'pkcs8',
    encryptedBytes,
    wrappingKey,
    { name: 'AES-GCM', iv: ivBytes },
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey'],
  );
}

// ─── List Encryption Key (LEK) ───────────────────────────────────────────────

export async function generateListKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptLEKForMember(
  lek: CryptoKey,
  senderPrivateKey: CryptoKey,
  recipientPublicKey: CryptoKey,
): Promise<{ encryptedLEK: string; iv: string }> {
  const sharedSecret = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: recipientPublicKey },
    senderPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  const exportedLek = await crypto.subtle.exportKey('raw', lek);
  const ivArr = crypto.getRandomValues(new Uint8Array(12));
  const iv = toArrayBuffer(ivArr);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sharedSecret, exportedLek);
  return { encryptedLEK: b64encode(encrypted), iv: b64encode(ivArr) };
}

export async function decryptLEK(
  encryptedLEK: string,
  iv: string,
  userPrivateKey: CryptoKey,
  senderPublicKey: CryptoKey,
): Promise<CryptoKey> {
  const sharedSecret = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: senderPublicKey },
    userPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  const encryptedBytes = b64decodeToAB(encryptedLEK);
  const ivBytes = b64decodeToAB(iv);
  const decryptedLek = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    sharedSecret,
    encryptedBytes,
  );
  return crypto.subtle.importKey('raw', decryptedLek, { name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

// ─── Field Encryption/Decryption ─────────────────────────────────────────────

export async function encryptField(plaintext: string, lek: CryptoKey): Promise<string> {
  const ivArr = crypto.getRandomValues(new Uint8Array(12));
  const iv = toArrayBuffer(ivArr);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    lek,
    toArrayBuffer(new TextEncoder().encode(plaintext)),
  );
  // Combine iv (12 bytes) + ciphertext into single base64 string
  const combined = new Uint8Array(12 + encrypted.byteLength);
  combined.set(ivArr, 0);
  combined.set(new Uint8Array(encrypted), 12);
  return b64encode(combined);
}

export async function decryptField(ciphertext: string, lek: CryptoKey): Promise<string> {
  const combined = b64decode(ciphertext);
  const iv = toArrayBuffer(combined.slice(0, 12));
  const data = toArrayBuffer(combined.slice(12));
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, lek, data);
  return new TextDecoder().decode(decrypted);
}

// ─── Batch Operations ────────────────────────────────────────────────────────

export async function encryptTask(
  task: { title: string; description?: string | null },
  lek: CryptoKey,
): Promise<{ title: string; description?: string | null }> {
  return {
    title: await encryptField(task.title, lek),
    description: task.description ? await encryptField(task.description, lek) : task.description,
  };
}

export async function decryptTask(
  task: { title: string; description?: string | null },
  lek: CryptoKey,
): Promise<{ title: string; description?: string | null }> {
  try {
    return {
      title: await decryptField(task.title, lek),
      description: task.description
        ? await decryptField(task.description, lek)
        : task.description,
    };
  } catch {
    // Return as-is if decryption fails (e.g., plaintext from seed data)
    return task;
  }
}

export async function decryptTasks<T extends { title: string; description?: string | null }>(
  tasks: T[],
  lek: CryptoKey,
): Promise<T[]> {
  return Promise.all(
    tasks.map(async (task) => {
      const decrypted = await decryptTask(task, lek);
      return { ...task, ...decrypted };
    }),
  );
}
