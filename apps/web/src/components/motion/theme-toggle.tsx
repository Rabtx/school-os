"use client";

// beui.dev/components/motion/theme-toggle

import { ArrowDown01Icon, Moon01Icon, Sun01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@school-os/ui/components/dropdown-menu";
import { useReducedMotion } from "motion/react";
import {
	type ComponentPropsWithoutRef,
	type MouseEvent,
	useCallback,
	useEffect,
	useState,
} from "react";
import { flushSync } from "react-dom";
import { ActionSwapIcon } from "@/components/motion/action-swap-button";
import { useTheme } from "@/components/theme";
import { cn } from "@/lib/utils";

export type ThemeVariant = "rectangle" | "circle" | "circle-blur" | "wipe" | "polygon";

export type RectStart =
	| "top-left"
	| "top-right"
	| "bottom-left"
	| "bottom-right"
	| "center"
	| "bottom-up"
	| "pointer";

export const THEME_VARIANT_OPTIONS: ReadonlyArray<{
	id: ThemeVariant;
	label: string;
	description: string;
}> = [
	{ id: "circle", label: "Circle", description: "Expand from the toggle" },
	{ id: "circle-blur", label: "Circle blur", description: "Soft focus expand" },
	{ id: "rectangle", label: "Rectangle", description: "Directional wipe panel" },
	{ id: "wipe", label: "Wipe", description: "Horizontal slide reveal" },
	{ id: "polygon", label: "Polygon", description: "Diamond morph expand" },
] as const;

const VARIANT_STORAGE_KEY = "theme-vt-variant";
const DEFAULT_VARIANT: ThemeVariant = "circle";

export interface ThemeToggleProps extends Omit<
	ComponentPropsWithoutRef<"button">,
	"children" | "onClick"
> {
	/** Animation variant. Default: controlled by preference or "circle". */
	variant?: ThemeVariant;
	/** Origin direction for the reveal. Default: "pointer" (from the button). */
	start?: RectStart;
	iconClassName?: string;
}

const RECT_FROM: Record<Exclude<RectStart, "pointer">, string> = {
	"top-left": "inset(0 100% 100% 0)",
	"top-right": "inset(0 0 100% 100%)",
	"bottom-left": "inset(100% 100% 0 0)",
	"bottom-right": "inset(100% 0 0 100%)",
	center: "inset(50% 50% 50% 50%)",
	"bottom-up": "inset(100% 0 0 0)",
};

const CIRCLE_ORIGIN: Record<Exclude<RectStart, "pointer">, string> = {
	"top-left": "0% 0%",
	"top-right": "100% 0%",
	"bottom-left": "0% 100%",
	"bottom-right": "100% 100%",
	center: "50% 50%",
	"bottom-up": "50% 100%",
};

type ViewTransitionDocument = Document & {
	startViewTransition: (callback: () => void) => { finished: Promise<void> };
};

function hasViewTransition(doc: Document): doc is ViewTransitionDocument {
	return typeof (doc as ViewTransitionDocument).startViewTransition === "function";
}

function isThemeVariant(value: string | null): value is ThemeVariant {
	return THEME_VARIANT_OPTIONS.some((option) => option.id === value);
}

function originFromEvent(event: MouseEvent<HTMLButtonElement>): string {
	const rect = event.currentTarget.getBoundingClientRect();
	const x = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
	const y = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
	return `${x}% ${y}%`;
}

function readStoredVariant(): ThemeVariant {
	if (typeof window === "undefined") return DEFAULT_VARIANT;
	try {
		const stored = window.localStorage.getItem(VARIANT_STORAGE_KEY);
		if (isThemeVariant(stored)) return stored;
	} catch {
		// ignore quota / private mode
	}
	return DEFAULT_VARIANT;
}

export function useThemeVariantPreference(defaultVariant: ThemeVariant = DEFAULT_VARIANT) {
	const [variant, setVariantState] = useState<ThemeVariant>(defaultVariant);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setVariantState(readStoredVariant());
		setMounted(true);
	}, []);

	const setVariant = useCallback((next: ThemeVariant) => {
		setVariantState(next);
		try {
			window.localStorage.setItem(VARIANT_STORAGE_KEY, next);
		} catch {
			// ignore quota / private mode
		}
	}, []);

	return { variant, setVariant, mounted };
}

