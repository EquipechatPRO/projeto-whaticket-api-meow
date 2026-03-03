

## Plano: Agrupar itens na aba "Gerenciamento"

O objetivo é criar um dropdown "Gerenciamento" na barra de navegação superior que agrupe os links: Conexões, Resposta Rápida, Fluxos e Contatos. Esses itens serão removidos da navegação principal e colocados dentro desse dropdown.

### Mudanças em `src/components/TopNavbar.tsx`

1. **Remover** da lista `navLinks` os itens: `/contacts`, `/flows`, `/quick-replies`, `/connection`
2. **Adicionar** um dropdown "Gerenciamento" na navbar (ao lado dos links restantes), usando o mesmo padrão de dropdown já existente (hamburger/notificações)
3. O dropdown terá os 4 itens com ícones:
   - Conexões (`/connection`) - ícone Settings/Wifi
   - Resposta Rápida (`/quick-replies`) - ícone Zap
   - Fluxos (`/flows`) - ícone GitBranch
   - Contatos (`/contacts`) - ícone Users/Bot
4. O botão do dropdown ficará ativo (highlighted) quando a rota atual for uma das 4 rotas agrupadas
5. Usar `useRef` + `useClickOutside` (já existente) para fechar ao clicar fora

### Resultado Visual

A navbar terá: Dashboard | Conversas | Filas | **Gerenciamento ▾** | [Usuários se admin]

O dropdown de Gerenciamento abrirá um menu com os 4 links agrupados.

