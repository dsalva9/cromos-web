import AuthGuard from '@/components/AuthGuard';

function ProfileContent() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Mi Perfil</h1>
      <p className="text-muted-foreground">Perfil de usuario - próximamente</p>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
