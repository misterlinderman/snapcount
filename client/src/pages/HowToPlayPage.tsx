import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface GuideSectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

function GuideSection({ id, title, children }: GuideSectionProps): JSX.Element {
  return (
    <section id={id} className="scroll-mt-24">
      <h2
        className="border-b pb-2 text-xl sm:text-2xl"
        style={{
          fontFamily: 'var(--font-playfair)',
          fontStyle: 'italic',
          color: 'var(--ink)',
          borderColor: 'var(--rule)',
        }}
      >
        {title}
      </h2>
      <div
        className="mt-4 space-y-3 text-sm sm:text-base"
        style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--ink2)' }}
      >
        {children}
      </div>
    </section>
  );
}

const toc: { id: string; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'loop', label: 'Season & loop' },
  { id: 'roles', label: 'Roles & field' },
  { id: 'cards-deck', label: 'Cards & deck' },
  { id: 'power', label: 'Power & yards' },
  { id: 'playmakers', label: 'Playmakers' },
  { id: 'matchups', label: 'Matchups' },
  { id: 'scoring', label: 'Scoring & turnovers' },
  { id: 'locker', label: 'Locker room' },
  { id: 'dp', label: 'Draft Points' },
  { id: 'extras', label: 'Redraw, FG & rogue death' },
];

/**
 * In-game guide for logged-in players — aligned with docs/game/GAME_DESIGN.md.
 */
