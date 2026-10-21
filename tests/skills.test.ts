import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it } from 'node:test';
import { createHash } from 'node:crypto';
import { loadSkillCatalog } from '../src/connectors/cryo/skills.js';

it('loads a bounded immutable Skill snapshot with verifiable digest', async () => {
  const root = await mkdtemp(join(tmpdir(), 'crynex-skill-'));
  try {
    await mkdir(join(root, 'valid-skill'));
    const content = '---\nname: valid-skill\ndescription: Inspect safe MCP tools.\n---\n# Safe review\n';
    await writeFile(join(root, 'valid-skill', 'SKILL.md'), content);
    const skills = await loadSkillCatalog(root);
    assert.equal(skills.length, 1);
    assert.equal(skills[0]?.uri, 'skill://crynex/valid-skill/SKILL.md');
    assert.equal(skills[0]?.sha256, createHash('sha256').update(content).digest('hex'));
    await writeFile(join(root, 'valid-skill', 'SKILL.md'), 'changed after startup');
    assert.equal(skills[0]?.content, content);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('refuses symlinked Skill files and mismatched frontmatter', async () => {
  const root = await mkdtemp(join(tmpdir(), 'crynex-skill-'));
  try {
    await mkdir(join(root, 'skill-a'));
    await writeFile(join(root, 'source.md'), '---\nname: skill-a\ndescription: Valid.\n---\n');
    await symlink(join(root, 'source.md'), join(root, 'skill-a', 'SKILL.md'));
    await assert.rejects(loadSkillCatalog(root));
    await rm(join(root, 'skill-a', 'SKILL.md'));
    await writeFile(join(root, 'skill-a', 'SKILL.md'),
      '---\nname: someone-else\ndescription: Bad identity.\n---\n');
    await assert.rejects(loadSkillCatalog(root), /Invalid skill frontmatter/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
