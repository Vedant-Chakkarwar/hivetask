import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
// Node.js 18+ has Web Crypto; import explicitly to ensure availability
import { webcrypto } from 'crypto';
const subtle = webcrypto.subtle;

const prisma = new PrismaClient();

// ─── Inline crypto helpers (mirrors src/lib/crypto.ts for Node.js seed) ──────

function b64encode(buffer: ArrayBuffer | Uint8Array): string {
  const arr = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Buffer.from(arr).toString('base64');
}

function b64decode(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

async function generateUserKeyPair(): Promise<CryptoKeyPair> {
  return subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
}

async function exportPublicKey(key: CryptoKey): Promise<string> {
  const jwk = await subtle.exportKey('jwk', key);
  return JSON.stringify(jwk);
}

async function deriveWrappingKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  );
}

async function encryptPrivateKey(
  privateKey: CryptoKey,
  wrappingKey: CryptoKey,
): Promise<{ encrypted: string; iv: string }> {
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const wrapped = await subtle.wrapKey('pkcs8', privateKey, wrappingKey, {
    name: 'AES-GCM',
    iv,
  });
  return { encrypted: b64encode(wrapped), iv: b64encode(iv) };
}

async function generateListKey(): Promise<CryptoKey> {
  return subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

async function importPublicKeyFromJwk(jwkStr: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkStr) as JsonWebKey;
  return subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}

async function encryptLEKForMember(
  lek: CryptoKey,
  senderPrivateKey: CryptoKey,
  recipientPublicKey: CryptoKey,
): Promise<{ encryptedLEK: string; iv: string }> {
  const sharedSecret = await subtle.deriveKey(
    { name: 'ECDH', public: recipientPublicKey },
    senderPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  const exportedLek = await subtle.exportKey('raw', lek);
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const encrypted = await subtle.encrypt({ name: 'AES-GCM', iv }, sharedSecret, exportedLek);
  return { encryptedLEK: b64encode(encrypted), iv: b64encode(iv) };
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const users = [
  { email: 'ninad@hivetask.com',   name: 'Ninad',   color: '#EF4444', password: 'Ninad@26' },
  { email: 'ram@hivetask.com',     name: 'Ram',     color: '#3B82F6', password: 'Ram@11' },
  { email: 'shreyas@hivetask.com', name: 'Shreyas', color: '#10B981', password: 'Shreyas@02' },
  { email: 'vedant@hivetask.com',   name: 'Vedant',   color: '#8B5CF6', password: 'Vedant@31' },
  { email: 'sarthak@hivetask.com',  name: 'Sarthak',  color: '#F59E0B', password: 'Sarthak@17' },
  { email: 'vishnu@hivetask.com',   name: 'Vishnu',   color: '#06B6D4', password: 'Vishnu@24' },
];

async function main() {
  console.log('Seeding users with E2E key pairs...');

  // Generate and store key pairs for all users
  const userCryptoData: Array<{ email: string; publicKey: string; privateKey: CryptoKey }> = [];

  const createdUsers = await Promise.all(
    users.map(async (u) => {
      const hashed = await bcrypt.hash(u.password, 12);

      const keyPair = await generateUserKeyPair();
      const publicKey = await exportPublicKey(keyPair.publicKey);

      const salt = webcrypto.getRandomValues(new Uint8Array(16));
      const wrappingKey = await deriveWrappingKey(u.password, salt);
      const { encrypted, iv } = await encryptPrivateKey(keyPair.privateKey, wrappingKey);

      userCryptoData.push({ email: u.email, publicKey, privateKey: keyPair.privateKey });

      return prisma.user.upsert({
        where: { email: u.email },
        update: {
          publicKey,
          encryptedPrivateKey: encrypted,
          keySalt: b64encode(salt),
          keyIv: iv,
        },
        create: {
          email: u.email,
          name: u.name,
          color: u.color,
          password: hashed,
          publicKey,
          encryptedPrivateKey: encrypted,
          keySalt: b64encode(salt),
          keyIv: iv,
        },
      });
    }),
  );

  console.log(`Seeded ${createdUsers.length} users with crypto keys`);

  const alice = createdUsers[0]!;
  const aliceCrypto = userCryptoData[0]!;

  const existingList = await prisma.taskList.findFirst({ where: { name: 'Welcome Board' } });

  if (!existingList) {
    const list = await prisma.taskList.create({
      data: {
        name: 'Welcome Board',
        description: 'A sample board to get you started 🐝',
        color: '#F59E0B',
        icon: '🐝',
        createdById: alice.id,
        members: { connect: createdUsers.map((u) => ({ id: u.id })) },
        columns: {
          create: [
            { name: 'To Do',       position: 0, color: '#6B7280' },
            { name: 'In Progress', position: 1, color: '#F59E0B' },
            { name: 'Done',        position: 2, color: '#10B981' },
          ],
        },
      },
      include: { columns: true },
    });

    // Generate LEK for Welcome Board and encrypt for each member
    const lek = await generateListKey();

    await Promise.all(
      createdUsers.map(async (member) => {
        const memberCrypto = userCryptoData.find((c) => c.email === member.email)!;
        const recipientPubKey = await importPublicKeyFromJwk(memberCrypto.publicKey);
        const { encryptedLEK, iv } = await encryptLEKForMember(
          lek,
          aliceCrypto.privateKey,
          recipientPubKey,
        );
        return prisma.listKeyShare.create({
          data: {
            listId: list.id,
            userId: member.id,
            encryptedLEK,
            iv,
            senderUserId: alice.id,
          },
        });
      }),
    );

    const todoCol = list.columns.find((c) => c.name === 'To Do')!;
    const inProgressCol = list.columns.find((c) => c.name === 'In Progress')!;

    // Seed tasks as plaintext — client decryption gracefully handles non-encrypted data
    await prisma.task.create({
      data: {
        title: 'Explore HiveTask ✨',
        description: 'Click around and see what you can do!',
        priority: 'LOW',
        status: 'TODO',
        position: 0,
        listId: list.id,
        columnId: todoCol.id,
        createdById: alice.id,
        assignees: { create: [{ userId: alice.id }] },
      },
    });
    await prisma.task.create({
      data: {
        title: 'Set up your first board',
        description: 'Create columns and add tasks.',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        position: 0,
        listId: list.id,
        columnId: inProgressCol.id,
        createdById: alice.id,
        assignees: {
          create: [
            { userId: createdUsers[1]!.id },
            { userId: createdUsers[2]!.id },
          ],
        },
      },
    });

    console.log('Seeded Welcome Board with E2E key shares and sample tasks');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

void b64decode; // suppress unused warning if needed
