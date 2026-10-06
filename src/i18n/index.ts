/**
 * Infrastruttura i18n minimale: dizionari annidati per lingua, interpolazione {param}.
 * Per aggiungere una lingua: creare un file con la stessa struttura di it.ts e registrarlo in DICTIONARIES.
 */
import { it } from './it';

type Tree = { readonly [k: string]: string | Tree };

export const DICTIONARIES: Record<string, Tree> = { it };
export const LANGUAGES: { code: string; label: string }[] = [{ code: 'it', label: 'Italiano' }];

let current = 'it';

export function setLanguage(code: string): void {
  if (DICTIONARIES[code]) current = code;
}
export const getLanguage = (): string => current;

function lookup(dict: Tree, key: string): string | Tree | undefined {
  let node: string | Tree | undefined = dict;
  for (const part of key.split('.')) {
    if (node === undefined || typeof node === 'string') return undefined;
    node = node[part];
  }
  return node;
}

export type Params = Record<string, string | number | undefined>;

export function interpolate(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) =>
    params[k] !== undefined ? String(params[k]) : m,
  );
}

/** Traduce una chiave; se manca restituisce la chiave stessa (visibile in sviluppo). */
export function t(key: string, params?: Params): string {
  const v = lookup(DICTIONARIES[current], key) ?? lookup(DICTIONARIES.it, key);
  if (typeof v !== 'string') return key;
  return interpolate(v, params);
}

export const hasKey = (key: string): boolean =>
  typeof lookup(DICTIONARIES[current], key) === 'string';

const locale = (): string => (current === 'it' ? 'it-IT' : current);

export function formatMoney(n: number): string {
  return new Intl.NumberFormat(locale(), {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatNumber(n: number, digits = 0): string {
  return new Intl.NumberFormat(locale(), {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

export const formatPct = (n: number): string => `${Math.round(n)}%`;
