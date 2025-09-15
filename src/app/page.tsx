import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mx-auto max-w-md space-y-8">
        {/* App Name */}
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          CambiaCromos
        </h1>

        {/* Tagline */}
        <p className="text-lg text-muted-foreground sm:text-xl">
          Intercambia cromos deportivos con coleccionistas de todo el mundo
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/mi-coleccion">Mi colección</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/mi-coleccion">Explorar cromos</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
