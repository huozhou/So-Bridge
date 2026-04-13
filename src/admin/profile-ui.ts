export function renderProfileAdminPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>so-bridge</title>
    <style>
      :root {
        --bg: #ffffff;
        --surface: #f5f5f5;
        --panel: #ffffff;
        --ink: #111111;
        --muted: #6b7280;
        --border: #d4d4d8;
        --border-strong: #a1a1aa;
        --selected: #15803d;
        --selected-surface: #dcfce7;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "SF Pro Display", "Segoe UI", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top, rgba(17, 17, 17, 0.05), transparent 36%),
          linear-gradient(180deg, #ffffff 0%, #f7f7f7 100%);
      }
      main {
        max-width: 1120px;
        margin: 0 auto;
        padding: 40px 20px 64px;
      }
      h1, h2, p { margin: 0; }
      section + section { margin-top: 24px; }
      .shell {
        position: relative;
        overflow: visible;
        border: 1px solid var(--border);
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 18px 48px rgba(17, 17, 17, 0.06);
      }
      .hero { padding: 28px; }
      .hero-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }
      .eyebrow {
        display: inline-flex;
        align-items: center;
        padding: 6px 10px;
        border-radius: 999px;
        background: #111111;
        color: #ffffff;
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .hero h1 {
        margin-top: 16px;
        font-size: 34px;
        line-height: 1;
      }
      .hero p {
        margin-top: 12px;
        max-width: 720px;
        color: var(--muted);
        font-size: 15px;
        line-height: 1.6;
      }
      .bridge-shell {
        margin-top: 24px;
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .bridge-card,
      .bridge-node {
        min-height: 188px;
        padding: 22px;
        border: 1px solid var(--border);
        border-radius: 24px;
        background: var(--panel);
      }
      .bridge-node {
        border-color: var(--border-strong);
      }
      .bridge-card h2,
      .bridge-node h2 {
        font-size: 16px;
      }
      .bridge-label {
        margin-top: 20px;
        font-size: 13px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .bridge-value {
        display: block;
        margin-top: 8px;
        font-size: 24px;
        line-height: 1.2;
      }
      .bridge-note {
        display: block;
        margin-top: 8px;
        font-size: 14px;
        color: var(--muted);
      }
      .bridge-node .bridge-value {
        margin-top: 28px;
      }
      .status-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-top: 18px;
        padding: 9px 14px;
        border-radius: 999px;
        background: var(--surface);
        color: var(--muted);
        font-size: 13px;
      }
      .status-chip::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: var(--muted);
      }
      .status-chip.configured {
        background: var(--selected-surface);
        color: var(--selected);
      }
      .status-chip.configured::before {
        background: var(--selected);
      }
      .message {
        margin-top: 18px;
        min-height: 20px;
        color: var(--muted);
        font-size: 14px;
      }
      .message.error { color: #b91c1c; }
      .layout {
        display: grid;
        gap: 20px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .panel {
        padding: 24px;
        position: relative;
        overflow: visible;
      }
      .panel h2 { font-size: 22px; }
      .panel p {
        margin-top: 10px;
        color: var(--muted);
        line-height: 1.6;
      }
      .stack {
        display: grid;
        gap: 14px;
        margin-top: 20px;
      }
      .resource-list {
        display: grid;
        gap: 10px;
      }
      .resource-card {
        padding: 16px 18px;
        border: 1px solid var(--border);
        border-radius: 20px;
        background: var(--surface);
        cursor: pointer;
      }
      .resource-card.selected {
        border-color: var(--selected);
        box-shadow: inset 0 0 0 1px var(--selected);
      }
      .resource-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }
      .resource-card strong {
        display: block;
        font-size: 15px;
      }
      .resource-card span {
        display: block;
        margin-top: 6px;
        color: var(--muted);
        font-size: 14px;
      }
      .checkmark {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 999px;
        border: 1px solid var(--border);
        color: transparent;
        background: #ffffff;
        flex-shrink: 0;
      }
      .resource-card.selected .checkmark {
        border-color: var(--selected);
        background: var(--selected);
        color: #ffffff;
      }
      .card-actions {
        display: flex;
        gap: 10px;
        margin-top: 14px;
      }
      button,
      select,
      input {
        font: inherit;
      }
      button {
        border: 1px solid var(--ink);
        border-radius: 999px;
        padding: 12px 18px;
        background: #111111;
        color: #ffffff;
        cursor: pointer;
      }
      a.button-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--border);
        border-radius: 999px;
        padding: 12px 18px;
        background: #ffffff;
        color: var(--ink);
        cursor: pointer;
        text-decoration: none;
        white-space: nowrap;
      }
      button.secondary {
        background: #ffffff;
        color: var(--ink);
        border-color: var(--border);
      }
      button.mini {
        padding: 8px 12px;
        background: #ffffff;
        color: var(--ink);
        border-color: var(--border);
      }
      .control {
        position: relative;
        z-index: 0;
        display: grid;
        gap: 8px;
      }
      .control:focus-within {
        z-index: 8;
      }
      .control label {
        font-size: 13px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .field,
      .select {
        width: 100%;
        border: 1px solid var(--border);
        border-radius: 16px;
        background: #ffffff;
        color: var(--ink);
        padding: 14px 16px;
        outline: none;
      }
      .field:focus,
      .select:focus {
        border-color: #111111;
        box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.08);
      }
      .native-select {
        display: none;
      }
      .custom-select {
        position: relative;
      }
      .custom-select-trigger {
        display: inline-flex;
        align-items: center;
        width: 100%;
        justify-content: space-between;
        border-radius: 16px;
        border: 1px solid var(--border);
        background: #ffffff;
        color: var(--ink);
        padding: 14px 16px;
        line-height: 1.2;
      }
      .custom-select-trigger:focus {
        border-color: #111111;
        box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.08);
      }
      .custom-select-arrow {
        width: 10px;
        height: 10px;
        border-right: 1.5px solid #6b7280;
        border-bottom: 1.5px solid #6b7280;
        transform: rotate(45deg) translateY(-2px);
        flex-shrink: 0;
      }
      .custom-select.open .custom-select-arrow {
        transform: rotate(-135deg) translateX(-2px);
      }
      .custom-select-menu {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        right: 0;
        display: none;
        padding: 8px;
        border: 1px solid var(--border);
        border-radius: 18px;
        background: #ffffff;
        box-shadow: 0 18px 36px rgba(17, 17, 17, 0.12);
        z-index: 24;
      }
      .custom-select.open .custom-select-menu {
        display: grid;
        gap: 6px;
      }
      .custom-select-option {
        width: 100%;
        border: 0;
        border-radius: 12px;
        padding: 12px 14px;
        background: #ffffff;
        color: var(--ink);
        text-align: left;
      }
      .custom-select-option:hover,
      .custom-select-option.active {
        background: var(--surface);
      }
      .split {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .hint {
        font-size: 13px;
        color: var(--muted);
        line-height: 1.5;
      }
      .field-error {
        min-height: 18px;
        color: #b91c1c;
        font-size: 13px;
      }
      @media (max-width: 900px) {
        .bridge-shell,
        .layout,
        .split {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="shell hero">
        <div class="hero-header">
          <div>
            <span class="eyebrow">so-bridge</span>
            <h1>Current Bridge</h1>
            <p>Select one Bot Connection and one AI Assistant. The bridge updates when a new card is selected.</p>
          </div>
          <a class="button-link" href="/admin/settings">Settings</a>
        </div>

        <div class="bridge-shell">
          <article class="bridge-card">
            <h2>Bot Connection</h2>
            <div class="bridge-label">Selected Bot</div>
            <strong class="bridge-value" id="current-bot-label">Not configured</strong>
            <span class="bridge-note" id="current-bot-note">Add or select a Bot Connection below.</span>
          </article>

          <article class="bridge-node">
            <h2>so-bridge</h2>
            <strong class="bridge-value">Bridge</strong>
            <div class="status-chip incomplete" id="bridge-state">Incomplete</div>
          </article>

          <article class="bridge-card">
            <h2>AI Assistant</h2>
            <div class="bridge-label">Selected Assistant</div>
            <strong class="bridge-value" id="current-ai-label">Not configured</strong>
            <span class="bridge-note" id="current-ai-note">Add or select an AI Assistant below.</span>
          </article>
        </div>

        <div class="message" id="page-message"></div>
      </section>

      <section class="layout">
        <article class="shell panel">
          <h2>Bot Connection</h2>
          <p>Add, select, edit, or delete saved bot entries.</p>
          <div id="bot-integrations" class="stack resource-list"></div>
          <form id="bot-form" class="stack">
            <div class="split">
              <div class="control">
                <label for="bot-platform">Platform</label>
                <select id="bot-platform" class="select" name="platform">
                  <option value="slack">Slack</option>
                  <option value="lark">Lark (Feishu)</option>
                </select>
              </div>
            </div>

            <div class="split">
              <div class="control">
                <label for="bot-credential-primary">Bot Token</label>
                <input id="bot-credential-primary" class="field" name="credentialPrimary" />
                <div class="field-error" id="bot-primary-error"></div>
              </div>
              <div class="control">
                <label for="bot-credential-secondary">App Token</label>
                <input id="bot-credential-secondary" class="field" name="credentialSecondary" />
                <div class="field-error" id="bot-secondary-error"></div>
              </div>
            </div>

            <div class="hint" id="bot-hint">Slack uses Bot Token and App Token in socket mode.</div>
            <button type="submit" id="bot-submit">Add Bot Connection</button>
          </form>
        </article>

        <article class="shell panel">
          <h2>AI Assistant</h2>
          <p>Add, select, edit, or delete saved assistant entries.</p>
          <div id="ai-assistants" class="stack resource-list"></div>
          <form id="assistant-form" class="stack">
            <div class="control">
              <label for="assistant-provider">Assistant</label>
              <select id="assistant-provider" class="select" name="provider">
                <option value="codex-cli">Codex CLI</option>
                <option value="claude-code">Claude Code</option>
                <option value="cursor">Cursor</option>
                <option value="vscode-agent">VSCode Agent</option>
                <option value="cloud-sandbox">Cloud Sandbox</option>
              </select>
              <div class="field-error" id="assistant-provider-error"></div>
            </div>

            <div class="control" id="assistant-endpoint-control" hidden>
              <label for="assistant-endpoint">Endpoint</label>
              <input id="assistant-endpoint" class="field" name="endpoint" />
            </div>

            <div class="hint" id="assistant-hint">Codex CLI uses the default local installation.</div>
            <button type="submit" id="assistant-submit">Add AI Assistant</button>
          </form>
        </article>
      </section>

    </main>

    <script type="module">
      const state = {
        currentBridge: null,
        resources: null,
        selectedBotId: null,
        selectedAssistantId: null,
        editingBotId: null,
        editingAssistantId: null,
      };

      const botLabels = {
        slack: "Slack",
        lark: "Lark (Feishu)",
      };

      const assistantLabels = {
        "codex-cli": "Codex CLI",
        "claude-code": "Claude Code",
        cursor: "Cursor",
        "vscode-agent": "VSCode Agent",
        "cloud-sandbox": "Cloud Sandbox",
      };

      const currentBotLabel = document.querySelector("#current-bot-label");
      const currentBotNote = document.querySelector("#current-bot-note");
      const currentAiLabel = document.querySelector("#current-ai-label");
      const currentAiNote = document.querySelector("#current-ai-note");
      const bridgeState = document.querySelector("#bridge-state");
      const pageMessage = document.querySelector("#page-message");
      const botList = document.querySelector("#bot-integrations");
      const aiList = document.querySelector("#ai-assistants");
      const botForm = document.querySelector("#bot-form");
      const assistantForm = document.querySelector("#assistant-form");
      const botPlatformField = document.querySelector("#bot-platform");
      const botCredentialPrimaryField = document.querySelector("#bot-credential-primary");
      const botCredentialSecondaryField = document.querySelector("#bot-credential-secondary");
      const botCredentialPrimaryLabel = document.querySelector('label[for="bot-credential-primary"]');
      const botCredentialSecondaryLabel = document.querySelector('label[for="bot-credential-secondary"]');
      const botPrimaryError = document.querySelector("#bot-primary-error");
      const botSecondaryError = document.querySelector("#bot-secondary-error");
      const botHint = document.querySelector("#bot-hint");
      const assistantProviderField = document.querySelector("#assistant-provider");
      const assistantEndpointControl = document.querySelector("#assistant-endpoint-control");
      const assistantEndpointField = document.querySelector("#assistant-endpoint");
      const assistantProviderError = document.querySelector("#assistant-provider-error");
      const assistantHint = document.querySelector("#assistant-hint");
      const botSubmitButton = document.querySelector("#bot-submit");
      const assistantSubmitButton = document.querySelector("#assistant-submit");

      function closeCustomSelects() {
        document.querySelectorAll(".custom-select.open").forEach((item) => item.classList.remove("open"));
      }

      function syncCustomSelect(select) {
        select.dispatchEvent(new Event("so-bridge:sync-select"));
      }

      function initCustomSelect(select) {
        if (!select || select.dataset.customSelectReady === "true") {
          return;
        }

        select.dataset.customSelectReady = "true";
        select.classList.add("native-select");

        const shell = document.createElement("div");
        shell.className = "custom-select";

        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "custom-select-trigger";

        const label = document.createElement("span");
        const arrow = document.createElement("span");
        arrow.className = "custom-select-arrow";
        trigger.append(label, arrow);

        const menu = document.createElement("div");
        menu.className = "custom-select-menu";

        function renderMenu() {
          const current = select.value;
          const options = Array.from(select.options);
          const selectedOption = options.find((option) => option.value === current) ?? options[0] ?? null;
          label.textContent = selectedOption?.textContent ?? "";
          menu.innerHTML = options
            .map(
              (option) =>
                '<button type="button" class="custom-select-option' +
                (option.value === current ? " active" : "") +
                '" data-value="' +
                option.value.replaceAll('"', "&quot;") +
                '">' +
                option.textContent +
                "</button>",
            )
            .join("");
        }

        trigger.addEventListener("click", () => {
          const willOpen = !shell.classList.contains("open");
          closeCustomSelects();
          shell.classList.toggle("open", willOpen);
        });

        menu.addEventListener("click", (event) => {
          const option = event.target.closest("[data-value]");
          if (!option) {
            return;
          }
          select.value = option.getAttribute("data-value") ?? "";
          renderMenu();
          shell.classList.remove("open");
          select.dispatchEvent(new Event("change", { bubbles: true }));
        });

        select.addEventListener("so-bridge:sync-select", renderMenu);
        shell.append(trigger, menu);
        select.insertAdjacentElement("afterend", shell);
        renderMenu();
      }

      function setMessage(message, isError = false) {
        pageMessage.textContent = message ?? "";
        pageMessage.classList.toggle("error", Boolean(isError));
      }

      function clearBotErrors() {
        botPrimaryError.textContent = "";
        botSecondaryError.textContent = "";
      }

      function clearAssistantErrors() {
        assistantProviderError.textContent = "";
      }

      function getBotCompleteness(bot) {
        if (bot.platform === "slack") {
          return Boolean(bot.config.botToken) && Boolean(bot.config.appToken);
        }
        return Boolean(bot.config.appId) && Boolean(bot.config.appSecret);
      }

      function getAssistantCompleteness(assistant) {
        return Boolean(assistant.provider);
      }

      function validateBotForm() {
        clearBotErrors();
        if (botPlatformField.value === "slack") {
          if (!botCredentialPrimaryField.value.trim()) {
            botPrimaryError.textContent = "Bot Token is required.";
          }
          if (!botCredentialSecondaryField.value.trim()) {
            botSecondaryError.textContent = "App Token is required.";
          }
        } else {
          if (!botCredentialPrimaryField.value.trim()) {
            botPrimaryError.textContent = "App ID is required.";
          }
          if (!botCredentialSecondaryField.value.trim()) {
            botSecondaryError.textContent = "App Secret is required.";
          }
        }
        return !botPrimaryError.textContent && !botSecondaryError.textContent;
      }

      function validateAssistantForm() {
        clearAssistantErrors();
        if (!assistantProviderField.value) {
          assistantProviderError.textContent = "AI assistant provider is required.";
          return false;
        }
        return true;
      }

      function updateBotCredentialLabels() {
        if (botPlatformField.value === "lark") {
          botCredentialPrimaryLabel.textContent = "App ID";
          botCredentialSecondaryLabel.textContent = "App Secret";
          botHint.textContent = "Lark (Feishu) uses App ID and App Secret for socket access.";
          return;
        }
        botCredentialPrimaryLabel.textContent = "Bot Token";
        botCredentialSecondaryLabel.textContent = "App Token";
        botHint.textContent = "Slack uses Bot Token and App Token in socket mode.";
      }

      function updateAssistantFields() {
        const provider = assistantProviderField.value;
        assistantEndpointControl.hidden = !(provider === "vscode-agent" || provider === "cloud-sandbox");
        if (provider === "vscode-agent") {
          assistantHint.textContent = "VSCode Agent can use a local endpoint.";
        } else if (provider === "cloud-sandbox") {
          assistantHint.textContent = "Cloud Sandbox can use an API endpoint.";
        } else if (provider === "claude-code") {
          assistantHint.textContent = "Claude Code uses the local Claude installation.";
        } else if (provider === "cursor") {
          assistantHint.textContent = "Cursor uses the local Cursor assistant integration.";
        } else {
          assistantHint.textContent = "Codex CLI uses the default local installation.";
        }
      }

      function getSelectedBot() {
        return state.resources?.botIntegrations.find((item) => item.id === state.selectedBotId) ?? null;
      }

      function getSelectedAssistant() {
        return state.resources?.aiAssistants.find((item) => item.id === state.selectedAssistantId) ?? null;
      }

      function getCurrentProfile() {
        const bot = getSelectedBot();
        const assistant = getSelectedAssistant();
        if (!bot || !assistant || !state.resources) {
          return null;
        }
        const existing = state.resources.bridgeProfiles.find(
          (profile) => profile.botIntegrationId === bot.id && profile.aiAssistantId === assistant.id,
        );
        if (existing) {
          return existing;
        }
        return {
          id: null,
          name: "Current Connection",
          botIntegrationId: bot.id,
          aiAssistantId: assistant.id,
        };
      }

      function syncSelectionFromActiveProfile() {
        if (!state.resources || !state.currentBridge) {
          return;
        }
        const activeProfile =
          state.currentBridge.activeBridgeProfileId === null
            ? null
            : state.resources.bridgeProfiles.find((item) => item.id === state.currentBridge.activeBridgeProfileId) ?? null;
        if (!state.selectedBotId || !state.resources.botIntegrations.some((item) => item.id === state.selectedBotId)) {
          state.selectedBotId = activeProfile?.botIntegrationId ?? state.resources.botIntegrations[0]?.id ?? null;
        }
        if (!state.selectedAssistantId || !state.resources.aiAssistants.some((item) => item.id === state.selectedAssistantId)) {
          state.selectedAssistantId = activeProfile?.aiAssistantId ?? state.resources.aiAssistants[0]?.id ?? null;
        }
      }

      function renderCards(container, items, formatter) {
        container.innerHTML = items.map(formatter).join("");
      }

      function render() {
        if (!state.currentBridge || !state.resources) {
          return;
        }

        syncSelectionFromActiveProfile();
        const selectedBot = getSelectedBot();
        const selectedAssistant = getSelectedAssistant();
        const isConfigured = Boolean(
          selectedBot &&
          selectedAssistant &&
          getBotCompleteness(selectedBot) &&
          getAssistantCompleteness(selectedAssistant),
        );

        currentBotLabel.textContent = selectedBot ? botLabels[selectedBot.platform] : "Not configured";
        currentBotNote.textContent = selectedBot ? "" : "Add or select a Bot Connection below.";
        currentAiLabel.textContent = selectedAssistant ? assistantLabels[selectedAssistant.provider] : "Not configured";
        currentAiNote.textContent = selectedAssistant ? "" : "Add or select an AI Assistant below.";
        bridgeState.textContent = isConfigured ? "Configured" : "Incomplete";
        bridgeState.className = isConfigured ? "status-chip configured" : "status-chip incomplete";

        renderCards(
          botList,
          state.resources.botIntegrations,
          (bot) =>
            '<div class="resource-card' +
            (bot.id === state.selectedBotId ? " selected" : "") +
            '" data-select-bot="' +
            bot.id +
            '"><div class="resource-header"><div><strong>' +
            botLabels[bot.platform] +
            '</strong><span>' +
            (getBotCompleteness(bot) ? "Configured" : "Incomplete") +
            '</span></div><div class="checkmark">✓</div></div><div class="card-actions"><button class="mini secondary" type="button" data-edit-bot="' +
            bot.id +
            '">Edit</button><button class="mini secondary" type="button" data-delete-bot="' +
            bot.id +
            '">Delete</button></div></div>',
        );

        renderCards(
          aiList,
          state.resources.aiAssistants,
          (assistant) =>
            '<div class="resource-card' +
            (assistant.id === state.selectedAssistantId ? " selected" : "") +
            '" data-select-assistant="' +
            assistant.id +
            '"><div class="resource-header"><div><strong>' +
            assistantLabels[assistant.provider] +
            '</strong><span>' +
            (getAssistantCompleteness(assistant) ? "Configured" : "Incomplete") +
            '</span></div><div class="checkmark">✓</div></div><div class="card-actions"><button class="mini secondary" type="button" data-edit-assistant="' +
            assistant.id +
            '">Edit</button><button class="mini secondary" type="button" data-delete-assistant="' +
            assistant.id +
            '">Delete</button></div></div>',
        );

        botSubmitButton.textContent = state.editingBotId ? "Update Bot Connection" : "Add Bot Connection";
        assistantSubmitButton.textContent = state.editingAssistantId ? "Update AI Assistant" : "Add AI Assistant";
      }

      function loadBotIntoForm(botId) {
        const bot = state.resources?.botIntegrations.find((item) => item.id === botId);
        if (!bot) return;
        state.editingBotId = bot.id;
        botPlatformField.value = bot.platform;
        syncCustomSelect(botPlatformField);
        updateBotCredentialLabels();
        botCredentialPrimaryField.value = String(bot.platform === "slack" ? (bot.config.botToken ?? "") : (bot.config.appId ?? ""));
        botCredentialSecondaryField.value = String(bot.platform === "slack" ? (bot.config.appToken ?? "") : (bot.config.appSecret ?? ""));
        render();
      }

      function loadAssistantIntoForm(assistantId) {
        const assistant = state.resources?.aiAssistants.find((item) => item.id === assistantId);
        if (!assistant) return;
        state.editingAssistantId = assistant.id;
        assistantProviderField.value = assistant.provider;
        syncCustomSelect(assistantProviderField);
        updateAssistantFields();
        assistantEndpointField.value =
          assistant.provider === "vscode-agent"
            ? String(assistant.config.endpoint ?? "")
            : assistant.provider === "cloud-sandbox"
              ? String(assistant.config.apiUrl ?? "")
              : "";
        render();
      }

      async function submitJson(url, method, body) {
        const response = await fetch(url, {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const text = await response.text();
        if (!response.ok) {
          throw new Error(text || "Request failed");
        }
        return text ? JSON.parse(text) : null;
      }

      async function loadState() {
        const [currentBridge, resources] = await Promise.all([
          fetch("/api/admin/current-bridge").then((response) => response.json()),
          fetch("/api/admin/resources").then((response) => response.json()),
        ]);
        state.currentBridge = currentBridge;
        state.resources = resources;
        render();
      }

      async function applyCurrentSelection() {
        const currentProfile = getCurrentProfile();
        if (!currentProfile) {
          render();
          return;
        }
        if (currentProfile.id) {
          await submitJson("/api/admin/bridge-profiles/" + currentProfile.id + "/activate", "POST", {});
        } else {
          const createdProfiles = await submitJson("/api/admin/bridge-profiles", "POST", {
            name: currentProfile.name,
            botIntegrationId: currentProfile.botIntegrationId,
            aiAssistantId: currentProfile.aiAssistantId,
          });
          const createdProfile = createdProfiles.find(
            (profile) =>
              profile.botIntegrationId === currentProfile.botIntegrationId &&
              profile.aiAssistantId === currentProfile.aiAssistantId,
          );
          if (createdProfile) {
            await submitJson("/api/admin/bridge-profiles/" + createdProfile.id + "/activate", "POST", {});
          }
        }
        await loadState();
      }

      botForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!validateBotForm()) return;

        setMessage(state.editingBotId ? "Updating Bot Connection..." : "Adding Bot Connection...");
        const payload = {
          name: botLabels[botPlatformField.value],
          platform: botPlatformField.value,
          
          config:
            botPlatformField.value === "slack"
              ? { botToken: botCredentialPrimaryField.value, appToken: botCredentialSecondaryField.value }
              : { appId: botCredentialPrimaryField.value, appSecret: botCredentialSecondaryField.value },
        };

        try {
          const result = state.editingBotId
            ? await submitJson("/api/admin/bot-integrations/" + state.editingBotId, "PUT", payload)
            : await submitJson("/api/admin/bot-integrations", "POST", payload);
          state.selectedBotId = result.id;
          state.editingBotId = null;
          botForm.reset();
          botPlatformField.value = "slack";
          syncCustomSelect(botPlatformField);
          updateBotCredentialLabels();
          clearBotErrors();
          await loadState();
          await applyCurrentSelection();
          setMessage("Bot Connection saved.");
        } catch (error) {
          setMessage(error.message, true);
        }
      });

      assistantForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!validateAssistantForm()) return;

        setMessage(state.editingAssistantId ? "Updating AI Assistant..." : "Adding AI Assistant...");
        const provider = assistantProviderField.value;
        const payload = {
          name: assistantLabels[provider],
          provider,
          config:
            provider === "vscode-agent"
              ? { endpoint: assistantEndpointField.value }
              : provider === "cloud-sandbox"
                ? { apiUrl: assistantEndpointField.value }
                : provider === "codex-cli"
                  ? { skipGitRepoCheck: true }
                  : {},
        };

        try {
          const result = state.editingAssistantId
            ? await submitJson("/api/admin/ai-assistants/" + state.editingAssistantId, "PUT", payload)
            : await submitJson("/api/admin/ai-assistants", "POST", payload);
          state.selectedAssistantId = result.id;
          state.editingAssistantId = null;
          assistantForm.reset();
          assistantProviderField.value = "codex-cli";
          syncCustomSelect(assistantProviderField);
          assistantEndpointField.value = "";
          updateAssistantFields();
          clearAssistantErrors();
          await loadState();
          await applyCurrentSelection();
          setMessage("AI Assistant saved.");
        } catch (error) {
          setMessage(error.message, true);
        }
      });

      botList.addEventListener("click", async (event) => {
        const deleteButton = event.target.closest("[data-delete-bot]");
        if (deleteButton) {
          event.stopPropagation();
          try {
            await submitJson("/api/admin/bot-integrations/" + deleteButton.dataset.deleteBot, "DELETE", {});
            if (state.selectedBotId === deleteButton.dataset.deleteBot) {
              state.selectedBotId = null;
            }
            state.editingBotId = null;
            await loadState();
            await applyCurrentSelection();
            setMessage("");
          } catch (error) {
            setMessage(error.message, true);
          }
          return;
        }
        const editButton = event.target.closest("[data-edit-bot]");
        if (editButton) {
          event.stopPropagation();
          loadBotIntoForm(editButton.dataset.editBot);
          return;
        }
        const card = event.target.closest("[data-select-bot]");
        if (card) {
          state.selectedBotId = card.dataset.selectBot;
          try {
            await applyCurrentSelection();
          } catch (error) {
            setMessage(error.message, true);
          }
        }
      });

      aiList.addEventListener("click", async (event) => {
        const deleteButton = event.target.closest("[data-delete-assistant]");
        if (deleteButton) {
          event.stopPropagation();
          try {
            await submitJson("/api/admin/ai-assistants/" + deleteButton.dataset.deleteAssistant, "DELETE", {});
            if (state.selectedAssistantId === deleteButton.dataset.deleteAssistant) {
              state.selectedAssistantId = null;
            }
            state.editingAssistantId = null;
            await loadState();
            await applyCurrentSelection();
            setMessage("");
          } catch (error) {
            setMessage(error.message, true);
          }
          return;
        }
        const editButton = event.target.closest("[data-edit-assistant]");
        if (editButton) {
          event.stopPropagation();
          loadAssistantIntoForm(editButton.dataset.editAssistant);
          return;
        }
        const card = event.target.closest("[data-select-assistant]");
        if (card) {
          state.selectedAssistantId = card.dataset.selectAssistant;
          try {
            await applyCurrentSelection();
          } catch (error) {
            setMessage(error.message, true);
          }
        }
      });

      botPlatformField.addEventListener("change", () => {
        updateBotCredentialLabels();
        clearBotErrors();
      });

      assistantProviderField.addEventListener("change", () => {
        updateAssistantFields();
        clearAssistantErrors();
      });

      initCustomSelect(botPlatformField);
      initCustomSelect(assistantProviderField);
      updateBotCredentialLabels();
      updateAssistantFields();
      document.addEventListener("click", (event) => {
        if (!(event.target instanceof HTMLElement) || !event.target.closest(".custom-select")) {
          closeCustomSelects();
        }
      });
      void loadState().catch((error) => setMessage(error.message, true));
    </script>
  </body>
