import type { ReactNode } from "react";

/** Typography for a docs page, as one set of child selectors instead of a class on every tag. */
export function Doc({ children }: { children: ReactNode }) {
	return (
		<article className="max-w-3xl [&_code]:font-mono [&_code]:text-xs [&_h1]:text-2xl [&_h1]:font-medium [&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:text-base [&_h2]:font-medium [&>p]:mt-2 [&>p]:text-sm/6 [&>p]:text-(--rx-text-secondary) [&>ul]:list-disc [&>ul]:pl-5 [&>ul>li]:text-sm/6 [&>ul>li]:text-(--rx-text-secondary) [&>pre]:my-4 [&>pre]:overflow-x-auto [&>pre]:rounded-xl [&>pre]:border [&>pre]:border-(--rx-border-strong) [&>pre]:bg-(--rx-pressed) [&>pre]:p-4 [&>pre]:font-mono [&>pre]:text-xs/5">
			{children}
		</article>
	);
}
