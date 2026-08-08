# =====================================================================
#  SIP-S1  -  Dashboard data engine  (funil de captacao)
#  Baixa 2 planilhas Google (gviz CSV), cruza leads x queries do Meta,
#  e escreve data.js (window.SIPS1) lido pela pagina estatica (index.html).
#  Roda local (PS 5.1) e no GitHub Actions.  Somente leitura - NAO altera
#  nenhuma planilha.  ASCII-only de proposito (PS5.1 le .ps1 como ANSI;
#  acentos so no front app.js).  SEM leadscore (captacao simples).
# =====================================================================
param([ValidateSet('all')][string]$Mode='all')
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$BR = [Globalization.CultureInfo]::GetCultureInfo('pt-BR')
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataDir = Join-Path $root 'data'
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

# ---- Fontes (somente leitura) --------------------------------------
$QUERIES_ID  = '1WKRLwQpK4xcoQENOZPk01qROgbTL9vLqTxyp8sfo_9A'; $QUERIES_GID  = '0'           # aba "Queries | Meta Ads SIP-S1"
$QUERIES_GIDG= '1609119011'                                                                  # aba "Queries | Google Ads SIP-S1"
$LEADS_ID    = '1nTJYpjYLlK8ZOfA-V9faNSuqz-oegrhccmOgGvrEzm0'; $LEADS_GID    = '566747937'   # aba "leads"
$TAX  = 1.1385          # imposto Meta (+13,85%) aplicado no gasto do Meta
$TAXG = 1.0             # Google Ads NAO tem imposto
$AGENCY = 'agenciaup13' # e-mail interno da agencia = lead de teste

