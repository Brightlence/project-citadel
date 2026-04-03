# Design System Strategy: Architectural Absolute

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"Architectural Absolute."** 

This is not a standard trading interface; it is a high-precision instrument. We are moving away from the "dashboard fatigue" of typical fintech by embracing the aesthetics of brutalist architecture and high-end editorial typography. The goal is to create a digital environment that feels permanent, authoritative, and focused. 

By stripping away the "noise" of shadows, gradients, and a standard color palette, we force the user’s focus onto the two things that matter in elite trading: **Information Density** and **Decision Speed**. The interface does not hide behind soft edges; it uses razor-sharp 0px corners and strict monochrome contrast to define a space where data is the only hero.

---

## 2. Colors & Tonal Logic
This system operates on a binary logic. We utilize the Material Design tokens not as a palette of "colors," but as a hierarchy of light and shadow.

### The "No-Line" Rule for Layout
To achieve an editorial feel, we prohibit the use of 1px solid borders for primary layout sectioning. Instead, we define space through **Background Shifts**. 
- A sidebar (`surface-container-low`) sits flush against the main terminal (`surface`). 
- The distinction is felt through the subtle shift in value, not a line. This creates a "carved" look rather than a "sketched" look.

### Surface Hierarchy & Nesting
We use the `surface-container` tiers to represent "Physical Depth" through value:
- **Level 0 (The Floor):** `surface` (#131313) – The base terminal background.
- **Level 1 (The Desk):** `surface-container-low` (#1b1b1b) – Navigation or static side panels.
- **Level 2 (The Sheet):** `surface-container-high` (#2a2a2a) – Active trading modules or chat containers.
- **Level 3 (The Focus):** `primary` (#ffffff) – Used for high-contrast call-outs or active states.

### Accent Limitation
The only "color" permitted in the interface is derived from user-uploaded content (e.g., asset logos or profile images). All UI-native elements—including "Buy/Sell" indicators—must rely on typographic weight, iconography, or inversion (`on_primary` vs `surface`) rather than red or green.

---

## 3. Typography: The Human and The Machine
The typography scale is a dialogue between the "Human" (Inter) and the "Machine" (JetBrains Mono).

- **UI & Chat (Inter):** Used for the editorial layer. It provides legibility and a sophisticated, modern feel. `display-lg` to `headline-sm` should use tight letter-spacing (-0.02em) to mimic premium print headlines.
- **Financial Data (JetBrains Mono):** Used for all prices, tickers, and algorithmic output. Monospace is a functional requirement here; it ensures that fluctuating numbers do not cause horizontal layout shifts (jitter), providing a rock-solid visual anchor for the trader.
- **Hierarchy through Scale:** We do not use color to show importance. We use **Size and Weight**. A `title-lg` price in White Bold is more important than a `label-sm` timestamp in `on_surface_variant` (#c6c6c6).

---

## 4. Elevation & Depth
In "Architectural Absolute," depth is not a shadow; it is a **Tonal Layer**.

- **The Layering Principle:** Instead of standard "Z-index" thinking, treat the UI like stacked sheets of matte paper. To lift an element, move it to a higher `surface-container` token.
- **The "Ghost Border" Fallback:** While layout lines are forbidden, interactive boundaries (like input fields or buttons) utilize the **Ghost Border**. Use `outline-variant` (#474747) at 20% opacity. This provides a "hairline" guide that guides the eye without cluttering the architectural purity.
- **Zero Radius:** Every container, button, and input has a `0px` radius. This maintains the "stark, architectural" requirement. Any rounding is a violation of the system's integrity.

---

## 5. Components

### Buttons
- **Primary:** Pure `primary` (#ffffff) background with `on_primary` (#1a1c1c) Inter Bold text. No border.
- **Secondary:** Transparent background with a 1px `primary` (#ffffff) border.
- **Tertiary:** Pure Black/White text with an underline on hover.
- *Interaction:* On hover, Primary buttons invert to `surface-container-highest`.

### Chips (Tickers)
- Chips are used for asset tags. They should be `surface-container-highest` (#353535) with `label-md` Monospace text. They are rectangular, sharp, and resemble industrial labels.

### Input Fields
- Underline-only inputs. No four-sided boxes. The label (`label-sm`) sits strictly above the input in Monospace, reinforcing the "terminal" aesthetic.

### Lists & Data Grids
- **The "No-Divider" Rule:** Vertical white space (using the `4` [0.9rem] or `2` [0.4rem] spacing tokens) must separate list items. If separation is visually impossible without a line, use a background shift to `surface-container-lowest` on alternating rows.

### The AI Chat Interface
- AI responses should be set in Inter `body-lg`. 
- Any code or data cited by the AI must be wrapped in a `surface-container-lowest` block and set in JetBrains Mono.

---

## 6. Do's and Don'ts

### Do
- **DO** use asymmetry. Large `display-lg` prices can be offset to the left while metadata sits on the far right, creating a dynamic, editorial layout.
- **DO** use pure #000000 and #FFFFFF for the highest-priority information.
- **DO** rely on the `Spacing Scale`. Use generous padding (`12` or `16`) to create an "Elite" feel. Tight spacing looks "cheap" and "utility-grade."

### Don't
- **DON'T** use 1px solid borders to create "boxes." 
- **DON'T** use any border-radius. Even a 2px radius destroys the architectural intent.
- **DON'T** use shadows or glows to show "Gains" or "Losses." Use a `+` or `-` symbol and rely on the inherent strength of the Monospace type.
- **DON'T** use "Grey" as a color choice; use the specific `surface-container` tokens to ensure the monochrome hierarchy remains mathematically consistent.