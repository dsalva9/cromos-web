import AuthGuard from '@/components/AuthGuard';

function TradesContent() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Intercambios</h1>
      <p className="text-muted-foreground">Intercambios - prÃ³ximamente</p>
    </div>
  );
}

export default function TradesPage() {
  return (
    <AuthGuard>
      <TradesContent />
    </AuthGuard>
  );
}

