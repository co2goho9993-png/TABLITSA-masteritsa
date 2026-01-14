
/**
 * Applies Russian typography rules to strings:
 * 1. Thousands separator (thin space) for numbers with 5+ digits (excluding years).
 * 2. Proper dashes: en-dash (–) for ranges, em-dash (—) for sentences.
 * 3. Non-breaking space after "№" symbol.
 * 4. Non-breaking spaces after prepositions to prevent orphans at the end of lines.
 * 5. Non-breaking space before commas to prevent wrapping.
 */
export const formatRussianText = (text: string): string => {
  if (!text || typeof text !== 'string') return text;

  let formatted = text;

  // Rule: If the entire cell is just a hyphen, convert to en-dash (medium dash)
  if (formatted.trim() === '-') {
    return '–';
  }

  // 1. "№" always separated by a NON-BREAKING space (\u00A0)
  // This prevents the number from being separated from the symbol by a line break.
  formatted = formatted.replace(/№(\S)/g, '№\u00A0$1');
  // Also fix cases where there is already a space but it's not non-breaking
  formatted = formatted.replace(/№\s+(\d)/g, '№\u00A0$1');

  // 2. Thousands separator (non-breaking space) 
  formatted = formatted.replace(/\b(\d+)(\d{3})\b/g, (match) => {
    if (match.length === 4 && (match.startsWith('19') || match.startsWith('20'))) {
      return match;
    }
    if (match.length > 4) {
      return match.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
    }
    return match;
  });

  // 3. Dash rules
  formatted = formatted.replace(/(\d)\s?-\s?(\d)/g, '$1–$2');
  formatted = formatted.replace(/\s+-\s+/g, ' — ');

  // 4. No dangling prepositions
  // Comprehensive list of Russian prepositions and short conjunctions
  const prepositions = [
    'в', 'во', 'без', 'до', 'из', 'к', 'ко', 'на', 'над', 'о', 'об', 'обо', 
    'от', 'ото', 'по', 'под', 'подо', 'при', 'про', 'с', 'со', 'у', 'через', 
    'для', 'за', 'и', 'а', 'но', 'да'
  ];
  
  // Use a regex that finds the preposition at a word boundary, followed by one or more spaces
  // We replace the spaces with a single non-breaking space (\u00A0)
  const prepRegex = new RegExp(`(^|\\s|\\()(${prepositions.join('|')})\\s+`, 'gi');
  formatted = formatted.replace(prepRegex, '$1$2\u00A0');

  // 5. No wrapping for commas (keep with previous word)
  formatted = formatted.replace(/\s+,/g, '\u00A0,');

  return formatted;
};
