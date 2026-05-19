export default function BlogLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col flex-1 bg-gray-50 dark:bg-gray-900">
            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                {children}
            </main>
        </div>
    );
}
