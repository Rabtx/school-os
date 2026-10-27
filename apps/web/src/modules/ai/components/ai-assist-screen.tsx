"use client";

import { CodeIcon, Globe02Icon, SearchFocusIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme";
import { useAuth } from "@/context/auth-context";
import { userFirstName, userInitials } from "@/lib/user-display";
import { useTenantContext } from "@/modules/tenants";
import { ChatComposer } from "@/modules/chat/components/chat/chat-composer";
import { ChatHugeIcon } from "@/modules/chat/components/chat/chat-icon";
import { AceMarkIcon } from "@/modules/chat/components/icons";
import "@/modules/chat/styles/chat.css";
import { type AssistMessage, aiService } from "../ai.service";

type ChatTurn = {
	id: string;
	role: "user" | "assistant";
	content: string;
};

const QUICK_PROMPTS = [
	{
		label: "Run locally",
		description: "Dev + install steps",
		icon: CodeIcon,
		prompt: "How do I install dependencies and run the School OS monorepo locally?",
	},
	{
		label: "Nest auth",
		description: "JWT, MFA, sessions",
		icon: SearchFocusIcon,
		prompt: "Explain how Nest auth, refresh cookies, and MFA fit together in this starter.",
	},
	{
		label: "AI pipeline",
		description: "Web → Nest → FastAPI",
		icon: Globe02Icon,
		prompt:
			"How does in-app AI assistance flow from the web app through Nest to the FastAPI service?",
	},
] as const;

export function AiAssistScreen() {
	const { token, user } = useAuth();
	const tenantId = useTenantContext().activeTenant?.id ?? null;
	const { resolvedTheme } = useTheme();
	const [theme, setTheme] = useState<"light" | "dark">("dark");
	const [draft, setDraft] = useState("");
	const [turns, setTurns] = useState<ChatTurn[]>([]);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [modelLabel, setModelLabel] = useState("Assist");
	const endRef = useRef<HTMLDivElement | null>(null);
	const initials = user ? userInitials(user.username) : "?";

	useEffect(() => {
		if (resolvedTheme === "light" || resolvedTheme === "dark") {
			setTheme(resolvedTheme);
		}
	}, [resolvedTheme]);

	useEffect(() => {
		if (!token || !tenantId) return;
		void aiService
			.status(token, tenantId)
			.then((status) => {
				setModelLabel(status.ok ? (status.provider ?? "Assist") : "Offline");
			})
			.catch(() => setModelLabel("Offline"));
	}, [token, tenantId]);

	const greeting = user
		? `Where should we begin, ${userFirstName(user.profile?.displayName || user.username)}?`
		: "Where should we begin?";

	const send = async (content: string) => {
		if (!token || !tenantId || busy) return;
		const trimmed = content.trim();
		if (!trimmed) return;

		const userTurn: ChatTurn = {
			id: crypto.randomUUID(),
			role: "user",
			content: trimmed,
		};
		const nextTurns = [...turns, userTurn];
		setTurns(nextTurns);
		setDraft("");
		setBusy(true);
		setError(null);
		queueMicrotask(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));

		const history: AssistMessage[] = nextTurns.map((turn) => ({
			role: turn.role,
			content: turn.content,
		}));

		try {
			const result = await aiService.assist(token, tenantId, {
				messages: history,
				context: "admin/ai · chat UX assist",
			});
			setTurns((prev) => [
				...prev,
				{
					id: crypto.randomUUID(),
					role: "assistant",
					content: result.reply,
				},
			]);
			setModelLabel(`${result.provider}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Assist request failed");
		} finally {
			setBusy(false);
			queueMicrotask(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
		}
	};

	const hasTurns = turns.length > 0;

	return (
		<div
			className="chat-design-system chat-design-system--dashboard h-full min-h-0"
			data-chat-design-system
			data-theme={theme}
		>
			<main className={`new-chat-screen new-chat-screen--assist${hasTurns ? " is-threaded" : ""}`}>
				<div className="dot-field new-chat-screen__dots" />
				<section className="new-chat-screen__content">
					{!hasTurns ? (
						<>
							<div className="new-chat-screen__intro">
								<AceMarkIcon size={24} />
								<h1>{greeting}</h1>
							</div>
							<ChatComposer
								value={draft}
								onChange={setDraft}
								onSubmitPrompt={(value) => void send(value)}
								disabled={!token}
								busy={busy}
								placeholder="Ask School OS Assist..."
								modelLabel={modelLabel}
								showUpgradeRail={false}
							/>
							<section className="chat-quick-actions" aria-label="Suggested prompts">
								{QUICK_PROMPTS.map((item) => (
									<button
										key={item.label}
										className="chat-quick-card"
										type="button"
										disabled={!token || busy}
										onClick={() => void send(item.prompt)}
									>
										<ChatHugeIcon icon={item.icon} size={18} />
										<span className="chat-quick-card__label">{item.label}</span>
										<span className="chat-quick-card__description">{item.description}</span>
									</button>
								))}
							</section>
							{error ? <p className="assist-thread__error">{error}</p> : null}
						</>
					) : (
						<>
							<div className="assist-thread" aria-live="polite">
								{turns.map((turn) => (
									<article key={turn.id} className={`assist-turn assist-turn--${turn.role}`}>
										<div className="assist-turn__meta">
											<span className="assist-turn__avatar" aria-hidden>
												{turn.role === "user" ? (
													initials
												) : (
													<ChatHugeIcon icon={SparklesIcon} size={14} />
												)}
											</span>
											<span className="assist-turn__role">
												{turn.role === "user" ? "You" : "Assist"}
											</span>
										</div>
										<div className="assist-turn__bubble">
											<p>{turn.content}</p>
										</div>
									</article>
								))}
								{busy ? (
									<article className="assist-turn assist-turn--assistant assist-turn--pending">
										<div className="assist-turn__meta">
											<span className="assist-turn__avatar" aria-hidden>
												<ChatHugeIcon icon={SparklesIcon} size={14} />
											</span>
											<span className="assist-turn__role">Assist</span>
										</div>
										<div
											className="assist-turn__bubble assist-turn__bubble--pending"
											role="status"
											aria-label="Thinking"
										>
											<span className="assist-typing">
												<span />
												<span />
												<span />
											</span>
										</div>
									</article>
								) : null}
								<div ref={endRef} />
							</div>
							{error ? <p className="assist-thread__error">{error}</p> : null}
							<div className="assist-composer-dock">
								<ChatComposer
									value={draft}
									onChange={setDraft}
									onSubmitPrompt={(value) => void send(value)}
									disabled={!token}
									busy={busy}
									placeholder="Ask a follow-up..."
									modelLabel={modelLabel}
									showUpgradeRail={false}
								/>
							</div>
						</>
					)}
				</section>
			</main>
		</div>
	);
}
