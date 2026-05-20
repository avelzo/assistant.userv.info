import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST?.trim();
const SMTP_PORT = Number(process.env.SMTP_PORT ?? '');
const SMTP_USER = process.env.SMTP_USER?.trim();
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM = process.env.SMTP_FROM?.trim();
const SMTP_TO = process.env.NEXT_PUBLIC_SERVER_EMAIL?.trim() || SMTP_FROM || SMTP_USER;

function assertSmtpConfig() {
  const missing = [];

  if (!SMTP_HOST) missing.push('SMTP_HOST');
  if (!SMTP_PORT || Number.isNaN(SMTP_PORT)) missing.push('SMTP_PORT');
  if (!SMTP_USER) missing.push('SMTP_USER');
  if (!SMTP_PASSWORD) missing.push('SMTP_PASSWORD');
  if (!SMTP_FROM) missing.push('SMTP_FROM');
  if (!SMTP_TO) missing.push('SMTP_TO / NEXT_PUBLIC_SERVER_EMAIL');

  if (missing.length > 0) {
    throw new Error(`Configuration SMTP incomplète : ${missing.join(', ')}`);
  }
}

function createTransporter() {
  assertSmtpConfig();

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });
}

export type SendEmailOptions = {
  to?: string;
  from?: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail(options: SendEmailOptions) {
  const transporter = createTransporter();

  const mailOptions = {
    from: options.from ?? SMTP_FROM,
    to: options.to ?? SMTP_TO,
    replyTo: options.replyTo,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  return transporter.sendMail(mailOptions);
}
