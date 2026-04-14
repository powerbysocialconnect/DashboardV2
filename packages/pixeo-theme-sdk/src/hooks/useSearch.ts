import { useState, useCallback } from 'react';
import { ProductData } from '../types';

/**
 * PixeoCommerce V2 Search Hook
 * Provides a standardized way for themes to perform real-time product queries.
 */
export function useSearch(options: { 
  storeId?: string;
  provider?: (query: string) => Promise<ProductData[]>;
 } = {}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = useCallback(async (currentQuery: string) => {
    if (!currentQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (options.provider) {
        const data = await options.provider(currentQuery);
        setResults(data);
      } else {
        // Default platform implementation would go here (fetch from Pixeo API)
        // For development, we allow the provider to be injected or mock it.
        console.log(`Searching for: ${currentQuery} in store: ${options.storeId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [options]);

  const onQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
    // Debounce logic would normally be handled here or by the consumer
    performSearch(newQuery);
  }, [performSearch]);

  return {
    query,
    results,
    loading,
    error,
    onQueryChange,
    setQuery
  };
}
