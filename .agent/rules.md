# Agent Coding Rules & Standards

These rules must be followed for all code generation and modification tasks within the `moneyprinter` codebase.

## 1. Design System Priority

- **ALWAYS** use components from the Design System (`doom-design-system`) instead of native HTML elements unless there isn't a viable component.
- **NEVER** create new UI patterns if a component already exists (e.g., use `ActionRow` for lists, `Card` for containers).
- **Import Path**: `import { ... } from 'doom-design-system';`

## 2. Styling & Layout

- **NO Inline Styles**: Avoid the `style={{ ... }}` prop. Use component props instead.
- **Layout Components**: Use `Flex` and `Grid` for all layout needs.
  - Use `direction`, `align`, `justify`, and `gap` props on `Flex`.
  - Use `columns` and `gap` props on `Grid`.
- **Spacing Integrity**: The `gap` prop on Layout components (`Flex`, `Grid`, `Stack`) accepts **integers only** (0-16), representing steps in the spacing scale.
  - ❌ `<Flex gap="1rem">`
  - ✅ `<Flex gap={4}>` (which equals 1rem)
- **Responsive Layouts**: The Design System does NOT support Tailwind-like responsive utility classes (e.g., `md:w-32`). Use `@emotion/styled` and media queries for responsive adjustments if the component props don't support it directly.

## 3. Typography

- **Use Text Component**: Always use the `<Text>` component.
- **Variants**: Use `variant="..."` (h1-h6, body, small, caption) instead of font-size styles.
- **Colors**: Use `color="..."` (primary, secondary, muted, error, success, warning) instead of hex codes.
  - ❌ `<span style={{ color: 'red' }}>Error</span>`
  - ✅ `<Text color="error">Error</Text>`

## 4. Theming & Colors

- **CSS Variables Only**: Never use hardcoded hex values (e.g., `#000`, `#fff`).
- **Semantic Variables**: Use semantic names over literal ones.
  - `var(--primary)`, `var(--secondary)`, `var(--muted)`
  - `var(--card-bg)`, `var(--card-border)`
  - `var(--border-width)`, `var(--radius)`
- **Color Palette**: The system supports standard palettes: `slate`, `purple`, `navy`, `blue`, `indigo`, `yellow`, `green`, `red`, `gray`.

## 5. Icons

- **Library**: Use `lucide-react`.
- **Standard Props**: Always set `strokeWidth={2.5}` for the neubrutalism aesthetic.
- **Sizing**: Use the `size` prop (e.g., `size={18}` for buttons, `size={24}` for standalone).

## 6. Component Extension

- If a custom style is absolutely required (e.g., a specific hover effect or responsive width), use `styled(Component)` from `@emotion/styled` to extend the Design System component.

## 7. File Organization & Imports

- **Colocation**: Keep related files together.
- **Absolute Imports**: Always use absolute paths (e.g., `@/components/...`).

## 8. TypeScript & Safety

- **Strict Typing**: Define explicit interfaces for all component props.
- **No Any**: Avoid using `any`.

## 9. React & Next.js Patterns

- **'use client'**: Explicitly add `'use client';` at the top of files using hooks.
- **Composability**: Break down complex UIs into smaller components.

## 10. State Management

- **URL State**: Prefer URL search parameters (`?tab=income`) for UI states that should be shareable or persistent on refresh.
- **Server Actions**: Use Server Actions for all data mutations.
- **Zustand**: Use Zustand only for global client-side state (like themes or complex session data).

## 11. Documentation & Testing

- **Storybook**: Every new component in `@design-system` MUST have a corresponding `.stories.tsx` file.
- **Maintenance**: If you add/modify props in a component, you **MUST** update the corresponding Storybook file to reflect those changes (add controls, new stories, etc.).
- **Examples**: Stories should cover all major variants and states (e.g., Default, Disabled, Loading).
- **Unit Tests**: Whenever code changes are made, you **MUST** create/update unit tests and run them to ensure no regressions.

## 12. Database Migrations

- **Source of Truth**: `src/lib/schema.sql` is the SINGLE source of truth for the database schema.
- **Workflow**:
  1.  Modify `src/lib/schema.sql`.
  2.  Run `./scripts/atlas.sh migrate apply`.
  3.  This script will automatically run `prisma db pull` and `prisma generate` to keep Prisma in sync.
- **Prisma**: Do NOT edit `schema.prisma` manually for schema changes. It is a derivative of the database state.
- **Dev**: Use `scripts/dev.sh` which uses `prisma db push` to sync the local dev DB with the current Prisma schema.

## 13. Accessibility Standards

