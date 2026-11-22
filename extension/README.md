# Extensão EduTrack AI — Sincronizador Acadêmico (Chrome & Edge)

Extensão oficial **Manifest V3** do EduTrack AI para importar disciplinas, atividades e prazos diretamente do portal da sua faculdade (**Blackboard**, **Portal UNICID / Cruzeiro do Sul**, **Canvas**, **Moodle**, **Google Classroom** e outros) em um clique.

## 1. Como compilar

A partir da raiz do repositório `edutrack-ai`, certifique-se de que as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estejam configuradas em `.env` ou `.env.local` e execute:

```bash
npm run build:extension
```

A pasta pronta para instalação será gerada em:

```text
extension/dist/
```

Conteúdo gerado: `manifest.json`, `popup.html`, bundles em `assets/` e ícones em `icons/` (`icon16.png`, `icon48.png`, `icon128.png`).

## 2. Instalar no Microsoft Edge (modo desenvolvedor)

1. Abra `edge://extensions` na barra de endereços do Microsoft Edge.
2. Ative a chave **Modo de desenvolvedor** (menu lateral esquerdo).
3. Clique em **Carregar sem pacote** (*Load unpacked*).
4. Selecione a pasta `extension/dist` do projeto.
5. Fixe o ícone do **EduTrack AI** na barra de ferramentas, abra o portal da sua faculdade, faça login na extensão e clique em **Ler esta página**.

## 3. Instalar no Google Chrome (modo desenvolvedor)

1. Abra `chrome://extensions` na barra de endereços do Google Chrome.
2. Ative **Modo do desenvolvedor** no canto superior direito.
3. Clique em **Carregar sem compactação** (*Load unpacked*).
4. Selecione a pasta `extension/dist` do projeto.
5. Fixe o ícone do **EduTrack AI** na barra de extensões para acesso rápido.

## 4. Permissões utilizadas (princípio do menor privilégio)

- `activeTab`: permite ler a aba atual **somente** quando o estudante clica no botão da extensão.
- `scripting`: injeta o coletor localmente na aba ativa (incluindo `iframes` acessíveis e Shadow DOM) sem carregar código remoto.
- `storage`: mantém a sessão do estudante conectada com `chrome.storage.local` e renovação automática de token.
- `host_permissions`: restrito exclusivamente ao domínio do backend do EduTrack AI (sem `<all_urls>`).

## 5. Checklist de publicação (Chrome Web Store & Edge Add-ons)

- [ ] Executar `npm test`, `npm run build` e `npm run build:extension` sem erros.
- [ ] Atualizar `"version"` em `extension/manifest.json` a cada release.
- [ ] Compactar o conteúdo interno de `extension/dist/` em um `.zip` (com `manifest.json` na raiz do zip).
- [ ] Preparar 2 a 3 capturas de tela `1280x800` mostrando o popup no Blackboard/Portal, a prévia com checkboxes e o Dashboard atualizado.
- [ ] Preencher justificativa de permissões nas lojas:
  - `activeTab` + `scripting`: leitura sob demanda do conteúdo acadêmico da página aberta pelo estudante quando ele aciona "Ler esta página".
  - `storage`: persistência local da sessão autenticada do estudante.
- [ ] Publicar política de privacidade (coleta somente dos itens que o aluno seleciona explicitamente para sincronizar na própria conta).
