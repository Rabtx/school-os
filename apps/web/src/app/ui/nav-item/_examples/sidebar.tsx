import { NavItem, NavSection } from "@rabtx/ui/nav-item";

const dot = (color: string) => (
	<span aria-hidden="true" className="size-3 rounded-[3px]" style={{ background: color }} />
);

export default function NavItemSidebar() {
	return (
		<nav aria-label="Example sidebar" className="w-60 space-y-3 rounded-xl bg-(--rx-subtle) p-2">
			<NavSection heading="Primary">
				<li>
					<NavItem
						href="#approvals"
						label="Approvals"
						icon={dot("var(--rx-accent)")}
						count={12}
						countTone="accent"
					/>
				</li>
				<li>
					<NavItem
						href="#messages"
						label="Messages"
						icon={dot("var(--rx-danger)")}
						count={3}
						countTone="danger"
					/>
				</li>
			</NavSection>
			<NavSection heading="Classes">
				<li>
					<NavItem href="#7b" label="Class 7-B" icon={dot("var(--rx-success)")} count={32} active />
				</li>
				<li>
					<NavItem href="#8a" label="Class 8-A" icon={dot("var(--rx-violet)")} count={31} />
				</li>
				<li>
					<NavItem href="#8b" label="Class 8-B" icon={dot("var(--rx-accent)")} count={0} />
				</li>
			</NavSection>
		</nav>
	);
}
