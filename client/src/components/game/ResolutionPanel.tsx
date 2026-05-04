import { badgeClassForCardType, playCardSubtypeLabel, shortTypeLabel } from './gameUi.types';
import { RouteDiagramDefense, RouteDiagramOffense, RouteDiagramRogue } from './RouteDiagrams';

export interface ResolutionCardFace {
  roleLabel: string;
  cardType: string;
  name: string;
  powerDisplay: string;
}

export interface ResolutionPanelProps {
  offense: ResolutionCardFace;
  defense: ResolutionCardFace;
  matchupLabel: string;
  yards: number;
  className?: string;
}

function ResolutionFace({
  face,
  role,
}: {
  face: ResolutionCardFace;
  role: 'offense' | 'defense';
}): JSX.Element {
  const isRogue = face.cardType === 'rogue';
  const border = isRogue ? 'var(--rogue-purple)' : role === 'offense' ? 'var(--blitz-red)' : 'var(--storm-blue)';

  return (
    <div
      className="flex min-w-0 flex-1 flex-col gap-2 rounded-[var(--radius-lg)] border-2 p-3 sm:p-4"
      style={{ borderColor: border, backgroundColor: 'var(--surface-panel)' }}
    >
      <span
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--text-muted)' }}
      >
        {face.roleLabel}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`game-card-badge ${badgeClassForCardType(face.cardType)}`}>{shortTypeLabel(face.cardType)}</span>
        <span
          className="text-[10px] font-bold uppercase tracking-wide"
          style={{ fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}
        >
          {playCardSubtypeLabel(face.cardType)}
        </span>
      </div>
      <p
        className="min-h-[2rem] text-base font-bold uppercase leading-snug sm:text-lg"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
      >
        {face.name}
      </p>
      <div
        className="flex min-h-[3rem] items-center justify-center rounded-[var(--radius-sm)] sm:min-h-[3.5rem]"
        style={{ background: 'var(--bg-deep)' }}
      >
        {isRogue ? (
          <RouteDiagramRogue cardName={face.name} compact />
        ) : role === 'offense' ? (
          <RouteDiagramOffense cardType={face.cardType} compact />
        ) : (
          <RouteDiagramDefense cardType={face.cardType} compact />
        )}
      </div>
      <div className="mt-auto flex items-end justify-between border-t pt-2" style={{ borderColor: 'var(--bg-border)' }}>
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Final pwr
        </span>
        <span
          className="text-xl font-black tabular-nums sm:text-2xl"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
        >
          {face.powerDisplay}
        </span>
      </div>
    </div>
  );
}

function ResolutionPanel({ offense, defense, matchupLabel, yards, className = '' }: ResolutionPanelProps): JSX.Element {
  const yardsText = yards === 0 ? '0' : yards > 0 ? `+${yards}` : `${yards}`;
  const tone =
    yards > 0 ? 'var(--success-green)' : yards < 0 ? 'var(--blitz-red-bright)' : 'var(--text-secondary)';

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
        <ResolutionFace face={offense} role="offense" />

        <div className="flex flex-col items-center justify-center gap-1 px-2 py-3 sm:py-0">
          <div className="text-[11px] tracking-widest" style={{ color: 'var(--text-muted)' }}>
            MATCHUP
          </div>
          <div className="text-2xl font-light" style={{ color: 'var(--text-muted)' }}>
            VS
          </div>
        </div>

        <ResolutionFace face={defense} role="defense" />
      </div>

      <div
        className="rounded-[var(--radius-lg)] border-2 px-3 py-4 text-center sm:px-5 sm:py-5"
        style={{
          borderColor: 'var(--gold-dim)',
          backgroundColor: 'var(--bg-raised)',
        }}
      >
        <p
          className="mb-1 text-sm sm:text-base"
          style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', color: 'var(--text-secondary)' }}
        >
          {matchupLabel || '—'}
        </p>
        <p
          className="text-xs uppercase tracking-[0.15em]"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-muted)' }}
        >
          Result
        </p>
        <p className="mt-1 tabular-nums" style={{ fontFamily: 'var(--font-display)' }} aria-label={`Yards ${yards}`}>
          <span className="text-2xl font-black sm:text-3xl" style={{ color: tone }}>
            {yardsText}
          </span>
          <span className="text-lg font-normal sm:text-xl" style={{ color: 'var(--text-muted)' }}>
            {' '}
            yd{Math.abs(yards) === 1 ? '' : 's'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default ResolutionPanel;
