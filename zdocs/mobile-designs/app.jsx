// App orchestrator — routing between roles and screens, bottom nav, device frame.

const CLIN_TABS = [
  { key: 'clin-today',      label: 'Today',      icon: 'home' },
  { key: 'clin-screenings', label: 'Screenings', icon: 'list', badge: 3 },
  { key: 'clin-patients',   label: 'Patients',   icon: 'users' },
  { key: 'clin-account',    label: 'Account',    icon: 'user' },
];

const PAT_TABS = [
  { key: 'pat-home',    label: 'Home',    icon: 'home' },
  { key: 'pat-history', label: 'History', icon: 'clock' },
  { key: 'pat-profile', label: 'Profile', icon: 'user' },
];

// Maps screen → which main tab key it belongs to (for bottom nav highlighting)
const TAB_OF = {
  'clin-today': 'clin-today', 'clin-screenings': 'clin-screenings',
  'clin-patients': 'clin-patients', 'clin-account': 'clin-account',
  'clin-screening-detail': 'clin-screenings', 'clin-patient-profile': 'clin-patients',
  'pat-home': 'pat-home', 'pat-history': 'pat-history',
  'pat-profile': 'pat-profile', 'pat-screening-detail': 'pat-history',
};

// Screens that hide the bottom nav (deep detail)
const DEEP = new Set(['clin-screening-detail', 'clin-patient-profile', 'pat-screening-detail']);

function LuminaApp({ role, initialScreen }) {
  const [screen, setScreen] = React.useState(initialScreen || (role === 'clin' ? 'clin-today' : 'pat-home'));
  const [signedIn, setSignedIn] = React.useState(true);
  const [currentRole, setCurrentRole] = React.useState(role);
  const mounted = React.useRef(false);

  React.useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    setScreen(currentRole === 'clin' ? 'clin-today' : 'pat-home');
  }, [currentRole]);

  const go = (s) => setScreen(s);

  if (!signedIn) {
    return <AuthScreen role={currentRole} onSignIn={() => setSignedIn(true)}
      onSwitchRole={() => setCurrentRole(currentRole === 'clin' ? 'pat' : 'clin')}/>;
  }

  let body;
  if (screen === 'clin-today')              body = <ClinicianToday go={go}/>;
  else if (screen === 'clin-screenings')    body = <ClinicianScreenings go={go}/>;
  else if (screen === 'clin-patients')      body = <ClinicianPatients go={go}/>;
  else if (screen === 'clin-account')       body = <ClinicianAccount go={go} onSignOut={() => setSignedIn(false)}/>;
  else if (screen === 'clin-screening-detail') body = <ClinicianScreeningDetail go={go}/>;
  else if (screen === 'clin-patient-profile')  body = <ClinicianPatientProfile go={go}/>;
  else if (screen === 'pat-home')           body = <PatientHome go={go}/>;
  else if (screen === 'pat-history')        body = <PatientHistory go={go}/>;
  else if (screen === 'pat-profile')        body = <PatientProfile onSignOut={() => setSignedIn(false)}/>;
  else if (screen === 'pat-screening-detail') body = <PatientScreeningDetail go={go}/>;

  const showNav = !DEEP.has(screen);
  const tabs = currentRole === 'clin' ? CLIN_TABS : PAT_TABS;
  const activeTab = TAB_OF[screen];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: L.bg, position: 'relative', overflow: 'hidden' }}>
      {body}
      {showNav && (
        <BottomNav tabs={tabs} active={activeTab} onChange={go}/>
      )}
    </div>
  );
}

// ─── Framed device — iOS bezel + our app inside ─────────────
function LuminaPhone({ role = 'clin', screen, label }) {
  return (
    <div style={{ display:'flex', flexDirection: 'column', alignItems: 'center' }} data-screen-label={label}>
      <div style={{
        width: 390, height: 844, borderRadius: 54, position: 'relative',
        background: '#0A0A0A', padding: 12,
        boxShadow: '0 30px 80px rgba(16, 18, 26, 0.22), 0 0 0 2px rgba(0,0,0,0.9), inset 0 0 0 2px rgba(255,255,255,0.06)',
      }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: 44, overflow: 'hidden',
          background: L.bg, position: 'relative',
          fontFamily: L.font, WebkitFontSmoothing: 'antialiased',
        }}>
          {/* Status bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 54, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 28px 0', pointerEvents: 'none',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: L.ink, fontVariantNumeric: 'tabular-nums' }}>9:41</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: L.ink }}>
              <svg width="17" height="11" viewBox="0 0 17 11"><path d="M1 9v-1a6 6 0 0112 0v1M4 9V8a3 3 0 016 0v1M7 9.5a1 1 0 102 0" fill="none" stroke="currentColor" strokeWidth="1.3"/></svg>
              <svg width="24" height="12" viewBox="0 0 24 12"><rect x="0.5" y="0.5" width="20" height="11" rx="2.5" fill="none" stroke="currentColor" opacity="0.4"/><rect x="2" y="2" width="17" height="8" rx="1" fill="currentColor"/><rect x="21" y="4" width="1.5" height="4" rx="0.5" fill="currentColor" opacity="0.4"/></svg>
            </div>
          </div>
          {/* Dynamic island */}
          <div style={{ position:'absolute', top: 11, left: '50%', transform:'translateX(-50%)', width: 118, height: 34, borderRadius: 22, background: '#000', zIndex: 90 }}/>

          <div style={{ height: '100%', paddingTop: 44 }}>
            <LuminaApp role={role} initialScreen={screen}/>
          </div>

          {/* Home indicator */}
          <div style={{ position: 'absolute', bottom: 7, left: '50%', transform: 'translateX(-50%)', width: 130, height: 4.5, borderRadius: 999, background: L.ink2, opacity: 0.28, zIndex: 120, pointerEvents: 'none' }}/>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LuminaApp, LuminaPhone, CLIN_TABS, PAT_TABS });
