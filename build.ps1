# =====================================================================
#  SIP  -  Dashboard data engine  (2 funis: SIP-S1 + SIP-L21)
#  Baixa as planilhas Google (gviz CSV) de CADA funil, cruza leads x
#  queries (Meta+Google), e escreve data.js (window.SIP) lido pela
#  pagina estatica (index.html).  Roda local (PS 5.1) e no GitHub
#  Actions.  Somente leitura - NAO altera nenhuma planilha.  ASCII-only
#  de proposito (PS5.1 le .ps1 como ANSI; acentos so no front app.js).
#  SEM leadscore (captacao simples).
# =====================================================================
param([ValidateSet('all')][string]$Mode='all')
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$BR = [Globalization.CultureInfo]::GetCultureInfo('pt-BR')
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# ---- Fontes por funil (somente leitura) ----------------------------
# metaGid = aba "Queries | Meta Ads"; googleGid = aba "Queries Google".
$FUNNELS = @(
  [ordered]@{ key='s1';  label='SIP-S1';
    queriesId='1WKRLwQpK4xcoQENOZPk01qROgbTL9vLqTxyp8sfo_9A'; metaGid='0'; googleGid='1609119011';
    leadsId='1nTJYpjYLlK8ZOfA-V9faNSuqz-oegrhccmOgGvrEzm0';   leadsGid='566747937'
    goalSpend=0; goalDate='' }
  [ordered]@{ key='l21'; label='SIP-L21';
    queriesId='1MzEn8jtxvEQbAWgA1Btg1cL5Q-mB3oA8KygVJfrgszo'; metaGid='0'; googleGid='1609119011';
    leadsId='19vondd8YlTF4f-nhu3guZAocwqrJz0ofEplbAYEbp5s';   leadsGid='1648797035'
    goalSpend=480000; goalDate='2026-09-14' }   # meta de investimento c/ imposto ate 14/09
)
$TAX  = 1.1385          # imposto Meta (+13,85%) aplicado no gasto do Meta
$TAXG = 1.0             # Google Ads NAO tem imposto
$AGENCY = 'agenciaup13' # e-mail interno da agencia = lead de teste
$SENT = 'SEM_RASTREIO'  # sentinela p/ lead sem atribuicao

