import './globals.css';

export const metadata = {
  title: 'Plant Log - 植物成長記録',
  description: '写真とスライダーで楽しむ植物の成長遷移',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
