import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Política de Cookies - Cambiocromos.com',
    description: 'Información sobre el uso de cookies y tecnologías similares en Cambiocromos.com',
};

export default function CookiesPage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1 className="text-3xl font-black uppercase mb-6 text-[#FFC000]">Política de Cookies</h1>

            <p>
                Cambiocromos.com utiliza cookies y tecnologías similares para mejorar tu experiencia, garantizar la seguridad del sitio y analizar cómo se utiliza nuestra plataforma.
            </p>

            <h2>1. ¿Qué son las cookies?</h2>
            <p>
                Las cookies son pequeños archivos de texto que los sitios web guardan en tu ordenador o dispositivo móvil cuando los visitas. Permiten que el sitio recuerde tus acciones y preferencias (como el inicio de sesión) durante un período de tiempo.
            </p>

            <h2>2. Tipos de cookies que utilizamos</h2>

            <h3>Cookies Esenciales (Técnicas)</h3>
            <p>
                Son estrictamente necesarias para el funcionamiento del sitio web. Nos permiten:
            </p>
            <ul>
                <li>Mantener tu sesión iniciada de forma segura (Autenticación con Supabase).</li>
                <li>Recordar tus preferencias de privacidad.</li>
                <li>Proteger la web contra ataques automatizados.</li>
            </ul>

            <h3>Cookies de Análisis</h3>
            <p>
                Utilizamos Google Analytics para recopilar información anónima sobre cómo los visitantes usan nuestro sitio. Esto nos ayuda a mejorar el rendimiento y la usabilidad.
            </p>
            <ul>
                <li>Estas cookies no recopilan información que te identifique personalmente.</li>
                <li>Toda la información es agregada y, por lo tanto, anónima.</li>
            </ul>

            <h2>3. Cómo controlar las cookies</h2>
            <p>
                Puedes controlar y/o eliminar las cookies como desees. Puedes eliminar todas las cookies que ya están en tu ordenador y puedes configurar la mayoría de los navegadores para que eviten que se coloquen. Sin embargo, si haces esto, es posible que tengas que ajustar manualmente algunas preferencias cada vez que visites un sitio y que algunos servicios y funcionalidades (como el inicio de sesión) no funcionen.
            </p>
        </div>
    );
}
