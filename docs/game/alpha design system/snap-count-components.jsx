// ============================================================
// SNAP COUNT — Shared React Components
// Load with: <script type="text/babel" src="snap-count-components.jsx"></script>
// ============================================================

// ── PLAY CARD ──────────────────────────────────────────────────────────────
// role: 'offense' | 'defense' | 'rogue'
// rarity: 'common' | 'rare' | 'rogue'
// selected, disabled, compact
function PlayCard({ card, role = 'offense', selected = false, disabled = false, compact = false, onClick }) {
  const isRogue = card.type === 'ROGUE' || card.cardType === 'rogue';
  const borderColor = isRogue ? 'var(--rogue-purple)' : role === 'offense' ? 'var(--blitz-red)' : 'var(--storm-blue)';
  const glowColor   = isRogue ? 'var(--glow-purple)' : role === 'offense' ? 'var(--glow-red)' : 'var(--glow-blue)';
  const rarityColor = card.rarity === 'RARE' ? 'var(--rarity-rare)' : card.rarity === 'ROGUE' ? 'var(--rarity-rogue)' : 'var(--rarity-common)';

  const cardStyle = {
    position: 'relative',
    width: compact ? 88 : 155,
    minHeight: compact ? 100 : 150,
    background: 'var(--bg-surface)',
    border: `2px solid ${selected ? 'var(--gold)' : borderColor}`,
    borderRadius: 'var(--radius-lg)',
    padding: compact ? '8px 6px' : '10px 8px',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    boxShadow: selected ? 'var(--glow-gold)' : 'none',
    transition: 'border-color 150ms, box-shadow 150ms, transform 150ms',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flexShrink: 0,
    userSelect: 'none',
  };

  const handleHover = (e, enter) => {
    if (disabled) return;
    e.currentTarget.style.transform = enter ? 'translateY(-2px) scale(1.02)' : '';
    e.currentTarget.style.boxShadow = enter ? (selected ? 'var(--glow-gold)' : glowColor) : (selected ? 'var(--glow-gold)' : 'none');
  };

  return (
    <div style={cardStyle} onClick={onClick}
      onMouseEnter={e => handleHover(e, true)}
      onMouseLeave={e => handleHover(e, false)}>

      {/* Rarity bar top */}
      <div style={{ position:'absolute', top:0, left:8, right:8, height:2, background:rarityColor, borderRadius:2 }} />

      {/* Type + Subtype */}
      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:3 }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize: compact ? 9 : 12, color:'var(--text-primary)', lineHeight:1, letterSpacing:'0.04em', textTransform:'uppercase', flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {card.name}
          </div>
          {card.rarity === 'RARE' && !compact && (
            <div style={{ fontSize:7, fontWeight:700, color:'var(--rarity-rare)', letterSpacing:'0.08em', flexShrink:0 }}>RARE</div>
          )}
          {isRogue && !compact && (
            <div style={{ fontSize:7, fontWeight:700, color:'var(--rarity-rogue)', letterSpacing:'0.08em', flexShrink:0 }}>ROGUE</div>
          )}
        </div>
        <div style={{ fontFamily:'var(--font-body)', fontSize: compact ? 8 : 10, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
          {card.subtype}
        </div>
      </div>

      {/* Route Diagram */}
      <div style={{ flex:1, background:'var(--bg-deep)', borderRadius:4, minHeight: compact ? 36 : 56, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
        {isRogue ? (
          <RouteDiagramRogue compact={compact} card={card} />
        ) : role === 'offense' ? (
          <RouteDiagramOffense subtype={card.subtype} compact={compact} />
        ) : (
          <RouteDiagramDefense subtype={card.subtype} compact={compact} />
        )}
      </div>

      {/* Power + Base */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginTop:2 }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize: compact ? 22 : 32, color:'var(--text-primary)', lineHeight:1 }}>
          {card.power}
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize: compact ? 7 : 9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>BASE</div>
          <div style={{ fontSize: compact ? 9 : 12, color:'var(--text-secondary)', fontWeight:600, fontFamily:'var(--font-display)' }}>{card.basePower || card.power}</div>
        </div>
      </div>

      {/* Copy count badge */}
      {card.copies && (
        <div style={{ position:'absolute', bottom:6, right:6, fontSize:9, color:'var(--text-muted)', fontFamily:'var(--font-body)' }}>
          ×{card.copies}
        </div>
      )}
    </div>
  );
}

// ── ROUTE DIAGRAMS (SVG) ──────────────────────────────────────────────────

function RouteDiagramOffense({ subtype, compact }) {
  const s = compact ? 0.55 : 1;
  const w = 68 * s, h = 52 * s;
  const diagrams = {
    'SPOT':   <><line x1={34*s} y1={46*s} x2={34*s} y2={22*s} stroke="#E8A820" strokeWidth={1.5}/><line x1={34*s} y1={22*s} x2={44*s} y2={10*s} stroke="#E8A820" strokeWidth={1.5}/><circle cx={44*s} cy={10*s} r={3*s} fill="#E8A820"/><circle cx={34*s} cy={46*s} r={3*s} fill="#8CA0B4"/></>,
    'DEEP':   <><line x1={34*s} y1={46*s} x2={34*s} y2={8*s} stroke="#E8A820" strokeWidth={1.5} strokeDasharray="3,2"/><circle cx={34*s} cy={8*s} r={3*s} fill="#E8A820"/><circle cx={34*s} cy={46*s} r={3*s} fill="#8CA0B4"/></>,
    'SLANT':  <><line x1={28*s} y1={46*s} x2={28*s} y2={30*s} stroke="#E8A820" strokeWidth={1.5}/><line x1={28*s} y1={30*s} x2={50*s} y2={12*s} stroke="#E8A820" strokeWidth={1.5}/><circle cx={50*s} cy={12*s} r={3*s} fill="#E8A820"/><circle cx={28*s} cy={46*s} r={3*s} fill="#8CA0B4"/></>,
    'POWER':  <><line x1={34*s} y1={46*s} x2={34*s} y2={14*s} stroke="#E8A820" strokeWidth={2.5}/><polygon points={`${34*s},${8*s} ${30*s},${17*s} ${38*s},${17*s}`} fill="#E8A820"/><circle cx={34*s} cy={46*s} r={3*s} fill="#8CA0B4"/></>,
    'ISO':    <><line x1={34*s} y1={46*s} x2={20*s} y2={30*s} stroke="#E8A820" strokeWidth={1.5}/><line x1={20*s} y1={30*s} x2={20*s} y2={14*s} stroke="#E8A820" strokeWidth={1.5}/><circle cx={20*s} cy={14*s} r={3*s} fill="#E8A820"/><circle cx={34*s} cy={46*s} r={3*s} fill="#8CA0B4"/></>,
    'SWEEP':  <><path d={`M ${20*s} ${46*s} Q ${60*s} ${40*s} ${58*s} ${14*s}`} stroke="#E8A820" strokeWidth={1.5} fill="none"/><circle cx={58*s} cy={14*s} r={3*s} fill="#E8A820"/><circle cx={20*s} cy={46*s} r={3*s} fill="#8CA0B4"/></>,
    'READ':   <><line x1={18*s} y1={46*s} x2={18*s} y2={26*s} stroke="#E8A820" strokeWidth={1.5}/><line x1={18*s} y1={26*s} x2={34*s} y2={14*s} stroke="#E8A820" strokeWidth={1.5}/><line x1={46*s} y1={46*s} x2={46*s} y2={26*s} stroke="#8CA0B4" strokeWidth={1}/><line x1={46*s} y1={26*s} x2={34*s} y2={14*s} stroke="#8CA0B4" strokeWidth={1}/><circle cx={34*s} cy={14*s} r={3*s} fill="#E8A820"/><circle cx={18*s} cy={46*s} r={3*s} fill="#8CA0B4"/><circle cx={46*s} cy={46*s} r={3*s} fill="#8CA0B4"/></>,
    'TRIPLE': <><line x1={14*s} y1={46*s} x2={14*s} y2={18*s} stroke="#E8A820" strokeWidth={1.5}/><line x1={34*s} y1={46*s} x2={34*s} y2={12*s} stroke="#E8A820" strokeWidth={1.5}/><line x1={54*s} y1={46*s} x2={54*s} y2={18*s} stroke="#E8A820" strokeWidth={1.5}/><circle cx={14*s} cy={18*s} r={2.5*s} fill="#E8A820"/><circle cx={34*s} cy={12*s} r={2.5*s} fill="#E8A820"/><circle cx={54*s} cy={18*s} r={2.5*s} fill="#E8A820"/></>,
  };
  const d = diagrams[subtype] || diagrams['SPOT'];
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>{d}</svg>;
}

function RouteDiagramDefense({ subtype, compact }) {
  const s = compact ? 0.55 : 1;
  const w = 68 * s, h = 52 * s;
  // Defense diagrams in blue
  const diagrams = {
    'COVER 3': <><line x1={10*s} y1={18*s} x2={58*s} y2={18*s} stroke="#2979FF" strokeWidth={1} strokeDasharray="4,3"/><circle cx={10*s} cy={18*s} r={3*s} fill="#2979FF"/><circle cx={34*s} cy={18*s} r={3*s} fill="#2979FF"/><circle cx={58*s} cy={18*s} r={3*s} fill="#2979FF"/><line x1={22*s} y1={40*s} x2={46*s} y2={40*s} stroke="#2979FF" strokeWidth={1}/><circle cx={22*s} cy={40*s} r={2.5*s} fill="#2979FF"/><circle cx={46*s} cy={40*s} r={2.5*s} fill="#2979FF"/></>,
    'BLITZ': <><line x1={18*s} y1={8*s} x2={28*s} y2={44*s} stroke="#FF3340" strokeWidth={2}/><line x1={50*s} y1={8*s} x2={40*s} y2={44*s} stroke="#FF3340" strokeWidth={2}/><circle cx={18*s} cy={8*s} r={3*s} fill="#FF3340"/><circle cx={50*s} cy={8*s} r={3*s} fill="#FF3340"/><circle cx={34*s} cy={14*s} r={3*s} fill="#2979FF"/></>,
    'MAN': <><circle cx={18*s} cy={12*s} r={3*s} fill="#2979FF"/><circle cx={50*s} cy={12*s} r={3*s} fill="#2979FF"/><circle cx={34*s} cy={8*s} r={3*s} fill="#2979FF"/><line x1={18*s} y1={12*s} x2={22*s} y2={42*s} stroke="#2979FF" strokeWidth={1} strokeDasharray="2,2"/><line x1={50*s} y1={12*s} x2={46*s} y2={42*s} stroke="#2979FF" strokeWidth={1} strokeDasharray="2,2"/></>,
    'ZONE': <><ellipse cx={34*s} cy={22*s} rx={26*s} ry={14*s} stroke="#2979FF" strokeWidth={1.5} fill="rgba(41,121,255,0.1)"/><circle cx={14*s} cy={22*s} r={3*s} fill="#2979FF"/><circle cx={34*s} cy={14*s} r={3*s} fill="#2979FF"/><circle cx={54*s} cy={22*s} r={3*s} fill="#2979FF"/></>,
    'PREVENT': <><line x1={8*s} y1={10*s} x2={60*s} y2={10*s} stroke="#2979FF" strokeWidth={2}/><circle cx={8*s} cy={10*s} r={2.5*s} fill="#2979FF"/><circle cx={20*s} cy={10*s} r={2.5*s} fill="#2979FF"/><circle cx={34*s} cy={10*s} r={2.5*s} fill="#2979FF"/><circle cx={48*s} cy={10*s} r={2.5*s} fill="#2979FF"/><circle cx={60*s} cy={10*s} r={2.5*s} fill="#2979FF"/></>,
    'RUN D': <><line x1={12*s} y1={44*s} x2={56*s} y2={44*s} stroke="#2979FF" strokeWidth={2.5}/><circle cx={12*s} cy={44*s} r={3*s} fill="#2979FF"/><circle cx={24*s} cy={44*s} r={3*s} fill="#2979FF"/><circle cx={34*s} cy={44*s} r={3*s} fill="#2979FF"/><circle cx={44*s} cy={44*s} r={3*s} fill="#2979FF"/><circle cx={56*s} cy={44*s} r={3*s} fill="#2979FF"/></>,
  };
  const d = diagrams[subtype] || diagrams['ZONE'];
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>{d}</svg>;
}

function RouteDiagramRogue({ compact, card }) {
  const s = compact ? 0.55 : 1;
  const w = 68 * s, h = 52 * s;
  if (card.name === 'FILM STUDY') {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <circle cx={34*s} cy={26*s} r={16*s} stroke="var(--rogue-purple-bright)" strokeWidth={1.5} fill="rgba(124,58,237,0.1)"/>
        <circle cx={34*s} cy={26*s} r={7*s} stroke="var(--rogue-purple-bright)" strokeWidth={1} fill="rgba(124,58,237,0.2)"/>
        <line x1={24*s} y1={16*s} x2={44*s} y2={36*s} stroke="var(--rogue-purple-bright)" strokeWidth={1} opacity={0.5}/>
        <line x1={44*s} y1={16*s} x2={24*s} y2={36*s} stroke="var(--rogue-purple-bright)" strokeWidth={1} opacity={0.5}/>
      </svg>
    );
  }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={`M ${34*s} ${46*s} Q ${14*s} ${10*s} ${34*s} ${6*s} Q ${54*s} ${10*s} ${34*s} ${46*s}`} stroke="var(--rogue-purple-bright)" strokeWidth={1.5} fill="rgba(168,85,247,0.15)"/>
      <circle cx={34*s} cy={26*s} r={4*s} fill="var(--rogue-purple-bright)"/>
    </svg>
  );
}

