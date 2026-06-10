// 最小 OpenAI 兼容 mock：流式返回一段 JSON 文本
import http from 'node:http';
const reply = JSON.stringify({ loglines: [{ title: "mock方案", hook: "一个来自本地mock端点的钩子", external_conflict: "外", internal_conflict: "内", twist_potential: "转", comparable: "对标" }], reasoning: "mock" });
http.createServer((req, res) => {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    const parsed = JSON.parse(body || '{}');
    if (parsed.stream) {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      // 故意按多字节边界切块，验证 SSE 解码
      const text = '```json\n' + reply + '\n```';
      for (let i = 0; i < text.length; i += 7) {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text.slice(i, i + 7) } }] })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: '```json\n' + reply + '\n```' } }] }));
    }
  });
}).listen(4399, () => console.log('mock up on 4399'));
