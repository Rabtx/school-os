import { Home01Icon, Mail01Icon, Search01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { MobileBottomBar, MobileBottomBarItem } from "@school-os/ui/components/mobile";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
	MobileMotionButton,
	MobileNotTypeset,
	MobileTypeset,
	MobileTypesetBlockquote,
	MobileTypesetHeading,
	MobileTypesetParagraph,
	MobileTypesetScroll,
	MotionInput,
	MotionSelect,
	MotionTabs,
	MotionTabsContent,
	MotionTabsList,
	MotionTabsTrigger,
} from "../../modules/ui";

const BOTTOM_BAR_CODE_EXAMPLE = `import { MobileBottomBar, MobileBottomBarItem } from "@school-os/ui/components/mobile";

export function GlassBottomBarDemo() {
  const [active, setActive] = useState("home");
  return (
    <MobileBottomBar
      value={active}
      onValueChange={setActive}
      switchScaleY={1.30}
      switchScaleX={1.15}
      stiffness={190}
      damping={18}
      glassOpacity={10}
      borderOpacity={40}
    >
      <MobileBottomBarItem value="home">Home</MobileBottomBarItem>
      <MobileBottomBarItem value="explore">Explore</MobileBottomBarItem>
      <MobileBottomBarItem value="profile">Profile</MobileBottomBarItem>
    </MobileBottomBar>
  );
}`;

const TABS_CODE_EXAMPLE = `import { MotionTabs } from "@school-os/ui/components/mobile";`;
const BUTTON_CODE_EXAMPLE = `import { MobileMotionButton } from "@school-os/ui/components/mobile";`;
const INPUT_CODE_EXAMPLE = `import { MobileMotionInput } from "@school-os/ui/components/mobile";`;
const SELECT_CODE_EXAMPLE = `import { MobileMotionSelect } from "@school-os/ui/components/mobile";`;
const TYPESET_CODE_EXAMPLE = `import { MobileTypeset, MobileTypesetHeading, MobileTypesetParagraph } from "@school-os/ui/components/mobile";`;

