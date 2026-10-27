# Design System Brief

This file is the source of truth for AI agents and humans when creating UI in School OS.
Keep it updated before generating new screens with Codex, Claude Code, Cursor, v0, Open Design,
Figma MCP, Onlook, Scamp, or similar tools.

## Product Intent

School OS is a **trust engine for schools**: smart attendance at the gate, instant WhatsApp alerts
to parents, and an AI layer that drafts while people approve. Generated UI must feel
domain-specific (school operations, not generic SaaS), accessible, responsive, and built from
reusable components. Every AI action has a manual path; the product works with AI turned off.

## Audience

- The six roles in the product: owner, principal, admin, teacher, student and parent (parents use
  the phone app only).
- Developers and designers working on School OS with AI tools.
- AI coding agents implementing UI from product briefs, Figma frames, or design-system prompts.

## Visual Principles

- Prefer clear hierarchy over decoration.
- Prefer operational density for dashboards, admin panels, and internal tools.
- Prefer calm, readable surfaces for documentation and product workflows.
- Avoid generic SaaS hero sections inside actual applications.
- Avoid decorative blobs, background glows, unnecessary nested cards, and one-note purple/blue gradients.
  Glass is an intentional `kind` described below, not a default page decoration.
- Use real state design: loading, empty, error, disabled, hover, focus-visible, selected, saving,
  success, and permission denied.

## School OS design source

Decision (owner, 2026-10-27): **follow the School OS Figma file.** Where this document and that
file disagree on a visual decision, Figma wins.

- File: `School OS`, key `fD9WERKwofFmMtjGC0K46P`
  (`https://www.figma.com/design/fD9WERKwofFmMtjGC0K46P`). It is built on the rabtx design system
  below and uses the same token names.
- Pages: Cover (`0:1`), Principal (`212:33176`), Teacher (`212:33177`), Student (`212:33178`),
  Owner (`212:33179`), Parent (`212:33180`, the phone app, light and dark), Shared (`212:33181`,
  sign in and onboarding), Forms (`273:4606`, the Guided and Sheet patterns), Prototype
  (`67:84823`), Masters (`67:41012`, edit screens here), Mobile on hold (`77:136486`) and
  Product map (`100:4538`, roles, AI layer and modules).
- Each role page groups screens into sections: daily screens, actions and forms, states (loading,
  empty, offline, success and undo, confirm, bulk select, notifications, command search, no access,
  "AI is not sure"), profile and settings. Build a screen from its frame on the role page and record
  the node ID on the card.
- **Web is dark first** (every web frame is dark); the app defaults to dark and keeps a light mode.
  The Parent phone app is drawn in both.
- **Type:** SF Pro (12/16, 13/20, 14/20, 24/32; regular 400, medium 510; letter spacing -0.15) and
  Geist Mono for numbers, codes and labels. SF Pro can only be used on Apple platforms, so the web
  font stack is SF Pro on Apple devices and Inter elsewhere.
