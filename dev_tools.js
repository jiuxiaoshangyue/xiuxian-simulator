
/* ============ XL_RS 4.104：开发者工具（版本号 + 成仙率批测） ============ */
const XL_RS_VERSION = '4.367'; // 4.367 新增5位NPC(玄诚子/穆青鸾/苏子骨/燕追魂/周元和)补齐元始宗/风雷谷/天尸宗/镇魔司/混元宗，各6步核心链+日常事件 // 4.365 4.366 道行显示去浮点尾差（70.94200000000001→70.94，整数构造杜绝尾差）；4.365 NPC寿元体系——NPC按灵根资质自然成长，各境需在寿元上限内突破否则寿尽；已故NPC不再触发事件/链随人亡，同道栏标（已故）；修复第二批6位NPC(沈青衣/叶孤鸿/苏小荷/楚天机/寒月/赤练)CHAINS元数据缺失致核心链2-6步永不触发、不显示境界寿元；修复npcRealmInfo/同道栏误用未赋值的META.CHAINS致结识NPC即报错（统一读全局CHAINS）；老酒鬼链补全为6步（4.364k NPC核心链扩展为6步（4.364b NPC好感度系统：0-100初值50，核心链+日常事件+面板显示（4.364a NPC因缘链上线：墨白知交/无极争锋/醉中真意 三NPC四步链（4.363c 弹窗关闭按钮滚动消失修复（4.361b 旧链悟性收敛（4.361 宗门链悟性收敛——新链悟性奖励克制（4.360 宗门差异化——12 宗专属传承链（4.359 突破反馈强化：大境界 lg 亮横幅+小境界飘字（4.358 结构拆分——主逻辑拆出 game_core.js，开发者工具独立成文件；阶段2：修为门槛 expOfLv 判定 → realm 语义（事件数据 lv→realm/pos 迁移 35 处 + prBasic/optEnabled/needText/法宝/职务/境界共鸣改读 realm，删除 expOfLv）
(function(){
  const FULL_LH = {superTop:100, shenTop:100, sheTop:100, liLiang:10, minJie:10, tiLi:10, jingShen:10, life:20, wuXing:20, cultTop:30, huntTop:15, epicEv:60, legendEv:50, mythicEv:50, shenGan:100};
  function newLife(lh, opts){
    META.lunhui = lh || {};
    GIFT={}; if(opts && opts.qual) GIFT.wuQ = opts.qual; // 分层采样——按品质强制觉醒（复用定制灵根通道，属性也按该品质生成）
    G=rollAttrs(); try{_prevAttrs=null;}catch(e){}
    initLifeFields(); awakenSoul(G); G.age=6; G.realm=0; G.subRealm=0; G.realmPos=0; G._autoActCount=0; // 独立修为条——realm（境界）+realmPos（境内修为）为权威，g.lv 字段已废弃
  }
  function orgTick(){
    const g=G;
    if(!g.org) return false;
    const _gfIds = Object.keys(GONGFAS).filter(id=>GONGFAS[id].org===g.org);
    if(!g._freeArtDone && _gfIds.length){ buyCang(_gfIds[0],'gongfa'); return true; }
    if(g._freeArtDone && (g.materials||0) > 0 && (g._autoActCount % 2 === 0)){ shangjiao(); return true; }
    if(g._freeArtDone){
      const _gfNew = _gfIds.filter(id=>(g.gongfaOwned||[]).indexOf(id)<0);
      if(_gfNew.length && (g.gongxian||0) >= gongfaCost(_gfNew[0])){ buyCang(_gfNew[0],'gongfa'); return true; }
      const _stIds = Object.keys(SHENTONGS).filter(id=>SHENTONGS[id].org===g.org);
      const _stNew = _stIds.filter(id=>(g.shentongOwned||[]).indexOf(id)<0);
      if(_stNew.length && (g.gongxian||0) >= shentongCost(_stNew[0])){ buyCang(_stNew[0],'shentong'); return true; }
    }
    return false;
  }
  function pickKind(){
    const g=G;
    if(g._breakPending !== undefined && g._breakPending !== null) return '突破'; // 突破挂起自动尝试突破（4.193 突破按钮改造后批测适配——修为满不再卡死）
    const _feiLock = g.soul.quality==='fei' && g.realm>=1;
    const _lowHp = (g.a.气血||0) < 30;
    if(g.money < Math.floor((15 + g.a.家境*0.2) * (CFG.cult.coef[g.realm] || 1)) * 20) return '经营'; // 阈值随境界
    if(_feiLock) return (g.a.悟性||0) < 25 ? '交游' : '经营';
    if(_lowHp) return '苦修';
    if(g.realm < 9 && (lifeCapOf() - g.age) < 20) return '苦修';
    if((g.rings||[]).length < 8 && g.realm < (g.rings||[]).length + 1){
      const _r9 = g.realm;
      const _S9 = CFG.realms[_r9];
      const _segTop9 = _S9 + subSegBase(G, (G.subRealm===undefined||G.subRealm===null)?0:G.subRealm) + subSegLen(G, (G.subRealm===undefined||G.subRealm===null)?0:G.subRealm); // 36 条段长
      const _gap = Math.max(0, _segTop9 - CFG.realms[_r9] - inRealmProg(g)); // 距本段顶（突破点）距离
      const _perYear = Math.max(1, cultBase()*(CFG.cult.actionMult['苦修']||1.0));
      if(_gap < _perYear*3) return '苦修';
    }
    if(g._autoActCount % ((g.bones||[]).length <= 1 ? 2 : 3) === 0 && g.realm < 9) return '狩猎'; // 法宝补给智能
    if(g.money > 1500 && g._autoActCount % 15 === 7) return '逛坊市'; // 灵石富余时低频逛坊市（每15次行动，避免拖累修炼进度）
    if(g.money > 800 && g._autoActCount % 15 === 11) return '探秘'; // 灵石有余时低频探秘（每15次行动）
    if(g.a.悟性 < 20) return '交游';
    return (PERS_BY_NAME[g.personality||'']||{}).act || '历练';
  }
  /* 批测口径升级——runDec 接入与 autoAct 同源的自动分支（疗伤/回气/渡劫安全/悟道/功法参悟/斗法），
     让批测反映真实挂机水平（此前 runDec 只走 pickKind 简化行动，悟道/斗法/丹药收益全丢，成仙率被低估） */
  function autoPre(){
    const g=G;
    // 决策统一走 decideNext（与 autoAct 同源）——执行静默（批测免 DOM/日志）
    const _act = decideNext(g);
    if(_act){ execNext(_act, g, {log:false}); return true; }
    return false;
  }
  function huntTick(){
    const g=G;
    const _hunt = (PERS_BY_NAME[g.personality||'']||{}).hunt || '中';
    const _idx = Math.min(8, Math.max(0, g.realm));
    const _dTh = (G.wound||0) >= 1 ? 0.06 : 0.10; // 带伤猎妖降档更严格
    let _safe = '稳';
    for(const _c of ['中','猛']){ if(huntDeathP(_idx,_c) < _dTh) _safe = _c; }
    const _final = (_hunt==='猛' && _safe!=='猛') ? _safe : _hunt;
    resolveHunt(_final, _idx);
  }
  function runDec(n, full, opts){
    opts = opts||{};
    const _savedShowEvent = window.showEvent; // 批测事件 hook——runDec 自身补齐（此前缺失：window.__EV 从未被赋值，事件奖励含功德/业力全部丢失，功德飞升/魔道飞升路径测不出）
    window.showEvent = function(ev){ window.__EV = ev; };
    const t0 = Date.now();
    const lh = full ? FULL_LH : {};
    const st = {n:n, full:full, 成仙:0, 功德飞升:0, 魔道飞升:0, 硬渡劫:0, 地仙:0, 散仙:0, 渡劫死:0, 寿终:0, 其他:0, 反噬:0, 走火:0, ageSum:0, maxAge:0, stuck:0, byQual:{}};
    // 4.269：超大函数拆分——单局行动循环抽 rdOneRun
    for(let i=0;i<n;i++){
      rdOneRun(lh, st, opts);
    }
    st.avgAge = Math.round(st.ageSum/n);
    st.ms = Date.now() - t0;
    st.perMs = Math.round(st.ms/n*10)/10;
    window.showEvent = _savedShowEvent;
    return st;
  }
function rdOneRun(lh, st, opts){ // 单局循环——newLife + 自动行动/事件结算 + 结局统计
  const full = st.full;
  newLife(lh, opts);
  const g=G;
  const _q = (g.soul && g.soul.quality) ? g.soul.quality : '?';
  if(!st.byQual[_q]) st.byQual[_q] = {n:0,成仙:0,功德飞升:0,魔道飞升:0,硬渡劫:0,地仙:0,散仙:0,渡劫死:0,寿终:0,其他:0};
  const bq = st.byQual[_q];
  bq.n++;
  let guard=0;
  while(g.alive && !g.godTitle && guard++ < 30000 && g.age < 60000){
    g._autoActCount = (g._autoActCount||0) + 1;
    if(guard % 15 === 0){ try{ autoEquipArt(); }catch(e){} }
    if(orgTick()) continue;
    if(autoPre()){
      if(!g.alive || g.godTitle) break;
      if(window.__EV){ resolveEvent(window.__EV, autoPickIdx(window.__EV)); window.__EV=null; if(!g.alive || g.godTitle) break; }
      continue;
    }
    const kind = pickKind();
    if(!kind) break;
    // 批测——大乘巅满时其他飞升途径可用优先选用（功德金身/魔道飞升，硬渡九劫兜底）
    if(kind === '突破' && g._breakPending === 3 && g.realm >= 8){
      const _gdNet2 = (g.功德||0) - (g.业力||0);
      if(_gdNet2 >= 200 && !g._jinShenFail){ doGongdeAscend(); }
      else if(_gdNet2 <= -200){ doMoAscend(); }
      else { doAction(kind); }
      if(!g.alive || g.godTitle) break;
      if(window.__EV){ resolveEvent(window.__EV, autoPickIdx(window.__EV)); window.__EV=null; if(!g.alive || g.godTitle) break; }
      continue;
    }
    window.__EV = null;
    if(kind==='狩猎'){
      huntTick();
      if(!g.alive || g.godTitle) break;
      if(window.__EV){ resolveEvent(window.__EV, autoPickIdx(window.__EV)); window.__EV=null; }
      continue;
    }
    doAction(kind);
    if(!g.alive || g.godTitle) break;
    if(window.__EV){
      resolveEvent(window.__EV, autoPickIdx(window.__EV));
      window.__EV=null;
      if(!g.alive || g.godTitle) break;
    }
  }
  runDecFinalStat(st, g, bq); // 4.238：超大函数拆分——单局结局统计抽子函数（bq 存活期品质桶，死亡结算可能清 soul，不可重算）
}
function runDecFinalStat(st, g, bq){ // 单局结局统计——境界分布 + 结局分类（bq 为主循环存活期品质桶，死亡结算可能清 soul 不可重算）
  st.ageSum += g.age; st.maxAge = Math.max(st.maxAge, g.age);
  if(!g.godTitle){
    const _dc = g.deathCause || '';
    const _dk = g._sanxian ? '散仙' : (_dc.indexOf('寿元')>=0 ? '寿终' : (_dc.indexOf('劫')>=0 ? '渡劫死' : (_dc.indexOf('反噬')>=0 ? '反噬' : (_dc.indexOf('走火')>=0 ? '走火' : '其他'))));
    const _dk2 = _dk + '@' + (g.realm||0);
    if(!st.realmStat) st.realmStat = {};
    st.realmStat[_dk2] = (st.realmStat[_dk2]||0) + 1;
  }
  if(g.age > 50000) st.stuck++;
  const dc = g.deathCause || '';
  if(g.godTitle==='真仙'){ st.成仙++; bq.成仙++; if(g._gongdeAscend){ st.功德飞升++; bq.功德飞升++; } else { st.硬渡劫++; bq.硬渡劫++; } }
  else if(g.godTitle==='九幽真魔'){ st.成仙++; st.魔道飞升++; bq.成仙++; bq.魔道飞升++; } // 魔道飞升计入成仙
  else if(g.godTitle==='地仙'){ st.成仙++; st.地仙++; bq.成仙++; bq.地仙++; }
  else if(g._sanxian){ st.散仙++; bq.散仙++; }
  else if(dc.indexOf('劫')>=0){ st.渡劫死++; bq.渡劫死++; }
  else if(dc.indexOf('反噬')>=0){ st.反噬++; bq.反噬++; }
  else if(dc.indexOf('走火')>=0){ st.走火++; bq.走火++; }
  else if(dc.indexOf('寿元')>=0){ st.寿终++; bq.寿终++; }
  else { st.其他++; bq.其他++; }
}
  window.__BATCH = {runDec:runDec, runDecFinalStat:runDecFinalStat, FULL_LH:FULL_LH};
  /* 渡劫期功德统计——记录每局进入渡劫期当年的功德/业力/年龄/结局，
     用于诊断成仙率倒挂（高品质修炼过快→功德积累窗口短→功德飞升路径弱化） */
  window.__BATCH.jieStat = function(qual, n){
    n = n || 40;
    const saved = {};
    const _oldNR = __NORENDER; __NORENDER = true; // 渲染开关替代临时替换 hack（渲染入口已判断 __NORENDER）
    saved.showEvent = window.showEvent;
    window.showEvent = function(ev){ window.__EV = ev; };
    const savedAuto = AUTO.on; AUTO.on = false;
    const rows = [];
    try {
      for(let i=0;i<n;i++){
        newLife(FULL_LH, {qual:qual});
        const g=G;
        let guard=0, reached=false;
        while(g.alive && !g.godTitle && guard++<30000 && g.age<60000){
          g._autoActCount = (g._autoActCount||0) + 1;
          if(guard % 15 === 0){ try{ autoEquipArt(); }catch(e){} }
          if(orgTick()) continue;
          if(autoPre()){ // 4.303：与主循环同源（decideNext/autoAct）——批测统计对齐真实挂机，pickKind 仅兜底
            if(!g.alive || g.godTitle) break;
            if(window.__EV){ resolveEvent(window.__EV, autoPickIdx(window.__EV)); window.__EV=null; if(!g.alive || g.godTitle) break; }
            continue;
          }
          const kind = pickKind(); if(!kind) break;
          window.__EV = null;
          if(kind==='狩猎'){
            huntTick();
            if(!g.alive || g.godTitle) break;
            if(window.__EV){ resolveEvent(window.__EV, autoPickIdx(window.__EV)); window.__EV=null; }
            continue;
          }
          doAction(kind);
          if(g.realm>=9 && !reached){
            reached = true;
            rows.push({到大乘年龄:g.age, 功德:g.功德||0, 业力:g.业力||0, 功德净:(g.功德||0)-(g.业力||0), 结局:g.godTitle||(g._sanxian?(g._sanxian+'劫散仙'):'死')});
          }
          if(!g.alive || g.godTitle) break;
          if(window.__EV){
            resolveEvent(window.__EV, autoPickIdx(window.__EV));
            window.__EV=null;
            if(!g.alive || g.godTitle) break;
          }
        }
        if(!reached){ rows.push({未到大乘:true, 年龄:g.age, 功德:g.功德||0, 结局:g.godTitle||(g._sanxian?(g._sanxian+'劫散仙'):(g.deathCause||'?'))}); }
      }
      const done = rows.filter(function(r){ return !r.未到大乘; });
      function avg(a){ return a.length ? Math.round(a.reduce(function(m,v){ return m+v; },0)/a.length) : 0; }
      return {
        qual:qual, n:n,
        到渡劫期:done.length, 未到大乘:rows.length-done.length,
        平均年龄:avg(done.map(function(r){return r.到大乘年龄;})),
        平均功德:avg(done.map(function(r){return r.功德;})),
        平均净功德:avg(done.map(function(r){return r.功德净;})),
        功德不足80:done.filter(function(r){return r.功德<80;}).length,
        净功德不足80:done.filter(function(r){return r.功德净<80;}).length,
        结局:{成仙:rows.filter(function(r){return r.结局==='真仙';}).length, 散仙:rows.filter(function(r){return String(r.结局).indexOf('散仙')>=0;}).length, 死:rows.filter(function(r){return r.结局==='死';}).length},
        rows:rows
      };
    } finally {
      if(saved.showEvent !== undefined) window.showEvent = saved.showEvent;
      __NORENDER = _oldNR;
      AUTO.on = savedAuto;
    }
  };
  /* 批测入口：临时禁用渲染/日志/事件弹窗与自动 interval，跑完恢复——不干扰正常游玩 */
  window.batchTest = function(n, full, opts){
    const saved = {};
    const _oldNR = __NORENDER; __NORENDER = true; // 渲染开关替代临时替换 hack（渲染入口已判断 __NORENDER）
    saved.showEvent = window.showEvent;
    window.showEvent = function(ev){ window.__EV = ev; };
    const savedAuto = AUTO.on; AUTO.on = false;
    try { return window.__BATCH.runDec(n, full, opts); }
    finally {
      if(saved.showEvent !== undefined) window.showEvent = saved.showEvent;
      __NORENDER = _oldNR;
      AUTO.on = savedAuto;
    }
  };
  /* 分层采样成仙率——每个灵根品质固定样本（自然觉醒下高品质样本极少，随机抽样结果不可靠），
     再按自然觉醒概率（30/30/22/12/5/1/0.5）加权合成自然成仙率；返回每品质明细 + 等权总体 + 加权总体。 */
  window.batchTestQual = function(perQual, full){
    const saved = {};
    const _oldNR = __NORENDER; __NORENDER = true; // 渲染开关替代临时替换 hack（渲染入口已判断 __NORENDER）
    saved.showEvent = window.showEvent;
    window.showEvent = function(ev){ window.__EV = ev; };
    const savedAuto = AUTO.on; AUTO.on = false;
    const _nm = {fei:'无灵根', pu:'五行杂灵根', you:'四灵根', ding:'三灵根', super:'双灵根', shen:'天灵根', she:'圣灵根'};
    const _w  = {fei:30, pu:30, you:22, ding:12, super:5, shen:1, she:0.5};
    const res = {};
    let tot = {n:0, 成仙:0, 功德飞升:0, 魔道飞升:0, 硬渡劫:0, 地仙:0, 散仙:0, 渡劫死:0, 寿终:0, ms:0};
    try {
      for(const q of Object.keys(_nm)){
        const r = runDec(perQual, full, {qual:q});
        res[q] = {品质:_nm[q], n:r.n, 成仙:r.成仙, 成仙率:+(r.成仙/r.n*100).toFixed(2), 功德飞升:r.功德飞升, 魔道飞升:r.魔道飞升, 硬渡劫:r.硬渡劫, 地仙:r.地仙, 散仙:r.散仙, 渡劫死:r.渡劫死, 寿终:r.寿终, avgAge:r.avgAge, ms:r.ms};
        ['成仙','功德飞升','魔道飞升','硬渡劫','地仙','散仙','渡劫死','寿终'].forEach(function(k){ tot[k] += r[k]; });
        tot.n += r.n; tot.ms += r.ms;
      }
      tot.成仙率 = +(tot.成仙/tot.n*100).toFixed(2);
      const _wSum = Object.keys(_w).reduce(function(m,k){ return m+_w[k]; }, 0);
      tot.自然加权成仙率 = +Object.keys(_w).reduce(function(m,k){ return m + _w[k]/_wSum*(res[k].成仙率||0); }, 0).toFixed(2);
      tot.自然加权渡劫死 = +Object.keys(_w).reduce(function(m,k){ return m + _w[k]/_wSum*(res[k].渡劫死||0); }, 0).toFixed(2);
      return {perQual:perQual, full:full, total:tot, byQual:res};
    } finally {
      if(saved.showEvent !== undefined) window.showEvent = saved.showEvent;
      __NORENDER = _oldNR;
      AUTO.on = savedAuto;
    }
  };
})();
