import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Términos de Servicio y Condiciones de Uso - Cambiocromos.com',
    description: 'Condiciones de uso, normas de la comunidad y políticas de contenido para usuarios de Cambiocromos.com',
};

export default function TermsPage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1 className="text-3xl font-black uppercase mb-6 text-[#FFC000]">Términos de Servicio</h1>
            <p className="text-sm text-gray-500 mb-8">Última actualización: {new Date().toLocaleDateString('es-ES')}</p>

            <h2>1. Aceptación de los Términos</h2>
            <p>
                Bienvenido a Cambiocromos.com. Al acceder, registrarse o utilizar nuestra plataforma, usted ("Usuario") acepta estar legalmente vinculado por estos Términos de Servicio ("Términos"). Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestros servicios.
            </p>

            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 my-6">
                <h3 className="text-red-700 dark:text-red-400 font-bold m-0 uppercase">Servicio exclusivo para mayores de 18 años</h3>
                <p className="m-0 mt-2 text-red-600 dark:text-red-300">
                    Debido a la naturaleza social de la plataforma (interacción con desconocidos, chats privados y transacciones), <strong>Cambiocromos.com está reservado exclusivamente para personas mayores de 18 años</strong>.
                    Al registrarse, usted declara y garantiza que tiene al menos 18 años de edad. Las cuentas que se detecten pertenecientes a menores de edad serán suspendidas inmediatamente y sin previo aviso.
                </p>
            </div>

            <h2>2. Cuentas de Usuario</h2>
            <p>
                Para utilizar ciertas funciones, debe registrarse y crear una cuenta. Usted es responsable de mantener la confidencialidad de su contraseña y de todas las actividades que ocurran bajo su cuenta. Nos reservamos el derecho de suspender o eliminar cuentas que incumplan estos términos, proporcionen información falsa o permanezcan inactivas por periodos prolongados.
            </p>

            <h2>3. Contenido Generado por el Usuario (UGC)</h2>
            <p>
                Nuestra plataforma permite a los usuarios publicar imágenes (cromos), crear colecciones y enviar mensajes. Respecto a este contenido:
            </p>
            <ul>
                <li><strong>Propiedad:</strong> Usted conserva los derechos de propiedad intelectual sobre el contenido que crea y sube. Sin embargo, al publicarlo, otorga a Cambiocromos.com una licencia mundial, no exclusiva y gratuita para usar, mostrar y distribuir dicho contenido en relación con el servicio.</li>
                <li><strong>Responsabilidad del Usuario:</strong> Usted es el <strong>único responsable</strong> de todo el contenido que publique. Declara que posee todos los derechos necesarios o autorizaciones para publicar dicho contenido y que este no infringe derechos de terceros.</li>
                <li><strong>Moderación:</strong> Cambiocromos.com no tiene la obligación de previsualizar el contenido, pero tiene el <strong>derecho absoluto y a su entera discreción de revisar, rechazar o eliminar cualquier contenido</strong> que considere inapropiado, ilegal o que viole estos Términos, sin previo aviso.</li>
            </ul>

            <h3>3.1. Contenido Prohibido</h3>
            <p>Queda terminantemente prohibido publicar:</p>
            <ul>
                <li>Contenido ilegal, difamatorio, obsceno, pornográfico, indecente o amenazante.</li>
                <li>Discurso de odio, acoso o discriminación hacia otros usuarios.</li>
                <li>Material que infrinja derechos de autor, marcas registradas o propiedad intelectual de terceros.</li>
                <li>Spam, publicidad no autorizada o enlaces a sitios maliciosos.</li>
            </ul>

            <h2>4. Interacciones Sociales y Seguridad</h2>
            <p>
                Cambiocromos.com facilita el contacto entre usuarios. Usted reconoce que:
            </p>
            <ul>
                <li>Está interactuando con personas que pueden ser desconocidas para usted.</li>
                <li>Es responsable de ejercer precaución en todas las interacciones, especialmente al compartir información o acordar envíos.</li>
                <li><strong>Tolerancia Cero:</strong> No toleramos el acoso, los insultos ni el comportamiento abusivo. Disponemos de herramientas para <strong>Reportar</strong> y <strong>Bloquear</strong> usuarios. Cualquier reporte verificado de abuso resultará en la suspensión inmediata de la cuenta infractora.</li>
            </ul>

            <h2>5. Exención de Responsabilidad</h2>
            <p>
                Cambiocromos.com actúa únicamente como intermediario tecnológico. No somos parte en ninguna transacción de intercambio o venta entre usuarios. No garantizamos la veracidad de los anuncios, la calidad de los cromos ni el cumplimiento de los acuerdos entre usuarios. Usted libera a Cambiocromos.com de cualquier reclamación, demanda o daño relacionado con disputas con otros usuarios.
            </p>

            <h2>6. Modificaciones</h2>
            <p>
                Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor inmediatamente después de su publicación. El uso continuado del servicio implica la aceptación de los nuevos términos.
            </p>

            <h2>7. Contacto</h2>
            <p>
                Para reportar infracciones o consultas legales, contáctenos en: <a href="mailto:legal@cambiocromos.com">legal@cambiocromos.com</a>
            </p>
        </div>
    );
}
