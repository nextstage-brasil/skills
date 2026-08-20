/**
 * Append a managed ignore block or merge missing entries into an existing block.
 * Unprefixed managed paths are rewritten to root-anchored form (`/path`).
 */
export function patchIgnoreContent(existingContent, header, entries) {
  const byKey = new Map(entries.map((entry) => [ignoreEntryKey(entry), entry]));

  if (!existingContent.includes(header)) {
    const block = `${header}\n${entries.join('\n')}\n`;
    const trimmed = existingContent.replace(/\s+$/, '');
    return trimmed.length === 0 ? block : `${trimmed}\n\n${block}`;
  }

  const lines = existingContent.split('\n');
  const headerIndex = lines.indexOf(header);
  const presentKeys = new Set();
  let i = headerIndex + 1;
  let changed = false;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i += 1;
      continue;
    }
    const canonical = byKey.get(ignoreEntryKey(line));
    if (!canonical) {
      break;
    }
    if (line !== canonical) {
      lines[i] = canonical;
      changed = true;
    }
    presentKeys.add(ignoreEntryKey(canonical));
    i += 1;
  }

  const missing = entries.filter((entry) => !presentKeys.has(ignoreEntryKey(entry)));
  if (missing.length > 0) {
    lines.splice(headerIndex + 1, 0, ...missing);
    changed = true;
  }

  if (!changed) {
    return existingContent;
  }
  return lines.join('\n');
}

/**
 * Remove a managed ignore header and its known entry lines.
 * Leaves non-managed content untouched.
 */
export function stripIgnoreContent(existingContent, header, entries) {
  if (!existingContent.includes(header)) {
    return existingContent;
  }

  const entryKeys = new Set(entries.map(ignoreEntryKey));
  const lines = existingContent.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i] === header) {
      i += 1;
      while (i < lines.length) {
        const line = lines[i];
        if (entryKeys.has(ignoreEntryKey(line)) || line.trim() === '') {
          i += 1;
          continue;
        }
        break;
      }
      continue;
    }
    out.push(lines[i]);
    i += 1;
  }

  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\s+$/, '')}\n`;
}

function ignoreEntryKey(line) {
  return line.trim().replace(/^\/+/, '');
}
