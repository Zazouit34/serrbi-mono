import Hero from "@/components/ui/hero";
import { HowItWorks } from "@/components/ui/how-it-works";
import { ShowcaseSwitcher } from "@/components/ui/showcase-switcher";
import { PricingShowcase } from "@/components/ui/pricing-showcase";
import { FAQ } from "@/components/ui/faq";
import { SiteFooter } from "@/components/ui/site-footer";
import { ResumeInsight } from "@/components/ui/resume-insight";
import { CarouselMain } from "@/components/ui/carousel-main";


export default async function Page() {
  return (
    <main className="flex relative flex-col mx-auto">
      <Hero />
      <ShowcaseSwitcher />
      <ResumeInsight />
      <HowItWorks />
      <PricingShowcase />
      <FAQ />
      <CarouselMain />
      <SiteFooter />
    </main>
  );
}
