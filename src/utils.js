export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function list(value) {
  return Array.isArray(value) ? value : [];
}

export function unique(values = []) {
  return [...new Set(list(values).map((item) => String(item ?? "").trim()).filter(Boolean))];
}

export function splitTags(value = "") {
  return unique(String(value ?? "").split(/[、，,；;]/).map((item) => item.trim()));
}

export function renderEmptyState(message, hint = "") {
  return `<div class="empty-state">
    <p>${escapeHtml(message)}</p>
    ${hint ? `<p class="empty-state__hint">${escapeHtml(hint)}</p>` : ""}
  </div>`;
}

export function field(label, control, full = false) {
  return `<div class="field ${full ? "field--full" : ""}"><label>${escapeHtml(label)}</label>${control}</div>`;
}

export function inputField(label, action, fieldName, value, options = {}) {
  const type = options.type ?? "text";
  return field(
    label,
    `<input type="${type}" data-action="${action}" data-field="${fieldName}" value="${escapeHtml(value)}" />`,
    options.full
  );
}

export function textareaField(label, action, fieldName, value, options = {}) {
  return field(
    label,
    `<textarea data-action="${action}" data-field="${fieldName}" rows="${options.rows ?? 4}">${escapeHtml(value)}</textarea>`,
    options.full ?? true
  );
}

export function selectField(label, action, fieldName, value, choices, options = {}) {
  const items = choices
    .map(
      ([optionValue, optionLabel]) =>
        `<option value="${escapeHtml(optionValue)}" ${optionValue === value ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`
    )
    .join("");
  return field(
    label,
    `<select data-action="${action}" data-field="${fieldName}">${items}</select>`,
    options.full
  );
}

export function formatTime(value) {
  if (!value) return "未保存";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未保存";
  const now = new Date();
  const hhmm = date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  const todayStr = now.toLocaleDateString("zh-CN");
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = date.toLocaleDateString("zh-CN");
  if (dateStr === todayStr) return `今天 ${hhmm}`;
  if (dateStr === yesterday.toLocaleDateString("zh-CN")) return `昨天 ${hhmm}`;
  return `${date.getMonth() + 1}/${date.getDate()} ${hhmm}`;
}

export function isBrokenPlaceholderText(value = "") {
  const s = String(value || "").trim();
  if (/^\?+$/.test(s)) return true;
  if (/^待定/.test(s)) return true;
  if (s === "还没确定" || s === "待确认") return true;
  return false;
}
