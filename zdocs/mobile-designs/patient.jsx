// Patient screens — Home, History, Profile, Screening Detail

const PatientHome = ({ go }) => {
  return (
    <>
      <TopBar
        title={`Hi, ${MOCK.patient.name.split(' ')[0]}`}
        subtitle="Here’s what’s next for you."
      />
      <Scroller>
        {/* Primary action block */}
        <div style={{ padding: '6px 20px 14px' }}>
          <div style={{
            background: 'linear-gradient(180deg, #0A7A73 0%, #006B66 100%)',
            borderRadius: 22, padding: '22px 20px 20px', color: '#fff',
            boxShadow: '0 10px 30px rgba(0, 107, 102, 0.22)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap: 8, fontSize: 12, fontWeight: 600, letterSpacing: 0.4, textTransform:'uppercase', color: 'rgba(255,255,255,0.75)' }}>
              <Icon name="dot" size={10} color="#fff"/> Check-in
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8, letterSpacing: -0.4, lineHeight: 1.2 }}>
              Resume your intake
            </div>
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.82)', marginTop: 4, lineHeight: 1.4 }}>
              You’re halfway through — about 3 minutes left.
            </div>
            {/* progress */}
            <div style={{ marginTop: 16, height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
              <div style={{ width: '58%', height: '100%', background: '#fff', borderRadius: 999 }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop: 6, fontSize: 11.5, color: 'rgba(255,255,255,0.75)' }}>
              <span>58% complete</span><span>Step 7 of 12</span>
            </div>
            <button onClick={() => go('pat-screening-detail')} style={{
              marginTop: 16, width: '100%', height: 52, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: '#fff', color: L.primary, fontWeight: 700, fontSize: 16,
              display:'flex', alignItems:'center', justifyContent:'center', gap: 8, fontFamily: L.font,
            }}>Resume intake <Icon name="arrow-right" size={18} color={L.primary}/></button>
          </div>
        </div>

        {/* Secondary: reminder */}
        <Section title="Reminders">
          <div style={{ background: L.surface, borderRadius: 16, boxShadow: L.cardShadow, padding: 16 }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: L.secondary, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="bell" size={18} color={L.secondaryInk}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: L.ink, letterSpacing: -0.2 }}>Weekly check-in</div>
                <div style={{ fontSize: 13, color: L.ink3, marginTop: 3, lineHeight: 1.4 }}>Next on Sunday — we’ll send a 2 min pulse.</div>
              </div>
              <Button variant="secondary" size="sm">Manage</Button>
            </div>
          </div>
        </Section>

        {/* Tertiary: recent */}
        <Section title="Recent screening">
          <div style={{ background: L.surface, borderRadius: 16, boxShadow: L.cardShadow, overflow: 'hidden' }}>
            <ListRow first last onClick={() => go('pat-screening-detail')}>
              <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: L.primarySoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name="doc" size={18} color={L.primary}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: L.ink, letterSpacing: -0.2 }}>Mar 17, 2026</div>
                  <div style={{ fontSize: 12.5, color: L.ink4, marginTop: 2 }}>Dr. Jach · summary ready</div>
                </div>
                <StatusPill kind="completed" size="sm"/>
                <Icon name="chevron-right" size={16} color={L.ink5}/>
              </div>
            </ListRow>
          </div>
        </Section>
      </Scroller>
    </>
  );
};

