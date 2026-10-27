// Ambient types for Uniwind React Native className styling across workspace boundaries
/// <reference types="uniwind/types" />

import type {
	ImageProps,
	PressableProps,
	ScrollViewProps,
	TextInputProps,
	TextProps,
	TouchableOpacityProps,
	ViewProps,
} from "react-native";
import type { AnimatedProps } from "react-native-reanimated";

declare module "react-native" {
	interface ViewProps {
		className?: string;
	}
	interface TextProps {
		className?: string;
	}
	interface TextInputProps {
		className?: string;
	}
	interface PressableProps {
		className?: string;
	}
	interface ScrollViewProps {
		className?: string;
	}
	interface ImageProps {
		className?: string;
	}
	interface TouchableOpacityProps {
		className?: string;
	}
}

declare module "react-native-reanimated" {
	interface AnimatedProps<P> {
		className?: string;
	}
}
