import "./globals.css";
export const metadata = {
  title: "noticing. — 中堅看護師の内省支援",
  description: "Gibbsリフレクティブサイクル × AI。経験を振り返り、自分で考え続けられる看護師を増やす。",
};
export default function RootLayout({ children }) {
  return (<html lang="ja"><body>{children}</body></html>);
}
