import { PrismaClient } from '@prisma/client';
import { webcrypto } from 'crypto';
const subtle = webcrypto.subtle;

const prisma = new PrismaClient();

function b64encode(buffer: ArrayBuffer | Uint8Array): string {
  const arr = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Buffer.from(arr).toString('base64');
}

async function importPublicKeyFromJwk(jwkStr: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkStr) as JsonWebKey;
  return subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}

async function generateListKey(): Promise<CryptoKey> {
  return subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
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

async function main() {
  console.log('Creating Vietnam Checklist...');

  // Get the 4 members
  const members = await prisma.user.findMany({
    where: {
      email: {
        in: [
          'vedant@hivetask.com',
          'shreyas@hivetask.com',
          'ninad@hivetask.com',
          'ram@hivetask.com',
        ],
      },
    },
  });

  if (members.length < 4) {
    console.error('Could not find all 4 users. Found:', members.map(m => m.email));
    process.exit(1);
  }

  const vedant = members.find(m => m.email === 'vedant@hivetask.com')!;

  // Check if list already exists
  const existing = await prisma.taskList.findFirst({ where: { name: 'Vietnam Checklist' } });
  if (existing) {
    console.log('Vietnam Checklist already exists, skipping creation.');
    return;
  }

  // Create the list with columns
  const list = await prisma.taskList.create({
    data: {
      name: 'Vietnam Checklist',
      description: 'Packing & travel checklist for Vietnam trip 🇻🇳',
      color: '#10B981',
      icon: '✈️',
      createdById: vedant.id,
      members: { connect: members.map(m => ({ id: m.id })) },
      columns: {
        create: [
          { name: 'To Pack',   position: 0, color: '#6B7280' },
          { name: 'Packed',    position: 1, color: '#F59E0B' },
          { name: 'Done',      position: 2, color: '#10B981' },
        ],
      },
    },
    include: { columns: true },
  });

  // Generate LEK and encrypt for each member
  const lek = await generateListKey();

  // We need vedant's private key to encrypt LEK for all members
  // Decrypt vedant's private key using password
  const salt = Buffer.from(vedant.keySalt!, 'base64');
  const wrappingKey = await deriveWrappingKey('Vedant@31', new Uint8Array(salt));
  const iv = Buffer.from(vedant.keyIv!, 'base64');
  const encryptedKeyData = Buffer.from(vedant.encryptedPrivateKey!, 'base64');

  const vedantPrivateKey = await subtle.unwrapKey(
    'pkcs8',
    new Uint8Array(encryptedKeyData),
    wrappingKey,
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey'],
  );

  await Promise.all(
    members.map(async (member) => {
      const recipientPubKey = await importPublicKeyFromJwk(member.publicKey!);
      const { encryptedLEK, iv } = await encryptLEKForMember(lek, vedantPrivateKey, recipientPubKey);
      return prisma.listKeyShare.create({
        data: {
          listId: list.id,
          userId: member.id,
          encryptedLEK,
          iv,
          senderUserId: vedant.id,
        },
      });
    }),
  );

  const toPackCol = list.columns.find(c => c.name === 'To Pack')!;

  // All checklist items
  const items = [
    // Documents & Electronics
    'Visa + Ticket Print',
    'Passport',
    'GoPro',
    'Cash (Check the 2006 thing)',
    'Powerbank',
    'Charger',
    'Roaming pack',
    // Clothing
    'Underwear',
    'Banyan',
    'Jeans',
    'Socks',
    'Shirts',
    'Shorts',
    'Jacket',
    'Belt',
    // Accessories
    'Wallet',
    'Watches',
    'Shoes',
    'Sunglasses',
    'Cap',
    // Toiletries
    'Sunscreen',
    'Brush',
    'Paste',
    'Soap or Shower Gel',
    'Shampoo',
    'Towel',
    // Health
    'Medicines - cold, fever, body pain, vomit, diarrhea',
    'Cash',
  ];

  for (let i = 0; i < items.length; i++) {
    await prisma.task.create({
      data: {
        title: items[i],
        priority: i < 7 ? 'HIGH' : 'MEDIUM',
        status: 'TODO',
        position: i,
        listId: list.id,
        columnId: toPackCol.id,
        createdById: vedant.id,
        assignees: {
          create: members.map(m => ({ userId: m.id })),
        },
      },
    });
  }

  console.log(`Created Vietnam Checklist with ${items.length} tasks`);
  console.log('Members: Vedant, Shreyas, Ninad, Ram');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
