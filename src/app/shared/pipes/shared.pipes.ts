import { Pipe, PipeTransform } from '@angular/core';
import { LANGUAGE_LABELS } from '../services/language.service';

// ─────────────────────────────────────────────────────────────────────────────
// CapitalizePipe
// Migré depuis capitalize.filter.js
// Usage : {{ 'hello world' | appCapitalize }}  → 'Hello world'
// ─────────────────────────────────────────────────────────────────────────────

@Pipe({ name: 'appCapitalize', standalone: true, pure: true })
export class CapitalizePipe implements PipeTransform {
  transform(input: string | null | undefined): string {
    if (!input) return '';
    const s = input.toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FindLanguageFromKeyPipe
// Migré depuis language.filter.js (findLanguageFromKey)
// Usage : {{ 'fr' | findLanguageFromKey }}  → 'Français'
// ─────────────────────────────────────────────────────────────────────────────

@Pipe({ name: 'findLanguageFromKey', standalone: true, pure: true })
export class FindLanguageFromKeyPipe implements PipeTransform {
  transform(code: string | null | undefined): string {
    if (!code) return '';
    return LANGUAGE_LABELS[code] ?? code;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TruncateCharactersPipe
// Migré depuis truncate-characters.filter.js (filter name: 'characters')
// Usage : {{ text | truncateChars:30 }}
//         {{ text | truncateChars:30:true }}   (breakOnWord=true → coupe au mot)
// ─────────────────────────────────────────────────────────────────────────────

@Pipe({ name: 'truncateChars', standalone: true, pure: true })
export class TruncateCharactersPipe implements PipeTransform {
  transform(
    input: string | null | undefined,
    chars: number,
    breakOnWord = false
  ): string {
    if (!input) return '';
    if (isNaN(chars) || chars <= 0) return '';
    if (input.length <= chars) return input;

    let truncated = input.substring(0, chars);

    if (!breakOnWord) {
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace !== -1) truncated = truncated.substring(0, lastSpace);
    } else {
      truncated = truncated.trimEnd();
    }

    return truncated + '...';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TruncateWordsPipe
// Migré depuis truncate-words.filter.js (filter name: 'words')
// Usage : {{ text | truncateWords:10 }}
// ─────────────────────────────────────────────────────────────────────────────

@Pipe({ name: 'truncateWords', standalone: true, pure: true })
export class TruncateWordsPipe implements PipeTransform {
  transform(input: string | null | undefined, words: number): string {
    if (!input) return '';
    if (isNaN(words) || words <= 0) return '';

    const wordList = input.split(/\s+/);
    if (wordList.length <= words) return input;

    return wordList.slice(0, words).join(' ') + '...';
  }
}
