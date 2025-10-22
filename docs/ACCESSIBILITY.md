# Accessibility Guide

## Standards Compliance
- WCAG 2.1 Level AA compliance target
- Keyboard navigation support
- Screen reader tested

## Key Features
- Skip links for keyboard users
- ARIA labels on interactive elements
- Semantic HTML landmarks
- Focus management in dialogs
- Descriptive alt text for images

## Testing
- Manual keyboard navigation testing
- Screen reader testing (NVDA/JAWS)
- Automated accessibility audits with Lighthouse

## Improvements Implemented
- Added Spanish skip link and landmarks in `src/app/layout.tsx`
- Labeled icon-only buttons and added `aria-hidden` to decorative icons
- Improved alt text for images in cards
- Added step validation summaries and inline error messages
- Replaced spinners with content-aware skeletons

