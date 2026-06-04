import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

// Regex for email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  // Rate limit: max 3 requests per minute per IP to prevent spamming
  const rateLimitResponse = checkRateLimit(request, { maxRequests: 3, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const { name, email, company, message } = body;

    // Validate required fields
    if (!name || !name.trim() || !email || !email.trim() || !message || !message.trim()) {
      return NextResponse.json(
        { error: 'Por favor, rellena todos los campos requeridos.' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        { error: 'Por favor, introduce un correo electrónico válido.' },
        { status: 400 }
      );
    }

    const cleanedName = name.trim();
    const cleanedEmail = email.trim();
    const cleanedCompany = company?.trim() || '';
    const cleanedMessage = message.trim();

    const resendApiKey = process.env.RESEND_API_KEY;

    // In local development or if RESEND_API_KEY is not configured, fallback to mocking
    if (!resendApiKey) {
      logger.warn('[Mock Advertise Submission] Form submitted successfully (RESEND_API_KEY not configured):', {
        name: cleanedName,
        email: cleanedEmail,
        company: cleanedCompany,
        message: cleanedMessage,
      });

      return NextResponse.json({
        success: true,
        message: 'Solicitud simulada correctamente (Modo Desarrollo)',
        mocked: true,
      });
    }

    // Initialize Resend and send corporate notification email
    const resend = new Resend(resendApiKey);
    const companyInfo = cleanedCompany ? `Empresa: ${cleanedCompany}` : 'Empresa: No especificada';

    try {
      const emailResponse = await resend.emails.send({
        from: 'CambioCromos <info@cambiocromos.com>',
        to: 'info@cambiocromos.com',
        replyTo: cleanedEmail,
        subject: `Nueva solicitud de publicidad: ${cleanedName}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #FF8C00; border-bottom: 2px solid #FFC000; padding-bottom: 10px; margin-top: 0;">Nueva solicitud de información publicitaria</h2>
            <p>Se ha recibido una nueva solicitud de contacto a través de la página <strong>Anúnciate con nosotros</strong>.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #FF8C00;">
              <p style="margin: 5px 0;"><strong>Nombre de contacto:</strong> ${cleanedName}</p>
              <p style="margin: 5px 0;"><strong>${companyInfo}</strong></p>
              <p style="margin: 5px 0;"><strong>Correo electrónico:</strong> <a href="mailto:${cleanedEmail}">${cleanedEmail}</a></p>
            </div>
            
            <h3 style="color: #333; margin-top: 20px;">Mensaje o consulta:</h3>
            <p style="white-space: pre-wrap; background-color: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">${cleanedMessage}</p>
            
            <p style="font-size: 12px; color: #666; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
              Este mensaje ha sido enviado automáticamente desde el formulario de contacto publicitario de CambioCromos.com. Puedes responder a este correo para contestar directamente al interesado.
            </p>
          </div>
        `,
      });

      if (emailResponse.error) {
        throw new Error(emailResponse.error.message);
      }

      logger.info(`Corporate email sent successfully for advertising request from ${cleanedEmail}`);

      return NextResponse.json({
        success: true,
        message: 'Solicitud enviada correctamente',
      });
    } catch (emailError: unknown) {
      logger.error('Error sending advertising request email via Resend:', emailError);
      return NextResponse.json(
        { error: 'Error al enviar el correo. Por favor, inténtelo de nuevo más tarde.' },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    logger.error('Unexpected error in advertise API handler:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado al procesar su solicitud.' },
      { status: 500 }
    );
  }
}