// ── PLAYMAKER CARD ─────────────────────────────────────────────────────────

function PlaymakerCard({ playmaker, role = 'offense', selected = false, compact = false, onClick }) {
  const color = role === 'offense' ? 'var(--blitz-red)' : 'var(--storm-blue)';
  return (
    <div onClick={onClick} style={{
      width: compact ? 70 : 90,
      background: 'var(--bg-surface)',
      border: `2px solid ${selected ? 'var(--gold)' : color}`,
      borderRadius: 'var(--radius-md)',
      padding: '8px 6px',
      cursor: 'pointer',
      boxShadow: selected ? 'var(--glow-gold)' : 'none',
      transition: 'all 150ms',
      userSelect: 'none',
      flexShrink: 0,
    }}>
      <div style={{ width:'100%', aspectRatio:'1', background:'var(--bg-raised)', borderRadius:'var(--radius-sm)', marginBottom:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <PlaymakerSilhouette position={playmaker.position} color={color} />
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize: compact ? 9 : 11, color:'var(--text-primary)', textAlign:'center', letterSpacing:'0.04em' }}>
        {playmaker.position}
      </div>
      <div style={{ fontFamily:'var(--font-body)', fontSize: compact ? 8 : 10, color:'var(--text-secondary)', textAlign:'center' }}>
        {playmaker.name}
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize: compact ? 11 : 14, color:'var(--gold)', textAlign:'center', marginTop:2 }}>
        {playmaker.multiplier}×
      </div>
    </div>
  );
}

