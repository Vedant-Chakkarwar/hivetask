// @vitest-environment node
/**
 * Crypto tests — E2E encryption: key pair generation, encrypt/decrypt round-trips,
 * LEK sharing, wrong-key rejection, IV uniqueness, edge cases.
 */
import { describe, it, expect } from 'vitest';
import {
  generateUserKeyPair,
  exportPublicKey,
  importPublicKey,
  encryptPrivateKey,
  decryptPrivateKey,
  deriveWrappingKey,
  generateListKey,
  encryptLEKForMember,
  decryptLEK,
  encryptField,
  decryptField,
} from '@/lib/crypto';

describe('U-CR-01: Generate ECDH key pair', () => {
  it('returns valid CryptoKeyPair with public + private keys', async () => {
    const kp = await generateUserKeyPair();
    expect(kp.publicKey).toBeTruthy();
    expect(kp.privateKey).toBeTruthy();
    expect(kp.publicKey.type).toBe('public');
    expect(kp.privateKey.type).toBe('private');
    expect(kp.publicKey.algorithm.name).toBe('ECDH');
  });
});

describe('U-CR-02: Derive wrapping key from password', () => {
  it('same password + salt produces same key behavior', async () => {
    const password = 'test-password-123';
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key1 = await deriveWrappingKey(password, salt);
    const key2 = await deriveWrappingKey(password, salt);
    expect(key1.algorithm.name).toBe('AES-GCM');
    expect(key2.algorithm.name).toBe('AES-GCM');

    // Both keys should work to wrap/unwrap the same data
    const kp = await generateUserKeyPair();
    const { encrypted, iv } = await encryptPrivateKey(kp.privateKey, key1);
    const recovered = await decryptPrivateKey(encrypted, iv, key2);
    expect(recovered.type).toBe('private');
  });

  it('different password produces different key (cannot decrypt)', async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key1 = await deriveWrappingKey('password-A', salt);
    const key2 = await deriveWrappingKey('password-B', salt);

    const kp = await generateUserKeyPair();
    const { encrypted, iv } = await encryptPrivateKey(kp.privateKey, key1);
    await expect(decryptPrivateKey(encrypted, iv, key2)).rejects.toThrow();
  });
});

describe('U-CR-03: Wrap and unwrap private key roundtrip', () => {
  it('encrypt private key → decrypt → key is functional', async () => {
    const kp = await generateUserKeyPair();
    const password = 'roundtrip-test';
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const wrappingKey = await deriveWrappingKey(password, salt);
    const { encrypted, iv } = await encryptPrivateKey(kp.privateKey, wrappingKey);

    expect(encrypted).toBeTruthy();
    expect(iv).toBeTruthy();

    const wrappingKey2 = await deriveWrappingKey(password, salt);
    const recovered = await decryptPrivateKey(encrypted, iv, wrappingKey2);
    expect(recovered.type).toBe('private');

    // Verify recovered key can be used for ECDH
    const other = await generateUserKeyPair();
    const lek = await generateListKey();
    const { encryptedLEK, iv: lekIv } = await encryptLEKForMember(lek, recovered, other.publicKey);
    const decryptedLEK = await decryptLEK(encryptedLEK, lekIv, other.privateKey, kp.publicKey);
    expect(decryptedLEK.algorithm.name).toBe('AES-GCM');
  });
});

describe('U-CR-04: Generate random list encryption key (LEK)', () => {
  it('returns AES-256-GCM CryptoKey, extractable', async () => {
    const lek = await generateListKey();
    expect(lek).toBeTruthy();
    expect(lek.algorithm.name).toBe('AES-GCM');
    expect((lek.algorithm as AesKeyGenParams).length).toBe(256);
    expect(lek.extractable).toBe(true);
    expect(lek.usages).toContain('encrypt');
    expect(lek.usages).toContain('decrypt');
  });
});