# =====================================================================
#  HELPERS (compartilhados pelos 2 funis)
# =====================================================================
function Get-Sheet($id,$gid,$out){
  $url = "https://docs.google.com/spreadsheets/d/$id/gviz/tq?tqx=out:csv&gid=$gid"
  [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
  (New-Object System.Net.WebClient).DownloadFile($url,$out)
  if((Get-Item $out).Length -lt 30){ throw "Download muito pequeno: $out" }
}
function Get-SheetByName($id,$name,$out){
  $enc=[uri]::EscapeDataString($name)
  $url="https://docs.google.com/spreadsheets/d/$id/gviz/tq?tqx=out:csv&sheet=$enc"
  [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
  (New-Object System.Net.WebClient).DownloadFile($url,$out)
}
function Read-Csv($path){
  $rows = New-Object System.Collections.Generic.List[object]
  try {
    Add-Type -AssemblyName Microsoft.VisualBasic -ErrorAction Stop
    $p = New-Object Microsoft.VisualBasic.FileIO.TextFieldParser($path,[System.Text.Encoding]::UTF8)
    $p.TextFieldType='Delimited'; $p.SetDelimiters(','); $p.HasFieldsEnclosedInQuotes=$true
    while(-not $p.EndOfData){ $rows.Add($p.ReadFields()) }
    $p.Close(); return $rows
  } catch {
    # Fallback portatil (Linux/pwsh): gviz aspa todo campo; assume sem newline embutido na celula.
    $lines = [IO.File]::ReadAllLines($path,[System.Text.Encoding]::UTF8)
    foreach($ln in $lines){
      if($ln.Length -eq 0){ continue }
      $fields = New-Object System.Collections.Generic.List[string]
      $sb = New-Object Text.StringBuilder; $inq=$false; $i=0
      while($i -lt $ln.Length){
        $ch=$ln[$i]
        if($inq){
          if($ch -eq '"'){ if($i+1 -lt $ln.Length -and $ln[$i+1] -eq '"'){ [void]$sb.Append('"'); $i++ } else { $inq=$false } }
          else { [void]$sb.Append($ch) }
        } else {
          if($ch -eq '"'){ $inq=$true }
          elseif($ch -eq ','){ $fields.Add($sb.ToString()); [void]$sb.Clear() }
          else { [void]$sb.Append($ch) }
        }
        $i++
      }
      $fields.Add($sb.ToString())
      $rows.Add($fields.ToArray())
    }
    return $rows
  }
}
function Norm($s){ if($null -eq $s){return ''}; return ($s -replace [char]0x200b,'').Trim() }
function MoneyBR($s){ $s=Norm $s; if($s -eq ''){return 0.0}; return [double]($s -replace '\.','' -replace ',','.') }
function ToInt($s){ $s=Norm $s; if($s -eq ''){return 0}; $v=($s -replace '\.','' -replace ',','.'); if($v -notmatch '^-?\d'){return 0}; return [int][double]$v }
function Deaccent($s){ if($null -eq $s){return ''}; $s=$s.Normalize([Text.NormalizationForm]::FormD); $sb=New-Object Text.StringBuilder
  foreach($c in $s.ToCharArray()){ if([Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne [Globalization.UnicodeCategory]::NonSpacingMark){ [void]$sb.Append($c) } }
  return $sb.ToString().ToLower().Trim() }
function HdrLike($hdr,$frag){ for($i=0;$i -lt $hdr.Count;$i++){ if((Deaccent $hdr[$i]) -like $frag){ return $i } }; return -1 }
function TitleFirst($s){ $s=(Norm $s) -replace '\s+',' '; if($s -eq ''){return ''}; return $s.Substring(0,1).ToUpper()+$s.Substring(1) }
# dd/mm/yyyy (ou dd-mm-yyyy) -> yyyy-mm-dd
function LeadDate($s){ $s=Norm $s; if($s -match '^(\d{1,2})[-/](\d{1,2})[-/](\d{4})'){ return ('{0}-{1:d2}-{2:d2}' -f $Matches[3],[int]$Matches[2],[int]$Matches[1]) }; return '' }
# ISO createdAt (2026-08-04T..) -> yyyy-mm-dd  (fallback quando 'date' vazio)
function IsoDate($s){ $s=Norm $s; if($s -match '^(\d{4})-(\d{2})-(\d{2})'){ return ("{0}-{1}-{2}" -f $Matches[1],$Matches[2],$Matches[3]) }; return '' }
# lead pago? = utm_medium de trafego pago (ou source facebook-ads)
function IsPaid($src,$med){ $m=Deaccent $med; $s=Deaccent $src
  if($m -match 'pago' -or $m -match 'cpc' -or $m -match 'paid' -or $m -match 'ppc'){ return $true }
  if($s -eq 'facebook-ads' -or $s -eq 'fb-ads'){ return $true }
  return $false }
# canal/fonte de origem (rotulo p/ o breakdown de fontes). ASCII-only (front prettifica).
# utm_source VAZIA = TikTok: o pixel do TikTok nao popula utm (confirmado 08/2026 - 100%
# dos leads sem utm caem na landing do funil). Nao afeta atribuicao (essa usa utm_campaign).
function Channel($src){ $s=Deaccent $src
  if($s -eq ''){ return 'TikTok' }
  if($s -eq 'facebook-ads' -or $s -eq 'fb-ads' -or $s -eq 'facebook' -or $s -eq 'fb'){ return 'Facebook Ads' }
  if($s -like 'google*'){ return 'Google Ads' }
  if($s -like 'instagram*' -or $s -eq 'ig'){ return 'Instagram' }
  if($s -eq 'youtube' -or $s -eq 'yt'){ return 'YouTube' }
  if($s -like 'tiktok*'){ return 'TikTok' }
  if($s -eq 'manychat'){ return 'ManyChat' }
  if($s -eq 'whatsapp' -or $s -eq 'wpp'){ return 'WhatsApp' }
  return (TitleFirst $src) }
# fonte GRANULAR p/ o diario por rede: separa placement do organico via utm_term (bio/direct/...).
function SourceGran($src,$med,$term){ $s=Deaccent $src; $t=Deaccent $term
  if($s -eq ''){ return 'TikTok' }
  if($s -eq 'facebook-ads' -or $s -eq 'fb-ads' -or $s -eq 'facebook' -or $s -eq 'fb'){ return 'Facebook Ads' }
  if($s -like 'google*'){ return 'Google Ads' }
  if($s -like 'instagram*' -or $s -eq 'ig'){ if($t -eq 'bio'){return 'Insta bio'}; if($t -eq 'direct'){return 'Insta direct'}; if($t -ne ''){return 'Insta '+$t}; return 'Instagram' }
  if($s -eq 'youtube' -or $s -eq 'yt'){ return 'YouTube' }
  if($s -like 'tiktok*'){ return 'TikTok' }
  if($s -eq 'manychat'){ return 'ManyChat' }
  if($s -eq 'whatsapp' -or $s -eq 'wpp'){ return 'WhatsApp' }
  return (TitleFirst $src) }
# lead de teste: e-mail da agencia, ou source/medium = "teste*"
function IsTest($mail,$src,$med){
  if((Deaccent $mail) -like "*$AGENCY*"){ return $true }
  $s=Deaccent $src; $m=Deaccent $med
  if($s -eq 'teste' -or $s -like 'teste[-_ ]*'){ return $true }
  if($m -eq 'teste' -or $m -like 'teste[-_ ]*'){ return $true }
  return $false }

# ---- LEAD SCORING A / B / C (perfil comprador, docs Prosperus L17-L20) --
# Modelo dos 3 documentos (Protocolo de exclusao/escala, Diagnostico, Perfil):
# 53.363 respondentes, 652 compradores, conversao media 1,22%. O eixo e
# idade x CAPACIDADE FINANCEIRA. capacidade = renda >= R$5.000 OU disponivel
# >= R$500/mes. A = perseguir; C = cortar; B = miolo (nem escalar nem cortar).
#   A (perseguir): 40+ E (capacidade OU renda estavel de servidor/aposentado). Converte ~2,5% (2x media).
#   C (cortar):    abaixo de 40 E disponivel = Ate R$100/mes. Converte ~0,27% (a pior faixa).
#   B (miolo):     o resto.
function HasCap($renda,$dispon){ $r=Deaccent $renda; $d=Deaccent $dispon
  $rc = ($r -like '*5.000 e r$10*' -or $r -like '*mais de r$10*')
  $dc = ($d -like '*500 a r$1.000*' -or $d -like '*1.000 a r$5*' -or $d -like '*mais de r$5*')
  return ($rc -or $dc) }
function Age40p($v){ $a=Deaccent $v; return ($a -like '*40 a 49*' -or $a -like '*mais de 50*') }
function AgeUnder40($v){ $a=Deaccent $v; return ($a -like '*18 a 24*' -or $a -like '*25 a 30*' -or $a -like '*31 a 39*') }
function LeadClass($idade,$momento,$renda,$dispon){
  $m=Deaccent $momento; $d=Deaccent $dispon
  $estavel = ($m -like '*servidor publico*' -or $m -like '*aposent*' -or $m -like '*pensionista*')
  if( (Age40p $idade) -and ((HasCap $renda $dispon) -or $estavel) ){ return 'A' }
  if( (AgeUnder40 $idade) -and ($d -like '*ate r$100*') ){ return 'C' }
  return 'B' }
# indices de resposta p/ a aba Perfil do Lead (0-based; -1 = nao respondeu/nao mapeado)
function IdxIdade($v){ $a=Deaccent $v; if($a -like '*18 a 24*'){0}elseif($a -like '*25 a 30*'){1}elseif($a -like '*31 a 39*'){2}elseif($a -like '*40 a 49*'){3}elseif($a -like '*mais de 50*'){4}else{-1} }
function IdxMomento($v){ $a=Deaccent $v; if($a -eq ''){-1}elseif($a -like '*clt*'){0}elseif($a -like '*autonomo*' -or $a -like '*mei*'){1}elseif($a -like '*servidor publico*'){2}elseif($a -like '*nao estou trabalhando*'){3}elseif($a -like '*estudante*'){4}elseif($a -like '*aposent*' -or $a -like '*pensionista*'){5}else{6} }
function IdxRenda($v){ $a=Deaccent $v; if($a -like '*nao possuo*'){0}elseif($a -like '*menos de r$1.000*'){1}elseif($a -like '*1.000 e r$2*'){2}elseif($a -like '*2.000 e r$5*'){3}elseif($a -like '*5.000 e r$10*'){4}elseif($a -like '*mais de r$10*'){5}else{-1} }
function IdxDispon($v){ $a=Deaccent $v; if($a -like '*ate r$100*'){0}elseif($a -like '*100 a r$500*'){1}elseif($a -like '*500 a r$1.000*'){2}elseif($a -like '*1.000 a r$5*'){3}elseif($a -like '*mais de r$5*'){4}else{-1} }
function IdxInvest($v){ $a=Deaccent $v; if($a -like '*ainda nao investi*'){0}elseif($a -like '*ate r$10.000*'){1}elseif($a -like '*10.000 a r$50*'){2}elseif($a -like '*50.000 a r$100*'){3}elseif($a -like '*100.000 a r$500*'){4}elseif($a -like '*500.000 a r$1.000.000*'){5}elseif($a -like '*mais de r$1.000.000*'){6}else{-1} }
function IdxCurso($v){ $a=Deaccent $v; if($a -like '*aluno*'){2}elseif($a -like 'sim*'){1}elseif($a -like 'nao*'){0}else{-1} }
function Cell($r,$i){ if($i -ge 0 -and $r.Count -gt $i){ return $r[$i] } return '' }
function Bump($h,$k){ if($null -eq $k -or $k -eq ''){return}; if(-not $h.ContainsKey($k)){$h[$k]=0}; $h[$k]++ }
# interna um valor numa lista (p/ indices compactos no resp da aba Perfil)
function InternL($val,$list,$map){ if(-not $map.ContainsKey($val)){ $map[$val]=$list.Count; [void]$list.Add($val) }; return $map[$val] }
function DistArr($h){ $out=@(); foreach($e in ($h.GetEnumerator()|Sort-Object Value -Descending)){ if([string]$e.Key -eq ''){continue}; $out+=[pscustomobject]@{label=[string]$e.Key;n=[int]$e.Value} }; return ,@($out) }
function Sum0($arr,$p){ $s=($arr|Measure-Object $p -Sum).Sum; if($null -eq $s){return 0}; return $s }

# nomes reais das queries (p/ casar a atribuicao), por canal.
# AD_051 pode aparecer em 2 campanhas Meta -> casar por CAMPANHA+ANUNCIO (nao so anuncio)
function BuildSets($rows,$ci,$si,$ai){
  $S=@{campSet=@();campDe=@{};adDe=@{};campAdToAdset=@{}}
  foreach($r in $rows){
    if($null -eq $r -or $ci -lt 0 -or $r.Count -le $ci){ continue }
    $cn=Norm $r[$ci]; $sn= if($si -ge 0 -and $r.Count -gt $si){Norm $r[$si]}else{''}; $an= if($ai -ge 0 -and $r.Count -gt $ai){Norm $r[$ai]}else{''}
    if($cn -ne '' -and ($S.campSet -notcontains $cn)){ $S.campSet+=$cn; $S.campDe[(Deaccent $cn)]=$cn }
    if($an -ne ''){ $S.adDe[(Deaccent $an)]=$an }
    if($cn -ne '' -and $an -ne '' -and $sn -ne ''){ $S.campAdToAdset[(Deaccent $cn)+'||'+(Deaccent $an)]=$sn }
  }
  return $S
}
# atribui um lead a um canal: casa utm_campaign -> campanha do canal; utm_content -> anuncio; conjunto/adgroup derivado
function Attribute($camp,$cont,$S){
  $v=Norm $camp; $cName=''
  if($v -ne ''){ if($S.campSet -contains $v){ $cName=$v } else { $dd=Deaccent $v; if($S.campDe.ContainsKey($dd)){ $cName=$S.campDe[$dd] } } }
  if($cName -eq ''){ return $null }   # nao e desse canal
  $c2=Norm $cont; $aName=$SENT; $sName=$SENT
  if($c2 -ne ''){ $add=Deaccent $c2; $aRaw= if($S.adDe.ContainsKey($add)){$S.adDe[$add]}else{''}
    $key=(Deaccent $cName)+'||'+$add
    if($aRaw -ne '' -and $S.campAdToAdset.ContainsKey($key)){ $aName=$aRaw; $sName=$S.campAdToAdset[$key] } }
  return @{camp=$cName;adset=$sName;ad=$aName}
}
function NowBR(){
  foreach($tz in @('E. South America Standard Time','America/Sao_Paulo')){
    try { return [System.TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTime]::UtcNow,$tz).ToString('dd/MM/yyyy HH:mm') } catch {}
  }
  return [DateTime]::UtcNow.AddHours(-3).ToString('dd/MM/yyyy HH:mm')
}

# =====================================================================
#  BUILD-FUNNEL  ->  monta o payload de UM funil (retorna pscustomobject)
#  As funcoes GetDay/GetGrain mutam $daily/$grain locais desta funcao
#  (escopo dinamico do PowerShell: elas leem $daily/$grain do chamador).
# =====================================================================
function GetDay($ch,$d){ $k=$ch+'|'+$d; if(-not $daily.ContainsKey($k)){ $daily[$k]=[pscustomobject]@{channel=$ch;date=$d;spend=0.0;impr=0;reach=0;clicks=0;lpv=0;platLeads=0;leads=0;la=0;lb=0;lc=0;byFase=@{}} }; return $daily[$k] }
function GetGrain($ch,$d,$c,$s,$a){ $key=($ch+[char]31+$d+[char]31+$c+[char]31+$s+[char]31+$a)
  if(-not $grain.ContainsKey($key)){ $grain[$key]=[pscustomobject]@{channel=$ch;date=$d;campaign=$c;adset=$s;ad=$a;spend=0.0;impr=0;reach=0;clicks=0;lpv=0;platLeads=0;leads=0;la=0;lb=0;lc=0;byFase=@{}} }
  return $grain[$key] }
# acumula lead por FASE (tag SIP-S1/SIP-S2/...) dentro de um daily/grain
function FaseAdd($o,$tag,$field){ if($tag -eq ''){$tag='(sem tag)'}; if(-not $o.byFase.ContainsKey($tag)){ $o.byFase[$tag]=@{leads=0;la=0;lb=0;lc=0} }; $o.byFase[$tag][$field]++ }

function Build-Funnel($cfg){
  $name=$cfg.label
  Write-Host ("===== Funil {0} ({1}) =====" -f $name,$cfg.key)
  $dataDir = Join-Path $root ("data/"+$cfg.key)
  New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

  # ---- download queries (Meta + Google) ----
  $qCsv=Join-Path $dataDir 'queries.csv'; $qgCsv=Join-Path $dataDir 'queries_google.csv'
  Get-Sheet $cfg.queriesId $cfg.metaGid   $qCsv
  Get-Sheet $cfg.queriesId $cfg.googleGid $qgCsv
  $q = Read-Csv $qCsv;  $qh=$q[0];  $qd=$q[1..($q.Count-1)]
  $qg= Read-Csv $qgCsv; $qgh=$qg[0]; $qgd=$qg[1..($qg.Count-1)]

  # ---- download leads (pode estar restrito: degrada p/ funil sem leads) ----
  $ld=@(); $lh=@(); $leadsOk=$true
  try {
    $lCsv=Join-Path $dataDir 'leads.csv'; Get-Sheet $cfg.leadsId $cfg.leadsGid $lCsv
    $l = Read-Csv $lCsv; $lh=$l[0]; $ld=$l[1..($l.Count-1)]
  } catch { $leadsOk=$false; Write-Host ("AVISO: planilha de leads inacessivel ("+$_.Exception.Message+")") }

  # ---- indices de coluna (META) ----
  $Q_DAY=HdrLike $qh 'day'; $Q_CAMP=HdrLike $qh 'campaign name'; $Q_SET=HdrLike $qh 'ad set name'; $Q_AD=HdrLike $qh 'ad name'
  $Q_SPEND=HdrLike $qh 'amount spent'; $Q_IMP=HdrLike $qh 'impressions'; $Q_REACH=HdrLike $qh 'reach'
  $Q_CLK=HdrLike $qh 'link clicks'; $Q_LPV=HdrLike $qh 'landing page views'; $Q_ML=HdrLike $qh 'leads'
  foreach($pair in @(@('Day',$Q_DAY),@('Campaign',$Q_CAMP),@('Ad Set',$Q_SET),@('Amount Spent',$Q_SPEND),@('Reach',$Q_REACH))){
    if($pair[1] -lt 0){ throw ("[$name] Coluna Meta nao encontrada: "+$pair[0]) }
  }
  # ---- indices de coluna (GOOGLE: Ad Group; Cost; Clicks; Conversions; sem Reach/LPV) ----
  $G_DAY=HdrLike $qgh 'day'; $G_CAMP=HdrLike $qgh 'campaign name'; $G_SET=HdrLike $qgh 'ad group name'; $G_AD=HdrLike $qgh 'ad name'
  $G_SPEND=HdrLike $qgh '*cost*'; $G_IMP=HdrLike $qgh 'impressions'; $G_CLK=HdrLike $qgh 'clicks'; $G_CONV=HdrLike $qgh 'conversions'

  # ---- indices de coluna (LEADS) ----
  $L_DATE=-1;$L_CREATED=-1;$L_MAIL=-1;$L_USRC=-1;$L_UMED=-1;$L_UCONT=-1;$L_UTERM=-1;$L_UCAMP=-1;$L_STATE=-1;$L_CITY=-1;$L_TAG=-1
  if($leadsOk){
    $L_DATE=HdrLike $lh 'date'; $L_CREATED=HdrLike $lh 'createdat'; $L_MAIL=HdrLike $lh 'email'
    $L_USRC=HdrLike $lh 'utm_source'; $L_UMED=HdrLike $lh 'utm_medium'; $L_UCONT=HdrLike $lh 'utm_content'
    $L_UTERM=HdrLike $lh 'utm_term'; $L_UCAMP=HdrLike $lh 'utm_campaign'
    $L_STATE=HdrLike $lh 'state'; $L_CITY=HdrLike $lh 'city'; $L_TAG=HdrLike $lh 'tag'
    if($L_MAIL -lt 0 -or $L_UCAMP -lt 0){ $leadsOk=$false; Write-Host ("AVISO: [$name] leads sem colunas esperadas (email/utm_campaign) -> funil sem leads") }
  }

  # ---- mapas de atribuicao por canal ----
  $MS = BuildSets $qd  $Q_CAMP $Q_SET $Q_AD    # Meta
  $GS = BuildSets $qgd $G_CAMP $G_SET $G_AD    # Google

  # ---- estado local (mutado por GetDay/GetGrain via escopo dinamico) ----
  $daily=@{}; $grain=@{}

  # ---- META queries (gasto x imposto, com Reach/LPV) ----
  foreach($r in $qd){ if($null -eq $r -or $r.Count -le $Q_DAY){continue}; $d=Norm $r[$Q_DAY]; if($d -notmatch '^\d{4}-\d{2}-\d{2}$'){continue}
    $sp=(MoneyBR $r[$Q_SPEND])*$TAX; $im=ToInt $r[$Q_IMP]; $rc=ToInt $r[$Q_REACH]; $ck=ToInt (Cell $r $Q_CLK); $lp=ToInt (Cell $r $Q_LPV); $ml=ToInt (Cell $r $Q_ML)
    $o=GetDay 'meta' $d; $o.spend+=$sp;$o.impr+=$im;$o.reach+=$rc;$o.clicks+=$ck;$o.lpv+=$lp;$o.platLeads+=$ml
    $g=GetGrain 'meta' $d (Norm $r[$Q_CAMP]) (Norm (Cell $r $Q_SET)) (Norm (Cell $r $Q_AD))
    $g.spend+=$sp;$g.impr+=$im;$g.reach+=$rc;$g.clicks+=$ck;$g.lpv+=$lp;$g.platLeads+=$ml }

  # ---- GOOGLE queries (gasto SEM imposto; Clicks; Conversions; sem Reach/LPV) ----
  if($G_DAY -ge 0){ foreach($r in $qgd){ if($null -eq $r -or $r.Count -le $G_DAY){ continue }
    $d=Norm $r[$G_DAY]; if($d -notmatch '^\d{4}-\d{2}-\d{2}$'){continue}
    $sp=(MoneyBR (Cell $r $G_SPEND))*$TAXG; $im=ToInt (Cell $r $G_IMP); $ck=ToInt (Cell $r $G_CLK); $cv=ToInt (Cell $r $G_CONV)
    $o=GetDay 'google' $d; $o.spend+=$sp;$o.impr+=$im;$o.clicks+=$ck;$o.platLeads+=$cv
    $g=GetGrain 'google' $d (Norm (Cell $r $G_CAMP)) (Norm (Cell $r $G_SET)) (Norm (Cell $r $G_AD))
    $g.spend+=$sp;$g.impr+=$im;$g.clicks+=$ck;$g.platLeads+=$cv } }

  # ---- leads: filtra teste, classifica origem e atribui --------------
  $leadRows=New-Object System.Collections.Generic.List[object]
  $dState=@{}; $dCity=@{}; $dChannel=@{}; $leadMails=@{}; $nTest=0
  $srcDay=@{}; $paidDay=@{}; $srcTot=@{}   # diario por rede + pago/org por dia
  $leadUtm=@{}   # email -> {fonte(rede), meio(utm_medium), campanha(utm_campaign)} p/ os filtros da aba Perfil
  if($leadsOk){ foreach($r in $ld){
    if($null -eq $r -or $r.Count -le $L_UCAMP){ continue }
    $mail=Norm $r[$L_MAIL]
    $tag = if($L_TAG -ge 0 -and $r.Count -gt $L_TAG){ Norm $r[$L_TAG] } else { '' }
    $src=Norm $r[$L_USRC]; $med=Norm $r[$L_UMED]; $camp=Norm $r[$L_UCAMP]; $cont=Norm $r[$L_UCONT]; $term=Norm $r[$L_UTERM]
    if($mail -eq ''){ continue }
    if(IsTest $mail $src $med){ $nTest++; continue }
    $d=LeadDate $r[$L_DATE]; if($d -eq '' -and $L_CREATED -ge 0){ $d=IsoDate $r[$L_CREATED] }; if($d -eq ''){ $d='sem-data' }
    $paid = IsPaid $src $med
    $chan = Channel $src
    $stt = if($L_STATE -ge 0 -and $r.Count -gt $L_STATE){ TitleFirst $r[$L_STATE] } else { '' }
    $cty = if($L_CITY  -ge 0 -and $r.Count -gt $L_CITY ){ TitleFirst $r[$L_CITY]  } else { '' }
    # atribuicao por CANAL: casa 1o com Meta, senao com Google, senao organico/sem rastreio
    $plat=''; $at=Attribute $camp $cont $MS
    if($null -ne $at){ $plat='meta' } else { $at=Attribute $camp $cont $GS; if($null -ne $at){ $plat='google' } }
    if($plat -ne ''){
      $cName=$at.camp; $sName=$at.adset; $aName=$at.ad
      if($d -ne 'sem-data'){ $o=GetDay $plat $d; $o.leads++; FaseAdd $o $tag 'leads' }
      $g=GetGrain $plat $d $cName $sName $aName; $g.leads++; FaseAdd $g $tag 'leads'
    } else { $cName=$SENT; $sName=$SENT; $aName=$SENT }
    Bump $dState $stt; Bump $dCity $cty; Bump $dChannel $chan
    # ---- diario: leads por rede (granular) + pago/org por dia ----
    if($d -match '^\d{4}-\d{2}-\d{2}$'){
      $rede = SourceGran $src $med $term
      if(-not $srcTot.ContainsKey($rede)){ $srcTot[$rede]=0 }; $srcTot[$rede]++
      if(-not $srcDay.ContainsKey($d)){ $srcDay[$d]=@{} }
      if(-not $srcDay[$d].ContainsKey($rede)){ $srcDay[$d][$rede]=0 }; $srcDay[$d][$rede]++
      if(-not $paidDay.ContainsKey($d)){ $paidDay[$d]=@{pago=0;org=0} }
      if($paid){ $paidDay[$d].pago++ } else { $paidDay[$d].org++ }
    }
    $em=$mail.ToLower(); if($em -ne ''){ $leadMails[$em]=$true; if(-not $leadUtm.ContainsKey($em)){ $leadUtm[$em]=@{s=$chan; m=(Deaccent $med); c=$camp; t=$tag} } }
    $leadRows.Add([pscustomobject]@{date=$d;paid=$paid;channel=$chan;plat=$plat;state=$stt;city=$cty;camp=$cName;adset=$sName;ad=$aName;qmail=$em;tag=$tag})
  } }

  # ===================================================================
  #  PESQUISA + GRUPOS  (aba engajamento) — mesma planilha dos leads
  # ===================================================================
  $leadsByDay=@{}; foreach($lr in $leadRows){ if($lr.date -match '^\d{4}-\d{2}-\d{2}$'){ if(-not $leadsByDay.ContainsKey($lr.date)){$leadsByDay[$lr.date]=0}; $leadsByDay[$lr.date]++ } }

  # ---- PESQUISA (respostas por pessoa; cruza por e-mail; classe A/B/C do perfil) ----
  $survTotal=0; $survDone=0; $survInc=0; $survDoneByDay=@{}; $survAllByDay=@{}; $respMails=@{}; $respProfile=@{}
  if($leadsOk){ try {
    $pCsv=Join-Path $dataDir 'pesquisa.csv'; Get-SheetByName $cfg.leadsId 'pesquisa' $pCsv
    $pp=Read-Csv $pCsv; $ph=$pp[0]; $pdRows=$pp[1..($pp.Count-1)]
    $P_MAIL=HdrLike $ph '*mail*'; $P_STATUS=HdrLike $ph 'status'; $P_DATE=HdrLike $ph 'date'
    $P_IDADE=HdrLike $ph '*idade*'; $P_MOM=HdrLike $ph '*momento profissional*'; $P_INVEST=HdrLike $ph '*ja investiu*'
    $P_RENDA=HdrLike $ph '*faixa de renda*'; $P_DISPON=HdrLike $ph '*disponivel para investir*'; $P_CURSO=HdrLike $ph '*comprou algum curso*'
    foreach($r in $pdRows){
      if($null -eq $r -or $r.Count -eq 0){ continue }
      $pm = if($P_MAIL -ge 0 -and $r.Count -gt $P_MAIL){ (Norm $r[$P_MAIL]).ToLower() } else { '' }
      $pst= if($P_STATUS -ge 0 -and $r.Count -gt $P_STATUS){ Deaccent $r[$P_STATUS] } else { '' }
      $pd = if($P_DATE -ge 0 -and $r.Count -gt $P_DATE){ LeadDate $r[$P_DATE] } else { '' }
      if($pm -eq '' -and $pst -eq '' -and $pd -eq ''){ continue }
      $done = ($pst -eq 'completed' -or $pst -eq 'complete')
      $survTotal++; if($done){ $survDone++ } elseif($pst -eq 'incomplete'){ $survInc++ }
      # SO classifica quem COMPLETOU (incompletos/em branco nao dao pra pontuar A/B/C e poluiriam)
      if($done -and $pm -ne ''){ $respMails[$pm]=$true
        $vId=Cell $r $P_IDADE; $vMo=Cell $r $P_MOM; $vRe=Cell $r $P_RENDA; $vDi=Cell $r $P_DISPON; $vIn=Cell $r $P_INVEST; $vCu=Cell $r $P_CURSO
        # mantem a resposta MAIS RECENTE por e-mail (data desc); empate -> primeira
        if(-not $respProfile.ContainsKey($pm) -or ($pd -ne '' -and $pd -gt $respProfile[$pm].date)){
          $respProfile[$pm]=@{ date=$pd; cls=(LeadClass $vId $vMo $vRe $vDi); a=(IdxIdade $vId); m=(IdxMomento $vMo); r=(IdxRenda $vRe); p=(IdxDispon $vDi); v=(IdxInvest $vIn); u=(IdxCurso $vCu) }
        }
      }
      if($pd -ne ''){ Bump $survAllByDay $pd; if($done){ Bump $survDoneByDay $pd } }
    }
  } catch { Write-Host ("AVISO: [$name] aba pesquisa nao lida: "+$_.Exception.Message) } }
  $respLeads=0; foreach($m in $respMails.Keys){ if($leadMails.ContainsKey($m)){ $respLeads++ } }

  # ---- CLASSE A/B/C por lead atribuido: acumula por dia/grain (p/ CPL A/B/C e Acao) ----
  $totA=0;$totB=0;$totC=0; $qLeadsResp=0
  foreach($lr in $leadRows){
    $em=$lr.qmail; if($em -eq '' -or -not $respProfile.ContainsKey($em)){ continue }
    $qLeadsResp++; $cls=$respProfile[$em].cls
    if($cls -eq 'A'){$totA++}elseif($cls -eq 'C'){$totC++}else{$totB++}
    if($lr.plat -ne ''){
      $o = if($lr.date -match '^\d{4}-\d{2}-\d{2}$'){ GetDay $lr.plat $lr.date } else { $null }
      $g = GetGrain $lr.plat $lr.date $lr.camp $lr.adset $lr.ad
      $fld= if($cls -eq 'A'){'la'}elseif($cls -eq 'C'){'lc'}else{'lb'}
      if($o){ $o.$fld++; FaseAdd $o $lr.tag $fld }; $g.$fld++; FaseAdd $g $lr.tag $fld
    }
  }
  # ---- FASES (tags SIP-S1/SIP-S2/... da planilha de leads) ----
  $faseKeys=@($leadRows | ForEach-Object { if($_.tag -ne ''){$_.tag}else{'(sem tag)'} } | Sort-Object -Unique)
  $faseIdxMap=@{}; for($fi2=0;$fi2 -lt $faseKeys.Count;$fi2++){ $faseIdxMap[$faseKeys[$fi2]]=$fi2 }

  # respRows (todos os respondentes, p/ a aba Perfil do Lead) — JSON manual injetado via placeholder
  # linha = [date, cls, idade, mom, renda, dispon, invest, curso, fonteIdx, meioIdx, campanhaIdx, faseIdx]
  $rsb=New-Object Text.StringBuilder; [void]$rsb.Append('['); $rfirst=$true; $rA=0;$rB=0;$rC=0
  $srcL=New-Object System.Collections.Generic.List[string]; $srcMap=@{}
  $medL=New-Object System.Collections.Generic.List[string]; $medMap=@{}
  $campL=New-Object System.Collections.Generic.List[string]; $campMap=@{}
  foreach($em in $respProfile.Keys){
    $e=$respProfile[$em]
    if($e.cls -eq 'A'){$rA++}elseif($e.cls -eq 'C'){$rC++}else{$rB++}
    $u = if($leadUtm.ContainsKey($em)){ $leadUtm[$em] } else { @{s='(sem lead)';m='';c='';t='(sem tag)'} }
    $si=InternL $u.s $srcL $srcMap
    $mi=InternL $(if($u.m -eq ''){'(sem meio)'}else{$u.m}) $medL $medMap
    $cp= if($u.c -eq ''){'(sem campanha)'}elseif($u.c -match '\|'){ (($u.c -split '\|')[-1]).Trim() }else{ $u.c }
    $ci=InternL $cp $campL $campMap
    $ftag= if($u.t -and $u.t -ne ''){$u.t}else{'(sem tag)'}
    $f2= if($faseIdxMap.ContainsKey($ftag)){ $faseIdxMap[$ftag] } else { -1 }
    if(-not $rfirst){ [void]$rsb.Append(',') }; $rfirst=$false
    [void]$rsb.Append('["'+$e.date+'","'+$e.cls+'",'+$e.a+','+$e.m+','+$e.r+','+$e.p+','+$e.v+','+$e.u+','+$si+','+$mi+','+$ci+','+$f2+']')
  }
  [void]$rsb.Append(']'); $respJson=$rsb.ToString()

  # ---- GRUPOS (agregado diario: Data/Entrou/Saiu) ----
  $grpIn=0; $grpOut=0; $grpInByDay=@{}; $grpOutByDay=@{}
  if($leadsOk){ try {
    $gCsv=Join-Path $dataDir 'grupos.csv'; Get-SheetByName $cfg.leadsId 'grupos' $gCsv
    $gg=Read-Csv $gCsv; $gh=$gg[0]; $gdRows=$gg[1..($gg.Count-1)]
    $G_DATA=HdrLike $gh 'data'; $G_IN=HdrLike $gh 'entrou'; $G_OUT=HdrLike $gh 'saiu'
    foreach($r in $gdRows){
      if($null -eq $r -or $r.Count -le $G_DATA){ continue }
      $gd=LeadDate $r[$G_DATA]; if($gd -eq ''){ continue }
      $ein = if($G_IN  -ge 0 -and $r.Count -gt $G_IN ){ ToInt $r[$G_IN]  } else { 0 }
      $eout= if($G_OUT -ge 0 -and $r.Count -gt $G_OUT){ ToInt $r[$G_OUT] } else { 0 }
      $grpIn+=$ein; $grpOut+=$eout
      if(-not $grpInByDay.ContainsKey($gd)){ $grpInByDay[$gd]=0 }; $grpInByDay[$gd]+=$ein
      if(-not $grpOutByDay.ContainsKey($gd)){ $grpOutByDay[$gd]=0 }; $grpOutByDay[$gd]+=$eout
    }
  } catch { Write-Host ("AVISO: [$name] aba grupos nao lida: "+$_.Exception.Message) } }

  # ---- serie diaria unificada (leads x pesquisa x grupos) ----
  $engDates = New-Object System.Collections.Generic.List[string]
  foreach($k in @($leadsByDay.Keys)+@($survDoneByDay.Keys)+@($survAllByDay.Keys)+@($grpInByDay.Keys)+@($grpOutByDay.Keys)){
    if($k -match '^\d{4}-\d{2}-\d{2}$' -and ($engDates -notcontains $k)){ [void]$engDates.Add($k) }
  }
  $engByDay=@()
  foreach($k in ($engDates | Sort-Object)){
    $engByDay += [pscustomobject]@{
      date=$k
      leads   = $(if($leadsByDay.ContainsKey($k)){$leadsByDay[$k]}else{0})
      survey  = $(if($survDoneByDay.ContainsKey($k)){$survDoneByDay[$k]}else{0})
      surveyAll = $(if($survAllByDay.ContainsKey($k)){$survAllByDay[$k]}else{0})
      groupIn = $(if($grpInByDay.ContainsKey($k)){$grpInByDay[$k]}else{0})
      groupOut= $(if($grpOutByDay.ContainsKey($k)){$grpOutByDay[$k]}else{0})
    }
  }

  # ---- arrays finais (por FASE: gasto rateado pela participacao de leads de cada fase no dia) ----
  $dailyL=New-Object System.Collections.Generic.List[object]
  foreach($rec in $daily.Values){ $tl=$rec.leads
    if($tl -gt 0){ foreach($f in $rec.byFase.Keys){ $bf=$rec.byFase[$f]; $sh=$bf.leads/$tl
      $dailyL.Add([pscustomobject]@{channel=$rec.channel;date=$rec.date;fase=$f;spend=($rec.spend*$sh);impr=[int][math]::Round($rec.impr*$sh);reach=[int][math]::Round($rec.reach*$sh);clicks=[int][math]::Round($rec.clicks*$sh);lpv=[int][math]::Round($rec.lpv*$sh);platLeads=[int][math]::Round($rec.platLeads*$sh);leads=$bf.leads;la=$bf.la;lb=$bf.lb;lc=$bf.lc}) } }
    elseif($rec.spend -gt 0 -or $rec.impr -gt 0){ $dailyL.Add([pscustomobject]@{channel=$rec.channel;date=$rec.date;fase='(sem fase)';spend=$rec.spend;impr=$rec.impr;reach=$rec.reach;clicks=$rec.clicks;lpv=$rec.lpv;platLeads=$rec.platLeads;leads=0;la=0;lb=0;lc=0}) } }
  $dailyArr=@($dailyL | Sort-Object date)
  $grainL=New-Object System.Collections.Generic.List[object]
  foreach($rec in $grain.Values){ if(-not ($rec.spend -gt 0 -or $rec.leads -gt 0)){ continue }; $tl=$rec.leads
    if($tl -gt 0){ foreach($f in $rec.byFase.Keys){ $bf=$rec.byFase[$f]; $sh=$bf.leads/$tl
      $grainL.Add([pscustomobject]@{channel=$rec.channel;date=$rec.date;campaign=$rec.campaign;adset=$rec.adset;ad=$rec.ad;fase=$f;spend=($rec.spend*$sh);impr=[int][math]::Round($rec.impr*$sh);reach=[int][math]::Round($rec.reach*$sh);clicks=[int][math]::Round($rec.clicks*$sh);lpv=[int][math]::Round($rec.lpv*$sh);platLeads=[int][math]::Round($rec.platLeads*$sh);leads=$bf.leads;la=$bf.la;lb=$bf.lb;lc=$bf.lc}) } }
    else { $grainL.Add([pscustomobject]@{channel=$rec.channel;date=$rec.date;campaign=$rec.campaign;adset=$rec.adset;ad=$rec.ad;fase='(sem fase)';spend=$rec.spend;impr=$rec.impr;reach=$rec.reach;clicks=$rec.clicks;lpv=$rec.lpv;platLeads=$rec.platLeads;leads=0;la=0;lb=0;lc=0}) } }
  $grainArr=@($grainL | Sort-Object date)
  $dates=@($dailyArr | Where-Object { $_.date -match '^\d{4}-\d{2}-\d{2}$' } | ForEach-Object { $_.date } | Sort-Object -Unique)
  $leadDates=@($leadRows | Where-Object { $_.date -match '^\d{4}-\d{2}-\d{2}$' } | ForEach-Object { $_.date } | Sort-Object)

  # ---- diario: leads por rede (ordenado por volume) + pago/org por dia ----
  $srcOrder = @($srcTot.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object { $_.Key })
  $srcDaily = @()
  foreach($dt in ($srcDay.Keys | Sort-Object)){ if($dt -notmatch '^\d{4}-\d{2}-\d{2}$'){continue}
    $vals=[ordered]@{}; foreach($lbl in $srcOrder){ if($srcDay[$dt].ContainsKey($lbl)){ $vals[$lbl]=$srcDay[$dt][$lbl] } }
    $srcDaily += [pscustomobject]@{ date=$dt; vals=[pscustomobject]$vals } }
  $paidDaily = @()
  foreach($dt in ($paidDay.Keys | Sort-Object)){ if($dt -notmatch '^\d{4}-\d{2}-\d{2}$'){continue}
    $paidDaily += [pscustomobject]@{ date=$dt; pago=[int]$paidDay[$dt].pago; org=[int]$paidDay[$dt].org } }

  $paidCount=@($leadRows|Where-Object{$_.paid}).Count
  $attribCount=@($leadRows|Where-Object{$_.plat -ne ''}).Count
  $metaDaily=@($dailyArr|Where-Object{$_.channel -eq 'meta'}); $gglDaily=@($dailyArr|Where-Object{$_.channel -eq 'google'})
  $tot=[pscustomobject]@{
    spend=(Sum0 $dailyArr 'spend'); impr=(Sum0 $dailyArr 'impr'); reach=(Sum0 $dailyArr 'reach')
    clicks=(Sum0 $dailyArr 'clicks'); lpv=(Sum0 $dailyArr 'lpv'); platLeads=(Sum0 $dailyArr 'platLeads')
    leads=$leadRows.Count; paid=$paidCount; organic=($leadRows.Count-$paidCount); attributed=$attribCount; tests=$nTest
    leadsA=$totA; leadsB=$totB; leadsC=$totC; respondedLeads=$qLeadsResp
    states=(@($dState.Keys|Where-Object{$_ -ne ''}).Count); cities=(@($dCity.Keys|Where-Object{$_ -ne ''}).Count)
  }
  $byChannel=@(
    [pscustomobject]@{ch='meta';   spend=(Sum0 $metaDaily 'spend'); impr=(Sum0 $metaDaily 'impr'); clicks=(Sum0 $metaDaily 'clicks'); leads=(Sum0 $metaDaily 'leads'); la=(Sum0 $metaDaily 'la'); lb=(Sum0 $metaDaily 'lb'); lc=(Sum0 $metaDaily 'lc'); platLeads=(Sum0 $metaDaily 'platLeads')}
    [pscustomobject]@{ch='google'; spend=(Sum0 $gglDaily 'spend'); impr=(Sum0 $gglDaily 'impr'); clicks=(Sum0 $gglDaily 'clicks'); leads=(Sum0 $gglDaily 'leads'); la=(Sum0 $gglDaily 'la'); lb=(Sum0 $gglDaily 'lb'); lc=(Sum0 $gglDaily 'lc'); platLeads=(Sum0 $gglDaily 'platLeads')}
  )
  $bySource=@(
    [pscustomobject]@{src='pago';leads=$paidCount}
    [pscustomobject]@{src='organico';leads=($leadRows.Count-$paidCount)}
  )
  # ---- agregados de leads POR FASE (aba Leads · Visao Geral filtra por fase) — 1 passada ----
  $faB=@{}; foreach($fk in $faseKeys){ $faB[$fk]=@{ch=@{};st=@{};ct=@{};leads=0;paid=0;attr=0} }
  foreach($lr in $leadRows){ $fk= if($lr.tag -ne ''){$lr.tag}else{'(sem tag)'}; if(-not $faB.ContainsKey($fk)){ continue }; $b=$faB[$fk]
    $b.leads++; Bump $b.ch $lr.channel; Bump $b.st $lr.state; Bump $b.ct $lr.city; if($lr.paid){$b.paid++}; if($lr.plat -ne ''){$b.attr++} }
  $faseAgg=@{}
  foreach($fk in $faseKeys){ $b=$faB[$fk]
    $faseAgg[$fk]=[pscustomobject]@{
      leads=$b.leads; paid=$b.paid; organic=($b.leads-$b.paid); attributed=$b.attr
      states=(@($b.st.Keys|Where-Object{$_ -ne ''}).Count)
      channels=(DistArr $b.ch); geo=(DistArr $b.st); cities=(DistArr $b.ct)
    }
  }

  $payload=[pscustomobject]@{
    key=$cfg.key; label=$cfg.label; funnel=$cfg.label; leadsOk=$leadsOk
    taxMultiplier=$TAX; taxGoogle=$TAXG
    goal=[pscustomobject]@{ spend=[double]$cfg.goalSpend; date=[string]$cfg.goalDate }
    dateMin=$(if($dates.Count){$dates[0]}else{''}); dateMax=$(if($dates.Count){$dates[-1]}else{''})
    leadDateMin=$(if($leadDates.Count){$leadDates[0]}else{''}); leadDateMax=$(if($leadDates.Count){$leadDates[-1]}else{''})
    totals=$tot; byChannel=@($byChannel); bySource=@($bySource)
    channels=(DistArr $dChannel); geo=(DistArr $dState); cities=(DistArr $dCity)
    fases=@($faseKeys); faseAgg=[pscustomobject]$faseAgg
    srcOrder=@($srcOrder); srcDaily=@($srcDaily); paidDaily=@($paidDaily)
    engage=[pscustomobject]@{
      leads=$leadRows.Count
      survey=[pscustomobject]@{ total=$survTotal; completed=$survDone; incomplete=$survInc; respondents=$respProfile.Count; respondedLeads=$respLeads; distinctLeads=$leadMails.Count }
      groups=[pscustomobject]@{ entered=$grpIn; left=$grpOut; net=($grpIn-$grpOut) }
      byDay=@($engByDay)
    }
    lead=[pscustomobject]@{
      responded=$qLeadsResp; totalLeads=$leadRows.Count
      respTot=[pscustomobject]@{ A=$rA; B=$rB; C=$rC }
      ref=[pscustomobject]@{ docs='L17-L20 (Prosperus)'; respondents=53363; buyers=652; baseRate=1.22; convA=2.53; convC=0.27 }
    }
    resp='__RESP__'
    respLeg=[pscustomobject]@{ src=@($srcL); med=@($medL); camp=@($campL) }
    daily=@($dailyArr); grain=@($grainArr)
  }
  $json = $payload | ConvertTo-Json -Depth 12 -Compress
  $json = $json.Replace('"__RESP__"', $respJson)
  Write-Host ("  grain={0} leadsReais={1} pago={2} org={3} atrib={4} A/B/C={5}/{6}/{7} de {8}resp testes={9}  gasto=R$ {10}" -f `
    $grainArr.Count,$tot.leads,$tot.paid,$tot.organic,$tot.attributed,$totA,$totB,$totC,$qLeadsResp,$tot.tests,($tot.spend.ToString('N2',$BR)))
  Write-Host ("  META:  gasto=R$ {0}  leads={1} A={2}/B={3}/C={4}  |  GOOGLE: gasto=R$ {5}  leads={6} A={7}/B={8}/C={9}  |  leadsOk={10}" -f `
    ($byChannel[0].spend.ToString('N2',$BR)),$byChannel[0].leads,$byChannel[0].la,$byChannel[0].lb,$byChannel[0].lc,($byChannel[1].spend.ToString('N2',$BR)),$byChannel[1].leads,$byChannel[1].la,$byChannel[1].lb,$byChannel[1].lc,$leadsOk)
  return $json
}

# =====================================================================
#  RUN: monta os 2 funis e escreve window.SIP
# =====================================================================
$parts = New-Object System.Collections.Generic.List[string]
$funMeta = New-Object System.Collections.Generic.List[string]
foreach($f in $FUNNELS){
  $j = Build-Funnel $f
  $parts.Add(('"'+$f.key+'":'+$j))
  $funMeta.Add(('{"key":"'+$f.key+'","label":"'+$f.label+'"}'))
}
$nowIso=(Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
$nowBR=NowBR
$utf8=[System.Text.UTF8Encoding]::new($false)
$defaultKey=$FUNNELS[0].key
$out = 'window.SIP={"generatedAt":"'+$nowIso+'","generatedAtBR":"'+$nowBR+'","defaultFunnel":"'+$defaultKey+'","funnels":['+($funMeta -join ',')+'],"data":{'+($parts -join ',')+'}};'
[IO.File]::WriteAllText((Join-Path $root 'data.js'), $out, $utf8)
Write-Host ("OK  data.js escrito ({0} funis)  gerado {1}" -f $FUNNELS.Count,$nowBR)
