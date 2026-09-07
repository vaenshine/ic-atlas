import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'IC Atlas · Electronics Learning Lab',
  icons: { icon: '/favicon.svg' },
  description:
    'Explore 200 electronic component categories, 100 representative devices and 16 common packages in an interactive Three.js lab. English-first learning notes with Chinese translations.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
