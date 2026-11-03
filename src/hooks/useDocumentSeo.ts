import { useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { generateSeoMetadata, updateDocumentHead, SeoMetadata } from '../utils/seo';

/**
 * Custom hook to dynamically synchronize document title, meta descriptions,
 * OpenGraph, Twitter Cards, canonical link, and JSON-LD structured data
 * with the currently active view, product, category, search query, and language.
 */
export function useDocumentSeo(): SeoMetadata {
  const {
    currentView,
    selectedProduct,
    selectedCategory,
    categories,
    searchQuery,
    language,
    siteCustomization,
  } = useStore();

  const metadata = useMemo(() => {
    return generateSeoMetadata({
      currentView,
      selectedProduct,
      selectedCategory,
      categories,
      searchQuery,
      language,
      siteCustomization,
    });
  }, [
    currentView,
    selectedProduct,
    selectedCategory,
    categories,
    searchQuery,
    language,
    siteCustomization,
  ]);

  useEffect(() => {
    updateDocumentHead(metadata);
  }, [metadata]);

  return metadata;
}
