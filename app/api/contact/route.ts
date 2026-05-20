import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, agency, email, details } = body;

    if (!name || !email || !details) {
      return NextResponse.json(
        { error: 'Name, email, and details are required.' },
        { status: 400 }
      );
    }

    const data = await resend.emails.send({
      from: 'Contact Form <onboarding@resend.dev>',
      to: ['contact@henryix.com'],
      replyTo: email,
      subject: `New Booking Inquiry from ${name}`,
      text: `
You have received a new message from your website contact form.

Name: ${name}
Agency/Entity: ${agency || 'N/A'}
Email: ${email}

Details:
${details}
      `,
    });

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 });
  }
}
