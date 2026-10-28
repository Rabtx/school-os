import type { HTMLAttributes } from "react";
import { type AvatarSize, type AvatarTone, avatarClass, initials } from "./avatar.styles";

export type AvatarProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
	/** The person or thing the initials come from. */
	name: string;
	tone?: AvatarTone;
	size?: AvatarSize;
};

/**
 * Round initials. It is decorative: the name always sits next to it, so it is hidden from screen
 * readers.
 */
export function Avatar({ name, tone, size, className, ...rest }: AvatarProps) {
	return (
		<span aria-hidden="true" {...rest} className={`${avatarClass(tone, size)} ${className ?? ""}`}>
			{initials(name)}
		</span>
	);
}
