import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalize(value: unknown) {
  return String(value ?? '').trim();
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const name = normalize(body?.name);
  const email = normalize(body?.email);
  const subject = normalize(body?.subject) || `Nouveau message depuis le site`; 
  const message = normalize(body?.message);

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: 'Le nom, l’email et le message sont obligatoires.' },
      { status: 400 }
    );
  }

  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 });
  }

  const text = `Message de ${name} <${email}>\n\n${message}`;
  const html = `
    <p>Message envoyé depuis le formulaire de contact :</p>
    <p><strong>Nom</strong> : ${name}</p>
    <p><strong>Email</strong> : ${email}</p>
    <p><strong>Sujet</strong> : ${subject}</p>
    <hr />
    <p>${message.replace(/\n/g, '<br />')}</p>
  `;

  try {
    await sendEmail({
      subject: `Contact - ${subject}`,
      text,
      html,
      replyTo: email,
    });
  } catch (error) {
    console.error('[contact] Erreur d’envoi', error);
    return NextResponse.json(
      { error: 'Impossible d’envoyer votre message pour le moment. Réessayez plus tard.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: 'Votre message a bien été envoyé. Nous vous répondrons dès que possible.' });
}
