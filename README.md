# SIP-S1 · Dashboard de Captação

Dashboard ao vivo do funil de captação **SIP-S1** (Meta Ads), publicado no GitHub Pages.

- **`build.ps1`** (PowerShell) baixa 2 planilhas Google via gviz CSV (somente leitura), cruza os **leads** com as **queries do Meta Ads** e escreve `data.js` (`window.SIPS1`).
- **`index.html` + `app.js` + `styles.css`** leem o global e renderizam tudo em SVG puro (sem libs, sem fetch).
- **Sem leadscore** — captação simples: funil (gasto → impressões → alcance → cliques → LPV → leads), atribuição por UTM (campanha + anúncio), split pago/orgânico e distribuição geográfica.
- **Imposto Meta ×1,1385** incluso em todo gasto e nas métricas.

## Atualização (100% nuvem, a cada 3h)
`.github/workflows/refresh.yml`: job **build** (windows) roda `build.ps1` e commita `data.js`; job **deploy** (ubuntu) publica no Pages só os arquivos públicos (sem a pasta `data/`, que tem os CSVs crus). Gatilho confiável = **cron-job.org** faz POST no `workflow_dispatch`.

Fontes (somente leitura), privacidade: a dash é pública e só expõe **agregados** — nenhum nome, e-mail ou telefone é publicado.
