# CambioCromos UI Components Guide

This guide documents all UI components in the CambioCromos design system, including their usage, variants, and styling.

## Design System

### Colors

- **Primary**: #FFC000 (Yellow)
- **Background**: #374151 (Medium Gray), #1F2937 (Dark Gray)
- **Border**: #000000 (Black, 2px thick)
- **Text**: #FFFFFF (White)
- **Destructive**: #DC2626 (Red)

### Typography

- **Font**: Geist Sans
- **Weights**: Normal (400), Medium (500), Bold (700)
- **Button Text**: Bold, Uppercase
- **Badge Text**: Bold, Uppercase

## Components

### Button

A versatile button component with multiple variants for different actions.

```tsx
import { Button } from '@/components/ui/button';

// Default (Yellow)
<Button>Click me</Button>

// Destructive (Red)
<Button variant="destructive">Delete</Button>

// Outline (Transparent with white text)
<Button variant="outline">Cancel</Button>

// Ghost (Transparent with white text on hover)
<Button variant="ghost">Settings</Button>

// Secondary (Gray)
<Button variant="secondary">Secondary</Button>

// Link (Yellow text with underline)
<Button variant="link">Learn more</Button>
```

#### Variants

- `default`: Yellow background with black text and thick black border
- `destructive`: Red background with white text
- `outline`: Transparent with white text and black border
- `ghost`: Transparent with white text, no border
- `secondary`: Gray background with white text
- `link`: Yellow text with underline

#### Sizes

- `default`: h-10 px-4 py-2
- `sm`: h-9 px-3
- `lg`: h-11 px-8
- `icon`: h-10 w-10

### ModernCard

A card component with thick borders and dark background, perfect for sports cards.

```tsx
import {
  ModernCard,
  ModernCardHeader,
  ModernCardTitle,
  ModernCardContent,
} from '@/components/ui/modern-card';

<ModernCard>
  <ModernCardHeader>
    <ModernCardTitle>Card Title</ModernCardTitle>
  </ModernCardHeader>
  <ModernCardContent>Card content goes here</ModernCardContent>
</ModernCard>;
```

#### Features

- Thick 2px black borders
- Dark gray background (#374151)
- Complete structure with Header, Title, Description, Content, and Footer
- Hover effect with shadow enhancement

### Input & Textarea

Form input components with dark theme styling.

```tsx
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

<Input placeholder="Enter your name" />
<Textarea placeholder="Enter your message" />
```

#### Features

- Dark gray background (#374151)
- Thick 2px black borders
- White text with gray placeholders
- Yellow focus ring

### Badge

Small badges for status indicators or tags.

```tsx
import { Badge } from '@/components/ui/badge';

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
```

#### Variants

- `default`: Yellow background with black text
- `secondary`: Gray background with white text
- `destructive`: Red background with white text
- `outline`: Transparent with white text

#### Features

- Circular shape with thick black borders
- Bold, uppercase text

### Progress

Progress bar component for showing completion status.

```tsx
import { Progress } from '@/components/ui/progress';

<Progress value={75} />;
```

#### Features

- Yellow fill color (#FFC000)
- Dark gray background (#374151)
- Thick 2px black borders
- Height of 4px (thicker than default)

### Dialog

Modal dialog component for overlays and popups.

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
    </DialogHeader>
    Dialog content goes here
  </DialogContent>
</Dialog>;
```

#### Features

- Dark gray background (#374151) with thick black borders
- White text
- White close button icon
- Semi-transparent black overlay

### Tabs

Tabbed interface component for organizing content.

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>;
```

#### Features

- Dark gray tab list background (#374151) with black border
- Yellow active tab (#FFC000) with black text
- White inactive tabs
- Yellow focus ring

### Select

Dropdown select component for choosing from options.

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>;
```

#### Features

- Dark gray trigger background (#374151) with black border
- Dark gray dropdown background with black border
- White text
- Yellow selected item highlight
- White check icon for selected items

### RadioGroup

Radio button group for selecting one option from multiple choices.

```tsx
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

<RadioGroup defaultValue="option1">
  <RadioGroupItem value="option1" id="option1">
    <Label htmlFor="option1">Option 1</Label>
  </RadioGroupItem>
  <RadioGroupItem value="option2" id="option2">
    <Label htmlFor="option2">Option 2</Label>
  </RadioGroupItem>
</RadioGroup>;
```

#### Features

- White radio buttons with thick black borders
- Yellow selected indicator
- White text labels
- Yellow focus ring

### Alert

Alert component for displaying important messages.

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

<Alert>
  <AlertTitle>Information</AlertTitle>
  <AlertDescription>This is an important message.</AlertDescription>
</Alert>;
```

#### Variants

- `default`: Dark gray background with white text
- `destructive`: Red background with white text

#### Features

- Thick 2px black borders
- Bold white title
- Regular white description

### Label

Label component for form fields.

```tsx
import { Label } from '@/components/ui/label';

<Label htmlFor="email">Email Address</Label>
<Input id="email" type="email" />
```

#### Features

- White text color
- Medium font weight
- Proper association with form inputs

## Usage Guidelines

### Consistency

- Always use the predefined variants and sizes
- Don't customize colors or borders directly
- Maintain the thick black border style for all interactive elements

### Accessibility

- All components have proper focus states with yellow rings
- Components are keyboard navigable
- Text has sufficient contrast against backgrounds

### Responsive Design

- Components are designed to work on all screen sizes
- Test mobile layouts when using components in complex layouts

## Toast Notifications

The app includes a toast notification system using Sonner.

```tsx
import { toast } from 'sonner';

// Success toast
toast.success('Operation completed successfully');

// Error toast
toast.error('An error occurred');

// Info toast
toast.info('Here is some information');
```

Toasts are styled with the CambioCromos theme:

- Dark gray background (#374151)
- White text
- Thick black borders
