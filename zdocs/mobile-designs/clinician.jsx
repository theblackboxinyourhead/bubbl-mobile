// Clinician screens — Today, Screenings, Patients, Account
// and detail screens: Screening Detail, Patient Profile.

// ─── Today ───────────────────────────────────────────────────
const ClinicianToday = ({ go }) => {
  const t = MOCK.today;
  return (
    <>
      <TopBar
        title="Today"
        subtitle={`${MOCK.clinician.clinic} · ${new Date().toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })}`}
        right={[
          <button key="b" style={{ width: 36, height: 36, borderRadius: 999, border: 'none', background: L.surface, boxShadow: `inset 0 0 0 1px ${L.hair}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}>
            <Icon name="bell" size={18} color={L.ink2}/>
            <span style={{ position:'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 999, background: L.errorDot, boxShadow: `0 0 0 2px ${L.surface}` }}/>
          </button>
        ]}
      />
      <Scroller>
        {/* Metric strip */}
        <div style={{ padding: '6px 20px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {t.metrics.map(m => (
            <div key={m.label} style={{
              padding: '12px 12px 14px', background: L.surface, borderRadius: 14,
              boxShadow: L.cardShadow,
            }}>
              <div style={{ fontSize: 11, color: L.ink4, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>{m.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: L.ink, letterSpacing: -0.8, lineHeight: 1 }}>{m.value}</div>
                <div style={{
                  width: 6, height: 6, borderRadius: 999, marginBottom: 3,
                  background: m.tone === 'error' ? L.errorDot : m.tone === 'success' ? L.successDot : L.infoDot,
                }}/>
              </div>
            </div>
          ))}
        </div>

        {/* Needs attention */}
        <Section title="Needs attention" action={<button style={{ border:'none', background:'transparent', fontSize:13, fontWeight:600, color:L.primary, cursor:'pointer' }}>See all</button>}>
          <div style={{ background: L.surface, borderRadius: 16, boxShadow: L.cardShadow, overflow: 'hidden' }}>
            {t.needsAttention.map((n, i) => (
              <ListRow key={n.id} first={i===0} last={i===t.needsAttention.length-1} onClick={() => go('clin-screening-detail', { id: n.id })}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={n.name} size={38}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: 3 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: L.ink, letterSpacing: -0.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.name}</div>
                      <StatusPill kind={n.status} size="sm"/>
                    </div>
                    <div style={{ fontSize: 13, color: L.ink3, lineHeight: 1.35, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.ctx}</div>
                  </div>
                  <div style={{ fontSize: 12, color: L.ink4, fontWeight: 500 }}>{n.time}</div>
                  <Icon name="chevron-right" size={16} color={L.ink5}/>
                </div>
              </ListRow>
            ))}
          </div>
        </Section>

        {/* Visit readiness */}
        <Section title="Visit readiness">
          <div style={{ background: L.surface, borderRadius: 16, boxShadow: L.cardShadow, overflow: 'hidden' }}>
            {t.readiness.map((v, i) => (
              <ListRow key={v.id} first={i===0} last={i===t.readiness.length-1} onClick={() => go('clin-screening-detail', { id: v.id })}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: L.primarySoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name="calendar" size={18} color={L.primary}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: L.ink, letterSpacing: -0.2 }}>{v.name}</div>
                    <div style={{ fontSize: 13, color: L.ink3, marginTop: 2 }}>{v.when} · {v.kind}</div>
                  </div>
                  {v.ready
                    ? <StatusPill kind="ready" size="sm"/>
                    : <StatusPill kind="pending" label="Prep" size="sm"/>}
                </div>
              </ListRow>
            ))}
          </div>
        </Section>

        {/* Recent activity (compressed) */}
        <Section title="Recent activity">
          <div style={{ background: L.surface, borderRadius: 16, boxShadow: L.cardShadow, overflow: 'hidden' }}>
            {t.activity.map((a, i) => (
              <ListRow key={a.id} first={i===0} last={i===t.activity.length-1}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 999, background: L.surfaceSoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name="dot" size={10} color={L.ink4}/>
                  </div>
                  <div style={{ flex:1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: L.ink2, fontWeight: 500 }}>{a.name} · <span style={{ color: L.ink3, fontWeight: 400 }}>{a.who}</span></div>
                  </div>
                  <div style={{ fontSize: 12, color: L.ink4 }}>{a.when}</div>
                </div>
              </ListRow>
            ))}
          </div>
        </Section>
      </Scroller>
    </>
  );
};

// ─── Screenings ──────────────────────────────────────────────
const ClinicianScreenings = ({ go }) => {
  const [filter, setFilter] = React.useState('All');
  const [q, setQ] = React.useState('');
  const list = MOCK.screenings.filter(s => {
    if (filter === 'Sent' && s.status !== 'sent') return false;
    if (filter === 'In Review' && s.status !== 'inreview') return false;
    if (filter === 'Completed' && s.status !== 'completed') return false;
    if (filter === 'Needs scribe' && s.scribe !== 'Needed' && s.scribe !== 'Failed') return false;
    if (q && !s.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const counts = {
    All: MOCK.screenings.length,
    Sent: MOCK.screenings.filter(s=>s.status==='sent').length,
    'In Review': MOCK.screenings.filter(s=>s.status==='inreview').length,
    Completed: MOCK.screenings.filter(s=>s.status==='completed').length,
  };
  return (
    <>
      <TopBar title="Screenings"/>
      <SearchField value={q} onChange={setQ} placeholder="Search by patient or type"/>
      <div style={{ padding: '4px 20px 10px', display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {['All','Sent','In Review','Completed','Needs scribe'].map(f => (
          <Chip key={f} active={filter===f} onClick={() => setFilter(f)} count={counts[f]}>{f}</Chip>
        ))}
      </div>
      <Scroller>
        <div style={{ padding: '0 20px' }}>
          <div style={{ background: L.surface, borderRadius: 16, boxShadow: L.cardShadow, overflow: 'hidden' }}>
            {list.map((s, i) => (
              <ListRow key={s.id} first={i===0} last={i===list.length-1} onClick={() => go('clin-screening-detail', { id: s.id })}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <Avatar name={s.name} size={38}/>
                  <div style={{ flex:1, minWidth: 0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: 3 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: L.ink, letterSpacing: -0.2 }}>{s.name}</div>
                      <StatusPill kind={s.status} size="sm"/>
                    </div>
                    <div style={{ fontSize: 12.5, color: L.ink4 }}>
                      {s.type} · {s.when}{s.scribe !== '—' ? ` · Scribe: ${s.scribe}` : ''}
                    </div>
                  </div>
                  <Icon name="chevron-right" size={16} color={L.ink5}/>
                </div>
              </ListRow>
            ))}
          </div>
        </div>
      </Scroller>
    </>
  );
};

// ─── Patients ────────────────────────────────────────────────
const ClinicianPatients = ({ go }) => {
  const [q, setQ] = React.useState('');
  const [sort, setSort] = React.useState('Recent');
  const list = MOCK.patients
    .filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.phone.includes(q))
    .sort((a, b) => sort === 'A–Z' ? a.name.localeCompare(b.name) : 0);
  return (
    <>
      <TopBar title="Patients" right={[
        <button key="add" style={{ width: 36, height: 36, borderRadius: 999, border:'none', background: L.primary, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <Icon name="plus" size={18}/>
        </button>
      ]}/>
      <SearchField value={q} onChange={setQ} placeholder="Search patients"/>
      <div style={{ padding: '4px 20px 10px', display:'flex', gap:8 }}>
        <Chip active={sort==='Recent'} onClick={()=>setSort('Recent')}>Recent</Chip>
        <Chip active={sort==='A–Z'} onClick={()=>setSort('A–Z')}>A–Z</Chip>
        <Chip>Active screenings</Chip>
      </div>
      <Scroller>
        <div style={{ padding: '0 20px' }}>
          <div style={{ background: L.surface, borderRadius: 16, boxShadow: L.cardShadow, overflow: 'hidden' }}>
            {list.map((p, i) => (
              <ListRow key={p.id} first={i===0} last={i===list.length-1} onClick={() => go('clin-patient-profile', { id: p.id })}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <Avatar name={p.name} size={40}/>
                  <div style={{ flex:1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: L.ink, letterSpacing: -0.2 }}>{p.name}</div>
                    <div style={{ fontSize: 12.5, color: L.ink4, marginTop: 2 }}>{p.phone}</div>
                  </div>
                  <div style={{ textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap: 4 }}>
                    <StatusPill kind={p.state} size="sm"/>
                    <div style={{ fontSize: 11, color: L.ink5 }}>{p.last.split(' · ')[1]}</div>
                  </div>
                </div>
              </ListRow>
            ))}
          </div>
        </div>
      </Scroller>
    </>
  );
};

// ─── Account ─────────────────────────────────────────────────
const ClinicianAccount = ({ go, onSignOut }) => {
  return (
    <>
      <TopBar title="Account"/>
      <Scroller>
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{
            background: L.surface, borderRadius: 16, boxShadow: L.cardShadow,
            padding: '18px 18px', display:'flex', alignItems:'center', gap: 14,
          }}>
            <Avatar name={MOCK.clinician.name} size={52}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: L.ink, letterSpacing: -0.2 }}>{MOCK.clinician.name}</div>
              <div style={{ fontSize: 13, color: L.ink3, marginTop: 2 }}>{MOCK.clinician.email}</div>
              <div style={{ fontSize: 12, color: L.ink4, marginTop: 4 }}>{MOCK.clinician.clinic}</div>
            </div>
          </div>
        </div>

        <Section title="Preferences">
          <div style={{ background: L.surface, borderRadius: 16, boxShadow: L.cardShadow, overflow: 'hidden' }}>
            {[
              { icon:'bell', title:'Notifications', detail:'On'},
              { icon:'shield', title:'Privacy & consent' },
              { icon:'sliders', title:'Display & accessibility' },
            ].map((r, i, a) => (
              <ListRow key={r.title} first={i===0} last={i===a.length-1}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: L.surfaceSoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name={r.icon} size={16} color={L.ink2}/>
                  </div>
                  <div style={{ flex:1, fontSize: 15, color: L.ink, fontWeight: 500 }}>{r.title}</div>
                  {r.detail && <div style={{ fontSize: 13, color: L.ink4 }}>{r.detail}</div>}
                  <Icon name="chevron-right" size={16} color={L.ink5}/>
                </div>
              </ListRow>
            ))}
          </div>
        </Section>

        <Section title="Clinic">
          <div style={{ background: L.surface, borderRadius: 16, boxShadow: L.cardShadow, overflow: 'hidden' }}>
            {[
              { icon:'heart-pulse', title: MOCK.clinician.clinic, detail:'Eastside · active' },
              { icon:'doc', title:'Legal & compliance' },
            ].map((r, i, a) => (
              <ListRow key={r.title} first={i===0} last={i===a.length-1}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: L.surfaceSoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name={r.icon} size={16} color={L.ink2}/>
                  </div>
                  <div style={{ flex:1, fontSize: 15, color: L.ink, fontWeight: 500 }}>{r.title}</div>
                  {r.detail && <div style={{ fontSize: 13, color: L.ink4 }}>{r.detail}</div>}
                  <Icon name="chevron-right" size={16} color={L.ink5}/>
                </div>
              </ListRow>
            ))}
          </div>
        </Section>

        <div style={{ padding: '8px 20px 4px' }}>
          <Button variant="destructive" full size="md" icon="logout" onClick={onSignOut}>Sign out</Button>
        </div>
        <div style={{ padding: '10px 20px 24px', textAlign: 'center', fontSize: 11.5, color: L.ink5 }}>
          Lumina · Clinician v2.4.0
        </div>
      </Scroller>
    </>
  );
};

// ─── Screening Detail ────────────────────────────────────────
const ClinicianScreeningDetail = ({ go }) => {
  const [tab, setTab] = React.useState('Summary');
  const d = MOCK.screeningDetail;
  return (
    <>
      <TopBar onBack={() => go('clin-screenings')} title={null} right={[
        <button key="m" style={{ width: 36, height: 36, borderRadius: 999, border: 'none', background: L.surface, boxShadow: `inset 0 0 0 1px ${L.hair}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <Icon name="more" size={18} color={L.ink2}/>
        </button>
      ]}/>
      {/* Sticky patient header */}
      <div style={{ padding: '0 20px 10px' }}>
        <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
          <Avatar name={d.patient} size={48}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: L.ink, letterSpacing: -0.5 }}>{d.patient}</div>
            <div style={{ fontSize: 13, color: L.ink3, marginTop: 2 }}>{d.age} · {d.pronouns} · {d.type}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          <StatusPill kind={d.status}/>
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, height:26, padding:'0 10px', borderRadius:999, background: L.surfaceSoft, color: L.ink2, fontSize: 12.5, fontWeight: 600 }}>
            <Icon name="calendar" size={12} color={L.ink3}/> {d.visit}
          </span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, height:26, padding:'0 10px', borderRadius:999, background: L.surfaceSoft, color: L.ink2, fontSize: 12.5, fontWeight: 600 }}>
            {d.urgency}
          </span>
        </div>
      </div>
      <SegmentedTabs tabs={['Summary','Scribe','Notes']} active={tab} onChange={setTab}/>
      <Scroller pb={130}>
        {tab === 'Summary' && <ClinSummaryTab d={d}/>}
        {tab === 'Scribe' && <ClinScribeTab d={d}/>}
        {tab === 'Notes' && <ClinNotesTab/>}
      </Scroller>
      {/* Bottom primary action, ABOVE bottom nav (no bottom nav on detail — back button owns nav) */}
      <div style={{ position:'absolute', bottom: 0, left: 0, right: 0, padding: '14px 20px 30px', background: 'linear-gradient(180deg, rgba(246,245,248,0) 0%, rgba(246,245,248,1) 30%)', zIndex: 20 }}>
        <Button variant="primary" size="lg" full onClick={() => setTab('Scribe')} icon="mic">Start scribe</Button>
      </div>
    </>
  );
};

