// 共用工具：场景头格式化、字数估算
export function sceneHead(intExt, location, time) {
  return `${intExt}. ${location} - ${time}`;
}

export function lines(...rows) {
  return rows.filter(Boolean).join('\n');
}

export function dialogue(name, paren, text) {
  if (paren) return `${name}\n（${paren}）\n${text}`;
  return `${name}\n${text}`;
}

export function countZh(s) {
  return (s || '').replace(/\s/g, '').length;
}

// 按一定序列从素材池循环取值（每次取 k 个），用于让每集每场之间动作/神态不重复
export function pick(arr, idx) {
  return arr[idx % arr.length];
}

export function pickN(arr, startIdx, n) {
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(arr[(startIdx + i) % arr.length]);
  return out;
}
