import React from 'react';
import { Navbar } from './Navbar';
import { Hero } from './Hero';
import { Logos } from './Logos';
import { Features } from './Features';
import { Dashboard } from './Dashboard';
import { Stats } from './Stats';
import { Testimonials } from './Testimonials';
import { CTA } from './CTA';
import { Footer } from './Footer';
import { StarryBackground } from './StarryBackground';

import '../../../nexus-glow-styles.css';

export default function NexusLanding() {
  return (
    <main className="relative z-0 min-h-screen text-foreground font-sans antialiased overflow-x-hidden selection:bg-primary/30 selection:text-primary dark">
      <StarryBackground />
      <Navbar />
      <Hero />
      <Logos />
      <Features />
      <Dashboard />
      <Stats />
      <Testimonials />
      <CTA />
      <Footer />
    </main>
  );
}
