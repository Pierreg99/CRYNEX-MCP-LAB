import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { open, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export interface LocalSkill {
  readonly name: string;
  readonly description: string;
  readonly uri: string;
  readonly sha256: string;
  readonly content: string;
}
const MAX_SKILLS = 32;
const MAX_SKILL_BYTES = 65_536;

/** Operator-owned flat directory of skills/<name>/SKILL.md. No execution. */
export async function loadSkillCatalog(root: string): Promise<readonly LocalSkill[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const names = entries.filter(e => !e.name.startsWith('.'));
  if (names.length > MAX_SKILLS) throw new Error('Too many skills (max 32)');
  const found: LocalSkill[] = [];
  for (const entry of names) {
    if (!entry.isDirectory() || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(entry.name)) {
      throw new Error('Invalid skill directory entry');
    }
    const handle = await open(join(root, entry.name, 'SKILL.md'),
      constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    let content: string;
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > MAX_SKILL_BYTES) throw new Error('Invalid skill size or file');
      content = await handle.readFile({ encoding: 'utf8' });
    } finally {
      await handle.close();
    }
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(content);
    if (!frontmatter || content.includes('\0')) throw new Error('Invalid SKILL.md format');
    const header = frontmatter[1] ?? '';
    const name = /^name:\s*([a-z0-9-]{1,64})\s*$/mu.exec(header)?.[1];
    const description = /^description:\s*(.{1,200}?)\s*$/mu.exec(header)?.[1];
    if (name !== entry.name || !description) throw new Error('Invalid skill frontmatter');
    found.push({
      name, description,
      uri: 'skill://crynex/' + name + '/SKILL.md',
      sha256: createHash('sha256').update(content, 'utf8').digest('hex'),
      content
    });
  }
  return found.sort((a, b) => a.name.localeCompare(b.name));
}
