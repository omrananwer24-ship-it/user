export interface Order {
  id: string;
  ownerId?: string;
  name: string;
  phone: string;
  address?: string;
  code: string;
  status: 'pending' | 'arrived';
  createdAt: string;
  price: number;
}

export type OrderStatusFilter = 'all' | 'pending' | 'arrived';

export function cleanCodeForComparison(text: string): string {
  if (!text) return '';
  let cleaned = text.toLowerCase().trim();
  
  // If it's a SHEIN URL or has URL components, extract the ID
  // e.g., goods-p-123456.html or p-123456 or goods/123456
  const pMatch = cleaned.match(/[pP]-([0-9]+)/);
  if (pMatch && pMatch[1]) {
    return pMatch[1];
  }
  
  const idMatch = cleaned.match(/[?&]id=([0-9]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }

  // Handle common SHEIN link share formats or numeric sequences
  const numericMatch = cleaned.match(/\/([0-9]{5,})\b/);
  if (numericMatch && numericMatch[1]) {
    return numericMatch[1];
  }

  // Otherwise, just strip everything except letters and numbers
  return cleaned.replace(/[^a-z0-9]/g, '');
}

export function isSmartCodeMatch(storedCode: string, searchQuery: string): boolean {
  const cleanStored = cleanCodeForComparison(storedCode);
  const cleanSearch = cleanCodeForComparison(searchQuery);

  if (!cleanStored || !cleanSearch) return false;

  // Check if one contains the other (ensure length of match is reasonable to avoid false positives on 1-2 char searches)
  if (cleanStored.includes(cleanSearch) || cleanSearch.includes(cleanStored)) {
    return true;
  }

  return false;
}

