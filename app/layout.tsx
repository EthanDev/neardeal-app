export const metadata = { title: 'NearDeal Business', description: 'Business dashboard for NearDeal' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
