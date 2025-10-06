export interface FootballerCard {
  id: string;
  name: string;
  team: string;
  position: string;
  nationality: string;
  rating: number;
  imageUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const mockFootballers: FootballerCard[] = [
  {
    id: '1',
    name: 'Karim Benzema',
    team: 'Real Madrid',
    position: 'Delantero',
    nationality: 'Francia',
    rating: 91,
    imageUrl: '/placeholder-player.jpg',
    rarity: 'legendary'
  },
  {
    id: '2',
    name: 'Robert Lewandowski',
    team: 'FC Barcelona',
    position: 'Delantero',
    nationality: 'Polonia',
    rating: 92,
    imageUrl: '/placeholder-player.jpg',
    rarity: 'legendary'
  },
  {
    id: '3',
    name: 'Luka Modrić',
    team: 'Real Madrid',
    position: 'Centrocampista',
    nationality: 'Croacia',
    rating: 88,
    imageUrl: '/placeholder-player.jpg',
    rarity: 'epic'
  },
  {
    id: '4',
    name: 'Pedri',
    team: 'FC Barcelona',
    position: 'Centrocampista',
    nationality: 'España',
    rating: 85,
    imageUrl: '/placeholder-player.jpg',
    rarity: 'rare'
  },
  {
    id: '5',
    name: 'Jan Oblak',
    team: 'Atlético Madrid',
    position: 'Portero',
    nationality: 'Eslovenia',
    rating: 89,
    imageUrl: '/placeholder-player.jpg',
    rarity: 'epic'
  },
  {
    id: '6',
    name: 'Vinicius Jr.',
    team: 'Real Madrid',
    position: 'Extremo',
    nationality: 'Brasil',
    rating: 86,
    imageUrl: '/placeholder-player.jpg',
    rarity: 'rare'
  },
  {
    id: '7',
    name: 'Gavi',
    team: 'FC Barcelona',
    position: 'Centrocampista',
    nationality: 'España',
    rating: 82,
    imageUrl: '/placeholder-player.jpg',
    rarity: 'rare'
  },
  {
    id: '8',
    name: 'Sergio Canales',
    team: 'Real Betis',
    position: 'Centrocampista',
    nationality: 'España',
    rating: 83,
    imageUrl: '/placeholder-player.jpg',
    rarity: 'common'
  },
  {
    id: '9',
    name: 'Iago Aspas',
    team: 'RC Celta',
    position: 'Delantero',
    nationality: 'España',
    rating: 84,
    imageUrl: '/placeholder-player.jpg',
    rarity: 'common'
  },
  {
    id: '10',
    name: 'Mikel Oyarzabal',
    team: 'Real Sociedad',
    position: 'Delantero',
    nationality: 'España',
    rating: 83,
    imageUrl: '/placeholder-player.jpg',
    rarity: 'common'
  }
];
