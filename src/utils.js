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
  if (!value) {
    return "未保存";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "未保存" : date.toLocaleString("zh-CN");
}

export function isBrokenPlaceholderText(value = "") {
  return /^\?+$/.test(String(value || "").trim());
}
