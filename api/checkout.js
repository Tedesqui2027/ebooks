import { MercadoPagoConfig, Preference } from 'mercadopago';

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

    const { produtoId } = req.body;
    const produtoSelecionado = catalogo[produtoId];

    if (!produtoSelecionado) return res.status(400).json({ error: 'Produto inválido' });

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const preference = new Preference(client);

    // Substitua esta URL pelo domínio real do seu site após publicar na Vercel
    const urlSite = "https://seusite-na-vercel.app";

    try {
        const response = await preference.create({
            body: {
                items: [
                    {
                        id: produtoId,
                        title: produtoSelecionado.titulo,
                        quantity: 1,
                        unit_price: produtoSelecionado.preco,
                        currency_id: 'BRL'
                    }
                ],
                external_reference: produtoId,
                back_urls: {
                    success: `${urlSite}/sucesso.html`,
                    failure: `${urlSite}/index.html`,
                    pending: `${urlSite}/sucesso.html`
                },
                auto_return: "approved",
                notification_url: `${urlSite}/api/webhook`
            }
        });

        res.status(200).json({ url: response.init_point });
    } catch (error) {
        console.error("Erro no checkout:", error);
        res.status(500).json({ error: 'Falha ao criar o pagamento' });
    }
}