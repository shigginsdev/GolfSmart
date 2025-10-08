import React from 'react';
import './layout.css';

const RELEASES = [
  {
    version: 'v0.6.3',
    date: '2025-10-03',
    items: [
      'New: Release Notes page (this page).',
      'Fix: Searching local courses bug.',      
    ],
  },
  {
    version: 'v0.6.2',
    date: '2025-10-01',
    items: [
      'New: Subscription tiers and billing management.',
      'Fix: Disabling menu items until a new user completes their profile.',      
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
