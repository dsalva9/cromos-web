'use client';

import { useState, useEffect } from 'react';
import { mockFootballers, type FootballerCard } from '@/lib/mockData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface CardState {
  tengo: boolean;
  quiero: boolean;
}

type CollectionState = Record<string, CardState>;

function getRarityColor(rarity: FootballerCard['rarity']) {
  switch (rarity) {
    case 'legendary': return 'bg-yellow-500';
    case 'epic': return 'bg-purple-500';
    case 'rare': return 'bg-blue-500';
    case 'common': return 'bg-gray-500';
  }
}

export default function CollectionPage() {
  const [collectionState, setCollectionState] = useState<CollectionState>({});
  const [counts, setCounts] = useState({ tengo: 0, quiero: 0 });

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cromos-collection');
    if (saved) {
      try {
        const parsedState = JSON.parse(saved);
        setCollectionState(parsedState);
        updateCounts(parsedState);
      } catch (error) {
        console.error('Error loading collection state:', error);
      }
    }
  }, []);

  // Update counts based on collection state
  const updateCounts = (state: CollectionState) => {
    const tengo = Object.values(state).filter(card => card.tengo).length;
    const quiero = Object.values(state).filter(card => card.quiero).length;
    setCounts({ tengo, quiero });
  };

  // Toggle card state and persist to localStorage
  const toggleCardState = (cardId: string, type: 'tengo' | 'quiero') => {
    setCollectionState(prev => {
      const newState = {
        ...prev,
        [cardId]: {
          tengo: type === 'tengo' ? !prev[cardId]?.tengo : prev[cardId]?.tengo || false,
          quiero: type === 'quiero' ? !prev[cardId]?.quiero : prev[cardId]?.quiero || false,
        }
      };

      // Persist to localStorage
      localStorage.setItem('cromos-collection', JSON.stringify(newState));
      updateCounts(newState);

      return newState;
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Mi Colección</h1>
        <div className="flex gap-4 text-sm">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Tengo: {counts.tengo}
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Quiero: {counts.quiero}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {mockFootballers.map((player) => (
          <div
            key={player.id}
            className="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Player Image Placeholder */}
            <div className="mb-4 aspect-[3/4] rounded-md bg-muted flex items-center justify-center">
              <span className="text-sm text-muted-foreground">Foto</span>
            </div>

            {/* Player Info */}
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-sm leading-tight">{player.name}</h3>
                <Badge
                  className={`${getRarityColor(player.rarity)} text-white text-xs`}
                >
                  {player.rating}
                </Badge>
              </div>

              <p className="text-sm font-medium text-primary">{player.team}</p>
              <p className="text-xs text-muted-foreground">{player.position}</p>
              <p className="text-xs text-muted-foreground">{player.nationality}</p>

              {/* Toggle Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant={collectionState[player.id]?.tengo ? "default" : "outline"}
                  className={`flex-1 text-xs ${
                    collectionState[player.id]?.tengo
                      ? "bg-green-600 hover:bg-green-700"
                      : "hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                  }`}
                  onClick={() => toggleCardState(player.id, 'tengo')}
                >
                  Tengo
                </Button>
                <Button
                  size="sm"
                  variant={collectionState[player.id]?.quiero ? "default" : "outline"}
                  className={`flex-1 text-xs ${
                    collectionState[player.id]?.quiero
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                  }`}
                  onClick={() => toggleCardState(player.id, 'quiero')}
                >
                  Quiero
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}