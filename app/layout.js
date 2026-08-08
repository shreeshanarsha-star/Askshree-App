import './globals.css';

export const metadata = {
  title: 'Ask Shree — AI-native recruiting toolkit',
  description: 'AI-native recruiting tools: post a job or find and apply for free, with AI screening, matching, and an assistant that knows this site.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,500;0,600;1,500&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
