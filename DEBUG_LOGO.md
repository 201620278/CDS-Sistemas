# Debug - Erro ao Enviar Logo

## Como identificar o erro exato:

### 1. **No Terminal (Backend)**
Quando você tentar fazer upload da logo, olhe no console/terminal onde o servidor está rodando. Você verá mensagens como:

```
[LOGO] Arquivo recebido: logo_1234567890.png Tamanho: 125000
[LOGO] Logo salva com sucesso: /storage/logos/logo_1234567890.png
```

Ou em caso de erro:
```
[LOGO] Erro ao atualizar DB: Error: database is locked
[LOGO] Erro multer: File too large
```

### 2. **No Browser (Console - F12)**
Abra o DevTools (F12) → Console e procure por mensagens de erro.

## Possíveis causas e soluções:

### ❌ Erro 500 genérico
**Causa:** Arquivo muito grande, tipo inválido, ou banco de dados em uso

**Solução:**
- Tente uma imagem PNG pequena (<1MB)
- Verifique se nenhum outro processo está usando o banco de dados
- Reinicie o servidor: `npm start` (após parar com Ctrl+C)

### ❌ Erro 413 (Arquivo muito grande)
**Causa:** Arquivo excede 5MB

**Solução:**
- Use uma imagem menor
- Comprima a imagem antes

### ❌ Erro 415 (Tipo de arquivo inválido)
**Causa:** Arquivo não é imagem

**Solução:**
- Use apenas: PNG, JPG, JPEG, GIF ou SVG
- Verifique a extensão do arquivo

### ❌ "Arquivo não enviado"
**Causa:** Nenhum arquivo foi selecionado

**Solução:**
- Clique em "Escolher Arquivo" e selecione uma imagem

## Como testar com cURL (CMD/PowerShell):

```powershell
# Pegue o token do browser (F12 → Console):
# localStorage.getItem('token')

# Depois execute:
$token = "SEU_TOKEN_AQUI"
curl -X POST http://localhost:3000/api/configuracoes/upload-logo `
  -H "Authorization: Bearer $token" `
  -F "logo=@C:\caminho\para\logo.png"
```

## Checklist para diagnosticar:

- [ ] Verifique o terminal do backend enquanto faz upload
- [ ] Copie a mensagem de erro exato (com [LOGO] prefix)
- [ ] Verifique F12 → Console no browser
- [ ] Confirme que a pasta `storage/logos/` existe
- [ ] Verifique se a imagem tem permissão de leitura
- [ ] Reinicie o servidor e tente novamente

## Se o problema persistir:

Execute este comando para verificar permissões:

```powershell
Get-Item C:\projetos\MercantilFiscal\storage\logos
```

Se a pasta não existir, crie:

```powershell
New-Item -ItemType Directory -Path C:\projetos\MercantilFiscal\storage\logos -Force
```
