
"use strict";

(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const STORAGE_KEY = "s7_crm_demo_v1";

  const state = {
    clients: [],
    projects: [],
    finance: []
  };

  const money = (value) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(value) || 0);

  const date = (value) => {
    if (!value) return "—";
    const parts = value.split("-");
    return parts.length === 3
      ? `${parts[2]}/${parts[1]}/${parts[0]}`
      : value;
  };

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  function notify(message, error = false) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.toggle("error", error);
    toast.classList.add("show");
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => toast.classList.remove("show"), 3000);
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      notify("Não foi possível salvar no navegador.", true);
    }
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      for (const key of Object.keys(state)) {
        state[key] = Array.isArray(saved[key]) ? saved[key] : [];
      }
    } catch {
      notify("Não foi possível carregar os dados locais.", true);
    }
  }

  function statusPill(status) {
    const labels = {
      ativo: "Ativo",
      prospecto: "Prospecto",
      inativo: "Inativo",
      pendente: "Pendente",
      pago: "Pago",
      cancelado: "Cancelado",
      em_andamento: "Em andamento",
      concluido: "Concluído"
    };

    const className =
      status === "pago" || status === "ativo" || status === "concluido"
        ? "success"
        : status === "cancelado" || status === "inativo"
          ? "danger"
          : "pending";

    return `<span class="status-pill ${className}">${escapeHTML(labels[status] || status)}</span>`;
  }

  function showPage(pageId) {
    const section = document.getElementById(pageId);
    if (!section || !section.classList.contains("page-section")) return;

    $$(".page-section").forEach((page) => {
      page.classList.toggle("hidden", page.id !== pageId);
    });

    $$(".nav-link").forEach((link) => {
      link.classList.toggle("active", link.dataset.page === pageId);
    });

    const titles = {
      inicio: "Visão geral",
      clientes: "Clientes",
      projetos: "Projetos e serviços",
      financeiro: "Financeiro",
      produtos: "Produtos e vendas"
    };

    $("#pageTitle").textContent = titles[pageId] || "CRM";
    $("#sidebar").classList.remove("open");
    history.replaceState(null, "", `#${pageId}`);
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;

    updateClientOptions();
    modal.classList.remove("hidden");

    const firstInput = modal.querySelector("input, select, textarea");
    firstInput?.focus();
  }

  function closeModal(modal) {
    modal.classList.add("hidden");
  }

  function updateClientOptions() {
    ["#projectClient", "#financeClient"].forEach((selector) => {
      const select = $(selector);
      if (!select) return;

      const previous = select.value;
      select.innerHTML =
        '<option value="">Sem cliente vinculado</option>' +
        state.clients.map((client) =>
          `<option value="${client.id}">${escapeHTML(client.nome)}</option>`
        ).join("");

      select.value = previous;
    });
  }

  function renderClients() {
    const query = ($("#clientSearch")?.value || "").trim().toLowerCase();
    const filter = $("#clientFilter")?.value || "todos";

    const clients = state.clients.filter((client) => {
      const matchesText = [
        client.nome, client.email, client.empresa, client.telefone
      ].some((value) => String(value || "").toLowerCase().includes(query));

      return matchesText && (filter === "todos" || client.status === filter);
    });

    $("#clientsTable").innerHTML = clients.map((client) => `
      <tr>
        <td><strong>${escapeHTML(client.nome)}</strong><br><small>${escapeHTML(client.empresa || "Pessoa física")}</small></td>
        <td>${escapeHTML(client.email || "—")}<br><small>${escapeHTML(client.telefone || "")}</small></td>
        <td>${client.tipo_contrato === "mensal" ? "Mensal" : "Avulso"}</td>
        <td>${money(client.valor_contrato)}</td>
        <td>${statusPill(client.status)}</td>
        <td><div class="row-actions">
          <button class="small-button" data-action="edit-client" data-id="${client.id}">Editar</button>
          <button class="small-button delete" data-action="delete-client" data-id="${client.id}">Excluir</button>
        </div></td>
      </tr>
    `).join("");

    $("#clientsEmpty").classList.toggle("hidden", clients.length > 0);
    $("#totalClients").textContent = state.clients.length;
    updateClientOptions();
    renderRecentClients();
  }

  function renderProjects() {
    $("#projectsTable").innerHTML = state.projects.map((project) => {
      const client = state.clients.find((item) => item.id === project.client_id);
      return `
        <tr>
          <td><strong>${escapeHTML(project.nome)}</strong></td>
          <td>${escapeHTML(client?.nome || "Sem vínculo")}</td>
          <td>${escapeHTML(project.categoria)}</td>
          <td>${money(project.valor)}</td>
          <td>${statusPill(project.status)}</td>
          <td><div class="row-actions">
            <button class="small-button" data-action="finish-project" data-id="${project.id}">Concluir</button>
            <button class="small-button delete" data-action="delete-project" data-id="${project.id}">Excluir</button>
          </div></td>
        </tr>`;
    }).join("");

    $("#projectsEmpty").classList.toggle("hidden", state.projects.length > 0);
    $("#totalProjects").textContent =
      state.projects.filter((project) => project.status === "em_andamento").length;
  }

  function renderFinance() {
    $("#financeTable").innerHTML = state.finance.map((item) => `
      <tr>
        <td><strong>${escapeHTML(item.descricao)}</strong></td>
        <td>${item.tipo === "receita" ? "Receita" : "Despesa"}</td>
        <td>${date(item.data_vencimento)}</td>
        <td>${money(item.valor)}</td>
        <td>${statusPill(item.status)}</td>
        <td><div class="row-actions">
          ${item.status !== "pago" && item.status !== "cancelado"
            ? `<button class="small-button" data-action="pay-finance" data-id="${item.id}">Marcar pago</button>`
            : ""}
          <button class="small-button delete" data-action="delete-finance" data-id="${item.id}">Excluir</button>
        </div></td>
      </tr>
    `).join("");

    $("#financeEmpty").classList.toggle("hidden", state.finance.length > 0);

    const paid = state.finance.filter((item) => item.status === "pago");
    const income = paid.filter((item) => item.tipo === "receita")
      .reduce((sum, item) => sum + Number(item.valor), 0);
    const expenses = paid.filter((item) => item.tipo === "despesa")
      .reduce((sum, item) => sum + Number(item.valor), 0);
    const pending = state.finance.filter((item) =>
      item.tipo === "receita" && item.status === "pendente"
    ).reduce((sum, item) => sum + Number(item.valor), 0);

    $("#totalRevenue").textContent = money(income);
    $("#totalPending").textContent = money(pending);
    $("#financeRevenue").textContent = money(income);
    $("#financeExpenses").textContent = money(expenses);
    $("#financeBalance").textContent = money(income - expenses);
    renderRecentTransactions();
  }

  function renderRecentClients() {
    const recent = [...state.clients].slice(-5).reverse();

    $("#recentClients").innerHTML = recent.length
      ? recent.map((client) => `
        <div class="panel-heading">
          <div><strong>${escapeHTML(client.nome)}</strong><br><small>${escapeHTML(client.empresa || client.email || "Cliente")}</small></div>
          ${statusPill(client.status)}
        </div>
      `).join("")
      : '<div class="empty-state"><span>◇</span><p>Nenhum cliente cadastrado.</p><small>Seus registros aparecerão aqui.</small></div>';
  }

  function renderRecentTransactions() {
    const recent = [...state.finance].slice(-5).reverse();

    $("#recentTransactions").innerHTML = recent.length
      ? recent.map((item) => `
        <div class="panel-heading">
          <div><strong>${escapeHTML(item.descricao)}</strong><br><small>${item.tipo === "receita" ? "Receita" : "Despesa"} · ${statusPill(item.status)}</small></div>
          <strong>${money(item.valor)}</strong>
        </div>
      `).join("")
      : '<div class="empty-state"><span>＄</span><p>Nenhuma transação registrada.</p><small>Seu resumo financeiro aparecerá aqui.</small></div>';
  }

  function renderAll() {
    renderClients();
    renderProjects();
    renderFinance();
  }

  $("#clientForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const dia = data.dia_vencimento ? Number(data.dia_vencimento) : null;

    if (dia !== null && (!Number.isInteger(dia) || dia < 1 || dia > 31)) {
      notify("Informe um dia de vencimento entre 1 e 31.", true);
      return;
    }

    state.clients.push({
      ...data,
      id: crypto.randomUUID(),
      valor_contrato: Number(data.valor_contrato),
      dia_vencimento: dia,
      created_at: new Date().toISOString()
    });

    save();
    renderAll();
    form.reset();
    closeModal($("#clientModal"));
    notify("Cliente adicionado nesta demonstração.");
  });

  $("#projectForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));

    state.projects.push({
      ...data,
      id: crypto.randomUUID(),
      client_id: data.client_id || null,
      valor: Number(data.valor),
      status: "em_andamento",
      created_at: new Date().toISOString()
    });

    save();
    renderAll();
    event.currentTarget.reset();
    closeModal($("#projectModal"));
    notify("Projeto adicionado nesta demonstração.");
  });

  $("#financeForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));

    state.finance.push({
      ...data,
      id: crypto.randomUUID(),
      client_id: data.client_id || null,
      valor: Number(data.valor),
      status: data.status,
      created_at: new Date().toISOString()
    });

    save();
    renderAll();
    event.currentTarget.reset();
    closeModal($("#financeModal"));
    notify("Lançamento adicionado nesta demonstração.");
  });

  document.addEventListener("click", (event) => {
    const pageButton = event.target.closest("[data-page]");
    if (pageButton) {
      showPage(pageButton.dataset.page);
      return;
    }

    const openButton = event.target.closest("[data-open]");
    if (openButton) {
      openModal(openButton.dataset.open);
      return;
    }

    const closeButton = event.target.closest("[data-close]");
    if (closeButton) {
      closeModal(closeButton.closest(".modal-backdrop"));
      return;
    }

    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;

    const { action, id } = actionButton.dataset;

    if (action === "delete-client") {
      if (!confirm("Excluir este cliente da demonstração?")) return;
      state.clients = state.clients.filter((item) => item.id !== id);
      state.projects.forEach((item) => {
        if (item.client_id === id) item.client_id = null;
      });
      state.finance.forEach((item) => {
        if (item.client_id === id) item.client_id = null;
      });
    }

    if (action === "edit-client") {
      const client = state.clients.find((item) => item.id === id);
      if (!client) return;

      const form = $("#clientForm");
      for (const [key, value] of Object.entries(client)) {
        if (form.elements[key]) form.elements[key].value = value ?? "";
      }

      form.dataset.editId = id;
      closeModal($("#clientModal"));
      openModal("clientModal");
      return;
    }

    if (action === "delete-project") {
      if (!confirm("Excluir este projeto da demonstração?")) return;
      state.projects = state.projects.filter((item) => item.id !== id);
    }

    if (action === "finish-project") {
      const project = state.projects.find((item) => item.id === id);
      if (project) project.status = "concluido";
    }

    if (action === "delete-finance") {
      if (!confirm("Excluir este lançamento da demonstração?")) return;
      state.finance = state.finance.filter((item) => item.id !== id);
    }

    if (action === "pay-finance") {
      const item = state.finance.find((entry) => entry.id === id);
      if (item) item.status = "pago";
    }

    save();
    renderAll();
  });

  $("#clientForm").addEventListener("reset", () => {
    delete $("#clientForm").dataset.editId;
  });

  // A navegação inicial pode abrir qualquer seção pelo hash.
  $("#menuButton").addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
  });

  $("#clientSearch").addEventListener("input", renderClients);
  $("#clientFilter").addEventListener("change", renderClients);

  $$(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) closeModal(backdrop);
    });
  });

  $("#logoutButton").addEventListener("click", () => {
    notify("O login real será conectado na etapa de autenticação.");
  });

  load();

  // Corrige a edição para salvar no mesmo registro, sem duplicar.
  const originalClientSubmit = $("#clientForm");
  originalClientSubmit.addEventListener("submit", (event) => {
    const id = originalClientSubmit.dataset.editId;
    if (!id) return;

    event.preventDefault();

    const data = Object.fromEntries(new FormData(originalClientSubmit));
    const dia = data.dia_vencimento ? Number(data.dia_vencimento) : null;
    if (dia !== null && (!Number.isInteger(dia) || dia < 1 || dia > 31)) {
      notify("Dia de vencimento inválido.", true);
      return;
    }

    state.clients = state.clients.map((client) =>
      client.id === id
        ? { ...client, ...data, valor_contrato: Number(data.valor_contrato), dia_vencimento: dia }
        : client
    );

    delete originalClientSubmit.dataset.editId;
    save();
    renderAll();
    originalClientSubmit.reset();
    closeModal($("#clientModal"));
    notify("Cliente atualizado nesta demonstração.");
  });

  renderAll();
  showPage(["inicio", "clientes", "projetos", "financeiro", "produtos"].includes(location.hash.slice(1))
    ? location.hash.slice(1)
    : "inicio");
})();
