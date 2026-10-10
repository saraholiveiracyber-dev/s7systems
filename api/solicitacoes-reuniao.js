
"use strict";

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
    supabaseUrl && supabaseServiceKey
        ? createClient(supabaseUrl, supabaseServiceKey, {
              auth: {
                  persistSession: false,
                  autoRefreshToken: false
              }
          })
        : null;

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

function responder(res, status, success, message, extras = {}) {
    return res.status(status).json({
        success,
        message,
        ...extras
    });
}

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
    const data = new Date(Date.UTC(ano, mes - 1, dia));

    return (
        data.getUTCFullYear() === ano &&
        data.getUTCMonth() === mes - 1 &&
        data.getUTCDate() === dia
    );
}

module.exports = async function handler(req, res) {
    res.setHeader("Allow", "POST, OPTIONS");
    res.setHeader("Cache-Control", "no-store");

    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }

    if (req.method !== "POST") {
        return responder(
            res,
            405,
            false,
            "Método não permitido. Utilize POST."
        );
    }

    if (!supabase) {
        console.error(
            "Configuração do Supabase ausente no ambiente do servidor."
        );

        return responder(
            res,
            500,
            false,
            "O serviço de agendamento não está configurado."
        );
    }

    try {
        let body = req.body;

        if (typeof body === "string") {
            try {
                body = JSON.parse(body);
            } catch {
                return responder(
                    res,
                    400,
                    false,
                    "O conteúdo enviado não contém JSON válido."
                );
            }
        }

        if (
            !body ||
            typeof body !== "object" ||
            Array.isArray(body)
        ) {
            return responder(res, 400, false, "Dados inválidos.");
        }

        const nome = String(body.nome || "").trim();
        const email = String(body.email || "")
            .trim()
            .toLowerCase();
        const telefone = String(body.telefone || "").trim();
        const numerosTelefone = telefone.replace(/\D/g, "");
        const servico = String(body.servico || "").trim();
        const data = String(body.data || "").trim();
        const horario = String(
            body.horario || "A combinar"
        ).trim();
        const descricao = String(body.descricao || "").trim();
        const consentimento = body.consentimento === true;

        // Nome
        if (nome.length < 2 || nome.length > 100) {
            return responder(
                res,
                400,
                false,
                "Informe seu nome com até 100 caracteres."
            );
        }

        // E-mail
        if (
            email.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            return responder(
                res,
                400,
                false,
                "Informe um endereço de e-mail válido."
            );
        }

        // Telefone com DDD
        if (
            numerosTelefone.length < 10 ||
            numerosTelefone.length > 13
        ) {
            return responder(
                res,
                400,
                false,
                "Informe um telefone válido com DDD."
            );
        }

        // Serviço
        if (!SERVICOS_PERMITIDOS.includes(servico)) {
            return responder(
                res,
                400,
                false,
                "Selecione um serviço válido."
            );
        }

        // Data opcional
        if (data) {
            if (!dataCalendarioValida(data)) {
                return responder(
                    res,
                    400,
                    false,
                    "Informe uma data válida."
                );
            }

            if (data < dataLocalAtual()) {
                return responder(
                    res,
                    400,
                    false,
                    "A data não pode estar no passado."
                );
            }
        }

        // Horário
        if (!HORARIOS_PERMITIDOS.includes(horario)) {
            return responder(
                res,
                400,
                false,
                "Selecione um período válido."
            );
        }

        // Descrição
        if (descricao.length < 10 || descricao.length > 1500) {
            return responder(
                res,
                400,
                false,
                "A descrição deve ter entre 10 e 1500 caracteres."
            );
        }

        // Consentimento
        if (!consentimento) {
            return responder(
                res,
                400,
                false,
                "É necessário aceitar o aviso de privacidade."
            );
        }

        // Cadastro no Supabase
        const { data: registro, error } = await supabase
            .from("solicitacoes_reuniao")
            .insert({
                nome,
                email,
                telefone: numerosTelefone,
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
            console.error("Erro no cadastro da reunião:", {
                code: error.code,
                message: error.message
            });

            return responder(
                res,
                500,
                false,
                "Não foi possível registrar sua solicitação. Tente novamente."
            );
        }

        return responder(
            res,
            201,
            true,
            "Sua solicitação de reunião foi enviada com sucesso.",
            {
                solicitacaoId: registro.id,
                status: "pendente"
            }
        );
    } catch (error) {
        console.error(
            "Erro inesperado na API de agendamento:",
            error.message
        );

        return responder(
            res,
            500,
            false,
            "Ocorreu um erro ao processar sua solicitação."
        );
    }
};
