import { useState } from 'react';

export function useAlbumPages() {
  const [pages, setPages] = useState([]);
  return { pages };
}