</html>`;
}

export function renderProjectAccessSettingsPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>so-bridge Settings</title>
    <style>
      :root {
        --bg: #ffffff;
        --surface: #f5f5f5;
        --panel: #ffffff;
        --ink: #111111;
        --muted: #6b7280;
        --border: #d4d4d8;
        --danger: #b91c1c;
        --active: #16a34a;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "SF Pro Display", "Segoe UI", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top, rgba(17, 17, 17, 0.05), transparent 36%),
          linear-gradient(180deg, #ffffff 0%, #f7f7f7 100%);
      }
      main {
        max-width: 860px;
        margin: 0 auto;
        padding: 40px 20px 64px;
      }
      .shell {
        position: relative;
        overflow: visible;
        border: 1px solid var(--border);
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 18px 48px rgba(17, 17, 17, 0.06);
      }
      .panel {
        padding: 28px;
      }
      .eyebrow {
        display: inline-flex;
        align-items: center;
        padding: 6px 10px;
        border-radius: 999px;
        background: #111111;
        color: #ffffff;
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1, h2, p { margin: 0; }
      h1 {
        margin-top: 16px;
        font-size: 34px;
        line-height: 1;
      }
      p {
        margin-top: 12px;
        color: var(--muted);
        line-height: 1.6;
      }
      .topbar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }
      .stack {
        display: grid;
        gap: 16px;
        margin-top: 24px;
      }
      .row {
        display: grid;
        gap: 12px;
        grid-template-columns: minmax(0, 1fr) auto;
      }
      .switch-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 18px;
        border: 1px solid var(--border);
        border-radius: 20px;
        background: #ffffff;
      }
      .switch-copy {
        display: grid;
        gap: 6px;
      }
      .switch-copy strong {
        font-size: 16px;
      }
      .switch-copy span {
        color: var(--muted);
        font-size: 14px;
        line-height: 1.5;
      }
      .switch {
        position: relative;
        width: 56px;
        height: 32px;
        flex-shrink: 0;
      }
      .switch input {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
      }
      .switch-track {
        position: absolute;
        inset: 0;
        border-radius: 999px;
        background: #d4d4d8;
        transition: background 120ms ease;
      }
      .switch-track::after {
        content: "";
        position: absolute;
        top: 4px;
        left: 4px;
        width: 24px;
        height: 24px;
        border-radius: 999px;
        background: #ffffff;
        box-shadow: 0 2px 6px rgba(17, 17, 17, 0.18);
        transition: transform 120ms ease;
      }
      .switch input:checked + .switch-track {
        background: var(--active);
      }
      .switch input:checked + .switch-track::after {
        transform: translateX(24px);
      }
      .control {
        position: relative;
        z-index: 0;
        display: grid;
        gap: 8px;
      }
      .control:focus-within {
        z-index: 8;
      }
      .control label {
        font-size: 13px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .field,
      button,
      a.button-link {
        font: inherit;
      }
      .field {
        width: 100%;
        border: 1px solid var(--border);
        border-radius: 16px;
        background: #ffffff;
        color: var(--ink);
        padding: 14px 16px;
        outline: none;
      }
      .field:focus {
        border-color: #111111;
        box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.08);
      }
      button,
      a.button-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #111111;
        border-radius: 999px;
        padding: 12px 18px;
        background: #111111;
        color: #ffffff;
        cursor: pointer;
        text-decoration: none;
      }
      button.secondary,
      a.button-link.secondary {
        border-color: var(--border);
        background: #ffffff;
        color: #111111;
      }
      .path-list {
        display: grid;
        gap: 10px;
      }
      .access-panel {
        display: grid;
        gap: 16px;
        padding: 18px;
        border: 1px solid var(--border);
        border-radius: 22px;
        background: #fafafa;
        transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
      }
      .access-panel.active {
        border-color: var(--active);
        background: #f7fff9;
        box-shadow: inset 0 0 0 1px rgba(22, 163, 74, 0.08);
      }
      .path-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 16px;
        border: 1px solid var(--border);
        border-radius: 18px;
        background: var(--surface);
      }
      .path-item strong {
        display: block;
        word-break: break-all;
      }
      .path-item.selected {
        border-color: var(--border-strong, #a1a1aa);
        background: var(--surface);
        box-shadow: inset 0 0 0 1px var(--border);
      }
      .actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
      }
      .path-copy {
        display: grid;
        gap: 6px;
      }
      .path-copy span {
        color: var(--muted);
        font-size: 13px;
      }
      .path-current {
        color: var(--muted) !important;
        font-weight: 600;
      }
      .icon-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        padding: 0;
        border-radius: 999px;
      }
      .icon-button.selected {
        border-color: #111111;
        background: #111111;
        color: #ffffff;
      }
      .hint {
        color: var(--muted);
        font-size: 14px;
      }
      .message {
        min-height: 20px;
        font-size: 14px;
        color: var(--muted);
      }
      .message.error {
        color: var(--danger);
      }
      @media (max-width: 700px) {
        .topbar,
        .path-item {
          flex-direction: column;
          align-items: stretch;
        }
        .row {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="shell panel">
        <div class="topbar">
          <div>
            <span class="eyebrow">so-bridge</span>
            <h1>Settings</h1>
            <p>Project Access limits which project paths the bridge may target.</p>
          </div>
          <a class="button-link secondary" href="/admin">Back</a>
        </div>

        <div class="stack">
          <div class="switch-row">
            <div class="switch-copy">
              <strong>Restrict Project Access</strong>
              <span id="settings-hint">The bridge may access any project path.</span>
            </div>
            <label class="switch" aria-label="Restrict Project Access">
              <input id="restrict-toggle" type="checkbox" />
              <span class="switch-track"></span>
            </label>
          </div>

          <div class="access-panel" id="access-panel">
            <div class="control">
              <label for="path-input">Allowed Path</label>
              <div class="row">
                <input id="path-input" class="field" placeholder="/path/to/project" />
                <button id="add-path" type="button">Add Path</button>
              </div>
            </div>
            <div class="path-list" id="path-list"></div>
          </div>
          <div class="message" id="settings-message"></div>
        </div>
      </section>
    </main>

    <script type="module">
      const restrictToggle = document.querySelector("#restrict-toggle");
      const pathInput = document.querySelector("#path-input");
      const addPathButton = document.querySelector("#add-path");
      const pathList = document.querySelector("#path-list");
      const accessPanel = document.querySelector("#access-panel");
      const message = document.querySelector("#settings-message");
      const hint = document.querySelector("#settings-hint");

      const state = {
        directoryPolicy: {
          mode: "open",
          allowedPaths: [],
          selectedPath: null,
        },
      };

      function setMessage(text, isError = false) {
        message.textContent = text ?? "";
        message.classList.toggle("error", Boolean(isError));
      }

      function render() {
        restrictToggle.checked = state.directoryPolicy.mode === "restricted";
        hint.textContent =
          state.directoryPolicy.mode === "restricted"
            ? "The bridge should only target the paths listed below."
            : "The bridge may access any project path.";
        accessPanel.classList.toggle("active", state.directoryPolicy.mode === "restricted");

        pathList.innerHTML = state.directoryPolicy.allowedPaths.length
          ? state.directoryPolicy.allowedPaths
              .map(
                (path) =>
                  '<div class="path-item' +
                  (state.directoryPolicy.selectedPath === path ? " selected" : "") +
                  '"><div class="path-copy"><strong>' +
                  escapeHtml(path) +
                  '</strong>' +
                  (state.directoryPolicy.selectedPath === path
                    ? '<span class="path-current">Current target project</span>'
                    : "") +
                  '</div><div class="actions"><button class="icon-button secondary' +
                  (state.directoryPolicy.selectedPath === path ? " selected" : "") +
                  '" type="button" aria-label="Select path" data-select-path="' +
                  escapeHtml(path) +
                  '">✓</button><button class="secondary" type="button" data-delete-path="' +
                  escapeHtml(path) +
                  '">Delete</button></div></div>',
              )
              .join("")
          : '<div class="hint">No allowed paths saved.</div>';
      }

      function escapeHtml(value) {
        return value
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;");
      }

      async function loadResources() {
        const response = await fetch("/api/admin/resources");
        if (!response.ok) {
          throw new Error("Failed to load admin resources");
        }
        const resources = await response.json();
        state.directoryPolicy = resources.directoryPolicy;
        render();
      }

      async function persistPolicy() {
        const response = await fetch("/api/admin/directory-policy", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state.directoryPolicy),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: "Failed to save project access" }));
          throw new Error(payload.error ?? "Failed to save project access");
        }

        state.directoryPolicy = await response.json();
        render();
      }

      async function addPath() {
        const value = pathInput.value.trim();
        if (!value) {
          setMessage("Path is required.", true);
          return;
        }
        if (!state.directoryPolicy.allowedPaths.includes(value)) {
          state.directoryPolicy.allowedPaths.push(value);
        }
        if (!state.directoryPolicy.selectedPath) {
          state.directoryPolicy.selectedPath = value;
        }
        try {
          await persistPolicy();
          pathInput.value = "";
          setMessage("Project Access updated.");
        } catch (error) {
          setMessage(error instanceof Error ? error.message : String(error), true);
        }
      }

      async function deletePath(path) {
        state.directoryPolicy.allowedPaths = state.directoryPolicy.allowedPaths.filter((item) => item !== path);
        if (state.directoryPolicy.selectedPath === path) {
          state.directoryPolicy.selectedPath = state.directoryPolicy.allowedPaths[0] ?? null;
        }
        try {
          await persistPolicy();
          setMessage("Project Access updated.");
        } catch (error) {
          setMessage(error instanceof Error ? error.message : String(error), true);
        }
      }

      async function toggleRestriction() {
        state.directoryPolicy.mode = restrictToggle.checked ? "restricted" : "open";
        if (state.directoryPolicy.mode === "restricted" && state.directoryPolicy.allowedPaths.length === 0) {
          restrictToggle.checked = false;
          state.directoryPolicy.mode = "open";
          setMessage("Add at least one allowed path before enabling restriction.", true);
          render();
          return;
        }
        try {
          await persistPolicy();
          setMessage("Project Access updated.");
        } catch (error) {
          setMessage(error instanceof Error ? error.message : String(error), true);
        }
      }

      async function selectPath(path) {
        state.directoryPolicy.selectedPath = path;
        try {
          await persistPolicy();
          setMessage("Project Access updated.");
        } catch (error) {
          setMessage(error instanceof Error ? error.message : String(error), true);
        }
      }

      addPathButton.addEventListener("click", () => {
        void addPath();
      });
      restrictToggle.addEventListener("change", () => {
        void toggleRestriction();
      });
      pathList.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }
        const selectButton = target.closest("[data-select-path]");
        const deleteButton = target.closest("[data-delete-path]");
        const selectedPathValue = selectButton?.getAttribute("data-select-path");
        const deletePathValue = deleteButton?.getAttribute("data-delete-path");
        if (selectedPathValue) {
          void selectPath(selectedPathValue);
          return;
        }
        if (deletePathValue) {
          void deletePath(deletePathValue);
        }
      });

      void loadResources().catch((error) => {
        setMessage(error instanceof Error ? error.message : String(error), true);
      });
    </script>
  </body>
</html>`;
}
