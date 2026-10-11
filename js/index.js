
"use strict";

/* =========================================================
   S7 SYSTEMS — CRIAÇÃO DE E-BOOK
   Premium • Responsivo • Otimizado para celular
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* CONFIGURAÇÕES */

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
    const API_URL = "/api/ebook-pedidos";
    const API_TIMEOUT = 20000;

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    const isMobile = window.matchMedia(
        "(max-width: 768px)"
    ).matches;

    const hasFinePointer = window.matchMedia(
        "(pointer: fine)"
    ).matches;

    let selectedPlan = "";
    let isSubmitting = false;

    /* ELEMENTOS */

    const $ = (selector, parent = document) =>
        parent.querySelector(selector);

    const $$ = (selector, parent = document) =>
        [...parent.querySelectorAll(selector)];

    const header = $("#header");
    const particleContainer = $("#money-particles");
    const cursorGlow = $(".cursor-glow");

    const form = $("#ebookOrderForm");
    const planInput = $("#plano");
    const valueInput = $("#valor");

    const selectedPlanName = $("#selectedPlanName");
    const selectedPlanPrice = $("#selectedPlanPrice");

    const nomeInput = $("#nome");
    const emailInput = $("#email");
    const whatsappInput = $("#whatsapp");
    const temaInput = $("#tema");
    const descricaoInput = $("#descricao");
    const publicoInput = $("#publico");
    const objetivoInput = $("#objetivo");
    const termsInput = $("#terms");

    const counter = $("#counter");
    const characterStatus = $("#characterStatus");

    const paymentButton = $("#paymentButton");
    const buttonText = $(".button-text", paymentButton || document);
    const formMessage = $("#formMessage");

    const planCards = $$(".plan-card");
    const planButtons = $$("[data-select-plan]");

    const errorElements = {
        nome: $("#nomeError"),
        email: $("#emailError"),
        whatsapp: $("#whatsappError"),
        tema: $("#temaError"),
        descricao: $("#descricaoError")
    };

    /* ESTILOS DE APOIO PARA CELULAR
       Os estilos principais continuam no index.css. */

    const mobileStyle = document.createElement("style");

    mobileStyle.textContent = `
        html {
            scroll-behavior: ${reduceMotion || isMobile ? "auto" : "smooth"};
            -webkit-text-size-adjust: 100%;
        }

        button, a, input, select, textarea {
            touch-action: manipulation;
        }

        button, a {
            -webkit-tap-highlight-color: transparent;
        }

        input, select, textarea {
            max-width: 100%;
        }

        @media (max-width: 768px) {
            .cursor-glow {
                display: none !important;
            }

            .money-particle {
                animation: none !important;
            }

            .plan-card,
            .plan-card *,
            .reveal {
                animation-duration: 0.2s !important;
            }

            .plan-card {
                scroll-margin-top: 16px;
            }

            #projeto,
            #ebookOrderForm {
                scroll-margin-top: 16px;
            }

            #paymentButton {
                min-height: 48px;
                width: 100%;
            }

            #ebookOrderForm input,
            #ebookOrderForm select,
            #ebookOrderForm textarea {
                font-size: 16px;
            }

            .floating-button,
            .whatsapp-float,
            .floating-cta,
            .btn-flutuante,
            .botao-flutuante {
                background: rgba(8, 8, 8, 0.30) !important;
                backdrop-filter: blur(5px);
                -webkit-backdrop-filter: blur(5px);
                box-shadow: none !important;
            }

            .floating-button,
            .floating-cta,
            .btn-flutuante,
            .botao-flutuante {
                max-width: calc(100vw - 24px);
            }
        }

        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
                scroll-behavior: auto !important;
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }
    `;

    document.head.appendChild(mobileStyle);

    /* UTILITÁRIOS */

    function getFieldValue(input) {
        return input?.value?.trim() || "";
    }

    function getPhoneDigits() {
        return (whatsappInput?.value || "").replace(/\D/g, "");
    }

    function formatPrice(value) {
        return Number(value).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function getReadableError(value) {
        if (typeof value === "string" && value.trim()) {
            return value;
        }

        if (value instanceof Error && value.message) {
            return value.message;
        }

        if (value && typeof value === "object") {
            for (const key of [
                "mensagem",
                "message",
                "error_description",
                "details",
                "error"
            ]) {
                const item = value[key];

                if (typeof item === "string" && item.trim()) {
                    return item;
                }

                if (item && typeof item === "object") {
                    const nested = getReadableError(item);

                    if (nested !== "Ocorreu um erro inesperado.") {
                        return nested;
                    }
                }
            }

            if (typeof value.code === "string") {
                return `Código do erro: ${value.code}`;
            }
        }

        return "Ocorreu um erro inesperado.";
    }

    function showMessage(message = "", type = "") {
        if (!formMessage) return;

        formMessage.textContent =
            typeof message === "string"
                ? message
                : getReadableError(message);

        formMessage.className = "form-message";

        if (type) {
            formMessage.classList.add(type);
        }

        if (message) {
            formMessage.setAttribute(
                "role",
                type === "error" ? "alert" : "status"
            );
        } else {
            formMessage.removeAttribute("role");
        }
    }

    function scrollToElement(element) {
        if (!element) return;

        element.scrollIntoView({
            behavior: reduceMotion || isMobile ? "auto" : "smooth",
            block: "start"
        });
    }

    /* ANO DO RODAPÉ */

    const currentYear = $("#current-year");

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    /* CABEÇALHO */

    let lastHeaderState = null;

    function updateHeader() {
        if (!header) return;

        const scrolled = window.scrollY > 20;

        if (scrolled !== lastHeaderState) {
            header.classList.toggle("scrolled", scrolled);
            lastHeaderState = scrolled;
        }
    }

    updateHeader();

    window.addEventListener("scroll", updateHeader, {
        passive: true
    });

    /* ANIMAÇÕES DE ENTRADA */

    const revealElements = $$(".reveal");

    if ("IntersectionObserver" in window && !reduceMotion) {
        const revealObserver = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;

                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                });
            },
            {
                threshold: isMobile ? 0.04 : 0.12,
                rootMargin: isMobile
                    ? "0px 0px 20px 0px"
                    : "0px 0px -35px 0px"
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

    /* FOTO */

    const aboutPhotoFrame = $(".about-photo-frame");
    const aboutPhoto = $(".about-photo");

    if (aboutPhotoFrame && !isMobile && !reduceMotion) {
        aboutPhotoFrame.classList.add("photo-float-ready");
    }

    aboutPhoto?.addEventListener("error", () => {
        console.warn("Não foi possível carregar a imagem de perfil.");
    });

    /* PARTÍCULAS */

    function createMoneyParticles() {
        if (!particleContainer || reduceMotion || isMobile) return;
        if (particleContainer.childElementCount > 0) return;

        for (let i = 0; i < 12; i++) {
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
                `${13 + Math.random() * 12}px`;
            particle.style.opacity =
                `${0.18 + Math.random() * 0.25}`;

            particleContainer.appendChild(particle);
        }
    }

    createMoneyParticles();

    /* EFEITO DE CURSOR SOMENTE NO COMPUTADOR */

    if (cursorGlow && hasFinePointer && !reduceMotion) {
        document.body.classList.add("has-pointer");

        let pointerFrame = 0;
        let pointerX = 0;
        let pointerY = 0;

        window.addEventListener("pointermove", (event) => {
            pointerX = event.clientX;
            pointerY = event.clientY;

            if (pointerFrame) return;

            pointerFrame = requestAnimationFrame(() => {
                cursorGlow.style.left = `${pointerX}px`;
                cursorGlow.style.top = `${pointerY}px`;
                pointerFrame = 0;
            });
        }, { passive: true });
    }

    /* SELEÇÃO DE PLANO */

    function selectPlan(planName, shouldScroll = false) {
        if (!Object.hasOwn(PLAN_PRICES, planName)) {
            showMessage("Selecione um plano válido.", "error");
            return;
        }

        selectedPlan = planName;

        const price = PLAN_PRICES[planName];

        if (planInput) planInput.value = planName;
        if (valueInput) valueInput.value = String(price);

        if (selectedPlanName) {
            selectedPlanName.textContent = `E-book ${planName}`;
        }

        if (selectedPlanPrice) {
            selectedPlanPrice.textContent = formatPrice(price);
        }

        planCards.forEach((card) => {
            const selected = card.dataset.plan === planName;

            card.classList.toggle("is-selected", selected);

            const button = $("[data-select-plan]", card);

            if (button) {
                button.classList.toggle("is-selected", selected);
                button.setAttribute("aria-pressed", String(selected));
            }
        });

        showMessage();
        updateFormState();

        if (shouldScroll) {
            scrollToElement($("#projeto"));
        }
    }

    planButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
            event.preventDefault();

            selectPlan(button.dataset.selectPlan, true);
        });
    });

    /* BOTÕES DE CRIAR MEU E-BOOK
       Aceita links e botões com os seletores abaixo. */

    const createEbookSelectors = [
        "[data-create-ebook]",
        ".btn-criar-ebook",
        "#createEbookButton"
    ].join(",");

    $$(createEbookSelectors).forEach((button) => {
        button.addEventListener("click", (event) => {
            const target = $("#projeto");

            if (!target) return;

            event.preventDefault();
            scrollToElement(target);

            if (!selectedPlan && planCards.length) {
                showMessage(
                    "Escolha um dos planos para iniciar seu projeto.",
                    "info"
                );
            }
        });
    });

    /* VALIDAÇÃO DOS CAMPOS */

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
            message = "Informe seu nome completo.";
        } else if (value.length > 150) {
            message = "O nome deve ter até 150 caracteres.";
        }

        setFieldError(nomeInput, errorElements.nome, message);
        return !message;
    }

    function validateEmail() {
        const value = getFieldValue(emailInput);
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        const message = pattern.test(value)
            ? ""
            : "Informe um e-mail válido.";

        setFieldError(emailInput, errorElements.email, message);
        return !message;
    }

    function validatePhone() {
        const digits = getPhoneDigits();

        const message =
            digits.length < 10 || digits.length > 11
                ? "Informe um WhatsApp válido com DDD."
                : "";

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
            message = `Escreva pelo menos ${MIN_DESCRIPTION_LENGTH} caracteres.`;
        } else if (value.length > MAX_DESCRIPTION_LENGTH) {
            message = `A descrição deve ter no máximo ${MAX_DESCRIPTION_LENGTH} caracteres.`;
        }

        setFieldError(
            descricaoInput,
            errorElements.descricao,
            message
        );

        return !message;
    }

    /* CONTADOR DE CARACTERES */

    function updateDescriptionCounter() {
        if (!descricaoInput) return;

        const length = descricaoInput.value.length;
        const complete = length >= MIN_DESCRIPTION_LENGTH;
        const remaining = Math.max(0, MIN_DESCRIPTION_LENGTH - length);

        if (counter) {
            counter.textContent =
                `${length.toLocaleString("pt-BR")} / ${MAX_DESCRIPTION_LENGTH.toLocaleString("pt-BR")}`;

            counter.classList.toggle("is-complete", complete);
        }

        if (characterStatus) {
            characterStatus.classList.toggle("is-complete", complete);

            const statusText = $("span", characterStatus);

            if (statusText) {
                statusText.textContent = complete
                    ? "Mínimo de caracteres atingido."
                    : `Faltam ${remaining} caracteres.`;
            }
        }
    }

    /* WHATSAPP */

    function formatPhone(value) {
        const digits = value.replace(/\D/g, "").slice(0, 11);

        if (!digits) return "";
        if (digits.length <= 2) return `(${digits}`;

        if (digits.length <= 6) {
            return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        }

        if (digits.length <= 10) {
            return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
        }

        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }

    whatsappInput?.addEventListener("input", () => {
        const oldValue = whatsappInput.value;
        const oldPosition = whatsappInput.selectionStart ?? oldValue.length;

        const digitsBeforeCursor = oldValue
            .slice(0, oldPosition)
            .replace(/\D/g, "").length;

        const formatted = formatPhone(oldValue);

        whatsappInput.value = formatted;

        let newPosition = 0;
        let digitsSeen = 0;

        while (newPosition < formatted.length &&
               digitsSeen < digitsBeforeCursor) {
            if (/\d/.test(formatted[newPosition])) digitsSeen++;
            newPosition++;
        }

        try {
            whatsappInput.setSelectionRange(newPosition, newPosition);
        } catch {
            // Alguns navegadores não permitem ajustar a seleção.
        }

        validatePhone();
        updateFormState();
    });

    /* ESTADO DO FORMULÁRIO */

    function isFormValid() {
        const fieldsValid =
            validateName() &&
            validateEmail() &&
            validatePhone() &&
            validateTheme() &&
            validateDescription();

        return (
            fieldsValid &&
            Boolean(selectedPlan) &&
            termsInput?.checked === true
        );
    }

    function updateFormState() {
        if (!paymentButton || isSubmitting) return;

        const descriptionLength = getFieldValue(descricaoInput).length;
        const phoneLength = getPhoneDigits().length;

        const valid =
            Boolean(selectedPlan) &&
            getFieldValue(nomeInput).length >= 2 &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(getFieldValue(emailInput)) &&
            phoneLength >= 10 &&
            phoneLength <= 11 &&
            getFieldValue(temaInput).length >= 3 &&
            descriptionLength >= MIN_DESCRIPTION_LENGTH &&
            descriptionLength <= MAX_DESCRIPTION_LENGTH &&
            termsInput?.checked === true;

        paymentButton.disabled = !valid;
        paymentButton.setAttribute("aria-disabled", String(!valid));
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

    /* ESTADO DE ENVIO */

    function setSubmittingState(submitting) {
        isSubmitting = submitting;

        if (!paymentButton) return;

        paymentButton.classList.toggle("is-loading", submitting);
        paymentButton.disabled = submitting;

        paymentButton.setAttribute("aria-busy", String(submitting));

        if (buttonText) {
            buttonText.textContent = submitting
                ? "Registrando seu pedido..."
                : "Continuar para pagamento";
        }

        if (!submitting) {
            updateFormState();
        }
    }

    /* COMUNICAÇÃO COM A API */

    async function submitOrder(orderData) {
        const controller = new AbortController();

        const timeout = window.setTimeout(
            () => controller.abort(),
            API_TIMEOUT
        );

        let response;

        try {
            response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(orderData),
                signal: controller.signal
            });
        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error(
                    "O servidor demorou para responder. Verifique se o pedido foi registrado antes de tentar novamente."
                );
            }

            throw new Error(
                "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente."
            );
        } finally {
            window.clearTimeout(timeout);
        }

        const responseText = await response.text();
        let result = null;

        if (responseText.trim()) {
            try {
                result = JSON.parse(responseText);
            } catch {
                console.error(
                    "Resposta inválida da API:",
                    response.status,
                    responseText.slice(0, 500)
                );

                throw new Error(
                    `Resposta inválida do servidor (HTTP ${response.status}).`
                );
            }
        }

        if (!response.ok) {
            console.error("Erro da API:", response.status, result);

            const message = getReadableError(result);

            if (message !== "Ocorreu um erro inesperado.") {
                throw new Error(message);
            }

            throw new Error(
                response.status >= 500
                    ? "O servidor apresentou um erro ao registrar o pedido. Tente novamente mais tarde."
                    : `Não foi possível registrar o pedido (HTTP ${response.status}).`
            );
        }

        if (!result || typeof result !== "object" ||
            Array.isArray(result)) {
            throw new Error(
                "O servidor não confirmou o registro do pedido."
            );
        }

        const confirmed =
            result.ok === true ||
            result.success === true;

        if (!confirmed) {
            console.error("Registro não confirmado:", result);

            const message = getReadableError(result);

            throw new Error(
                message !== "Ocorreu um erro inesperado."
                    ? message
                    : "O pedido não foi confirmado pelo servidor. Nenhum redirecionamento foi realizado."
            );
        }

        return result;
    }

    /* ENVIO E PAGAMENTO */

    form?.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (isSubmitting) return;

        showMessage();

        if (!isFormValid()) {
            showMessage(
                "Confira os campos obrigatórios, selecione um plano e aceite os termos.",
                "error"
            );

            const firstInvalid = $(
                '[aria-invalid="true"]',
                form
            );

            if (firstInvalid) {
                firstInvalid.focus({ preventScroll: true });
                scrollToElement(firstInvalid);
            } else if (!selectedPlan) {
                scrollToElement($$(".plan-card")[0]);
            }

            updateFormState();
            return;
        }

        const checkoutUrl = CHECKOUT_URLS[selectedPlan];

        if (!checkoutUrl) {
            showMessage(
                "Não foi possível identificar o pagamento deste plano.",
                "error"
            );
            return;
        }

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

            console.info("Pedido registrado.", {
                plano: selectedPlan,
                status: typeof result.status === "string"
                    ? result.status
                    : "registrado"
            });

            showMessage(
                "Pedido registrado! Abrindo o pagamento seguro...",
                "success"
            );

            window.location.assign(checkoutUrl);

        } catch (error) {
            console.error("Erro ao registrar pedido:", error);

            showMessage(getReadableError(error), "error");
            setSubmittingState(false);
        }
    });

    /* REUNIÃO ONLINE
       Não intercepta nem atrasa o clique dos links externos.
       Garante abertura segura para links configurados em nova aba. */

    $$("a[href]").forEach((link) => {
        const href = link.getAttribute("href") || "";
        const label = (link.innerText || link.getAttribute("aria-label") || "")
            .trim()
            .toLowerCase();

        const isMeeting =
            /reuni[aã]o|mentoria|agendamento/.test(label) ||
            /forms\.office\.com|forms\.microsoft\.com/.test(href);

        if (!isMeeting || !/^https?:\/\//i.test(href)) return;

        if (link.target === "_blank") {
            link.rel = "noopener noreferrer";
        }

        link.style.touchAction = "manipulation";
    });

    /* INICIALIZAÇÃO */

    updateDescriptionCounter();
    updateFormState();

    planCards.forEach((card) => {
        const name = card.dataset.plan;

        if (name && !Object.hasOwn(PLAN_PRICES, name)) {
            console.warn(`Plano sem preço configurado: ${name}`);
        }
    });

    console.info(
        "S7 Systems — JavaScript responsivo carregado."
    );
});
