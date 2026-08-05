const { MercadoPagoConfig, Payment } = require('mercadopago');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

    const { id } = req.query; // ID do pagamento
    if (!id) return res.status(400).json({ error: 'ID do pagamento não fornecido' });

    try {
        const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
        const payment = new Payment(client);
        
        const infoPagamento = await payment.get({ id });
        
        // Devolve o status atual (pending, approved, etc.)
        res.status(200).json({ status: infoPagamento.status });
    } catch (error) {
        console.error("Erro ao checar status:", error);
        res.status(500).json({ error: 'Erro ao verificar pagamento' });
    }
}