# TikTok Upload - Critical Debug Logging v2

## 🔍 Problema Identificado

O erro está no `initializeUpload()` - TikTok está rejeitando o request ao init endpoint.

**Logs mostram:**
```
📤 Initializing video upload
❌ Failed to initialize upload
```

## ✅ Solução Implementada

Adicionado **logging crítico super detalhado** para capturar:
- ✅ Request exato enviado para TikTok
- ✅ Status HTTP da resposta
- ✅ Headers da resposta
- ✅ Corpo completo do erro
- ✅ Payload do request original

## 📋 Arquivos Modificados

### src/modules/video/services/video.service.ts

**Nova logging no initializeUpload():**
```
🌐 Sending init request to TikTok API
  - URL: https://...
  - Payload: {source_info: {...}}

📡 Init response received
  - Status: 200/400/etc
  - Response data: {...}

❌ TikTok API Error Response (se falhar)
  - Status: X
  - Error data: {...}
  - Request details: {...}
```

## 🚀 Como Fazer Deploy

### 1. EasyPanel - File Manager
- Delete `/app` conteúdo antigo
- Copie arquivos do ZIP

### 2. EasyPanel - Terminal
```bash
npm run build
npm run start
```

### 3. Teste Upload
- Abra: https://vid.relampagodeofertas.shop/dashboard.html
- Teste com vídeo MP4 pequeno

### 4. Verifique Logs
**IMPORTANTE:** Veja o terminal do EasyPanel durante o upload:

```
📤 Initializing video upload
  fileSize: X.XXmB
  chunkSize: 5.00MB

🌐 Sending init request to TikTok API
  url: https://api.tiktok.com/v2/post/publish/video/init/
  payload: {...}

❌ TikTok API Error Response  ← AQUI ESTÁ O ERRO!
  status: 400/401/403
  data: {error: "...", message: "..."}
```

## 📸 O Que Procurar nos Logs

Se o upload falhar, procure por:

1. **"TikTok API Error Response"** - Este é o erro exato!
2. **"status"** - Código HTTP (400, 401, 403, etc)
3. **"data"** - Mensagem exata do TikTok API
4. **"requestPayload"** - O que enviamos

Exemplo de erro esperado:
```
❌ TikTok API Error Response
  status: 400
  data: {"error": {...}, "message": "..."}
```

## 💡 Possíveis Problemas

### 1. Erro 401 - Unauthorized
- Token expirou
- Solução: Faça logout e login novamente

### 2. Erro 403 - Forbidden  
- App não tem permissão
- Solução: Verifique TikTok Developer Console

### 3. Erro 400 - Bad Request
- Payload inválido
- Solução: Verifique `requestPayload` nos logs

### 4. Erro 500 - Server Error
- TikTok API está down
- Solução: Espere e tente mais tarde

## ✨ Versão

v4.3 - Critical Debug Logging
Date: 2026-08-11

## 🎯 Próximo Passo

1. **Deploy este ZIP**
2. **Teste upload**
3. **Compartilhe os LOGS COMPLETOS** do terminal EasyPanel
4. Com os logs, identificaremos exatamente o que está errado

---

**Com estes logs, vamos resolver o problema! 🚀**