function HowToPlayPage(): JSX.Element {
  return (
    <div className="mx-auto max-w-3xl space-y-10 pb-12">
      <header className="space-y-3">
        <p
          className="text-xs font-bold uppercase tracking-[0.18em]"
          style={{ color: 'var(--muted)', fontFamily: 'var(--font-playfair-sc)' }}
        >
          Field guide
        </p>
        <h1 className="text-3xl sm:text-4xl" style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}>
          How to play
        </h1>
        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--ink2)' }}>
          Gridiron Rogue is card football with a roguelite season: you call plays, assign playmakers, earn Draft Points,
          and rebuild your deck between games.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link
            to="/season"
            className="inline-flex min-h-11 items-center justify-center rounded border-2 px-4 py-2 text-sm font-semibold"
            style={{
              fontFamily: 'var(--font-playfair-sc)',
              borderColor: 'var(--green-turf)',
              backgroundColor: 'var(--green-field)',
              color: 'var(--white)',
            }}
          >
            Season map
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center justify-center rounded border-2 px-4 py-2 text-sm font-semibold"
            style={{
              fontFamily: 'var(--font-serif)',
              borderColor: 'var(--rule)',
              backgroundColor: 'var(--white)',
              color: 'var(--ink)',
            }}
          >
            Home
          </Link>
        </div>
      </header>

      <nav
        aria-label="On this page"
        className="rounded border p-4"
        style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--white)' }}
      >
        <p
          className="mb-2 text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--muted)', fontFamily: 'var(--font-playfair-sc)' }}
        >
          On this page
        </p>
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {toc.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="min-h-11 inline-flex items-center text-sm underline-offset-2 hover:underline"
                style={{ fontFamily: 'var(--font-serif)', color: 'var(--blue)' }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <GuideSection id="overview" title="Overview">
        <p>
          Each snap pits one of your cards against a CPU card. Higher <strong style={{ color: 'var(--ink)' }}>final power</strong>{' '}
          wins; the margin becomes yards gained or lost. First downs, fourth downs, touchdowns, and turnovers behave like
          football — so card choice matters for field position and possession, not just the trade on one play.
        </p>
        <p>
          You only ever see cards that match your <strong style={{ color: 'var(--ink)' }}>current role</strong> (offense or
          defense). That role is set at the coin toss and lasts the whole drive until possession flips.
        </p>
      </GuideSection>

      <GuideSection id="loop" title="Season & game loop">
        <p>
          A season is <strong style={{ color: 'var(--ink)' }}>five games</strong> on a linear map. Each game is{' '}
          <strong style={{ color: 'var(--ink)' }}>four quarters</strong> of{' '}
          <strong style={{ color: 'var(--ink)' }}>eight plays</strong> each (play clock, not realtime).
        </p>
        <ol className="list-inside list-decimal space-y-2 pl-1">
          <li>
            <strong style={{ color: 'var(--ink)' }}>Coin toss</strong> — choose whether you open on offense or defense.
          </li>
          <li>
            <strong style={{ color: 'var(--ink)' }}>Deal</strong> — four role-appropriate cards plus one playmaker for that
            role.
          </li>
          <li>
            <strong style={{ color: 'var(--ink)' }}>Select & snap</strong> — pick a card and a playmaker, then resolve the
            play. The resolution stays up until you advance.
          </li>
          <li>
            <strong style={{ color: 'var(--ink)' }}>Touchdown</strong> — pick one of three reward upgrades; the scoring
            team kicks off and roles flip.
          </li>
          <li>
            <strong style={{ color: 'var(--ink)' }}>Final whistle</strong> after quarter four ends the game.
          </li>
          <li>
            <strong style={{ color: 'var(--ink)' }}>Locker room</strong> — spend Draft Points on drafts, upgrades, or recruits
            before the next game node.
          </li>
        </ol>
        <p>
          Win all five nodes to complete the season. The CPU defensive pool can grow as you advance.
        </p>
      </GuideSection>

      <GuideSection id="roles" title="Roles, possession & field">
        <p>
          <span style={{ color: 'var(--red)' }}>Blitz FC (Red)</span> drives toward yard <strong style={{ color: 'var(--ink)' }}>100</strong>.
          {' '}
          <span style={{ color: 'var(--blue)' }}>Storm SC (Blue)</span> drives toward yard{' '}
          <strong style={{ color: 'var(--ink)' }}>0</strong>. The ball often starts around the 50 after kickoffs and scores.
        </p>
        <p>Possession and roles flip when:</p>
        <ul className="list-inside list-disc space-y-1 pl-1">
          <li>
            <strong style={{ color: 'var(--ink)' }}>Touchdown</strong> — scoring team kicks off; receiver takes over; roles flip.
          </li>
          <li>
            <strong style={{ color: 'var(--ink)' }}>Failed fourth-down snap</strong> — turnover on downs at the spot; roles flip.
          </li>
          <li>
            <strong style={{ color: 'var(--ink)' }}>Interception</strong> — possession flips with a 15-yard return in the new
            offense&apos;s direction.
          </li>
          <li>
            <strong style={{ color: 'var(--ink)' }}>Fumble</strong> — possession flips at the spot.
          </li>
        </ul>
        <p>
          <strong style={{ color: 'var(--ink)' }}>First down:</strong> if your offensive gain meets or beats yards to go,
          it is first and ten again. On offense, fourth down can also be a field goal attempt (see below).
        </p>
      </GuideSection>

      <GuideSection id="cards-deck" title="Cards & building your deck">
        <p>
          Offense and defense use <strong style={{ color: 'var(--ink)' }}>separate card pools</strong>. Run, pass, option, and
          rogue types on O; run D, zone, man, blitz, and prevent on D. Each type has a base power; rogue cards like{' '}
          <em>Film Study</em> and <em>Hail Mary</em> have special rules.
        </p>
        <p>
          <strong style={{ color: 'var(--ink)' }}>Film Study</strong> reveals the CPU defense for that snap at no power cost.
          <strong style={{ color: 'var(--ink)' }}> Hail Mary</strong> randomizes to very high or zero power when resolved.
        </p>
        <p>
          <strong style={{ color: 'var(--ink)' }}>False start (tendency):</strong> if the offense plays the same{' '}
          <em>card type</em> three snaps in a row, the defense reads it and the offense takes an extra{' '}
          <strong style={{ color: 'var(--ink)' }}>−5 yards</strong> on the result.
        </p>
        <p>
          Your roster is edited in the <strong style={{ color: 'var(--ink)' }}>locker room</strong> and in deck views. Total{' '}
          <strong style={{ color: 'var(--ink)' }}>card copies</strong> across offense and defense are capped (currently 20). If
          you draft at cap, you choose cuts before the new card is added. Some upgrades replace a base card with a stronger
          version; each card can only carry one upgrade path.
        </p>
      </GuideSection>

      <GuideSection id="power" title="Power, bonuses & yards">
        <p
          className="rounded border px-3 py-2 font-mono text-xs sm:text-sm"
          style={{
            borderColor: 'var(--rule)',
            backgroundColor: 'var(--cream)',
            color: 'var(--ink)',
          }}
        >
          effective_power = (base_power + card_bonuses + power_boost) × playmaker_mult
          <br />
          final_power = effective_power + matchup_modifier
        </p>
        <p>
          <strong style={{ color: 'var(--ink)' }}>Card bonuses</strong> stack before the playmaker multiplier — for example
          pairing certain cards with the right playmaker position, or route upgrades that add extra juice versus blitz.
        </p>
        <p>
          <strong style={{ color: 'var(--ink)' }}>Matchup modifier</strong> comes from your offensive card type versus the
          defensive scheme (see the matrix below). It shifts the margin before yards are calculated.
        </p>
        <p>
          Let <strong style={{ color: 'var(--ink)' }}>margin = offense final_power − defense final_power</strong>:
        </p>
        <ul className="list-inside list-disc space-y-1 pl-1">
          <li>
            Offense wins: yards = max(1, round(margin × 1.2 + 2))
          </li>
          <li>
            Defense wins: yards = −max(1, round(|margin| × 1.0))
          </li>
          <li>Exact tie: 1 yard to the offense</li>
        </ul>
        <p>
          Yards are computed <em>offense-relative</em> (positive = gain for the offense); the engine applies field direction
          when moving the ball.
        </p>
      </GuideSection>

      <GuideSection id="playmakers" title="Playmakers">
        <p>
          Every hand includes one playmaker aligned with your role. They apply a{' '}
          <strong style={{ color: 'var(--ink)' }}>multiplier</strong> to effective power.
        </p>
        <p>
          <strong style={{ color: 'var(--ink)' }}>Affinity:</strong> full multiplier when the card&apos;s type is in the
          playmaker&apos;s affinity list. If you mismatch (for example a QB playmaker on a pure run card), you still get a
          boost — just at a reduced rate — so experimentation is not hard-punished.
        </p>
        <p>
          Star recruits from the locker room can replace or sit alongside your starters; offensive and defensive playmaker
          pools each cap at <strong style={{ color: 'var(--ink)' }}>four</strong> — adding a fifth forces a drop.
        </p>
        <p style={{ color: 'var(--gold)' }}>
          Draft Points and recruit costs are shown in-game; spend them where your deck needs leverage.
        </p>
      </GuideSection>

      <GuideSection id="matchups" title="Matchup matrix">
        <p>
          Modifiers favoring offense are positive; favoring defense, negative. After you pick an offensive card, the UI can
          surface hints for how that call trends against each defensive shell — use it to read the CPU.
        </p>
        <div className="overflow-x-auto rounded border" style={{ borderColor: 'var(--rule)' }}>
          <table className="w-full min-w-[32rem] text-left text-xs sm:text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--ink)', color: 'var(--cream)' }}>
                <th className="px-2 py-2 font-semibold" style={{ fontFamily: 'var(--font-playfair-sc)' }}>
                  Off / Def
                </th>
                {['Run D', 'Zone', 'Man', 'Blitz', 'Prevent'].map((h) => (
                  <th key={h} className="px-2 py-2 font-semibold" style={{ fontFamily: 'var(--font-playfair-sc)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody style={{ fontFamily: 'var(--font-serif)' }}>
              {[
                ['Run In', 0, 4, 3, 1, 3],
                ['Run Out', -2, 4, 2, 1, 2],
                ['Pass S', 3, 1, -2, 3, 2],
                ['Pass M', 4, 0, 1, 2, 2],
                ['Pass D', 5, 0, 2, 4, 0],
                ['Option', 1, 2, 1, 1, 2],
                ['Rogue', 0, 0, 0, 0, 0],
              ].map((row) => (
                <tr key={row[0] as string} style={{ borderTop: '1px solid var(--rule)' }}>
                  <td className="px-2 py-1.5 font-medium" style={{ color: 'var(--ink)' }}>
                    {row[0] as string}
                  </td>
                  {(row.slice(1) as number[]).map((v, i) => (
                    <td key={`${String(row[0])}-col-${i}`} className="px-2 py-1.5 tabular-nums">
                      {v > 0 ? `+${v}` : v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GuideSection>

      <GuideSection id="scoring" title="Scoring & key outcomes">
        <ul className="list-inside list-disc space-y-2 pl-1">
          <li>
            <strong style={{ color: 'var(--ink)' }}>Touchdown:</strong> ball reaches the goal side (≥ 95 for Red, ≤ 5 for
            Blue). <strong style={{ color: 'var(--ink)' }}>Seven points</strong> (six plus automatic PAT). Kickoff follows and
            possession changes.
          </li>
          <li>
            <strong style={{ color: 'var(--ink)' }}>Interceptions</strong> flip possession and spot the ball after the
            return.
          </li>
          <li>
            Some upgraded defenses add intercept chances on specific losses — watch card notes in rewards and locker picks.
          </li>
        </ul>
      </GuideSection>

      <GuideSection id="locker" title="Locker room">
        <p>
          Between games on the season map, open the locker from the season screen when your session is in the{' '}
          <strong style={{ color: 'var(--ink)' }}>locker</strong> phase. Three spend tracks:
        </p>
        <ul className="list-inside list-disc space-y-2 pl-1">
          <li>
            <strong style={{ color: 'var(--ink)' }}>Draft new cards</strong> — five random offers per visit, priced by rarity
            in Draft Points.
          </li>
          <li>
            <strong style={{ color: 'var(--ink)' }}>Upgrade existing cards</strong> — fixed DP cost to convert a base card into
            its upgraded version where one exists in the catalog.
          </li>
          <li>
            <strong style={{ color: 'var(--ink)' }}>Recruit playmakers</strong> — add or swap star personnel with role-specific
            perks.
          </li>
        </ul>
        <p>
          If you are at the deck copy cap, drafting prompts a <strong style={{ color: 'var(--ink)' }}>forced cut</strong>: you
          remove copies (in the order you specify) before the new card arrives. Plan cuts around synergy and depth.
        </p>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Losing badly can trigger <em>rogue death</em> removal of recent pickups — see below.
        </p>
      </GuideSection>

      <GuideSection id="dp" title="Draft Points (DP)">
        <p>You earn DP during games and spend it in the locker.</p>
        <ul className="list-inside list-disc space-y-1 pl-1">
          <li>+1 when your offense wins a snap</li>
          <li>+1 when your defense wins a snap</li>
          <li>+2 on a touchdown you score</li>
          <li>+3 when you win the game at the final whistle</li>
        </ul>
        <p>
          After <strong style={{ color: 'var(--ink)' }}>your</strong> touchdown, you pick one of three rolled rewards — for
          example a Hail Mary add, a global +2 power boost for the rest of that game, a star playmaker multiplier bump, or
          bonus DP.
        </p>
      </GuideSection>

      <GuideSection id="extras" title="Redraw, field goals & rogue death">
        <p>
          <strong style={{ color: 'var(--ink)' }}>Redraw:</strong> costs 1 DP per use, at most once per possession; the flag
          resets when possession changes.
        </p>
        <p>
          <strong style={{ color: 'var(--ink)' }}>Field goal (user offense, 4th down):</strong> alternative to a snap for
          three points. Short-range tries are automatic; longer ones roll for success. A miss is a turnover at the line of
          scrimmage with possession flipping.
        </p>
        <p>
          <strong style={{ color: 'var(--ink)' }}>Rogue death:</strong> if you lose a game and the opponent&apos;s margin is
          at least fourteen, the run may strip up to three of your most recently drafted cards (by acquisition order) to reflect
          the stakes of a rogue season.
        </p>
      </GuideSection>

      <footer
        className="rounded border p-4 text-center text-sm"
        style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--white)', color: 'var(--muted)' }}
      >
        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
          Numbers and copy follow the live design spec; balance tweaks ship through seeds and admin content without needing a
          client update.
        </p>
      </footer>
    </div>
  );
}

export default HowToPlayPage;
