"use client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchLink } from "@trpc/react-query"
import { trpc } from "./client"
import React, { useState } from "react"



export default function Provider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({}));
    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: "/api/trpc",
                }),
            ],
        }),
    );

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </trpc.Provider>
    );
}