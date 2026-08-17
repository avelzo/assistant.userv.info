import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail';
import { assertRecaptcha } from '@/lib/recaptcha';
import { escapeHtml } from '@/lib/html';
import { getTrustedClientIp } from '@/lib/ip';
import { rejectIfDisallowedOrigin } from '@/lib/origin';
import { consumeRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { recordSecurityEvent } from '@/lib/security-event';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalize(value: unknown) {
  return String(value ?? '').trim();
}

export async function POST(req: NextRequest) {
  const originError = rejectIfDisallowedOrigin(req);
  if (originError) {
    await recordSecurityEvent({
      kind: 'ORIGIN_REJECT',
      route: '/api/contact',
      status: 403,
      ip: getTrustedClientIp(req),
    });
    return originError;
  }

  const ip = getTrustedClientIp(req);
  const ipLimit = await consumeRateLimit({
    key: `contact:ip:${ip}`,
    windowMs: RATE_LIMITS.contactIp.windowMs,
    max: RATE_LIMITS.contactIp.max,
  });

  if (!ipLimit.allowed) {
    await recordSecurityEvent({
      kind: 'RATE_LIMIT',
      route: '/api/contact',
      status: 429,
      ip,
    });
    return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);

  const name = normalize(body?.name).slice(0, 120);
  const email = normalize(body?.email).slice(0, 254);
  const subject = (normalize(body?.subject) || 'Nouveau message depuis le site').slice(0, 200);
  const message = normalize(body?.message).slice(0, 5000);
  const recaptchaToken = normalize(body?.recaptchaToken);
  const website = normalize(body?.website);

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: 'Le nom, l’email et le message sont obligatoires.' },
      { status: 400 }
    );
  }

  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 });
  }

  if (website) {
    await recordSecurityEvent({
      kind: 'HONEYPOT',
      route: '/api/contact',
      status: 200,
      ip,
    });
    return NextResponse.json({ message: 'Votre message a bien été envoyé. Nous vous répondrons dès que possible.' });
  }

  const recaptcha = await assertRecaptcha({
    token: recaptchaToken,
    expectedAction: 'contact_form',
  });

  if (!recaptcha.ok) {
    await recordSecurityEvent({
      kind: 'RECAPTCHA_FAIL',
      route: '/api/contact',
      status: 400,
      ip,
      metadata: { reason: recaptcha.reason },
    });
    return NextResponse.json({ error: 'Échec de la vérification reCAPTCHA.' }, { status: 400 });
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');

  const text = `Message de ${name} <${email}>\n\n${message}`;
  const html = `
    <p>Message envoyé depuis le formulaire de contact :</p>
    <p><strong>Nom</strong> : ${safeName}</p>
    <p><strong>Email</strong> : ${safeEmail}</p>
    <p><strong>Sujet</strong> : ${safeSubject}</p>
    <hr />
    <p>${safeMessage}</p>
  `;

  try {
    await sendEmail({
      subject: `Contact - ${subject}`,
      text,
      html,
      replyTo: email,
    });
  } catch {
    return NextResponse.json(
      { error: 'Impossible d’envoyer votre message pour le moment. Réessayez plus tard.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: 'Votre message a bien été envoyé. Nous vous répondrons dès que possible.' });
}
