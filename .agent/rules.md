# Agent Coding Rules & Standards

These rules must be followed for all code generation and modification tasks within the `moneyprinter` codebase.

## 1. Design System Priority
*   **ALWAYS** use components from the Design System (`@design-system`) instead of native HTML elements unless there isn't a viable component in which case, let the user know and ask them for approval to create one.
*   **NEVER** create new UI patterns if a component already exists (e.g., use `ActionRow` for lists, `Card` for containers).
*   **Import Path**: `import { ... } from '@design-system';`

## 2. Styling & Layout
*   **NO Inline Styles**: Avoid the `style={{ ... }}` prop. Use component props instead.
    *   ❌ `<div style={{ display: 'flex', gap: '1rem' }}>`
    *   ✅ `<Flex gap="1rem">`
*   **Layout Components**: Use `Flex` and `Grid` for all layout needs.
    *   Use `direction`, `align`, `justify`, and `gap` props on `Flex`.
    *   Use `columns` and `gap` props on `Grid`.
*   **Spacing**: Use `gap` for spacing between elements. Avoid `margin` on children whenever possible.

## 3. Typography
*   **Use Text Component**: Always use the `<Text>` component.
*   **Variants**: Use `variant="..."` (h1-h6, body, small, caption) instead of font-size styles.
*   **Colors**: Use `color="..."` (primary, muted, error, etc.) instead of hex codes or style props.
    *   ❌ `<span style={{ color: 'red' }}>Error</span>`
    *   ✅ `<Text color="error">Error</Text>`

## 4. Theming & Colors
*   **CSS Variables Only**: Never use hardcoded hex values (e.g., `#000`, `#fff`).
*   **Semantic Variables**: Use semantic names over literal ones.
    *   `var(--primary)`
    *   `var(--card-bg)`
    *   `var(--card-border)`
    *   `var(--muted-foreground)`
*   **Borders**: Always use `var(--border-width)` and `var(--radius)`.

## 5. Icons
*   **Library**: Use `lucide-react`.
*   **Standard Props**: Always set `strokeWidth={2.5}` for the neubrutalism aesthetic.
*   **Sizing**: Use the `size` prop (e.g., `size={24}`).

## 6. Component Extension
*   If a custom style is absolutely required (e.g., a specific hover effect), use `styled(Component)` to extend the Design System component rather than wrapping it in a styled `div`.

## 7. File Organization & Imports
*   **Colocation**: Keep related files together. If a component becomes complex, move it to its own folder with an `index.ts`.
*   **Barrel Exports**: Use `index.ts` files to expose public components from directories.
*   **Absolute Imports**: Always use absolute paths (e.g., `@/components/...`) instead of relative paths (e.g., `../../components/...`).

## 8. TypeScript & Safety
*   **Strict Typing**: Define explicit interfaces for all component props.
*   **No Any**: Avoid using `any`. If a type is truly dynamic, use `unknown` and narrow it.
*   **Prop Types**: Use specific union types for string props (e.g., `variant: 'primary' | 'secondary'`) instead of generic `string`.

## 9. React & Next.js Patterns
*   **Server Components Default**: Assume all components are Server Components unless they require interactivity.
*   **'use client'**: Explicitly add `'use client';` at the very top of files that use hooks or event listeners.
*   **Composition**: Pass data down via props; avoid fetching data inside Client Components if possible.

## 10. State Management
*   **URL State**: Prefer URL search parameters (`?tab=income`) for UI states that should be shareable or persistent on refresh.
*   **Server Actions**: Use Server Actions for all data mutations.
*   **Zustand**: Use Zustand only for global client-side state (like themes or complex session data).

## 11. Documentation & Testing
*   **Storybook**: Every new component in `@design-system` MUST have a corresponding `.stories.tsx` file.
*   **Maintenance**: If you add/modify props in a component, you **MUST** update the corresponding Storybook file to reflect those changes (add controls, new stories, etc.).
*   **Examples**: Stories should cover all major variants and states (e.g., Default, Disabled, Loading).
*   **Unit Tests**: Whenever code changes are made, you **MUST** create/update unit tests and run them to ensure no regressions.


## 12. Database Migrations
*   **Source of Truth**: `src/lib/schema.sql` is the SINGLE source of truth for the database schema.
*   **Workflow**:
    1.  Modify `src/lib/schema.sql`.
    2.  Run `./scripts/atlas.sh migrate apply`.
    3.  This script will automatically run `prisma db pull` and `prisma generate` to keep Prisma in sync.
*   **Prisma**: Do NOT edit `schema.prisma` manually for schema changes. It is a derivative of the database state.
*   **Dev**: Use `scripts/dev.sh` which uses `prisma db push` to sync the local dev DB with the current Prisma schema.

