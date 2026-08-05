import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';
import nodemailer from 'nodemailer';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 465,
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

export default async function handler(req, res) {
    res.status(200).send('Webhook recebido');
    if (req.method !== 'POST') return;
    
    const { type, data } = req.body;
    if (type === 'payment') {
        try {
            const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
            const payment = new Payment(client);
            const infoPagamento = await payment.get({ id: data.id });

            if (infoPagamento.status === 'approved') {
                const produtoComprado = infoPagamento.external_reference;
                const emailDoCliente = infoPagamento.payer.email;
                const extensao = produtoComprado === 'combo-all' ? 'zip' : 'pdf';
                const arquivo = admin.storage().bucket().file(`ebooks/${produtoComprado}.${extensao}`);
                
                const [urlDownload] = await arquivo.getSignedUrl({
                    action: 'read',
                    expires: Date.now() + 24 * 60 * 60 * 1000, 
                });

                await transporter.sendMail({
                    from: `"Biblioteca Cristã" <${process.env.SMTP_USER}>`,
                    to: emailDoCliente,
                    subject: 'Seu material chegou! 🎉',
                    html: `
                        <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
                            <h2 style="color: #27ae60;">A Paz do Senhor! O seu pagamento foi confirmado.</h2>
                            <p>Clique no botão abaixo para baixar o seu material. <strong>Este link é válido por 24 horas.</strong></p>
                            <a href="${urlDownload}" style="background-color: #27ae60; color: white; padding: 15px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
                                Acessar Minha Leitura
                            </a>
                        </div>
                    `
                });
            }
        } catch (error) {
            console.error('Erro no webhook:', error);
        }
    }
}
