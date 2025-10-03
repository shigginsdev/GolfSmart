import React from 'react';

const RELEASES = [
  {
    version: 'v0.6.3',
    date: '2025-10-03',
    items: [
      'New: Release Notes page (this page).',
      'Fix: Cognito session clears on browser close (sessionStorage config).',
      'UI: SweetAlert confirm button color now matches Swingstat theme.',
    ],
  },
  {
    version: 'v0.6.2',
    date: '2025-10-01',
    items: [
      'Insights: groundwork for “Average score per hole (last 10 rounds)”.',
      'Settings: course search debounce and better empty-state messaging.',
      'Infra: logs include preprocessed scorecard S3 key for traceability.',
    ],
  },
  {
    version: 'v0.6.1',
    date: '2025-09-24',
    items: [
      'Bugfix: handled spaces in external course API queries.',
      'Security: tightened CORS rules for the course suggestion endpoint.',
      'UX: breadcrumb capitalization polish.',
    ],
  },
];

export default function ReleaseNotes() {
  return (
    <div className="release-notes">
      <h2>Release Notes</h2>

      {RELEASES.map(({ version, date, items }) => (
        <section key={version} style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0 }}>
            {version} <span style={{ fontWeight: 'normal', color: '#6b7280' }}>— {date}</span>
          </h3>
          <ul style={{ marginTop: '0.5rem' }}>
            {items.map((t, idx) => (
              <li key={idx}>{t}</li>
            ))}
          </ul>
        </section>
      ))}

      <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#6b7280' }}>
        Tip: Edit <code>release_notes.js</code> and update the <code>RELEASES</code> array to add new entries.
      </p>
    </div>
  );
}
