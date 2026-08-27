// Site footer, matching dailywire.com: the two link groups, the app-download
// card, the social row and the legal line.
//
// Every destination is a `#` stub: this prototype owns one page, not the
// site, and the footer is here for layout truth. They stay <a> (not buttons)
// because that is what they become the moment the real routes exist.
/* eslint-disable jsx-a11y/anchor-is-valid */
import { DWLogo } from './DWLogo';

const PRIMARY = ['News', 'Shows & Movies', 'Shop', 'Kids'];

const SECONDARY = [
  'About',
  'Advertise With Us',
  'Authors',
  'Book our Speakers',
  'Careers',
  'Contact Support',
  'Gift Membership',
  'Legal',
  'Media & Press Inquiries',
  'Shipping & Returns',
  'Standards & Policies',
  'Submit a News Tip',
];

/* Outlined circular buttons, one glyph each. */
const SOCIAL: Array<{ label: string; path: React.ReactNode }> = [
  {
    label: 'Facebook',
    path: <path d="M13.5 8.5h2V6h-2c-1.7 0-3 1.3-3 3v1.5H9V13h1.5v5H13v-5h2l.5-2.5H13V9c0-.3.2-.5.5-.5Z" fill="currentColor" />,
  },
  {
    label: 'X',
    path: (
      <path
        d="M7 6.5 11.4 12 7.2 17.5h1.5l3.4-4.5 3.4 4.5H18l-4.4-5.7L17.6 6.5h-1.5l-3.1 4.1-3.1-4.1H7Z"
        fill="currentColor"
      />
    ),
  },
  {
    label: 'Instagram',
    path: (
      <>
        <rect x="6.5" y="6.5" width="11" height="11" rx="3.4" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="15.4" cy="8.6" r="0.9" fill="currentColor" />
      </>
    ),
  },
  {
    label: 'YouTube',
    path: (
      <>
        <rect x="5.5" y="7.5" width="13" height="9" rx="3" stroke="currentColor" strokeWidth="1.4" />
        <path d="M11 10.2 14.2 12 11 13.8v-3.6Z" fill="currentColor" />
      </>
    ),
  },
  {
    label: 'RSS',
    path: (
      <>
        <circle cx="8" cy="16" r="1.4" fill="currentColor" />
        <path d="M7 11.4a5.6 5.6 0 0 1 5.6 5.6M7 7.6A9.4 9.4 0 0 1 16.4 17" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </>
    ),
  },
];

function StoreBadge({ store }: { store: 'apple' | 'google' }) {
  const apple = store === 'apple';
  return (
    <a className="store-badge" href="#" aria-label={apple ? 'Download on the App Store' : 'Get it on Google Play'}>
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        {apple ? (
          <path
            d="M17.05 12.54c-.03-2.79 2.28-4.13 2.38-4.2-1.3-1.9-3.32-2.16-4.04-2.19-1.72-.17-3.36 1.01-4.23 1.01-.87 0-2.22-.99-3.65-.96-1.88.03-3.61 1.09-4.58 2.77-1.95 3.38-.5 8.39 1.4 11.14.93 1.35 2.04 2.86 3.5 2.81 1.4-.06 1.93-.9 3.63-.9 1.69 0 2.17.9 3.65.87 1.51-.03 2.46-1.37 3.38-2.72 1.07-1.56 1.51-3.07 1.53-3.15-.03-.01-2.94-1.13-2.97-4.48ZM14.5 4.6c.77-.93 1.29-2.22 1.15-3.51-1.11.05-2.46.74-3.25 1.67-.71.82-1.33 2.14-1.16 3.4 1.24.1 2.5-.63 3.26-1.56Z"
            fill="currentColor"
          />
        ) : (
          <>
            <path d="M3.6 2.2 13.4 12 3.6 21.8c-.32-.2-.5-.6-.5-1.1V3.3c0-.5.18-.9.5-1.1Z" fill="currentColor" />
            <path d="m15 9.6 2.9-1.7 3.3 1.9c.7.4.7 1.4 0 1.8l-3.3 1.9L15 11.8V9.6Z" fill="currentColor" />
            <path d="M4.9 1.5 15 7.4l-1.7 1.7L4.9 1.5ZM13.3 14.9 15 16.6 4.9 22.5l8.4-7.6Z" fill="currentColor" />
          </>
        )}
      </svg>
      <span className="store-badge-copy">
        <small>{apple ? 'Download on the' : 'GET IT ON'}</small>
        <strong>{apple ? 'App Store' : 'Google Play'}</strong>
      </span>
    </a>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-rail">
        <div className="footer-top">
          <div className="footer-brand">
            <DWLogo />
          </div>

          <nav className="footer-links" aria-label="Footer">
            <ul className="footer-col footer-col--primary">
              {PRIMARY.map((label) => (
                <li key={label}>
                  <a href="#">{label}</a>
                </li>
              ))}
            </ul>
            <ul className="footer-col footer-col--secondary">
              {SECONDARY.map((label) => (
                <li key={label}>
                  <a href="#">{label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="footer-app">
            <div className="footer-badges">
              <StoreBadge store="apple" />
              <StoreBadge store="google" />
            </div>
            <div className="footer-qr">
              {/* Placeholder mark — a real build drops the generated code in. */}
              <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
                <g fill="currentColor">
                  <path d="M6 6h20v20H6V6Zm4 4v12h12V10H10Zm36-4h20v20H46V6Zm4 4v12h12V10H50ZM6 46h20v20H6V46Zm4 4v12h12V50H10Z" />
                  <path d="M14 14h4v4h-4zM54 14h4v4h-4zM14 54h4v4h-4zM32 6h6v6h-6zM32 16h6v10h-6zM46 32h6v6h-6zM60 32h6v6h-6zM32 32h6v6h-6zM32 44h6v6h-6zM44 46h8v6h-8zM56 46h10v6H56zM46 58h6v8h-6zM58 58h8v8h-8zM32 58h6v8h-6z" />
                </g>
              </svg>
              <p>Scan the QR Code to Download</p>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <ul className="footer-social">
            {SOCIAL.map((s) => (
              <li key={s.label}>
                <a href="#" aria-label={s.label}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    {s.path}
                  </svg>
                </a>
              </li>
            ))}
          </ul>
          <p className="footer-copy">© Copyright 2026, The Daily Wire LLC</p>
          <p className="footer-legal">
            <a href="#">Terms</a>
            <span aria-hidden="true"> | </span>
            <a href="#">Privacy</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
