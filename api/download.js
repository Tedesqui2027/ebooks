import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

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

export default async function handler(req, res) {
    const { payment_id } = req.query;
    if (!payment_id) return res.status(400).json({ error: 'ID ausente' });

    const db = admin.database(); 
    const refDownload = db.ref(`downloads/${payment_id}`);

    try {
        const snapshot = await refDownload.once('value');
        const dadosDownload = snapshot.val();
        
        if (dadosDownload && dadosDownload.tentativas >= 3) {
            return res.status(403).json({ error: 'Limite de downloads atingido para esta compra.' });
        }

        const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
        const payment = new Payment(client);
        const infoPagamento = await payment.get({ id: payment_id });

        if (infoPagamento.status === 'approved') {
            const produtoComprado = infoPagamento.external_reference;
            
            // Se for o combo, busca um arquivo ZIP. Se for avulso, busca o PDF.
            const extensao = produtoComprado === 'combo-all' ? 'zip' : 'pdf';
            const nomeArquivo = `${produtoComprado}.${extensao}`;

            const bucket = admin.storage().bucket();
            const arquivo = bucket.file(`ebooks/${nomeArquivo}`);

            const [urlTemporaria] = await arquivo.getSignedUrl({
                action: 'read',
                expires: Date.now() + 15 * 60 * 1000, 
            });

            await refDownload.set({
                produto: produtoComprado,
                tentativas: dadosDownload ? dadosDownload.tentativas + 1 : 1,
                ultimoDownload: new Date().toISOString()
            });

            return res.status(200).json({ status: 'approved', url: urlTemporaria });
        }

        return res.status(200).json({ status: infoPagamento.status, message: 'Processando...' });
    } catch (error) {
        console.error("Erro interno:", error);
        res.status(500).json({ error: 'Erro ao processar a liberação do arquivo.' });
    }
}