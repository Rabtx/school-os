import type { Metadata } from "next";
import { JetBrains_Mono, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { AgentShell, atlasThemeScript, PricingSection } from "@/modules/landing";
import "@/modules/landing/styles/landing.css";

const jakarta = Plus_Jakarta_Sans({
	subsets: ["latin"],
	variable: "--font-jakarta",
	display: "swap",
});

const playfair = Playfair_Display({
	subsets: ["latin"],
	variable: "--font-playfair",
	display: "swap",
});

const jetbrains = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-jetbrains",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Pricing — School OS",
	description:
		"School OS is free to clone and run. Slide for team and enterprise seats — no surprise overages.",
};

export default function PricingPage() {
	return (
		<>
			<script dangerouslySetInnerHTML={{ __html: atlasThemeScript }} />
			<div className={cn(jakarta.variable, playfair.variable, jetbrains.variable)}>
				<AgentShell>
					<PricingSection />
				</AgentShell>
			</div>
		</>
	);
}
