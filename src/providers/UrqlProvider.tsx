"use client";

import { relayPagination } from "@urql/exchange-graphcache/extras";
import {
  UrqlProvider,
  createClient,
  fetchExchange,
  ssrExchange,
} from "@urql/next";

import { cacheExchange } from "@urql/exchange-graphcache";
import { useMemo, useRef } from "react";
import { useAuth } from "./AuthProvider";

const graphqlUrl = () => {
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF?.trim();
  if (!projectRef) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_PROJECT_REF");
  }
  return `https://${projectRef}.supabase.co/graphql/v1`;
};

const anonKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return key;
};

export default function Provider({ children }: React.PropsWithChildren) {
  const { session } = useAuth();
  const ssrRef = useRef(ssrExchange());

  const client = useMemo(() => {
    return createClient({
      url: graphqlUrl(),
      exchanges: [
        cacheExchange({
          resolvers: {
            Query: {
              mediasCollection: relayPagination(),
            },
          },
          keys: {
            carts: (data) => `${data.product_id}`,
          },
        }),
        ssrRef.current,
        fetchExchange,
      ],
      fetchOptions: () => {
        const headers: Record<string, string> = {
          apikey: anonKey(),
        };

        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        return { headers };
      },
      suspense: false,
    });
  }, [session?.access_token]);

  return (
    <UrqlProvider client={client} ssr={ssrRef.current}>
      {children}
    </UrqlProvider>
  );
}
