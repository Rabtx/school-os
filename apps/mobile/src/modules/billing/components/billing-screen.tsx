import { router } from "expo-router";
import { CheckCircle2, CreditCard, XCircle } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NeonCard } from "@/components/ui/neon-card";
import { OSHeader } from "@/components/ui/os-header";
import { NeonColors } from "@/constants/design-system";
import { useAuth } from "@/modules/auth";
import { AccountTabs } from "@/modules/auth/components/account-tabs";
import { AuthAlert } from "@/modules/auth/components/auth-alert";
import { AuthButton } from "@/modules/auth/components/auth-button";
import {
	type BillingInterval,
	billingService,
	type PaymentProviderName,
	type PlanCode,
	type SubscriptionView,
} from "../billing.service";
import { billingRedirectUrls, openHostedCheckout, openHostedPortal } from "../open-hosted-checkout";

type PlanOption = {
	code: PlanCode;
	label: string;
	tagline: string;
	monthly: number;
	features: string[];
	recommended?: boolean;
};

const PLANS: PlanOption[] = [
	{
		code: "team",
		label: "Team",
		tagline: "For small crews shipping the starter into production.",
		monthly: 49,
		recommended: true,
		features: ["Up to 5 workspaces", "Shared UI + Nest spine", "Email support", "Cancel anytime"],
	},
	{
		code: "enterprise",
		label: "Enterprise",
		tagline: "More seats, priority support, and onboarding help.",
		monthly: 399,
		features: [
			"Higher workspace limits",
			"Priority support",
			"Guided onboarding",
			"Invoice-friendly billing",
		],
	},
];

const PROVIDER_COPY: Record<PaymentProviderName, { label: string; hint: string }> = {
	stripe: { label: "Stripe", hint: "Cards worldwide · hosted checkout" },
	razorpay: { label: "Razorpay", hint: "India-friendly · UPI & cards" },
};

function yearlyMonthly(monthly: number): number {
	return Math.round((monthly * 10) / 12);
}

function formatMoney(amount: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(amount);
}

