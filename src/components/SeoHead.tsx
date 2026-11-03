import React from 'react';
import { useDocumentSeo } from '../hooks/useDocumentSeo';

/**
 * Headless component that mounts inside the application root to keep document <title>,
 * meta tags, canonical link, and JSON-LD structured data updated across all views.
 */
export const SeoHead: React.FC = () => {
  useDocumentSeo();
  return null;
};
