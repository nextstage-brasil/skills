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
