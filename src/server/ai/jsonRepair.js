function extractJsonCandidate(text) {
  // Case 1: complete ```json ... ``` block
  const completeBlock = text.match(/```json\s*([\s\S]*?)```/);
  if (completeBlock) return completeBlock[1];

  // Case 2: incomplete ```json block (truncated — no closing ```)
  const incompleteBlock = text.match(/```json\s*([\s\S]*)/);
  if (incompleteBlock) {
    const inner = incompleteBlock[1];
    const firstBrace = inner.indexOf('{');
    const candidate = firstBrace !== -1 ? inner.slice(firstBrace) : inner;
    const lastEnd = candidate.lastIndexOf('}');
    return lastEnd !== -1 ? candidate.slice(0, lastEnd + 1) : candidate;
  }

  // Case 3: bare JSON without code fence
  const lastBrace = text.lastIndexOf('{');
  const candidate = lastBrace !== -1 ? text.slice(lastBrace) : text;
  const lastEnd = candidate.lastIndexOf('}');
  return lastEnd !== -1 ? candidate.slice(0, lastEnd + 1) : candidate;
}

/**
 * Repair JSON with unescaped double-quotes inside string values (common in Chinese text).
 * Uses a state-machine approach: tracks whether we're inside a JSON string value
 * and escapes any " that appears where a structural " is not expected.
 */
function repairUnescapedQuotes(text) {
  let result = '';
  let inString = false;
  let isValue = false;  // true when the current string is a value (not a key)
  let prevChar = '';
  let depth = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const escaped = prevChar === '\\';

    if (inString) {
      if (ch === '"' && !escaped) {
        // Closing quote candidate — peek ahead to decide if this is structural
        // A structural closing quote is followed by: whitespace, :, ,, }, ]
        let j = i + 1;
        while (j < text.length && (text[j] === ' ' || text[j] === '\t' || text[j] === '\n' || text[j] === '\r')) j++;
        const next = text[j] ?? '';
        const isStructural = next === ':' || next === ',' || next === '}' || next === ']' || j >= text.length;
        if (isStructural) {
          inString = false;
          result += '"';
        } else {
          // This " is INSIDE a string value — escape it
          result += '\\"';
        }
      } else if (ch === '\\' && !escaped) {
        result += ch;
      } else {
        result += ch;
      }
    } else {
      if (ch === '"') {
        inString = true;
        result += '"';
      } else if (ch === '{' || ch === '[') {
        depth++;
        result += ch;
      } else if (ch === '}' || ch === ']') {
        depth--;
        result += ch;
      } else {
        result += ch;
      }
    }

    prevChar = ch;
  }

  return result;
}

function parseJsonFromClaude(text) {
  const raw = extractJsonCandidate(text).trim();
  try {
    return JSON.parse(raw);
  } catch {
    // 修复：字符串值内的未转义双引号（常见于中文内容）
    try {
      const fixed = repairUnescapedQuotes(raw);
      return JSON.parse(fixed);
    } catch {
      throw new Error(`JSON parse failed: ${text.slice(0, 300)}`);
    }
  }
}

export { extractJsonCandidate, repairUnescapedQuotes, parseJsonFromClaude };
