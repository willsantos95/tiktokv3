# TikTok Video Upload - Debug & Enhanced Logging

## Correções Implementadas

### 1. CSP Configuration Fix (src/server.ts)
- ✅ Permite `data:` URLs para preview de vídeo
- ✅ Fix para "media blocked by CSP"
- ✅ Video preview agora aparece na modal

### 2. Enhanced Logging (src/modules/video/services/video.service.ts)
- ✅ Logs detalhados de upload para TikTok API
- ✅ Logs de request/response do finalize
- ✅ Informações de buffer size e headers
- ✅ Ajuda a identificar "video info is empty" erro

## Como Fazer Deploy

### Via EasyPanel (Recomendado)

1. **Extraia o ZIP**
   ```bash
   unzip tiktok-app-upload-debug.zip
   cd tiktok-app-upload-debug
   ```

2. **Acesse EasyPanel → File Manager**
   - Vá para `/app`
   - Delete o conteúdo antigo
   - Copie os arquivos do ZIP

3. **Reinicie no Terminal EasyPanel**
   ```bash
   npm run build
   npm run start
   ```

4. **Recarregue no navegador**
   ```
   https://vid.relampagodeofertas.shop/dashboard.html
   ```

## Como Testar o Upload

### Passo 1: Teste com Vídeo Pequeno
- Abra dashboard
- Selecione MP4 < 5MB
- Adicione título e hashtags
- Clique "Review & Publish"

### Passo 2: Verifique os Logs
- **No Navegador (F12)**
  - Console → Procure por erro
  - Network → POST /api/v1/video/publish
  - Response → Veja mensagem de erro do TikTok

- **No EasyPanel Terminal**
  - Veja logs do servidor em tempo real
  - Procure por: "🌐 Sending video chunk to TikTok API"
  - Procure por: "🌐 Sending finalize request to TikTok API"
  - Procure por: "Finalize response received"

### Passo 3: Compartilhe Informações
Se o upload falhar:

1. **Erro no Console do Navegador:**
   ```
   POST https://vid.relampagodeofertas.shop/api/v1/video/publish 400
   Response: {error object}
   ```

2. **Logs do EasyPanel Terminal:**
   ```
   📤 Uploading video chunk
   ✅ Video chunk uploaded successfully
   🌐 Sending finalize request
   📡 Finalize response received
   ```

## Arquivos Modificados

### src/server.ts
```typescript
// Helmet CSP configuration para permitir data: URLs
mediaSrc: ["'self'", 'data:'],
```

### src/modules/video/services/video.service.ts
```typescript
// Logging detalhado:
logger.info('🌐 Sending video chunk to TikTok API', {...});
logger.info('✅ Video chunk uploaded successfully', {...});
logger.info('🌐 Sending finalize request to TikTok API', {...});
logger.info('📡 Finalize response received', {...});
```

## Variáveis de Ambiente Necessárias

```bash
NODE_ENV=production
APP_URL=https://vid.relampagodeofertas.shop
CORS_ORIGIN=https://vid.relampagodeofertas.shop
TIKTOK_CLIENT_KEY=sbawom3osgvtdcjh12
TIKTOK_CLIENT_SECRET=JC19bDo5UrBFpti0xLyIyXCxP5PHkYSM
TIKTOK_REDIRECT_URI=https://vid.relampagodeofertas.shop/api/v1/auth/callback
SESSION_SECRET=your_secret_here
```

## Próximas Etapas

1. **Deploy no EasyPanel** com este ZIP
2. **Teste o upload** com vídeo pequeno
3. **Verifique os logs** no terminal EasyPanel
4. **Compartilhe os logs** se falhar
5. Com os logs, podemos identificar exatamente o que TikTok está rejeitando

## Dúvidas Comuns

**P: Vídeo preview ainda não aparece?**
- Limpe cache do navegador (Ctrl+F5)
- Verifique console para erros de CSP

**P: Upload ainda falha com "video info is empty"?**
- Verifique logs no EasyPanel terminal
- Procure por "Finalize response received"
- TikTok deve retornar detalhes do erro naquele log

**P: Como reiniciar o servidor?**
- EasyPanel → Seu Container → Terminal
- `npm run start`

## Version

v4.2 - Enhanced Logging + CSP Fix
Date: 2026-08-11
