import type { Metadata } from "next";
import { JetBrains_Mono, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { atlasThemeScript, SITE } from "@/modules/landing";
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
	title: SITE.title,
	description: SITE.description,
	openGraph: {
		title: SITE.title,
		description: SITE.description,
		images: [{ url: "/brand/school-os-mark.png", alt: "School OS" }],
	},
};

export default function LandingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<>
			{/* Apply the stored landing theme before paint to avoid a flash. */}
			<script dangerouslySetInnerHTML={{ __html: atlasThemeScript }} />
			<div className={cn(jakarta.variable, playfair.variable, jetbrains.variable)}>{children}</div>
		</>
	);
}
