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
        border: 1px solid var(--border);
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 18px 48px rgba(17, 17, 17, 0.06);
      }
      .hero { padding: 28px; }
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
      .panel { padding: 24px; }
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
      input,
      textarea {
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
        display: grid;
        gap: 8px;
      }
      .control label {
        font-size: 13px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .field,
      .select,
      .textarea {
        width: 100%;
        border: 1px solid var(--border);
        border-radius: 16px;
        background: #ffffff;
        color: var(--ink);
        padding: 14px 16px;
        outline: none;
      }
      .field:focus,
      .select:focus,
      .textarea:focus {
        border-color: #111111;
        box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.08);
      }
      .textarea {
        min-height: 132px;
        resize: vertical;
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
      .warning {
        padding: 14px 16px;
        border: 1px solid var(--border);
        border-radius: 18px;
        background: #111111;
        color: #ffffff;
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
        <span class="eyebrow">so-bridge</span>
        <h1>Current Bridge</h1>
        <p>Select one Bot Connection and one AI Assistant. The bridge updates when a new card is selected.</p>

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

      <section class="shell panel">
        <h2>Project Whitelist</h2>
        <p>Restricted mode requires a selected project. Open mode remains available when no specific project should be enforced.</p>

        <form id="directory-policy-form" class="stack">
          <div class="split">
            <div class="control">
              <label for="directory-mode-field">Mode</label>
              <select id="directory-mode-field" class="select" name="mode">
                <option value="open">Open</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
            <div class="control">
              <label for="selected-path-field">Selected Project</label>
              <select id="selected-path-field" class="select" name="selectedPath">
                <option value="">No selected project</option>
              </select>
            </div>
          </div>

          <div class="control">
            <label for="allowed-paths-field">Allowed Paths</label>
            <textarea id="allowed-paths-field" class="textarea" name="allowedPaths" placeholder="/repo/a&#10;/repo/b"></textarea>
          </div>

          <div class="warning" id="directory-warning">
            Open mode allows so-bridge to run without a selected project. Use it only when you want unrestricted behavior.
          </div>

          <button type="submit">Apply Project Whitelist</button>
        </form>
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
      const directoryForm = document.querySelector("#directory-policy-form");
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
      const directoryWarning = document.querySelector("#directory-warning");
      const botSubmitButton = document.querySelector("#bot-submit");
      const assistantSubmitButton = document.querySelector("#assistant-submit");

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

      function updateDirectoryWarning() {
        directoryWarning.textContent =
          directoryForm.mode.value === "open"
            ? "Open mode allows so-bridge to run without a selected project. Use it only when you want unrestricted behavior."
            : "Restricted mode requires both allowlist paths and a selected project before bridge activation.";
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

        directoryForm.mode.value = state.resources.directoryPolicy.mode;
        directoryForm.allowedPaths.value = state.resources.directoryPolicy.allowedPaths.join("\\n");
        directoryForm.selectedPath.innerHTML = ['<option value="">No selected project</option>']
          .concat(state.resources.directoryPolicy.allowedPaths.map((path) => '<option value="' + path + '">' + path + "</option>"))
          .join("");
        directoryForm.selectedPath.value = state.resources.directoryPolicy.selectedPath ?? "";

        botSubmitButton.textContent = state.editingBotId ? "Update Bot Connection" : "Add Bot Connection";
        assistantSubmitButton.textContent = state.editingAssistantId ? "Update AI Assistant" : "Add AI Assistant";
      }

      function loadBotIntoForm(botId) {
        const bot = state.resources?.botIntegrations.find((item) => item.id === botId);
        if (!bot) return;
        state.editingBotId = bot.id;
        botPlatformField.value = bot.platform;
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

      directoryForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        setMessage("Applying Project Whitelist...");
        const allowedPaths = directoryForm.allowedPaths.value
          .split("\\n")
          .map((value) => value.trim())
          .filter(Boolean);

        try {
          await submitJson("/api/admin/directory-policy", "PUT", {
            mode: directoryForm.mode.value,
            allowedPaths,
            selectedPath: directoryForm.selectedPath.value || null,
          });
          await loadState();
          setMessage("Project Whitelist applied.");
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

      directoryForm.mode.addEventListener("change", updateDirectoryWarning);

      updateBotCredentialLabels();
      updateAssistantFields();
      updateDirectoryWarning();
      void loadState().catch((error) => setMessage(error.message, true));
    </script>
  </body>
</html>`;
}
