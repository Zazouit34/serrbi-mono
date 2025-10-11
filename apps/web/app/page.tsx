import Hero from "@/components/ui/hero";
import { HowItWorks } from "@/components/ui/how-it-works";
import { ShowcaseSwitcher } from "@/components/ui/showcase-switcher";
import { PricingShowcase } from "@/components/ui/pricing-showcase";
import { FAQ } from "@/components/ui/faq";
import { SiteFooter } from "@/components/ui/site-footer";


export default function Page() {
  return (
    <main className="flex relative flex-col mx-auto">
      <Hero />
      <HowItWorks />
      <ShowcaseSwitcher />
      <PricingShowcase />
      <FAQ />
      <SiteFooter />
    </main>
  );
}
