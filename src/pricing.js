// src/components/Pricing.js
import React from 'react';
import './pricing.css';

const plans = [
  {
    name: 'Starter',
    priceLabel: 'Free',
    buttonText: 'Try it',
    buttonLink: '/signup?plan=starter',
  },
  {
    name: 'Pro',
    priceLabel: '$9/mo or $89/yr',
    buttonText: 'Try it',
    buttonLink: '/signup?plan=pro',
  },
  {
    name: 'Elite',
    priceLabel: '$19/mo or $189/yr',
    buttonText: 'Contact us',
    buttonLink: '/contact',
  },
];

const featureRows = [
  {
    feature: 'Rounds Tracked',
    Starter: 'Up to 5',
    Pro: 'Unlimited',
    Elite: 'Unlimited',
  },
  {
    feature: 'Scorecard Scan Credits',
    Starter: '3/month',
    Pro: '15/month',
    Elite: 'Unlimited',
  },
  {
    feature: 'AI Game Analysis',
    Starter: 'Basic',
    Pro: 'Full Insights',
    Elite: 'Full + Trend Reports',
  },
  {
    feature: 'Personalized Practice Plans',
    Starter: '❌',
    Pro: '✅',
    Elite: '✅ (Customized Weekly Plan)',
  },
  {
    feature: 'Strokes Gained & Advanced Stats',
    Starter: '❌',
    Pro: '✅',
    Elite: '✅',
  },
  {
    feature: 'Smart Practice Recommendations',
    Starter: '❌',
    Pro: '✅',
    Elite: '✅ + Notifications',
  },
  {
    feature: 'PDF Reports',
    Starter: '❌',
    Pro: '✅',
    Elite: '✅',
  },
  {
    feature: '“Smart Caddie” Mode (coming soon)',
    Starter: '❌',
    Pro: '❌',
    Elite: '✅',
  },
  {
    feature: 'Upload Video for Feedback (beta)',
    Starter: '❌',
    Pro: '❌',
    Elite: '✅',
  },
  {
    feature: 'Priority Support',
    Starter: '❌',
    Pro: '✅',
    Elite: '✅',
  },
  {
    feature: 'Access to New Features First',
    Starter: '❌',
    Pro: '❌',
    Elite: '✅',
  },
];

export default function Pricing() {
  return (
    <section className="pricing">
      {/* Top cards */}
      <div className="pricing-cards">
        {plans.map((plan) => (
          <div className="pricing-card" key={plan.name}>
            <h2 className="plan-name">{plan.name}</h2>
            <div className="plan-price">{plan.priceLabel}</div>
            <a href={plan.buttonLink} className="plan-button">
              {plan.buttonText}
            </a>
          </div>
        ))}
      </div>

      {/* Feature comparison table */}
      <div className="pricing-table-wrapper">
        <table className="pricing-table">
          <thead>
            <tr>
              <th>Feature</th>
              {plans.map((plan) => (
                <th key={plan.name}>
                  {plan.name}
                  <div className="sub-label">{plan.priceLabel}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {featureRows.map((row) => (
              <tr key={row.feature}>
                <td className="feature-name">{row.feature}</td>
                <td>{row.Starter}</td>
                <td>{row.Pro}</td>
                <td>{row.Elite}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
