import React from 'react';

type ProviderWithProps = [
    React.ComponentType<{ children: React.ReactNode }>,
    Record<string, unknown>?,
];

/**
 * Composes an array of provider components into a single wrapper component.
 * Reduces deeply nested JSX in layout files.
 *
 * @example
 * const Providers = composeProviders([
 *   [SupabaseProvider],
 *   [QueryProvider],
 *   [ThemeProvider],
 * ]);
 * // Then: <Providers>{children}</Providers>
 */
export function composeProviders(providers: ProviderWithProps[]) {
    return function ComposedProviders({ children }: { children: React.ReactNode }) {
        return providers.reduceRight<React.ReactNode>(
            (acc, [Provider, props = {}]) => <Provider {...props}>{acc}</Provider>,
            children
        );
    };
}
