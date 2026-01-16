
/**
 * Applies Russian typography rules to strings while preserving line breaks.
 * Implements strict rules for addresses, prepositions, and abbreviations.
 */
export const formatRussianText = (text: string): string => {
  if (!text || typeof text !== 'string') return text;

  let f = text;

  // Rule: If the entire cell is just a hyphen, convert to en-dash
  if (f.trim() === '-') return '–';

  // 0. Rule for units: м2 -> м², м3 -> м³
  f = f.replace(/м2(\b|$)/g, 'м²');
  f = f.replace(/м3(\b|$)/g, 'м³');

  // 1. Quotes "..." -> «...»
  f = f.replace(/(^|[\s\(\u00A0])"/g, '$1«');
  f = f.replace(/"/g, '»');

  // 2. Prepositions and short words: never leave them at the end of a line.
  const preps = [
    'в', 'во', 'без', 'до', 'из', 'к', 'ко', 'на', 'над', 'о', 'об', 'обо', 
    'от', 'ото', 'по', 'под', 'подо', 'при', 'про', 'с', 'со', 'у', 'через', 
    'для', 'за', 'и', 'а', 'но', 'да', 'из-за', 'из-под', 'или', 'как', 'так',
    'над', 'под', 'pred', 'через'
  ];
  
  const prepsPattern = preps.map(p => p.replace('-', '\\-')).join('|');
  const prepRegex = new RegExp(`(^|[\\s\\(\\u00A0])(${prepsPattern})(\\s+)`, 'gi');
  
  for (let i = 0; i < 3; i++) {
    f = f.replace(prepRegex, '$1$2\u00A0');
  }

  // 3. Leading abbreviations: г., ул., д., корп., стр., кв., пгт., пр-т, наб.
  const leadAbbrs = [
    'г', 'ул', 'д', 'корп', 'стр', 'кв', 'пр\\-т', 'пр', 'наб', 'б\\-р', 
    'ш', 'оф', 'тел', 'пгт', 'с', 'пос', 'обл', 'р\\-н', 'р\\-ne'
  ];
  const leadRegex = new RegExp(`(^|[\\s\\(\\u00A0])(${leadAbbrs.join('|')})\\.(\\s*)`, 'gi');
  f = f.replace(leadRegex, '$1$2.\u00A0');

  // 4. Address comma protection: "Street, 314"
  f = f.replace(/,(\s+)(?=\d)/g, ',\u00A0');

  // 5. Trailing abbreviations: г., л., м., км., руб., коп., тыс., млн.
  const trailAbbrs = ['г', 'л', 'м', 'км', 'шт', 'руб', 'коп', 'чел', 'тыс', 'млн', 'млрд'];
  const trailRegex = new RegExp(`(\\d)(\\s*)(${trailAbbrs.join('|')})\\.`, 'gi');
  f = f.replace(trailRegex, '$1\u00A0$3.');

  // 6. "№" always separated by a NON-BREAKING space from the number
  f = f.replace(/№(\s*)(\d)/g, '№\u00A0$2');

  // 7. Parentheses and suffix protection (Fix for broken brackets like "(-ей)")
  // Ensure short parentheticals stay with previous word
  f = f.replace(/(\S)\s+\((?=.{1,12}\))/g, '$1\u00A0(');
  
  // Protect internal content of parentheses from breaking
  // Especially suffixes like (-ей), (-ти), (я). 
  // We use Word Joiner (\u2060) which is a zero-width non-breaking space.
  f = f.replace(/\(([^)]+)\)/g, (match, content) => {
    // Replace any dash inside with non-breaking hyphen
    const protectedContent = content.replace(/-/g, '\u2011');
    // Wrap with Word Joiners to keep bracket and content as one unbreakable unit
    return `(\u2060${protectedContent}\u2060)`;
  });

  // Ensure no line break after opening parenthesis and before closing parenthesis (redundant but safe)
  f = f.replace(/\(\s+/g, '(');
  f = f.replace(/\s+\)/g, ')');

  // 8. Dash rules
  // Years range: 2024-2030 -> 2024–2030 (en-dash)
  f = f.replace(/(\d{2,4})-(\d{2,4})/g, '$1–$2');
  // Long dash for space-hyphen-space -> nbsp-emdash-space
  f = f.replace(/(\s+)-(\s+)/g, '\u00A0— ');
  
  // 9. Thousands separator (non-breaking space)
  // We process numbers but exclude 4-digit years (starting with 19 or 20)
  const isYear = (numStr: string) => {
    return numStr.length === 4 && (numStr.startsWith('19') || numStr.startsWith('20'));
  };

  f = f.replace(/\b\d{4,}\b/g, (match) => {
    if (isYear(match)) return match;
    
    let res = '';
    for (let i = 0; i < match.length; i++) {
      if (i > 0 && (match.length - i) % 3 === 0) {
        res += '\u00A0';
      }
      res += match[i];
    }
    return res;
  });

  return f;
};
