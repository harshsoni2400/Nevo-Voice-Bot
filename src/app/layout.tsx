import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NYVO Voice Assistant | Insurance Made Simple',
  description:
    'Talk to NYVO\'s AI insurance assistant. Get instant answers about health insurance, term insurance, claims, and more. Powered by NYVO Insurance Services.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