- **Color Contrast**: Ensure all text and UI components meet **WCAG 2.1 AAA** standards.
  - Normal Text: 7:1 ratio
  - Large Text: 4.5:1 ratio
  - UI Components (Borders/Icons): 3:1 ratio
- **Semantic HTML**: Use appropriate HTML tags (`<button>`, `<nav>`, `<main>`, `<h1>`-`<h6>`) instead of generic `<div>`s where possible.
- **ARIA**: Use ARIA attributes (`aria-label`, `aria-expanded`, etc.) only when semantic HTML is insufficient.
- **Focus Management**: Ensure all interactive elements are focusable and have visible focus states.
- **Audit**: When modifying themes or colors, run `node scripts/audit-colors.js` to verify compliance.

## 14. Design System Upgrades

- **Mandatory Analysis**: Whenever the `doom-design-system` package is upgraded, you **MUST** perform a comprehensive analysis of the new version (inspecting exports, types, and changelogs).
- **Rules Update**: Compare the findings with the "DOOM Design System Analysis" section below and update it to reflect any new components, changed APIs, or deprecated features.
- **Breaking Changes**: Update the "Styling & Layout" or other relevant rule sections if core patterns (like spacing props) change.

---

# DOOM Design System Analysis (v0.4.4)

## Available Components

### Layout

- **Flex**: Main layout tool. Props: `gap` (0-16), `direction`, `justify`, `align`, `wrap` (boolean).
- **Grid**: 2D layout. Props: `gap` (0-16), `columns` (number or string like "1fr 2fr").
- **Stack**: Vertical stack (specialized Flex). Props: `gap`, `align`.
- **Container**: Max-width constraint. Props: `maxWidth` ('sm' | 'md' | 'lg' | 'xl' | 'fluid').
- **Switcher**: Responsive switch from row to column. Props: `threshold` ('xs', 'sm', 'md').

### UI Components (Complete List)

#### Forms & Inputs

- **Button**: Standard interactive trigger.
- **SplitButton**: Button with a dropdown menu.
- **Input**: Text input field.
- **Textarea**: Multi-line text input.
- **Select**: Dropdown selection input.
- **Checkbox**: Binary selection.
- **RadioGroup**: Single selection from a list.
- **Switch**: Toggle switch.
- **Slider**: Range selection.
- **FileUpload**: File upload input.
- **Form**: Wrapper for form handling.
- **Label**: Input labelling.

#### Navigation

- **Tabs**: Tabbed interface switching.
- **Breadcrumbs**: Hierarchical navigation.
- **Pagination**: List navigation.
- **Link**: Hyperlink component.
- **Drawer**: Side-panel navigation.

#### Feedback & Status

- **Alert**: Important context messages.
- **Toast**: Temporary notifications.
- **Spinner**: Indeterminate loading state.
- **ProgressBar**: Determinate loading state.
- **Skeleton**: Loading placeholder.
- **Badge**: Status labeling.

#### Overlays

- **Modal**: Dialog window.
- **Sheet**: Side or bottom sheet.
- **Popover**: Content floating next to trigger.
- **Tooltip**: Hover information.
- **Dropdown**: Menu list.

#### Data & Layout (Content)

- **Text**: Typography component (headings, body).
- **Table**: Data grid display.
- **Card**: Content container.
- **Accordion**: Collapsible sections.
- **Avatar**: User profile image.
- **Image**: Image component.
- **Icon**: Icon wrapper.
- **Slat**: Horizontal item layout.
- **ActionRow**: Interactive list item.
- **Page**: Page layout wrapper.

## Design Tokens

### Spacing Scale (Gap)

Use these integer values for `gap` props:

- `0`: 0
- `1`: 0.25rem (4px)
- `2`: 0.5rem (8px)
- `3`: 0.75rem (12px)
- `4`: 1rem (16px)
- `5`: 1.25rem (20px)
- `6`: 1.5rem (24px)
- `8`: 2rem (32px)
- `10`: 2.5rem (40px)
- `12`: 3rem (48px)
- `16`: 4rem (64px)

### Colors

Available via CSS variables (e.g., `var(--primary)`) or component `color` props.

- **Primary/Secondary**: Context-dependent (light/dark mode).
- **Status**: `error` (red), `success` (green), `warning` (yellow).
- **Neutrals**: `muted`, `slate`, `gray`.

### Styling Approach

The system uses **Neubrutalism**:

- Thick borders (`var(--border-width)`).
- Hard shadows (`var(--shadow-hard)`).
- High contrast.
- `lucide-react` icons with `strokeWidth={2.5}` match this aesthetic.
