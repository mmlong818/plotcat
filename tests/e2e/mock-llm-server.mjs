// 多协议 LLM mock：OpenAI 兼容 + Anthropic Messages + Gemini generateContent
import http from 'node:http';
const reply = (tag) => '```json\n' + JSON.stringify({ seeds: [{ title: tag + "种子", concept: "来自 " + tag + " mock 的概念", emotional_core: "核", conflict_engine: "擎" }], reasoning: tag }) + '\n```';

http.createServer((req, res) => {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    const parsed = body ? JSON.parse(body) : {};
    // Anthropic Messages
    if (req.url === '/v1/messages') {
      const text = reply('anthropic');
      if (parsed.stream) {
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        for (let i = 0; i < text.length; i += 5) {
          res.write(`data: ${JSON.stringify({ type: "content_block_delta", delta: { text: text.slice(i, i + 5) } })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ type: "message_stop" })}\n\n`);
        res.end();
      } else {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ content: [{ type: "text", text }] }));
      }
      return;
    }
    // Gemini generateContent
    if (/\/v1beta\/models\/.+:generateContent/.test(req.url)) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: reply('gemini') }] } }] }));
      return;
    }
    // Anthropic 模型列表
    if (req.url.startsWith('/v1/models')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: [{ id: "claude-sonnet-4-6", display_name: "Claude Sonnet 4.6" }, { id: "claude-haiku-4-5-20251001", display_name: "Claude Haiku 4.5" }] }));
      return;
    }
    // OpenAI 兼容 chat/completions
    if (req.url.endsWith('/chat/completions')) {
      const text = reply('openai兼容');
      if (parsed.stream) {
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        for (let i = 0; i < text.length; i += 7) {
          res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text.slice(i, i + 7) } }] })}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ choices: [{ message: { content: text } }] }));
      }
      return;
    }
    res.writeHead(404); res.end('{}');
  });
}).listen(4399, () => console.log('mock-llm up on 4399'));
