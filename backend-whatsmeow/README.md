# WhatsApp API - whatsmeow (Go)

Backend REST API para WhatsApp usando [whatsmeow](https://github.com/tulir/whatsmeow).

## Instalação no Servidor

### Opção 1: Docker (recomendado)

```bash
cd backend-whatsmeow
docker-compose up -d
```

### Opção 2: Manual

```bash
# Instalar Go 1.21+
# Ubuntu/Debian:
sudo apt update && sudo apt install -y golang-go gcc

# Compilar e rodar
cd backend-whatsmeow
go mod tidy
go build -o whatsmeow-api .
./whatsmeow-api
```

## Configuração

| Variável   | Padrão | Descrição              |
|-----------|--------|------------------------|
| API_PORT  | 3000   | Porta da API REST      |

## Endpoints Disponíveis

### Sessão
- `GET  /api/qrcode` - Gerar QR Code para login
- `GET  /api/status` - Status da conexão
- `POST /api/disconnect` - Desconectar
- `POST /api/reconnect` - Reconectar

### Mensagens
- `POST /api/send/text` - Enviar texto
- `POST /api/send/image` - Enviar imagem
- `POST /api/send/document` - Enviar documento
- `POST /api/send/audio` - Enviar áudio
- `POST /api/send/video` - Enviar vídeo
- `POST /api/send/location` - Enviar localização
- `POST /api/send/reaction` - Enviar reação
- `POST /api/send/contact` - Enviar contato

### Chats & Contatos
- `GET  /api/chats` - Listar chats
- `GET  /api/messages/{jid}` - Mensagens de um chat
- `GET  /api/contacts` - Listar contatos
- `GET  /api/contacts/{jid}` - Info de contato
- `POST /api/check-number` - Verificar número

### Grupos
- `GET  /api/groups` - Listar grupos
- `GET  /api/groups/{jid}` - Info do grupo

### Outros
- `POST /api/mark-read` - Marcar como lido
- `POST /api/messages/delete` - Deletar mensagem
- `GET  /api/profile-pic/{jid}` - Foto de perfil
- `POST /api/presence` - Definir presença
- `GET/POST /api/webhook` - Configurar webhook

## Uso com o Frontend

No painel frontend, vá em **Conexão** e configure a URL:
```
http://SEU-IP:3000
```

Depois clique em "Gerar QR Code" para conectar seu WhatsApp.
