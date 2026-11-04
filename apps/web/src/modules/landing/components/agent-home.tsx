import { AgentShell } from "./agent-shell";
import { CapabilitiesSection } from "./capabilities-section";
import { CtaSection } from "./cta-section";
import { CustomersSection } from "./customers-section";
import { FaqSection } from "./faq-section";
import { HeroSection } from "./hero-section";
import { PricingSection } from "./pricing-section";
import { ProductSection } from "./product-section";
import { StatsSection } from "./stats-section";
import { TestimonialsSection } from "./testimonials-section";
import { WhySection } from "./why-section";

export function AgentHome() {
	return (
		<AgentShell>
			<HeroSection />
			<CustomersSection />
			<ProductSection />
			<CapabilitiesSection />
			<WhySection />
			<StatsSection />
			<TestimonialsSection />
			<PricingSection />
			<FaqSection />
			<CtaSection />
		</AgentShell>
	);
}
