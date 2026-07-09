"use client";

import type { SearchQueryVariables } from "@/gql/graphql";
import type { StorefrontCollectionMatch } from "@/lib/storefront/search-utils";
import {
  featuredVariablesToQueryString,
  searchVariablesToQueryString,
} from "@/lib/storefront/search-params";
import { useEffect, useRef, useState } from "react";

type ProductsCollection = {
  edges: { node: { id: string } }[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
} | null;

type State = {
  productsCollection: ProductsCollection;
  matchingCollections: StorefrontCollectionMatch[];
  fetching: boolean;
  error: string | null;
};

export type StorefrontProductsInitialData = {
  productsCollection: ProductsCollection;
  matchingCollections?: StorefrontCollectionMatch[];
};

type HookOptions = {
  initialData?: StorefrontProductsInitialData;
};

export function useStorefrontProductSearch(
  variables: SearchQueryVariables,
  collectionId?: string,
  options?: HookOptions,
) {
  const queryKey = searchVariablesToQueryString(variables, collectionId);
  const skipInitialFetchRef = useRef(options?.initialData ? queryKey : null);

  const [state, setState] = useState<State>(() =>
    options?.initialData
      ? {
          productsCollection: options.initialData.productsCollection,
          matchingCollections: options.initialData.matchingCollections ?? [],
          fetching: false,
          error: null,
        }
      : {
          productsCollection: null,
          matchingCollections: [],
          fetching: true,
          error: null,
        },
  );

  useEffect(() => {
    if (skipInitialFetchRef.current === queryKey) {
      skipInitialFetchRef.current = null;
      return;
    }

    let active = true;

    setState((prev) => ({ ...prev, fetching: true, error: null }));

    void fetch(`/api/storefront/products?${queryKey}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load products");
        return res.json() as Promise<{
          productsCollection: ProductsCollection;
          matchingCollections?: StorefrontCollectionMatch[];
        }>;
      })
      .then((payload) => {
        if (!active) return;
        setState({
          productsCollection: payload.productsCollection,
          matchingCollections: payload.matchingCollections ?? [],
          fetching: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          productsCollection: null,
          matchingCollections: [],
          fetching: false,
          error: "Failed to load products",
        });
      });

    return () => {
      active = false;
    };
  }, [queryKey]);

  return state;
}

export function useStorefrontFeaturedProducts(
  variables: {
    first: number;
    after?: string | null;
  },
  options?: HookOptions,
) {
  const queryKey = featuredVariablesToQueryString(variables);
  const skipInitialFetchRef = useRef(options?.initialData ? queryKey : null);

  const [state, setState] = useState<State>(() =>
    options?.initialData
      ? {
          productsCollection: options.initialData.productsCollection,
          matchingCollections: [],
          fetching: false,
          error: null,
        }
      : {
          productsCollection: null,
          matchingCollections: [],
          fetching: true,
          error: null,
        },
  );

  useEffect(() => {
    if (skipInitialFetchRef.current === queryKey) {
      skipInitialFetchRef.current = null;
      return;
    }

    let active = true;

    setState((prev) => ({ ...prev, fetching: true, error: null }));

    void fetch(`/api/storefront/products?${queryKey}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load products");
        return res.json() as Promise<{
          productsCollection: ProductsCollection;
          matchingCollections?: StorefrontCollectionMatch[];
        }>;
      })
      .then((payload) => {
        if (!active) return;
        setState({
          productsCollection: payload.productsCollection,
          matchingCollections: payload.matchingCollections ?? [],
          fetching: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          productsCollection: null,
          matchingCollections: [],
          fetching: false,
          error: "Failed to load products",
        });
      });

    return () => {
      active = false;
    };
  }, [queryKey]);

  return state;
}

export function useDraftProductIds(initialIds?: string[]) {
  const hasServerIds = initialIds !== undefined;
  const [draftIds, setDraftIds] = useState<Set<string>>(
    () => new Set(initialIds ?? []),
  );
  const [loaded, setLoaded] = useState(true);

  useEffect(() => {
    if (!hasServerIds) {
      // Draft products are filtered server-side in /api/storefront/products.
      setDraftIds(new Set());
      setLoaded(true);
    }
  }, [hasServerIds]);

  return { draftIds, draftLoaded: loaded };
}
