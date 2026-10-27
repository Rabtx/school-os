import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Shell } from "./_components/shell";

export const metadata: Metadata = { title: "Rabtx UI", description: "Rabtx UI components." };

export default function UiLayout({ children }: { children: ReactNode }) {
	return <Shell>{children}</Shell>;
}
