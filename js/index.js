
"use strict";

/* =========================================================
   S7 SYSTEMS — CRIAÇÃO DE E-BOOK
   Animações, planos, formulário e integração com a API
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    /* =====================================================
       CONFIGURAÇÕES
    ===================================================== */

    const CHECKOUT_URLS = {
        Essencial: "https://pay.kiwify.com.br/ydusq7T",
        Profissional: "https://pay.kiwify.com.br/d9iboGd",
        Premium: "https://pay.kiwify.com.br/gTLzyXi"
    };

    const PLAN_PRICES = {
        Essencial: 197,
        Profissional: 397,
        Premium: 697
    };

    const MIN_DESCRIPTION_LENGTH = 500;
    const MAX_DESCRIPTION_LENGTH = 5000;

    const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    let selectedPlan = "";
    let isSubmitting = false;

    /* =====================================================
       ELEMENTOS
    ===================================================== */

    const header = document.getElementById("header");
    const particleContainer = document.getElementById("money-particles");
    const cursorGlow = document.querySelector(".cursor-glow");

    const form = document.getElementById("ebookOrderForm");
    const planInput = document.getElementById("plano");
    const valueInput = document.getElementById("valor");

    const selectedPlanName = document.getElementById("selectedPlanName");
    const selectedPlanPrice = document.getElementById("selectedPlanPrice");

    const nomeInput = document.getElementById("nome");
    const emailInput = document.getElementById("email");
    const whatsappInput = document.getElementById("whatsapp");
    const temaInput = document.getElementById("tema");
    const descricaoInput = document.getElementById("descricao");
    const publicoInput = document.getElementById("publico");
    const objetivoInput = document.getElementById("objetivo");
    const termsInput = document.getElementById("terms");

    const counter = document.getElementById("counter");
    const characterStatus = document.getElementById("characterStatus");
    const paymentButton = document.getElementById("paymentButton");
    const buttonText = paymentButton?.querySelector(".button-text");
    const formMessage = document.getElementById("formMessage");

    const planCards = document.querySelectorAll(".plan-card");
    const planButtons = document.querySelectorAll("[data-select-plan]");

    const errorElements = {
        nome: document.getElementById("nomeError"),
        email: document.getElementById("emailError"),
        whatsapp: document.getElementById("whatsappError"),
        tema: document.getElementById("temaError"),
        descricao: document.getElementById("descricaoError")
    };

    /* =====================================================
       UTILITÁRIOS
    ===================================================== */

    function showMessage(message = "", type = "") {
        if (!formMessage) return;

        formMessage.textContent = message;
        formMessage.className = "form-message";

        if (type) {
            formMessage.classList.add(type);
        }

        if (message) {
            formMessage.setAttribute(
                "role",
                type === "error" ? "alert" : "status"
            );
        }
    }

    function formatPrice(value) {
        return Number(value).toLocaleString("pt-BR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    }

    function getPhoneDigits() {
        return (whatsappInput?.value || "").replace(/\D/g, "");
    }

    function getFieldValue(input) {
        return input?.value?.trim() || "";
    }

    /* =====================================================
       ANO DO RODAPÉ
    ===================================================== */

    const currentYear = document.getElementById("current-year");

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    /* =====================================================
       CABEÇALHO AO ROLAR
    ===================================================== */

    function updateHeader() {
        if (!header) return;

        header.classList.toggle("scrolled", window.scrollY > 20);
    }

    updateHeader();

    window.addEventListener("scroll", updateHeader, {
        passive: true
    });

    /* =====================================================
       ANIMAÇÕES DE ENTRADA
    ===================================================== */

    const revealElements = document.querySelectorAll(".reveal");

    if ("IntersectionObserver" in window && !prefersReducedMotion) {
        const revealObserver = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;

                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                });
            },
            {
                threshold: 0.12,
                rootMargin: "0px 0px -35px 0px"
            }
        );

        revealElements.forEach((element) => {
            revealObserver.observe(element);
        });
    } else {
        revealElements.forEach((element) => {
            element.classList.add("is-visible");
        });
    }

    /* =====================================================
       FOTO DE PERFIL
    ===================================================== */

    const aboutPhotoFrame = document.querySelector(".about-photo-frame");
    const aboutPhoto = document.querySelector(".about-photo");

    if (aboutPhotoFrame && !prefersReducedMotion) {
        aboutPhotoFrame.classList.add("photo-float-ready");
    }

    if (aboutPhoto) {
        aboutPhoto.addEventListener("error", () => {
            console.warn(
                "Não foi possível carregar img/Sarah-Oliveira.png."
            );
        });
    }

    /* =====================================================
       PARTÍCULAS DOURADAS
    ===================================================== */

    function createMoneyParticles() {
        if (!particleContainer || prefersReducedMotion) return;
        if (particleContainer.childElementCount > 0) return;

        const amount = window.innerWidth < 600 ? 8 : 16;

        for (let i = 0; i < amount; i++) {
            const particle = document.createElement("span");

            particle.className = "money-particle";
            particle.textContent = Math.random() > 0.5 ? "$" : "✦";
            particle.setAttribute("aria-hidden", "true");

            particle.style.left = `${Math.random() * 100}%`;
            particle.style.animationDuration =
                `${16 + Math.random() * 22}s`;
            particle.style.animationDelay =
                `${-Math.random() * 30}s`;
            particle.style.fontSize =
                `${13 + Math.random() * 17}px`;
            particle.style.opacity =
                `${0.18 + Math.random() * 0.35}`;

            particleContainer.appendChild(particle);
        }
    }

    createMoneyParticles();

    /* =====================================================
       LUZ QUE ACOMPANHA O MOUSE
    ===================================================== */

    if (
        cursorGlow &&
        window.matchMedia("(pointer: fine)").matches &&
        !prefersReducedMotion
    ) {
        document.body.classList.add("has-pointer");

        window.addEventListener(
            "pointermove",
            (event) => {
                cursorGlow.style.left = `${event.clientX}px`;
                cursorGlow.style.top = `${event.clientY}px`;
            },
            { passive: true }
        );
    }

    /* =====================================================
       SELEÇÃO DE PLANO
    ===================================================== */

    function selectPlan(planName) {
        if (!Object.prototype.hasOwnProperty.call(PLAN_PRICES, planName)) {
            showMessage("Selecione um plano válido.", "error");
            return;
        }

        selectedPlan = planName;

        const price = PLAN_PRICES[planName];

        if (planInput) {
            planInput.value = planName;
        }

        if (valueInput) {
            valueInput.value = String(price);
        }

        if (selectedPlanName) {
            selectedPlanName.textContent = `E-book ${planName}`;
        }

        if (selectedPlanPrice) {
            selectedPlanPrice.textContent = formatPrice(price);
        }

        planCards.forEach((card) => {
            const isSelected = card.dataset.plan === planName;

            card.classList.toggle("is-selected", isSelected);

            const button = card.querySelector("[data-select-plan]");

            if (button) {
                button.classList.toggle("is-selected", isSelected);
                button.setAttribute("aria-pressed", String(isSelected));
            }
        });

        showMessage();
        updateFormState();
    }

    planButtons.forEach((button) => {
        button.addEventListener("click", () => {
            selectPlan(button.dataset.selectPlan);

            document.getElementById("projeto")?.scrollIntoView({
                behavior: prefersReducedMotion ? "auto" : "smooth",
                block: "start"
            });
        });
    });

    /* =====================================================
       VALIDAÇÃO DOS CAMPOS
    ===================================================== */

    function setFieldError(input, errorElement, message) {
        if (errorElement) {
            errorElement.textContent = message || "";
        }

        if (input) {
            input.setAttribute(
                "aria-invalid",
                message ? "true" : "false"
            );
        }
    }

    function validateName() {
        const value = getFieldValue(nomeInput);
        let message = "";

        if (value.length < 2) {
            message = "Informe seu nome.";
        } else if (value.length > 150) {
            message = "O nome deve ter até 150 caracteres.";
        }

        setFieldError(nomeInput, errorElements.nome, message);
        return !message;
    }

    function validateEmail() {
        const value = getFieldValue(emailInput);
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        let message = "";

        if (!emailPattern.test(value)) {
            message = "Informe um endereço de e-mail válido.";
        }

        setFieldError(emailInput, errorElements.email, message);
        return !message;
    }

    function validatePhone() {
        const digits = getPhoneDigits();
        let message = "";

        if (digits.length < 10 || digits.length > 11) {
            message = "Informe um WhatsApp válido com DDD.";
        }

        setFieldError(whatsappInput, errorElements.whatsapp, message);
        return !message;
    }

    function validateTheme() {
        const value = getFieldValue(temaInput);
        let message = "";

        if (value.length < 3) {
            message = "Informe o tema principal do e-book.";
        } else if (value.length > 200) {
            message = "O tema deve ter até 200 caracteres.";
        }

        setFieldError(temaInput, errorElements.tema, message);
        return !message;
    }

    function validateDescription() {
        const value = getFieldValue(descricaoInput);
        let message = "";

        if (value.length < MIN_DESCRIPTION_LENGTH) {
            message =
                `Escreva pelo menos ${MIN_DESCRIPTION_LENGTH} caracteres.`;
        } else if (value.length > MAX_DESCRIPTION_LENGTH) {
            message =
                `A descrição deve ter no máximo ${MAX_DESCRIPTION_LENGTH} caracteres.`;
        }

        setFieldError(
            descricaoInput,
            errorElements.descricao,
            message
        );

        return !message;
    }

    /* =====================================================
       CONTADOR DE CARACTERES
    ===================================================== */

    function updateDescriptionCounter() {
        if (!descricaoInput) return;

        const length = descricaoInput.value.length;
        const complete = length >= MIN_DESCRIPTION_LENGTH;

        if (counter) {
            counter.textContent =
                `${length} / ${MAX_DESCRIPTION_LENGTH}`;

            counter.classList.toggle("is-complete", complete);
        }

        if (characterStatus) {
            characterStatus.classList.toggle("is-complete", complete);

            const statusText = characterStatus.querySelector("span");

            if (statusText) {
                statusText.textContent = complete
                    ? "Descrição com o mínimo atingido."
                    : `Faltam ${MIN_DESCRIPTION_LENGTH - length} caracteres para o mínimo.`;
            }
        }
    }

    /* =====================================================
       FORMATAÇÃO DO WHATSAPP
    ===================================================== */

    function formatPhone(value) {
        const digits = value.replace(/\D/g, "").slice(0, 11);

        if (!digits) return "";
        if (digits.length < 3) return `(${digits}`;

        if (digits.length <= 6) {
            return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        }

        if (digits.length <= 10) {
            return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
        }

        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }

    whatsappInput?.addEventListener("input", () => {
        const cursorAtEnd =
            whatsappInput.selectionStart === whatsappInput.value.length;

        whatsappInput.value = formatPhone(whatsappInput.value);

        if (cursorAtEnd) {
            whatsappInput.setSelectionRange(
                whatsappInput.value.length,
                whatsappInput.value.length
            );
        }

        validatePhone();
        updateFormState();
    });

    /* =====================================================
       ESTADO E VALIDAÇÃO GERAL
    ===================================================== */

    function isFormValid() {
        return (
            validateName() &&
            validateEmail() &&
            validatePhone() &&
            validateTheme() &&
            validateDescription() &&
            Boolean(termsInput?.checked) &&
            Boolean(selectedPlan)
        );
    }

    function updateFormState() {
        if (!paymentButton || isSubmitting) return;

        const descriptionLength =
            getFieldValue(descricaoInput).length;

        const phoneLength = getPhoneDigits().length;

        const valid =
            Boolean(selectedPlan) &&
            getFieldValue(nomeInput).length >= 2 &&
            getFieldValue(emailInput).length > 0 &&
            phoneLength >= 10 &&
            phoneLength <= 11 &&
            getFieldValue(temaInput).length >= 3 &&
            descriptionLength >= MIN_DESCRIPTION_LENGTH &&
            descriptionLength <= MAX_DESCRIPTION_LENGTH &&
            Boolean(termsInput?.checked);

        paymentButton.disabled = !valid;
    }

    nomeInput?.addEventListener("input", () => {
        validateName();
        updateFormState();
    });

    emailInput?.addEventListener("input", () => {
        validateEmail();
        updateFormState();
    });

    temaInput?.addEventListener("input", () => {
        validateTheme();
        updateFormState();
    });

    descricaoInput?.addEventListener("input", () => {
        updateDescriptionCounter();
        validateDescription();
        updateFormState();
    });

    termsInput?.addEventListener("change", updateFormState);

    [publicoInput, objetivoInput].forEach((input) => {
        input?.addEventListener("input", updateFormState);
        input?.addEventListener("change", updateFormState);
    });

    /* =====================================================
       ESTADO DO BOTÃO
    ===================================================== */

    function setSubmittingState(submitting) {
        isSubmitting = submitting;

        if (!paymentButton) return;

        paymentButton.classList.toggle("is-loading", submitting);
        paymentButton.disabled = submitting;

        paymentButton.setAttribute(
            "aria-busy",
            String(submitting)
        );

        if (buttonText) {
            buttonText.textContent = submitting
                ? "Registrando seu pedido..."
                : "Continuar para pagamento";
        }

        if (!submitting) {
            updateFormState();
        }
    }

    /* =====================================================
       ENVIO PARA A API
    ===================================================== */

    async function submitOrder(orderData) {
        const response = await fetch("/api/ebook-pedidos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(orderData)
        });

        const responseText = await response.text();
        let result = null;

        if (responseText) {
            try {
                result = JSON.parse(responseText);
            } catch {
                console.error("Resposta não JSON da API:", {
                    status: response.status,
                    body: responseText
                });

                throw new Error(
                    `O servidor retornou uma resposta inválida (HTTP ${response.status}). ` +
                    "Confira o terminal do Node.js."
                );
            }
        }

        if (!response.ok) {
            console.error("Erro retornado pela API:", {
                status: response.status,
                result
            });

            throw new Error(
                result?.mensagem ||
                result?.message ||
                result?.error ||
                `Não foi possível registrar o pedido (HTTP ${response.status}).`
            );
        }

        if (!result || result.ok !== true) {
            console.error("A API não confirmou o registro:", result);

            throw new Error(
                result?.mensagem ||
                result?.message ||
                "O servidor não confirmou o registro do pedido."
            );
        }

        return result;
    }

    /* =====================================================
       ENVIO DO FORMULÁRIO E CHECKOUT KIWIFY
    ===================================================== */

    form?.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (isSubmitting) return;

        showMessage();

        if (!isFormValid()) {
            showMessage(
                "Confira os campos destacados, selecione um plano e aceite os termos.",
                "error"
            );

            form.querySelector('[aria-invalid="true"]')?.focus();
            updateFormState();
            return;
        }

        const checkoutUrl = CHECKOUT_URLS[selectedPlan];

        if (!checkoutUrl) {
            showMessage(
                "Não foi possível identificar o checkout deste plano.",
                "error"
            );
            return;
        }

        /*
         * Compatível com a API do server.js:
         * nome, email, whatsapp, tema, descricao,
         * publico, objetivo, plano e termosAceitos.
         */
        const orderData = {
            nome: getFieldValue(nomeInput),
            email: getFieldValue(emailInput).toLowerCase(),
            whatsapp: getPhoneDigits(),
            tema: getFieldValue(temaInput),
            descricao: getFieldValue(descricaoInput),
            publico: getFieldValue(publicoInput),
            objetivo: getFieldValue(objetivoInput),
            plano: selectedPlan,
            valor: PLAN_PRICES[selectedPlan],
            termosAceitos: termsInput?.checked === true
        };

        setSubmittingState(true);

        showMessage("Registrando seu pedido...", "info");

        try {
            const result = await submitOrder(orderData);

            console.info("Pedido registrado pela API.", {
                plano: selectedPlan,
                status: result.status || "registrado"
            });

            showMessage(
                "Pedido registrado! Abrindo o checkout seguro...",
                "success"
            );

            /*
             * A Kiwify confirma o pagamento separadamente.
             * O registro do pedido não significa que ele foi pago.
             */
            window.location.assign(checkoutUrl);

        } catch (error) {
            console.error("Erro no envio do pedido:", error);

            showMessage(
                error.message ||
                "Não foi possível conectar ao servidor. Tente novamente.",
                "error"
            );

            setSubmittingState(false);
        }
    });

    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    updateDescriptionCounter();
    updateFormState();

    planCards.forEach((card) => {
        const planName = card.dataset.plan;

        if (planName && !PLAN_PRICES[planName]) {
            console.warn(`Plano sem preço configurado: ${planName}`);
        }
    });

    console.info("S7 Systems — JavaScript carregado com sucesso.");
});
