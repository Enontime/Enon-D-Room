import type { Metadata } from 'next';
import '@fontsource/silkscreen/latin-400.css';
import '@fontsource/fusion-pixel-12px-monospaced-sc/400.css';
import './globals.css';
export const metadata: Metadata = {
  title: 'Enon Home — 我的数字小天地',
  description:
    '在一个可探索的像素风 3D 房间里，写下想法、使用本地终端，随处走走。',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
