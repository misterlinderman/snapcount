import StatBadge from './StatBadge';
import TeamBadge from './TeamBadge';

export interface ScoreboardProps {
  homeLabel: string;
  awayLabel: string;
  homeScore: number;
  awayScore: number;
  /** Blitz FC / Storm SC style — who has the ball. */
  possession: 'red' | 'blue';
  quarter: 1 | 2 | 3 | 4;
  down: 1 | 2 | 3 | 4;
  yardsToGo: number;
  /** When true, home column is the red (Blitz) side. */
  homeIsRed?: boolean;
}

const ordinal = (d: number): string => {
  const s = ['1st', '2nd', '3rd', '4th'];
  return s[d - 1] ?? `${d}`;
};

/**
 * Scoreboard: TeamBadge columns + quarter / down (alpha design system).
 */
function Scoreboard({
  homeLabel,
  awayLabel,
  homeScore,
  awayScore,
  possession,
  quarter,
  down,
  yardsToGo,
  homeIsRed = true,
}: ScoreboardProps): JSX.Element {
  const homeIsPossession =
    (homeIsRed && possession === 'red') || (!homeIsRed && possession === 'blue');

  const quarters: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];

  const homeTeamColor = homeIsRed ? 'var(--blitz-red)' : 'var(--storm-blue)';
  const awayTeamColor = homeIsRed ? 'var(--storm-blue)' : 'var(--blitz-red)';
  const homeLogo = homeIsRed ? 'B' : '⚡';
  const awayLogo = homeIsRed ? '⚡' : 'B';

  return (
    <div
      className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 border-b py-2 sm:gap-3 sm:py-3"
      style={{
        borderColor: 'var(--bg-border)',
        background: 'var(--bg-deep)',
        color: 'var(--text-primary)',
      }}
    >
      <div className="min-w-0 justify-self-start">
        <TeamBadge
          name={homeLabel}
          score={homeScore}
          color={homeTeamColor}
          logo={homeLogo}
          align="left"
        />
        <div
          className="mt-1 hidden text-center text-lg sm:block sm:text-left"
          aria-hidden={!homeIsPossession}
        >
          {homeIsPossession ? '◀' : '\u00a0'}
        </div>
      </div>

      <div className="flex min-w-[9rem] flex-col items-center justify-center gap-2 px-1 sm:min-w-[10.5rem]">
        <div className="flex items-center gap-3">
          <StatBadge label="Qtr" value={`Q${quarter}`} size="sm" color="var(--gold-bright)" />
        </div>
        <div className="flex items-center gap-1" aria-label={`Quarter ${quarter}`}>
          {quarters.map((q) => (
            <span
              key={q}
              className="h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5"
              style={{
                backgroundColor: q === quarter ? 'var(--gold)' : 'var(--bg-border)',
                opacity: q <= quarter ? 1 : 0.45,
              }}
            />
          ))}
        </div>
        <div
          className="w-full rounded border px-2 py-1.5 text-center text-xs sm:text-sm"
          style={{
            borderColor: 'var(--bg-border)',
            backgroundColor: 'var(--surface-panel)',
            color: 'var(--text-primary)',
          }}
        >
          <span className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Down</span>
          <span className="font-bold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
            {ordinal(down)} & {yardsToGo}
          </span>
        </div>
      </div>

      <div className="min-w-0 justify-self-end">
        <TeamBadge
          name={awayLabel}
          score={awayScore}
          color={awayTeamColor}
          logo={awayLogo}
          align="right"
        />
        <div
          className="mt-1 hidden text-center text-lg sm:block sm:text-right"
          aria-hidden={homeIsPossession}
        >
          {!homeIsPossession ? '▶' : '\u00a0'}
        </div>
      </div>
    </div>
  );
}

export default Scoreboard;
