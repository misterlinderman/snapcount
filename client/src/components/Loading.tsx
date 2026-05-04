function Loading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: 'var(--bg-deep)' }}
    >
      <div className="flex flex-col items-center space-y-4">
        <div
          className="h-12 w-12 animate-spin rounded-full border-4 border-solid"
          style={{
            borderColor: 'var(--bg-border)',
            borderTopColor: 'var(--gold)',
          }}
        />
        <p className="font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
          Loading…
        </p>
      </div>
    </div>
  );
}

export default Loading;
