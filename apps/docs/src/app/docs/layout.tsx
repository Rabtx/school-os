import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { MessageCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AISearch, AISearchPanel, AISearchTrigger } from "@/components/ai/search";
import { cn } from "@/lib/cn";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export default function Layout({ children }: LayoutProps<"/docs">) {
	return (
		<DocsLayout tree={source.getPageTree()} {...baseOptions()}>
			<AISearch>
				<AISearchPanel />
				<AISearchTrigger
					position="float"
					className={cn(
						buttonVariants({
							variant: "secondary",
							className: "text-fd-muted-foreground rounded-2xl",
						}),
					)}
				>
					<HugeiconsIcon icon={MessageCircleIcon} className="size-4.5" />
					Ask AI
				</AISearchTrigger>
			</AISearch>

			{children}
		</DocsLayout>
	);
}
