# TikTok Upload - Ultra-Detailed Debug Logging

## 🔴 Problema
Logging não está mostrando detalhes do erro TikTok.

## ✅ Solução
Adicionado logging AGRESSIVO em TODOS os níveis:
- console.error - Imediatamente visível
- logger.error - Logs do servidor
- Capture de payload, status, headers, data completa

## 🚀 Deploy

### EasyPanel - File Manager
```
Copy src/ files para /app/src
Copy dist/ para /app/dist
Copy public/ para /app/public
```

### EasyPanel - Terminal
```bash
npm run build
npm run start
```

## 🧪 Teste Upload

1. Selecione vídeo MP4
2. Clique "Review & Publish"
3. **Verifique DOIS locais de logs:**

### Local 1: Terminal EasyPanel
```
DEBUG: Init payload: {...}
DEBUG: API URL: https://api.tiktok.com/...
DEBUG: Auth header: Bearer ...
DEBUG: Response status: 400
DEBUG: Response data: {...}
DEBUG: Log data: {
  status: 400,
  code: "...",
  description: "..."
}
```

### Local 2: Browser Console (F12)
```
❌ Publish error response: Object
```

## 📋 O Que Esperar

**Se tudo funcionar:**
```
✅ Upload token received
```

**Se falhar (esperado):**
```
DEBUG: Response status: 400/401/403
DEBUG: Response data: {error: {...}}
❌ TikTok API Error Response
  status: XXX
  code: "..."
  description: "..."
```

## 🎯 Próximo Passo

1. Deploy este ZIP
2. Rebuild: `npm run build`
3. Restart: `npm run start`
4. Teste upload
5. **Compartilhe os logs COMPLETOS do terminal**

Com o output completo, vou ver EXATAMENTE o que TikTok está retornando!

---

v4.5 - Ultra-Detailed Debug Logging