const ClinSummaryTab = ({ d }) => (
  <div style={{ padding: '10px 20px' }}>
    {/* Hero insights strip */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
      {d.summary.insights.map(it => (
        <div key={it.label} style={{ padding: '10px 12px', background: L.surface, borderRadius: 12, boxShadow: L.cardShadow }}>
          <div style={{ fontSize: 10.5, color: L.ink4, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>{it.label}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: L.ink, marginTop: 4, letterSpacing: -0.2 }}>{it.value}</div>
        </div>
      ))}
    </div>

    <Card title="Symptom summary">
      <ul style={{ margin: 0, paddingLeft: 18, color: L.ink2, fontSize: 14.5, lineHeight: 1.5 }}>
        {d.summary.symptoms.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
      </ul>
    </Card>
    <Card title="Preliminary assessment">
      <div style={{ color: L.ink2, fontSize: 14.5, lineHeight: 1.55 }}>{d.summary.assessment}</div>
    </Card>
    <Card title="Visit plan">
      <ol style={{ margin: 0, paddingLeft: 18, color: L.ink2, fontSize: 14.5, lineHeight: 1.5 }}>
        {d.summary.visitSummary.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
      </ol>
    </Card>
  </div>
);

const Card = ({ title, children, right }) => (
  <div style={{ background: L.surface, borderRadius: 16, padding: 16, boxShadow: L.cardShadow, marginBottom: 10 }}>
    {title && (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: L.ink, letterSpacing: -0.2 }}>{title}</div>
        {right}
      </div>
    )}
    {children}
  </div>
);

const ClinScribeTab = ({ d }) => {
  const [state, setState] = React.useState('idle'); // idle | recording | paused
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    if (state !== 'recording') return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [state]);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div style={{ padding: '10px 20px' }}>
      <div style={{
        background: state === 'recording' ? '#0E121A' : L.surface,
        color: state === 'recording' ? '#fff' : L.ink,
        borderRadius: 20, padding: '22px 20px 20px',
        boxShadow: state === 'recording' ? '0 8px 30px rgba(14,18,26,0.25)' : L.cardShadow,
        transition: 'background .25s ease',
        marginBottom: 12,
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
            {state === 'recording'
              ? <span style={{ width: 10, height: 10, borderRadius: 999, background: '#F04438', boxShadow: '0 0 0 0 rgba(240,68,56,0.6)', animation: 'lum-pulse 1.4s infinite' }}/>
              : state === 'paused'
                ? <Icon name="pause" size={16} color={L.ink3}/>
                : <Icon name="mic" size={16} color={L.ink3}/>}
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase',
              color: state === 'recording' ? 'rgba(255,255,255,0.7)' : L.ink3 }}>
              {state === 'recording' ? 'Recording' : state === 'paused' ? 'Paused' : 'Ready to record'}
            </div>
          </div>
          <div style={{ fontSize: 12, color: state === 'recording' ? 'rgba(255,255,255,0.5)' : L.ink4 }}>Encounter scribe</div>
        </div>

        <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -2, marginTop: 10, fontVariantNumeric: 'tabular-nums' }}>
          {mm}:{ss}
        </div>

        {/* waveform */}
        <div style={{ display:'flex', alignItems:'center', gap: 3, height: 36, marginTop: 8 }}>
          {Array.from({length: 40}).map((_, i) => {
            const h = state === 'recording'
              ? 6 + Math.abs(Math.sin((elapsed + i) * 0.6)) * 26 + (i % 5) * 2
              : 4 + (i % 7) * 2;
            return (
              <div key={i} style={{
                flex: 1, height: `${h}px`, borderRadius: 2,
                background: state === 'recording' ? 'rgba(255,255,255,0.85)' : L.hair,
                transition: 'height .15s ease',
              }}/>
            );
          })}
        </div>

        <div style={{ display:'flex', gap: 10, marginTop: 16 }}>
          {state === 'idle' && (
            <button onClick={() => setState('recording')} style={{
              flex: 1, height: 56, borderRadius: 999, border:'none', cursor:'pointer',
              background: L.primary, color:'#fff', fontWeight: 700, fontSize: 16,
              display:'flex', alignItems:'center', justifyContent:'center', gap: 8, fontFamily: L.font,
            }}>
              <Icon name="mic" size={18}/> Start recording
            </button>
          )}
          {state === 'recording' && (
            <>
              <button onClick={() => setState('paused')} style={{
                flex: 1, height: 56, borderRadius: 999, border:'none', cursor:'pointer',
                background: 'rgba(255,255,255,0.12)', color:'#fff', fontWeight: 600, fontSize: 15,
                display:'flex', alignItems:'center', justifyContent:'center', gap: 8, fontFamily: L.font,
              }}><Icon name="pause" size={16}/> Pause</button>
              <button onClick={() => { setState('idle'); setElapsed(0); }} style={{
                flex: 1, height: 56, borderRadius: 999, border:'none', cursor:'pointer',
                background: '#F04438', color:'#fff', fontWeight: 700, fontSize: 15,
                display:'flex', alignItems:'center', justifyContent:'center', gap: 8, fontFamily: L.font,
              }}><Icon name="stop" size={16}/> Stop</button>
            </>
          )}
          {state === 'paused' && (
            <>
              <button onClick={() => setState('recording')} style={{
                flex: 1, height: 56, borderRadius: 999, border:'none', cursor:'pointer',
                background: L.primary, color:'#fff', fontWeight: 700, fontSize: 15,
                display:'flex', alignItems:'center', justifyContent:'center', gap: 8, fontFamily: L.font,
              }}><Icon name="play" size={16}/> Resume</button>
              <button onClick={() => { setState('idle'); setElapsed(0); }} style={{
                flex: 1, height: 56, borderRadius: 999, border:'none', cursor:'pointer',
                background: '#F04438', color:'#fff', fontWeight: 700, fontSize: 15,
                display:'flex', alignItems:'center', justifyContent:'center', gap: 8, fontFamily: L.font,
              }}><Icon name="stop" size={16}/> Stop</button>
            </>
          )}
        </div>
      </div>

      {/* Live transcript */}
      <Card title="Live transcript" right={<span style={{ fontSize: 11.5, color: L.ink4, fontWeight: 600 }}>{state==='recording' ? 'UPDATING' : 'READY'}</span>}>
        {d.transcript.map((l, i) => (
          <div key={i} style={{ display:'flex', gap: 10, padding: '8px 0', borderTop: i>0 ? `1px solid ${L.divider}` : 'none' }}>
            <div style={{ fontSize: 11.5, color: L.ink5, fontVariantNumeric: 'tabular-nums', fontWeight: 600, minWidth: 40 }}>{l.t}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, color: l.who==='Clinician' ? L.primary : L.ink3, fontWeight: 700, letterSpacing: 0.3, textTransform:'uppercase', marginBottom: 2 }}>{l.who}</div>
              <div style={{ fontSize: 14, color: L.ink2, lineHeight: 1.4 }}>{l.text}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
};