function PlaymakerSilhouette({ position, color }) {
  const shapes = {
    QB: <><ellipse cx={16} cy={10} rx={4} ry={4} fill={color} opacity={0.9}/><path d="M 10 28 L 10 16 L 22 16 L 22 28" fill={color} opacity={0.8}/><line x1={16} y1={16} x2={16} y2={28} stroke={color} strokeWidth={2} opacity={0.5}/></>,
    WR: <><ellipse cx={16} cy={9} rx={3.5} ry={3.5} fill={color} opacity={0.9}/><path d="M 8 26 L 10 14 L 22 14 L 24 26" fill={color} opacity={0.8}/></>,
    RB: <><ellipse cx={16} cy={9} rx={4} ry={4} fill={color} opacity={0.9}/><path d="M 9 26 L 11 15 L 21 15 L 23 26" fill={color} opacity={0.8}/></>,
    LB: <><ellipse cx={16} cy={9} rx={4.5} ry={4.5} fill={color} opacity={0.9}/><rect x={9} y={15} width={14} height={12} rx={2} fill={color} opacity={0.8}/></>,
    CB: <><ellipse cx={16} cy={9} rx={3.5} ry={3.5} fill={color} opacity={0.9}/><path d="M 10 26 L 12 14 L 20 14 L 22 26" fill={color} opacity={0.7}/></>,
    S:  <><ellipse cx={16} cy={9} rx={3.5} ry={3.5} fill={color} opacity={0.9}/><path d="M 8 26 L 12 14 L 20 14 L 24 26" fill={color} opacity={0.7}/></>,
  };
  return <svg width={32} height={32} viewBox="0 0 32 32">{shapes[position] || shapes.QB}</svg>;
}

