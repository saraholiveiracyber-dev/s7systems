
/* =========================================================
   S7 SYSTEMS — SERVIDOR PRINCIPAL
   Criação de E-book + Agendamento de Reuniões + Supabase
========================================================= */

"use strict";

require("dotenv").config();

const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
        "ERRO: confira SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env."
    );

    process.exit(1);
}

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
);

/* =========================================================
   MIDDLEWARES
========================================================= */

app.use(express.json({ limit: "30kb" }));

app.use(
    express.urlencoded({
        extended: true,
        limit: "30kb"
    })
);

/* =========================================================
   ARQUIVOS DO SITE
========================================================= */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/agendar-reuniao.html", (req, res) => {
    res.sendFile(
        path.join(__dirname, "agendar-reuniao.html")
    );
});

app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/img", express.static(path.join(__dirname, "img")));

/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */

function dataLocalAtual() {
    const agora = new Date();

    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function dataCalendarioValida(valor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return false;
    }

    const [ano, mes, dia] = valor.split("-").map(Number);

    const data = new Date(
        Date.UTC(ano, mes - 1, dia)
    );

    return (
        data.getUTCFullYear() === ano &&
        data.getUTCMonth() === mes - 1 &&
        data.getUTCDate() === dia
    );
}

function responderErro(res, status, mensagem) {
    return res.status(status).json({
        ok: false,
        success: false,
        mensagem,
        message: mensagem
    });
}

/* =========================================================
   PLANOS DE E-BOOK
========================================================= */

const PLANOS = {
    Essencial: {
        codigo: "ebook_essencial",
        nome: "Criação de E-book — Essencial",
        valor: 197
    },

    Profissional: {
        codigo: "ebook_profissional",
        nome: "Criação de E-book — Profissional",
        valor: 397
    },

    Premium: {
        codigo: "ebook_premium",
        nome: "Criação de E-book — Premium",
        valor: 697
    }
};

/* =========================================================
   TESTE DA CONEXÃO COM O SUPABASE
========================================================= */

app.get("/api/health", async (req, res) => {
    try {
        const { error } = await supabase
            .from("ebook_pedidos")
            .select("id")
            .limit(1);

        if (error) {
            console.error(
                "SUPABASE — ERRO NO TESTE:",
                error.message
            );

            return res.status(500).json({
                ok: false,
                mensagem: "Não foi possível consultar ebook_pedidos."
            });
        }

        return res.json({
            ok: true,
            mensagem: "Conexão com o Supabase funcionando.",
            tabela: "ebook_pedidos"
        });
    } catch (error) {
        console.error("ERRO NA API HEALTH:", error.message);

        return responderErro(
            res,
            500,
            "Erro interno ao verificar o Supabase."
        );
    }
});

/* =========================================================
   REGISTRAR PEDIDO DE E-BOOK
========================================================= */

