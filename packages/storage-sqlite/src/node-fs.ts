import { access, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FileSystemPort } from '@eyi/core';

export class NodeFileSystem implements FileSystemPort {
  async exists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  join(...parts: string[]): string {
    return join(...parts);
  }
}

/** Escritura atómica: escribe en un temporal y renombra, para no dejar archivos a medias. */
export async function writeFileAtomic(path: string, content: string): Promise<void> {
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, content, 'utf8');
  await rename(tmp, path);
}

export async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'));
}
