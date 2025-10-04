import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Strenx GymLogin',
  description: 'Login to manage your gym activities.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("font-body antialiased", inter.variable)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Script src="https://checkout.razorpay.com/v1/checkout.js" />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
