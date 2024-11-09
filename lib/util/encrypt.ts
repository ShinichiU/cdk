import { createHash } from 'crypto';

export const encryptSha256 = (string: string, length?: number): string => {
  const hash = createHash('sha256');
  const defaultLength = 10;
  hash.update(string);
  return hash.digest('hex').substring(0, length ?? defaultLength);
};
