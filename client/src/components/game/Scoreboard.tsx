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
 * Three-column scoreboard: home | game state | away.
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
}: ScoreboardProps) {
  const homeIsPossession =
    (homeIsRed && possession === 'red') || (!homeIsRed && possession === 'blue');

  const quarters: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];

  return (
    <div
      className="grid w-full grid-cols-[1fr_auto_1fr] gap-2 border-b py-3 sm:gap-3 sm:py-4"
      style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
    >
      {/* Home */}
      <div className="flex min-w-0 flex-col items-center text-center sm:items-start sm:text-left">
        <span
          className="max-w-full truncate text-[10px] font-semibold uppercase tracking-widest sm:text-xs"
          style={{
            fontFamily: 'var(--font-playfair-sc)',
            color: homeIsRed ? 'var(--red)' : 'var(--blue)',
          }}
        >
          {homeLabel}
        </span>
        <span
          className="text-3xl tabular-nums sm:text-4xl"
          style={{ fontFamily: 'var(--font-playfair-sc)' }}
        >
          {homeScore}
        </span>
        <span className="mt-0.5 text-lg sm:text-xl" aria-hidden={!homeIsPossession}>
          {homeIsPossession ? '◀' : '\u00a0'}
        </span>
      </div>

      {/* Center — quarter + down */}
      <div
        className="flex min-w-[8.5rem] flex-col items-center justify-center gap-2 px-1 sm:min-w-[10rem]"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        <div className="flex items-center gap-1" aria-label={`Quarter ${quarter}`}>
          {quarters.map((q) => (
            <span
              key={q}
              className="h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5"
              style={{
                backgroundColor: q === quarter ? 'var(--ink)' : 'var(--rule)',
                opacity: q <= quarter ? 1 : 0.45,
              }}
            />
          ))}
        </div>
        <div
          className="rounded border px-2 py-1.5 text-center text-xs sm:text-sm"
          style={{
            borderColor: 'var(--rule)',
            backgroundColor: 'var(--white)',
            color: 'var(--ink2)',
          }}
        >
          <span className="block text-[10px] uppercase tracking-wider opacity-70">Down</span>
          <span className="font-semibold tabular-nums">
            {ordinal(down)} & {yardsToGo}
          </span>
        </div>
      </div>

      {/* Away */}
      <div className="flex min-w-0 flex-col items-center text-center sm:items-end sm:text-right">
        <span
          className="max-w-full truncate text-[10px] font-semibold uppercase tracking-widest sm:text-xs"
          style={{
            fontFamily: 'var(--font-playfair-sc)',
            color: homeIsRed ? 'var(--blue)' : 'var(--red)',
          }}
        >
          {awayLabel}
        </span>
        <span
          className="text-3xl tabular-nums sm:text-4xl"
          style={{ fontFamily: 'var(--font-playfair-sc)' }}
        >
          {awayScore}
        </span>
        <span className="mt-0.5 text-lg sm:text-xl" aria-hidden={homeIsPossession}>
          {!homeIsPossession ? '▶' : '\u00a0'}
        </span>
      </div>
    </div>
  );
}

export default Scoreboard;
