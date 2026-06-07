---
applyTo: "src/components/**/*.tsx, src/pages/**/*.tsx"
---

## Frontend Conventions

- Use Tailwind CSS for styling (no raw CSS)
- Component names use PascalCase
- Props interface: ComponentNameProps
- Use React.memo for expensive renders
- Prefer server components where possible
- Use Suspense for async data loading
- Accessibility: always add aria-labels
