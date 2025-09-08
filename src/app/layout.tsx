import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Diogenes - The Digital Cynic',
  description: 'A contrarian AI chatbot that challenges conventional thinking through Socratic dialogue and philosophical provocation.',
  keywords: 'AI, chatbot, philosophy, Diogenes, Cynic, contrarian',
  authors: [{ name: 'Diogenes Team' }],
  openGraph: {
    title: 'Diogenes - The Digital Cynic',
    description: 'Challenge your thinking with a contrarian AI philosopher',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}