export default function ComponentSlugScreen() {
	const { slug = "tabs" } = useLocalSearchParams<{ slug: string }>();
	const [activePlatformView, setActivePlatformView] = useState<"preview" | "code">("preview");

	const [bottomBarTab, setBottomBarTab] = useState("home");
	const [emailVal, setEmailVal] = useState("shabir@school-os.dev");
	const [roleSelect, setRoleSelect] = useState("admin");

	// MOBILE STUDIO CONTROL PARAMETERS
	const [switchScaleY, setSwitchScaleY] = useState(1.3);
	const [switchScaleX, setSwitchScaleX] = useState(1.15);
	const [stiffness, setStiffness] = useState(190);
	const [damping, setDamping] = useState(18);
	const [glassOpacity, setGlassOpacity] = useState(10);
	const [borderOpacity, setBorderOpacity] = useState(40);

	const [mobileTypesetPreset, setMobileTypesetPreset] = useState<"docs" | "chat" | "reading">(
		"docs",
	);

	const title =
		slug === "bottom-bar"
			? "Liquid Glass Bottom Bar"
			: slug === "typeset"
				? "Typeset"
				: slug === "select"
					? "Motion Select"
					: slug === "input"
						? "Motion Input"
						: slug === "button"
							? "Motion Button"
							: "Motion Tabs";

	return (
		<SafeAreaView className="flex-1 bg-zinc-950">
			<ScrollView className="p-5">
				<View className="mb-4">
					<Text className="text-xs font-bold text-teal-400 font-mono uppercase tracking-widest mb-1">
						{slug === "typeset" ? "TYPOGRAPHY SYSTEM" : "MOTION COMPONENT"}
					</Text>
					<Text className="text-2xl font-bold text-white">{title}</Text>
				</View>

				{/* TAB PICKER: PREVIEW VS CODE */}
				<View className="flex-row border-b border-zinc-800 mb-5">
					<Text
						onPress={() => setActivePlatformView("preview")}
						className={`pb-2.5 px-4 text-xs font-semibold ${
							activePlatformView === "preview"
								? "text-white border-b-2 border-teal-500"
								: "text-zinc-500"
						}`}
					>
						Interactive Preview
					</Text>
					<Text
						onPress={() => setActivePlatformView("code")}
						className={`pb-2.5 px-4 text-xs font-semibold ${
							activePlatformView === "code"
								? "text-white border-b-2 border-teal-500"
								: "text-zinc-500"
						}`}
					>
						Source Code
					</Text>
				</View>

				{activePlatformView === "preview" ? (
					<View className="gap-6 pb-12">
						{slug === "bottom-bar" ? (
							<View className="gap-6">
								<View className="gap-6 rounded-3xl overflow-hidden relative border border-white/20 p-6 items-center min-h-[240px] justify-center">
									<LinearGradient
										colors={["#2e1065", "#09090b", "#042f2e"]}
										start={{ x: 0, y: 0 }}
										end={{ x: 1, y: 1 }}
										style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
									/>
									<View className="absolute top-2 left-4 w-32 h-32 rounded-full bg-purple-500/30 blur-2xl" />
									<View className="absolute bottom-2 right-4 w-32 h-32 rounded-full bg-teal-500/30 blur-2xl" />

									<Text className="text-sm font-semibold text-white text-center z-10">
										Aave Glass Metamorphic Lens
									</Text>

									<MobileBottomBar
										value={bottomBarTab}
										onValueChange={setBottomBarTab}
										switchScaleY={switchScaleY}
										switchScaleX={switchScaleX}
										stiffness={stiffness}
										damping={damping}
										glassOpacity={glassOpacity}
										borderOpacity={borderOpacity}
										className="z-10"
									>
										<MobileBottomBarItem
											value="home"
											icon={
												<HugeiconsIcon
													icon={Home01Icon}
													size={16}
													color={bottomBarTab === "home" ? "#ffffff" : "#a1a1aa"}
												/>
											}
										>
											Home
										</MobileBottomBarItem>
										<MobileBottomBarItem
											value="explore"
											icon={
												<HugeiconsIcon
													icon={Search01Icon}
													size={16}
													color={bottomBarTab === "explore" ? "#ffffff" : "#a1a1aa"}
												/>
											}
										>
											Explore
										</MobileBottomBarItem>
										<MobileBottomBarItem
											value="profile"
											icon={
												<HugeiconsIcon
													icon={UserIcon}
													size={16}
													color={bottomBarTab === "profile" ? "#ffffff" : "#a1a1aa"}
												/>
											}
										>
											Profile
										</MobileBottomBarItem>
									</MobileBottomBar>
								</View>

								{/* CATEGORY 1: PHYSICS ANIMATION CONTROLS */}
								<View className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl gap-3">
									<Text className="text-xs font-bold text-teal-400 font-mono uppercase tracking-wider">
										1. Physics Animation Controls
									</Text>

									<View className="gap-1.5">
										<View className="flex-row justify-between">
											<Text className="text-xs text-zinc-300">Height Expansion (scaleY)</Text>
											<Text className="text-xs font-mono text-teal-400">
												{switchScaleY.toFixed(2)}x
											</Text>
										</View>
										<View className="flex-row gap-2">
											{[1.1, 1.25, 1.35, 1.5].map((v) => (
												<Pressable
													key={v}
													onPress={() => setSwitchScaleY(v)}
													className={`px-3 py-1 rounded-lg border ${
														switchScaleY === v
															? "bg-teal-500/20 border-teal-500 text-teal-300"
															: "bg-zinc-800 border-zinc-700 text-zinc-400"
													}`}
												>
													<Text className="text-xs font-mono text-white">{v}x</Text>
												</Pressable>
											))}
										</View>
									</View>

									<View className="gap-1.5">
										<View className="flex-row justify-between">
											<Text className="text-xs text-zinc-300">Width Expansion (scaleX)</Text>
											<Text className="text-xs font-mono text-teal-400">
												{switchScaleX.toFixed(2)}x
											</Text>
										</View>
										<View className="flex-row gap-2">
											{[1.05, 1.15, 1.25, 1.35].map((v) => (
												<Pressable
													key={v}
													onPress={() => setSwitchScaleX(v)}
													className={`px-3 py-1 rounded-lg border ${
														switchScaleX === v
															? "bg-teal-500/20 border-teal-500 text-teal-300"
															: "bg-zinc-800 border-zinc-700 text-zinc-400"
													}`}
												>
													<Text className="text-xs font-mono text-white">{v}x</Text>
												</Pressable>
											))}
										</View>
									</View>

									<View className="gap-1.5">
										<View className="flex-row justify-between">
											<Text className="text-xs text-zinc-300">Spring Stiffness / Damping</Text>
											<Text className="text-xs font-mono text-teal-400">
												{stiffness} / {damping}
											</Text>
										</View>
										<View className="flex-row gap-2">
											{[
												{ s: 120, d: 12, label: "Fluid" },
												{ s: 190, d: 18, label: "Medium" },
												{ s: 300, d: 24, label: "Snappy" },
											].map((p) => (
												<Pressable
													key={p.label}
													onPress={() => {
														setStiffness(p.s);
														setDamping(p.d);
													}}
													className={`px-3 py-1 rounded-lg border ${
														stiffness === p.s
															? "bg-teal-500/20 border-teal-500 text-teal-300"
															: "bg-zinc-800 border-zinc-700 text-zinc-400"
													}`}
												>
													<Text className="text-xs text-white">{p.label}</Text>
												</Pressable>
											))}
										</View>
									</View>
								</View>

								{/* CATEGORY 2: GLASS OPTICS CONTROLS */}
								<View className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl gap-3">
									<Text className="text-xs font-bold text-teal-400 font-mono uppercase tracking-wider">
										2. Glass Optics & Sheen Controls
									</Text>

									<View className="gap-1.5">
										<View className="flex-row justify-between">
											<Text className="text-xs text-zinc-300">Glass Lens Opacity</Text>
											<Text className="text-xs font-mono text-teal-400">{glassOpacity}%</Text>
										</View>
										<View className="flex-row gap-2">
											{[5, 10, 20, 30].map((v) => (
												<Pressable
													key={v}
													onPress={() => setGlassOpacity(v)}
													className={`px-3 py-1 rounded-lg border ${
														glassOpacity === v
															? "bg-teal-500/20 border-teal-500 text-teal-300"
															: "bg-zinc-800 border-zinc-700 text-zinc-400"
													}`}
												>
													<Text className="text-xs font-mono text-white">{v}%</Text>
												</Pressable>
											))}
										</View>
									</View>

									<View className="gap-1.5">
										<View className="flex-row justify-between">
											<Text className="text-xs text-zinc-300">Lens Border Rim Highlight</Text>
											<Text className="text-xs font-mono text-teal-400">{borderOpacity}%</Text>
										</View>
										<View className="flex-row gap-2">
											{[20, 40, 60, 80].map((v) => (
												<Pressable
													key={v}
													onPress={() => setBorderOpacity(v)}
													className={`px-3 py-1 rounded-lg border ${
														borderOpacity === v
															? "bg-teal-500/20 border-teal-500 text-teal-300"
															: "bg-zinc-800 border-zinc-700 text-zinc-400"
													}`}
												>
													<Text className="text-xs font-mono text-white">{v}%</Text>
												</Pressable>
											))}
										</View>
									</View>
								</View>
							</View>
						) : slug === "typeset" ? (
							<View className="gap-4">
								<View className="flex-row gap-2 mb-2">
									{(["docs", "chat", "reading"] as const).map((p) => (
										<Text
											key={p}
											onPress={() => setMobileTypesetPreset(p)}
											className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase font-mono ${
												mobileTypesetPreset === p
													? "bg-teal-500/20 text-teal-400 border border-teal-500/40"
													: "bg-zinc-900 text-zinc-400 border border-zinc-800"
											}`}
										>
											{p}
										</Text>
									))}
								</View>

								<MobileTypeset preset={mobileTypesetPreset}>
									<MobileTypesetHeading level={1}>Typeset Mobile System</MobileTypesetHeading>
									<MobileTypesetParagraph>
										Typeset delivers container rhythm controls with append stability.
									</MobileTypesetParagraph>
									<MobileTypesetBlockquote>
										"Three controls: size, leading, and flow."
									</MobileTypesetBlockquote>
									<MobileTypesetScroll>
										<View className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 my-2">
											<Text className="text-xs text-teal-400 font-mono">
												Horizontal Scroll Table
											</Text>
										</View>
									</MobileTypesetScroll>
									<MobileNotTypeset className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 mt-4">
										<Text className="text-xs font-semibold text-white">
											Opted out interactive container
										</Text>
									</MobileNotTypeset>
								</MobileTypeset>
							</View>
						) : slug === "select" ? (
							<View className="gap-4">
								<MotionSelect
									label="Role Selector"
									value={roleSelect}
									onValueChange={setRoleSelect}
									options={[
										{ label: "Admin", value: "admin" },
										{ label: "Developer", value: "dev" },
										{ label: "Viewer", value: "viewer" },
									]}
								/>
							</View>
						) : slug === "input" ? (
							<View className="gap-4">
								<MotionInput
									label="Verified Email"
									value={emailVal}
									onChangeText={setEmailVal}
									success
									leftIcon={<HugeiconsIcon icon={Mail01Icon} size={18} />}
								/>
							</View>
						) : slug === "button" ? (
							<View className="gap-4 items-center">
								<MobileMotionButton variant="primary">Primary Button</MobileMotionButton>
							</View>
						) : (
							<View className="gap-4">
								<MotionTabs defaultValue="overview" variant="pill">
									<MotionTabsList>
										<MotionTabsTrigger value="overview">Overview</MotionTabsTrigger>
										<MotionTabsTrigger value="analytics">Analytics</MotionTabsTrigger>
									</MotionTabsList>
									<MotionTabsContent value="overview">
										<View className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 mt-3">
											<Text className="text-xs text-white">Overview Content</Text>
										</View>
									</MotionTabsContent>
								</MotionTabs>
							</View>
						)}
					</View>
				) : (
					<View className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
						<Text className="text-xs font-mono text-teal-400 leading-relaxed">
							{slug === "bottom-bar"
								? BOTTOM_BAR_CODE_EXAMPLE
								: slug === "typeset"
									? TYPESET_CODE_EXAMPLE
									: slug === "select"
										? SELECT_CODE_EXAMPLE
										: slug === "input"
											? INPUT_CODE_EXAMPLE
											: slug === "button"
												? BUTTON_CODE_EXAMPLE
												: TABS_CODE_EXAMPLE}
						</Text>
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}
