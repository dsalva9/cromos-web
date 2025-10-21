# Marketplace Components Guide

This guide documents all marketplace-specific components in the CambioCromos design system.

## Components

### ListingCard

Displays listing preview in grid layouts with image, status, and metadata.

```tsx
import { ListingCard } from '@/components/marketplace/ListingCard';

<ListingCard listing={listing} />;
```

**Props:**

- `listing: Listing` - Listing data object from v1.6.0 schema

**Features:**

- Image with fallback (initials)
- Status badge (active/sold/removed)
- Author info with avatar
- Views count
- Relative date display
- Hover scale effect
- Click to detail page

### ListingForm

Reusable form for create/edit listing with validation.

```tsx
import { ListingForm } from '@/components/marketplace/ListingForm';

<ListingForm
  onSubmit={handleSubmit}
  initialData={initialData}
  loading={loading}
/>;
```

**Props:**

- `onSubmit: (data: CreateListingForm) => Promise<void>` - Submit handler
- `initialData?: Partial<CreateListingForm>` - Pre-fill data for editing
- `loading?: boolean` - Loading state

**Features:**

- Required title field with validation
- Optional fields: description, number, collection, image
- Character counter (500 max for description, 100 for title/collection)
- Client-side validation
- Image upload integration

### SearchBar

Search input with debounce for marketplace feed.

```tsx
import { SearchBar } from '@/components/marketplace/SearchBar';

<SearchBar
  value={searchQuery}
  onChange={setSearchQuery}
  placeholder="Search by title, collection..."
/>;
```

**Props:**

- `value: string` - Controlled value
- `onChange: (value: string) => void` - Change handler
- `placeholder?: string` - Input placeholder

**Features:**

- 500ms debounce
- Search icon
- Dark theme styling

### ImageUpload

Image upload component for listing photos.

```tsx
import { ImageUpload } from '@/components/marketplace/ImageUpload';

<ImageUpload value={imageUrl} onChange={setImageUrl} />;
```

**Props:**

- `value?: string | null` - Current image URL
- `onChange: (url: string | null) => void` - Change handler

**Features:**

- Upload to Supabase Storage
- File validation (type and size)
- Preview with remove option
- Loading states
- Error handling

## Hooks

### useListings

Fetch marketplace feed with pagination and search.

```tsx
import { useListings } from '@/hooks/marketplace/useListings';

const { listings, loading, error, hasMore, loadMore, refetch } = useListings({
  search: searchQuery,
  limit: 20,
});
```

**Parameters:**

- `search?: string` - Search query
- `limit?: number` - Items per page (default: 20)

**Returns:**

- `listings: Listing[]` - Array of listings
- `loading: boolean` - Loading state
- `error: string | null` - Error message
- `hasMore: boolean` - Whether more items available
- `loadMore: () => void` - Load more items
- `refetch: () => void` - Refetch listings

### useListing

Fetch single listing with view tracking.

```tsx
import { useListing } from '@/hooks/marketplace/useListing';

const { listing, loading, error, incrementViews, deleteListing, refetch } =
  useListing(listingId);
```

**Parameters:**

- `listingId: string` - Listing ID

**Returns:**

- `listing: Listing | null` - Listing data
- `loading: boolean` - Loading state
- `error: string | null` - Error message
- `incrementViews: () => Promise<void>` - Increment view count
- `deleteListing: () => Promise<void>` - Delete listing
- `refetch: () => void` - Refetch listing

### useCreateListing

Create new listing.

```tsx
import { useCreateListing } from '@/hooks/marketplace/useCreateListing';

const { createListing, loading } = useCreateListing();

const listingId = await createListing({
  title: 'My Listing',
  description: 'Description',
  collection_name: 'Collection',
  sticker_number: '001',
  image_url: 'https://...',
});
```

**Returns:**

- `createListing: (data: CreateListingForm) => Promise<string>` - Create listing function
- `loading: boolean` - Loading state

## Pages

### Marketplace Feed (`/marketplace`)

Main marketplace page with search and infinite scroll.

**Features:**

- Grid layout with responsive columns (1-4 based on screen size)
- Real-time search with 500ms debounce
- Infinite scroll pagination
- Empty states and loading skeletons
- Create listing button for authenticated users

### Create Listing (`/marketplace/create`)

Form to create new marketplace listings.

**Features:**

- Required title field with validation
- Optional fields: description, number, collection, image
- Character counters
- Image upload
- Form validation with error messages

### Listing Detail (`/marketplace/[id]`)

Detailed view of a single listing.

**Features:**

- Large image display with fallback
- Seller profile link
- View counter (auto-increment for non-owners)
- Contact seller button (for authenticated non-owners)
- Edit/delete actions for owner
- Status badge
- Responsive layout

## Styling

All marketplace components follow the CambioCromos design system:

- **Primary Color**: #FFC000 (Yellow)
- **Background**: #374151 (Medium Gray), #1F2937 (Dark Gray)
- **Border**: #000000 (Black, 2px thick)
- **Text**: #FFFFFF (White)
- **Typography**: Bold, uppercase text for buttons and badges

## Usage Examples

### Basic Marketplace Feed

```tsx
'use client';

import { useListings } from '@/hooks/marketplace/useListings';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { SearchBar } from '@/components/marketplace/SearchBar';

export default function MarketplacePage() {
  const [search, setSearch] = useState('');
  const { listings, loading, hasMore, loadMore } = useListings({ search });

  return (
    <div>
      <SearchBar value={search} onChange={setSearch} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map(listing => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
      {hasMore && <button onClick={loadMore}>Load More</button>}
    </div>
  );
}
```

### Create Listing Form

```tsx
'use client';

import { useState } from 'react';
import { ListingForm } from '@/components/marketplace/ListingForm';
import { useCreateListing } from '@/hooks/marketplace/useCreateListing';
import { toast } from 'sonner';

export default function CreateListingPage() {
  const { createListing, loading } = useCreateListing();

  const handleSubmit = async data => {
    try {
      const listingId = await createListing(data);
      toast.success('Listing created!');
      router.push(`/marketplace/${listingId}`);
    } catch (error) {
      toast.error('Failed to create listing');
    }
  };

  return <ListingForm onSubmit={handleSubmit} loading={loading} />;
}
```

## Error Handling

All components include proper error handling:

- Network errors display user-friendly messages
- Validation errors show inline feedback
- Loading states prevent duplicate actions
- Toast notifications for user feedback

## Performance

- Infinite scroll reduces initial load time
- Debounced search minimizes API calls
- Image lazy loading with Next.js Image component
- Optimistic UI updates where appropriate
- Proper cleanup in useEffect hooks