const PatientHistory = ({ go }) => (
  <>
    <TopBar title="History" subtitle="Your past screenings and visits."/>
    <Scroller>
      <div style={{ padding: '4px 20px' }}>
        <div style={{ background: L.surface, borderRadius: 16, boxShadow: L.cardShadow, overflow: 'hidden' }}>
          {MOCK.patientHistory.map((h, i, a) => (
            <ListRow key={h.id} first={i===0} last={i===a.length-1} onClick={() => go('pat-screening-detail')}>
              <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
                <div style={{ width: 44, textAlign: 'center' }}>
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
    </Scroller>
  </>
);

const PatientProfile = ({ onSignOut }) => (
  <>
    <TopBar title="Profile"/>
    <Scroller>
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{
          background: L.surface, borderRadius: 16, boxShadow: L.cardShadow,
          padding: '18px', display:'flex', alignItems:'center', gap: 14,
        }}>
          <Avatar name={MOCK.patient.name} size={52}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: L.ink, letterSpacing: -0.2 }}>{MOCK.patient.name}</div>
            <div style={{ fontSize: 13, color: L.ink3, marginTop: 2 }}>DOB {MOCK.patient.dob}</div>
          </div>
        </div>
      </div>

      <Section title="Consent">
        <div style={{ background: L.surface, borderRadius: 16, boxShadow: L.cardShadow, overflow: 'hidden' }}>
          <SettingRow icon="shield" title="Telehealth consent" detail="Granted"/>
          <SettingRow icon="mic" title="Scribe recording" detail="Granted" last/>
        </div>
      </Section>

      <Section title="Reminders">
        <div style={{ background: L.surface, borderRadius: 16, boxShadow: L.cardShadow, overflow: 'hidden' }}>
          <SettingRow icon="bell" title="Weekly check-in" detail="Sundays"/>
          <SettingRow icon="clock" title="Follow-through" detail="2 active" last/>
        </div>
      </Section>

      <Section title="Medical history">
        <div style={{ background: L.surface, borderRadius: 16, boxShadow: L.cardShadow, overflow: 'hidden' }}>
          <SettingRow icon="heart-pulse" title="Review & update"/>
          <SettingRow icon="sliders" title="Reset history" destructive last/>
        </div>
      </Section>

      <div style={{ padding: '8px 20px 4px' }}>
        <Button variant="destructive" full size="md" icon="logout" onClick={onSignOut}>Sign out</Button>
      </div>
      <div style={{ padding: '10px 20px 24px', textAlign: 'center', fontSize: 11.5, color: L.ink5 }}>
        Lumina · Patient v2.4.0
      </div>
    </Scroller>
  </>
);

const SettingRow = ({ icon, title, detail, last, destructive }) => (
  <ListRow last={last}>
    <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: destructive ? L.errorBg : L.surfaceSoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon name={icon} size={16} color={destructive ? L.errorFg : L.ink2}/>
      </div>
      <div style={{ flex:1, fontSize: 15, color: destructive ? L.errorFg : L.ink, fontWeight: 500 }}>{title}</div>
      {detail && <div style={{ fontSize: 13, color: L.ink4 }}>{detail}</div>}
      <Icon name="chevron-right" size={16} color={L.ink5}/>
    </div>
  </ListRow>
);

// Patient screening detail
const PatientScreeningDetail = ({ go }) => {
  return (
    <>
      <TopBar onBack={() => go('pat-history')} title={null}/>
      <div style={{ padding: '0 20px 10px' }}>
        <div style={{ fontSize: 11.5, color: L.ink4, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>March 17, 2026</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: L.ink, letterSpacing: -0.6, marginTop: 4 }}>Your visit summary</div>
        <div style={{ display:'flex', gap: 6, marginTop: 10 }}>
          <StatusPill kind="completed"/>
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, height:26, padding:'0 10px', borderRadius:999, background: L.surfaceSoft, color: L.ink2, fontSize: 12.5, fontWeight: 600 }}>
            Dr. Jach
          </span>
        </div>
      </div>
      <Scroller pb={130}>
        <div style={{ padding: '6px 20px' }}>
          <Card title="Summary">
            <div style={{ color: L.ink2, fontSize: 14.5, lineHeight: 1.55 }}>
              You reported intermittent chest tightness over the past three weeks, usually with exertion. We’ll start with a baseline ECG and a lipid panel, and revisit if the pattern continues.
            </div>
          </Card>
          <Card title="Symptoms reported">
            <ul style={{ margin: 0, paddingLeft: 18, color: L.ink2, fontSize: 14.5, lineHeight: 1.5 }}>
              <li>Chest tightness with exertion</li>
              <li>Resolves with rest within 5 minutes</li>
              <li>No syncope or palpitations</li>
            </ul>
          </Card>
          <Card title="Assessment">
            <div style={{ color: L.ink2, fontSize: 14.5, lineHeight: 1.55 }}>
              Likely stable exertional angina given pattern and family history. Low-to-intermediate risk at this time.
            </div>
          </Card>
          <Card title="Follow-through">
            <InfoRow label="ECG" value="Ordered"/>
            <InfoRow label="Lipid panel" value="Ordered"/>
            <InfoRow label="Next visit" value="In 2 weeks" last/>
          </Card>
        </div>
      </Scroller>
      <div style={{ position:'absolute', bottom: 0, left: 0, right: 0, padding: '14px 20px 30px', background: 'linear-gradient(180deg, rgba(246,245,248,0) 0%, rgba(246,245,248,1) 30%)', zIndex: 20 }}>
        <Button variant="primary" size="lg" full icon="bell">Set a follow-up reminder</Button>
      </div>
    </>
  );
};

