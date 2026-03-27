# Design System Specification: The Ethereal Intelligence

## 1. Overview & Creative North Star
**Creative North Star: "The Luminescent Architect"**

This design system is built to move beyond the "SaaS-in-a-box" aesthetic. It treats the interface not as a flat grid of data, but as a multi-dimensional workspace where AI-powered outreach feels fluid, intuitive, and high-stakes. By utilizing heavy backdrop blurs, intentional asymmetry, and "light-leak" gradients, we create a sense of depth that mimics a futuristic command center.

The goal is to break the rigid, boxed-in layout of traditional CRM tools. We achieve this through **Tonal Layering** and **Editorial Spacing**, ensuring the "Auto Follow-Ups" experience feels premium, authoritative, and impossibly clean.

---

## 2. Colors & Surface Philosophy
The palette is rooted in deep obsidian tones, punctuated by high-energy bioluminescent accents.

### Color Tokens
*   **Core Background:** `#060e20` (`background`)
*   **Primary Accent:** `#9fa7ff` (`primary`) to `#8d98ff` (`primary_container`)
*   **Secondary Accent:** `#be83fa` (`secondary`)
*   **Tertiary/Alert:** `#7de9ff` (`tertiary`)
*   **Error/Urgency:** `#ff6e84` (`error`)

### The "No-Line" Rule
**Explicit Instruction:** Do not use `1px` solid borders for sectioning or containers. 
Boundaries must be defined through:
1.  **Background Color Shifts:** Use `surface_container_low` against `surface` to define a sidebar.
2.  **Tonal Transitions:** Use subtle shifts in luminance to separate content blocks.
3.  **Negative Space:** Rely on the `12` (3rem) or `16` (4rem) spacing tokens to create mental boundaries.

### Glass & Gradient Rule
To achieve the "Futuristic" vibe, all floating elements (Modals, Hover Cards, Dropdowns) must use Glassmorphism.
*   **Fill:** `surface_variant` at 40% - 60% opacity.
*   **Effect:** `backdrop-filter: blur(20px)`.
*   **Signature Textures:** Hero CTAs must use a linear gradient: `primary` (#9fa7ff) to `secondary` (#be83fa) at a 135-degree angle. This provides a "soul" to the UI that flat colors lack.

---

## 3. Typography: The Editorial Scale
We pair **Plus Jakarta Sans** (Display/Headlines) for a high-tech, geometric feel with **Inter** (Body/Labels) for maximum legibility in data-heavy outreach workflows.

*   **Display (Large/Mid):** `display-lg` (3.5rem) / `display-md` (2.75rem). Use sparingly for "Big Number" AI insights or Hero statements. Letter-spacing should be set to `-0.02em`.
*   **Headlines:** `headline-sm` (1.5rem). Used for card titles. Bold, authoritative, and always `on_surface`.
*   **Body:** `body-md` (0.875rem). The workhorse. Use `on_surface_variant` (#a3aac4) for secondary descriptions to reduce visual noise.
*   **Labels:** `label-md` (0.75rem). Uppercase with `0.05em` tracking for a "technical terminal" look.

---

## 4. Elevation & Depth
Depth is not an afterthought; it is the primary navigation cue.

### The Layering Principle
Stack surfaces to define hierarchy:
*   **Level 0 (Base):** `surface` (#060e20).
*   **Level 1 (Sections):** `surface_container_low` (#091328).
*   **Level 2 (Cards):** `surface_container` (#0f1930).
*   **Level 3 (Pop-overs):** `surface_bright` (#1f2b49) with 20px blur.

### Ambient Shadows
Forget "Drop Shadows." Use **Ambient Glows**.
*   **Shadow Color:** Use a 10% opacity version of `primary` (#9fa7ff).
*   **Blur:** `32px` to `64px`.
*   **Spread:** `-10px`.
This makes components appear to be floating on a bed of light rather than casting a heavy shadow on a wall.

### The "Ghost Border" Fallback
If contrast is required for accessibility, use a `1px` stroke of `outline_variant` (#40485d) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons (The Energy Source)
*   **Primary:** Gradient from `primary` to `secondary`. Text is `on_primary_fixed` (Black). Border-radius: `full` (9999px).
*   **Secondary:** Ghost style. Transparent fill, `Ghost Border` (15% opacity), text color `primary`.
*   **Interaction:** On hover, increase the `backdrop-filter` brightness by 10%.

### Input Fields (The Data Portal)
*   **Style:** No bottom line. Use `surface_container_highest` (#192540) with a `md` (0.75rem) corner radius.
*   **Focus State:** A 1px `Ghost Border` using the `tertiary` (#7de9ff) color at 50% opacity.

### Glass Cards (The AI Insight)
*   Forbid dividers. Use `Spacing 6` (1.5rem) to separate header from body.
*   **Background:** `surface_container_low` at 70% opacity + `backdrop-blur`.
*   **Edge:** A "Top-Light" stroke: a 1px inner-shadow/border on the top edge only using `outline_variant` to simulate light hitting the top of the glass.

### AI Status Chips
*   Used to show "AI Sequencing" or "Follow-up Sent." 
*   **Style:** Small, `full` radius, using `secondary_container` background with `on_secondary_container` text.

---

## 6. Do's and Don'ts

### Do:
*   **Embrace Asymmetry:** Align text to the left but allow imagery or data visualizations to bleed off the right edge of the grid.
*   **Use Subtle Gradients:** Apply a 5% opacity radial gradient of `primary` in the top-left corner of the screen to break the "flat black" background.
*   **Nesting:** Place a `surface_container_highest` button inside a `surface_container` card to create natural "lift."

### Don't:
*   **Don't use pure white (#FFFFFF):** It is too jarring. Use `on_surface` (#dee5ff) for all primary text.
*   **Don't use 100% opaque borders:** This kills the "futuristic" glass aesthetic.
*   **Don't crowd the UI:** If a screen feels full, increase the spacing tokens. AI-powered tools should feel effortless, not cluttered.
*   **Don't use standard Tooltips:** Tooltips must be glassmorphic with `tertiary` text accents.