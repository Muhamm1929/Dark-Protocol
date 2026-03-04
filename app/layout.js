import './globals.css';

export const metadata = {
  title: 'Dark Protocol',
  description: 'Площадка испытаний Dark Protocol'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
