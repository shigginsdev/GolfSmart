import React from 'react';
import './layout.css';

const RELEASES = [
  {
    version: 'v0.6.3',
    date: '2025-10-03',
    items: [
      'New: Release Notes page (this page).',
      'Fix: Cognito session clears on browser close.',
      'UI: SweetAlert confirm button styled to match Swingstat theme.',
    ],
  },
  {
    version: 'v0.6.2',
    date: '2025-10-01',
    items: [
      'Insights groundwork for “Average score per hole (last 10 rounds)”.',
      'Settings course search debounce improvements.',
      'Infra: logs include preprocessed scorecard S3 key.',
    ],
  },
];

export default function ReleaseNotes() {
  return (
    <div className="release-notes-box">
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
    </div>
  );
}
