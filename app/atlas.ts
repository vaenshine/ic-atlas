import profilesData from './data/profiles.json' with { type: 'json' };
import translationsData from './data/translations.json' with { type: 'json' };
import {
  parts as originals,
  packageInfo,
  type Part,
  type Shape,
  type Kind,
} from './catalog.ts';
import { domains, packageEnglish, type Language } from './i18n.ts';
export type TranslatedText = Pick<
  Part,
  | 'name'
  | 'subtitle'
  | 'description'
  | 'specs'
  | 'uses'
  | 'tip'
  | 'pinNotes'
  | 'steps'
>;
export type CategoryProfile = {
  id: string;
  index: number;
  zh: string;
  en: string;
  group: string;
  shape: Shape;
  pins: number;
  kind: Kind;
  packageEn: string;
  packageZh: string;
  existingIds: string[];
  enText: TranslatedText;
  zhText: TranslatedText;
  source: string;
};
export const profiles = profilesData as unknown as CategoryProfile[];
export const translations = translationsData as unknown as Record<
  string,
  Partial<Part>
>;
export const originalParts = originals;
export function originalIn(part: Part, language: Language): Part {
  return language === 'zh' ? part : { ...part, ...translations[part.id] };
}
export function categoryIn(p: CategoryProfile, language: Language): Part {
  return {
    id: p.id,
    kind: p.kind,
    shape: p.shape,
    pins: p.pins,
    source: p.source,
    family: domains[p.group]?.[language === 'en' ? 0 : 1] || p.group,
    package: language === 'en' ? p.packageEn : p.packageZh,
    ...(language === 'en' ? p.enText : p.zhText),
  };
}
export function itemIn(id: string, language: Language) {
  const c = profiles.find((p) => p.id === id);
  if (c) return categoryIn(c, language);
  return originalIn(
    originals.find((p) => p.id === id) || originals[0],
    language,
  );
}
export function domainOf(id: string) {
  const category = profiles.find(
    (p) => p.id === id || p.existingIds.includes(id),
  );
  if (category) return category.group;
  const p = originals.find((p) => p.id === id);
  return p?.kind === 'module'
    ? 'module'
    : p?.kind === 'mcu'
      ? 'digital'
      : p?.kind === 'basic'
        ? 'discrete'
        : 'analog';
}
export function packageIn(shape: string, language: Language) {
  return language === 'en' ? packageEnglish[shape] : packageInfo[shape];
}
export function normalizeSearch(value: string) {
  return value
    .normalize('NFKC')
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
export function searchText(id: string) {
  return normalizeSearch(
    ['en', 'zh']
      .map((lang) => {
        const p = itemIn(id, lang as Language);
        return [
          p.name,
          p.subtitle,
          p.family,
          p.package,
          p.description,
          profiles.find((c) => c.id === id)?.[lang === 'en' ? 'en' : 'zh'],
        ].join(' ');
      })
      .join(' '),
  );
}
export const packageIds = Object.keys(packageInfo)
  .map((shape) => originals.find((p) => p.shape === shape)?.id)
  .filter((id): id is string => !!id);
