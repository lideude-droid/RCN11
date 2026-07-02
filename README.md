# RCN — Servidor (Render + Supabase)

## O que resolve isto
O Render falhava com `failed to read dockerfile: open Dockerfile: no such file or directory`
porque o repositório só tinha os dois ficheiros HTML, sem `Dockerfile`. Este pacote
adiciona um servidor Node/Express completo, com `Dockerfile` na raiz, que serve as
páginas e trata do login com Discord e do feed estilo Instagram.

## Estrutura
```
rcn-server/
├── Dockerfile
├── package.json
├── server.js
├── routes/
│   ├── auth.js      -> troca o "code" do Discord por dados do utilizador
│   └── posts.js      -> CRUD dos posts do feed (Supabase)
├── lib/
│   └── supabase.js
├── public/
│   ├── login.html
│   ├── dashboard.html
│   └── feed.html      -> feed estilo Instagram, ligado ao Supabase
├── supabase_setup.sql -> corre isto no Supabase antes de testar o feed
└── .env.example
```

## 1. Substitui os ficheiros no teu repositório do GitHub
Apaga `login.html` e `dashboard (3).html` da raiz do repo e sobe **toda** a pasta
`rcn-server/` (o conteúdo dela, não a pasta em si) para a raiz do repositório.
No fim, o `Dockerfile` tem de estar na raiz — é isso que o Render precisa de encontrar.

## 2. Configura o Supabase
1. Cria um projeto em supabase.com (ou usa o que já tens).
2. Vai a **SQL Editor** e corre o conteúdo de `supabase_setup.sql`.
3. Vai a **Project Settings > API** e copia:
   - `Project URL` → vai para `SUPABASE_URL`
   - `service_role` key (não a `anon`!) → vai para `SUPABASE_SERVICE_KEY`

## 3. Configura o Discord
No Discord Developer Portal, na tua app, em **OAuth2 > Redirects**, adiciona:
```
https://o-teu-servico.onrender.com/
```
(o URL exato do teu serviço no Render, com `/` no fim).

## 4. Variáveis de ambiente no Render
No painel do serviço Render, em **Environment**, adiciona:
- `DISCORD_CLIENT_ID` = `1508553666389475378`
- `DISCORD_CLIENT_SECRET` = (a tua secret do Discord — gera uma nova se a antiga já foi exposta)
- `REDIRECT_URI` = `https://o-teu-servico.onrender.com/` (igual ao que puseste no Discord)
- `SUPABASE_URL` = a do passo 2
- `SUPABASE_SERVICE_KEY` = a do passo 2

## 5. Tipo de serviço no Render
Confirma que o serviço está configurado como **Docker** (Environment: Docker).
Com o `Dockerfile` agora na raiz, o build deve funcionar sem o erro anterior.

## 6. Testar
- Abre `https://o-teu-servico.onrender.com/` → deve mostrar o `login.html`.
- Faz login com Discord → deve levar-te ao `dashboard.html` com o teu avatar.
- Vai a "Feed" no menu → publica um post com um link de imagem (recomendamos Imgur)
  → deve aparecer guardado na tabela `posts` do Supabase, com gostos a funcionar.

## Notas
- Não voltes a publicar o `DISCORD_CLIENT_SECRET` nem o `SUPABASE_SERVICE_KEY` em
  mensagens, capturas de ecrã ou no código do GitHub — ficam só nas variáveis de
  ambiente do Render.
- O `redirect_uri` no `login.html` é calculado automaticamente a partir do domínio
  onde a página está a correr, por isso não precisas de o editar manualmente lá.

## Atualizações recentes

Corre estes ficheiros SQL no Supabase (SQL Editor), por ordem, se ainda não o fizeste:
- `supabase_setup_v5.sql` — vídeos nos posts, posts afixados (pin) e seguidores.
- `supabase_setup_v6.sql` — jogos entre clubes (ex: SLB vs SCP) e o "bucket" de
  armazenamento `post-media` onde ficam guardados os ficheiros enviados do PC.

Novidades:
- **Feed**: podes publicar imagens ou vídeos por link, ou enviar um ficheiro
  diretamente do teu computador (fica guardado para sempre no armazenamento do
  Supabase, não desaparece). Também dá para apagar os teus posts e afixar
  (pin) um post no topo do teu perfil.
- **Contas (`profile.html`)**: página de perfil de cada jogador, com os posts
  dele, contadores de seguidores e um botão para seguir/deixar de seguir.
- **Jogos (`matches.html`)**: calendário público com próximos jogos e
  resultados. No painel de administração (`admin.html`, separador "Jogos")
  dá para criar jogos entre clubes (ex: SLB vs SCP), marcar o resultado e a
  classificação dos clubes é recalculada automaticamente.
- Instala as novas dependências antes de correr localmente: `npm install`
  (adiciona o pacote `multer`, usado para os uploads de ficheiros).
