import { MercadoPagoConfig, Payment } from 'mercadopago';

const catalogo = {
    'ebook-1': { titulo: 'O Tesouro que Não Perece', preco: 29.90 },
    'ebook-2': { titulo: 'Educação dos Filhos', preco: 29.90 },
    'ebook-3': { titulo: 'Paz para a Mente Ansiosa', preco: 29.90 },
    'ebook-4': { titulo: 'Finanças Segundo a Bíblia', preco: 29.90 },
    'ebook-5': { titulo: 'Libertos das Correntes', preco: 29.90 },
    'ebook-6': { titulo: 'Luz na Escuridão', preco: 29.90 },
    'ebook-7': { titulo: 'Alimentados pela Palavra de Deus', preco: 29.90 },
    'ebook-8': { titulo: 'Casamento Segundo a Bíblia', preco: 29.90 },
    'ebook-9': { titulo: 'Libertados pelo Poder de Deus', preco: 29.90 },
    'combo-all': { titulo: 'Combo 9 E-books Cristãos', preco: 149.90 }
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const { produtoId, email } = req.body;
    const produtoSelecionado = catalogo[produtoId];

    if (!produtoSelecionado || !email) {
        return res.status(400).json({ erroMercadoPago: 'Produto não encontrado no backend ou e-mail vazio.' });
    }

    try {
        const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
        const payment = new Payment(client);

        const response = await payment.create({
            body: {
                transaction_amount: produtoSelecionado.preco,
                description: produtoSelecionado.titulo,
                payment_method_id: 'pix',
                payer: {
                    email: email
                }
            }
        });

        const linkPix = response.point_of_interaction?.transaction_data?.ticket_url;

        if (linkPix) {
            res.status(200).json({ url: linkPix });
        } else {
            res.status(400).json({ erroMercadoPago: 'Pagamento gerado, mas MP não devolveu o link Pix.', detalhes: response });
        }
    } catch (error) {
        console.error("Erro capturado do Mercado Pago:", error);
        // Devolvemos o erro exato para a tela do site
        res.status(500).json({ 
            erroMercadoPago: error.message || 'Erro de comunicação', 
            detalhes: error.cause || error
        });
    }
}
