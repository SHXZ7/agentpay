import Script from 'next/script';
import './globals.css';

export const metadata = {
  title: 'Agent-Ready Storefront | Razorpay Autonomous Commerce',
  description: 'Autonomous AI Shopping Agent with AP2 Bounded Mandates, ACP Razorpay Checkout, Audit Trail & Growth Upsell',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Fira+Code:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased bg-[#F4F0E8] text-[#1C1917] selection:bg-gold-500 selection:text-white">
        {/* Official Razorpay Checkout Script */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
        {children}
      </body>
    </html>
  );
}

