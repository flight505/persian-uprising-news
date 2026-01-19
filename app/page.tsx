'use client';

import { useState } from 'react';
import NewsFeed from './components/NewsFeed/NewsFeed';
import SplashScreen from './components/ui/SplashScreen';
import FeatureCarousel from './components/Home/FeatureCarousel';
import HeroSection from './components/Home/HeroSection';
import BottomNav from './components/Layout/BottomNav';

export default function Home() {
  const [topicQuery, setTopicQuery] = useState("");

  return (
    <>
      <SplashScreen />
      <main className="min-h-screen pb-24 lg:pb-0">
        {/* Typographic Hero */}
        <HeroSection />

        <div className="max-w-3xl mx-auto">
          {/* Topic Portals Carousel */}
          <section className="px-4">
            <FeatureCarousel onTopicSelect={setTopicQuery} />
          </section>

          {/* Dynamic Feed */}
          <NewsFeed externalTopicQuery={topicQuery} />
        </div>
      </main>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </>
  );
}
