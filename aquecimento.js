/* Campanha de Aquecimento do L21 — puxada via MCP do Meta Ads (conta CA05 - Alberto Pompeu / BM Alberto Neto).
   Snapshot manual: NÃO entra no build automático de 3h (a nuvem lê só Google Sheets, não a API do Meta).
   Para atualizar: pedir refresh que eu re-puxo via MCP e regravo este arquivo. */
window.AQUECIMENTO = {
  campaign: "21L | E3-AQC | IG | P1-RMKT | TRAF | ABO | 2026-08-31 | Aquecimento",
  account: "CA05 - Alberto Pompeu",
  bm: "Alberto Neto",
  campaignId: "120248875845800318",
  updatedAt: "14/09/2026 14:04",
  goal: { spend: 20000, date: "2026-09-14" },   // investir 20k até o encerramento do L21 (14/09)
  spentTotal: 18568,   // total investido no aquecimento informado pelo cliente (14/09). Esta campanha somou R$17.701; o restante veio de aquecimento fora desta campanha. Dirige o card de meta; a tabela diária segue os dados reais desta campanha.
  // Campanhas "21L | ... | É HOJE | ISOLADO" ativas HOJE (dia do evento 14/09), puxadas via MCP nível campanha (CA05, só effective_status ACTIVE). Foco em alcance + frequência. Snapshot do dia — sobem ao longo do dia.
  activeToday: {
    account: "CA05 - Alberto Pompeu",
    date: "2026-09-14",
    updatedAt: "14/09/2026 14:04",
    note: "Campanhas de remarketing de dia do evento (\"É HOJE\"), isoladas.",
    camps: [
      { name:"É HOJE · ISOLADO",   id:"120249137341710318", reach:1368, freq:1.480994, impr:2026, clicks:40, spend:26.60, cpm:13.13, cpc:0.67, ctr:1.97 },
      { name:"É HOJE · ISOLADO 2", id:"120249138813700318", reach:269,  freq:1.237918, impr:333,  clicks:6,  spend:4.49,  cpm:13.48, cpc:0.75, ctr:1.80 },
      { name:"É HOJE · ISOLADO 3", id:"120249138878120318", reach:210,  freq:1.214286, impr:255,  clicks:4,  spend:4.29,  cpm:16.82, cpc:1.07, ctr:1.57 },
      { name:"É HOJE · ISOLADO 4", id:"120249138885450318", reach:139,  freq:1.258993, impr:175,  clicks:6,  spend:3.01,  cpm:17.20, cpc:0.50, ctr:3.43 }
    ]
  },
  rows: [
    { date:"2026-09-01", reach:10681, freq:3.772025, impr:40289, clicks:1128, spend:1641.14, cpm:40.73, cpc:1.45, ctr:2.80 },
    { date:"2026-09-02", reach:11347, freq:3.22279,  impr:36569, clicks:1063, spend:1557.21, cpm:42.58, cpc:1.46, ctr:2.91 },
    { date:"2026-09-03", reach:12782, freq:2.927946, impr:37425, clicks:1017, spend:1523.42, cpm:40.71, cpc:1.50, ctr:2.72 },
    { date:"2026-09-04", reach:12137, freq:2.822773, impr:34260, clicks:929,  spend:1263.27, cpm:36.87, cpc:1.36, ctr:2.71 },
    { date:"2026-09-05", reach:12158, freq:2.843231, impr:34568, clicks:868,  spend:1153.04, cpm:33.36, cpc:1.33, ctr:2.51 },
    { date:"2026-09-06", reach:13924, freq:3.228454, impr:44953, clicks:1025, spend:1575.69, cpm:35.05, cpc:1.54, ctr:2.28 },
    { date:"2026-09-07", reach:14181, freq:3.214794, impr:45589, clicks:1057, spend:1595.59, cpm:35.00, cpc:1.51, ctr:2.32 },
    { date:"2026-09-08", reach:12513, freq:2.914009, impr:36463, clicks:812,  spend:1162.09, cpm:31.87, cpc:1.43, ctr:2.23 },
    { date:"2026-09-09", reach:12195, freq:2.906437, impr:35444, clicks:850,  spend:1335.48, cpm:37.68, cpc:1.57, ctr:2.40 },
    { date:"2026-09-10", reach:11225, freq:2.684811, impr:30137, clicks:707,  spend:1140.55, cpm:37.85, cpc:1.61, ctr:2.35 },
    { date:"2026-09-11", reach:11948, freq:2.932039, impr:35032, clicks:819,  spend:1320.81, cpm:37.70, cpc:1.61, ctr:2.34 },
    { date:"2026-09-12", reach:13535, freq:2.519985, impr:34108, clicks:929,  spend:1263.79, cpm:37.05, cpc:1.36, ctr:2.72 },
    { date:"2026-09-13", reach:13159, freq:2.579983, impr:33950, clicks:899,  spend:1168.97, cpm:34.43, cpc:1.30, ctr:2.65 }
  ]
};

