import './globals.scss';
import { Providers } from './providers';

export const metadata = {
  title: 'Lead Intelligence',
  description: 'Lead discovery and intelligence platform',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
