const { MercadoPagoConfig, Payment } = require('mercadopago');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

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
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { 
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
    }
});

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Método não permitido');
    }
    
    const { type, data } = req.body;
    
    if (type === 'payment') {
        try {
            const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
            const payment = new Payment(client);
            const infoPagamento = await payment.get({ id: data.id });

            if (infoPagamento.status === 'approved') {
                const produtoComprado = infoPagamento.external_reference; 
                const emailDoCliente = infoPagamento.metadata?.client_email || infoPagamento.payer?.email;
                
                if (!produtoComprado || !emailDoCliente) {
                    console.error("ERRO: Faltou referência ou e-mail.");
                    return res.status(400).send("Dados incompletos");
                }

                const extensao = produtoComprado === 'combo-all' ? 'zip' : 'pdf';
                
                const bucket = admin.storage().bucket('loja-ebooks-cristaos-8f1b6.firebasestorage.app');
                const arquivo = bucket.file(`${produtoComprado}.${extensao}`);
                
                // ADICIONADO: Força o navegador a baixar o arquivo com o nome original
                const [urlDownload] = await arquivo.getSignedUrl({
                    action: 'read',
                    expires: Date.now() + 24 * 60 * 60 * 1000, 
                    responseDisposition: `attachment; filename="${produtoComprado}.${extensao}"`
                });

                await transporter.sendMail({
                    from: `"Biblioteca Cristã" <${process.env.EMAIL_USER}>`,
                    to: emailDoCliente,
                    subject: 'Seu material chegou! 🎉',
                    html: `
                        <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
                            <h2 style="color: #27ae60;">A Paz do Senhor! O seu pagamento foi confirmado.</h2>
                            <p>Clique no botão abaixo para baixar o seu material diretamente para o seu dispositivo. <strong>Este link é válido por 24 horas.</strong></p>
                            <a href="${urlDownload}" style="background-color: #27ae60; color: white; padding: 15px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
                                Baixar Meu E-book Agora
                            </a>
                        </div>
                    `
                });

                console.log("E-mail com link de download direto enviado com sucesso!");
            }
            
            return res.status(200).send('Webhook processado com sucesso');
            
        } catch (error) {
            console.error('ERRO CRÍTICO NO WEBHOOK:', error);
            return res.status(500).send('Erro interno ao processar webhook');
        }
    }
    
    return res.status(200).send('Notificação recebida, mas não era de pagamento');
}
