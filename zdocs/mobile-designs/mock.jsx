// Mock data for the Lumina redesign.

const MOCK = {
  clinician: { name: 'Dr. Bartek Jach', clinic: 'Eastside Clinic', email: 'bartek.jach@shiftposts.com' },
  patient:   { name: 'Alex Morgan', dob: '1991-08-14' },

  today: {
    metrics: [
      { label: 'Needs attention', value: 3, tone: 'error' },
      { label: 'Ready visits',    value: 5, tone: 'success' },
      { label: 'Active now',      value: 2, tone: 'info' },
    ],
    needsAttention: [
      { id: 'n1', name: 'Jordan Rivera',   severity: 'High',   ctx: 'Intake sent 2d ago, not started', time: '2d', status: 'pending' },
      { id: 'n2', name: 'Priya Shah',      severity: 'Medium', ctx: 'Summary awaiting clinician review', time: '3h', status: 'inreview' },
      { id: 'n3', name: 'Marcus Lee',      severity: 'Medium', ctx: 'Scribe upload failed — retry needed', time: '1h', status: 'stopped' },
    ],
    readiness: [
      { id: 'v1', name: 'Sam Okafor',   when: 'Today · 2:30 PM', kind: 'Follow-up', ready: true },
      { id: 'v2', name: 'Elena Park',   when: 'Today · 3:45 PM', kind: 'Initial',   ready: true },
      { id: 'v3', name: 'Noah Keller',  when: 'Tomorrow · 9:00 AM', kind: 'Follow-up', ready: false },
    ],
    activity: [
      { id: 'a1', name: 'Intake SMS sent',     who: 'Mia Chen',      when: '18m ago' },
      { id: 'a2', name: 'Intake completed',    who: 'Alex Morgan',   when: '1h ago' },
      { id: 'a3', name: 'Summary generated',   who: 'Priya Shah',    when: '2h ago' },
    ],
  },

  screenings: [
    { id: 's1', name: 'Jordan Rivera',   type: 'General',    status: 'pending',    when: 'Sent 2d ago',   scribe: 'Needed' },
    { id: 's2', name: 'Priya Shah',      type: 'Follow-up',  status: 'inreview',   when: 'Completed 3h ago', scribe: 'Uploaded' },
    { id: 's3', name: 'Alex Morgan',     type: 'Intake',     status: 'completed',  when: 'Completed 1h ago', scribe: 'Finalized' },
    { id: 's4', name: 'Marcus Lee',      type: 'Follow-up',  status: 'stopped',    when: 'Sent 4h ago',   scribe: 'Failed' },
    { id: 's5', name: 'Elena Park',      type: 'Initial',    status: 'sent',       when: 'Sent 15m ago',  scribe: '—' },
    { id: 's6', name: 'Sam Okafor',      type: 'Intake',     status: 'completed',  when: 'Completed 1d ago', scribe: 'Finalized' },
    { id: 's7', name: 'Noah Keller',     type: 'Follow-up',  status: 'inreview',   when: 'Completed 5h ago', scribe: 'Uploaded' },
    { id: 's8', name: 'Mia Chen',        type: 'Intake',     status: 'sent',       when: 'Sent 18m ago',  scribe: '—' },
  ],

  patients: [
    { id: 'p1', name: 'Alex Morgan',   phone: '+1 (415) 555‑0132', last: 'Completed · 1h',  state: 'completed' },
    { id: 'p2', name: 'Priya Shah',    phone: '+1 (206) 555‑0199', last: 'In review · 3h',  state: 'inreview' },
    { id: 'p3', name: 'Marcus Lee',    phone: '+1 (312) 555‑0144', last: 'Stopped · 4h',    state: 'stopped' },
    { id: 'p4', name: 'Elena Park',    phone: '+1 (646) 555‑0111', last: 'Sent · 15m',      state: 'sent' },
    { id: 'p5', name: 'Jordan Rivera', phone: '+1 (503) 555‑0177', last: 'Pending · 2d',    state: 'pending' },
    { id: 'p6', name: 'Sam Okafor',    phone: '+1 (718) 555‑0182', last: 'Completed · 1d',  state: 'completed' },
    { id: 'p7', name: 'Noah Keller',   phone: '+1 (212) 555‑0103', last: 'In review · 5h',  state: 'inreview' },
    { id: 'p8', name: 'Mia Chen',      phone: '+1 (925) 555‑0145', last: 'Sent · 18m',      state: 'sent' },
  ],

  screeningDetail: {
    id: 's3',
    patient: 'Alex Morgan',
    age: 34, pronouns: 'she/her',
    status: 'completed',
    type: 'Intake',
    urgency: 'Routine',
    visit: 'Today · 2:30 PM',
    summary: {
      symptoms: [
        'Intermittent retrosternal chest tightness for 3 weeks',
        'Aggravated with exertion, relieved by rest (~5 min)',
        'Denies syncope, palpitations, leg swelling',
      ],
      assessment:
        'Symptoms suggestive of stable exertional angina. Prior borderline BP noted. Family history of early CAD (father, 52).',
      visitSummary: [
        'Confirm symptom pattern and Canadian CVS class',
        'Baseline ECG + lipid panel',
        'Consider stress testing if pattern persists',
      ],
      insights: [
        { label: 'Risk score', value: 'Intermediate' },
        { label: 'Flagged meds', value: '2' },
        { label: 'Allergies', value: 'NKDA' },
      ],
    },
    transcript: [
      { t: '00:12', who: 'Clinician', text: 'Thanks for coming in today. Tell me about the chest discomfort.' },
      { t: '00:24', who: 'Patient',   text: 'It started about three weeks ago, mostly when I walk uphill.' },
      { t: '00:41', who: 'Patient',   text: 'It goes away if I stop for a few minutes.' },
      { t: '01:02', who: 'Clinician', text: 'Any shortness of breath or lightheadedness with it?' },
    ],
  },

  // patient-side history
  patientHistory: [
    { id: 'ph1', date: 'Mar 17',  year: '2026', clinician: 'Dr. Jach',    status: 'completed', summary: 'Routine intake · mild chest tightness' },
    { id: 'ph2', date: 'Jan 08',  year: '2026', clinician: 'Dr. Obi',     status: 'completed', summary: 'Follow-up · hypertension screening' },
    { id: 'ph3', date: 'Oct 22',  year: '2025', clinician: 'Dr. Jach',    status: 'finalized', summary: 'Annual check-in · unremarkable' },
    { id: 'ph4', date: 'Jul 03',  year: '2025', clinician: 'Dr. Tanaka',  status: 'completed', summary: 'Urgent · migraine evaluation' },
  ],
};

window.MOCK = MOCK;
