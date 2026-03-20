#!/bin/bash
# ══════════════════════════════════════════════════════════════
#  WhatsPanel - Instalação Completa (Frontend + Backend)
#  Execute: sudo bash install.sh
#  Compatível com Ubuntu 20.04+ / Debian 11+
# ══════════════════════════════════════════════════════════════

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

print_banner() {
  echo -e "${CYAN}"
  echo "╔══════════════════════════════════════════════════╗"
  echo "║                                                  ║"
  echo "║     ██╗    ██╗██████╗  █████╗ ███╗   ██╗        ║"
  echo "║     ██║    ██║██╔══██╗██╔══██╗████╗  ██║        ║"
  echo "║     ██║ █╗ ██║██████╔╝███████║██╔██╗ ██║        ║"
  echo "║     ██║███╗██║██╔═══╝ ██╔══██║██║╚██╗██║        ║"
  echo "║     ╚███╔███╔╝██║     ██║  ██║██║ ╚████║        ║"
  echo "║      ╚══╝╚══╝ ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝        ║"
  echo "║                                                  ║"
  echo "║       WhatsPanel - Instalação Completa           ║"
  echo "║       Frontend + Backend + Auto QR Code          ║"
  echo "║                                                  ║"
  echo "╚══════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

print_step() {
  echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  $1${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_banner

# Detectar IP do servidor
SERVER_IP=$(hostname -I | awk '{print $1}')

# ══════════════════════════════════════════════════
#  ETAPA 1: Coletar dados de configuração
# ══════════════════════════════════════════════════
print_step "📋 ETAPA 1/7 - Configuração Inicial"

read -p "🌐 Domínio ou IP do servidor [$SERVER_IP]: " DOMAIN
DOMAIN=${DOMAIN:-$SERVER_IP}

read -p "🔌 Porta do backend API [8080]: " API_PORT
API_PORT=${API_PORT:-8080}

read -p "🖥️  Porta do frontend [80]: " FRONTEND_PORT
FRONTEND_PORT=${FRONTEND_PORT:-80}

echo ""
echo -e "${YELLOW}══════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  🔐 Configuração do Admin Master${NC}"
echo -e "${YELLOW}══════════════════════════════════════════════${NC}"
echo ""
echo "O Admin Master é a conta principal que gerencia"
echo "todas as empresas, planos e usuários do sistema."
echo ""

read -p "📧 E-mail do admin master [admin@whatspanel.com]: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@whatspanel.com}

read -sp "🔑 Senha do admin master [admin123]: " ADMIN_PASS
ADMIN_PASS=${ADMIN_PASS:-admin123}
echo ""

read -p "👤 Nome do admin master [Master Admin]: " ADMIN_NAME
ADMIN_NAME=${ADMIN_NAME:-Master Admin}

# Diretório base
INSTALL_DIR="/opt/whatspanel"
BACKEND_DIR="$INSTALL_DIR/backend"
FRONTEND_DIR="$INSTALL_DIR/frontend"

# ══════════════════════════════════════════════════
#  ETAPA 2: Instalar dependências do sistema
# ══════════════════════════════════════════════════
print_step "📦 ETAPA 2/7 - Instalando Dependências do Sistema"

sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20 LTS
if ! command -v node &> /dev/null; then
  echo "📥 Instalando Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
else
  echo "✅ Node.js já instalado: $(node -v)"
fi

# Instalar Go 1.21+
if ! command -v go &> /dev/null || [[ $(go version | grep -oP '\d+\.\d+' | head -1) < "1.21" ]]; then
  echo "📥 Instalando Go 1.21..."
  wget -q https://go.dev/dl/go1.21.13.linux-amd64.tar.gz -O /tmp/go.tar.gz
  sudo rm -rf /usr/local/go
  sudo tar -C /usr/local -xzf /tmp/go.tar.gz
  rm /tmp/go.tar.gz
  export PATH=$PATH:/usr/local/go/bin
  echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
else
  echo "✅ Go já instalado: $(go version)"
fi

# Demais dependências
sudo apt install -y gcc sqlite3 nginx certbot python3-certbot-nginx

echo -e "${GREEN}✅ Dependências instaladas com sucesso!${NC}"

# ══════════════════════════════════════════════════
#  ETAPA 3: Criar estrutura de diretórios
# ══════════════════════════════════════════════════
print_step "📁 ETAPA 3/7 - Criando Estrutura de Diretórios"

sudo mkdir -p "$BACKEND_DIR" "$FRONTEND_DIR"
echo "✅ Diretórios criados em $INSTALL_DIR"

# ══════════════════════════════════════════════════
#  ETAPA 4: Build do Frontend (React + Vite)
# ══════════════════════════════════════════════════
print_step "🖥️  ETAPA 4/7 - Compilando Frontend"

# Copiar código do frontend (estamos no diretório backend-whatsmeow, o frontend está um nível acima)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📋 Copiando arquivos do frontend..."
cp -r "$PROJECT_ROOT"/src "$FRONTEND_DIR/"
cp -r "$PROJECT_ROOT"/public "$FRONTEND_DIR/" 2>/dev/null || true
cp "$PROJECT_ROOT"/package.json "$FRONTEND_DIR/"
cp "$PROJECT_ROOT"/vite.config.ts "$FRONTEND_DIR/"
cp "$PROJECT_ROOT"/tsconfig.json "$FRONTEND_DIR/"
cp "$PROJECT_ROOT"/tailwind.config.ts "$FRONTEND_DIR/"
cp "$PROJECT_ROOT"/postcss.config.js "$FRONTEND_DIR/"
cp "$PROJECT_ROOT"/index.html "$FRONTEND_DIR/"

# Criar .env de produção com a URL da API
cat > "$FRONTEND_DIR/.env.production" << EOF
VITE_API_URL=http://$DOMAIN:$API_PORT
VITE_WS_URL=ws://$DOMAIN:$API_PORT/ws
EOF

cd "$FRONTEND_DIR"
echo "📥 Instalando dependências do frontend..."
npm install --legacy-peer-deps

echo "🔨 Compilando frontend para produção..."
npm run build

echo -e "${GREEN}✅ Frontend compilado com sucesso!${NC}"

# ══════════════════════════════════════════════════
#  ETAPA 5: Build do Backend (Go + whatsmeow)
# ══════════════════════════════════════════════════
print_step "⚙️  ETAPA 5/7 - Compilando Backend"

echo "📋 Copiando arquivos do backend..."
cp -r "$SCRIPT_DIR"/*.go "$BACKEND_DIR/"
cp "$SCRIPT_DIR"/go.mod "$BACKEND_DIR/"
cp "$SCRIPT_DIR"/go.sum "$BACKEND_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR"/Dockerfile "$BACKEND_DIR/" 2>/dev/null || true

cd "$BACKEND_DIR"
echo "📥 Baixando módulos Go..."
/usr/local/go/bin/go mod tidy

echo "🔨 Compilando backend..."
CGO_ENABLED=1 /usr/local/go/bin/go build -o whatsmeow-api .

# Salvar configuração do admin master
cat > "$BACKEND_DIR/admin-config.json" << EOF
{
  "email": "$ADMIN_EMAIL",
  "password": "$ADMIN_PASS",
  "name": "$ADMIN_NAME",
  "role": "super_admin",
  "createdAt": "$(date +%Y-%m-%d)"
}
EOF

echo -e "${GREEN}✅ Backend compilado com sucesso!${NC}"

# ══════════════════════════════════════════════════
#  ETAPA 6: Configurar Nginx + Systemd
# ══════════════════════════════════════════════════
print_step "🌐 ETAPA 6/7 - Configurando Nginx e Serviço"

# Configurar Nginx para servir o frontend e fazer proxy para a API
cat > /etc/nginx/sites-available/whatspanel << EOF
server {
    listen $FRONTEND_PORT;
    server_name $DOMAIN;

    # Frontend (React build)
    root $FRONTEND_DIR/dist;
    index index.html;

    # SPA - redirecionar todas as rotas para index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy para API backend
    location /api/ {
        proxy_pass http://127.0.0.1:$API_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }

    # WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:$API_PORT/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # QR Code endpoint
    location /qr {
        proxy_pass http://127.0.0.1:$API_PORT/qr;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

# Ativar site
sudo ln -sf /etc/nginx/sites-available/whatspanel /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

echo "✅ Nginx configurado"

# Criar serviço systemd para o backend
cat > /etc/systemd/system/whatspanel.service << EOF
[Unit]
Description=WhatsPanel Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$BACKEND_DIR
ExecStart=$BACKEND_DIR/whatsmeow-api
Environment=API_PORT=$API_PORT
Environment=ADMIN_CONFIG=$BACKEND_DIR/admin-config.json
Environment=STATIC_DIR=$FRONTEND_DIR/dist
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable whatspanel
echo "✅ Serviço systemd criado e habilitado"

# ══════════════════════════════════════════════════
#  ETAPA 7: Iniciar e gerar QR Code
# ══════════════════════════════════════════════════
print_step "🚀 ETAPA 7/7 - Iniciando WhatsPanel e Gerando QR Code"

# Iniciar o serviço
sudo systemctl start whatspanel

# Aguardar o backend subir
echo "⏳ Aguardando backend iniciar..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:$API_PORT/api/status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend online!${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}⚠️  Backend demorou para iniciar. Verifique os logs:${NC}"
    echo "   sudo journalctl -u whatspanel -f"
  fi
  sleep 2
done

# Tentar obter o QR Code
echo ""
echo -e "${CYAN}📱 Gerando QR Code para conexão do WhatsApp...${NC}"
echo ""

QR_RESPONSE=$(curl -sf http://127.0.0.1:$API_PORT/api/qrcode 2>/dev/null || echo "")

if [ -n "$QR_RESPONSE" ]; then
  # Extrair e exibir QR code no terminal
  QR_TEXT=$(echo "$QR_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('qr', data.get('code', '')))
except:
    print('')
" 2>/dev/null)

  if [ -n "$QR_TEXT" ] && [ "$QR_TEXT" != "" ]; then
    # Gerar QR no terminal usando Python
    python3 -c "
import subprocess, sys
try:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-q', 'qrcode'], 
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    import qrcode
    qr = qrcode.QRCode(border=1)
    qr.add_data('$QR_TEXT')
    qr.print_ascii(invert=True)
except Exception as e:
    print(f'QR disponível no painel web: http://$DOMAIN/connection')
" 2>/dev/null || true

    echo ""
    echo -e "${GREEN}📱 Escaneie o QR Code acima com seu WhatsApp!${NC}"
    echo -e "${YELLOW}   WhatsApp > Dispositivos Conectados > Conectar Dispositivo${NC}"
  else
    echo -e "${YELLOW}📱 QR Code será gerado quando você acessar o painel:${NC}"
    echo -e "${CYAN}   http://$DOMAIN/connection${NC}"
  fi
else
  echo -e "${YELLOW}📱 Acesse o painel para gerar o QR Code:${NC}"
  echo -e "${CYAN}   http://$DOMAIN/connection${NC}"
fi

# ══════════════════════════════════════════════════
#  Resumo final
# ══════════════════════════════════════════════════
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}║       ✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!       ║${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}║  🌐 Painel:    http://$DOMAIN                    ${NC}"
echo -e "${CYAN}║  ⚙️  API:       http://$DOMAIN:$API_PORT          ${NC}"
echo -e "${CYAN}║  📱 QR Code:   http://$DOMAIN/connection          ${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}║  📧 Login:     $ADMIN_EMAIL                       ${NC}"
echo -e "${CYAN}║  🔑 Senha:     ******                             ${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}║  📌 Comandos úteis:                              ║${NC}"
echo -e "${CYAN}║  • Status:   systemctl status whatspanel          ║${NC}"
echo -e "${CYAN}║  • Logs:     journalctl -u whatspanel -f          ║${NC}"
echo -e "${CYAN}║  • Restart:  systemctl restart whatspanel         ║${NC}"
echo -e "${CYAN}║  • Parar:    systemctl stop whatspanel            ║${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}║  🔒 SSL (opcional):                              ║${NC}"
echo -e "${CYAN}║  certbot --nginx -d $DOMAIN                      ║${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${RED}⚠️  IMPORTANTE: Altere a senha padrão após o primeiro login!${NC}"
echo ""
