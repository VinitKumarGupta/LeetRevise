import type { ReactNode } from 'react';
import { Brand } from './Brand.js';

export function AuthLayout({ formId, title, description, children }: {
  formId: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <Brand />
        <div className="auth-split">
          <div className="auth-illustration">
            <div className="auth-intro">
              <p className="auth-intro-title">A little practice goes a long way.</p>
              <p>Track what you solve on LeetCode and revisit it when it’s due.</p>
            </div>
            <img src="/study-buddy.jpg" width="960" height="720" alt="" />
          </div>
          <section className="auth-card" aria-labelledby={formId}>
            <header>
              <h1 id={formId} className="page-heading">{title}</h1>
              <p className="page-description">{description}</p>
            </header>
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
