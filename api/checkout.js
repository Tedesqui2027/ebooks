const { MercadoPagoConfig, Payment } = require('mercadopago');

const catalogo = {
    'ebook-1': { titulo: 'O Tesouro que Não Perece', preco: 19.90 },
    'ebook-2': { titulo: 'Educação dos Filhos', preco: 19.90 },
    'ebook-3': { titulo: 'Paz para a Mente Ansiosa', preco: 19.90 },
    'ebook-4': { titulo: 'Finanças Segundo a Bíblia', preco: 19.90 },
    'ebook-5': { titulo: 'Libertos das Correntes', preco: 19.90 },
    'ebook-6': { titulo: 'Luz na Escuridão', preco: 19.90 },
    'ebook-7': { titulo: 'Alimentados pela Palavra de Deus', preco: 19.90 },
    'ebook-8': { titulo: 'Casamento Segundo a Bíblia', preco: 19.90 },
    'ebook-9': { titulo: 'Libertados pelo Poder de Deus', preco: 19.90 },
    'combo-all': { titulo: 'Combo 9 E-books Cristãos', preco: 99.90 }
};

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const { produtoId, email } = req.body;
    const produtoSelecionado = catalogo[produtoId];

    if (!produtoSelecionado || !email) {
        return res.status(400).json({ erroMercadoPago: 'Produto não encontrado ou e-mail vazio.' });
    }

    try {
        const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
        const payment = new Payment(client);

        const dataExpiracao = new Date();
        dataExpiracao.setMinutes(dataExpiracao.getMinutes() + 30);

        const response = await payment.create({
            body: {
                transaction_amount: produtoSelecionado.preco,
                description: produtoSelecionado.titulo,
                payment_method_id: 'pix',
                payer: { email: email },
                date_of_expiration: dataExpiracao.toISOString(),
                notification_url: 'https://ebooks-omega.vercel.app/api/webhook',
                external_reference: produtoId,
                metadata: {
                    client_email: email // Guardamos o e-mail aqui de forma blindada!
                }
            }
        });

        const qrCodeBase64 = response.point_of_interaction?.transaction_data?.qr_code_base64;
        const copiaECola = response.point_of_interaction?.transaction_data?.qr_code;
        const paymentId = response.id;

        if (qrCodeBase64) {
            res.status(200).json({ qrCodeBase64, copiaECola, paymentId });
        } else {
            res.status(400).json({ erroMercadoPago: 'MP não devolveu o QR Code.' });
        }
    } catch (error) {
        res.status(500).json({ erroMercadoPago: error.message || 'Erro de comunicação' });
    }
}
