import './globals.css'
export const metadata = { title: 'Gestión Pyme' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="es"><body>{children}</body></html>)
}
