import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "フランチャイズ発注管理システム",
  description: "フランチャイズ加盟店向け商品発注・本部管理ツール",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
