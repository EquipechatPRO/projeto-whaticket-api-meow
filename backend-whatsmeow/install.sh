#!/bin/bash
# Instalação do backend WhatsApp API (whatsmeow)
# Execute este script no seu servidor Ubuntu/Debian

set -e

echo "📦 Instalando dependências do sistema..."
sudo apt update
sudo apt install -y golang-go gcc sqlite3

echo "📁 Entrando no diretório..."
cd "$(dirname "$0")"

echo "📥 Baixando módulos Go..."
go mod tidy

echo "🔨 Compilando..."
go build -o whatsmeow-api .

echo ""
echo "✅ Instalação concluída!"
echo ""
echo "Para iniciar o servidor:"
echo "  ./whatsmeow-api"
echo ""
echo "O servidor vai rodar na porta 3000 por padrão."
echo "Para mudar a porta: API_PORT=8080 ./whatsmeow-api"
echo ""
echo "Depois, configure a URL no painel frontend:"
echo "  http://SEU-IP:3000"
