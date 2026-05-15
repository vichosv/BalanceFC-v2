import { useState, useEffect } from 'react';
import { subscribeShopItems, DEFAULT_SHOP_ITEMS } from '../utils/shop';

export function useShopItems() {
  const [items, setItems] = useState(DEFAULT_SHOP_ITEMS);
  useEffect(() => subscribeShopItems(setItems), []);
  return items;
}
