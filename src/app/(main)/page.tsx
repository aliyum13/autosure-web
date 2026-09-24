import Hero from '@/components/home/Hero';
import RiskSection from '@/components/home/RiskSection';
import SampleReportSection from '@/components/home/SampleReportSection';
import HowItWorks from '@/components/home/HowItWorks';
import PricingPreview from '@/components/home/PricingPreview';
import CTASection from '@/components/home/CTASection';

export default function Home() {
  return (
    <>
      <Hero />
      <RiskSection />
      <SampleReportSection />
      <HowItWorks />
      <PricingPreview />
      <CTASection />
    </>
  );
}