export function BillingScreen() {
	const { token, user } = useAuth();
	const [providers, setProviders] = useState<PaymentProviderName[]>([]);
	const [provider, setProvider] = useState<PaymentProviderName>("stripe");
	const [planCode, setPlanCode] = useState<PlanCode>("team");
	const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
	const [subscription, setSubscription] = useState<SubscriptionView>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [ready, setReady] = useState(false);

	const loadBilling = useCallback(async () => {
		if (!token) return;
		try {
			const [providerResult, subscriptionResult] = await Promise.all([
				billingService.listProviders(token),
				billingService.getSubscription(token),
			]);
			setProviders(providerResult.providers);
			if (providerResult.providers[0]) {
				setProvider(providerResult.providers[0]);
			}
			const next = subscriptionResult.subscription;
			setSubscription(next);
			if (next?.planCode === "team" || next?.planCode === "enterprise") {
				setPlanCode(next.planCode);
			}
			if (next?.billingInterval === "monthly" || next?.billingInterval === "yearly") {
				setBillingInterval(next.billingInterval);
			}
			if (next?.provider === "stripe" || next?.provider === "razorpay") {
				setProvider(next.provider);
			}
			setError(null);
		} catch (err) {
			setProviders([]);
			setError(err instanceof Error ? err.message : "Could not load billing");
		} finally {
			setReady(true);
		}
	}, [token]);

	useEffect(() => {
		// oxlint-disable-next-line react/set-state-in-effect
		void loadBilling();
	}, [loadBilling]);

	if (!user) return null;

	const selectedPlan = PLANS.find((plan) => plan.code === planCode) ?? PLANS[0];
	const displayPrice =
		billingInterval === "yearly" ? yearlyMonthly(selectedPlan.monthly) : selectedPlan.monthly;
	const billedToday =
		billingInterval === "yearly" ? selectedPlan.monthly * 10 : selectedPlan.monthly;
	const canManageStripe = subscription?.provider === "stripe";
	const checkoutDisabled = busy || providers.length === 0 || !token;

	const startCheckout = async () => {
		if (!token) return;
		setBusy(true);
		setError(null);
		try {
			const redirects = billingRedirectUrls();
			const result = await billingService.createCheckout(token, {
				provider,
				planCode,
				billingInterval,
				successUrl: redirects.successUrl,
				cancelUrl: redirects.cancelUrl,
			});
			const outcome = await openHostedCheckout(result.checkoutUrl);
			if (outcome === "success") {
				await loadBilling();
				router.replace("/(modules)/(profile)/billing-success");
			} else if (outcome === "cancel") {
				router.replace("/(modules)/(profile)/billing-cancel");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Checkout failed");
		} finally {
			setBusy(false);
		}
	};

	const openPortal = async () => {
		if (!token) return;
		setBusy(true);
		setError(null);
		try {
			const redirects = billingRedirectUrls();
			const result = await billingService.createPortal(token, {
				provider: "stripe",
				returnUrl: redirects.returnUrl,
			});
			await openHostedPortal(result.url);
			await loadBilling();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Billing portal unavailable");
		} finally {
			setBusy(false);
		}
	};

	return (
		<View className="flex-1 bg-zinc-950">
			<SafeAreaView edges={["top"]} className="flex-1">
				<OSHeader />
				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerClassName="pb-12"
					keyboardShouldPersistTaps="handled"
				>
					<View className="px-5 gap-4">
						<View className="gap-1.5 pt-2">
							<Text className="text-zinc-500 text-[11px] font-bold tracking-[1.2px]">ACCOUNT</Text>
							<Text className="text-white text-[28px] font-bold tracking-tight">Billing</Text>
							<Text className="text-zinc-400 text-sm leading-5 max-w-[360px]">
								Upgrade when you need team seats or managed support. Starter stays free to clone and
								run.
							</Text>
						</View>

						<AccountTabs active="billing" />

						{!ready ? (
							<View className="items-center gap-3 py-12">
								<ActivityIndicator color={NeonColors.accent.green} />
								<Text className="text-zinc-400 text-sm">Loading billing…</Text>
							</View>
						) : (
							<>
								{error ? <AuthAlert message={error} variant="destructive" /> : null}

								<SubscriptionBanner
									subscription={subscription}
									onManage={openPortal}
									busy={busy}
									canManage={canManageStripe}
								/>

								<NeonCard className="gap-0">
									<View className="gap-3 mb-4">
										<View className="gap-1">
											<Text className="text-white text-base font-bold">Plan</Text>
											<Text className="text-zinc-400 text-[13px] leading-5 mt-1">
												Select what you want after checkout.
											</Text>
										</View>
										<IntervalToggle value={billingInterval} onChange={setBillingInterval} />
									</View>

									<View className="gap-3">
										{PLANS.map((plan) => {
											const selected = planCode === plan.code;
											const price =
												billingInterval === "yearly" ? yearlyMonthly(plan.monthly) : plan.monthly;
											return (
												<Pressable
													key={plan.code}
													onPress={() => setPlanCode(plan.code)}
													className={`rounded-2xl border p-4 gap-2 ${
														selected
															? "border-emerald-500/50 bg-emerald-500/10"
															: "border-zinc-800 bg-zinc-900/40"
													}`}
												>
													<View className="flex-row items-center justify-between gap-2">
														<Text className="text-white text-base font-bold">{plan.label}</Text>
														{plan.recommended ? (
															<View className="rounded-lg px-2 py-0.5 bg-emerald-500/20">
																<Text className="text-emerald-400 text-[11px] font-bold">
																	Popular
																</Text>
															</View>
														) : null}
													</View>
													<Text className="text-white text-2xl font-bold">
														{formatMoney(price)}
														<Text className="text-sm font-medium text-zinc-400">/mo</Text>
													</Text>
													{billingInterval === "yearly" ? (
														<Text className="text-zinc-500 text-xs">
															Billed {formatMoney(plan.monthly * 10)}/yr · 2 months free
														</Text>
													) : (
														<Text className="text-zinc-500 text-xs">Billed monthly</Text>
													)}
													<Text className="text-zinc-400 text-[13px] leading-5 mb-1">
														{plan.tagline}
													</Text>
													{plan.features.map((feature) => (
														<View key={feature} className="flex-row items-center gap-2">
															<CheckCircle2
																size={14}
																color={NeonColors.accent.green}
																strokeWidth={2}
															/>
															<Text className="text-zinc-400 text-[13px] flex-1">{feature}</Text>
														</View>
													))}
												</Pressable>
											);
										})}
									</View>
								</NeonCard>

								<NeonCard className="gap-0">
									<Text className="text-white text-base font-bold">Payment method</Text>
									<Text className="text-zinc-400 text-[13px] leading-5 mt-1">
										{providers.length > 1
											? "Same plan price — pick where payment is processed."
											: providers.length === 1
												? `Checkout opens in your browser via ${PROVIDER_COPY[provider].label}.`
												: "Configure a payment provider on the API to enable checkout."}
									</Text>
									{providers.length === 0 ? (
										<View className="mt-3.5">
											<AuthAlert
												title="Checkout not configured"
												message="Add Stripe and/or Razorpay keys to the Nest API, then reopen this screen."
												variant="info"
											/>
										</View>
									) : (
										<View className="gap-2.5 mt-3.5">
											{providers.map((name) => {
												const selected = provider === name;
												const copy = PROVIDER_COPY[name];
												const selectable = providers.length > 1;
												return (
													<Pressable
														key={name}
														onPress={() => {
															if (selectable) setProvider(name);
														}}
														disabled={!selectable}
														className={`rounded-xl border p-3.5 gap-1 ${
															selected
																? "border-emerald-500/50 bg-emerald-500/10"
																: "border-zinc-800 bg-zinc-900/40"
														}`}
													>
														<CreditCard
															size={18}
															color={selected ? NeonColors.accent.green : NeonColors.text.secondary}
														/>
														<Text className="text-white text-[15px] font-bold mt-1">
															{copy.label}
														</Text>
														<Text className="text-zinc-400 text-xs">{copy.hint}</Text>
													</Pressable>
												);
											})}
										</View>
									)}
								</NeonCard>

								<NeonCard className="gap-0">
									<Text className="text-white text-base font-bold">Checkout</Text>
									<Text className="text-zinc-400 text-[13px] mt-2 mb-3.5">
										{selectedPlan.label} · {formatMoney(displayPrice)}/mo
										{billingInterval === "yearly"
											? ` · ${formatMoney(billedToday)} billed today`
											: ""}
									</Text>
									<AuthButton
										label={
											busy ? "Opening checkout…" : `Continue with ${PROVIDER_COPY[provider].label}`
										}
										onPress={() => {
											void startCheckout();
										}}
										pending={busy}
										disabled={checkoutDisabled}
									/>
								</NeonCard>
							</>
						)}
					</View>
				</ScrollView>
			</SafeAreaView>
		</View>
	);
}

function SubscriptionBanner({
	subscription,
	onManage,
	busy,
	canManage,
}: {
	subscription: SubscriptionView;
	onManage: () => void;
	busy: boolean;
	canManage: boolean;
}) {
	if (!subscription) {
		return (
			<NeonCard className="gap-0">
				<Text className="text-white text-base font-bold">Current plan</Text>
				<Text className="text-zinc-400 text-[13px] leading-5 mt-1">
					School OS (free). Upgrade below when you need seats.
				</Text>
			</NeonCard>
		);
	}

	const periodEnd = subscription.currentPeriodEnd
		? new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, {
				year: "numeric",
				month: "short",
				day: "numeric",
			})
		: null;

	return (
		<NeonCard className="gap-0">
			<Text className="text-white text-base font-bold">Current plan</Text>
			<Text className="text-white text-[15px] font-semibold mt-1.5 capitalize">
				{subscription.planCode} · {subscription.status}
				{subscription.billingInterval ? ` · ${subscription.billingInterval}` : ""}
			</Text>
			{periodEnd ? (
				<Text className="text-zinc-400 text-[13px] leading-5 mt-1">
					{subscription.cancelAtPeriodEnd ? "Ends" : "Renews"} {periodEnd}
				</Text>
			) : null}
			{canManage ? (
				<AuthButton label="Manage in Stripe" variant="outline" onPress={onManage} pending={busy} />
			) : null}
		</NeonCard>
	);
}