app.post("/api/ebook-pedidos", async (req, res) => {
    try {
        const {
            nome,
            email,
            whatsapp,
            tema,
            descricao,
            publico,
            objetivo,
            plano,
            termosAceitos
        } = req.body || {};

        if (
            typeof nome !== "string" ||
            nome.trim().length < 2 ||
            nome.trim().length > 150
        ) {
            return responderErro(
                res,
                400,
                "Informe um nome válido."
            );
        }

        const emailNormalizado =
            typeof email === "string"
                ? email.trim().toLowerCase()
                : "";

        if (
            emailNormalizado.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)
        ) {
            return responderErro(
                res,
                400,
                "Informe um e-mail válido."
            );
        }

        const telefone =
            typeof whatsapp === "string"
                ? whatsapp.replace(/\D/g, "")
                : "";

        if (
            telefone.length !== 10 &&
            telefone.length !== 11
        ) {
            return responderErro(
                res,
                400,
                "Informe um WhatsApp válido com DDD."
            );
        }

        if (
            typeof tema !== "string" ||
            tema.trim().length < 3 ||
            tema.trim().length > 200
        ) {
            return responderErro(
                res,
                400,
                "Informe o tema do e-book."
            );
        }

        if (
            typeof descricao !== "string" ||
            descricao.trim().length < 500 ||
            descricao.trim().length > 5000
        ) {
            return responderErro(
                res,
                400,
                "A descrição deve conter entre 500 e 5.000 caracteres."
            );
        }

        if (termosAceitos !== true) {
            return responderErro(
                res,
                400,
                "É necessário aceitar os termos."
            );
        }

        const produto = PLANOS[plano];

        if (!produto) {
            return responderErro(
                res,
                400,
                "O plano selecionado não é válido."
            );
        }

        const observacoes = [
            `Tema: ${tema.trim()}`,
            typeof publico === "string" && publico.trim()
                ? `Público-alvo: ${publico.trim().slice(0, 500)}`
                : "",
            typeof objetivo === "string" && objetivo.trim()
                ? `Objetivo: ${objetivo.trim().slice(0, 500)}`
                : "",
            "Termos aceitos: sim",
            `Data do pedido: ${new Date().toISOString()}`
        ]
            .filter(Boolean)
            .join("\n");

        const pedido = {
            nome: nome.trim(),
            email: emailNormalizado,
            telefone,
            produto_codigo: produto.codigo,
            produto_nome: produto.nome,
            valor: produto.valor,
            valor_pago: 0,
            moeda: "BRL",
            status: "pendente",
            descricao: descricao.trim(),
            observacoes
        };

        const { data, error } = await supabase
            .from("ebook_pedidos")
            .insert(pedido)
            .select("id")
            .single();

        if (error) {
            console.error(
                "SUPABASE — ERRO AO SALVAR E-BOOK:",
                {
                    message: error.message,
                    code: error.code,
                    details: error.details
                }
            );

            return responderErro(
                res,
                500,
                "Não foi possível registrar o pedido no banco de dados."
            );
        }

        console.log("PEDIDO DE E-BOOK REGISTRADO:", data.id);

        return res.status(201).json({
            ok: true,
            success: true,
            mensagem: "Pedido registrado com sucesso.",
            message: "Pedido registrado com sucesso.",
            pedidoId: data.id,
            plano: produto.nome,
            status: "pendente"
        });
    } catch (error) {
        console.error(
            "ERRO INTERNO AO REGISTRAR E-BOOK:",
            error.message
        );

        return responderErro(
            res,
            500,
            "Ocorreu um erro interno ao registrar o pedido."
        );
    }
});

/* =========================================================
   AGENDAMENTO DE REUNIÕES — S7 SYSTEMS
========================================================= */

const SERVICOS_PERMITIDOS = [
    "Criação de site",
    "Programação e sistemas",
    "Criação de e-book",
    "Marketing digital",
    "Mentoria e orientação",
    "Orçamento de projeto",
    "Outro assunto"
];

const HORARIOS_PERMITIDOS = [
    "A combinar",
    "Manhã",
    "Tarde",
    "Noite"
];