- **Depth:** the School OS screens draw soft cast shadows (`Depth/Primary`, `Depth/Soft`,
  `Shadow/sm`, light `depth/md`). These are now part of the Floating depth mode (see "Radius, depth
  and kind"); Flat removes them.

Tokens read from the file (dark from the web screens, light from the Parent app and light forms):

| Token | Light | Dark |
| --- | --- | --- |
| app (page) | `#ffffff` (canvas `#f5f5f5`) | `#141414` |
| surface (cards, tables) | `#ffffff` | `#212121` |
| subtle (sidebar) | `#fafafa` | `#1b1b1b` |
| selected / pressed | `#ebebeb` / `#f2f2f2` | `#292929` / `#303030` |
| border / strong | `#f2f2f2` / `#e3e3e3` | `#303030` / `#3d3d3d` |
| text / secondary / tertiary | `#292929` / `#5d5d5d` / `#9e9e9e` | `#ebebeb` / `#a3a3a3` / `#7f7f7f` |
| accent / hover / subtle | `#2d7cf6` / `#1f66db` / `#eaf2fe` | `#2d7cf6` / `#5b9bf8` / `#0b2144` |
| success / warning / violet / danger | `#30a46c` / `#f0803c` / `#8e5cf0` / `#e5484d` | `#4bbe88` / `#f5985c` / `#8e5cf0` / `#f0686d` |
| field | `#f5f5f5` | `#141414` |

These live in `packages/rabtx/src/styles/tokens.css`. The web app's shadcn and dashboard variables
(`apps/web/src/app/globals.css`) point at them, so existing screens pick up the School OS palette,
radius and type while they are rebuilt screen by screen on `@rabtx/ui`.

## Rabtx UI: shared design intent

This section records the owner's locked direction. Use it when another agent or session takes
on a component. Existing code is an implementation to assess, not proof that the design is finished.

### Direction (locked 2026-10-07)

`@rabtx/ui` is being rebuilt from scratch, one component at a time. It is not a styled layer over
shadcn and it does not inherit `@school-os/ui`'s components.

- **Design source:** the School OS Figma file (above) for product screens and the rabtx design
  system in Figma (see Figma source below) for components. Where this file and Figma disagree on a
  visual decision, Figma wins. Depth has two modes (Flat and Floating), not three: Floating includes
  the soft cast shadows School OS draws. Record the component's Figma node ID on its card.
- **No animation library.** Motion is CSS only on the web (see Motion). Do not add `motion`,
  `framer-motion`, GSAP or similar. JavaScript may set state (an attribute, a CSS variable) but the
  animation itself lives in CSS.
- **shadcn is kept only for its CLI** (`components.json`, registry and add-component workflow). Its
  component code is not the foundation and is replaced component by component.
- **Tailwind CSS stays** as the styling system, on the shared tokens.
- **Icons are HugeIcons only** (`@hugeicons/react` on web, `@hugeicons/react-native` on native), at
  the sizes the design uses. `lucide-react`, `lucide-react-native` and any other icon set are not
  used.
- **Two targets, one design language:** web components and real React Native/Expo components that
  share tokens, spring parameters and design intent, but not rendering code.
- **Clean components:** a component carries no per-style branching. Radius and depth come from token
  modes, and each `kind` is a ready-made set of classes applied only when selected.
- **Playground:** `apps/web` at `/ui` is the playground that showcases `@rabtx/ui`. It is rebuilt
  fresh; the earlier shadcn lab and the docs `/rabtx` preview pages are deleted.
- **Animation reference:** beUI (`https://beui.dev`; MCP server `https://mcp.beui.dev/mcp`).

### Figma source

File: `rabtx Design System`, key `en7xSFtcVYHkX7Iwo4hONQ`
(`https://www.figma.com/design/en7xSFtcVYHkX7Iwo4hONQ/rabtx-Design-System`). Pages: Cover (`0:1`),
Icons (`2:155`), Components (`2:156`). Each component is a `Section/<name>` frame on the Components
page; the node IDs below are for that frame.

Button `5:6`, Icon Button `5:191`, Input `6:14`, Checkbox `6:59`, Task Check `6:78`, Toggle `6:103`,
Badge `6:116`, Chip `6:139`, Nav Item `7:23`, Menu Item `7:46`, Kbd `7:179`, Avatar `7:185`,
Tab `7:202`, Tooltip `7:231`, Toast `7:238`, Status Icon `8:85`, Composer `8:104`, Dialog `8:162`,
Banner Card `8:194`, Kanban Card `9:139`, Kanban Column `9:174`, Table `9:235`, Top Bar `9:325`,
Sidebar `9:383`, Option Card `26:400`, Step Progress `26:425`, Field `26:436`, Mobile `27:419`,
App Icon `40:408`, Tag `42:441`, Progress Ring `42:516`, Shape & Depth `55:502`, Select `66:770`,
Textarea `66:783`, Radio `66:794`, Segmented Control `66:846`, Alert `67:751`,
Progress Bar `67:788`, Skeleton `67:802`, Empty State `67:851`, Command Palette `68:823`,
Pagination `68:877`, Breadcrumb `68:897`, Avatar Group `68:929`, Setting Row `69:823`,
Stat Card `69:860`, Plan Card `69:936`, Tool Call `112:893`, Diff Card `112:910`,
Approval Card `112:1010`, Inbox Row `113:993`, File Tree Item `113:1088`, Picker Row `113:1120`,
Grid Shell `113:12741`, Thread Status `128:1062`, Thread Row `128:1111`, PR Row `128:1224`,
Banner `129:17096`. Product-specific sections (Composer, Kanban, Tool Call, Diff, Approval,
Thread, PR, Inbox) are Grid app components, not part of the first library pass.

Tokens read from Figma so far, as a starting point; read each component's own variables before
building it:

- Names are `--color-*`, `--space-*`, `--radius-*`, `--size-*`.
- Radius 4, 6, 8, 12 and 999. Space 0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32.
- Control height 24 (sm), 28 (md), 36 (xl), 44 (2xl) and 48 (3xl); nav row height 28.
- Type is SF Pro at 12/16, 13/20, 14/20 and 18/26 (regular 400, medium 510), letter spacing -0.15.
- Dark colors: surface `#212121`, subtle `#1b1b1b`, pressed `#303030`, border `#303030` and strong
  `#3d3d3d`; text `#ebebeb`, `#a3a3a3`, `#7f7f7f`; accent `#2d7cf6`; danger `#f0686d`.
- Light colors (Button section): app and surface `#ffffff`, inverse `#1b1b1b` (hover `#292929`),
  pressed `#f2f2f2`, selected `#ebebeb`, border `#f2f2f2` and strong `#e3e3e3`; text `#292929`,
  `#5d5d5d`, `#9e9e9e`, disabled `#a3a3a3`; accent `#2d7cf6` (hover `#1f66db`); danger `#e5484d`.
- Button (`5:6`) is a matrix of style by size by state (default, hover, pressed, disabled). Styles:
  black primary, blue accent, hairline secondary, secondary, ghost and danger. It repeats for two
  radius modes (default and fully round) and two depth modes.

### Dependency policy

The goal is a clean, modern implementation, not zero dependencies. Component libraries became the
default mainly to get accessibility and interaction behavior that native HTML lacked. Modern
browsers now provide much of it, so prefer the platform first.

1. **Platform first (web).** Reach for native HTML and CSS before any package: `<dialog>`, the
   Popover API, `<details>`, `inert`, CSS anchor positioning, `:focus-visible`, `:has()`,
   `@starting-style`, `@property`, `linear()` easing, View Transitions and
   `prefers-reduced-motion`. Check each feature against the browser baseline the product supports
   before using it, and note that baseline on the component.
2. **Accessibility is not optional.** Keyboard operation, focus management, roles, names and
   states must be at least as good as the library being replaced. Verify with the keyboard and a
   screen reader, not just by reading the markup.
3. **A dependency needs a written reason.** State the platform gap it fills (usually an accessible
   behavior the platform cannot yet do) and the condition under which it can be removed. Without
   that, do not add it. Animation is never a valid reason on the web.
4. **Native (Expo / React Native) follows the same rule**, but the platform surface is smaller, so
   some dependencies (Expo modules, gesture and animation runtime) are expected. Which animation
   runtime native uses is an open decision (see below); it must take the same spring parameters as
   the web.
5. **Remove, do not stack.** Replacing a dependency means deleting it and its imports in the same
   change, not running two systems side by side.

### Goal and scope

Web components must be responsive by default and work on desktop browsers. Mobile means real React
Native/Expo components, not just a narrow web layout. Share the design language and tokens; use
platform-specific rendering and interactions where needed. No separate desktop library is required
now.

Work on one component at a time. Keep the implementation minimal (KISS, DRY, Ponytail): every
wrapper, style, dependency and abstraction must solve a current need. “Minimal” does not mean
omitting accessibility, useful feedback or the detailing that defines the depth treatment.

### Radius, depth and kind

Components vary along independent axes: color role (`variant`), size, and the three below. The old
four materials (`solid`, `detail`, `glass`, `terminal`) no longer exist.

**Radius** has three modes: Sharp, Default and Round. The terminal look is the Sharp mode; a
monospace font is applied globally by the app, never by a component. Radius is tiered, so a mode can
round the things that should be round without over-rounding the things that hold text:

| Tier | Used for | Sharp | Default | Round |
| --- | --- | --- | --- | --- |
| button | buttons (small size uses 6px in Default) | 2px | 8px | full |
| pill | tags, count badges | 2px | full | full |
| control | inputs, nav items, cards | 2px | 8px | 12px |
| item | menu and select options, checkboxes | 2px | 6px | 10px |
| box | dialogs, popovers, sheets | 4px | 12px | 20px |

Round must never turn a card or a select option into a near-capsule: only buttons and pills go fully round.
Default matches Figma's `--radius-sm/md/lg/full` (6, 8, 12, 999). Check every component in Round
with long text.

**Depth** has two modes, Flat and Floating. Figma also draws a middle "Raised" mode; it is folded
into Floating. School OS draws depth with soft drop shadows, so Floating adds that cast shadow
(`--rx-cast`, one value per tone: solid, soft and card) to the edge technique below. Flat removes it.

- **Flat** is one simple 1px border. No second edge, no ring, no gradient.
- **Floating** is the depth. Besides the soft cast shadow, a surface has a real 1px border
  painted with a vertical gradient (light top edge to dark bottom edge), a 1px hairline ring just
  outside it, and faint sheen (top) and shade (bottom) gradients inside. Inputs and tracks use the
  inverse (a recessed well: dark top edge, light bottom edge).

The edge must be a border, not an inset shadow line: inset lines are straight and get clipped by the
corner radius, which makes the highlight look cut. A gradient border follows the radius exactly.

```css
@property --fill { syntax: "<color>"; inherits: false; initial-value: transparent; }
/* mode switches the variables only; components never branch on depth */
[data-depth="flat"]     { --e-ring: transparent; --e-edge-a: var(--line); --e-edge-b: var(--line); --e-sheen: transparent; --e-shade: transparent; }
[data-depth="floating"] { --e-ring: rgb(0 0 0 / .6); --e-edge-a: rgb(255 255 255 / .18); --e-edge-b: rgb(0 0 0 / .4); --e-sheen: rgb(255 255 255 / .06); --e-shade: rgb(0 0 0 / .16); }

.depth {
	border: 1px solid transparent;
	background:
		linear-gradient(180deg, var(--e-sheen), transparent 40%, transparent 60%, var(--e-shade)) padding-box,
		linear-gradient(var(--fill), var(--fill)) padding-box,
		linear-gradient(180deg, var(--e-edge-a), var(--e-edge-b)) border-box;
	box-shadow: 0 0 0 1px var(--e-ring);
}
```

Colors inside gradients are registered with `@property` so they can transition. The values above are
the dark-theme values from the sales-crm reference; Light needs its own set. Overlays (dialogs,
popovers, sheets) separate with the same edge, a dimmed backdrop and the card cast shadow.

**Kind.** Reserved for a treatment that needs its own look. Today only `glass`. Each kind is a
ready-made set of classes applied only when that kind is selected, so the component itself stays
free of per-kind logic. `glass` is deliberately simple; its exact look is open.

Radius and depth ship as token modes: CSS variables switched by `data-radius` and `data-depth` on a
container, so components do not need props for them.

Do not interpret polished as “add more shadows, glow or animation.” Use the Figma cast shadows as
drawn, nothing heavier.

### Motion and interaction

Motion is on by default, purposeful and restrained, and CSS only on the web. Press and release feel
responsive without moving surrounding layout. Respect reduced motion; a Motion off switch in the
playground must also leave every state visible. Disabled controls must not activate or animate as
enabled ones. Motion is never the only feedback channel.

- **Springs** are defined by stiffness, damping and mass, solved into a CSS `linear()` easing with
  the settle time as the duration. The same three numbers feed the native runtime. beUI values:

  | Use | Stiffness / damping / mass | Notes |
  | --- | --- | --- |
  | Press | 500 / 30 / 0.6 | scale 0.93 on press, about 280ms |
  | Tabs indicator | 245 / 36 / 1.2 | no overshoot, about 670ms |
  | Swap (icon, label, morph) | 460 / 30 / 1 | about 5% overshoot |
  | Switch thumb | 800 / 80 / 4 | squish to 0.9 |
  | Toast | 420 / 34 / 0.75 | in: y 22, scale 0.96, blur 10 |
  | Panel (dialog, sheet) | 420 / 40 / 0.5 | exit shorter than enter |

  Springs given as duration and bounce convert as stiffness = (2π / duration)² and damping ratio =
  1 minus bounce.
- **State changes** (hover, focus, selected) use `cubic-bezier(0.25, 1, 0.5, 1)` for about 150ms.
  High-frequency interactions (row hover, tab switch, keystrokes) get instant or near-instant
  feedback.
- **Icon and label swaps** cross-fade with scale 0.25 to 1, opacity and 4px blur over 300ms
  (`cubic-bezier(0.2, 0, 0, 1)`). Exits are shorter than enters.
- **Limits:** a `linear()` spring is a fixed curve. If interrupted it restarts from the current value
  with no velocity carried over, and its duration does not depend on distance. Drag, swipe and
  momentum need JavaScript; the tooltip "warm window" does too. View Transitions snapshot the
  element, so a shared-element morph is a picture while it moves. Where one real element can morph
  by itself (width, height, radius, fill), prefer that.

Review default, hover (web), keyboard focus, pressed, disabled, loading and success states where
applicable. Include leading and trailing icons and icon-only examples with accessible names. Keep
labels and dimensions stable during state changes.

### Open decisions

These are not settled; do not guess them.

- **Native motion runtime.** Whether `react-native-reanimated` is acceptable or the built-in
  `Animated` API is used. Either way it takes the same spring parameters as the web.
- **Glass.** How far it goes (translucency plus blur, or closer to Apple's liquid glass).
- What `@school-os/ui` becomes once components are rebuilt (tokens and CLI config only, or removed).
- Android font. The web uses SF Pro on Apple devices and Inter elsewhere (decided); the native
  Android face is not chosen yet. A global monospace option is app-level theming, not a component
  concern.
- The order after Button. Button is first.

### Consistency and review

The same language applies to cards, inputs, sidebar items and the surrounding application shell. Use
semantic color and helpful SVGs where they clarify content, without decorative color noise. Do not
redesign every screen as part of a single component task.

Before moving to the next component, review the current one in the playground across Flat and
Floating, Sharp, Default and Round, Motion on and off, light and dark, every size and state, and long
text. Be explicit about untested native behavior and simplified glass fallbacks.

### Current implementation and preview

State as of 2026-10-07. Verify against the repo before relying on it.

- `packages/ui` (`@school-os/ui`): the original shadcn-style web components (about 30), `motion/*`
  variants and `mobile/*` components, plus the shared tokens. The apps still consume it. It is the
  thing being replaced, not the foundation to extend.
- `packages/rabtx` (`@rabtx/ui`): the rebuild target. Built so far: the tokens and modes
  (`src/styles/tokens.css`), the spring solver (`src/motion`, generated `springs.css`) and **Button**.
  Styling is Tailwind first: `src/styles/control.css` holds the shared depth recipe (`rx-control`),
  the five tones (`rx-primary`, `rx-secondary`, `rx-ghost`, `rx-accent`, `rx-danger`) and the flat
  and motion-off rules; `src/button/button.styles.ts` holds the Button as Tailwind class strings
  (`buttonClass`, `buttonParts`) with no framework code; `button.tsx` is a thin React wrapper.
  Exports: `@rabtx/ui/button`, `@rabtx/ui/button/styles`, `@rabtx/ui/input`,
  `@rabtx/ui/input/styles`, `@rabtx/ui/field`, `@rabtx/ui/field/styles`, `@rabtx/ui/textarea`,
  `@rabtx/ui/textarea/styles`, `@rabtx/ui/card`, `@rabtx/ui/card/styles`, `@rabtx/ui/badge`, `@rabtx/ui/badge/styles`,
  `@rabtx/ui/select`, `@rabtx/ui/select/styles`, `@rabtx/ui/checkbox`, `@rabtx/ui/checkbox/styles`,
  `@rabtx/ui/motion`, `@rabtx/ui/styles.css`.
- **Input** (Figma `6:14`): a wrapper draws the field (`rx-control rx-field`) around a native
  `<input>`. Heights 28, 32 (default), 36, 44, 48. Depth: Flat is one 1px border; Floating is a
  recess (dark top edge fading to a light bottom edge plus a faint top shade), which replaces
  Figma's inner shadow because depth has no cast or inset shadows. Focus is a blue edge plus a 3px
  halo; error (`aria-invalid`) is red the same way. Pill is a per-input `pill` prop (Figma's Shape
  property), independent of the Round radius mode, so text is never clipped. Dark field values and
  the 20% / 18% halo strengths are derived, not read from Figma. Figma's placeholder color
  (`#9e9e9e` on `#f5f5f5`) is below 4.5:1; kept as specified, flagged for the design owner.
- **Field** (Figma `26:436`): a label (13/20 medium), one control and an optional 12/16 hint, 6px
  apart. It owns the wiring: a generated `id` for the label, the hint or error linked with
  `aria-describedby`, `aria-invalid` on an error, and a polite live region for the message. The
  control reads this from a React context, so Textarea and Select can join it later. The context is
  internal (not exported) so server files can import `@rabtx/ui/field`. The hint (`#9e9e9e`) and
  error (`#e5484d`) text colors are as specified and are below 4.5:1 on white; flagged.
- **Textarea** (Figma `66:783`): the `<textarea>` itself is the field (`rx-control rx-field`, no
  wrapper), 96px minimum height, 13/20 text, vertical resize, and it reads Field's context like
  Input. **Open inconsistency in Figma:** Textarea is drawn white with a plain border and no recess,
  while Input is `#f5f5f5` with a recess. Textarea follows Input so a form does not mix two field
  looks; if the owner wants it white, change its fill token only. Its focus (`#d3e4fd`) and error
  (`#fdecec`) halos are measured from Figma; Input's error halo was corrected to match (10%).
- **Card**: Figma has no generic Card section, so this is the container shared by its Kanban (12px
  padding), Option (16) and Stat (20) cards: surface fill, 1px `#f2f2f2` border, the box radius tier
  (12 Default, 20 Round, 4 Sharp), a vertical stack. One component, `padding` sm, md (default) or
  lg, an `as` tag for semantics, and `cardParts` text styles instead of header and footer parts.
  Floating uses the raised-surface edge and ring (as the secondary Button); Figma's cast shadow is
  dropped. `rx-surface` was split out of `rx-control` so a card is the plain surface with no hover or
  press. Deviation: the description uses the secondary gray (passes 4.5:1) where Figma's Option Card
  uses the tertiary gray; flagged. Option Card (selectable) and Stat Card are separate components.
- **Badge** (Figma `6:116`): 20px, 12/16 medium, a pale tint with colored text, six tones (neutral,
  accent, success, warning, danger, violet), optional 6px dot. Radius is its own tier,
  `--rx-r-badge`: 4px Default (Figma), 2px Sharp, fully round in Round. One `--tone` color per
  class drives both the fill (12% of the tone over the surface, which reproduces Figma's tints) and
  the ink. **Deviation, tested:** Figma's raw tone text (for example `#f0803c` on `#fef0e6`) is
  2.7 to 3.9:1, below 4.5:1 for 12px text, so the ink is the tone mixed 75% toward black (toward
  white in dark). Measured: light 4.86 (warning) to 6.8, dark 5.07 to 6.6, asserted in
  `ui-badge.spec.ts`. Success, warning and violet reuse the same base color in dark; their dark
  values are not in Figma. Tag (outlined, `42:441`) and Chip (interactive, `6:139`) are separate.
- **Select** (Figma `66:770`, the trigger; the list follows Menu `7:91` and Menu Item `7:60`): a
  native `<select>` inside a field wrapper (`rx-control rx-field`), sizes 28, 32 (default), 36, 13/20
  text, optional leading icon, a `placeholder` (a hidden first option) and the same focus, error and
  disabled treatment as Input. The platform does the hard parts: keyboard, typeahead, screen readers,
  mobile pickers. Where `appearance: base-select` exists (Chromium) the list is styled to Menu: surface
  fill, hairline border, box radius, 28px rows, item radius, hover on `--rx-selected`, a blue tick on
  the chosen row, and a 150ms fade (off with Motion off). Elsewhere the OS list opens and the closed
  field looks the same. Floating uses a hairline ring on the list instead of Menu's cast shadow.
  **Notes:** Figma draws the Select trigger white and plain, like Textarea; it follows Input
  (see Textarea, same open question). Figma's `Value` text is the primary color even for "Select an
  option"; an unchosen placeholder is the tertiary gray here, as in Input. The chevron is HugeIcons'
  unfold-more glyph (MIT) inlined, so the package needs no icon set. Menu itself (a general popover
  menu, not tied to a select) is a separate component. Lightning CSS rejects
  `::picker(select):popover-open`; use `:open::picker(select)`.
- **Checkbox** (Figma `6:59`): a native `<input type="checkbox">` with `appearance: none`, 16px, off
  (surface fill, strong border), on (accent fill, white tick) and mixed (accent fill, white minus),
  plus disabled (pressed fill, default border, gray glyph). With children it wraps the box in a
  `<label>` so the text names it and the row is clickable. `mixed` sets `indeterminate` (derived
  state: the browser clears it on click). The tick and minus are CSS masks on `::before` (so they
  take the text color), with a pop on the swap spring, off with Motion off. A 24px hit area comes
  from an invisible `::after`, since 16px is below the 24px target size. Radius is its own tier,
  `--rx-r-check`: 4px Default (Figma), 2px Sharp, **6px in Round** so a checkbox stays a square
  and is never mistaken for a radio. Figma has no hover, error or focus state and no depth
  variants, so none were invented (focus uses the shared 2px ring). **Flagged:** the off box's
  border (`#e3e3e3` on white, about 1.3:1) is below the 3:1 non-text contrast WCAG asks for; it is
  the same border token Input, Select and Textarea use, so one darker control-border token would fix
  all of them. The Figma `Task Check` (6:78, a priority circle) is a separate component.
  Dark values are derived from the dark Sidebar and are not yet confirmed in Figma.
- Other frameworks: a Solid component is another thin wrapper over `button.styles.ts` plus the same
  CSS, not a clone or a rewrite. Not built yet; add it as a separate package or export with
  `solid-js` as a peer dependency, and test it with a real Solid render.
- Docs: `apps/web` at `/ui`, in the style of shadcn and beUI: one page per component with a short
  intro, a few important live examples (each one's source is read from its file, so it cannot
  drift), an API table and accessibility notes. A header toggle sets `data-theme`, `data-depth`,
  `data-radius` and `data-motion`. Add examples only when they teach something new. E2E:
  `apps/web/e2e/ui-button.spec.ts`. One component at a time; the owner picks the next.
- Icons: HugeIcons is the target, but 44 files still import `lucide` and 93 import HugeIcons.
  Migrating the remaining lucide usage is part of the rebuild.
- Glass: the earlier web implementation was translucency plus backdrop blur and the native one was
  flat translucency; neither was liquid glass. On native the intended path is `expo-glass-effect`,
  already a mobile dependency, which hands the real system material to iOS instead of imitating it.
  The web has no equivalent system material, so it has to be approximated. Treat web and native
  results as the same material with different fidelity, and say which one you tested.
- Reference: `kargulstudio/sales-crm` (public, MIT) shows the depth technique and the app density we
  are targeting. Read it, do not copy its libraries.

## Layout Rules

- Use stable dimensions for toolbars, sidebars, tables, cards, and repeated controls.
- Do not let text overflow buttons, tabs, cards, table cells, or mobile headers.
- Do not place cards inside cards unless it is a true repeated item or modal body.
- Keep desktop workflows scannable and mobile workflows thumb-friendly.
- Use responsive constraints instead of viewport-scaled font sizes.

## Tokens

The source of truth is `packages/rabtx/src/styles/tokens.css` (`--rx-*`, values from the School OS
Figma file; see "School OS design source"). The shared Tailwind 4 / shadcn variables (`--background`,
`--primary`, `--border`, `--radius`, `--chart-*`, `--sidebar-*`) and the app's `--dashboard-*`
variables in `apps/web/src/app/globals.css` only point at those tokens:

- `--primary` is the blue accent (Figma's call-to-action color); the black inverse button is the
  rabtx `primary` tone.
- `--muted-foreground` uses the secondary text color, not Figma's tertiary gray, which is below
  4.5:1 for body text.
- `--radius` is 8px, so shadcn's sm/md/lg/xl are Figma's 4/6/8/12.

When adding a new app, do not invent one-off color systems. Extend the rabtx tokens or create an
app-specific override with a short rationale.

## Typography

- Use the app's configured sans font for product UI.
- Reserve large display text for true first-viewport marketing or documentation hero sections.
- Use smaller, tighter headings inside dashboards, cards, sidebars, tables, and forms.
- Keep letter spacing at `0` unless a specific brand treatment requires otherwise.

## Components

The repo has a shared web primitive package at `packages/ui` and app-local primitives in
`apps/web/src/components/ui`.

Current rule (during the rebuild):

- Existing screens keep using `@school-os/ui` until the matching `@rabtx/ui` component exists. Do not
  add new components or features to `@school-os/ui`.
- New and rebuilt components go in `@rabtx/ui`, one at a time, following the Direction and
  Dependency policy above. Do not wrap or extend a shadcn component.
- When a component is rebuilt, switch its consumers over and delete the `@school-os/ui` original in
  the same change.
- Keep complex or app-specific composed components inside each app or feature module.
- Promote a component to `packages/ui` only after it is reusable and free of route/auth/data
  coupling.
- Extend the existing `/rabtx` docs routes for visual review of the polished components.
- Add examples for loading, empty, error, disabled, hover, focus-visible, and selected states.

## AI UI Generation Rules

Before implementing UI, an agent should:

1. Read this `DESIGN.md`.
2. Read the target app's README and existing components.
3. Identify reusable components and tokens.
4. Ask for missing product context if the screen purpose is unclear.
5. Propose an implementation plan before editing.

After implementing UI, an agent should:

1. Run lint/typecheck/tests for the touched app.
2. Capture or inspect desktop and mobile rendering where possible.
3. Check long text, empty data, error states, and keyboard focus.
4. List any intentional differences from the design reference.

## Prompt Template

```txt
Use DESIGN.md and the existing app components as the source of truth.

Design/implement [screen/component].

Audience:
[who uses it]

Primary task:
[what the user must complete]

Domain constraints:
[data density, privacy, accessibility, workflow, device context]

Required states:
loading, empty, error, validation, hover, focus-visible, selected, disabled, saving, success

Quality bar:
No generic SaaS layout. No decorative blobs. No nested cards. Use shared tokens, stable spacing,
accessible contrast, responsive behavior, and existing component conventions.

Before coding, return:
1. Components to reuse.
2. New components needed.
3. Token changes if any.
4. Tests or visual checks to run.
```
