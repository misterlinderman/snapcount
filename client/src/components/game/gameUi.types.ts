/** Catalog / engine card family slug (offense + defense rows in matchup matrix). */
export type GameCardTypeSlug =
  | 'run-in'
  | 'run-out'
  | 'pass-s'
  | 'pass-m'
  | 'pass-d'
  | 'option'
  | 'rogue'
  | 'run-d'
  | 'zone'
  | 'man'
  | 'blitz'
  | 'prevent';

export type CardVisualVariant = 'selectable' | 'selected' | 'cpu-hidden' | 'cpu-revealed';

export type PlaymakerVisualVariant = 'selectable' | 'selected';

export function badgeClassForCardType(type: string): string {
  const known: Record<string, string> = {
    'run-in': 'badge-run-in',
    'run-out': 'badge-run-out',
    'pass-s': 'badge-pass-s',
    'pass-m': 'badge-pass-m',
    'pass-d': 'badge-pass-d',
    option: 'badge-option',
    rogue: 'badge-rogue',
    'run-d': 'badge-run-d',
    zone: 'badge-zone',
    man: 'badge-man',
    blitz: 'badge-blitz',
    prevent: 'badge-prevent',
  };
  return known[type] ?? 'badge-unknown';
}

export function shortTypeLabel(type: string): string {
  const map: Record<string, string> = {
    'run-in': 'RI',
    'run-out': 'RO',
    'pass-s': 'PS',
    'pass-m': 'PM',
    'pass-d': 'PD',
    option: 'OP',
    rogue: 'RG',
    'run-d': 'RD',
    zone: 'ZN',
    man: 'MN',
    blitz: 'BZ',
    prevent: 'PR',
  };
  return map[type] ?? '?';
}