/* ===== L22 · Aquecimento + Contagem regressiva (add 03/11/2026) =====
   Puxado via MCP do Meta Ads — conta CA05 - Alberto Pompeu (764177629712794). NÃO tem planilha:
   snapshot manual, não atualiza no refresh automático. Gasto = valor do gerenciador (SEM imposto).
   Alcance do período é ÚNICO por campanha (não é a soma do alcance diário). Dia de hoje = parcial.
   Estas campanhas (etapa E3-AQC) ficam FORA do gasto de captação do L22 (campExclude no build). */
window.AQUECIMENTO_L22 = {
  account: "CA05 - Alberto Pompeu",
  accountId: "764177629712794",
  updatedAt: "03/11/2026 14:41",
  camps: [
    { key:"contagem", short:"Contagem regressiva", id:"120250057276700318",
      name:"SIP-L22 | E3-AQC | IG | P1-RMKT | ALC | ABO | 2026-11-02 | Contagem regressiva",
      objective:"Tráfego", status:"ACTIVE", start:"2026-11-02",
      total:{ spend:385.87, reach:11935, freq:2.286804, impr:27293, clicks:425, linkClicks:398, cpm:14.14, cpc:0.91, ctr:1.56 },
      rows:[
        { date:"2026-11-02", spend:197.17, reach:8662, freq:1.628954, impr:14110, clicks:237, linkClicks:219, cpm:13.97, cpp:22.76, cpc:0.83, ctr:1.68 },
        { date:"2026-11-03", spend:188.70, reach:6907, freq:1.908643, impr:13183, clicks:188, linkClicks:179, cpm:14.31, cpp:27.32, cpc:1.00, ctr:1.43 }
      ] },
    { key:"aquecimento", short:"Aquecimento · Alcance", id:"120250056991040318",
      name:"SIP-L22 | E3-AQC | IG | P1-RMKT | ALCANCE | ABO | 2026-11- 02 | Aquecimento",
      objective:"Reconhecimento (alcance)", status:"ACTIVE", start:"2026-11-02", dailyBudget:200,
      total:{ spend:238.41, reach:27561, freq:1.649759, impr:45469, clicks:47, linkClicks:1, cpm:5.24, cpc:5.07, ctr:0.10 },
      rows:[
        { date:"2026-11-02", spend:75.66,  reach:19224, freq:1.103881, impr:21221, clicks:17, linkClicks:0, cpm:3.57, cpp:3.94, cpc:4.45, ctr:0.0801 },
        { date:"2026-11-03", spend:162.75, reach:19569, freq:1.239103, impr:24248, clicks:30, linkClicks:1, cpm:6.71, cpp:8.32, cpc:5.43, ctr:0.12 }
      ] },
    { key:"aquec-trafego", short:"Aquecimento · Tráfego (ad024)", id:"120250079453070318",
      name:"SIP-L22 | E3-AQC | IG | P1-RMKT | TRÁFEGO | ABO | 2026-11- 03 | Aquecimento | ad024",
      objective:"Tráfego", status:"ACTIVE", start:"2026-11-03", dailyBudget:500,
      total:{ spend:42.39, reach:1380, freq:1.328986, impr:1834, clicks:26, linkClicks:20, cpm:23.11, cpc:1.63, ctr:1.42 },
      rows:[
        { date:"2026-11-03", spend:42.39, reach:1380, freq:1.328986, impr:1834, clicks:26, linkClicks:20, cpm:23.11, cpp:30.72, cpc:1.63, ctr:1.42 }
      ] }
  ]
};