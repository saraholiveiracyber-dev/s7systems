"use strict";

/* =========================================================
   S7 SYSTEMS — AGENDAMENTO DE REUNIÃO
   Formulário, validação, máscara e integração com API
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("meetingForm");
    const telefone = document.getElementById("telefone");
    const descricao = document.getElementById("descricao");
    const contador = document.getElementById("counter");
    const mensagem = document.getElementById("formMessage");
    const botao = document.getElementById("submitButton");
    const ano = document.getElementById("currentYear");

    if (!form) {
        console.error("[S7 Systems] Formulário não encontrado.");
        return;
    }

    const textoBotao = botao?.querySelector(".button-label");
    const textoOriginal = textoBotao?.textContent.trim()
        || "Solicitar reunião";

    /* =====================================================
       ANO AUTOMÁTICO NO RODAPÉ
    ===================================================== */

    if (ano) {
        ano.textContent = new Date().getFullYear();
    }

    /* =====================================================
       DATA MÍNIMA: HOJE
    ===================================================== */

    const campoData = document.getElementById("data");

    function dataLocalISO() {
        const agora = new Date();
        const anoAtual = agora.getFullYear();
        const mes = String(agora.getMonth() + 1).padStart(2, "0");
        const dia = String(agora.getDate()).padStart(2, "0");

        return `${anoAtual}-${mes}-${dia}`;
    }

    if (campoData) {
        campoData.min = dataLocalISO();
    }

    /* =====================================================
       CONTADOR DE CARACTERES
    ===================================================== */

    function atualizarContador() {
        if (!descricao || !contador) return;

        const total = descricao.value.length;
        const limite = Number(descricao.maxLength) || 1500;

        contador.textContent = total;

        contador.parentElement?.classList.toggle(
            "limit-reached",
            total >= limite
        );

        contador.parentElement?.classList.toggle(
            "limit-warning",
            total >= limite * 0.9 && total < limite
        );

        descricao.setAttribute(
            "aria-describedby",
            "counter"
        );
    }

    descricao?.addEventListener("input", atualizarContador);
    atualizarContador();

    /* =====================================================
       MÁSCARA DE WHATSAPP
    ===================================================== */

    function formatarTelefone(valor) {
        let numero = valor.replace(/\D/g, "").slice(0, 11);

        if (numero.length === 0) return "";

        if (numero.length <= 2) {
            return `(${numero}`;
        }

        if (numero.length <= 6) {
            return `(${numero.slice(0, 2)}) ${numero.slice(2)}`;
        }

        if (numero.length <= 10) {
            return numero.replace(
                /^(\d{2})(\d{4})(\d{0,4})$/,
                (_, ddd, inicio, fim) =>
                    `(${ddd}) ${inicio}${fim ? "-" + fim : ""}`
            );
        }

        return numero.replace(
            /^(\d{2})(\d{5})(\d{0,4})$/,
            (_, ddd, inicio, fim) =>
                `(${ddd}) ${inicio}${fim ? "-" + fim : ""}`
        );
    }

    telefone?.addEventListener("input", () => {
        telefone.value = formatarTelefone(telefone.value);
    });

    /* =====================================================
       MENSAGENS DO FORMULÁRIO
    ===================================================== */

    function mostrarMensagem(texto, tipo = "info") {
        if (!mensagem) {
            console.warn(`[S7 Systems] ${texto}`);
            return;
        }

        mensagem.textContent = texto;
        mensagem.dataset.tipo = tipo;
        mensagem.classList.remove(
            "is-success",
            "is-error",
            "is-info"
        );

        mensagem.classList.add(
            tipo === "sucesso"
                ? "is-success"
                : tipo === "erro"
                    ? "is-error"
                    : "is-info"
        );

        mensagem.hidden = false;
        mensagem.style.display = "block";
        mensagem.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }

    function limparMensagem() {
        if (!mensagem) return;

        mensagem.textContent = "";
        mensagem.hidden = true;
        mensagem.style.display = "none";
        mensagem.removeAttribute("data-tipo");
        mensagem.classList.remove(
            "is-success",
            "is-error",
            "is-info"
        );
    }

    form.addEventListener("input", limparMensagem);
    form.addEventListener("change", limparMensagem);

    /* =====================================================
       ESTADO DO BOTÃO
    ===================================================== */

    function definirCarregamento(ativo) {
        if (!botao) return;

        botao.disabled = ativo;
        botao.setAttribute("aria-busy", String(ativo));

        if (textoBotao) {
            textoBotao.textContent = ativo
                ? "Enviando solicitação..."
                : textoOriginal;
        }
    }

    /* =====================================================
       VALIDAÇÕES COMPLEMENTARES
    ===================================================== */

    function validarFormulario() {
        const numero = telefone?.value.replace(/\D/g, "") || "";

        if (numero.length !== 10 && numero.length !== 11) {
            mostrarMensagem(
                "Informe um WhatsApp válido com DDD.",
                "erro"
            );
            telefone?.focus();
            return false;
        }

        if (descricao && descricao.value.trim().length < 10) {
            mostrarMensagem(
                "Conte um pouco mais sobre seu projeto.",
                "erro"
            );
            descricao.focus();
            return false;
        }

        if (campoData?.value && campoData.value < dataLocalISO()) {
            mostrarMensagem(
                "Selecione hoje ou uma data futura.",
                "erro"
            );
            campoData.focus();
            return false;
        }

        const consentimento =
            document.getElementById("consentimento");

        if (!consentimento?.checked) {
            mostrarMensagem(
                "É necessário autorizar o contato para continuar.",
                "erro"
            );
            consentimento?.focus();
            return false;
        }

        return true;
    }

    /* =====================================================
       ENVIO PARA O SERVIDOR
    ===================================================== */

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        limparMensagem();

        if (!form.reportValidity()) {
            return;
        }

        if (!validarFormulario()) {
            return;
        }

        const dados = {
            nome: document.getElementById("nome").value.trim(),
            email: document.getElementById("email").value.trim(),
            telefone: telefone.value.replace(/\D/g, ""),
            servico: document.getElementById("servico").value,
            data: campoData?.value || null,
            horario: document.getElementById("horario").value,
            descricao: descricao.value.trim(),
            consentimento: document.getElementById("consentimento").checked
        };

        definirCarregamento(true);

        try {
            const resposta = await fetch(form.action, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(dados)
            });

            let resultado;

            try {
                resultado = await resposta.json();
            } catch {
                throw new Error(
                    "O servidor retornou uma resposta inválida."
                );
            }

            if (!resposta.ok || resultado.ok === false) {
                throw new Error(
                    resultado.mensagem ||
                    "Não foi possível enviar sua solicitação."
                );
            }

            mostrarMensagem(
                resultado.mensagem ||
                "Solicitação enviada! A equipe da S7 Systems entrará em contato para combinar a reunião.",
                "sucesso"
            );

            form.reset();
            atualizarContador();

            if (campoData) {
                campoData.min = dataLocalISO();
            }

            form.dispatchEvent(
                new CustomEvent("s7:reuniao-enviada", {
                    bubbles: true,
                    detail: resultado
                })
            );

        } catch (erro) {
            console.error(
                "[S7 Systems] Erro ao enviar reunião:",
                erro
            );

            mostrarMensagem(
                erro.message ||
                "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
                "erro"
            );
        } finally {
            definirCarregamento(false);
        }
    });

    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    if (mensagem) {
        mensagem.hidden = true;
        mensagem.style.display = "none";
    }

    console.info(
        "[S7 Systems] Formulário de reunião inicializado."
    );
});
