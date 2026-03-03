#!/bin/bash
# Instalação do WhatsPanel - Backend + Admin Master
# Execute este script no seu servidor Ubuntu/Debian

set -e

echo "╔══════════════════════════════════════════════╗"
echo "║         WhatsPanel - Instalação VPS          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. Dependências do sistema ──
echo "📦 Instalando dependências do sistema..."
sudo apt update
sudo apt install -y golang-go gcc sqlite3

# ── 2. Compilar backend ──
echo "📁 Entrando no diretório..."
cd "$(dirname "$0")"

echo "📥 Baixando módulos Go..."
go mod tidy

echo "🔨 Compilando..."
go build -o whatsmeow-api .

# ── 3. Configurar Admin Master ──
echo ""
echo "══════════════════════════════════════════════"
echo "  🔐 Configuração do Admin Master"
echo "══════════════════════════════════════════════"
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

# Salvar configuração do admin master
cat > admin-config.json << EOF
{
  "email": "$ADMIN_EMAIL",
  "password": "$ADMIN_PASS",
  "name": "$ADMIN_NAME",
  "role": "super_admin",
  "createdAt": "$(date +%Y-%m-%d)"
}
EOF

echo ""
echo "✅ Admin Master configurado com sucesso!"
echo "   Credenciais salvas em admin-config.json"

# ── 4. Configuração da porta ──
read -p "🌐 Porta do servidor [3000]: " API_PORT
API_PORT=${API_PORT:-3000}

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║         ✅ Instalação Concluída!             ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  📧 Admin Master: $ADMIN_EMAIL"
echo "  🌐 Porta: $API_PORT"
echo ""
echo "  Para iniciar o servidor:"
echo "    API_PORT=$API_PORT ./whatsmeow-api"
echo ""
echo "  Para acessar o painel:"
echo "    http://SEU-IP:$API_PORT"
echo ""
echo "  Login com as credenciais do admin master"
echo "  configuradas acima."
echo ""
echo "  ⚠️  IMPORTANTE: Altere a senha padrão após"
echo "  o primeiro login para maior segurança."
