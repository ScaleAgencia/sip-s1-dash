/* Campanha de Aquecimento do L21 — puxada via MCP do Meta Ads (conta CA05 - Alberto Pompeu / BM Alberto Neto).
   Snapshot manual: NÃO entra no build automático de 3h (a nuvem lê só Google Sheets, não a API do Meta).
   Para atualizar: pedir refresh que eu re-puxo via MCP e regravo este arquivo. */
window.AQUECIMENTO = {
  campaign: "21L | E3-AQC | IG | P1-RMKT | TRAF | ABO | 2026-08-31 | Aquecimento",
  account: "CA05 - Alberto Pompeu",
  bm: "Alberto Neto",
  campaignId: "120248875845800318",
  updatedAt: "06/09/2026 13:01",
  goal: { spend: 20000, date: "2026-09-14" },   // investir 20k até o encerramento do L21 (14/09)
  rows: [
    { date:"2026-09-01", reach:10681, freq:3.772025, impr:40289, clicks:1128, spend:1641.14, cpm:40.73, cpc:1.45, ctr:2.80 },
    { date:"2026-09-02", reach:11347, freq:3.22279,  impr:36569, clicks:1063, spend:1557.21, cpm:42.58, cpc:1.46, ctr:2.91 },
    { date:"2026-09-03", reach:12782, freq:2.927946, impr:37425, clicks:1017, spend:1523.42, cpm:40.71, cpc:1.50, ctr:2.72 },
    { date:"2026-09-04", reach:12137, freq:2.822773, impr:34260, clicks:929,  spend:1263.27, cpm:36.87, cpc:1.36, ctr:2.71 },
    { date:"2026-09-05", reach:12158, freq:2.842984, impr:34565, clicks:868,  spend:1153.04, cpm:33.36, cpc:1.33, ctr:2.51 },
    { date:"2026-09-06", reach:5252,  freq:1.792079, impr:9412,  clicks:222,  spend:317.88,  cpm:33.77, cpc:1.43, ctr:2.36 }
  ]
};
