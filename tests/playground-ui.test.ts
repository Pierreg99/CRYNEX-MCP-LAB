import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { it } from 'node:test';
import { runInNewContext } from 'node:vm';

/** Dependency-free DOM sketch: verifies actual event handlers, not just string markers. */
class FakeElement {
  value = '';
  textContent = '';
  hidden = false;
  disabled = false;
  className = '';
  dataset: Record<string, string> = {};
  files?: Array<{ size: number; text: () => Promise<string> }>;
  children: FakeElement[] = [];
  private listeners = new Map<string, Array<() => void | Promise<void>>>();

  addEventListener(type: string, callback: () => void | Promise<void>): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(callback);
    this.listeners.set(type, existing);
  }
  async emit(type: string): Promise<void> {
    for (const callback of this.listeners.get(type) ?? []) await callback();
  }
  click(): void { void this.emit('click'); }
  focus(): void {}
  setAttribute(_key: string, _value: string): void {}
  append(...items: FakeElement[]): void { this.children.push(...items); }
  appendChild(item: FakeElement): void { this.children.push(item); }
  replaceChildren(...items: FakeElement[]): void { this.children = items; }
  remove(): void {}
}

function setup() {
  const ids = [
    'play-tool', 'play-input', 'play-secondary', 'play-secondary-label',
    'play-output', 'play-status', 'play-run', 'play-reset', 'play-copy',
    'builder-name', 'builder-title', 'builder-description', 'builder-operation',
    'builder-output', 'builder-status', 'builder-list', 'builder-count',
    'builder-add', 'builder-cancel', 'builder-import', 'builder-file',
    'builder-example', 'builder-clear', 'builder-copy', 'builder-download',
    'capability-search', 'capability-status'
  ];
  const elements = new Map(ids.map(id => [id, new FakeElement()]));
  const get = (id: string): FakeElement => {
    const element = elements.get(id);
    if (!element) throw new Error('Test DOM missing: ' + id);
    return element;
  };
  get('play-tool').value = 'crynex_slugify';
  get('builder-name').value = 'custom_uppercase';
  get('builder-title').value = 'Uppercase a message';
  get('builder-description').value = 'Transform input safely.';
  get('builder-operation').value = 'uppercase';
  const cards = [new FakeElement(), new FakeElement()];
  cards[0]!.textContent = 'crynex_json_pointer JSON lookup';
  cards[1]!.textContent = 'crynex_slugify Text utility';
  const dom = {
    getElementById: (id: string) => elements.get(id) ?? null,
    createElement: () => new FakeElement(),
    querySelectorAll: () => cards,
    body: new FakeElement()
  };
  return { get, cards, dom };
}

function currentTools(get: (id: string) => FakeElement): Array<{
  name: string; title: string; description: string; operation: string
}> {
  const data: unknown = JSON.parse(get('builder-output').textContent);
  assert.ok(data && typeof data === 'object' && 'tools' in data);
  return (data as { tools: Array<{ name: string; title: string; description: string; operation: string }> }).tools;
}

it('interactive docs support filtering, editing, reordering, import and rejection of bad files', async () => {
  const script = await readFile(resolve('docs/playground.js'), 'utf8');
  const { get, cards, dom } = setup();
  const fakeUrl = { createObjectURL: () => 'blob:local', revokeObjectURL: () => {} };
  runInNewContext(script, {
    document: dom, Blob, URL: fakeUrl, navigator: {
      clipboard: { writeText: async (_text: string) => {} }
    }, window: { clearTimeout, setTimeout }, console
  });

  // Search is an actual interactive filter, not a static screenshot.
  get('capability-search').value = 'JSON';
  await get('capability-search').emit('input');
  assert.equal(cards[0]?.hidden, false);
  assert.equal(cards[1]?.hidden, true);
  assert.match(get('capability-status').textContent, /1 of 2/);

  await get('builder-example').emit('click');
  assert.deepEqual(currentTools(get).map(t => t.name), ['custom_uppercase', 'custom_compact_slug']);
  const firstEntry = get('builder-list').children[0];
  assert.ok(firstEntry);
  const firstActions = firstEntry.children[1];
  assert.ok(firstActions);
  await firstActions.children[0]!.emit('click'); // Edit
  get('builder-title').value = 'Updated display name';
  await get('builder-add').emit('click');
  assert.equal(currentTools(get)[0]?.title, 'Updated display name');
  assert.equal(get('builder-cancel').hidden, true);

  const secondEntry = get('builder-list').children[1];
  assert.ok(secondEntry);
  await secondEntry.children[1]!.children[1]!.emit('click'); // Move up
  assert.deepEqual(currentTools(get).map(t => t.name), ['custom_compact_slug', 'custom_uppercase']);

  const previous = get('builder-output').textContent;
  const invalid = {
    schemaVersion: 1, tools: [{
      name: 'custom_unsafe', title: 'Unsafe', description: 'No',
      operation: 'shell', command: 'rm -rf /'
    }]
  };
  get('builder-file').files = [{
    size: 120, text: async () => JSON.stringify(invalid)
  }];
  await get('builder-file').emit('change');
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(get('builder-output').textContent, previous, 'invalid input must not replace draft');
  assert.equal(get('builder-status').dataset.error, 'true');

  const imported = {
    schemaVersion: 1, tools: [{
      name: 'custom_from_disk', title: 'Imported tool',
      description: 'Read-only text transform', operation: 'trim'
    }]
  };
  get('builder-file').files = [{
    size: 140, text: async () => JSON.stringify(imported)
  }];
  await get('builder-file').emit('change');
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.deepEqual(currentTools(get).map(t => t.name), ['custom_from_disk']);
  assert.equal(get('builder-status').dataset.error, 'false');
  assert.match(get('builder-status').textContent, /No MCP server was modified/);
});