// ── STAT BADGE ─────────────────────────────────────────────────────────────

function StatBadge({ label, value, color, size = 'md' }) {
  const sizes = { sm: { label:9, value:13 }, md: { label:10, value:16 }, lg: { label:12, value:22 } };
  const sz = sizes[size];
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
      <div style={{ fontSize:sz.label, color:'var(--text-muted)', fontFamily:'var(--font-body)', textTransform:'uppercase', letterSpacing:'0.07em', lineHeight:1 }}>
        {label}
      </div>
      <div style={{ fontSize:sz.value, fontFamily:'var(--font-display)', fontWeight:700, color: color || 'var(--text-primary)', lineHeight:1 }}>
        {value}
      </div>
    </div>
  );
}

// ── TEAM BADGE ─────────────────────────────────────────────────────────────

function TeamBadge({ name, record, score, color, logo, align = 'left' }) {
  const isRight = align === 'right';
  return (
    <div style={{ display:'flex', flexDirection: isRight ? 'row-reverse' : 'row', alignItems:'center', gap:8 }}>
      <div style={{ width:36, height:36, borderRadius:6, background:`${color}22`, border:`2px solid ${color}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:900, fontSize:18, color }}>
        {logo}
      </div>
      <div style={{ textAlign: isRight ? 'right' : 'left' }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'var(--text-primary)', letterSpacing:'0.04em' }}>{name}</div>
        <div style={{ fontSize:10, color:'var(--text-muted)' }}>{record}</div>
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:36, color, lineHeight:1, marginLeft: isRight ? 0 : 4, marginRight: isRight ? 4 : 0 }}>
        {score}
      </div>
    </div>
  );
}

// ── DOWN & DISTANCE BANNER ─────────────────────────────────────────────────

function DownBanner({ down, distance, yardLine, playClock, quarter, gameTime, play, totalPlays }) {
  const downs = ['', '1ST', '2ND', '3RD', '4TH'];
  const downLabel = downs[down] || '1ST';
  const isFourth = down === 4;
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16, padding:'6px 20px', background:'rgba(0,0,0,0.5)', borderBottom:'1px solid var(--bg-border)' }}>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:24, color: isFourth ? 'var(--blitz-red)' : 'var(--text-primary)', letterSpacing:'0.02em' }}>
        {downLabel} &amp; {distance}
      </div>
      <div style={{ width:1, height:20, background:'var(--bg-border)' }} />
      <div style={{ fontFamily:'var(--font-body)', fontSize:12, color:'var(--text-secondary)' }}>
        BALL ON <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--gold)' }}>{yardLine}</span>
      </div>
      <div style={{ width:1, height:20, background:'var(--bg-border)' }} />
      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:18, color: playClock <= 5 ? 'var(--blitz-red)' : 'var(--text-primary)', padding:'2px 8px', border:`1px solid ${playClock <= 5 ? 'var(--blitz-red)' : 'var(--bg-border)'}`, borderRadius:4 }}>
        :{String(playClock).padStart(2,'0')}
      </div>
    </div>
  );
}

// ── FIELD STRIP ────────────────────────────────────────────────────────────

function FieldStrip({ ballPosition = 42, height = 80 }) {
  const yards = [10,20,30,40,50,40,30,20,10];
  const pct = (ballPosition / 100) * 100;
  return (
    <div style={{ position:'relative', width:'100%', height, background:'var(--field-bg)', borderTop:'1px solid rgba(255,255,255,0.08)', borderBottom:'1px solid rgba(255,255,255,0.08)', overflow:'hidden' }}>
      {/* End zones */}
      <div style={{ position:'absolute', left:0, top:0, width:'8%', height:'100%', background:'var(--field-end-red)', borderRight:'2px solid var(--blitz-red)' }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:10, color:'var(--blitz-red)', writingMode:'vertical-rl', textOrientation:'mixed', transform:'rotate(180deg)', margin:'auto', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', letterSpacing:'0.1em', opacity:0.7 }}>BLITZ</div>
      </div>
      <div style={{ position:'absolute', right:0, top:0, width:'8%', height:'100%', background:'var(--field-end-blue)', borderLeft:'2px solid var(--storm-blue)' }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:10, color:'var(--storm-blue)', writingMode:'vertical-rl', textOrientation:'mixed', margin:'auto', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', letterSpacing:'0.1em', opacity:0.7 }}>STORM</div>
      </div>
      {/* Yard lines */}
      {yards.map((y, i) => (
        <div key={i} style={{ position:'absolute', left:`${8 + (i * 84/8)}%`, top:0, height:'100%', width:1, background:'var(--field-line)', display:'flex', flexDirection:'column', justifyContent:'space-between', pointerEvents:'none' }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:9, color:'var(--yard-marker)', paddingTop:3, paddingLeft:3 }}>{y}</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:9, color:'var(--yard-marker)', paddingBottom:3, paddingLeft:3 }}>{y}</div>
        </div>
      ))}
      {/* Stripes */}
      {[...Array(9)].map((_, i) => (
        <div key={i} style={{ position:'absolute', left:`${8 + i * 84/8}%`, top:0, width:`${84/8}%`, height:'100%', background: i%2===0 ? 'rgba(255,255,255,0.02)' : 'transparent' }} />
      ))}
      {/* Ball marker */}
      <div style={{ position:'absolute', left:`${8 + (pct - 0) * 0.84}%`, top:'50%', transform:'translate(-50%, -50%)', zIndex:10 }}>
        <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--bg-void)', border:'2px solid var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'var(--glow-gold)' }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:9, color:'var(--gold)' }}>{ballPosition}</div>
        </div>
      </div>
    </div>
  );
}

// ── ROLE BADGE ─────────────────────────────────────────────────────────────

function RoleBadge({ role, isYou = false }) {
  const isOffense = role === 'offense';
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
      <div style={{ padding:'3px 10px', background: isOffense ? 'var(--blitz-red)' : 'var(--storm-blue)', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, color:'white', letterSpacing:'0.08em', textTransform:'uppercase' }}>
        {role}
      </div>
      {isYou && <div style={{ fontSize:9, color:'var(--text-muted)', letterSpacing:'0.06em' }}>YOU</div>}
    </div>
  );
}

// ── SCOREBOARD ─────────────────────────────────────────────────────────────

function Scoreboard({ homeTeam, awayTeam, quarter, gameTime, play, totalPlays, dp, redraws, canFG }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px', background:'var(--bg-deep)', borderBottom:'1px solid var(--bg-border)' }}>
      <TeamBadge {...homeTeam} color="var(--blitz-red)" logo="B" align="left" />
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <StatBadge label="QTR" value={`Q${quarter}`} size="sm" />
          <StatBadge label="TIME" value={gameTime} size="sm" />
          <StatBadge label="PLAY" value={`${play}/${totalPlays}`} size="sm" />
        </div>
        <div style={{ display:'flex', gap:8, marginTop:2 }}>
          <div style={{ display:'flex', gap:4, alignItems:'center', fontSize:10, color:'var(--text-secondary)' }}>
            <span style={{ color:'var(--gold)', fontWeight:700 }}>⬡</span> {dp} DP
          </div>
          {redraws > 0 && <div style={{ fontSize:10, color:'var(--text-secondary)' }}>↺ {redraws}</div>}
          {canFG && <div style={{ fontSize:10, color:'var(--gold)' }}>⊕ FG</div>}
        </div>
      </div>
      <TeamBadge {...awayTeam} color="var(--storm-blue)" logo="⚡" align="right" />
    </div>
  );
}

// ── MATCHUP DISPLAY ────────────────────────────────────────────────────────

function MatchupDisplay({ offCard, defCard, matchupMod, defTendencies }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:20, padding:'12px 16px', background:'var(--bg-surface)' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <PlayCard card={offCard} role="offense" selected />
        {offCard.matchupHint && (
          <div style={{ fontSize:10, color:'var(--text-secondary)', textAlign:'center' }}>
            <span style={{ color: offCard.matchupHint.trend === 'good' ? 'var(--success-green)' : 'var(--blitz-red)' }}>
              {offCard.matchupHint.label}
            </span>
          </div>
        )}
      </div>

      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
        <div style={{ fontSize:11, color:'var(--text-muted)', letterSpacing:'0.06em' }}>MATCHUP</div>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:28, color: matchupMod > 0 ? 'var(--success-green)' : matchupMod < 0 ? 'var(--blitz-red)' : 'var(--text-secondary)' }}>
          {matchupMod > 0 ? '+' : ''}{matchupMod}
        </div>
        <div style={{ fontSize:22, color:'var(--text-muted)' }}>VS</div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <PlayCard card={defCard} role="defense" />
        {defTendencies && (
          <div style={{ fontSize:10, color:'var(--text-muted)' }}>
            <div style={{ marginBottom:2, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.06em', fontSize:9 }}>DEF TENDENCY</div>
            {defTendencies.map(t => (
              <div key={t.label} style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                <span>{t.label}</span>
                <span style={{ color:'var(--text-primary)' }}>{t.pct}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── BUTTON ─────────────────────────────────────────────────────────────────

function SCButton({ children, variant = 'primary', size = 'md', onClick, disabled, fullWidth, icon }) {
  const variants = {
    primary:   { bg:'var(--blitz-red)',    border:'var(--blitz-red)',    color:'white' },
    secondary: { bg:'var(--bg-raised)',    border:'var(--bg-border)',    color:'var(--text-primary)' },
    blue:      { bg:'var(--storm-blue)',   border:'var(--storm-blue)',   color:'white' },
    gold:      { bg:'var(--gold)',         border:'var(--gold)',         color:'var(--text-inverse)' },
    danger:    { bg:'transparent',        border:'var(--blitz-red)',    color:'var(--blitz-red)' },
    ghost:     { bg:'transparent',        border:'var(--bg-border)',    color:'var(--text-secondary)' },
  };
  const sizes = {
    sm:  { padding:'5px 12px', fontSize:11 },
    md:  { padding:'8px 18px', fontSize:13 },
    lg:  { padding:'12px 28px', fontSize:15 },
    xl:  { padding:'14px 36px', fontSize:17 },
  };
  const v = variants[variant];
  const s = sizes[size];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: v.bg, border:`1.5px solid ${v.border}`, color: v.color,
      padding: s.padding, fontSize: s.fontSize,
      fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase',
      borderRadius:'var(--radius-sm)', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, width: fullWidth ? '100%' : 'auto',
      display:'flex', alignItems:'center', justifyContent:'center', gap:6,
      transition:'all 150ms', whiteSpace:'nowrap',
    }}>
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}

// ── REWARD CARD ────────────────────────────────────────────────────────────

function RewardCard({ reward, selected, onSelect }) {
  const typeColors = { ROGUE:'var(--rogue-purple)', 'GAME BOOST':'var(--gold)', PLAYMAKER:'var(--storm-blue)', 'ADD CARD':'var(--success-green)' };
  const color = typeColors[reward.type] || 'var(--text-secondary)';
  return (
    <div onClick={onSelect} style={{
      flex:1, minWidth:140, background:'var(--bg-surface)',
      border:`2px solid ${selected ? color : 'var(--bg-border)'}`,
      borderRadius:'var(--radius-lg)', padding:16, cursor:'pointer',
      boxShadow: selected ? `0 0 20px ${color}55` : 'none',
      transition:'all 200ms', display:'flex', flexDirection:'column', gap:10, userSelect:'none',
    }}>
      <div style={{ fontFamily:'var(--font-body)', fontSize:10, color, textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:600 }}>
        {reward.type}
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:22, color:'var(--text-primary)', lineHeight:1 }}>
        {reward.title}
      </div>
      <div style={{ flex:1, background:'var(--bg-raised)', borderRadius:'var(--radius-md)', minHeight:60, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <RewardVisual reward={reward} color={color} />
      </div>
      <div style={{ fontSize:11, color:'var(--text-secondary)', lineHeight:1.4 }}>
        {reward.description}
      </div>
    </div>
  );
}

function RewardVisual({ reward, color }) {
  if (reward.type === 'GAME BOOST') return (
    <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:40, color:'var(--gold)' }}>+{reward.value}</div>
  );
  if (reward.type === 'ROGUE') return (
    <svg width={48} height={48} viewBox="0 0 48 48">
      <circle cx={24} cy={24} r={20} stroke={color} strokeWidth={2} fill={`${color}22`}/>
      <circle cx={24} cy={24} r={8} fill={color} opacity={0.6}/>
      <line x1={8} y1={8} x2={40} y2={40} stroke={color} strokeWidth={1} opacity={0.4}/>
      <line x1={40} y1={8} x2={8} y2={40} stroke={color} strokeWidth={1} opacity={0.4}/>
    </svg>
  );
  if (reward.type === 'PLAYMAKER') return (
    <svg width={48} height={48} viewBox="0 0 48 48">
      <ellipse cx={24} cy={14} rx={8} ry={8} fill={color} opacity={0.8}/>
      <path d="M 12 44 L 14 24 L 24 20 L 34 24 L 36 44" fill={color} opacity={0.6}/>
    </svg>
  );
  return <svg width={48} height={48} viewBox="0 0 48 48"><text x={24} y={32} textAnchor="middle" fontSize={28} fill={color}>✦</text></svg>;
}

// ── LOCKER ROOM NAV ITEM ────────────────────────────────────────────────────

function LockerNavItem({ icon, label, description, active, onClick }) {
  return (
    <div onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
      background: active ? 'var(--bg-overlay)' : 'transparent',
      borderLeft: `3px solid ${active ? 'var(--blitz-red)' : 'transparent'}`,
      cursor:'pointer', transition:'all 150ms', borderRadius:'0 var(--radius-sm) var(--radius-sm) 0',
    }}>
      <div style={{ fontSize:20, width:24, textAlign:'center', flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color: active ? 'var(--text-primary)' : 'var(--text-secondary)', letterSpacing:'0.03em' }}>{label}</div>
        <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{description}</div>
      </div>
    </div>
  );
}

// ── MATCHUP MATRIX TABLE ───────────────────────────────────────────────────

function MatchupMatrix({ highlightRow }) {
  const offTypes = ['Run In','Run Out','Pass S','Pass M','Pass D','Option','Rogue'];
  const defTypes = ['Run D','Zone','Man','Blitz','Prevent'];
  const matrix = {
    'Run In':  [0, 4, 3, 1, 3],
    'Run Out': [-2, 4, 2, 1, 2],
    'Pass S':  [3, 1, -2, 3, 2],
    'Pass M':  [4, 0, 1, 2, 2],
    'Pass D':  [5, 0, 2, 4, 0],
    'Option':  [1, 2, 1, 1, 2],
    'Rogue':   [0, 0, 0, 0, 0],
  };
  return (
    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11, fontFamily:'var(--font-body)' }}>
      <thead>
        <tr>
          <th style={{ padding:'4px 8px', textAlign:'left', color:'var(--text-muted)', fontWeight:600 }}>OFF / DEF</th>
          {defTypes.map(d => <th key={d} style={{ padding:'4px 6px', color:'var(--storm-blue-bright)', fontWeight:600, fontSize:10 }}>{d}</th>)}
        </tr>
      </thead>
      <tbody>
        {offTypes.map(off => (
          <tr key={off} style={{ background: off === highlightRow ? 'var(--bg-overlay)' : 'transparent' }}>
            <td style={{ padding:'4px 8px', color: off === highlightRow ? 'var(--gold)' : 'var(--text-secondary)', fontWeight: off === highlightRow ? 700 : 400 }}>{off}</td>
            {matrix[off].map((val, i) => (
              <td key={i} style={{ padding:'4px 6px', textAlign:'center', color: val > 2 ? 'var(--success-green)' : val < 0 ? 'var(--blitz-red)' : 'var(--text-muted)', fontWeight: Math.abs(val) >= 3 ? 700 : 400 }}>
                {val > 0 ? `+${val}` : val}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── DP BADGE ───────────────────────────────────────────────────────────────

function DPBadge({ value, size = 'md' }) {
  const sizes = { sm:{px:6,py:3,fontSize:10}, md:{px:10,py:5,fontSize:13}, lg:{px:14,py:7,fontSize:16} };
  const s = sizes[size];
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'var(--gold-subtle)', border:'1px solid var(--gold-dim)', borderRadius:'var(--radius-pill)', padding:`${s.py}px ${s.px}px` }}>
      <span style={{ fontSize:s.fontSize-1, color:'var(--gold)' }}>⬡</span>
      <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:s.fontSize, color:'var(--gold)' }}>{value} DP</span>
    </div>
  );
}

// ── EXPORT ALL ─────────────────────────────────────────────────────────────
Object.assign(window, {
  PlayCard,
  PlaymakerCard,
  PlaymakerSilhouette,
  RouteDiagramOffense,
  RouteDiagramDefense,
  RouteDiagramRogue,
  StatBadge,
  TeamBadge,
  DownBanner,
  FieldStrip,
  RoleBadge,
  Scoreboard,
  MatchupDisplay,
  SCButton,
  RewardCard,
  RewardVisual,
  LockerNavItem,
  MatchupMatrix,
  DPBadge,
});
