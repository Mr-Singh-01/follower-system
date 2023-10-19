import nodemailer from 'nodemailer';

export const sendEmail = async (options: any) => {
  const transporter = nodemailer.createTransport({
    service: process.env.SMTP_SERVICE,
    port: parseInt(process.env.SMTP_PORT || '0', 10),
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  let message = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  const info = await transporter.sendMail(message);
};
