export function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

export function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    // 必须先收集 Buffer 再整体解码：`raw += chunk` 会把每个 chunk 单独 toString，
    // HTTP chunk 边界切断多字节 UTF-8 字符时产生 U+FFFD（�），曾持续损坏所有项目文档
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      chunks.push(chunk);
      size += chunk.length;
      if (size > 2_000_000) {
        reject(new Error("请求体过大"));
        request.destroy();
        return;
      }
    });
    request.on("end", () => {
      if (size === 0) {
        resolve({});
        return;
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("JSON 解析失败"));
      }
    });
    request.on("error", reject);
  });
}

export function decodeSegment(value) {
  return decodeURIComponent(value);
}
