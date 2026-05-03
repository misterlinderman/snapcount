import { badgeClassForCardType, shortTypeLabel } from './gameUi.types';

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

function ResolutionPanel({ offense, defense, matchupLabel, yards, className = '' }: ResolutionPanelProps) {
  const yardsText = yards === 0 ? '0' : yards > 0 ? `+${yards}` : `${yards}`;

  const face = (side: ResolutionCardFace) => (
    <div
      className="flex min-w-0 flex-1 flex-col rounded border p-3 sm:p-4"
      style={{
        borderColor: 'var(--rule)',
        backgroundColor: 'var(--white)',
      }}
    >
      <span
        className="mb-2 text-[10px] font-bold uppercase tracking-widest"
        style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--muted)' }}
      >
        {side.roleLabel}
      </span>
      <span className={`game-card-badge mb-2 w-fit ${badgeClassForCardType(side.cardType)}`}>
        {shortTypeLabel(side.cardType)}
      </span>
      <p
        className="mb-3 min-h-[2.5rem] text-base font-medium leading-snug sm:text-lg"
        style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', color: 'var(--ink)' }}
      >
        {side.name}
      </p>
      <div className="mt-auto flex items-baseline justify-between border-t pt-2" style={{ borderColor: 'var(--rule)' }}>
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          Final pwr
        </span>
        <span
          className="text-xl font-semibold tabular-nums sm:text-2xl"
          style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}
        >
          {side.powerDisplay}
        </span>
      </div>
    </div>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {face(offense)}
        {face(defense)}
      </div>

      <div
        className="rounded border px-3 py-4 text-center sm:px-4 sm:py-5"
        style={{
          borderColor: 'var(--gold-mid)',
          backgroundColor: 'var(--cream)',
        }}
      >
        <p
          className="mb-1 text-sm sm:text-base"
          style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--ink2)' }}
        >
          {matchupLabel || '—'}
        </p>
        <p
          className="text-xs uppercase tracking-widest"
          style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--muted)' }}
        >
          Result
        </p>
        <p
          className="mt-1 text-2xl font-semibold tabular-nums sm:text-3xl"
          style={{
            fontFamily: 'var(--font-playfair-sc)',
            color: yards >= 0 ? 'var(--green-turf)' : 'var(--red)',
          }}
          aria-label={`Yards ${yards}`}
        >
            {yardsText}
          <span className="text-lg font-normal sm:text-xl" style={{ color: 'var(--muted)' }}>
            {' '}
            yd{Math.abs(yards) === 1 ? '' : 's'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default ResolutionPanel;