app.post("/api/solicitacoes-reuniao", async (req, res) => {
    try {
        const body = req.body;

        if (
            !body ||
            typeof body !== "object" ||
            Array.isArray(body)
        ) {
            return responderErro(
                res,
                400,
                "Os dados enviados são inválidos."
            );
        }

        const nome =
            typeof body.nome === "string"
                ? body.nome.trim()
                : "";

        const email =
            typeof body.email === "string"
                ? body.email.trim().toLowerCase()
                : "";

        const telefone =
            typeof body.telefone === "string"
                ? body.telefone.replace(/\D/g, "")
                : "";

        const servico =
            typeof body.servico === "string"
                ? body.servico.trim()
                : "";

        const data =
            typeof body.data === "string"
                ? body.data.trim()
                : "";

        const horario =
            typeof body.horario === "string" && body.horario.trim()
                ? body.horario.trim()
                : "A combinar";

        const descricao =
            typeof body.descricao === "string"
                ? body.descricao.trim()
                : "";

        const consentimento = body.consentimento === true;

        // Nome
        if (nome.length < 2 || nome.length > 100) {
            return responderErro(
                res,
                400,
                "Informe seu nome com até 100 caracteres."
            );
        }

        // E-mail
        if (
            email.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            return responderErro(
                res,
                400,
                "Informe um endereço de e-mail válido."
            );
        }

        // Telefone com DDD
        if (telefone.length < 10 || telefone.length > 11) {
            return responderErro(
                res,
                400,
                "Informe um telefone válido com DDD."
            );
        }

        // Serviço
        if (!SERVICOS_PERMITIDOS.includes(servico)) {
            return responderErro(
                res,
                400,
                "Selecione um serviço válido."
            );
        }

        // Data opcional
        if (data) {
            if (!dataCalendarioValida(data)) {
                return responderErro(
                    res,
                    400,
                    "Informe uma data válida."
                );
            }

            if (data < dataLocalAtual()) {
                return responderErro(
                    res,
                    400,
                    "A data não pode estar no passado."
                );
            }
        }

        // Horário
        if (!HORARIOS_PERMITIDOS.includes(horario)) {
            return responderErro(
                res,
                400,
                "Selecione um período válido."
            );
        }

        // Descrição do projeto
        if (
            descricao.length < 10 ||
            descricao.length > 1500
        ) {
            return responderErro(
                res,
                400,
                "A descrição deve ter entre 10 e 1.500 caracteres."
            );
        }

        // Consentimento
        if (!consentimento) {
            return responderErro(
                res,
                400,
                "É necessário aceitar o aviso de privacidade."
            );
        }

        // Salvar no Supabase
        const { data: registro, error } = await supabase
            .from("solicitacoes_reuniao")
            .insert({
                nome,
                email,
                telefone,
                servico,
                data_preferida: data || null,
                horario,
                descricao,
                consentimento: true,
                status: "pendente"
            })
            .select("id")
            .single();

        if (error) {
            console.error(
                "SUPABASE — ERRO AO SALVAR AGENDAMENTO:",
                {
                    message: error.message,
                    code: error.code,
                    details: error.details
                }
            );

            return responderErro(
                res,
                500,
                "Não foi possível registrar sua solicitação. Tente novamente."
            );
        }

        console.log(
            "SOLICITAÇÃO DE REUNIÃO REGISTRADA:",
            registro.id
        );

        return res.status(201).json({
            ok: true,
            success: true,
            mensagem: "Sua solicitação de reunião foi enviada com sucesso.",
            message: "Sua solicitação de reunião foi enviada com sucesso.",
            solicitacaoId: registro.id,
            status: "pendente"
        });
    } catch (error) {
        console.error(
            "ERRO AO REGISTRAR AGENDAMENTO:",
            error.message
        );

        return responderErro(
            res,
            500,
            "Ocorreu um erro ao processar sua solicitação."
        );
    }
});

/* =========================================================
   ROTA DA API NÃO ENCONTRADA
========================================================= */

app.use("/api", (req, res) => {
    return res.status(404).json({
        ok: false,
        success: false,
        mensagem: "Rota da API não encontrada.",
        message: "Rota da API não encontrada.",
        caminho: req.originalUrl,
        metodo: req.method
    });
});

/* =========================================================
   TRATAMENTO DE ERROS
========================================================= */

app.use((error, req, res, next) => {
    console.error("ERRO NO SERVIDOR:", error.message);

    if (res.headersSent) {
        return next(error);
    }

    if (error.type === "entity.too.large") {
        return responderErro(
            res,
            413,
            "Os dados enviados ultrapassam o limite permitido."
        );
    }

    if (error instanceof SyntaxError && error.status === 400) {
        return responderErro(
            res,
            400,
            "O formato dos dados enviados é inválido."
        );
    }

    return responderErro(
        res,
        500,
        "Erro interno do servidor."
    );
});

/* =========================================================
   INICIAR SERVIDOR
========================================================= */

app.listen(PORT, () => {
    console.log("-----------------------------------------");
    console.log("S7 SYSTEMS — SERVIDOR INICIADO");
    console.log(`Site: http://localhost:${PORT}`);
    console.log(`API:  http://localhost:${PORT}/api/health`);
    console.log(
        `Agendamentos: http://localhost:${PORT}/api/solicitacoes-reuniao`
    );
    console.log("-----------------------------------------");
});