const ClinNotesTab = () => {
  const [note, setNote] = React.useState('');
  return (
    <div style={{ padding: '10px 20px' }}>
      <Card title="Clinician note">
        <textarea value={note} onChange={e => setNote(e.target.value)}
          placeholder="Add an addendum, clarification, or finalization note…"
          style={{
            width: '100%', minHeight: 140, border: 'none', outline: 'none', resize: 'none',
            fontFamily: L.font, fontSize: 14.5, color: L.ink2, lineHeight: 1.5, background: 'transparent',
          }}/>
        <div style={{ display:'flex', justifyContent:'flex-end', gap: 8, marginTop: 8 }}>
          <Button variant="secondary" size="sm">Save draft</Button>
          <Button variant="primary" size="sm" icon="check">Finalize</Button>
        </div>
      </Card>
      <Card title="Addenda">
        <div style={{ color: L.ink4, fontSize: 13 }}>No addenda yet.</div>
      </Card>
    </div>
  );
};

// ─── Patient Profile (clinician view) ────────────────────────
const ClinicianPatientProfile = ({ go }) => {
  const [tab, setTab] = React.useState('Overview');
  const p = MOCK.patients[0]; // Alex Morgan
  return (
    <>
      <TopBar onBack={() => go('clin-patients')} title={null} right={[
        <button key="m" style={{ width: 36, height: 36, borderRadius: 999, border: 'none', background: L.surface, boxShadow: `inset 0 0 0 1px ${L.hair}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <Icon name="send" size={16} color={L.ink2}/>
        </button>
      ]}/>
      <div style={{ padding: '0 20px 8px' }}>
        <div style={{ display:'flex', alignItems:'center', gap: 14 }}>
          <Avatar name={p.name} size={56}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: L.ink, letterSpacing: -0.5 }}>{p.name}</div>
            <div style={{ fontSize: 13, color: L.ink3, marginTop: 2 }}>34 · she/her · MRN 10482</div>
          </div>
        </div>
        <div style={{ display:'flex', gap: 8, marginTop: 12 }}>
          <Button variant="primary" size="sm" icon="send" style={{ flex: 1 }}>Send screening</Button>
          <Button variant="secondary" size="sm" icon="phone" style={{ flex: 1 }}>Call</Button>
          <Button variant="secondary" size="sm" icon="mail" style={{ flex: 1 }}>Message</Button>
        </div>
      </div>
      <SegmentedTabs tabs={['Overview','History','Visits']} active={tab} onChange={setTab}/>
      <Scroller>
        {tab === 'Overview' && (
          <div style={{ padding: '10px 20px' }}>
            <Card title="Contact">
              <InfoRow label="Phone" value={p.phone}/>
              <InfoRow label="Email" value="alex.morgan@example.com"/>
              <InfoRow label="Address" value="12 Lake St, Portland OR" last/>
            </Card>
            <Card title="Medical history">
              <InfoRow label="Status" value="Complete"/>
              <InfoRow label="Allergies" value="NKDA"/>
              <InfoRow label="Conditions" value="Borderline HTN"/>
              <InfoRow label="Medications" value="Lisinopril 10 mg qd" last/>
            </Card>
            <Card title="Consent">
              <InfoRow label="Telehealth" value="On file"/>
              <InfoRow label="Scribe recording" value="Granted" last/>
            </Card>
          </div>
        )}
        {tab === 'History' && (
          <div style={{ padding: '10px 20px' }}>
            <div style={{ background: L.surface, borderRadius: 16, boxShadow: L.cardShadow, overflow: 'hidden' }}>
              {MOCK.patientHistory.map((h, i, a) => (
                <ListRow key={h.id} first={i===0} last={i===a.length-1} onClick={() => go('clin-screening-detail', { id: h.id })}>
                  <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
                    <div style={{ width: 40, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: L.ink4, fontWeight: 600 }}>{h.year}</div>
                      <div style={{ fontSize: 14, color: L.ink, fontWeight: 700 }}>{h.date}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: L.ink }}>{h.summary}</div>
                      <div style={{ fontSize: 12.5, color: L.ink4, marginTop: 2 }}>{h.clinician}</div>
                    </div>
                    <StatusPill kind={h.status} size="sm"/>
                  </div>
                </ListRow>
              ))}
            </div>
          </div>
        )}
        {tab === 'Visits' && (
          <div style={{ padding: '10px 20px' }}>
            <Card title="Scribe artifacts">
              <InfoRow label="Mar 17, 2026" value="2:30 PM · 18 min"/>
              <InfoRow label="Jan 08, 2026" value="10:15 AM · 12 min" last/>
            </Card>
          </div>
        )}
      </Scroller>
    </>
  );
};

const InfoRow = ({ label, value, last }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0', borderBottom: last ? 'none' : `1px solid ${L.divider}`, gap: 12,
  }}>
    <div style={{ fontSize: 13, color: L.ink4, fontWeight: 500 }}>{label}</div>
    <div style={{ fontSize: 14, color: L.ink2, fontWeight: 500, textAlign: 'right' }}>{value}</div>
  </div>
);

Object.assign(window, {
  ClinicianToday, ClinicianScreenings, ClinicianPatients, ClinicianAccount,
  ClinicianScreeningDetail, ClinicianPatientProfile, Card, InfoRow,
});
