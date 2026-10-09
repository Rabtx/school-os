import Link from "next/link";

export default function HomePage() {
	return (
		<div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
			<p className="mb-4 inline-flex items-center rounded-full border px-3 py-1 text-sm text-fd-muted-foreground">
				Turborepo + Bun + Next.js + Expo + Hono
			</p>
			<h1 className="mb-6 text-4xl font-semibold tracking-tight sm:text-5xl">
				School OS Documentation
			</h1>
			<p className="max-w-2xl text-fd-muted-foreground sm:text-lg">
				A clean, practical guide to the monorepo architecture, workflow, and app stack. Built for
				fast onboarding and consistent delivery.
			</p>
			<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
				<Link
					href="/docs"
					className="rounded-md bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground transition-colors hover:opacity-90"
				>
					Read the docs
				</Link>
				<Link
					href="https://github.com/rabtx/school-os"
					className="rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-fd-accent"
				>
					View repository
				</Link>
			</div>
		</div>
	);
}
