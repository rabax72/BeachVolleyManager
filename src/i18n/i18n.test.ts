import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hasKey, interpolate, t } from './index';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory())
      return name === '__tests__' || name === 'i18n' ? [] : sourceFiles(p);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') ? [p] : [];
  });
}

describe('i18n', () => {
  it('interpola i parametri', () => {
    expect(interpolate('Ciao {nome}!', { nome: 'Mare' })).toBe('Ciao Mare!');
    expect(t('common.weekShort', { week: 4 })).toBe('Sett. 4');
  });

  it('restituisce la chiave se manca la traduzione', () => {
    expect(t('chiave.inesistente')).toBe('chiave.inesistente');
  });

  it('tutte le chiavi letterali usate nel codice esistono nel dizionario', () => {
    const missing: string[] = [];
    const root = join(__dirname, '..');
    const literal = /\bt\(\s*'([a-zA-Z0-9_.]+)'/g;
    for (const file of sourceFiles(root)) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(literal)) if (!hasKey(m[1])) missing.push(`${m[1]} (${file})`);
    }
    // Chiavi delle notizie generate dal motore
    const engineKeys = /pushNews\(\s*\w+,\s*'([a-zA-Z0-9_.]+)'/g;
    for (const file of sourceFiles(join(root, 'engine'))) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(engineKeys))
        if (!hasKey(m[1])) missing.push(`${m[1]} (${file})`);
    }
    expect(missing).toEqual([]);
  });

  it('copre tutte le chiavi dinamiche principali', () => {
    const dynamic = [
      ...[
        'serve',
        'reception',
        'setting',
        'attack',
        'block',
        'defense',
        'reading',
        'stamina',
        'speed',
        'jump',
        'mentality',
        'consistency',
      ].flatMap((k) => [`attr.${k}`, `attrShort.${k}`]),
      ...['open', 'national', 'challenger', 'elite'].map((k) => `tier.${k}`),
      ...[
        'ankleSprain',
        'shoulderStrain',
        'kneeTendinitis',
        'backPain',
        'fingerSprain',
        'calfStrain',
        'heatStroke',
        'abdominalStrain',
      ].map((k) => `injury.${k}`),
      ...[
        'partnerArgument',
        'greatInterview',
        'localDonation',
        'flu',
        'fanSupport',
        'mediaCriticism',
        'equipmentDeal',
        'travelIssue',
        'extraTraining',
        'nightOut',
      ].map((k) => `event.${k}`),
      ...['ace', 'serveError', 'kill', 'killLong', 'block', 'attackError', 'setError'].map(
        (k) => `commentary.${k}`,
      ),
      ...['1', '2', '3', '5', '9', '13'].map((k) => `tournament.placement.${k}`),
      ...['group1', 'group2', 'group3', 'QF', 'SF', 'F', 'done'].map(
        (k) => `tournament.phase.${k}`,
      ),
      ...[
        'pastWeek',
        'notUserPair',
        'rankTooLow',
        'alreadyThisWeek',
        'noBudget',
        'injured',
        'wrongGender',
        'alreadyRegistered',
      ].map((k) => `regError.${k}`),
      ...[
        'accepted',
        'lowSalary',
        'lowAmbition',
        'unhappy',
        'tooManyRefusals',
        'rosterFull',
        'noBudget',
        'retired',
      ].map((k) => `market.result.${k}`),
      ...['titles', 'titleTier', 'semifinals', 'rankTop', 'tierEntries', 'finance'].map(
        (k) => `objective.${k}`,
      ),
      ...[
        'salary',
        'staff',
        'sponsor',
        'sponsorBonus',
        'prize',
        'entry',
        'travel',
        'transfer',
        'scouting',
        'event',
        'board',
      ].map((k) => `finance.kinds.${k}`),
    ];
    expect(dynamic.filter((k) => !hasKey(k))).toEqual([]);
  });
});
