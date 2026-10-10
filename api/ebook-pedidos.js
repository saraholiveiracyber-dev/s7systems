
"use strict";

const { createClient } = require("@supabase/supabase-js");

const PLANOS = {
    Essencial: {
        valor: 197,
        codigo: "ebook_essencial",
        checkoutUrl: "https://pay.kiwify.com.br/ydusq7T"
    },
    Profissional: {
        valor: 397,
        codigo: "ebook_profissional",
        checkoutUrl: "https://pay.kiwify.com.br/d9iboGd"
    },
    Premium: {
        valor: 697,
        codigo: "ebook_premium",
        checkoutUrl: "https://pay.kiwify.com.br/gTLzyXi"
    }
};

function sendJson(res, statusCode, data) {
    return res.status(statusCode).json(data);
}

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return sendJson(res, 405, {
            ok: false,
            message: "Método não permitido."
        });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Variáveis de ambiente do Supabase ausentes.");
        return sendJson(res, 500, {
            ok: false,
            message: "O serviço está temporariamente indisponível. Tente novamente mais tarde."
        });
    }

    let body = req.body;

    if (typeof body === "string") {
        try {
            body = JSON.parse(body);
        } catch {
            return sendJson(res, 400, {
                ok: false,
                message: "O conteúdo enviado não é um JSON válido."
            });
        }
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return sendJson(res, 400, {
            ok: false,
            message: "Os dados do formulário são inválidos."
        });
    }

    const nome = String(body.nome || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const whatsapp = String(body.whatsapp || "").replace(/\D/g, "");
    const tema = String(body.tema || "").trim();
    const descricao = String(body.descricao || "").trim();
    const publico = String(body.publico || "").trim();
    const objetivo = String(body.objetivo || "").trim();
    const planoNome = String(body.plano || "").trim();
    const termosAceitos = body.termosAceitos === true;

    const plano = PLANOS[planoNome];

    if (nome.length < 3) {
        return sendJson(res, 400, {
            ok: false,
            message: "Informe seu nome completo."
        });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return sendJson(res, 400, {
            ok: false,
            message: "Informe um endereço de e-mail válido."
        });
    }

    if (![10, 11].includes(whatsapp.length)) {
        return sendJson(res, 400, {
            ok: false,
            message: "Informe um WhatsApp válido com DDD."
        });
    }

    if (tema.length < 3) {
        return sendJson(res, 400, {
            ok: false,
            message: "Informe o tema do e-book."
        });
    }

    if (descricao.length < 500 || descricao.length > 5000) {
        return sendJson(res, 400, {
            ok: false,
            message: "A descrição precisa ter entre 500 e 5.000 caracteres."
        });
    }

    if (!plano) {
        return sendJson(res, 400, {
            ok: false,
            message: "Selecione um plano válido."
        });
    }

    if (!termosAceitos) {
        return sendJson(res, 400, {
            ok: false,
            message: "É necessário aceitar o uso das informações fornecidas."
        });
    }

    // O preço é determinado no servidor, nunca pelo valor informado no navegador.
    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    const observacoes = JSON.stringify({
        tema,
        publico,
        objetivo,
        origem: "site_s7_systems"
    });

    const pedido = {
        nome,
        email,
        telefone: whatsapp,
        produto_codigo: plano.codigo,
        produto_nome: `Criação de E-book - Plano ${planoNome}`,
        valor: plano.valor,
        valor_pago: 0,
        moeda: "BRL",
        status: "pendente",
        descricao,
        observacoes
    };

    try {
        const { data, error } = await supabase
            .from("ebook_pedidos")
            .insert(pedido)
            .select("id")
            .single();

        if (error) {
            console.error("Erro Supabase ao registrar ebook_pedidos:", {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            });

            return sendJson(res, 500, {
                ok: false,
                message: "Não foi possível registrar seu pedido. Confira a configuração do banco de dados e tente novamente."
            });
        }

        return sendJson(res, 200, {
            ok: true,
            success: true,
            mensagem: "Pedido registrado com sucesso!",
            message: "Pedido registrado com sucesso!",
            pedidoId: data.id,
            plano: planoNome,
            status: "pendente",
            checkoutUrl: plano.checkoutUrl
        });
    } catch (error) {
        console.error("Erro inesperado ao registrar pedido:", error);

        return sendJson(res, 500, {
            ok: false,
            message: "Ocorreu um erro ao registrar seu pedido. Tente novamente."
        });
    }
};
