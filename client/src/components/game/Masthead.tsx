/**
 * Top ink bar: title + version (static shell; auth actions optional strip below in layout).
 */
function Masthead() {
  return (
    <header
      className="flex h-[var(--masthead-height)] shrink-0 items-center justify-between gap-4 border-b px-[var(--shell-pad-x)]"
      style={{
        backgroundColor: 'var(--bg-void)',
        borderColor: 'var(--bg-border)',
        color: 'var(--text-primary)',
      }}
    >
      <h1
        className="truncate text-lg font-bold uppercase tracking-[0.08em] sm:text-xl"
        style={{
          fontFamily: 'var(--font-display)',
        }}
      >
        Gridiron Rogue
      </h1>
      <div className="flex items-center gap-3">
        <span
          className="rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest sm:text-xs"
          style={{
            borderColor: 'var(--gold-dim)',
            color: 'var(--gold)',
            fontFamily: 'var(--font-body)',
          }}
        >
          v0.2
        </span>
      </div>
    </header>
  );
}

export default Masthead;
