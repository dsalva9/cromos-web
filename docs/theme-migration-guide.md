# CambioCromos Theme Migration Guide

This guide helps developers migrate existing components to use the new CambioCromos theme.

## Overview

The CambioCromos theme features:

- **Primary Color**: #FFC000 (Yellow)
- **Background**: #374151 (Medium Gray), #1F2937 (Dark Gray)
- **Border**: #000000 (Black, 2px thick)
- **Text**: #FFFFFF (White)
- **Focus**: Yellow ring with dark offset

## Common Migration Patterns

### 1. Updating Background and Text Colors

```tsx
// Before
<div className="bg-white text-gray-900">

// After
<div className="bg-[#374151] text-white">
```

### 2. Adding Thick Borders

```tsx
// Before
<div className="border border-gray-200">

// After
<div className="border-2 border-black">
```

### 3. Updating Button Styling

```tsx
// Before
<button className="bg-blue-500 text-white px-4 py-2 rounded">

// After
<button className="bg-[#FFC000] text-black border-2 border-black px-4 py-2 rounded font-bold uppercase">
```

### 4. Updating Input Fields

```tsx
// Before
<input className="border border-gray-300 bg-white px-3 py-2 text-gray-900">

// After
<input className="border-2 border-black bg-[#374151] px-3 py-2 text-white placeholder:text-gray-400">
```

### 5. Updating Focus States

```tsx
// Before
<input className="focus:outline-none focus:ring-2 focus:ring-blue-500">

// After
<input className="focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-[#1F2937]">
```

## Component-Specific Migrations

### Cards

```tsx
// Before
<div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
  <h3 className="text-lg font-semibold text-gray-900">Card Title</h3>
  <p className="text-gray-600 mt-2">Card content</p>
</div>

// After (using ModernCard)
<ModernCard>
  <ModernCardHeader>
    <ModernCardTitle>Card Title</ModernCardTitle>
  </ModernCardHeader>
  <ModernCardContent>
    Card content
  </ModernCardContent>
</ModernCard>
```

### Navigation

```tsx
// Before
<nav className="bg-white shadow-md">
  <div className="container mx-auto px-4">
    <a href="/" className="text-blue-600 font-bold">Logo</a>
    <ul className="flex space-x-4">
      <li><a href="/about" className="text-gray-700 hover:text-blue-600">About</a></li>
    </ul>
  </div>
</nav>

// After
<nav className="bg-[#1F2937] border-b-2 border-black">
  <div className="container mx-auto px-4">
    <a href="/" className="text-[#FFC000] font-bold uppercase">Logo</a>
    <ul className="flex space-x-4">
      <li><a href="/about" className="text-white hover:text-[#FFC000]">About</a></li>
    </ul>
  </div>
</nav>
```

### Forms

```tsx
// Before
<form className="bg-white p-6 rounded-lg shadow-md">
  <div className="mb-4">
    <label className="block text-gray-700 text-sm font-bold mb-2">
      Email
    </label>
    <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
  </div>
  <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
    Submit
  </button>
</form>

// After
<form className="bg-[#374151] p-6 rounded-lg border-2 border-black">
  <div className="mb-4">
    <Label htmlFor="email">Email</Label>
    <Input id="email" />
  </div>
  <Button>Submit</Button>
</form>
```

## CSS Variables Migration

If you're using CSS variables, update them in your globals.css:

```css
/* Before */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --border: 214.3 31.8% 91.4%;
}

/* After */
:root {
  --background: 31 41 55; /* #374151 */
  --foreground: 255 255 255;
  --primary: 255 192 0; /* #FFC000 */
  --border: 0 0 0; /* #000000 */
}
```

## Tailwind Config Updates

Update your tailwind.config.ts to include the CambioCromos colors:

```tsx
// Add to extend.colors in tailwind.config.ts
colors: {
  primary: {
    DEFAULT: '#FFC000',
    dark: '#FFD700',
  },
  background: {
    DEFAULT: '#1F2937',
    dark: '#111827',
    light: '#374151',
  },
  border: '#000000',
}
```

## Testing Your Migration

1. **Visual Testing**: Check all components against the design system
2. **Contrast Testing**: Ensure text is readable on dark backgrounds
3. **Focus Testing**: Verify all interactive elements have yellow focus rings
4. **Border Testing**: Confirm all interactive elements have thick black borders
5. **Responsive Testing**: Test on mobile and desktop

## Common Issues and Solutions

### Issue: Text not visible on dark background

```tsx
// Problem
<div className="bg-[#374151] text-gray-700">

// Solution
<div className="bg-[#374151] text-white">
```

### Issue: Focus state not visible

```tsx
// Problem
<button className="focus:outline-none">

// Solution
<button className="focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-[#1F2937]">
```

### Issue: Border too thin

```tsx
// Problem
<div className="border border-gray-300">

// Solution
<div className="border-2 border-black">
```

## Best Practices

1. **Use Components**: Prefer using the pre-built UI components over custom styling
2. **Consistent Borders**: Always use `border-2 border-black` for interactive elements
3. **Proper Contrast**: Ensure text is white on dark backgrounds
4. **Focus States**: Always include proper focus states with yellow rings
5. **Test Thoroughly**: Test on different screen sizes and with keyboard navigation

## Resources

- [CambioCromos Components Guide](./components-guide-cambiocromos.md)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/)
