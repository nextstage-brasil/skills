/**
 * Append a managed ignore block or merge missing entries into an existing block.
 */
export function patchIgnoreContent(existingContent, header, entries) {
  if (!existingContent.includes(header)) {
    const block = `${header}\n${entries.join('\n')}\n`;
    const trimmed = existingContent.replace(/\s+$/, '');
    return trimmed.length === 0 ? block : `${trimmed}\n\n${block}`;
  }

  let result = existingContent;
  for (const entry of entries) {
    const hasEntry = result.split('\n').some((line) => line.trim() === entry);
    if (!hasEntry) {
      const headerIndex = result.indexOf(header);
      const insertAt = result.indexOf('\n', headerIndex) + 1;
      result = `${result.slice(0, insertAt)}${entry}\n${result.slice(insertAt)}`;
    }
  }
  return result;
}

/**
 * Remove a managed ignore header and its known entry lines.
 * Leaves non-managed content untouched.
 */
export function stripIgnoreContent(existingContent, header, entries) {
  if (!existingContent.includes(header)) {
    return existingContent;
  }

  const entrySet = new Set(entries);
  const lines = existingContent.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i] === header) {
      i += 1;
      while (i < lines.length) {
        const line = lines[i];
        if (entrySet.has(line) || line.trim() === '') {
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
