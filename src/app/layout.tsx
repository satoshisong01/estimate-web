import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers'; // 방금 만든거 임포트

export const metadata: Metadata = {
  title: 'Estimate Web',
  description: '견적서 관리 시스템',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