function Get-Sheet($id,$gid,$out){
  $url = "https://docs.google.com/spreadsheets/d/$id/gviz/tq?tqx=out:csv&gid=$gid"
  [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
  (New-Object System.Net.WebClient).DownloadFile($url,$out)
  if((Get-Item $out).Length -lt 30){ throw "Download muito pequeno: $out" }
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
# canal de origem (rotulo curto p/ o breakdown)
function Channel($src){ $s=Deaccent $src
  if($s -eq ''){ return 'Direto / sem origem' }
  if($s -eq 'facebook-ads' -or $s -eq 'facebook' -or $s -eq 'fb'){ return 'Facebook Ads' }
  if($s -eq 'instagram' -or $s -eq 'ig'){ return 'Instagram' }
  if($s -eq 'youtube' -or $s -eq 'yt'){ return 'YouTube' }
  if($s -eq 'google' -or $s -like 'google*'){ return 'Google' }
  return (TitleFirst $src) }
# lead de teste: e-mail da agencia, ou source/medium = "teste*"
function IsTest($mail,$src,$med){
  if((Deaccent $mail) -like "*$AGENCY*"){ return $true }
  $s=Deaccent $src; $m=Deaccent $med
  if($s -eq 'teste' -or $s -like 'teste[-_ ]*'){ return $true }
  if($m -eq 'teste' -or $m -like 'teste[-_ ]*'){ return $true }
  return $false }

Write-Host "Baixando planilhas..."
$qCsv=Join-Path $dataDir 'queries.csv'; $lCsv=Join-Path $dataDir 'leads.csv'; $qgCsv=Join-Path $dataDir 'queries_google.csv'
Get-Sheet $QUERIES_ID $QUERIES_GID  $qCsv
Get-Sheet $QUERIES_ID $QUERIES_GIDG $qgCsv
Get-Sheet $LEADS_ID   $LEADS_GID    $lCsv
$q = Read-Csv $qCsv; $qh=$q[0]; $qd=$q[1..($q.Count-1)]
$qg= Read-Csv $qgCsv; $qgh=$qg[0]; $qgd=$qg[1..($qg.Count-1)]
$l = Read-Csv $lCsv; $lh=$l[0]; $ld=$l[1..($l.Count-1)]

# ---- indices de coluna (META) --------------------------------------
$Q_DAY=HdrLike $qh 'day'; $Q_CAMP=HdrLike $qh 'campaign name'; $Q_SET=HdrLike $qh 'ad set name'; $Q_AD=HdrLike $qh 'ad name'
$Q_SPEND=HdrLike $qh 'amount spent'; $Q_IMP=HdrLike $qh 'impressions'; $Q_REACH=HdrLike $qh 'reach'
$Q_CLK=HdrLike $qh 'link clicks'; $Q_LPV=HdrLike $qh 'landing page views'; $Q_ML=HdrLike $qh 'leads'
# ---- indices de coluna (GOOGLE: Ad Group no lugar de Ad Set; Cost; Clicks; Conversions; sem Reach/LPV) ----
$G_DAY=HdrLike $qgh 'day'; $G_CAMP=HdrLike $qgh 'campaign name'; $G_SET=HdrLike $qgh 'ad group name'; $G_AD=HdrLike $qgh 'ad name'
$G_SPEND=HdrLike $qgh '*cost*'; $G_IMP=HdrLike $qgh 'impressions'; $G_CLK=HdrLike $qgh 'clicks'; $G_CONV=HdrLike $qgh 'conversions'

$L_DATE=HdrLike $lh 'date'; $L_CREATED=HdrLike $lh 'createdat'; $L_MAIL=HdrLike $lh 'email'
$L_USRC=HdrLike $lh 'utm_source'; $L_UMED=HdrLike $lh 'utm_medium'; $L_UCONT=HdrLike $lh 'utm_content'
$L_UTERM=HdrLike $lh 'utm_term'; $L_UCAMP=HdrLike $lh 'utm_campaign'
$L_STATE=HdrLike $lh 'state'; $L_CITY=HdrLike $lh 'city'; $L_TAG=HdrLike $lh 'tag'

foreach($pair in @(@('Day',$Q_DAY),@('Campaign',$Q_CAMP),@('Ad Set',$Q_SET),@('Ad',$Q_AD),@('Amount Spent',$Q_SPEND),@('Reach',$Q_REACH),@('email',$L_MAIL),@('utm_campaign',$L_UCAMP),@('utm_content',$L_UCONT),@('state',$L_STATE))){
  if($pair[1] -lt 0){ throw ("Coluna nao encontrada: "+$pair[0]) }
}

# ---- nomes reais das queries (p/ casar a atribuicao), por canal -----
# AD_051 aparece em 2 campanhas Meta -> casar por CAMPANHA+ANUNCIO (nao so anuncio)
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
$MS = BuildSets $qd  $Q_CAMP $Q_SET $Q_AD    # Meta
$GS = BuildSets $qgd $G_CAMP $G_SET $G_AD    # Google
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

# ===================================================================
#  DAILY (funil por dia) + GRAIN (dia|campanha|conjunto|anuncio)
# ===================================================================
$daily=@{}
function GetDay($ch,$d){ $k=$ch+'|'+$d; if(-not $daily.ContainsKey($k)){ $daily[$k]=[pscustomobject]@{channel=$ch;date=$d;spend=0.0;impr=0;reach=0;clicks=0;lpv=0;platLeads=0;leads=0} }; return $daily[$k] }
$grain=@{}
function GetGrain($ch,$d,$c,$s,$a){ $key=($ch+[char]31+$d+[char]31+$c+[char]31+$s+[char]31+$a)
  if(-not $grain.ContainsKey($key)){ $grain[$key]=[pscustomobject]@{channel=$ch;date=$d;campaign=$c;adset=$s;ad=$a;spend=0.0;impr=0;reach=0;clicks=0;lpv=0;platLeads=0;leads=0} }
  return $grain[$key] }

# ---- META queries (gasto x imposto, com Reach/LPV) ----
foreach($r in $qd){ $d=Norm $r[$Q_DAY]; if($d -notmatch '^\d{4}-\d{2}-\d{2}$'){continue}
  $sp=(MoneyBR $r[$Q_SPEND])*$TAX; $im=ToInt $r[$Q_IMP]; $rc=ToInt $r[$Q_REACH]; $ck=ToInt $r[$Q_CLK]; $lp=ToInt $r[$Q_LPV]; $ml=ToInt $r[$Q_ML]
  $o=GetDay 'meta' $d; $o.spend+=$sp;$o.impr+=$im;$o.reach+=$rc;$o.clicks+=$ck;$o.lpv+=$lp;$o.platLeads+=$ml
  $g=GetGrain 'meta' $d (Norm $r[$Q_CAMP]) (Norm $r[$Q_SET]) (Norm $r[$Q_AD])
  $g.spend+=$sp;$g.impr+=$im;$g.reach+=$rc;$g.clicks+=$ck;$g.lpv+=$lp;$g.platLeads+=$ml }

# ---- GOOGLE queries (gasto SEM imposto; Clicks; Conversions; sem Reach/LPV) ----
function Cell($r,$i){ if($i -ge 0 -and $r.Count -gt $i){ return $r[$i] } return '' }
if($G_DAY -ge 0){ foreach($r in $qgd){ if($null -eq $r -or $r.Count -le $G_DAY){ continue }
  $d=Norm $r[$G_DAY]; if($d -notmatch '^\d{4}-\d{2}-\d{2}$'){continue}
  $sp=(MoneyBR (Cell $r $G_SPEND))*$TAXG; $im=ToInt (Cell $r $G_IMP); $ck=ToInt (Cell $r $G_CLK); $cv=ToInt (Cell $r $G_CONV)
  $o=GetDay 'google' $d; $o.spend+=$sp;$o.impr+=$im;$o.clicks+=$ck;$o.platLeads+=$cv
  $g=GetGrain 'google' $d (Norm (Cell $r $G_CAMP)) (Norm (Cell $r $G_SET)) (Norm (Cell $r $G_AD))
  $g.spend+=$sp;$g.impr+=$im;$g.clicks+=$ck;$g.platLeads+=$cv } }

# ---- leads: filtra teste, classifica origem e atribui --------------
$SENT='SEM_RASTREIO'
$leadRows=New-Object System.Collections.Generic.List[object]
$dState=@{}; $dCity=@{}; $dChannel=@{}; $leadMails=@{}
$nTest=0
function Bump($h,$k){ if($null -eq $k -or $k -eq ''){return}; if(-not $h.ContainsKey($k)){$h[$k]=0}; $h[$k]++ }

foreach($r in $ld){
  if($r.Count -le $L_UCAMP){ continue }
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
    if($d -ne 'sem-data'){ $o=GetDay $plat $d; $o.leads++ }
    $g=GetGrain $plat $d $cName $sName $aName; $g.leads++
  } else { $cName=$SENT; $sName=$SENT; $aName=$SENT }
  Bump $dState $stt; Bump $dCity $cty; Bump $dChannel $chan
  $em=$mail.ToLower(); if($em -ne ''){ $leadMails[$em]=$true }
  $leadRows.Add([pscustomobject]@{date=$d;paid=$paid;channel=$chan;plat=$plat;state=$stt;camp=$cName;adset=$sName;ad=$aName})
}

# ===================================================================
#  PESQUISA + GRUPOS  (aba engajamento)
# ===================================================================
function Get-SheetByName($id,$name,$out){
  $enc=[uri]::EscapeDataString($name)
  $url="https://docs.google.com/spreadsheets/d/$id/gviz/tq?tqx=out:csv&sheet=$enc"
  [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
  (New-Object System.Net.WebClient).DownloadFile($url,$out)
}
# leads reais por dia (TODOS os leads, p/ as taxas de pesquisa/grupos)
$leadsByDay=@{}; foreach($lr in $leadRows){ if($lr.date -match '^\d{4}-\d{2}-\d{2}$'){ if(-not $leadsByDay.ContainsKey($lr.date)){$leadsByDay[$lr.date]=0}; $leadsByDay[$lr.date]++ } }

# ---- PESQUISA (respostas por pessoa; cruza por e-mail) ----
$survTotal=0; $survDone=0; $survInc=0; $survDoneByDay=@{}; $survAllByDay=@{}; $respMails=@{}
try {
  $pCsv=Join-Path $dataDir 'pesquisa.csv'; Get-SheetByName $LEADS_ID 'pesquisa' $pCsv
  $pp=Read-Csv $pCsv; $ph=$pp[0]; $pdRows=$pp[1..($pp.Count-1)]
  $P_MAIL=HdrLike $ph '*mail*'; $P_STATUS=HdrLike $ph 'status'; $P_DATE=HdrLike $ph 'date'
  foreach($r in $pdRows){
    if($null -eq $r -or $r.Count -eq 0){ continue }
    $pm = if($P_MAIL -ge 0 -and $r.Count -gt $P_MAIL){ (Norm $r[$P_MAIL]).ToLower() } else { '' }
    $pst= if($P_STATUS -ge 0 -and $r.Count -gt $P_STATUS){ Deaccent $r[$P_STATUS] } else { '' }
    $pd = if($P_DATE -ge 0 -and $r.Count -gt $P_DATE){ LeadDate $r[$P_DATE] } else { '' }
    if($pm -eq '' -and $pst -eq '' -and $pd -eq ''){ continue }
    $done = ($pst -eq 'completed' -or $pst -eq 'complete')
    $survTotal++; if($done){ $survDone++ } elseif($pst -eq 'incomplete'){ $survInc++ }
    if($pm -ne ''){ $respMails[$pm]=$true }
    if($pd -ne ''){ Bump $survAllByDay $pd; if($done){ Bump $survDoneByDay $pd } }
  }
} catch { Write-Host ("AVISO: aba pesquisa nao lida: "+$_.Exception.Message) }
$respLeads=0; foreach($m in $respMails.Keys){ if($leadMails.ContainsKey($m)){ $respLeads++ } }

# ---- GRUPOS (agregado diario: Data/Entrou/Saiu) ----
$grpIn=0; $grpOut=0; $grpInByDay=@{}; $grpOutByDay=@{}
try {
  $gCsv=Join-Path $dataDir 'grupos.csv'; Get-SheetByName $LEADS_ID 'grupos' $gCsv
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
} catch { Write-Host ("AVISO: aba grupos nao lida: "+$_.Exception.Message) }

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

# ---- arrays finais -------------------------------------------------
$dailyArr=@($daily.Values | Sort-Object date)
$grainArr=@($grain.Values | Where-Object { $_.spend -gt 0 -or $_.leads -gt 0 } | Sort-Object date)
$dates=@($dailyArr | Where-Object { $_.date -match '^\d{4}-\d{2}-\d{2}$' } | ForEach-Object { $_.date } | Sort-Object -Unique)
$leadDates=@($leadRows | Where-Object { $_.date -match '^\d{4}-\d{2}-\d{2}$' } | ForEach-Object { $_.date } | Sort-Object)

function DistArr($h){ $out=@(); foreach($e in ($h.GetEnumerator()|Sort-Object Value -Descending)){ if([string]$e.Key -eq ''){continue}; $out+=[pscustomobject]@{label=[string]$e.Key;n=[int]$e.Value} }; return ,@($out) }
function Sum0($arr,$p){ $s=($arr|Measure-Object $p -Sum).Sum; if($null -eq $s){return 0}; return $s }

$paidCount=@($leadRows|Where-Object{$_.paid}).Count
$attribCount=@($leadRows|Where-Object{$_.plat -ne ''}).Count
$metaDaily=@($dailyArr|Where-Object{$_.channel -eq 'meta'}); $gglDaily=@($dailyArr|Where-Object{$_.channel -eq 'google'})
$tot=[pscustomobject]@{
  spend=(Sum0 $dailyArr 'spend'); impr=(Sum0 $dailyArr 'impr'); reach=(Sum0 $dailyArr 'reach')
  clicks=(Sum0 $dailyArr 'clicks'); lpv=(Sum0 $dailyArr 'lpv'); platLeads=(Sum0 $dailyArr 'platLeads')
  leads=$leadRows.Count; paid=$paidCount; organic=($leadRows.Count-$paidCount); attributed=$attribCount; tests=$nTest
  states=(@($dState.Keys|Where-Object{$_ -ne ''}).Count); cities=(@($dCity.Keys|Where-Object{$_ -ne ''}).Count)
}
$byChannel=@(
  [pscustomobject]@{ch='meta';   spend=(Sum0 $metaDaily 'spend'); impr=(Sum0 $metaDaily 'impr'); clicks=(Sum0 $metaDaily 'clicks'); leads=(Sum0 $metaDaily 'leads'); platLeads=(Sum0 $metaDaily 'platLeads')}
  [pscustomobject]@{ch='google'; spend=(Sum0 $gglDaily 'spend'); impr=(Sum0 $gglDaily 'impr'); clicks=(Sum0 $gglDaily 'clicks'); leads=(Sum0 $gglDaily 'leads'); platLeads=(Sum0 $gglDaily 'platLeads')}
)
$bySource=@(
  [pscustomobject]@{src='pago';leads=$paidCount}
  [pscustomobject]@{src='organico';leads=($leadRows.Count-$paidCount)}
)

$nowIso=(Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
function NowBR(){
  foreach($tz in @('E. South America Standard Time','America/Sao_Paulo')){
    try { return [System.TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTime]::UtcNow,$tz).ToString('dd/MM/yyyy HH:mm') } catch {}
  }
  return [DateTime]::UtcNow.AddHours(-3).ToString('dd/MM/yyyy HH:mm')
}
$nowBR=NowBR
$utf8=[System.Text.UTF8Encoding]::new($false)

$payload=[pscustomobject]@{
  generatedAt=$nowIso; generatedAtBR=$nowBR; taxMultiplier=$TAX; taxGoogle=$TAXG; funnel='SIP-S1'
  dateMin=$(if($dates.Count){$dates[0]}else{''}); dateMax=$(if($dates.Count){$dates[-1]}else{''})
  leadDateMin=$(if($leadDates.Count){$leadDates[0]}else{''}); leadDateMax=$(if($leadDates.Count){$leadDates[-1]}else{''})
  totals=$tot; byChannel=@($byChannel); bySource=@($bySource)
  channels=(DistArr $dChannel); geo=(DistArr $dState); cities=(DistArr $dCity)
  engage=[pscustomobject]@{
    leads=$leadRows.Count
    survey=[pscustomobject]@{ total=$survTotal; completed=$survDone; incomplete=$survInc; respondedLeads=$respLeads; distinctLeads=$leadMails.Count }
    groups=[pscustomobject]@{ entered=$grpIn; left=$grpOut; net=($grpIn-$grpOut) }
    byDay=@($engByDay)
  }
  daily=@($dailyArr); grain=@($grainArr)
}
$json=$payload | ConvertTo-Json -Depth 9 -Compress
[IO.File]::WriteAllText((Join-Path $root 'data.js'), ("window.SIPS1="+$json+";"), $utf8)
Write-Host ("OK  grain={0} leadsReais={1} pago={2} org={3} atrib={4} testes={5}  gasto total=R$ {6}" -f `
  $grainArr.Count,$tot.leads,$tot.paid,$tot.organic,$tot.attributed,$tot.tests,($tot.spend.ToString('N2',$BR)))
Write-Host ("    META:   gasto(imp)=R$ {0}  leads={1}  |  GOOGLE: gasto=R$ {2}  leads={3}" -f `
  ($byChannel[0].spend.ToString('N2',$BR)),$byChannel[0].leads,($byChannel[1].spend.ToString('N2',$BR)),$byChannel[1].leads)
