# MoneyPrinter Design System & Branding

## Philosophy: "Rounded Finance Neubrutalism"
Our design language combines the boldness and honesty of Neubrutalism with the friendly, accessible nature of rounded geometry. It is designed to feel **secure, professional, and distinct**.

### Core Principles
1.  **Bold & High Contrast**: We use pure black (`#000000`) for text and borders against light backgrounds to ensure maximum legibility and impact.
2.  **Rounded Edges**: "It's who we are." All interactive elements (cards, buttons, inputs) feature an **8px border radius**. We avoid sharp 90-degree corners.
3.  **Hard Shadows**: We use hard, unblurred shadows (`5px 5px`) to create depth and a tactile feel. Elements feel like physical objects on the screen.
4.  **Finance Green**: Our primary brand color is a vivid Green (`#22c55e`), symbolizing growth, money, and success.

---

## Design Tokens

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| **Primary** | `#22c55e` (Green) | Main actions, headers, success states, brand identity. |
| **Secondary** | `#fbbf24` (Amber) | Secondary actions, highlights, "Gold" accents. |
| **Foreground** | `#000000` (Black) | Main text, borders, icons. |
| **Background** | `#f3f4f6` (Gray 100) | App background. |
| **Surface** | `#ffffff` (White) | Cards, inputs, modals. |
| **Accent** | `#ec4899` (Pink) | Playful highlights, non-critical indicators. |
| **Error** | `#ef4444` (Red) | Error states, destructive actions. |

### Typography
**Font Family**: `Montserrat` (Geometric Sans-Serif)
-   **Weights**:
    -   `400` (Regular): Body text.
    -   `700` (Bold): Subheadings, buttons, links.
    -   `900` (Black): Main page titles, hero text.

### Borders & Radius
-   **Border Width**: `3px` (Solid Black).
-   **Border Radius**: `8px` (Consistent across all elements).

### Elevation (Shadows)
-   **Default**: `5px 5px 0px 0px #000000`
-   **Hover**: `7px 7px 0px 0px #000000` (Elements "lift" up towards the user)
-   **Active**: `0px 0px 0px 0px #000000` (Elements are pressed down)

---

## Component Guidelines

### Buttons
-   **Primary**: Green background, Black text, Hard Shadow.
-   **Secondary**: Amber background, Black text.
-   **Outline**: Transparent background, Black border.
-   **Behavior**: On hover, shadow increases. On active (click), shadow disappears (pressed effect).

### Inputs
-   White background, Black border (3px).
-   **Focus**: No outline change, but maybe shadow shift? (Currently standard).

### Cards
-   White background, Black border (3px), Hard Shadow.
-   Used for grouping content.

### Links
-   **Default**: Bold text, underline on hover.
-   **Button-like**: Looks like a button but is an anchor tag.
