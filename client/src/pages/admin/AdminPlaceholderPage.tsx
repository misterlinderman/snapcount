interface AdminPlaceholderPageProps {
  title: string;
  blurb?: string;
}

function AdminPlaceholderPage({ title, blurb = 'This section is not wired yet.' }: AdminPlaceholderPageProps): JSX.Element {
  return (
    <div className="space-y-3">
      <h1 className="text-3xl" style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}>
        {title}
      </h1>
      <p className="text-sm" style={{ color: 'var(--muted)', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
        {blurb}
      </p>
    </div>
  );
}

export default AdminPlaceholderPage;
