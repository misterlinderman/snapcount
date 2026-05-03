export interface RoleBannerProps {
  role: 'offense' | 'defense';
  /** Banner color tied to user's team. */
  team: 'red' | 'blue';
  className?: string;
}

/**
 * Full-width role strip: "You are on Offense/Defense".
 */
function RoleBanner({ role, team, className = '' }: RoleBannerProps) {
  const bg = team === 'red' ? 'var(--red)' : 'var(--blue)';
  const bgMid = team === 'red' ? 'var(--red-mid)' : 'var(--blue-mid)';
  const roleLabel = role === 'offense' ? 'Offense' : 'Defense';

  return (
    <div
      className={`px-[var(--shell-pad-x)] py-2.5 text-center sm:py-3 ${className}`}
      style={{
        background: `linear-gradient(180deg, ${bg} 0%, ${bgMid} 100%)`,
        color: 'var(--white)',
        fontFamily: 'var(--font-playfair-sc)',
        textShadow: '0 1px 1px rgba(0,0,0,0.25)',
      }}
    >
      <p className="text-sm font-normal tracking-wide sm:text-base">
        You are on <span className="font-semibold">{roleLabel}</span>
      </p>
    </div>
  );
}

export default RoleBanner;
