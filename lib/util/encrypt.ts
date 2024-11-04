import { createHash } from 'crypto';

export const encryptSha256 = (string: string, substr?: number): string => {
  const hash = createHash('sha256');
  hash.update(string);
  return hash.digest('hex').substring(0, substr ?? 10);
};
