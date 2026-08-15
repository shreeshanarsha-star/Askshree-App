'use client';
import { useState, useEffect } from 'react';
import ReactorHome from '../components/ReactorHome';
import ClassicHome from '../components/ClassicHome';

// askshree.com/ — defaults to the reactor console (ReactorHome) since that's
// now the primary homepage design. The original sidebar homepage
// (ClassicHome) is preserved and can be switched back in as the live
// homepage from Settings -> Homepage Layout, without deleting any code.
export default function RootHomePage() {
  const [layout, setLayout] = useState('reactor');

  useEffect(() => {
    fetch('/api/homepage-layout', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (d.layout === 'classic') setLayout('classic'); })
      .catch(() => {});
  }, []);

  return layout === 'classic' ? <ClassicHome /> : <ReactorHome />;
}
