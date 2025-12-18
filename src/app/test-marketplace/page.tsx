'use client';

import { useState } from 'react';
import { useListings } from '@/hooks/marketplace/useListings';
import { useCreateListing } from '@/hooks/marketplace/useCreateListing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function TestMarketplacePage() {
  const { listings, loading, error } = useListings({ limit: 5 });
  const { createListing, loading: creating } = useCreateListing();
  const [testData, setTestData] = useState({
    title: 'Test Listing',
    description: 'This is a test listing',
    collection_name: 'Test Collection',
    sticker_number: '001',
  });

  const handleCreateTest = async () => {
    try {
      const listingId = await createListing(testData);
      toast.success(`Test listing created: ${listingId}`);
      setTestData({
        title: 'Test Listing',
        description: 'This is a test listing',
        collection_name: 'Test Collection',
        sticker_number: '001',
      });
    } catch (error) {
      toast.error(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-gray-900 mb-8">
          Marketplace Test Page
        </h1>

        {/* Test Create Listing */}
        <div className="bg-white border-2 border-black p-6 rounded-lg mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Test Create Listing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              value={testData.title}
              onChange={e =>
                setTestData(prev => ({ ...prev, title: e.target.value }))
              }
              placeholder="Title"
              className="bg-white border-2 border-black text-gray-900"
            />
            <Input
              value={testData.collection_name}
              onChange={e =>
                setTestData(prev => ({
                  ...prev,
                  collection_name: e.target.value,
                }))
              }
              placeholder="Collection"
              className="bg-white border-2 border-black text-gray-900"
            />
            <Input
              value={testData.sticker_number}
              onChange={e =>
                setTestData(prev => ({
                  ...prev,
                  sticker_number: e.target.value,
                }))
              }
              placeholder="Number"
              className="bg-white border-2 border-black text-gray-900"
            />
            <Input
              value={testData.description}
              onChange={e =>
                setTestData(prev => ({ ...prev, description: e.target.value }))
              }
              placeholder="Description"
              className="bg-white border-2 border-black text-gray-900"
            />
          </div>
          <Button
            onClick={handleCreateTest}
            disabled={creating}
            className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold"
          >
            {creating ? 'Creating...' : 'Create Test Listing'}
          </Button>
        </div>

        {/* Test Listings Display */}
        <div className="bg-white border-2 border-black p-6 rounded-lg">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Current Listings
          </h2>

          {loading && <p className="text-gray-900">Loading listings...</p>}

          {error && (
            <div className="bg-red-900 text-red-100 p-4 rounded mb-4">
              <p className="font-bold">Error:</p>
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {listings.map(listing => (
              <div
                key={listing.id}
                className="bg-gray-50 border-2 border-black p-4 rounded"
              >
                <h3 className="font-bold text-gray-900">{listing.title}</h3>
                <p className="text-gray-600">By: {listing.author_nickname}</p>
                <p className="text-gray-600">Status: {listing.status}</p>
                <p className="text-gray-600">Views: {listing.views_count}</p>
                {listing.collection_name && (
                  <p className="text-gray-600">
                    Collection: {listing.collection_name}
                  </p>
                )}
                {listing.sticker_number && (
                  <p className="text-gray-600">
                    Number: #{listing.sticker_number}
                  </p>
                )}
                <p className="text-gray-500 text-sm">
                  Created: {new Date(listing.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {!loading && listings.length === 0 && (
            <p className="text-gray-600">
              No listings found. Create one above!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
