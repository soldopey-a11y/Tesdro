import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'Ansdrop — Auto Raffle for $DROP Holders',
  description: 'Automated on-chain raffle & multiplier game for $ANSEM token holders. Every 120 seconds, one winner gets a multiplier drop.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className="bg-black text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
