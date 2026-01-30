import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Política de Privacidad - Cambiocromos.com',
    description: 'Cómo recopilamos, usamos y protegemos tus datos personales en cumplimiento con el RGPD.',
};

export default function PrivacyPage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1 className="text-3xl font-black uppercase mb-6 text-[#FFC000]">Política de Privacidad</h1>
            <p className="text-sm text-gray-500 mb-8">Última actualización: {new Date().toLocaleDateString('es-ES')}</p>

            <p>
                En Cambiocromos.com, nos tomamos muy en serio tu privacidad. Esta política describe cómo recopilamos, utilizamos y protegemos tu información personal, en cumplimiento con el Reglamento General de Protección de Datos (RGPD) y la LOPDGDD.
            </p>

            <h2>1. Responsable del Tratamiento</h2>
            <p>
                El responsable del tratamiento de los datos es el equipo de administración de Cambiocromos.com. Para cualquier cuestión relativa a la privacidad, puedes contactar con nuestro Delegado de Protección de Datos en: <a href="mailto:privacidad@cambiocromos.com">privacidad@cambiocromos.com</a>.
            </p>

            <h2>2. Qué datos recopilamos</h2>
            <ul>
                <li><strong>Datos de Identificación:</strong> Correo electrónico, nombre de usuario (nickname), imagen de perfil (avatar).</li>
                <li><strong>Datos de Localización:</strong> Código postal (para facilitar intercambios cercanos), país y provincia.</li>
                <li><strong>Datos de Uso:</strong> Información sobre tus colecciones, listas de faltas/repes, interacciones y chats.</li>
                <li><strong>Datos Técnicos:</strong> Dirección IP, tipo de dispositivo y navegador (con fines de seguridad y analítica).</li>
            </ul>

            <h2>3. Finalidad del tratamiento</h2>
            <p>Utilizamos tus datos para:</p>
            <ul>
                <li>Gestionar tu cuenta de usuario y permitir el acceso a la plataforma.</li>
                <li>Facilitar el sistema de emparejamiento (matching) para encontrar otros coleccionistas cercanos.</li>
                <li>Permitir la comunicación entre usuarios a través del chat interno.</li>
                <li>Enviar notificaciones importantes sobre el servicio (puedes desactivarlas).</li>
                <li>Garantizar la seguridad de la plataforma y prevenir fraudes.</li>
            </ul>

            <h2>4. Legitimación</h2>
            <p>
                La base legal para el tratamiento de tus datos es la <strong>ejecución del contrato</strong> (Términos de Servicio) al que te suscribes al registrarte, así como tu <strong>consentimiento expreso</strong> para ciertas funcionalidades (como la ubicación aproximada).
            </p>

            <h2>5. Destinatarios y Terceros</h2>
            <p>
                No vendemos tus datos a terceros. Compartimos información solo con proveedores de servicios estrictamente necesarios para el funcionamiento de la app:
            </p>
            <ul>
                <li><strong>Supabase:</strong> Proveedor de base de datos y autenticación.</li>
                <li><strong>Google Analytics:</strong> Para análisis anónimo de tráfico web.</li>
                <li><strong>OneSignal:</strong> Para el envío de notificaciones push.</li>
            </ul>

            <h2>6. Conservación de Datos</h2>
            <p>
                Mantendremos tus datos mientras tu cuenta permanezca activa. Si decides eliminar tu cuenta:
            </p>
            <ul>
                <li>Tus datos personales directos (email, perfil) serán eliminados o anonimizados de inmediato o tras un periodo de gracia de 30 días para evitar eliminaciones accidentales.</li>
                <li>Las copias de seguridad de la base de datos se eliminan automáticamente según nuestro ciclo de retención (máximo 90 días).</li>
            </ul>

            <h2>7. Tus Derechos</h2>
            <p>
                Como usuario, tienes derecho a:
            </p>
            <ul>
                <li><strong>Acceder</strong> a tus datos y saber qué información tenemos.</li>
                <li><strong>Rectificar</strong> datos incorrectos o incompletos desde tu perfil.</li>
                <li><strong>Suprimir</strong> tus datos ("Derecho al olvido") mediante la opción "Borrar Cuenta" en los Ajustes.</li>
                <li><strong>Limitar</strong> el tratamiento de tus datos en ciertas circunstancias.</li>
                <li><strong>Portabilidad:</strong> Solicitar una copia de tus datos en un formato estructurado.</li>
            </ul>
            <p>
                Puedes ejercer estos derechos escribiendo a <a href="mailto:privacidad@cambiocromos.com">privacidad@cambiocromos.com</a>.
            </p>
        </div>
    );
}