// ─── Auth (clinician sign in) ───────────────────────────────
const AuthScreen = ({ onSignIn, role, onSwitchRole }) => {
  const [email, setEmail] = React.useState(role === 'clin' ? 'bartek.jach@shiftposts.com' : 'alex.morgan@example.com');
  const [pw, setPw] = React.useState('••••••••••');
  return (
    <>
      <div style={{ padding: '16px 20px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: L.primary, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="sparkle" size={16} color="#fff"/>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: L.ink, letterSpacing: -0.3 }}>Lumina</div>
        </div>
        <button onClick={onSwitchRole} style={{ border:'none', background: L.surfaceSoft, color: L.ink2, height: 32, padding: '0 12px', borderRadius: 999, fontWeight: 600, fontSize: 12.5, cursor: 'pointer', fontFamily: L.font }}>
          Switch to {role === 'clin' ? 'patient' : 'clinician'}
        </button>
      </div>

      <div style={{ flex: 1, padding: '36px 20px 20px', display:'flex', flexDirection:'column' }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: L.ink, letterSpacing: -0.8, lineHeight: 1.1 }}>
          {role === 'clin' ? 'Welcome back' : 'Sign in to Lumina'}
        </div>
        <div style={{ fontSize: 14.5, color: L.ink3, marginTop: 6 }}>
          {role === 'clin' ? 'Use your clinician credentials to sign in.' : 'Securely access your screenings and visits.'}
        </div>

        <div style={{ marginTop: 28, display:'flex', flexDirection:'column', gap: 10 }}>
          <Button variant="secondary" full size="lg">Continue with Google</Button>
          <Button variant="tonal" full size="lg">Continue with Microsoft</Button>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap: 10, margin: '22px 0 14px' }}>
          <div style={{ flex:1, height: 1, background: L.hair }}/>
          <div style={{ fontSize: 12, color: L.ink4, fontWeight: 500 }}>or continue with email</div>
          <div style={{ flex:1, height: 1, background: L.hair }}/>
        </div>

        <Field label="Email" value={email} onChange={setEmail}/>
        <Field label="Password" value={pw} onChange={setPw} type="password"/>
        <div style={{ textAlign: 'right', marginTop: 2 }}>
          <button style={{ border:'none', background:'transparent', color: L.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: L.font }}>Forgot password?</button>
        </div>
        <div style={{ marginTop: 16 }}>
          <Button variant="primary" full size="lg" onClick={onSignIn}>Sign in</Button>
        </div>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: L.ink4 }}>
          Need an account? <span style={{ color: L.primary, fontWeight: 600 }}>Create account</span>
        </div>
      </div>
    </>
  );
};

const Field = ({ label, value, onChange, type }) => (
  <div style={{ marginTop: 12 }}>
    <div style={{ fontSize: 12.5, color: L.ink3, fontWeight: 600, marginBottom: 6, letterSpacing: -0.1 }}>{label}</div>
    <div style={{ height: 52, borderRadius: 14, background: L.surface, boxShadow: `inset 0 0 0 1px ${L.hair}`, display:'flex', alignItems:'center', padding: '0 14px' }}>
      <input type={type || 'text'} value={value} onChange={e => onChange(e.target.value)}
        style={{ flex:1, border:'none', outline:'none', background:'transparent', fontFamily: L.font, fontSize: 15, color: L.ink, letterSpacing: -0.1 }}/>
    </div>
  </div>
);

Object.assign(window, {
  PatientHome, PatientHistory, PatientProfile, PatientScreeningDetail, AuthScreen, Field, SettingRow,
});
