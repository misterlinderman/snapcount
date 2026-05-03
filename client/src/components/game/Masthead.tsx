/**
 * Top ink bar: title + version (static shell; auth actions optional strip below in layout).
 */
function Masthead() {
  return (
    <header
      className="flex h-[var(--masthead-height)] shrink-0 items-center justify-between gap-4 border-b px-[var(--shell-pad-x)]"
      style={{
        backgroundColor: 'var(--ink)',
        borderColor: 'var(--ink2)',
        color: 'var(--cream)',
      }}
    >
      <h1
        className="truncate text-lg font-normal tracking-[0.02em] sm:text-xl"
        style={{
          fontFamily: 'var(--font-playfair-sc)',
        }}
      >
        Gridiron Rogue
      </h1>
      <div className="flex items-center gap-3">
        <span
          className="rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest sm:text-xs"
          style={{
            borderColor: 'var(--rule)',
            color: 'var(--gold)',
            fontFamily: 'var(--font-serif)',
          }}
        >
          v0.2
        </span>
      </div>
    </header>
  );
}

export default Masthead;
