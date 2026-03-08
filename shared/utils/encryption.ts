const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

async function getCryptoModule() {
  const { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } = await import('crypto');
  return { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash };
}

async function deriveKeyAsync(password: string, salt: Buffer): Promise<Buffer> {
  const { scryptSync } = await getCryptoModule();
  const key = scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return key;
}

export async function encrypt(plaintext: string, password: string): Promise<string> {
  const { createCipheriv, randomBytes, scryptSync } = await getCryptoModule();
  
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  const key = scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const result = Buffer.concat([salt, iv, authTag, encrypted]);
  return result.toString('base64');
}

export async function decrypt(ciphertext: string, password: string): Promise<string> {
  const { createDecipheriv, scryptSync } = await getCryptoModule();
  
  const data = Buffer.from(ciphertext, 'base64');

  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

export function hashCode(content: string): string {
  try {
    const { createHash } = require('crypto');
    const hash = createHash('sha256').update(content).digest('hex');
    return hash.substring(0, 32);
  } catch {
    let hash = 5381;
    for (let i = 0; i < content.length; i++) {
      hash = (hash * 33) ^ content.charCodeAt(i);
    }
    return Math.abs(hash).toString(16);
  }
}
