import type { Metadata } from "next";
import { JetBrains_Mono, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { AboutPageContent, AgentShell, atlasThemeScript } from "@/modules/landing";
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
	title: "About — School OS",
	description:
		"Mobile-first school management for networks like Aga Khan Schools — meet the team behind School OS.",
};

export default function AboutPage() {
	return (
		<>
			<script dangerouslySetInnerHTML={{ __html: atlasThemeScript }} />
			<div className={cn(jakarta.variable, playfair.variable, jetbrains.variable)}>
				<AgentShell>
					<AboutPageContent />
				</AgentShell>
			</div>
		</>
	);
}