function prepareVariant(
	root: HTMLElement,
	variant: ThemeVariant,
	start: RectStart,
	event?: MouseEvent<HTMLButtonElement>,
) {
	if (variant === "rectangle") {
		const from = start === "pointer" ? RECT_FROM["bottom-up"] : RECT_FROM[start];
		root.style.setProperty("--beui-vt-from", from);
		root.dataset.beuiVt = "rect";
		return;
	}

	if (variant === "wipe") {
		root.dataset.beuiVt = "wipe";
		return;
	}

	if (variant === "polygon") {
		const origin =
			start === "pointer" && event
				? originFromEvent(event)
				: CIRCLE_ORIGIN[start === "pointer" ? "top-right" : start];
		root.style.setProperty("--beui-vt-origin", origin);
		root.dataset.beuiVt = "polygon";
		return;
	}

	const origin =
		start === "pointer" && event
			? originFromEvent(event)
			: CIRCLE_ORIGIN[start === "pointer" ? "top-right" : start];
	root.style.setProperty("--beui-vt-origin", origin);
	root.dataset.beuiVt = variant;
}

export function useThemeToggle({
	variant = "circle",
	start = "pointer",
}: {
	variant?: ThemeVariant;
	start?: RectStart;
} = {}) {
	const { setTheme, resolvedTheme } = useTheme();
	const reduce = useReducedMotion() ?? false;
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	const isDark = mounted && resolvedTheme === "dark";

	const toggle = (event?: MouseEvent<HTMLButtonElement>) => {
		const next = isDark ? "light" : "dark";

		if (reduce || !hasViewTransition(document)) {
			setTheme(next);
			return;
		}

		const root = document.documentElement;
		prepareVariant(root, variant, start, event);

		const transition = document.startViewTransition(() => {
			flushSync(() => {
				setTheme(next);
			});
		});

		void transition.finished.finally(() => {
			delete root.dataset.beuiVt;
			root.style.removeProperty("--beui-vt-from");
			root.style.removeProperty("--beui-vt-origin");
		});
	};

	return { isDark, mounted, toggle };
}

export function ThemeToggle({
	variant = "circle",
	start = "pointer",
	className,
	iconClassName,
	...rest
}: ThemeToggleProps) {
	const { isDark, mounted, toggle } = useThemeToggle({ variant, start });

	return (
		<button
			type="button"
			aria-label={mounted && isDark ? "Switch to light mode" : "Switch to dark mode"}
			onClick={toggle}
			className={cn("flex items-center justify-center", className)}
			{...rest}
		>
			{mounted ? (
				<ActionSwapIcon
					value={isDark ? "dark" : "light"}
					animation="blur"
					className={iconClassName}
				>
					{isDark ? (
						<HugeiconsIcon icon={Sun01Icon} className={iconClassName} strokeWidth={1.8} />
					) : (
						<HugeiconsIcon icon={Moon01Icon} className={iconClassName} strokeWidth={1.8} />
					)}
				</ActionSwapIcon>
			) : (
				<span className={iconClassName} aria-hidden="true" />
			)}
		</button>
	);
}

export type ThemeToggleControlProps = {
	className?: string;
	buttonClassName?: string;
	iconClassName?: string;
	start?: RectStart;
};

/** Theme toggle + dropdown to pick the View Transition effect. */
export function ThemeToggleControl({
	className,
	buttonClassName,
	iconClassName = "size-[18px]",
	start = "pointer",
}: ThemeToggleControlProps) {
	const { variant, setVariant } = useThemeVariantPreference();
	const { isDark, mounted } = useThemeToggle({ variant, start });

	return (
		<div
			className={cn(
				"inline-flex items-center overflow-hidden rounded-lg text-dashboard-text-muted",
				className,
			)}
		>
			<ThemeToggle
				variant={variant}
				start={start}
				className={cn(
					"size-9 rounded-none rounded-s-lg hover:bg-dashboard-hover hover:text-dashboard-text-primary",
					buttonClassName,
				)}
				iconClassName={iconClassName}
			/>
			<DropdownMenu>
				<DropdownMenuTrigger
					aria-label="Theme animation effect"
					className={cn(
						"flex size-7 items-center justify-center rounded-e-lg border-s border-dashboard-border/60 outline-none hover:bg-dashboard-hover hover:text-dashboard-text-primary focus-visible:ring-2 focus-visible:ring-dashboard-border-focus",
						buttonClassName,
					)}
				>
					<HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={2} />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" sideOffset={8} className="min-w-48">
					<DropdownMenuGroup>
						<DropdownMenuLabel>Animation effect</DropdownMenuLabel>
						<DropdownMenuRadioGroup
							value={variant}
							onValueChange={(value) => {
								if (isThemeVariant(value)) setVariant(value);
							}}
						>
							{THEME_VARIANT_OPTIONS.map((option) => (
								<DropdownMenuRadioItem key={option.id} value={option.id} className="items-start">
									<span className="flex flex-col gap-0.5">
										<span>{option.label}</span>
										<span className="text-[11px] text-muted-foreground">{option.description}</span>
									</span>
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
					</DropdownMenuGroup>
					{mounted ? (
						<>
							<DropdownMenuSeparator />
							<p className="px-2 py-1.5 text-[11px] text-muted-foreground">
								Click the {isDark ? "sun" : "moon"} to preview
							</p>
						</>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
