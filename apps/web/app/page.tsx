import Hero from "@/components/ui/hero";
import { HowItWorks } from "@/components/ui/how-it-works";
import { ShowcaseSwitcher } from "@/components/ui/showcase-switcher";
import { PricingShowcase } from "@/components/ui/pricing-showcase";
import { FAQ } from "@/components/ui/faq";
import { SiteFooter } from "@/components/ui/site-footer";
import { CarouselMain } from "@/components/ui/carousel-main";
import AiAutoApplySection from "@/components/ui/ai-autoapply-section";


export default async function Page() {
  return (
    <main className="flex relative flex-col mx-auto">
      <Hero />
      {/*<ShowcaseSwitcher />
      <AiAutoApplySection />
      <HowItWorks />
      <PricingShowcase />
      <CarouselMain />
      <FAQ />
      <SiteFooter />*/}
    </main>
  );
}
