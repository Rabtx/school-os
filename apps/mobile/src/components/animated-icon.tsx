import { Image } from "expo-image";
import { useState } from "react";
import { Dimensions, View } from "react-native";
import Animated, { Easing, Keyframe } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const INITIAL_SCALE_FACTOR = Dimensions.get("screen").height / 90;
const DURATION = 600;

export function AnimatedSplashOverlay() {
	const [visible, setVisible] = useState(true);

	if (!visible) return null;

	const splashKeyframe = new Keyframe({
		0: {
			transform: [{ scale: INITIAL_SCALE_FACTOR }],
			opacity: 1,
		},
		20: {
			opacity: 1,
		},
		70: {
			opacity: 0,
			easing: Easing.elastic(0.7),
		},
		100: {
			opacity: 0,
			transform: [{ scale: 1 }],
			easing: Easing.elastic(0.7),
		},
	});

	return (
		<Animated.View
			entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
				"worklet";
				if (finished) {
					scheduleOnRN(setVisible, false);
				}
			})}
			className="absolute inset-0 bg-[#208AEF] z-[1000]"
		/>
	);
}

const keyframe = new Keyframe({
	0: {
		transform: [{ scale: INITIAL_SCALE_FACTOR }],
	},
	100: {
		transform: [{ scale: 1 }],
		easing: Easing.elastic(0.7),
	},
});

const logoKeyframe = new Keyframe({
	0: {
		transform: [{ scale: 1.3 }],
		opacity: 0,
	},
	40: {
		transform: [{ scale: 1.3 }],
		opacity: 0,
		easing: Easing.elastic(0.7),
	},
	100: {
		opacity: 1,
		transform: [{ scale: 1 }],
		easing: Easing.elastic(0.7),
	},
});

const glowKeyframe = new Keyframe({
	0: {
		transform: [{ rotateZ: "0deg" }],
	},
	100: {
		transform: [{ rotateZ: "7200deg" }],
	},
});

export function AnimatedIcon() {
	return (
		<View className="justify-center items-center w-32 h-32 z-[100]">
			<Animated.View
				entering={glowKeyframe.duration(60 * 1000 * 4)}
				className="w-[201px] h-[201px] absolute"
			>
				<Image
					className="w-[201px] h-[201px] absolute"
					source={require("@/assets/images/logo-glow.png")}
				/>
			</Animated.View>

			<Animated.View
				entering={keyframe.duration(DURATION)}
				className="rounded-[40px] w-32 h-32 absolute"
				style={{ experimental_backgroundImage: `linear-gradient(180deg, #3C9FFE, #0274DF)` } as any}
			/>
			<Animated.View
				className="justify-center items-center"
				entering={logoKeyframe.duration(DURATION)}
			>
				<Image
					className="absolute w-[76px] h-[71px]"
					source={require("@/assets/images/expo-logo.png")}
				/>
			</Animated.View>
		</View>
	);
}
