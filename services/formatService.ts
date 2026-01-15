
/**
 * Applies Russian typography rules to strings:
 * 1. Thousands separator (thin space) for numbers with 4+ digits.
 * 2. Proper dashes and non-breaking hyphens.
 * 3. Non-breaking space after "№" symbol.
 * 4. Non-breaking spaces after prepositions and before brackets.
 * 5. Protection of parenthetical expressions from breaking.
 * 6. "Elochki" quotes and double space removal.
 * 7. Superscript for m2 and m3 units.
 */
export const formatRussianText = (text: string): string => {
  if (!text || typeof text !== 'string') return text;

  // Rule: Remove double spaces
  let formatted = text.replace(/\s{2,}/g, ' ').trim();

  // Rule: If the entire cell is just a hyphen, convert to en-dash
  if (formatted === '-') {
    return '–';
  }

  // 0. Rule for units: м2 -> м², м3 -> м³
  formatted = formatted.replace(/м2(\b|$)/g, 'м²');
  formatted = formatted.replace(/м3(\b|$)/g, 'м³');

  // 1. Quotes "..." -> «...»
  // Heuristic: " at start or after space/bracket is open «, otherwise is close »
  formatted = formatted.replace(/(^|[\s\(\u00A0])"/g, '$1«');
  formatted = formatted.replace(/"/g, '»');

  // 2. Protection of brackets and their content
  formatted = formatted.replace(/\s+\(/g, '\u00A0(');
  formatted = formatted.replace(/\(([^)]+)\)/g, (match, content) => {
    const protectedContent = content
      .replace(/-/g, '\u2011')
      .replace(/\s+/g, '\u00A0');
    return `(${protectedContent})`;
  });

  // 3. "№" always separated by a NON-BREAKING space
  formatted = formatted.replace(/№(\S)/g, '№\u00A0$1');
  formatted = formatted.replace(/№\s+(\d)/g, '№\u00A0$1');

  // 4. Thousands separator (non-breaking space) - starting from 1 000
  // We use a regex to find numbers and then split them
  formatted = formatted.replace(/\b(\d+)(\d{3})\b/g, (match) => {
    // Exclude years: 4 digits starting with 19 or 20, 
    // BUT only if they don't look like decimals (checked later)
    const isYearCandidate = match.length === 4 && (match.startsWith('19') || match.startsWith('20'));
    
    // Check if the original string had a comma after this match (decimal)
    // or if it's a value. We assume if it has decimals in the context, it's a value.
    const isDecimal = text.includes(match + ',');
    
    if (isYearCandidate && !isDecimal) {
      return match;
    }
    
    // Apply separator for numbers >= 1000
    return match.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  });

  // 5. Dash rules
  formatted = formatted.replace(/(\d)-([а-я]{1,2})\b/gi, '$1\u2011$2');
  formatted = formatted.replace(/(\d)\s?-\s?(\d)/g, '$1–$2');
  formatted = formatted.replace(/\s+-\s+/g, '\u00A0— ');

  // 6. No dangling prepositions
  const prepositions = [
    'в', 'во', 'без', 'до', 'из', 'к', 'ко', 'на', 'над', 'о', 'об', 'обо', 
    'от', 'ото', 'по', 'под', 'подо', 'при', 'про', 'с', 'со', 'у', 'через', 
    'для', 'за', 'и', 'а', 'но', 'да'
  ];
  
  const prepRegex = new RegExp(`(^|[\\s\\(\\u00A0])(${prepositions.join('|')})\\s+`, 'gi');
  formatted = formatted.replace(prepRegex, '$1$2\u00A0');

  // 7. No wrapping for commas and other punctuation
  formatted = formatted.replace(/\s+([,!?;:])/g, '\u00A0$1');

  return formatted;
};
