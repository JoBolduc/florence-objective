# ui/

Shared, feature-agnostic building blocks.

- `theme.ts`: colors, spacing, type sizes and the 64dp minimum touch target. Screens use these tokens instead of raw values.
- `app-text.tsx`, `button.tsx`: use these rather than `Text` and `Pressable`, so text follows the theme and tap areas stay large enough.
- `strings.ts`: every user-facing string, in French. ESLint rejects hard-coded text in JSX. Text passed through a variable or an unlisted prop still needs a reviewer's eye. No i18n library yet: when English arrives, this file is the only one that has to change shape, with `strings.x.y` becoming lookups.
- `format.ts`: dates and times in fr-CA.
