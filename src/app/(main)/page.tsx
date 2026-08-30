import Hero from '@/components/home/Hero';
import StatsStrip from '@/components/home/StatsStrip';
import RiskSection from '@/components/home/RiskSection';
import HowItWorks from '@/components/home/HowItWorks';
import PricingPreview from '@/components/home/PricingPreview';
import CTASection from '@/components/home/CTASection';

export default function Home() {
  return (
    <>
      <Hero />
      <StatsStrip />
      <RiskSection />
      <HowItWorks />
      <PricingPreview />
      <CTASection />
    </>
  );
}
