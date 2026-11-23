import './globals.css';

export const metadata = {
  title: 'Go Kite · Interview Feedback',
  description: 'Interview scheduling and feedback for Go Kite Travel & Tours',
  icons: {
    icon: [
      { url: '/kite-icon-v3.png', type: 'image/png', sizes: '512x512' },
      { url: '/kite-favicon-v3.ico', type: 'image/x-icon' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Go Kite',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b1218',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
