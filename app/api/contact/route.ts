import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail';
import { verifyRecaptchaToken } from '@/lib/recaptcha'

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
  const recaptchaToken = normalize(body?.recaptchaToken);
  if (!recaptchaToken) {
    return NextResponse.json({ error: "Token reCAPTCHA manquant." }, { status: 400 })
  }
  if (!name || !email || !message ) {
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
    const verification = await verifyRecaptchaToken(recaptchaToken)
    if (!verification.success || verification.action !== 'contact_form' || (verification.score !== undefined && verification.score < 0.5)) {
        console.log('reCAPTCHA verification failed', verification)
        return NextResponse.json({ error: 'Échec de la vérification reCAPTCHA.' }, { status: 400 })
    }
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
/*
const { firstname, lastname, phone, email, message, recaptchaToken } = data;

    if (!recaptchaToken) {
        return NextResponse.json({ success: false, error: true, message: 'Token reCAPTCHA manquant.', fields: {} }, { status: 400 })
    }

    try{
        const verification = await verifyRecaptchaToken(recaptchaToken)
        if (!verification.success || verification.action !== 'contact_form' || (verification.score !== undefined && verification.score < 0.5)) {
            console.log('reCAPTCHA verification failed', verification)
            return NextResponse.json({ success: false, error: true, message: 'Échec de la vérification reCAPTCHA.', fields: {} }, { status: 400 })
        }

        const emailTo = process.env.SMTP_FROM?? 'inventory@userv.info';
        const emailSentResponse = await sendEmailFromSite({
            from    : firstname + ' ' + lastname + "<" + email + ">",
            to      : emailTo,
            replyTo : email,
            subject : "Etat des lieux App - Contact - message de la part de " + firstname + ' ' + lastname,
            html    : await render(ContactEmailTeamplate(firstname, lastname, email, phone, message)),
        });
        if (emailSentResponse.accepted.includes(emailTo)) {
            return NextResponse.json({ success: true, error: false, message: '' }, { status: 200 })
        }
        else{
            return NextResponse.json({ success: false, error: true, message: "Error sending email", fields:{}}, { status: 500 })
        }
    } catch(error){
        console.log({error});
        return NextResponse.json({ success: false, error: true, message: error }, { status: 500 })
    }
*/