function IntervalToggle({
	value,
	onChange,
}: {
	value: BillingInterval;
	onChange: (next: BillingInterval) => void;
}) {
	return (
		<View className="flex-row gap-1.5 self-start p-1 rounded-xl border border-zinc-800 bg-zinc-900/60">
			{(["monthly", "yearly"] as const).map((interval) => {
				const active = value === interval;
				return (
					<Pressable
						key={interval}
						onPress={() => onChange(interval)}
						className={`px-3 py-1.5 rounded-lg ${active ? "bg-emerald-500/20" : ""}`}
					>
						<Text
							className={`text-xs font-semibold ${active ? "text-emerald-400" : "text-zinc-400"}`}
						>
							{interval === "monthly" ? "Monthly" : "Yearly"}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

export function BillingResultScreen({ variant }: { variant: "success" | "cancel" }) {
	const success = variant === "success";
	return (
		<View className="flex-1 bg-zinc-950">
			<SafeAreaView edges={["top"]} className="flex-1">
				<OSHeader />
				<View className="flex-1 px-5 justify-center">
					<NeonCard className="items-center gap-2">
						{success ? (
							<CheckCircle2 size={40} color={NeonColors.accent.green} strokeWidth={2} />
						) : (
							<XCircle size={40} color={NeonColors.accent.orange} strokeWidth={2} />
						)}
						<Text className="text-zinc-500 text-[11px] font-bold tracking-[1.2px]">BILLING</Text>
						<Text className="text-white text-[28px] font-bold tracking-tight text-center">
							{success ? "Payment received" : "Checkout cancelled"}
						</Text>
						<Text className="text-zinc-400 text-sm leading-5 max-w-[360px] text-center">
							{success
								? "Your subscription activates once the provider webhook confirms it — usually within a few seconds."
								: "No charge was made. You can return to billing and try again whenever you are ready."}
						</Text>
						<AuthButton
							label="View billing"
							onPress={() => router.replace("/(modules)/(profile)/billing")}
						/>
					</NeonCard>
				</View>
			</SafeAreaView>
		</View>
	);
}