describe('U-CR-05: Encrypt LEK for member via ECDH', () => {
  it('A encrypts LEK for B → B can decrypt using own private key + A public key', async () => {
    const alice = await generateUserKeyPair();
    const bob = await generateUserKeyPair();
    const lek = await generateListKey();

    const { encryptedLEK, iv } = await encryptLEKForMember(lek, alice.privateKey, bob.publicKey);
    const decrypted = await decryptLEK(encryptedLEK, iv, bob.privateKey, alice.publicKey);
    expect(decrypted.algorithm.name).toBe('AES-GCM');

    // Verify the decrypted LEK works the same as original
    const plaintext = 'verify LEK match';
    const cipher = await encryptField(plaintext, lek);
    const result = await decryptField(cipher, decrypted);
    expect(result).toBe(plaintext);
  });
});

describe('U-CR-06: Encrypt and decrypt field roundtrip', () => {
  it('decryptField(encryptField("Hello", lek), lek) === "Hello"', async () => {
    const lek = await generateListKey();
    const plaintext = 'Hello';
    const combined = await encryptField(plaintext, lek);
    expect(combined).not.toBe(plaintext);
    const decrypted = await decryptField(combined, lek);
    expect(decrypted).toBe(plaintext);
  });
});

describe('U-CR-07: Encrypt field produces different ciphertext each time', () => {
  it('two encryptions of same plaintext → different results (random IV)', async () => {
    const lek = await generateListKey();
    const plaintext = 'same text';
    const result1 = await encryptField(plaintext, lek);
    const result2 = await encryptField(plaintext, lek);
    expect(result1).not.toBe(result2);
  });
});

describe('U-CR-08: Decrypt with wrong key fails', () => {
  it('encrypting with key A, decrypting with key B throws', async () => {
    const lek1 = await generateListKey();
    const lek2 = await generateListKey();
    const combined = await encryptField('secret', lek1);
    await expect(decryptField(combined, lek2)).rejects.toThrow();
  });
});

describe('U-CR-09: Decrypt tampered ciphertext fails', () => {
  it('modify one character of ciphertext → decryption throws', async () => {
    const lek = await generateListKey();
    const combined = await encryptField('test data', lek);

    // Tamper with the ciphertext by modifying a character in the middle
    const chars = combined.split('');
    const midpoint = Math.floor(chars.length / 2);
    chars[midpoint] = chars[midpoint] === 'A' ? 'B' : 'A';
    const tampered = chars.join('');

    await expect(decryptField(tampered, lek)).rejects.toThrow();
  });
});

describe('U-CR-10: Empty string encryption/decryption', () => {
  it('empty string roundtrip works correctly', async () => {
    const lek = await generateListKey();
    const combined = await encryptField('', lek);
    expect(combined).toBeTruthy();
    const decrypted = await decryptField(combined, lek);
    expect(decrypted).toBe('');
  });
});

describe('U-CR-11: Unicode/emoji encryption', () => {
  it('text with emojis and unicode roundtrips correctly', async () => {
    const lek = await generateListKey();
    const plaintext = '🐝 HiveTask ✅ 完了 🔥 مرحبا';
    const combined = await encryptField(plaintext, lek);
    const decrypted = await decryptField(combined, lek);
    expect(decrypted).toBe(plaintext);
  });
});

describe('U-CR-12: Long text encryption', () => {
  it('10,000 character description encrypts and decrypts correctly', async () => {
    const lek = await generateListKey();
    const plaintext = 'A'.repeat(10_000);
    const combined = await encryptField(plaintext, lek);
    const decrypted = await decryptField(combined, lek);
    expect(decrypted).toBe(plaintext);
    expect(decrypted.length).toBe(10_000);
  });
});

describe('U-CR-13: Base64 utility / export-import roundtrip', () => {
  it('public key export → import roundtrip preserves key', async () => {
    const kp = await generateUserKeyPair();
    const exported = await exportPublicKey(kp.publicKey);
    expect(typeof exported).toBe('string');
    const imported = await importPublicKey(exported);
    expect(imported.type).toBe('public');
    expect(imported.algorithm.name).toBe('ECDH');

    // Re-export and compare
    const reExported = await exportPublicKey(imported);
    expect(reExported).toBe(exported);
  });
});
