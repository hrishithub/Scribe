import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'
import Navbar from '@/components/Navbar'
import { ThemeProvider } from '@/components/theme-provider'
import Providers from '@/components/Provider'

import 'react-loading-skeleton/dist/skeleton.css'
import { Toaster } from '@/components/ui/toaster'
import 'simplebar-react/dist/simplebar.min.css'


const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Scribe',
  description: " Scribe allows you to have conversations with any PDF document. Simply upload your file and start asking questions right away.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <Providers>                                                  
      <body  className={cn('min-h-screen font-sans antialiased ',inter.className )}>  
     
      <ThemeProvider 
       attribute="class"
       defaultTheme="system"
       enableSystem>
            <Toaster/>
            <Navbar />
            {children}
      </ThemeProvider>
      </body>
      </Providers>   
    </html>
  )
}
