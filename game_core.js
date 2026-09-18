const RULESET = 'XL_RS_3_20260913'; // 修为体系重构——每境独立累计、突破清零、渡劫期每年一劫，版本号升级隔离旧档

/* ============ 配置 ============ */
// 悟道法则体系——元素法则（8，炼虚解锁）/ 至高法则（9，合体解锁）；每悟一道获法则之力（元素+1 / 至高+3）
const LAWS_ELEM = ['金','木','水','火','土','风','雷','冰'];
const LAWS_SUP = ['时间','空间','因果','命运','造化','生命','死亡','虚无','混沌'];
function lawForce(g){
  const _a = (g && g.laws) || [];
  let _n = 0;
  for(let _i=0; _i<_a.length; _i++){ if(LAWS_SUP.indexOf(_a[_i])>=0) _n += 3; else _n += 1; }
  return _n;
}
const CFG = {
  cult: {
    speed: {fei:0, pu:6, you:24, ding:48, super:96, shen:180, she:360}, // 炼气起基础速度（点/年，×1.2 上调后：无0/五6/四24/三48/双96/天180/圣360）
    coef: [1,1,2,5,10,20,50,100,200,0,0], // 境界系数——炼体1/炼气1/筑基2/金丹5/元婴10/化神20/炼虚50/合体100/大乘200；渡劫起不再累积修为
    actionMult: {苦修:1.0, 历练:0.55, 交游:0.50, 经营:0.42, 双修:0.50, 游历:0.50, 论道:0.50, 赠礼:0.50, 逛坊市:0.30, 采药:0.15, 探秘:0.15} // 探秘 0.15 倍修为（见闻） // 采药 0.15 倍修为（见闻） // 逛坊市 0.3 倍修为（见闻增益） // 新增道侣双修——修为取交游档（主收益为羁绊成长：渡劫加成/事件前置） // 四修炼类梯度更平缓（苦修=纯修炼修为最高/历练=属性+修为兼顾/交游=人脉悟性/经营=金钱+低修为），拉近交游经营与苦修历练的差距，避免单项碾压
  },
  // 灵根品质：XL_RS 4.126 起 mult 不再参与修炼产出（修炼改为基础速度×境界系数×加成链），对象保留供品质判断
  soulQuality: {
    fei:  {mult:0.26},   // 无灵根炼体亦缓（80-100 岁寿终，炼体巅峰时寿元将尽）
    pu:   {mult:0.30},   // 五行杂灵根正常修炼难出金丹/元婴；XL_RS 4.42：倍率下调；XL_RS 4.111：微抬；XL_RS 4.112：0.35→0.30 再降一级，金丹后期即天堑
    you:  {mult:0.60},   // 四灵根正常可至合体；XL_RS 4.43：同步下调；XL_RS 4.111：微抬 0.64→0.70；XL_RS 4.112：0.70→0.60 再降一级，寿尽于炼虚/化神
    ding: {mult:1.10},   // 三灵根；XL_RS 4.43：同步下调；XL_RS 4.111：抬 0.99→1.25；XL_RS 4.112：1.25→1.10 再降一级，合体后期即天堑
    super:{mult:1.70},   // 双灵根——介于三灵根与天灵根之间；XL_RS 4.111：抬 1.12→1.70 + 上限放开（可至渡劫九重）——1.75 时 0 加成 5.2% 破线、1.65 时差距回 7.7 倍，取 1.70 中间值
    shen: {mult:1.85},   // 天灵根：无修炼上限，保持原速；XL_RS 4.111：微降 1.95→1.85 压缩与之下差距
    she:  {mult:2.05}   // 圣灵根：五行俱全的天灵根，无修炼上限，最高档；XL_RS 4.111：微降 2.20→2.05 压缩梯度
  },
  /* 寿命上限：随境界突破而延寿（炼体≈80~100 岁，境界越高寿元越长，见 lifeCapOf）。 */
  ring: {
    gates: [170, 1020, 5270, 26520, 132770, 664020, 3320270, 16601520, 83007770, 83007771], // 修为值=各境起点（炼气~真仙门槛）
    skillName: ['第一神通','第二神通','第三神通','第四神通','第五神通','第六神通','第七神通','第八神通','第九神通','仙技'],
    tierDesc: ['一阶妖兽','二阶妖兽','三阶妖兽','四阶妖兽','五阶妖兽','六阶妖兽','七阶妖兽','八阶妖兽','九阶妖兽'],
    diff: {稳:0, 中:0.22, 猛:0.45}, // 4.207e 起猎妖判定改用 HUNT_MUL 对抗比，本字段仅存档兼容不再参与计算
    statBonus: {稳:6, 中:10, 猛:16}
  }
};

/*  修为体系重构：每境修为独立累计、突破后从 0 重新累积（含小境界）。
   区间表 B_i=10×5^(i-1)：境内四段需求 1:2:4:10（初→中=B、中→后=2B、后→巅=4B、巅→破境=10B），
   各境总需求 = 17B：炼体170/炼气850/筑基4250/金丹21250/元婴106250/化神531250/炼虚2656250/合体13281250/大乘66406250，全境累计 83,007,770。
   修为权威字段 = realm（境界）/subRealm（小境）/realmPos（境内修为），各境独立累计；绝对修为值由 realmAbs() 现算（阶段3 起仅存档/评分/封顶兼容用，g.lv 字段已废弃）。 */
CFG.realms = [0, 170, 1020, 5270, 26520, 132770, 664020, 3320270, 16601520, 83007770, 83007771]; // 各境起点（渡劫=83,007,770，真仙哨兵）
const TIER_NAMES = ['炼体','炼气','筑基','金丹','元婴','化神','炼虚','合体','大乘','渡劫','真仙'];const Q_KEYS = {fei:'无灵根', pu:'五行杂灵根', you:'四灵根', ding:'三灵根', super:'双灵根', shen:'天灵根', she:'圣灵根'};
const RQ_COEF = {fei:0.85, pu:0.9, you:1.0, ding:1.1, super:1.2, shen:1.3, she:1.4}; // 4.207d 灵根品质系数（修炼速度/四维资质/道行共用，抽取自原 3 处内联字面量）
const BRK_COEF = {fei:0.85, pu:0.86, you:0.88, ding:0.90, super:0.92, shen:0.94, she:0.95}; // 4.207d 灵根品质系数（突破/破境概率，抽取自原 3 处内联字面量）
const WU_LIMIT = {fei:50, pu:65, you:80, ding:90, super:95, shen:100, she:100}; // 4.207g 灵根品质悟性上限（原 2 处内联字面量语义一致，抽取防漂移）
const BRK_QMOD = {fei:-0.15, pu:-0.11, you:-0.07, ding:-0.04, super:0, shen:0.03, she:0.04}; // 4.207g 突破成功率灵根品质修正（原 doBreak/突破面板 2 处内联同源）
const BRK_DP = {fei:0.05, pu:0.05, you:0.05, ding:0.05, super:0.01, shen:0.005, she:0.005}; // 4.207g 破境失败死亡概率（原 doBreak 判定/两处提示 3 处内联同源）
const HUNT_MUL = {稳:0.55, 中:1.0, 猛:1.8}; // 4.207e 猎妖档位威胁倍率（稳=低妖低险/中=常规/猛=高妖高险；同时驱动妖力值与成功率对抗）
const BEAST_TYP = [32, 80, 210, 540, 1340, 3300, 8000, 19000, 31000]; // 4.207e 各境界典型道行（炼体~大乘，猎妖成功率/殒命率归一化基准）
const Q_COLOR = {fei:'q-fei', pu:'q-pu', you:'q-you', ding:'q-ding', super:'q-super', shen:'q-shen', she:'q-she', mo:'q-mo'}; // 魔道紫档
const ATTRS = ['力量','灵动','气血','神识','悟性','家境','气运'];
/* 战斗四维（力/敏/体/精）：不设上限，普通人基准 5，开局 0-10 随机；
   其余三维（悟/家/命）保持 1-100 原体系。 */
const FIGHT_ATTRS = ['力量','灵动','气血','神识'];
const OTHER_ATTRS = ['悟性','家境','气运'];
function clampAttr(k, v){ return FIGHT_ATTRS.includes(k) ? Math.max(0, v) : clamp(v, 1, 100); }
/* 道胎品质 → 四维增幅（[力量,灵动,气血,神识]）。
   凝成道胎后按品质档永久增幅属性：有瑕小幅、无缺中幅、完美大幅。 */
/* ============ 道胎系统（修仙版）：八枚三档 ============
   八枚道胎对应炼气至大乘八境（炼体/渡劫/真仙不凝）；三档：有瑕/无缺/完美；
   由灵根品质定基础档，悟性/气运可升档（各≥60 升一档，上限完美）；
   有瑕降修炼、无缺基准、完美提速；每破一大境自动凝成，
   属性按品质档位增幅（完美大幅、无缺中幅、有瑕小幅）。 */
const RING_NAMES = ['炼气','筑基','金丹','元婴','化神','炼虚','合体','大乘'];
function ringNameOf(idx){ return (RING_NAMES[idx]||'')+'道胎'; }
function ringGradeOf(y){ if(y===undefined||y===null||isNaN(y)||y<0) return 0; if(y<=2) return y; if(y>=10000) return 2; if(y>=1000) return 1; return 0; } // 品质档统一解析——新格式{0,1,2}直通；旧年限值按档映射（万年=完美/千年=无缺/十年百年=有瑕）；中间值保守归有瑕，消除歧义
function ringGradeKey(y){ const v=ringGradeOf(y); return v===2?'完美':(v===1?'无缺':'有瑕'); }
function ringGradeRoll(){
  const g=G, a=g.a;
  const q = (g.soul||{}).quality;
  let base = 0;
  if(q==='ding'||q==='super') base = 1;
  if(q==='shen'||q==='she') base = 2;
  if((a.悟性||0) >= 60) base++;
  if((a.气运||0) >= 60) base++;
  return Math.min(2, base); // 0 有瑕 / 1 无缺 / 2 完美
}
function condenseDaotai(idx){
  const g=G, a=g.a;
  // 道胎仅 8 个（对应炼气→大乘）；大乘→渡劫破境不凝道胎，仅破境增幅+本命法宝祭炼
  if(idx === 8){
    FIGHT_ATTRS.forEach(k=>{ g.a[k] += 4; });
    g.a.家境 = Math.max(g.a.家境, 15 + 8*4);
    addLog(`<b>渡劫突破！</b>${BREAK_TEXT[8]}（战斗四维 +4）`,'good');
    extraBoneSacrifice();
    return {gr:null, y:null};
  }
  let gr = ringGradeRoll();
  if(idx===0 && hasFate(G,'ring')) gr = Math.min(2, gr+1); // 命格·先天道胎：第一道胎品质+1档
  const y = gr; // 品质档：0 有瑕 / 1 无缺 / 2 完美
  const rq = gr===2 ? 'shen' : gr===1 ? 'you' : 'pu';
  if(!g.rings) g.rings=[];
  g.rings.push({q:rq, choice:'凝胎', y, beast:ringNameOf(idx), ele:null, sync:false}); // 道胎不再生成随机神通名
  g._bCount = (g._bCount||0) + 1; // 大境界突破次数
  const yb = ringAttrBonus(y); // 百分比加成（资质层实时计算用）
  // 道胎四维加成不再写入 a——改由 effAttr(k) 按 品质%×灵根系数 实时计算（资质层）
  g.prestige += 5;
  // 大境界突破固定奖励（折半方案，替代原破境增幅 1~4）——突破至炼气+2 / 筑基+4 / … / 大乘+16（全四维）
  const bIdx = g.rings.length - 1;
  const _bAdd = [2,4,6,8,10,12,14,16][idx] || 16;
  FIGHT_ATTRS.forEach(k=>{ g.base[k] = (g.base[k]||0) + _bAdd; }); // 大境界奖励写入基础层
  g.a.家境 = Math.max(g.a.家境, 15 + g.rings.length*4);
  addLog(`<b>${TIER_NAMES[Math.min(bIdx+1,8)]}突破！</b>${BREAK_TEXT[bIdx]||'修为蜕变，境界升华。'}（战斗四维 +${_bAdd}）`,'good');
  if(gr===2) showToast(ringNameOf(idx)+'凝成 · '+ringGradeKey(y), '#ffd700', '#e6b800'); // 仅完美品质道胎飘字
  addLog(`<b>道胎凝成！</b>破${TIER_NAMES[Math.min(bIdx+1,8)]}之境，${ringNameOf(idx)}于丹田凝聚——<b>${ringGradeKey(y)}</b>，四维加成（力量+${Math.round(yb[0]*100)}% 灵动+${Math.round(yb[1]*100)}% 气血+${Math.round(yb[2]*100)}% 神识+${Math.round(yb[3]*100)}%，随修为即时生效）。`,'good');
  extraBoneSacrifice(); // 本命法宝：突破祭炼/品阶成长（XL_RS 4.135）
  return {gr, y};
}
function ringAttrBonus(y){
  // 道胎四维加成改为百分比（方案B）——完美 6%/4%/6%/4%、无缺 3%/2%/3%/2%、有瑕 1.5%/1%/1.5%/1%
  const v = ringGradeOf(y);
  if(v === 2) return [0.06, 0.04, 0.06, 0.04];  // 完美
  if(v === 1) return [0.03, 0.02, 0.03, 0.02];  // 无缺
  return [0.015, 0.01, 0.015, 0.01];            // 有瑕
}
/* 战斗四维终值（属性分层）——
   base(开局+境界) × [1 + 灵根系数×(Σ道胎% + Σ神通%)] + 后天固定(事件/丹药/法宝部位)，再 ×(1+法宝%)
   旧档（无 attrVer）直读加法层 a，行为与历史版本一致 */
function effAttr(k){
  const g=G;
  if(!g.attrVer) return g.a[k]||0;
  const b = g.base[k]||0, fx = (g.a[k]||0) - b;
  const _rqc = RQ_COEF;
  const rq = (g.soul && _rqc[g.soul.quality]) || 1;
  const _i = FIGHT_ATTRS.indexOf(k);
  let dp = 0; (g.rings||[]).forEach(r=>{ const yb = ringAttrBonus(r.y); dp += yb[_i]||0; });
  const st = shentongBonus()[k]||0;
  const mid2 = b*(1+rq*(dp+st)) + fx;
  return mid2 * (1 + ((boneBonus()[k])||0));
}
function effAttrs(){ const o={}; FIGHT_ATTRS.forEach(k=>o[k]=effAttr(k)); return o; }
/* ============ 法宝系统（修仙版）：修士法宝体系 ============
   四件法宝：武器/法衣/鞋履/饰品。猎杀妖兽按妖兽阶位概率掉落
   （凡器 20% / 灵器 15% / 宝器 10% / 八阶仙器 5% / 九阶仙器 30%）。吸收有气血门槛
   （品阶越高要求越高），失败反噬（气血-12、15% 重伤）。法宝提供部位侧重属性
   （写进四维永久），仙器额外带法宝技。同部位新法宝可替换（自动扣减旧法宝加成）。 */
/* 法宝品阶：凡器 → 灵器 → 宝器 → 仙器（四阶）；内部按妖兽档位（ry）判定强度 */
function gradeOf(ry){ return ry>=100000?'仙器' : ry>=10000?'宝器' : ry>=1000?'灵器' : '凡器'; }
// 神装判定——集齐四件法宝（武器/法衣/鞋履/饰品）可凝聚仙衣（飞升关联）
function boneSetComplete(){
  const g=G; const bones=g.bones||[];
  return BONE_SLOTS.every(slot=>bones.some(b=>b.slot===slot) || (g.extraBone && g.extraBone.slot===slot)); // 本命法宝占槽计入四件圆满
}
function boneSetCount(){
  const g=G; const bones=g.bones||[];
  return BONE_SLOTS.filter(slot=>bones.some(b=>b.slot===slot) || (g.extraBone && g.extraBone.slot===slot)).length; // 本命占槽计入
}
/* 本命法宝（修仙版 XL_RS 4.135）：突破大境界时心有所感，从当前装备法宝中随机择一件祭炼为本命法宝——
   品阶继承所选法宝（加成不变，原法宝保留装备），额外提供随品阶成长的四维加成（凡器+8/灵器+12/宝器+16/仙器+20）；
   每突破一个大境界本命法宝品阶提升一阶（凡→灵→宝→仙），大乘必成仙器。XL_RS 4.190：本命法宝占据一个法宝槽位（四件位之一），该槽不可再装备普通法宝。 */
const EXTRA_BONE_PCT = {凡器:3, 灵器:6, 宝器:10, 仙器:15}; // 与普通法宝相同的百分比加成
const EXTRA_BONE_ORDER = ['凡器','灵器','宝器','仙器'];
const EXTRA_BONE_SUB = {力量:'灵动', 灵动:'神识', 神识:'气血', 气血:'力量'}; // 第二词条（环状搭配）
function extraBoneSacrifice(){
  const g=G;
  if(!g.extraBone){
    const bones = (g.bones||[]);
    if(!bones.length) return;              // 无装备法宝可祭炼
    if(Math.random() >= 0.15) return;      // 突破时 15% 概率心有所感
    const src = pick(bones);               // 随机择一件
    const _pct = EXTRA_BONE_PCT[src.grade] || 3;
    g.extraBone = {name:src.name, main:src.main, sub:EXTRA_BONE_SUB[src.main]||'神识', pct:_pct, grade:src.grade, slot:src.slot}; // 记录占用槽位（本命占一个法宝位）
    atlasGain('bones', src.name); // 4.209 法宝图鉴——祭炼为本命亦入图鉴
    // 本命法宝占一个法宝位——被祭炼法宝炼化入体，从法宝库移除（若正装备则卸下）
    g.bones = (g.bones||[]).filter(function(b){ return b.id!==src.id; });
    if(g.boneEquip && g.boneEquip[src.slot]===src.id) delete g.boneEquip[src.slot];
    if(g.achievements.indexOf('本命法宝')<0) g.achievements.push('本命法宝');
    addLog(`<b>本命法宝！</b>破境之际心有所感，你以心血祭炼「${src.name}」为本命法宝——品阶继承（${src.grade}），${src.main}+${_pct}%、${g.extraBone.sub}+${_pct}% 双词条加成，占一个法宝位，可随你一同成长。`,'good');
    return;
  }
  // 已有本命法宝：每突破一个大境界品阶提升一阶，大乘必成仙器
  if(g.extraBone.grade === '仙器') return;
  const rk = EXTRA_BONE_ORDER.indexOf(g.extraBone.grade);
  const isDaCheng = (g.rings||[]).length >= 8; // 第 8 道胎凝成 = 大乘（道胎共 8 个，原 >=9 永不满足——本命大乘必成仙器修复）
  g.extraBone.grade = isDaCheng ? '仙器' : EXTRA_BONE_ORDER[Math.min(3, rk+1)];
  g.extraBone.pct = EXTRA_BONE_PCT[g.extraBone.grade];
  addLog(`<b>本命法宝进化！</b>你的本命法宝「${g.extraBone.name}」随境界升华，蜕为<b>${g.extraBone.grade}</b>（${g.extraBone.main}+${g.extraBone.pct}%、${g.extraBone.sub}+${g.extraBone.pct}%）。`,'good');
}
/* 4.167 法宝重铸：凡器→灵器（70%）/ 灵器→宝器（50%）；费用按当前品阶；失败灵石不退+15% 概率法宝受损（凡器碎裂/灵器跌回凡器）。
   修为门槛与炼化一致（灵器需筑基+1道胎、宝器需元婴+4道胎），本命法宝（extraBone）不入库不参与。 */
function reforgeBone(id, opts){
  opts = opts || {};
  const _log = opts.log !== false, _rd = opts.render !== false;
  const g=G;
  const b=(g.bones||[]).find(x=>x && x.id===id); if(!b) return;
  if(b.grade==='仙器'){ if(_log){ addLog('仙器已是至宝，非人力可铸，无法重铸。','sys'); renderShop(); } return; }
  // 4.209 炼器深化——凡→灵→宝→仙 全链可铸；妖兽材料入消耗（资源取舍：上缴/炼丹/炼器）；宝→仙失败仅损材（保底 5 次必成）
  const _p = rbParams(b); // 4.255：重铸参数抽子函数
  const fee = _p.fee, mat = _p.mat, succ = _p.succ, tgt = _p.tgt, reqLv = _p.reqLv, reqRing = _p.reqRing;
  if(g.money < fee){ if(_log){ addLog('灵石不足，无法重铸。','bad'); renderShop(); } return; }
  if((g.materials||0) < mat){ if(_log){ addLog('妖兽材料不足（需 '+mat+' 妖丹），无法重铸。','bad'); renderShop(); } return; }
  if(g.realm < reqLv || (g.rings||[]).length < reqRing){
    if(_log){ addLog('修为不足：'+tgt+'法宝需'+(tgt==='仙器'?'大乘 + 8 道胎':tgt==='宝器'?'元婴 + 4 道胎':'筑基 + 1 道胎')+'方可炼化，强行重铸只会经脉寸断。','bad'); renderShop(); }
    return;
  }
  g.money -= fee; g.materials = (g.materials||0) - mat;
  rbResolve(g, b, tgt, succ, _log); // 4.255：结果判定抽子函数
  if(_rd){ renderShop(); renderGame(); }
}
function rbParams(b){ // 重铸参数——费用/材料/成功率/目标品阶/修为与道胎要求（凡→灵→宝→仙 全链）
  const fee = b.grade==='凡器' ? 300 : b.grade==='灵器' ? 1500 : 8000;
  const mat = b.grade==='凡器' ? 2 : b.grade==='灵器' ? 4 : 8;
  const succ = b.grade==='凡器' ? 0.70 : b.grade==='灵器' ? 0.50 : 0.30;
  const tgt = b.grade==='凡器' ? '灵器' : b.grade==='灵器' ? '宝器' : '仙器';
  const reqLv = tgt==='仙器' ? 8 : tgt==='宝器' ? 4 : 2; // realm 境界门槛（仙器大乘/宝器化神/灵器金丹）
  const reqRing = tgt==='仙器' ? 8 : tgt==='宝器' ? 4 : 1;
  return {fee: fee, mat: mat, succ: succ, tgt: tgt, reqLv: reqLv, reqRing: reqRing};
}
function rbResolve(g, b, tgt, succ, _log){ // 重铸结果判定——成功升级/宝→仙失败保底 5 次必成/凡灵失败 15% 碎裂或降级/普通失败
  if(Math.random() < succ){
    b.grade = tgt;
    b.pct = tgt==='仙器' ? 15 : tgt==='宝器' ? 10 : 6;
    b.name = pick(BONE_NAMES[b.slot] || [b.slot]);
    if(tgt==='仙器'){
      b.skill = '法宝技·'+pick(['威压','护体','裂空','吞天','镇魂','破军']);
      if(!g.achievements) g.achievements = [];
      if(g.achievements.indexOf('仙器法宝')<0) g.achievements.push('仙器法宝');
    } else b.skill = '';
    g._refinePity = 0;
    atlasGain('bones', b.name);
    if(_log) addLog('<b>炼器阁：</b>炉火中灵光暴涨——「'+b.name+'」重铸成功，蜕为<b>'+tgt+'</b>（'+b.main+'+'+b.pct+'%）！','good');
  } else if(b.grade==='宝器'){
    // 宝→仙失败：法宝安然，仅损材料；累计失败 5 次天道酬勤必成
    g._refinePity = (g._refinePity||0) + 1;
    if(g._refinePity >= 5){
      b.grade = '仙器'; b.pct = 15;
      b.name = pick(BONE_NAMES[b.slot] || [b.slot]);
      b.skill = '法宝技·'+pick(['威压','护体','裂空','吞天','镇魂','破军']);
      if(!g.achievements) g.achievements = [];
      if(g.achievements.indexOf('仙器法宝')<0) g.achievements.push('仙器法宝');
      g._refinePity = 0;
      atlasGain('bones', b.name);
      if(_log) addLog('<b>炼器阁：</b>天道酬勤！历 5 次失败后炉火通明，「'+b.name+'」终成<b>仙器</b>（'+b.main+'+15%）！','good');
    } else {
      if(_log) addLog('重铸失败，仙器胚材灵性未足，8 妖丹化为灰烬（累计失败 '+g._refinePity+'/5，5 次后必成）。','bad');
    }
  } else if(Math.random() < 0.15){
    if(b.grade==='凡器'){
      g.bones = (g.bones||[]).filter(x=>x.id!==b.id);
      if(g.boneEquip && g.boneEquip[b.slot]===b.id) delete g.boneEquip[b.slot];
      if(_log) addLog('重铸失败，炉火失控，凡器「'+b.name+'」碎裂化为飞灰，就此湮灭。','bad');
    } else {
      b.grade = '凡器';
      b.pct = 3;
      b.name = pick(BONE_NAMES[b.slot] || [b.slot]);
      b.skill = '';
      if(_log) addLog('重铸失败，灵器灵性大损，跌回凡器品阶。','bad');
    }
  } else {
    if(_log) addLog('重铸失败，炉火无功，灵石与妖兽材料化为乌有，法宝安然无恙。','bad');
  }
}
function absorbBone(ry){
  const g=G, a=g.a;
  // 掉落概率：妖兽阶位越高越易出法宝；品阶越高越稀有——凡器 20%、灵器 15%、宝器 10%、八阶仙器 5%、九阶仙器 30%（不再必出）
  const drop = ry>=120000 ? 0.30 : ry>=100000 ? 0.05 : ry>=10000 ? 0.10 : ry>=1000 ? 0.15 : 0.20;
  if(Math.random() >= drop) return;
  // 品阶（按妖兽阶位）与气血门槛
  const grade = gradeOf(ry);
  const need  = ry>=100000 ? 70 : ry>=10000 ? 45 : ry>=1000 ? 20 : 10;
  if(a.气血 < need){
    a.气血 = Math.max(5, a.气血-12);
    if(Math.random()<0.15){ die(`强行吸收${grade}法宝，修为暴走而亡`); return; }
    addLog(`<b>法宝反噬！</b>你强行吸收${grade}法宝，肉身无法承载，修为震荡（气血-12），险些殒命。`,'bad');
    return;
  }
  // 装备法宝（部位优先空闲、四件位集齐随机替换、同部位自动扣旧加新）
  const info = equipBone(grade);
  if(!info) return; // 修为不足/先天0未装上时直接返回（equipBone 已提示「法宝无缘/修为不足」，避免 592 空引用 TypeError）
  let txt = `<b>爆出法宝！</b>${beastTierName(ry)}妖兽竟凝出<b>${info.grade}·${info.name}</b>，${info.main}+${info.pct}%（已入法宝库）${info.skill?('，附「'+info.skill+'」'):''}。`;
  addLog(txt,'good');
}
/* equipBone：装备一件法宝（DL_RS_4.41 抽离统一入口——猎妖掉落与事件机缘共用）
   部位优先未装备槽位，四件位集齐后随机替换；同部位新法宝自动扣减旧法宝加成；
   仙器带法宝技。返回装备信息供日志/UI 使用。 */
function equipBone(grade, fixSlot, skipCheck){
  const g=G;
  // 法宝炼化限制——修为不足无法引气入体，不能炼化法宝；
  // 灵器需金丹、宝器需化神、仙器需大乘（reqLv=realm 境界门槛）
  // skipCheck=true时跳过修为等级检查（用于命格天生法宝等场景，法宝出生即有）
  // 4.299：超大函数拆分——修为检查/法宝生成抽 2 子函数
  if(!ebCheck(g, grade, skipCheck)) return null;
  return ebMake(g, grade, fixSlot);
}
function ebCheck(g, grade, skipCheck){ // 法宝炼化限制——修为/道胎不足则放弃（skipCheck 跳过，用于命格天生法宝）
  if(skipCheck) return true;
  const reqLv = grade==='仙器' ? 8 : grade==='宝器' ? 4 : grade==='灵器' ? 2 : 1; // realm 境界门槛
  const reqRing = grade==='仙器' ? 8 : grade==='宝器' ? 4 : grade==='灵器' ? 1 : 0;
  if(g.realm < reqLv || (g.rings||[]).length < reqRing){
    addLog('<b>修为不足：</b>你目前的修为境界尚不足以炼化'+grade+'法宝，强行吸收只会经脉寸断，只能忍痛放弃。','bad');
    return false;
  }
  return true;
}
function ebMake(g, grade, fixSlot){ // 法宝生成——槽位（本命占槽改投）/随机名/百分比加成/仙器法宝技/入法宝库+图鉴/飘字
  let slot = fixSlot || BONE_SLOTS[Math.floor(Math.random()*BONE_SLOTS.length)];
  if(g.extraBone && g.extraBone.slot===slot){ const _free = BONE_SLOTS.filter(s=>s!==g.extraBone.slot); slot = _free[Math.floor(Math.random()*_free.length)]; } // 本命占槽——炼化自动改投他槽
  const bName = pick(BONE_NAMES[slot] || [slot]); // 随机法宝名
  const main = BONE_ATTR[slot];
  const pct = grade==='仙器' ? 15 : grade==='宝器' ? 10 : grade==='灵器' ? 6 : 3; // 法宝改为百分比加成
  // 仙器带法宝技
  let boneSkill = '';
  if(!g.achievements) g.achievements = []; // 空值检查，防止applyFateBase中调用时achievements未初始化
  if(grade==='仙器'){ boneSkill = '法宝技·' + pick(['威压','护体','裂空','吞天','镇魂','破军']); if(g.achievements.indexOf('仙器法宝')<0) g.achievements.push('仙器法宝'); }
  else if(g.achievements.indexOf('法宝')<0) g.achievements.push('法宝');
  if(!g.bones) g.bones = []; // 空值检查
  const bId = 'b'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36);
  g.bones.push({id:bId, slot, grade, name:bName, pct, main, skill:boneSkill}); // 入法宝库（持有），装备后加成生效
  atlasGain('bones', bName); // 4.209 法宝图鉴——获得即记录
  // 法宝获得飘字——XL_RS 4.76：仅宝器及以上飘字（仙器红 / 宝器黑）
  if(grade==='仙器' || grade==='宝器'){
    const gBg = grade==='仙器' ? '#e03131' : '#3a3f4b';
    const gTx = grade==='仙器' ? '#ffd700' : '#eceff5';
    showToast('获得法宝 · '+bName+'（'+grade+' · '+main+'+'+pct+'%），已入法宝库', gTx, gBg);
  }
  return {id:bId, slot, grade, main, name:bName, pct, skill:boneSkill};
}
/* 法宝装备/加成——装备槽按部位唯一（与功法神通同面板手动装备），仅装备后加成生效 */
function boneEquipped(slot){
  const g=G; const id=(g.boneEquip||{})[slot];
  if(!id) return null;
  return (g.bones||[]).find(b=>b.id===id) || null;
}
function boneBonus(){
  const bb = {力量:0, 灵动:0, 气血:0, 神识:0};
  for(const slot of BONE_SLOTS){
    const b = boneEquipped(slot);
    if(b && b.main) bb[b.main] += (b.pct||0)/100;
  }
  // 本命法宝双词条——与普通法宝同数值的百分比加成（不占四件位）
  const xb = G.extraBone;
  if(xb && xb.pct){
    bb[xb.main] = (bb[xb.main]||0) + xb.pct/100;
    if(xb.sub) bb[xb.sub] = (bb[xb.sub]||0) + xb.pct/100;
  }
  return bb;
}

/* ============ 灵根池（20 个：属性灵根 + 品质名） ============
   品质=修炼资质六档（无/杂/四/三/双/天）；属性=五行+异灵根（风雷冰）。
   cat 决定属性成长倾向（灵根不参与倾向的功法绑定留待功法系统）。 */
const SOULS_BY_Q = {
  /* 修仙版灵根池（XL_RS_1）：灵根=属性+品质。
     品质档：无灵根/五行杂灵根/四灵根/三灵根/双灵根/天灵根（决定修炼速度）；
     属性：五行（金木水火土）+ 异灵根（风雷冰，天灵根变种、稀有度更高）。
     天灵根按属性命名（火灵根/雷灵根…）；双灵根按双属性命名（火木灵根…）；
     四/三灵根按所含属性组合命名（五行序）；杂/无灵根直接以品质为名。 */
  fei: [
    {name:'无灵根', cat:'bt'}
  ],
  pu: [
    {name:'五行杂灵根', cat:'bt'}
  ],
  you: [
    {name:'金木水火灵根', cat:'wu'}, {name:'金木水土灵根', cat:'wu'}, {name:'金木火土灵根', cat:'wu'},
    {name:'金水火土灵根', cat:'wu'}, {name:'木水火土灵根', cat:'zhi'}
  ],
  ding: [
    {name:'金木火灵根', cat:'wu'}, {name:'金木水灵根', cat:'wu'}, {name:'金木土灵根', cat:'wu'},
    {name:'金水火灵根', cat:'wu'}, {name:'金水土灵根', cat:'wu'}, {name:'金火土灵根', cat:'wu'},
    {name:'木水火灵根', cat:'zhi'}, {name:'木水土灵根', cat:'zhi'}, {name:'木火土灵根', cat:'zhi'},
    {name:'水火土灵根', cat:'shui'}
  ],
  super: [
    {name:'火木灵根', cat:'huo'}, {name:'火金灵根', cat:'huo'}, {name:'火水灵根', cat:'huo'}, {name:'火土灵根', cat:'huo'},
    {name:'水木灵根', cat:'shui'}, {name:'水土灵根', cat:'shui'}, {name:'木金灵根', cat:'zhi'}, {name:'木土灵根', cat:'zhi'},
    {name:'金土灵根', cat:'wu'}, {name:'金水灵根', cat:'wu'}
  ],
  shen: [
    {name:'火灵根', cat:'huo'}, {name:'木灵根', cat:'zhi'}, {name:'水灵根', cat:'shui'}, {name:'金灵根', cat:'wu'},
    {name:'土灵根', cat:'shou'}, {name:'风灵根', cat:'feng'}, {name:'雷灵根', cat:'lei'}, {name:'冰灵根', cat:'bing'}
  ],
  she: [
    {name:'圣灵根', cat:'bt'}   // 五行俱全的天灵根，全属性均衡
  ]
};
/* 灵根图鉴总数（动态计算） */
const SOUL_TOTAL = Object.values(SOULS_BY_Q).reduce((a,l)=>a+l.length, 0);
/* 修仙版：变异机制已移除（不适配修仙灵根体系）。灵根品质随觉醒锁定，
   但洗髓丹（XL_RS 4.120 金事件）可洗去一缕属性杂质实现提纯升品（双→天、三→双、四→三、杂→四）；
   风雷冰为单一天灵根，不与五行混杂。 */

/* 灵根二次觉醒（已移除——变异机制废除，无代码残留） */

/* 灵根属性成长倾向（修炼时按灵根属性偏向成长） */
const TREND = {
  huo:  {力量:0.45, 神识:0.30, 气血:0.25, 灵动:0.10},   // 火：刚猛灼烈
  zhi:  {神识:0.50, 悟性:0.40, 气血:0.15, 力量:0.05},   // 木：生机道蕴
  shui: {灵动:0.45, 神识:0.30, 气血:0.20, 悟性:0.15},   // 水：润物无形
  wu:   {力量:0.50, 神识:0.30, 气血:0.20, 悟性:0.10},   // 金：锋锐无匹
  shou: {气血:0.50, 力量:0.35, 神识:0.15, 灵动:0.10},   // 土：厚重绵长
  feng: {灵动:0.55, 力量:0.30, 神识:0.15, 气血:0.10},   // 风：迅疾如电
  lei:  {力量:0.50, 神识:0.30, 灵动:0.20, 气血:0.10},   // 雷：刚烈霸烈
  bing: {神识:0.45, 悟性:0.35, 灵动:0.25, 力量:0.05},   // 冰：清冷彻悟
  bt:   {力量:0.25, 气血:0.25, 灵动:0.25, 神识:0.20, 悟性:0.15} // 无/杂/圣灵根全属性均衡成长
};

/* ============ 全局状态 ============ */
let META = {lundian:0, lunhui:{}};
function loadMeta(){
  try{ // 旧版本存档字段不兼容（ring.beast 等已删），存在即清理，避免与新档混用错乱
    const _oldKey = 'dl_rs_meta_XL_RS_1_20260910';
    if(localStorage.getItem(_oldKey) && !localStorage.getItem('dl_rs_meta_'+RULESET)){ localStorage.removeItem(_oldKey); }
  }catch(e){}
  try{ const raw = localStorage.getItem('dl_rs_meta_'+RULESET);
    if(raw){ META = JSON.parse(raw); } }catch(e){}
  ensureMetaFields(); // 4.320 跨世字段统一兜底（全局/导入/防御路径共用，旧档自动补齐）
}
function ensureMetaFields(){ // 4.320 统一初始化——全局加载/导入存档/防御路径均调用，杜绝旧档缺字段崩溃
  META.lundian = META.lundian || 0;
  META.lunhui = META.lunhui || {};
  META.fate = META.fate || 0; // 轮回点溢出 → 命格祭炼
  META.daoTong = META.daoTong || {gongfas: [], shentongs: []}; // 转世道统（跨世功法神通传承）（每 15 点 1 命格）
  META.atlas = META.atlas || {};
  ['souls','events','endings','gongfas','shentongs','bones','dans'].forEach(function(k){ if(!META.atlas[k]) META.atlas[k] = {}; }); // 图鉴收集 8 分类（4.34 增功法/神通；4.322 增丹药）
  META.mishiLog = META.mishiLog || {}; // 4.318 秘境图鉴跨世累计（各秘境总次数/最好收获）
  META.records = META.records || {}; // 跨局成就记录（成仙/道号/冠军等，驱动收集称号）
  META.board = META.board || []; // 轮回榜（本机生涯纪录，评分/道行/等级）
  META.historySaves = META.historySaves || []; // 历史存档（单局总结页+历程，玩家可查看/导出/删除）
  META.statRows = META.statRows || []; // 4.357 跨世统计轻量记录（每局结束自动写入，与手动精华存档解耦，全量不漏）
}
function saveMeta(){
  META.gift = {wuQ:GIFT.wuQ, fate:GIFT.fate, evQ:GIFT.evQ}; // 来世天赋随档保存
  try{ localStorage.setItem('dl_rs_meta_'+RULESET, JSON.stringify(META)); return true; }catch(e){ return false; } // 4.303：返回成败，供存档按钮提示存储满
}
/* 单局存档——保存总结页+本局历程到本地历史记录，玩家可在轮回殿查看/导出/删除 */
function saveLifeArchive(){
  try{
    const g=G;
    // 4.272：超大函数拆分——快照组装/入库提交抽 2 子函数
    const archive = slaSnapshot(g);
    slaCommit(archive);
  }catch(e){
    const btn = document.getElementById('btnSaveArchive');
    if(btn){ btn.textContent = '保存失败'; setTimeout(()=>{btn.textContent='保存本局存档';}, 3000); }
  }
}
function slaSnapshot(g){ // 本局存档快照组装——元始令/功法/道侣子女/法宝/属性/境界历程/功德业力/log
  // 4.300：超大函数拆分——基础/修行装备字段抽 2 子函数
  return Object.assign(slaCore(g), slaEquip(g));
}
function slaCore(g){ // 基础字段——身份/灵根/境界/评分/结局/功法/道侣子女/死因/成就
  return {
      id: Date.now(),
      saveTime: new Date().toLocaleString('zh-CN'),
      name: g.name || '无名',
      famous: g.famous || '', // 名人局存档标注（回顾时区分模式）
      personality: g.personality || '',
      gender: g.gender || '男',
      soul: g.soul ? {name:g.soul.name, quality:g.soul.quality, xian:g.soul.xian} : null,
      dual: g.dual ? {name:g.dual.name, quality:g.dual.quality} : null,
      lv: Math.round(realmAbs(g)),
      age: g.age,
      power: power(),
      score: endScoreOf(),
      endTitle: document.getElementById('endTitle') ? document.getElementById('endTitle').textContent : '',
      godTitle: g.godTitle || '',
      org: g.org || '',
      gongfa: g.gongfa ? {main: g.gongfa.main || null, sub: g.gongfa.sub || null} : null, // 回顾存档可见本局主修/辅修
      spouse: g.spouse || '',
      spouseRole: g.spouseRole || '',
      spouseGender: g.spouseGender || '',
      children: g.children || 0,
      kids: g.kids ? JSON.parse(JSON.stringify(g.kids)) : [], // 子嗣个体（名称/品质/天资/道基）
      deathCause: g.deathCause || '寿终正寝',
      achievements: [...new Set(g.achievements || [])]
    };
}
function slaEquip(g){ // 修行装备字段——道胎/法宝/属性/境界历程/法则/道心/功德业力/元始六绝/历程日志
  return {
      rings: (g.rings||[]).map(r=>({y:r.y, name:r.beast, skill:r.skill})),
      bones: (g.bones||[]).map(b=>({id:b.id, grade:b.grade, slot:b.slot, skill:b.skill, name:b.name||'', pct:b.pct||0, main:b.main||''})),
      boneEquip: (g.boneEquip||{}),
      attrs: {气血:Math.floor(g.a.气血),力量:Math.floor(g.a.力量),灵动:Math.floor(g.a.灵动),神识:Math.floor(g.a.神识),悟性:Math.floor(g.a.悟性),家境:Math.floor(g.a.家境),气运:Math.floor(g.a.气运)},
      realmAges: (g.realmAges||[]).slice(0, 10), // 大境界突破年龄（传记·境界历程）
      laws: (g.laws||[]).length, // 悟道法则数
      daoXin: Math.round(g.daoXin||50), // 最终道心
      gongde: Math.floor(g.功德||0), // 功德
      karma: Math.floor(g.业力||0), // 业力
      arts: (g.tangmenArts||[]), // 元始宗六绝记录
      log: (g.log||[]).slice(-1000).map(l=>({text:l.text, cls:l.cls, age:l.age})) // 4.303：快照限 1000 条（与 vhsLog 口径一致）——防 localStorage 超限
    };
}
function slaCommit(archive){ // 存档入库——历史上限 50 + 持久化 + 按钮反馈
  META.historySaves = META.historySaves || [];
  META.historySaves.unshift(archive);
  if(META.historySaves.length > 50) META.historySaves = META.historySaves.slice(0, 50);
  const _ok = saveMeta(); // 4.303：存储满（QuotaExceeded）不再静默——按钮明确提示失败
  const btn = document.getElementById('btnSaveArchive');
  if(btn){ btn.textContent = _ok ? '已保存 ✓' : '本地存储已满，未能保存'; btn.disabled = true; setTimeout(()=>{btn.textContent='保存本局存档'; btn.disabled=false;}, 3000); }
}
function renderHistorySaves(){
  const panel = document.getElementById('historyPanel');
  if(!panel) return;
  // v4.346：清理无实质内容的残档（早期测试写入的 {id:N} 垃圾数据），避免列表被占满且无法回顾
  const _all = META.historySaves || [];
  const _good = _all.filter(function(_s){ return _s && typeof _s==='object' && (_s.name || _s.soul || _s.score || _s.age || _s.saveTime); });
  if(_good.length !== _all.length){ META.historySaves = _good; try{ saveMeta(); }catch(_e){} }
  const saves = META.historySaves || [];
  if(saves.length===0){ panel.innerHTML = '<div class="muted" style="padding:10px 0">暂无存档。游戏结束后在总结页点击「保存本局存档」即可记录。</div>'; return; }
  let html = '<div style="max-height:300px;overflow:auto">';
  saves.forEach((s, i)=>{ html += rhsRow(s, i); }); // 4.294：超大函数拆分——单行渲染抽 rhsRow
  html += '</div>';
  panel.innerHTML = html;
  panel.onclick = function(e){ // 4.215：列表按钮事件委托——消除字符串onclick+索引拼接，重排/清洗后索引不失效
    const b = e.target && e.target.closest ? e.target.closest('button[data-a]') : null;
    if(!b) return;
    const _i = parseInt(b.dataset.i, 10);
    if(isNaN(_i)) return;
    if(b.dataset.a === 'view') viewArchive(_i);
    else if(b.dataset.a === 'export') exportArchive(_i);
    else if(b.dataset.a === 'delete') deleteArchive(_i);
  };
}
function rhsRow(s, i){ // 历史存档单行——姓名（名人局标注）/灵根品质/境界标签/评分 + 查看/导出/删除按钮 + 时间/结局
  const qw = Q_KEYS[s.soul ? s.soul.quality : ''] || (s.soul ? s.soul.quality : ''); // 4.207g 引用全局品质名映射
  let html = '<div style="border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">';
  html += '<div><b>' + (escapeHtml(s.name)||'无名') + '</b>' + (s.famous?'<span style="color:var(--gold)"> · 气运既定模式</span>':'') + ' · ' + (s.soul?escapeHtml(s.soul.name):'—') + (qw && qw!==(s.soul?s.soul.name:'') ? '（' + qw + '）' : '') + ' · ' + archiveRealmTag(s) + ' · 评分' + (s.score ?? '—') + '</div>'; // 转义；DL_RS_4.201：名人局标注；v4.346 兜底缺字段
  html += '<div style="display:flex;gap:6px">';
  html += '<button class="btn mini" data-a="view" data-i="' + i + '">查看</button>';
  html += '<button class="btn mini" data-a="export" data-i="' + i + '">导出</button>';
  html += '<button class="btn mini" style="color:var(--bad)" data-a="delete" data-i="' + i + '">删除</button>';
  html += '</div></div>';
  html += '<div class="muted" style="font-size:11.5px;margin-top:4px">' + escapeHtml(s.saveTime) + ' · ' + (escapeHtml(s.endTitle)||'') + ' · 享年' + (s.age ?? '—') + '岁</div>'; // 转义；v4.346 兜底缺字段
  html += '</div>';
  return html;
}
/* 4.215：存档记录公共模板——详情/导出共用，一处改两处生效（修 v4.214 同类 bug 需改多处的问题） */
function archiveMetaLine(s){ // 核心行：称号·评分·道行·境界·享年
  return '<b>' + (escapeHtml(s.endTitle)||'') + '</b> · 评分' + (s.score ?? '—') + ' · 道行' + (s.power ?? '—') + ' · ' + archiveRealmTag(s) + ' · 享年' + (s.age ?? '—') + '岁'; // v4.346 兜底缺字段
}
function archiveBasicRows(s){ // 基本信息行：灵根(含品质去重)/副灵根/仙位/势力/道侣/子嗣/结局
  const _qw = Q_KEYS[s.soul ? s.soul.quality : ''] || (s.soul ? s.soul.quality : '');
  let hh = '<div>灵根：' + (s.soul?escapeHtml(s.soul.name):'') + (_qw && _qw!==(s.soul?s.soul.name:'') ? '（' + _qw + '）' : '') + '</div>';
  if(s.dual) hh += '<div>副灵根：' + escapeHtml(s.dual.name) + '</div>';
  if(s.godTitle) hh += '<div>仙位：' + escapeHtml(s.godTitle) + '</div>';
  if(s.org) hh += '<div>势力：' + escapeHtml(s.org) + '</div>';
  if(s.spouse) hh += '<div>道侣：' + escapeHtml(s.spouse) + '</div>';
  if(s.children) hh += '<div>子嗣：' + s.children + '人</div>';
  hh += '<div>结局：' + (escapeHtml(s.deathCause)||'') + '</div>';
  return hh;
}
/* 生平传记摘要——轮回殿历史详情中的修行传记（结局文风差异化） */
function bioSummaryHtml(s){
  if(!s) return '';
  // 4.261：超大函数拆分——结语/境界历程/高光时刻抽 3 子函数
  const style = bsStyle(s);
  const realmLine = bsRealmLine(s);
  const _laws = typeof s.laws === 'number' ? s.laws : '—';
  const _dx = typeof s.daoXin === 'number' ? s.daoXin : '—';
  const _gd = typeof s.gongde === 'number' ? s.gongde : '—';
  const _ye = typeof s.karma === 'number' ? s.karma : '—';
  const hl = bsHighlights(s);
  return '<div style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:14px;background:linear-gradient(135deg,rgba(255,215,0,0.06),transparent)">' +
    '<div style="font-size:12px;color:var(--gold);margin-bottom:6px">── 修行传记 ──</div>' +
    '<div style="font-size:13px;font-style:italic;margin-bottom:10px">' + escapeHtml(style) + '</div>' +
    '<div style="font-size:12.5px;margin-bottom:6px"><b>境界历程：</b>' + escapeHtml(realmLine) + '</div>' +
    '<div style="font-size:12.5px;margin-bottom:6px"><b>问道：</b>悟道 ' + _laws + '/17 · 道心 ' + _dx + ' · 功德 ' + _gd + ' · 业力 ' + _ye + '</div>' +
    (hl ? '<div style="font-size:12px"><b>高光时刻：</b>' + hl + '</div>' : '') +
    '</div>';
}
function bsStyle(s){ // 结语——按 godTitle/deathCause 选择传记评语
  const _god = s.godTitle || '';
  const _dc = s.deathCause || '';
  if(_god.indexOf('真仙') >= 0) return '你于青冥之上证得仙位，从此天地任游、寿与天齐，凡人眼中不过一场白日飞升的传说。';
  if(_god.indexOf('地仙') >= 0) return '你不求飞升，只拣一处福地洞天逍遥度日，人间千年，于你不过几度春秋。';
  if(_god.indexOf('散仙') >= 0) return '仙途未竟，你散落人间，一身道行化作风尘，偶尔也想起当年渡劫时的雷光。';
  if(_dc.indexOf('劫') >= 0) return '九重雷劫压顶，你力战至最后一息，终究未能迈过那道门槛，只留一段悲壮的传说。';
  if(_dc.indexOf('寿') >= 0) return '寿元终尽，你坐化于蒲团之上。回望此生，功过荣辱皆已随风，只余一声轻叹。';
  return '这一世就此落幕，凡尘如戏，你既是看客，也是戏中人。';
}
function bsRealmLine(s){ // 境界历程——realmAges 逐境界年龄串（旧存档未记录兜底）
  const RA = s.realmAges || [];
  const T = ['炼体','炼气','筑基','金丹','元婴','化神','炼虚','合体','大乘','渡劫'];
  let last = -1;
  for(let i=1;i<=9;i++){ if(RA[i]) last = i; }
  if(last > 0){
    const parts = [];
    for(let i=1;i<=last;i++){ if(RA[i]) parts.push(T[i]+'（'+RA[i]+'岁）'); }
    return parts.join(' → ');
  }
  return '（旧存档未记录）';
}
function bsHighlights(s){ // 高光时刻——log 中 epic/legend/mythic/sys 或关键词命中最多 6 条
  let hl = '';
  if(s.log && s.log.length){
    const picks = [];
    const kws = ['破境天劫','顿悟','参悟','渡劫','飞升','凝聚道胎','大道','心魔','走火'];
    for(let i=0;i<s.log.length;i++){
      const l = s.log[i];
      const t = (l && l.text) || '';
      if(!t) continue;
      const cls = (l && l.cls) || '';
      const isEpic = cls.indexOf('epic')>=0 || cls.indexOf('legend')>=0 || cls.indexOf('mythic')>=0 || cls.indexOf('sys')>=0;
      if(isEpic || kws.some(function(k){ return t.indexOf(k)>=0; })){ picks.push(l); if(picks.length >= 6) break; }
    }
    if(picks.length){
      hl = '<div style="margin-top:8px">' + picks.map(function(l){
        return '<div class="entry ' + (escapeHtml(l.cls)||'') + '" style="padding:2px 0">【' + (l.age!=null ? l.age : '?') + '岁】' + sanitizeLogHtml(l.text) + '</div>';
      }).join('') + '</div>';
    }
  }
  return hl;
}
function viewArchive(index){
  const s = (META.historySaves||[])[index];
  if(!s) return;
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.onclick = (e)=>{ if(e.target===modal) modal.remove(); };
  // 4.289：超大函数拆分——详情头部/日志区抽 2 子函数
  let html = '<div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;max-width:700px;width:100%;max-height:85vh;overflow:auto;padding:20px">';
  html += vaHead(s);
  html += vaLog(s);
  html += '</div>';
  modal.innerHTML = html;
  document.body.appendChild(modal);
}
function vaHead(s){ // 详情头部——标题（名人局标注）/元信息/基础行/成就/最终属性
  let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><h3 style="margin:0">' + (escapeHtml(s.name)||'无名') + (s.famous?'<span style="color:var(--gold);font-size:14px">（气运既定模式）</span>':'') + ' 的一生</h3><button class="btn mini" onclick="this.parentElement.parentElement.parentElement.remove()">关闭</button></div>'; // 名人局详情标注
  html += '<div style="margin-bottom:14px">' + archiveMetaLine(s) + '</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px;font-size:13px">' + archiveBasicRows(s) + '</div>';
  if(s.achievements && s.achievements.length) html += '<div style="margin-bottom:14px;font-size:12.5px"><b>成就：</b>' + s.achievements.map(escapeHtml).join('、') + '</div>';
  if(s.attrs) { html += '<div style="margin-bottom:14px;font-size:12.5px"><b>最终属性：</b>'; for(const k in s.attrs) html += escapeHtml(k) + ' ' + escapeHtml(s.attrs[k]) + ' '; html += '</div>'; } // 全字段转义
  return html;
}
function vaLog(s){ // 日志区——修行传记摘要 + 本局历程（限 1000 条，二次过滤）
  const _logList = (s.log||[]).slice(0, 1000); // 深度防御，最多显示1000条日志
  let html = bioSummaryHtml(s); // 修行传记摘要
  html += '<h4 style="margin:14px 0 8px">本局历程（' + (s.log||[]).length + '条' + ((s.log||[]).length > 1000 ? '，仅显示前1000条' : '') + '）</h4>';
  html += '<div style="max-height:300px;overflow:auto;border:1px solid var(--border);border-radius:8px;padding:10px;font-size:12.5px;line-height:1.8">';
  _logList.forEach(l=>{ html += '<div class="entry ' + escapeHtml(l.cls||'') + '">' + sanitizeLogHtml(l.text||'') + '</div>'; }); // 深度防御，日志二次过滤
  html += '</div>';
  return html;
}
function exportArchive(index){
  const s = (META.historySaves||[])[index];
  if(!s) return;
  // 4.253：超大函数拆分——列表段/文档组装抽 2 子函数
  const _sec = eaSections(s);
  // 4.234：超大函数拆分——日志段/下载执行拆 3 子函数
  let logHtml = archiveLogHtml(s.log||[]);
  if(!logHtml) logHtml = '<div class="muted">无历程记录</div>';
  archiveDownload(eaDocHtml(s, _sec.attrsHtml, _sec.ringsHtml, _sec.bonesHtml, logHtml), s);
}
function eaSections(s){ // 道胎/法宝/属性三个列表段 HTML（含空态兜底）
  const ringColor = (y)=> y>=2?'#FFD700':y>=1?'#6f9bff':'#c9c9c9';
  let ringsHtml = '';
  (s.rings||[]).forEach((r,i)=>{
    ringsHtml += '<div style="padding:4px 0;border-bottom:1px dashed #444"><span style="color:'+ringColor(r.y)+';font-weight:bold">第'+(i+1)+'枚 · '+ringGradeKey(r.y)+'</span> '+escapeHtml(r.name)+' — '+escapeHtml(r.skill||'')+'</div>'; // 存档 rings 字段为 {y,name,skill} 无 year——r.year 恒 undefined 致颜色恒灰
  }); // 转义
  if(!ringsHtml) ringsHtml = '<div class="muted">无道胎</div>';
  let bonesHtml = '';
  (s.bones||[]).forEach(b=>{
    bonesHtml += '<div style="padding:4px 0">'+escapeHtml(b.grade)+' '+escapeHtml(b.name||b.slot)+'（'+escapeHtml(b.main||b.slot)+'+'+(b.pct||0)+'%） — '+escapeHtml(b.skill)+'</div>';
  }); // 转义
  if(!bonesHtml) bonesHtml = '<div class="muted">无法宝</div>';
  let attrsHtml = '';
  if(s.attrs){ for(const k in s.attrs) attrsHtml += '<span style="display:inline-block;margin:2px 8px 2px 0"><b>'+escapeHtml(k)+'</b> '+escapeHtml(s.attrs[k])+'</span>'; } // 转义
  return {ringsHtml: ringsHtml, bonesHtml: bonesHtml, attrsHtml: attrsHtml};
}
function eaDocHtml(s, attrsHtml, ringsHtml, bonesHtml, logHtml){ // 导出档案整文档 HTML 组装
  return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>'+(escapeHtml(s.name)||'无名')+' 的一生 - 修仙人生模拟器</title>'+
    '<style>body{background:#1a1a2e;color:#e0e0e0;font-family:"Microsoft YaHei",sans-serif;max-width:700px;margin:0 auto;padding:16px;line-height:1.8}'+
    'h1{color:#ffd700;text-align:center;border-bottom:2px solid #ffd700;padding-bottom:10px}'+
    'h2{color:#66ccff;border-left:4px solid #66ccff;padding-left:10px;margin-top:24px}'+
    '.info{background:#16213e;padding:12px;border-radius:8px;margin:10px 0}'+
    '.muted{color:#888}'+
    '.ach{color:#ffd700}'+
    '</style></head><body>'+
    '<h1>'+(escapeHtml(s.name)||'无名')+' 的一生</h1>'+
    '<div class="info">'+archiveMetaLine(s)+'</div>'+
    '<h2>基本信息</h2><div class="info">'+
    '<div>姓名：'+(escapeHtml(s.name)||'无名')+' · 性别：'+(escapeHtml(s.gender)||'男')+' · 性格：'+(escapeHtml(s.personality)||'')+'</div>'+
    archiveBasicRows(s)+
    '</div>'+
    (s.achievements && s.achievements.length ? '<h2>成就</h2><div class="info ach">'+s.achievements.map(escapeHtml).join('、')+'</div>' : '')+
    '<h2>最终属性</h2><div class="info">'+attrsHtml+'</div>'+
    (s.arts && s.arts.length ? '<h2>元始宗绝学（'+s.arts.length+'/6）</h2><div class="info ach">'+s.arts.map(escapeHtml).join('、')+'</div>' : '')+ // 元始宗六绝记录
    '<h2>道胎神通</h2><div class="info">'+ringsHtml+'</div>'+
    '<h2>法宝</h2><div class="info">'+bonesHtml+'</div>'+
    '<h2>本局历程（'+(s.log||[]).length+'条）</h2><div class="info" style="max-height:500px;overflow:auto">'+logHtml+'</div>'+
    '<div class="muted" style="text-align:center;margin-top:20px;font-size:12px">保存时间：'+escapeHtml(s.saveTime)+' · 修仙人生模拟器</div>'+
    '</body></html>';
}
function archiveLogColor(cls){ // 日志 cls → 颜色映射（导出档案配色）
  let color = '#ccc';
  if(cls.indexOf('good')>=0) color = '#66ff99';
  else if(cls.indexOf('bad')>=0) color = '#ff6666';
  else if(cls.indexOf('sys')>=0) color = '#ffd700';
  else if(cls.indexOf('legend')>=0) color = '#ff4444';
  else if(cls.indexOf('mythic')>=0) color = '#ffd700';
  else if(cls.indexOf('epic')>=0) color = '#c77dff';
  else if(cls.indexOf('rare')>=0) color = '#66ccff';
  return color;
}
function archiveLogHtml(logs){ // 本局历程日志段 HTML（安全过滤）
  let logHtml = '';
  logs.forEach(l=>{
    const cls = l.cls || '';
    logHtml += '<div style="padding:3px 0;color:'+archiveLogColor(cls)+'">'+sanitizeLogHtml(l.text||'')+'</div>'; // 导出日志安全过滤
  });
  return logHtml;
}
function archiveDownload(html, s){ // Blob 生成 + 触发下载 + 释放 URL
  const blob = new Blob([html], {type:'text/html;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '修仙人生_存档_' + (s.name||'无名') + '_' + s.lv + '_' + new Date().toISOString().slice(0,10) + '.html';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function deleteArchive(index){
  const s = (META.historySaves||[])[index];
  if(!s) return;
  if(!confirm('确定删除「' + (s.name||'无名') + '」的存档吗？此操作不可撤销。')) return;
  META.historySaves.splice(index, 1);
  saveMeta();
  renderHistorySaves();
}
/* 导出跨世进度（轮回点/加点/图鉴/成就/排行榜/存档）为 JSON——与 importSave 配对，用于备份与换机迁移 */
function exportProgress(){
  const data = {ruleset: RULESET, meta: safeClone(META), saveTime: new Date().toISOString()};
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '修仙人生_进度备份_' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function importSave(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    try{
      const raw = JSON.parse(e.target.result);
      // 存档完整性验证 + 防原型链污染
      const data = validateSaveData(safeClone(raw));
      if(data.ruleset !== RULESET){ throw new Error('存档版本不匹配（当前：' + RULESET + '，存档：' + data.ruleset + '）'); }
      // 确认导入
      if(!confirm('确定导入存档吗？这将覆盖当前所有跨世进度（轮回点/加点/图鉴/成就/排行榜），且不可撤销。')){ input.value=''; return; }
      META = data.meta;
      // 确保必要字段存在（validateSaveData已校验，这里兜底）
      ensureMetaFields(); // 4.320 统一补齐——旧档缺 mishiLog/功法神通图鉴字段时自动初始化，避免世末结算崩溃
      saveMeta();
      // 刷新页面显示
      if(typeof renderLunhui === 'function') renderLunhui();
      if(typeof renderAtlasSumm === 'function') renderAtlasSumm();
      if(typeof renderBoard === 'function') renderBoard();
      const msg = document.getElementById('saveMsg');
      if(msg){ msg.innerHTML = '<span style="color:var(--good)">存档导入成功！轮回点：' + META.lundian + '，图鉴灵根：' + Object.keys(META.atlas.souls||{}).length + '种。</span>'; setTimeout(()=>{msg.innerHTML='';}, 5000); }
    }catch(err){
      const msg = document.getElementById('saveMsg');
      if(msg){ msg.innerHTML = '<span style="color:var(--bad)">导入失败：' + err.message + '</span>'; }
    }
    input.value = '';
  };
  reader.readAsText(file);
}
/* ============ 图鉴收集（DL_RS_4.33）：跨局记录灵根/事件/结局，收集驱动重玩 ============ */
function recordAtlas(cat, name){
  if(!name) return;
  // 防原型链污染——过滤危险键名
  if(name === '__proto__' || name === 'constructor' || name === 'prototype') return;
  ensureMetaFields();
  if(!META.atlas[cat]) META.atlas[cat] = {};
  if(!META.atlas[cat][name]){ META.atlas[cat][name] = true; saveMeta(); } // 新条目自动持久化
}
function atlasCount(cat){ return Object.keys(META.atlas[cat]||{}).length; }
/* 本局收集暂存——跨世图鉴改为世末结算统一写入（局中不更新 META.atlas，图鉴计数/里程碑加成均为上一世及之前累计） */
function atlasGain(cat, name){
  if(!name) return;
  if(name === '__proto__' || name === 'constructor' || name === 'prototype') return;
  const g = G;
  g.atlasGain = g.atlasGain || {souls:{}, events:{}, gongfas:{}, shentongs:{}, bones:{}, dans:{}}; // 4.322 丹药图鉴
  if(!g.atlasGain[cat]) g.atlasGain[cat] = {};
  g.atlasGain[cat][name] = true;
}
/* 世末结算：本局收集统一写入跨世图鉴（新条目持久化），返回各分类新增数 */
function flushAtlasGain(){
  const g = G; if(!g || !g.atlasGain) return {souls:0, gongfas:0, shentongs:0, events:0, bones:0};
  const add = {souls:0, gongfas:0, shentongs:0, events:0, bones:0, dans:0};
  ['souls','gongfas','shentongs','events','bones','dans'].forEach(function(cat){
    const map = g.atlasGain[cat]||{};
    Object.keys(map).forEach(function(n){
      if(!atlasHas(cat, n)){ recordAtlas(cat, n); add[cat]++; }
    });
  });
  g.atlasGain = null;
  return add;
}
// 事件改名后（启蒙道院←初级修士学院 / 初涉妖林←猎妖森林初见），历史已收集的旧 key 视为已收集
const EV_NAME_LEGACY = {'启蒙道院':'初级修士学院', '初涉妖林':'猎妖森林初见'};
function atlasHas(cat, name){
  if(cat==='events' && name && EV_NAME_LEGACY[name] && META.atlas.events && META.atlas.events[EV_NAME_LEGACY[name]]) return true;
  return !!(META.atlas[cat] && META.atlas[cat][name]);
}
function atlasCountSouls(){
  // 灵根图鉴数量只统计与当前灵根定义匹配的名字——避免历史遗留/改名灵根使顶部计数虚高
  // （曾多次调整灵根池，被删除/改名的灵根仍残留在持久化记录中，会导致顶部总数 > 各品质小计之和）
  let n=0;
  ['fei','pu','you','ding','super','shen','she'].forEach(q=>{
    (SOULS_BY_Q[q]||[]).forEach(s=>{ if(atlasHas('souls', s.name)) n++; });
  });
  return n;
}
// 灵根图鉴收集里程碑 → 永久气运加成（开局应用）：收集越多天资越盛（克制，最多 +15）
function atlasBonus(){
  const n = atlasCountSouls();
  if(n>=SOUL_TOTAL) return 15; // 满编阈值改用 SOUL_TOTAL 动态值，灵根池增删不再需要两处同步
  if(n>=30)  return 8;
  if(n>=20)  return 5;
  if(n>=10)  return 2;
  return 0;
}
// 事件图鉴收集里程碑 → 永久悟性加成（开局应用，克制：最多 +10）
function atlasBonusEvents(){
  const total = EVENTS.length;
  if(!total) return 0;
  const ratio = atlasCount('events') / total;
  if(ratio >= 0.8)  return 6; // 图鉴悟性加成收敛 10→6
  if(ratio >= 0.55) return 3; // 5→3
  if(ratio >= 0.3)  return 1; // 2→1
  return 0;
}
// 收集称号（跨局荣誉，无属性加成——纯收集动力，防止多周目强度膨胀）
function collectionTitles(){
  const t = [];
  const ns = atlasCountSouls();
  const ne = atlasCount('events'), total = EVENTS.length;
  const nEnd = atlasCount('endings');
  if(ns >= 36) t.push('灵根百科全书');
  else if(ns >= 30) t.push('灵根收藏家');
  else if(ns >= 20) t.push('灵根猎手');
  if(total && ne/total >= 0.8) t.push('修仙界百晓生');
  else if(total && ne/total >= 0.5) t.push('阅历丰富');
  else if(total && ne/total >= 0.25) t.push('初涉江湖');
  if(nEnd >= 10) t.push('百世轮回');
  else if(nEnd >= 5) t.push('多面人生');
  else if(nEnd >= 2) t.push('人生转折');
  const rec = META.records || {};
  if(rec.god) t.push('真仙临世');
  if(rec.apex) t.push('渡劫圆满');
  if(rec.titled) t.push('大乘尊者');
  if(rec.champion) t.push('论道魁首');
  return t;
}

/* 成就殿堂里程碑 → 永久气运加成（履历丰富者命运眷顾；动态比例档，克制最多 +6）
   注意：不加悟性——悟性在灵根觉醒后受品质上限截断（fei50~shen100），加成会被吃掉无感知 */
function achieveBonus(){
  const t = ACHIEVEMENTS.length, n = ACHIEVEMENTS.filter(a=>a.prog().done).length;
  const r = t ? n/t : 0;
  if(r >= 1)    return 6;
  if(r >= 0.8)  return 4;
  if(r >= 0.5)  return 2;
  if(r >= 0.25) return 1;
  return 0;
}
/* 功法图鉴收集里程碑 → 永久修炼速度加成（参研百家功法，修为进境更快；比例档，克制最多 +10%） */
function gongfaAtlasCultMult(){
  const total = Object.keys(GONGFAS).length;
  if(!total) return 0;
  const ratio = atlasCount('gongfas') / total;
  if(ratio >= 0.8)  return 0.10;
  if(ratio >= 0.55) return 0.05;
  if(ratio >= 0.3)  return 0.02;
  return 0;
}
/* 神通图鉴收集里程碑 → 永久四维加成（精研神通，斗法之资渐盛；比例档，克制最多 +6） */
function shentongAtlasBonus(){
  const total = Object.keys(SHENTONGS).length;
  if(!total) return 0;
  const ratio = atlasCount('shentongs') / total;
  if(ratio >= 0.8)  return 6;
  if(ratio >= 0.55) return 3;
  if(ratio >= 0.3)  return 1;
  return 0;
}
/* 结局图鉴里程碑 → 永久神识加成（百世轮回，精神沉淀；克制，最多 +6） */
function endingBonus(){
  const n = atlasCount('endings');
  if(n >= 16) return 6;
  if(n >= 12) return 4;
  if(n >= 8)  return 2;
  if(n >= 4)  return 1;
  return 0;
}

/* ============ 成就系统（DL_RS_4.139）：图鉴「成就」页展示的跨世成就清单 ============
   分「收集 / 生涯 / 战绩」三类，解锁状态由跨局持久化数据实时推导，无需额外存储：
   收集 → META.atlas（灵根/事件/结局）；生涯 → META.records（成仙/道号/冠军等）；
   战绩 → META.records.best*（历史最高评分/道行/等级，结算时写入） */
const ACH_CATS = [
  {k:'collect', name:'收集'},
  {k:'life',    name:'生涯'},
  {k:'feat',    name:'战绩'}
];
const ACHIEVEMENTS = [
  // —— 收集类：图鉴进度 ——
  {cat:'life', name:'道心通明', desc:'道心达到 90（破境天劫+2%）', prog:function(){ const g=G||{}; return {n:Math.round((g.daoXin||50)), goal:90, done:(g.daoXin||50)>=90}; }},
  {cat:'collect', name:'初窥大道', desc:'参悟第一道法则', prog:function(){ const g=G||{}; const _n=(g.laws||[]).length; return {n:_n, goal:1, done:_n>=1}; }},
          {cat:'collect', name:'元素圆满', desc:'五行元素法则全悟（8 道）', prog:function(){ const g=G||{}; const _n=(g.laws||[]).filter(function(x){ return LAWS_ELEM.indexOf(x)>=0; }).length; return {n:_n, goal:8, done:_n>=8}; }},
          {cat:'collect', name:'大道圆满', desc:'参悟全部十七道法则', prog:function(){ const g=G||{}; const _n=(g.laws||[]).length; return {n:_n, goal:17, done:_n>=17}; }},
          {cat:'collect', name:'初涉江湖', desc:'累计触发过 25% 的事件', prog:function(){
    const t=EVENTS.length, n=atlasCount('events'); return {n:n, goal:Math.max(1,Math.ceil(t*0.25)), done:n>=Math.ceil(t*0.25)}; }},
  {cat:'collect', name:'阅历丰富', desc:'累计触发过 50% 的事件', prog:function(){
    const t=EVENTS.length, n=atlasCount('events'); return {n:n, goal:Math.max(1,Math.ceil(t*0.5)), done:n>=Math.ceil(t*0.5)}; }},
  {cat:'collect', name:'修仙界百晓生', desc:'累计触发过 80% 的事件', prog:function(){
    const t=EVENTS.length, n=atlasCount('events'); return {n:n, goal:Math.max(1,Math.ceil(t*0.8)), done:n>=Math.ceil(t*0.8)}; }},
  {cat:'collect', name:'灵根猎手', desc:'图鉴收录 20 种灵根', prog:function(){
    return {n:atlasCountSouls(), goal:20, done:atlasCountSouls()>=20}; }},
  {cat:'collect', name:'灵根收藏家', desc:'图鉴收录 30 种灵根', prog:function(){
    return {n:atlasCountSouls(), goal:30, done:atlasCountSouls()>=30}; }},
  {cat:'collect', name:'灵根百科全书', desc:'图鉴收录 36 种灵根', prog:function(){
    return {n:atlasCountSouls(), goal:36, done:atlasCountSouls()>=36}; }},
  {cat:'collect', name:'人生转折', desc:'达成 2 种不同结局', prog:function(){
    const n=atlasCount('endings'); return {n:n, goal:2, done:n>=2}; }},
  {cat:'collect', name:'多面人生', desc:'达成 5 种不同结局', prog:function(){
    const n=atlasCount('endings'); return {n:n, goal:5, done:n>=5}; }},
  {cat:'collect', name:'百世轮回', desc:'达成 10 种不同结局', prog:function(){
    const n=atlasCount('endings'); return {n:n, goal:10, done:n>=10}; }},
  // —— 生涯类：某世达成 ——
  {cat:'life', name:'大乘尊者', desc:'某一世修为臻至大乘巅峰', prog:function(){
    const b=!!(META.records||{}).titled; return {n:b?1:0, goal:1, done:b}; }},
  {cat:'life', name:'渡劫圆满', desc:'某一世渡过九重天劫', prog:function(){
    const b=!!(META.records||{}).apex; return {n:b?1:0, goal:1, done:b}; }},
  {cat:'life', name:'真仙临世', desc:'某一世飞升为真仙或证得地仙', prog:function(){
    const b=!!(META.records||{}).god; return {n:b?1:0, goal:1, done:b}; }},
  {cat:'life', name:'论道魁首', desc:'某一世在诸宗联办论道大会夺魁', prog:function(){
    const b=!!(META.records||{}).champion; return {n:b?1:0, goal:1, done:b}; }},
  // —— 战绩类：历史最高纪录 ——
  {cat:'feat', name:'崭露头角', desc:'历史最高评分达到 5000', prog:function(){
    const b=(META.records||{}).bestScore||0; return {n:b, goal:5000, done:b>=5000}; }},
  {cat:'feat', name:'声名鹊起', desc:'历史最高评分达到 2 万', prog:function(){
    const b=(META.records||{}).bestScore||0; return {n:b, goal:20000, done:b>=20000}; }},
  {cat:'feat', name:'传奇一世', desc:'历史最高评分达到 8 万', prog:function(){
    const b=(META.records||{}).bestScore||0; return {n:b, goal:80000, done:b>=80000}; }},
  {cat:'feat', name:'战意初显', desc:'历史最高道行达到 3 万', prog:function(){
    const b=(META.records||{}).bestPower||0; return {n:b, goal:30000, done:b>=30000}; }},
  {cat:'feat', name:'道行绝伦', desc:'历史最高道行达到 30 万', prog:function(){
    const b=(META.records||{}).bestPower||0; return {n:b, goal:300000, done:b>=300000}; }},
  {cat:'feat', name:'登峰造极', desc:'历史最高修为臻至渡劫五重', prog:function(){
    const b=(META.records||{}).bestJie||0; return {n:b, goal:5, done:b>=5}; }},
  {cat:'feat', name:'极限冲击', desc:'历史最高修为臻至渡劫八重', prog:function(){
    const b=(META.records||{}).bestJie||0; return {n:b, goal:8, done:b>=8}; }},
  // —— DL_RS_4.150 扩展：收集类 ——
  {cat:'collect', name:'全知全能', desc:'累计触发过 95% 的事件', prog:function(){
    const t=EVENTS.length, n=atlasCount('events'); return {n:n, goal:Math.max(1,Math.ceil(t*0.95)), done:n>=Math.ceil(t*0.95)}; }},
  {cat:'collect', name:'灵根图鉴满编', desc:'图鉴收录全部灵根', prog:function(){
    return {n:atlasCountSouls(), goal:SOUL_TOTAL, done:atlasCountSouls()>=SOUL_TOTAL}; }},
  {cat:'collect', name:'人生百态', desc:'达成 12 种不同结局', prog:function(){
    const n=atlasCount('endings'); return {n:n, goal:12, done:n>=12}; }},
  // —— DL_RS_4.150 扩展：生涯类 ——
  {cat:'life', name:'八枚俱全', desc:'某一世集齐八枚道胎', prog:function(){
    const b=!!(META.records||{}).nineRings; return {n:b?1:0, goal:1, done:b}; }},
  {cat:'life', name:'法宝大成', desc:'某一世集齐全身法宝', prog:function(){
    const b=!!(META.records||{}).bonesAll; return {n:b?1:0, goal:1, done:b}; }},
  {cat:'life', name:'仙器通神', desc:'某一世获得仙器法宝', prog:function(){
    const b=!!(META.records||{}).shiwan; return {n:b?1:0, goal:1, done:b}; }},
  {cat:'life', name:'极限淬体', desc:'某一世猎妖淬体臻至极限', prog:function(){
    const b=!!(META.records||{}).jixian; return {n:b?1:0, goal:1, done:b}; }},

  {cat:'life', name:'道侣同心', desc:'某一世有道侣相伴', prog:function(){
    const b=!!(META.records||{}).spouse; return {n:b?1:0, goal:1, done:b}; }},
  {cat:'life', name:'开枝散叶', desc:'某一世育有子嗣', prog:function(){
    const b=!!(META.records||{}).child; return {n:b?1:0, goal:1, done:b}; }},
  {cat:'life', name:'长寿之人', desc:'某一世寿元上限达 500 岁', prog:function(){
    const b=!!(META.records||{}).longLife; return {n:b?1:0, goal:1, done:b}; }},
  {cat:'life', name:'鹤发童颜', desc:'某一世寿元上限达 1000 岁', prog:function(){
    const b=!!(META.records||{}).longLife2; return {n:b?1:0, goal:1, done:b}; }},
  // —— DL_RS_4.150 扩展：战绩类 ——
  {cat:'feat', name:'道行破百万', desc:'历史最高道行达到 100 万', prog:function(){
    const b=(META.records||{}).bestPower||0; return {n:b, goal:1000000, done:b>=1000000}; }},
  {cat:'feat', name:'评分二十万', desc:'历史最高评分达到 20 万', prog:function(){
    const b=(META.records||{}).bestScore||0; return {n:b, goal:200000, done:b>=200000}; }},
  {cat:'feat', name:'评分登峰', desc:'历史最高评分达到 60 万', prog:function(){
    const b=(META.records||{}).bestScore||0; return {n:b, goal:600000, done:b>=600000}; }},
  {cat:'feat', name:'羽化登仙', desc:'历史最高修为臻至真仙', prog:function(){
    const b=(META.records||{}).bestJie||0; return {n:b, goal:9, done:b>=9}; }},
  {cat:'feat', name:'天资绝顶', desc:'历史最高单属性达到 500', prog:function(){
    const b=(META.records||{}).bestAttr||0; return {n:b, goal:500, done:b>=500}; }}
];
function achDoneCount(){
  let n=0;
  ACHIEVEMENTS.forEach(function(a){ if(a.prog().done) n++; });
  return n;
}

/* ============ 轮回殿：局外永久加点（轮回点） ============
   每完成 1 局，按本局境界获得轮回点（金丹及以下保底 1，境界越高越多，评分再上浮 1~3）；
   可在轮回殿永久加点，强化下一世。各项每点加成与上限严格按需求设定（手稿）： */
/* LUNHUI_DEF 已外置 data 文件 */;
function lunhuiVal(k){ return META.lunhui[k] || 0; }
/* 局内轮回加护展示——把轮回殿加点转成实际加成文案（局内 HUD 只读显示） */
function lunhuiBuffText(){
  const items = [];
  const fmt = n => (Number.isInteger(n) ? n : Math.round(n*10)/10);
  LUNHUI_DEF.forEach(d=>{
    const v = lunhuiVal(d.k); if(!v) return;
    let t = '';
    switch(d.k){
      case 'superTop': t = '双灵根概率+'+fmt(v*0.07)+'%'; break;
      case 'shenTop':  t = '天灵根概率+'+fmt(v*0.04)+'%'; break;
      case 'sheTop':   t = '圣灵根概率+'+fmt(v*0.025)+'%'; break;
      case 'liLiang':  t = '力量+'+v; break;
      case 'minJie':   t = '灵动+'+v; break;
      case 'tiLi':     t = '气血+'+v; break;
      case 'jingShen': t = '神识+'+v; break;
      case 'life':     t = '寿元上限+'+v; break;
      case 'wuXing':   t = '悟性+'+fmt(v*0.3); break; // 展示同步 0.5→0.3
      case 'cultTop':  t = '修炼速度+'+v*2.5+'%'; break;
      case 'huntTop':  t = '猎妖成功率+'+fmt(v*1.5)+'%'; break;
      case 'epicEv':   t = '紫事件+'+fmt(v*0.1)+'%'; break;
      case 'legendEv': t = '红事件+'+fmt(v*0.1)+'%'; break;
      case 'mythicEv': t = '金事件+'+fmt(v*0.05)+'%'; break;
      case 'shenGan':  t = '天劫庇护+'+fmt(v*0.15)+'%'; break;
      default:         t = d.name+'+'+v;
    }
    items.push(t);
  });
  return items;
}

/* ============ 命格祭炼（DL_RS_4.29/4.31）：轮回殿点满后多余轮回点的出口 ============
   每 15 点轮回点祭炼 1 个「命格」，上限 = 命格池全收集（FATE_POOL.length，v4.31 限制，集齐后不可再祭炼） // 注释同步动态长度；
   每局开局从命格池随机生效，生效数随祭炼数递增（1~3→1 / 4~7→2 / 8+→3 封顶）。
   命格是局内一次性加成（仅本局），不永久膨胀数值——既消化溢出轮回点，又保持
   「初始艰难、轮回渐易」的节奏：命格越多，每局开局起点越高的可能性越大。 */
/* FATE_POOL 已外置 data 文件 */;
const FATE_COST = 15; // 每 15 轮回点祭炼 1 命格
const FATE_MAX = FATE_POOL.length; // 命格祭炼上限=命格池全收集（11），集齐后不可再祭炼
function fateCount(){ return META.fate || 0; }
// 每局生效命格数随祭炼数递增（有梯度收益，且生效有上限）——1~3 生效 1 / 4~7 生效 2 / 8+ 生效 3（封顶）
function fateSlot(){
  const f = fateCount();
  if(f<=0) return 0;
  if(f<=3) return 1;
  if(f<=7) return 2;
  return 3;
}
function rollFates(){
  const n = fateSlot();
  if(n<=0 && !(GIFT && GIFT.fate)) return [];
  let out=[];
  if(GIFT && GIFT.fate){ const fi=FATE_POOL.findIndex(f=>f.name===GIFT.fate); if(fi>=0) out.push(FATE_POOL[fi]); } // 指定命格本局必得
  if(n>0){
    const pool = FATE_POOL.filter(f=>f && f.name!==(GIFT&&GIFT.fate));
    while(out.length<n && pool.length) out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
  }
  return out;
}
function hasFate(g, k){ return g._fates ? g._fates.some(f=>f[k]) : false; }
function applyFateBase(g){
  (g._fates||[]).forEach(f=>{
    if(f.attr) Object.keys(f.attr).forEach(k=>{
      if(k==='气运'||k==='家境') g.a[k]=clamp(g.a[k]+f.attr[k],1,100);
      else g._fateAttrBonus[k] = (g._fateAttrBonus[k]||0) + f.attr[k]; // 四维/悟性命格加成暂存，觉醒掷点后叠加
    });
    if(f.famFloor) g.a.家境 = Math.max(g.a.家境, f.famFloor);
    // 命格天生法宝——出生即自带法宝，跳过修为等级检查（此时角色尚未灵根觉醒，修为为0）
    if(f.bone){
      const _oldG = G; // 保存当前G引用（XL_RS 4.205x：全局单例 G 缓解——此处语义正确：命格天生法宝时 G 需指向新角色，equipBone 内部统一引用 G；4.303：try/finally 兜底，equipBone 抛异常也不致 G 永久错位）
      G = g; // 临时切换G为当前角色，确保equipBone内部引用正确
      let _info = null;
      try{ _info = equipBone(f.bone, null, true); }
      finally{ G = _oldG; } // 无论成败恢复G引用
      if(_info && g.achievements){
        if(f.bone==='仙器' && g.achievements.indexOf('仙器法宝')<0) g.achievements.push('仙器法宝');
        else if(g.achievements.indexOf('法宝')<0) g.achievements.push('法宝');
      }
    }
  });
}
/* 长按连续加点——按住加号/减号按钮自动连续加点，松开停止 */
let _lhPressTimer = null;
let _lhPressBtn = null;
function _lhStartPress(btn, d, k, max){
  if(btn.disabled) return;
  _lhPressBtn = btn;
  const doPoint = ()=>{
    const v = lunhuiVal(k);
    var newV = v, stop = false;
    if(d>0){
      if(META.lundian>0 && v<max){ META.lundian--; newV = v+1; META.lunhui[k]=newV; }
      else { stop = true; }
    } else {
      if(v>0){ META.lundian++; newV = v-1; META.lunhui[k]=newV; }
      else { stop = true; }
    }
    if(stop){ _lhStopPress(); return; }
    saveMeta();
    // 原地更新显示——不重建DOM（重建会销毁触摸目标，导致touchend丢失、长按停不下来）
    var ld = document.getElementById("lunDian"); if(ld) ld.textContent = META.lundian;
    var row = btn.closest(".lhrow");
    if(row){
      var valEl = row.querySelector(".lhval"); if(valEl) valEl.textContent = newV + "/" + max;
      var btns = row.querySelectorAll("button");
      if(btns[0]) btns[0].disabled = (newV <= 0);
      if(btns[1]) btns[1].disabled = (newV >= max || META.lundian <= 0);
    }
  };
  // 第一次立即执行
  doPoint();
  // 300ms后开始连续加点，每80ms一次
  _lhPressTimer = setTimeout(()=>{
    _lhPressTimer = setInterval(doPoint, 80);
  }, 300);
}
function _lhStopPress(){
  if(_lhPressTimer){ clearTimeout(_lhPressTimer); clearInterval(_lhPressTimer); _lhPressTimer = null; }
  _lhPressBtn = null;
}
// 全局监听鼠标/触摸松开，停止连续加点
document.addEventListener('mouseup', _lhStopPress);
document.addEventListener('touchend', _lhStopPress);
document.addEventListener('touchcancel', _lhStopPress);

let _fateCollapsed = false; // 命格池收起/展开状态（会话内记忆）
  let _giftCollapsed = true; // 来世天赋默认收起（会话内记忆，点击可展开） // 补 let（原隐式全局）
  let _daoTongRollCollapsed = true; // 投胎页道统传承默认收起（会话内记忆） // 补 let
/* ============ DL_RS_4.156 转世道统（跨世功法神通传承） ============ */
function daoTongScore(o, kind){ const _ord={天:4,地:3,玄:2,黄:1}; return (_ord[artTierOf(o,kind)]||0)*1000 + artEffSum(o); }
function artEffSum(o){ const e=o&&o.eff?o.eff:{}; let s=0; ['cult','悟性','力量','灵动','气血','神识'].forEach(k=>{ s += (e[k]||0)*100; }); return Math.round(s); }
function recordDaoTong(){
  META.daoTong = META.daoTong || {gongfas: [], shentongs: []};
  if(!G) return;
  // -3：重置式铭刻——历史与当世合并去重后，按品质优先取前 3（功法/神通各 3 门上限，永不膨胀）
  const gf = (G.gongfaOwned||[]).filter(id=>GONGFAS[id] && !GONGFAS[id].special); // 特殊功法（混沌经等事件获得）不入传承池——防白嫖稀有事件奖励
  const st = (G.shentongOwned||[]).filter(id=>SHENTONGS[id] && !SHENTONGS[id].special);
  const mg = META.daoTong.gongfas.slice();
  gf.forEach(id=>{ if(mg.indexOf(id)<0) mg.push(id); });
  META.daoTong.gongfas = mg.sort((a,b)=>daoTongScore(GONGFAS[b],'gongfa')-daoTongScore(GONGFAS[a],'gongfa')).slice(0,3);
  const ms = META.daoTong.shentongs.slice();
  st.forEach(id=>{ if(ms.indexOf(id)<0) ms.push(id); });
  META.daoTong.shentongs = ms.sort((a,b)=>daoTongScore(SHENTONGS[b],'shentong')-daoTongScore(SHENTONGS[a],'shentong')).slice(0,3);
}
function toggleDaoTong(kind, id){ GIFT = GIFT || {}; GIFT[kind] = (GIFT[kind]===id)?null:id; renderDaoTong(); renderDaoTong('daoTongRollBox'); } // 两容器同步刷新（主菜单+投胎页），点击即时反馈
function renderDaoTong(boxId){
  const box = $(boxId || 'daoTongBox'); if(!box) return;
  GIFT = GIFT || {};
  const gf = ((META.daoTong && META.daoTong.gongfas) || []).filter(id=>!GONGFAS[id] || !GONGFAS[id].special); // 过滤特殊功法（旧档残留清理）
  const st = ((META.daoTong && META.daoTong.shentongs) || []).filter(id=>!SHENTONGS[id] || !SHENTONGS[id].special);
  if(!gf.length && !st.length){ box.innerHTML = '<div class="muted" style="font-size:12px;line-height:1.7">尚无传承——完成一局后，按品质铭刻当世修得的功法神通，转世可觉醒（每世 1 功法 + 1 神通，免费习得）。</div>'; return; }
  const isRoll = (boxId === 'daoTongRollBox');
  // 4.252：超大函数拆分——折叠态/展开态抽 2 子函数
  if(isRoll && _daoTongRollCollapsed){ rdtCollapsed(box, gf, st); return; }
  rdtExpanded(box, gf, st, isRoll);
}
function rdtCollapsed(box, gf, st){ // 投胎页折叠态——已铭刻数量 + 已选 + 展开按钮
  const sg = GIFT.daoG || '未选', ss = GIFT.daoShentong || '未选';
  box.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><span class="muted" style="font-size:11.5px">已铭刻功法 <b style="color:var(--gold2)">'+gf.length+'</b> 门 / 神通 <b style="color:var(--gold2)">'+st.length+'</b> 门 · 已选 功法 <b style="color:var(--gold)">'+sg+'</b> / 神通 <b style="color:var(--gold)">'+ss+'</b></span><button class="lhbtn" id="btnDaoTongFold" style="width:auto;padding:0 8px;font-size:11px;white-space:nowrap">展开传承 ▼</button></div>';
  const _f = $('btnDaoTongFold'); if(_f) _f.onclick = ()=>{ _daoTongRollCollapsed=false; renderDaoTong('daoTongRollBox'); };
}
function rdtExpanded(box, gf, st, isRoll){ // 展开态——说明 + 收起按钮 + 传承功法/神通选择（品质着色 + 已选勾选）
  let h = '<div class="muted" style="font-size:12px;line-height:1.7;margin-bottom:6px">每世可觉醒 <b style="color:var(--gold)">1 功法 + 1 神通</b>（点击选择，开局免费习得并装备）。</div>';
  if(isRoll){ h += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px"><span class="muted" style="font-size:11.5px">传承选择</span><button class="lhbtn" id="btnDaoTongFoldUp" style="width:auto;padding:0 8px;font-size:11px;white-space:nowrap">收起传承 ▲</button></div>'; }
  if(gf.length){
    h += '<div style="font-size:12px;color:var(--dim);margin:4px 0 2px">—— 传承功法（选一）——</div><div style="display:flex;flex-wrap:wrap;gap:6px">';
    gf.forEach(id=>{ const o=GONGFAS[id]; if(!o) return; const t=artTierOf(o,'gongfa'); const on=GIFT.daoG===id; h += '<button class="btn mini '+(on?'auto-on':'')+'" style="color:'+ART_TIER_COLOR[t]+';border-color:'+ART_TIER_COLOR[t]+'" onclick="toggleDaoTong(\'daoG\',\''+id+'\')">'+t+'·'+id+(on?' ✓':'')+'</button>'; });
    h += '</div>';
  }
  if(st.length){
    h += '<div style="font-size:12px;color:var(--dim);margin:4px 0 2px">—— 传承神通（选一）——</div><div style="display:flex;flex-wrap:wrap;gap:6px">';
    st.forEach(id=>{ const o=SHENTONGS[id]; if(!o) return; const t=artTierOf(o,'shentong'); const on=GIFT.daoShentong===id; h += '<button class="btn mini '+(on?'auto-on':'')+'" style="color:'+ART_TIER_COLOR[t]+';border-color:'+ART_TIER_COLOR[t]+'" onclick="toggleDaoTong(\'daoShentong\',\''+id+'\')">'+t+'·'+id+(on?' ✓':'')+'</button>'; });
    h += '</div>';
  }
  box.innerHTML = h;
  if(isRoll){ const _u = $('btnDaoTongFoldUp'); if(_u) _u.onclick = ()=>{ _daoTongRollCollapsed=true; renderDaoTong('daoTongRollBox'); }; }
}
 function renderLunhui(){
  $('lunDian').textContent = META.lundian;
  const box=$('lunhuiList'); box.innerHTML='';
  // 4.239：超大函数拆分——加点列表/命格祭炼区拆 2 子函数
  renderLunhuiPoints(box); // 轮回点加点列表（长按连续加点）
  renderLunhuiFate(box);   // 命格祭炼 + 命格池折叠展示
  renderDaoTong(); // 道统传承区渲染
}
function renderLunhuiPoints(box){ // 轮回点加点列表——LUNHUI_DEF 逐项行（−/值/＋，长按连续加点）
  // 轮回殿不再重复展示收集称号（图鉴页已展示），避免信息冗余
  LUNHUI_DEF.forEach(d=>{
    const v = lunhuiVal(d.k);
    const row=document.createElement('div'); row.className='lhrow';
    row.innerHTML = `<div class="ln">${d.name}</div><div class="ld">${d.desc} · ${d.per}</div>
      <div class="lb">
        <button class="lhbtn" data-k="${d.k}" data-d="-1" ${v<=0?'disabled':''}>−</button>
        <span class="lhval">${v}/${d.max}</span>
        <button class="lhbtn" data-k="${d.k}" data-d="1" ${v>=d.max||META.lundian<=0?'disabled':''}>＋</button>
      </div>`;
    row.querySelectorAll('button').forEach(b=>{
      const delta = parseInt(b.dataset.d, 10);
      // 长按连续加点
      b.onmousedown = (e)=>{ e.preventDefault(); _lhStartPress(b, delta, d.k, d.max); };
      b.ontouchstart = (e)=>{ e.preventDefault(); _lhStartPress(b, delta, d.k, d.max); };
      // 防止click事件重复触发（mousedown已经处理了第一次点击）
      b.ontouchmove = (e)=>{ var t=e.touches[0]; if(!t) return; var r=b.getBoundingClientRect(); if(t.clientX<r.left-10||t.clientX>r.right+10||t.clientY<r.top-10||t.clientY>r.bottom+10) _lhStopPress(); };
      b.ontouchcancel = ()=>{ _lhStopPress(); };
    });
    box.appendChild(row);
  });
}
function renderLunhuiFate(box){ // 命格祭炼 + 命格池折叠展示
  // 4.280：超大函数拆分——祭炼卡/命格池抽 2 子函数
  box.appendChild(rlfForge());
  box.appendChild(rlfPool());
}
function rlfForge(){ // 命格祭炼卡——全满解锁 + 轮回点兑换 + 上限 FATE_MAX
  // 命格祭炼（DL_RS_4.29/4.31）：全部加点项满后激活，每 FATE_COST 点轮回点兑换 1 命格；
  // v4.31 限制——祭炼上限=命格池全收集（FATE_MAX），集齐后不可再祭炼；每局生效数随祭炼数递增（1~3→1 / 4~7→2 / 8+→3 封顶）
  // shenGan 不参与全满解锁（防老存档无该键被锁死命格祭炼）
  const allMax = LUNHUI_DEF.every(d=> d.k==='shenGan' || lunhuiVal(d.k)>=d.max);
  const fate = fateCount();
  const full = fate >= FATE_MAX;
  const fr=document.createElement('div'); fr.className='lhrow fate-row';
  fr.innerHTML = `<div class="ln">命格祭炼</div><div class="ld">${allMax
      ? (full ? ('命格已集齐全部 ' + FATE_MAX + ' 种，祭炼圆满。') : '加点已全满——每 15 轮回点祭炼 1 命格，每局生效随祭炼数递增（至多 3 个）')
      : '需先将上方加点全部点满，方可祭炼命格'}</div>
    <div class="lb">
      <span class="lhval">已祭炼 ${Math.min(fate,FATE_MAX)}/${FATE_MAX} 命格</span>
      <button class="lhbtn" id="btnFate" style="width:auto;padding:0 10px;font-size:12px;white-space:nowrap" ${allMax && !full && META.lundian>=FATE_COST ? '' : 'disabled'}>${full?'已集齐':'祭炼（'+FATE_COST+'点）'}</button>
    </div>`;
  const fb = fr.querySelector('#btnFate');
  if(fb) fb.onclick=()=>{ if(META.lundian>=FATE_COST && fate<FATE_MAX){ META.lundian-=FATE_COST; META.fate=fate+1; saveMeta(); renderLunhui(); } };
  return fr;
}
function rlfPool(){ // 命格池折叠展示——已祭炼数决定每局随机生效个数（抽取不重复）
  const fate = fateCount();
  const fateList=document.createElement('div'); fateList.className='fate-tip';
  // 命格池逐格展示效果——已祭炼数决定每局随机生效个数，全部命格可预览
  // 已祭炼数显示封顶 FATE_MAX（老存档在设上限前可能累积超过 12，显示统一为 N/12 圆满）
  let flHtml = `<div style="margin-top:6px;font-size:11px;color:var(--dim);display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><span>已祭炼 <b style="color:var(--gold)">${Math.min(fate,FATE_MAX)}/${FATE_MAX}</b> · 每局从命格池随机生效 <b style="color:var(--gold)">${fate<=0?'0':fateSlot()} 个</b>（抽取不重复，祭炼越多生效越多）</span><button class="lhbtn" id="btnFateFold" style="width:auto;padding:0 8px;font-size:11px;white-space:nowrap">${_fateCollapsed?'展开命格池 ▼':'收起命格池 ▲'}</button></div>`;
  if(!_fateCollapsed){
    flHtml += '<div class="fate-grid">';
    FATE_POOL.forEach(f=>{
      flHtml += `<div class="fate-item" title="${f.desc}"><span class="fate-nm">${f.name}</span><span class="fate-ds">${f.desc}</span></div>`;
    });
    flHtml += '</div>';
  }
  fateList.innerHTML = flHtml;
  const ff = fateList.querySelector('#btnFateFold');
  if(ff) ff.onclick=()=>{ _fateCollapsed = !_fateCollapsed; renderLunhui(); };
  return fateList;
}
let G = null;

/* ============ 工具 ============ */
const $ = id => document.getElementById(id);
const rnd = (a,b)=> a + Math.random()*(b-a);
const ri  = (a,b)=> Math.floor(rnd(a,b+1));
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const clamp = (v,a,b)=> Math.max(a, Math.min(b,v));
function rr(v){ return Math.round(v*100)/100; }
/* ============ 安全工具函数（DL_RS_4.178：防原型链污染/存储型XSS/存档完整性验证） ============ */
// 安全深拷贝：过滤 __proto__/constructor/prototype 键，防止原型链污染
function safeClone(obj){
  if(obj === null || typeof obj !== 'object') return obj;
  if(Array.isArray(obj)) return obj.map(safeClone);
  const out = {};
  for(const k in obj){
    if(k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    if(!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    out[k] = safeClone(obj[k]);
  }
  return out;
}
// HTML实体转义：防止存储型XSS
function escapeHtml(str){
  if(str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}
// 日志HTML安全过滤：保留游戏内部生成的安全标签（b/span/div等），移除危险内容
function sanitizeLogHtml(str){
  if(str === null || str === undefined) return '';
  let s = String(str);
  // 移除script标签及内容
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<script[^>]*>/gi, '');
  // 移除on*事件属性
  s = s.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // 移除javascript:协议
  s = s.replace(/javascript\s*:/gi, '');
  // 移除vbscript:协议
  s = s.replace(/vbscript\s*:/gi, '');
  // 移除data:协议（除了图片）
  s = s.replace(/data\s*:\s*(?!image\/)/gi, '');
  // 移除iframe/object/embed/form/input等危险标签
  s = s.replace(/<\/?(iframe|object|embed|form|input|button|textarea|select|option|link|meta|style|base)[^>]*>/gi, '');
  return s;
}
// 安全数值：限制数值范围，防止Infinity/NaN/超大值
function safeNum(v, min, max, def){
  const n = Number(v);
  if(!isFinite(n) || isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}
// 存档数据完整性验证：白名单字段 + 类型/范围校验
/* 存档字段 schema——白名单 + 清洗器（validateSaveData 表驱动化：新增简单字段只加一行；复杂结构字段 soul/dual/achievements/attrs/log/rings/bones 保留逐条清洗） */
const SAVE_SCHEMA = {
  name:      {clean: function(v){ return escapeHtml(v||'无名').substring(0,50); }},
  lv:        {clean: function(v){ return safeNum(v,0,999,0); }},
  age:       {clean: function(v){ return safeNum(v,0,9999,0); }},
  score:     {clean: function(v){ return safeNum(v,0,99999999,0); }},
  power:     {clean: function(v){ return safeNum(v,0,99999999,0); }},
  saveTime:  {clean: function(v){ return escapeHtml(v||'').substring(0,50); }},
  endTitle:  {clean: function(v){ return escapeHtml(v||'').substring(0,100); }},
  deathCause:{clean: function(v){ return escapeHtml(v||'').substring(0,200); }},
  godTitle:  {clean: function(v){ return escapeHtml(v||'').substring(0,50); }},
  org:       {clean: function(v){ return escapeHtml(v||'').substring(0,50); }},
  spouse:    {clean: function(v){ return escapeHtml(v||'').substring(0,50); }},
  children:  {clean: function(v){ return safeNum(v,0,999,0); }}
};
function validateSaveData(data){
  if(!data || typeof data !== 'object') throw new Error('存档数据格式无效');
  if(!data.meta || typeof data.meta !== 'object') throw new Error('存档缺少 meta 字段');
  if(!data.ruleset || typeof data.ruleset !== 'string') throw new Error('存档缺少 ruleset 字段');
  // 4.222：超大函数拆分——按存档清洗层级抽子函数（清洗逻辑零变化）
  const m = data.meta;
  validateMeta(m);          // meta 关键字段清洗
  validateBoard(m);         // 轮回榜逐条清洗
  validateHistorySaves(m);  // 历史存档逐条清洗
  return data;
}
function validateMeta(m){ // 校验 meta 中的关键字段——数值/对象类型/来世天赋配置清洗
  m.lundian = safeNum(m.lundian, 0, 99999, 0);
  m.fate = safeNum(m.fate, 0, 99999, 0);
  if(typeof m.lunhui !== 'object' || m.lunhui === null) m.lunhui = {};
  // 来世天赋配置清洗——恶意/异常存档可注入非法 wuQ/fate/evQ 致 giftCost NaN 或 rollQuality 抛错
  if(typeof m.gift !== 'object' || m.gift === null) m.gift = {};
  m.gift.wuQ = Q_KEYS[m.gift.wuQ] ? m.gift.wuQ : null;
  m.gift.fate = (m.gift.fate && FATE_POOL.some(function(f){ return f.name===m.gift.fate; })) ? m.gift.fate : null;
  m.gift.evQ = (m.gift.evQ==='legend' || m.gift.evQ==='mythic') ? m.gift.evQ : null;
  // 轮回加点逐键清洗——恶意存档可注入超值键（shenGan 有感应 0.5 封顶兜底，但 cultTop 等无兜底会放大修炼），按 LUNHUI_DEF.max 收紧
  LUNHUI_DEF.forEach(function(d){ if(m.lunhui[d.k] !== undefined) m.lunhui[d.k] = Math.max(0, Math.min(d.max, safeNum(m.lunhui[d.k], 0, d.max, 0))); });
  if(typeof m.atlas !== 'object' || m.atlas === null) m.atlas = {souls:{}, events:{}, endings:{}, gongfas:{}, shentongs:{}}; // 兜底补齐功法/神通图鉴键（recordAtlas 惰性创建本不崩，补齐更稳）
  ['souls','events','endings','gongfas','shentongs'].forEach(function(_k){ if(typeof m.atlas[_k] !== 'object' || m.atlas[_k] === null) m.atlas[_k] = {}; }); // 分类键类型清洗——恶意存档可注入字符串（Object.keys("evil") 返回字符索引数组致计数错乱；recordAtlas 对字符串属性赋值静默失败）
  if(typeof m.records !== 'object' || m.records === null) m.records = {};
  // records 数值清洗——best* 字段数值化，其余布尔化（成就进度 p.n 直接进 innerHTML，防恶意存档注入）
  const _rk = m.records;
  ['bestScore','bestPower','bestLv','bestAttr','bestJie'].forEach(function(k){ _rk[k] = safeNum(_rk[k], 0, 999999999, 0); });
  Object.keys(_rk).forEach(function(k){ if(['bestScore','bestPower','bestLv','bestAttr','bestJie'].indexOf(k)<0) _rk[k] = !!_rk[k]; });
}
function validateBoard(m){ // 轮回榜逐条清洗——board 的 soul/god/score 直接进 innerHTML（renderBoard），恶意存档可注入存储型 XSS
  if(!Array.isArray(m.board)) m.board = [];
  m.board = m.board.slice(0, 200).map(function(r){
    if(typeof r !== 'object' || r === null) return null;
    return {
      score: safeNum(r.score, 0, 99999999, 0),
      power: safeNum(r.power, 0, 999999999, 0),
      lv: safeNum(r.lv, 0, 999, 0),
      age: safeNum(r.age, 0, 9999, 0),
      quality: escapeHtml(r.quality || '').substring(0, 20),
      soul: escapeHtml(r.soul || '').substring(0, 50),
      xian: safeNum(r.xian, 0, 10, 0),
      god: escapeHtml(r.god || '').substring(0, 50),
      alive: !!r.alive,
      t: safeNum(r.t, 0, 9999999999999, 0)
    };
  }).filter(function(r){ return r !== null; });
}
function validateHistorySaves(m){ // 历史存档——数量限制（最多50条）+ 逐条清洗
  if(!Array.isArray(m.historySaves)) m.historySaves = [];
  // 限制历史存档数量（最多50条），防止资源耗尽
  if(m.historySaves.length > 50) m.historySaves = m.historySaves.slice(0, 50);
  // 校验每条历史存档
  m.historySaves = m.historySaves.map(s=>validateHistorySave(s)).filter(s=>s !== null);
}
function validateHistorySave(s){ // 单条历史存档清洗——标量/灵魂/双修/成就/日志/道胎/法宝
  if(typeof s !== 'object' || s === null) return null;
  Object.keys(SAVE_SCHEMA).forEach(function(_k){ s[_k] = SAVE_SCHEMA[_k].clean(s[_k]); }); // 简单标量字段表驱动清洗（清洗器与手写逐字一致）
  // 4.279：超大函数拆分——灵魂/日志/物品抽 3 子函数
  vhsSoul(s);
  vhsLog(s);
  vhsItems(s);
  return s;
}
function vhsSoul(s){ // 灵魂信息/道侣/成就/属性清洗
  if(typeof s.soul === 'object' && s.soul !== null){
    s.soul.name = escapeHtml(s.soul.name || '').substring(0, 50);
    s.soul.quality = escapeHtml(s.soul.quality || '').substring(0, 20);
    s.soul.xian = safeNum(s.soul.xian, 0, 10, 0);
  }
  if(typeof s.dual === 'object' && s.dual !== null){
    s.dual.name = escapeHtml(s.dual.name || '').substring(0, 50);
  }
  if(!Array.isArray(s.achievements)) s.achievements = [];
  s.achievements = s.achievements.map(a=>escapeHtml(a).substring(0, 50)).slice(0, 100);
  if(typeof s.attrs !== 'object' || s.attrs === null) s.attrs = {};
}
function vhsLog(s){ // 日志清洗——最多 1000 条，危险 HTML 过滤（防资源耗尽）
  if(!Array.isArray(s.log)) s.log = [];
  s.log = s.log.slice(0, 1000).map(l=>{
    if(typeof l !== 'object' || l === null) return {text:'', cls:'', age:null};
    return {
      text: sanitizeLogHtml(l.text || '').substring(0, 500), // 日志做危险HTML过滤，保留游戏内部安全标签
      cls: escapeHtml(l.cls || '').substring(0, 50),
      age: (l.age !== null && l.age !== undefined) ? safeNum(l.age, 0, 9999, null) : null
    };
  });
}
function vhsItems(s){ // 双修道侣/道胎法宝/骨骼法宝清洗（各限 20 件）
  if(!Array.isArray(s.rings)) s.rings = [];
  s.rings = s.rings.slice(0, 20).map(r=>{
    if(typeof r !== 'object' || r === null) return {y:0, name:'', skill:''};
    const _ry = r.y!==undefined ? r.y : (r.year===undefined ? 0 : (r.year>=3 ? (r.year>=10000?2:(r.year>=1000?1:0)) : r.year));
    return {
      y: Math.max(0, Math.min(2, safeNum(_ry, 0, 2, 0))),
      name: escapeHtml(r.beast || r.name || '').substring(0, 50),
      skill: escapeHtml(r.skill || '').substring(0, 50)
    };
  });
  if(!Array.isArray(s.bones)) s.bones = [];
  s.bones = s.bones.slice(0, 20).map(b=>{
    if(typeof b !== 'object' || b === null) return {grade:'', slot:'', skill:'', name:'', pct:0, main:''};
    return {
      id: String(b.id || ''),
      grade: escapeHtml(b.grade || '').substring(0, 20),
      slot: escapeHtml(b.slot || '').substring(0, 20),
      skill: escapeHtml(b.skill || '').substring(0, 50),
      name: escapeHtml(b.name || '').substring(0, 30),
      pct: Number(b.pct) || 0,
      main: escapeHtml(b.main || '').substring(0, 10)
    };
  });
}
function bar(attr, val, cls, bonus, calc){
  // 属性仅显示名称+数值（无横条）；战斗四维不设上限，不做百分比条
  // 支持额外加成小字显示（总值大号 + 加成小字绿色）
  const _bonusHtml = (bonus !== undefined && bonus !== null && bonus > 0) ? `<div class="bonus">+${bonus}</div>` : '';
  return `<div class="attrbox ${cls||''}"${calc ? ` data-calc="${calc}" title="点击查看计算明细"` : ''}><div class="nm">${attr}</div><div class="vl">${typeof val === 'string' ? val : Math.floor(val)}</div>${_bonusHtml}</div>`;
}
/* 属性计算明细弹窗——点击属性查看各类加成与计算过程 */
function showAttrCalc(k){
  const g = G;
  if(!g || !g.a || !g.base) return;
  const a = g.a;
  const _rqc = RQ_COEF;
  const rq = (g.soul && _rqc[g.soul.quality]) || 1;
  const _i = FIGHT_ATTRS.indexOf(k);
  const base = g.base[k]||0;
  const openV = (g._attrBase && g._attrBase[k]) || base;
  const realmB = base - openV;
  const bCnt = g._bCount||0, sCnt = g._sCount||0;
  // 4.230：超大函数拆分——道胎/神通/法宝三块明细计算拆 attrCalcDetails
  const _det = attrCalcDetails(g, a, k, _i);
  const dp = _det.dp, dpRows = _det.dpRows, st = _det.st, stRows = _det.stRows, bb = _det.bb, bbRows = _det.bbRows;
  const fx = (a[k]||0) - base;
  const mult = 1 + rq*(dp+st);
  const mid = base*mult + fx;
  const eff = effAttr(k);
  const effF = Math.floor(eff);
  // 4.249：超大函数拆分——弹窗外壳（遮罩/标题/关闭）抽 sacModalShell；4.264 四层明细体抽 sacBody
  const _body = sacBody(g, base, openV, realmB, bCnt, sCnt, dp, dpRows, st, stRows, bb, bbRows, fx, mult, mid, rq, effF);
  document.body.appendChild(sacModalShell(k, effF, _body));
}
function sacBody(g, base, openV, realmB, bCnt, sCnt, dp, dpRows, st, stRows, bb, bbRows, fx, mult, mid, rq, effF){ // 属性计算弹窗四层明细体
  const _realmRow = realmB ? `开局 ${openV} → 境界突破累计 <span style="color:var(--gold)">+${realmB}</span>${(bCnt||sCnt) ? `（大境 ${bCnt} 次 · 小境 ${sCnt} 次）` : ''} = base <b>${base}</b>` : `开局 <b>${base}</b>（尚无境界奖励）`;
  const _ringRow = dpRows || '<div style="padding-left:10px;color:var(--dim)">无</div>';
  const _stRow = stRows || '<div style="padding-left:10px;color:var(--dim)">无</div>';
  const _bbRow = bbRows || '<div style="padding-left:10px;color:var(--dim)">无</div>';
  const _fxRow = fx ? `${fx>0?'+':'−'}${Math.abs(Math.round(fx*10)/10)}` : '0';
  const _multHtml = `×[1 + ${rq} × (道胎 ${Math.round(dp*100)}%${st?` + 神通 ${Math.round(st*100)}%`:''})] = <b>×${mult.toFixed(3)}</b>`;
  return `
    <div style="color:var(--gold2);font-weight:600;margin-top:4px">① 基础层（base）</div>
    <div>${_realmRow}</div>
    <div style="color:var(--gold2);font-weight:600;margin-top:8px">② 资质层 × 灵根系数</div>
    <div>灵根品质系数 <span style="color:var(--gold)">×${rq}</span>${(g.soul&&g.soul.quality&&Q_KEYS[g.soul.quality])?`（${Q_KEYS[g.soul.quality]}）`:''}</div>
    <div>道胎加成：</div>${_ringRow}
    <div>神通加成：</div>${_stRow}
    <div style="color:var(--gold);margin:4px 0">base ${base} ${_multHtml} = <b>${(base*mult).toFixed(1)}</b></div>
    <div style="color:var(--gold2);font-weight:600;margin-top:8px">③ 后天固定（事件/丹药/伤势/法宝部位）</div>
    <div>累计 <span style="color:var(--gold)">${_fxRow}</span> → <b>${mid.toFixed(1)}</b></div>
    <div style="color:var(--gold2);font-weight:600;margin-top:8px">④ 法宝加成 ×</div>
    ${_bbRow}
    <div style="color:var(--gold);margin:4px 0">×${(1+bb).toFixed(2)}</div>
    <div style="border-top:1px solid var(--line);margin-top:8px;padding-top:6px;color:var(--gold);font-weight:600">终值 = ${mid.toFixed(1)} × ${(1+bb).toFixed(2)} = <b>${effF}</b></div>`;
}
function sacModalShell(k, effF, bodyHtml){ // 属性弹窗外壳——遮罩/标题栏/关闭按钮/内容（点击遮罩或 ✕ 关闭）
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(8,12,22,.72);z-index:999;display:flex;align-items:center;justify-content:center;padding:18px';
  modal.onclick = (e)=>{ if(e.target===modal) modal.remove(); };
  modal.innerHTML = `<div data-ac style="background:var(--panel);border:1px solid var(--gold2);border-radius:12px;max-width:400px;width:100%;max-height:80vh;overflow:auto;padding:14px 16px;font-size:12px;color:var(--text);line-height:1.85" onclick="event.stopPropagation()">
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:8px;margin-bottom:8px">
      <b style="font-size:15px;color:var(--gold)">${k} · ${effF}</b>
      <span style="color:var(--dim);cursor:pointer;font-size:14px" onclick="this.closest('[data-ac]').parentNode.remove()">✕</span>
    </div>
    <div>${bodyHtml}</div>
  </div>`;
  return modal;
}
function attrCalcDetails(g, a, k, _i){ // 属性弹窗三块明细计算——道胎/神通/法宝；返回 {dp,dpRows,st,stRows,bb,bbRows}
  // 道胎明细
  let dp = 0, dpRows = '';
  (g.rings||[]).forEach(r=>{ const pct = ringAttrBonus(r.y)[_i]; if(!pct) return; dp += pct; dpRows += `<div style="padding-left:10px">${r.beast||'道胎'} · <span style="color:var(--gold)">${ringGradeKey(r.y)}</span> +${Math.round(pct*100)}%</div>`; });
  // 神通明细（含灵根契合乘算）
  let st = 0, stRows = '';
  (g.shentong||[]).forEach(id=>{ const s_ = SHENTONGS[id]; if(!s_) return; const ab = s_.attr ? attrMatchBonus(s_.attr) : 0; const eff = (s_.eff[k]||0)*(1+ab); if(!eff) return; st += eff; stRows += `<div style="padding-left:10px">${s_.name||id}${ab ? ` <span style="color:var(--purple)">(契合×${(1+ab).toFixed(2)})</span>` : ''} +${Math.round(eff*100)}%</div>`; });
  // 法宝明细（四件位 + 本命）
  let bb = 0, bbRows = '';
  for(const slot of BONE_SLOTS){ const b = boneEquipped(slot); if(b && b.main===k){ bb += (b.pct||0)/100; bbRows += `<div style="padding-left:10px">${b.name||slot}（${slot}） +${Math.round(b.pct||0)}%</div>`; } }
  const xb = g.extraBone;
  if(xb && xb.pct){ const hs = []; if(xb.main===k) hs.push(xb.main); if(xb.sub===k) hs.push(xb.sub); if(hs.length){ bb += xb.pct/100; bbRows += `<div style="padding-left:10px">本命法宝·${hs.join('+')} +${Math.round(xb.pct)}%</div>`; } }
  return {dp, dpRows, st, stRows, bb, bbRows};
}
function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $(id).classList.add('active');
  // 切换非游戏页时重置滚动到顶部——避免保留长页面（轮回殿/总结页）的滚动位置，导致返回轮回殿后需上滑才能看到「踏入轮回」
  if(id !== 'screen-game') window.scrollTo(0,0);
}
function realmIdx(lv){ // 修为值→境界索引 0-9（渡劫=9），10=真仙
  const rs = CFG.realms;
  if(lv >= rs[10]) return 10;
  for(let i=9;i>=1;i--){ if(lv >= rs[i]) return i; }
  return 0;
}
// 段长表与段起点偏移——36 条独立修为条（每小境界独立 0→段长；初 B/中 2B/后 4B/巅 10B）
function subSegLen(g, sub){ const B = REALM_B[g.realm]||1; const s = Math.min(3, Math.max(0, (sub===undefined||sub===null)?0:sub)); return [1,2,4,10][s] * B; }
function subSegBase(g, sub){ const B = REALM_B[g.realm]||1; const s = Math.min(3, Math.max(0, (sub===undefined||sub===null)?0:sub)); return [0,1,3,7][s] * B; }
function realmAbs(g){ // 绝对修为值现算（等价旧 g.lv = 境界起点+小境偏移+境内修为；阶段3 起仅存档/评分/封顶兼容用，字段 g.lv 已废弃）
  const _sb = (g.subRealm === undefined || g.subRealm === null) ? 0 : g.subRealm;
  return CFG.realms[g.realm] + subSegBase(g, _sb) + (g.realmPos || 0);
}
function realmOf(){ // 独立修为条——境界即状态字段（巅满挂起 realm 已是当前境，无需换算）
  return G.realm;
}
function isDujieOf(){ // 渡劫期统一判定（realm=9；大乘巅满挂起 realm=8 自动排除）
  const g = G;
  return g.realm === 9 && !g.godTitle && !g._sanxian;
}
function tierOf(){ // 境界序号直读（realm 权威：炼体0…大乘8/渡劫9/真仙11；巅满挂起 realm 已是当前境，无需修为换算修正）
  const g = G;
  return g.realm >= 10 ? 11 : g.realm;
}
function effLvValue(l){ // 事件修为等级奖励→修为值增量（旧等级语义：0~l 级跨度，等价 expOfLv(l)-expOfLv(0)；阶段2 后仅奖励换算用）
  if(l >= 100) return CFG.realms[10];
  const r = Math.min(9, Math.floor(l/10));
  const span = CFG.realms[r+1]-CFG.realms[r];
  return CFG.realms[r] + span*((l - r*10)/10);
}
function inRealmProg(g){ // 境内总进度（权威字段：小境偏移+境内修为，替代 g.lv-CFG.realms[realm]）
  const _sb = (g.subRealm === undefined || g.subRealm === null) ? 0 : g.subRealm;
  return subSegBase(g, _sb) + (g.realmPos || 0);
}
function reqLvPass(g, l){ // 旧等级修为门槛判定（兼容 POST_REQ/syn.lv 遗留数据：10 级一境，等价 expOfLv，不依赖 g.lv；支持 [min,max]）
  const arr = Array.isArray(l);
  const mn = arr ? (l[0]||0) : l;
  const mx = arr ? (l[1]===undefined?999:l[1]) : 999;
  if(mn >= 100){ if(g.realm < 10) return false; }
  else {
    const rn = Math.min(9, Math.floor(mn/10));
    if(g.realm < rn) return false;
    if(g.realm === rn){ const span = CFG.realms[rn+1]-CFG.realms[rn]; if(inRealmProg(g) < span*((mn-rn*10)/10)) return false; }
  }
  if(mx >= 100) return true;
  const rx = Math.min(9, Math.floor(mx/10));
  if(g.realm > rx) return false;
  if(g.realm === rx){ const span = CFG.realms[rx+1]-CFG.realms[rx]; if(inRealmProg(g) > span*((mx-rx*10)/10)) return false; }
  return true;
}
function reqRealmPass(g, rr){ // realm 语义修为门槛判定：{realm:N|数组, pos:P|数组}（v4.349 事件数据；pos=段内进度 0~1）
  if(rr === undefined || rr === null) return true;
  const arr = Array.isArray(rr.realm);
  const mnR = arr ? (rr.realm[0]||0) : rr.realm;
  const mxR = arr ? (rr.realm[1]===undefined?10:rr.realm[1]) : 10;
  const pArr = Array.isArray(rr.pos);
  const mnP = pArr ? (rr.pos[0]||0) : (rr.pos||0);
  const mxP = pArr ? (rr.pos[1]===undefined?1:rr.pos[1]) : 1;
  const prog = inRealmProg(g);
  const spanOf = function(r){ return CFG.realms[Math.min(9,r)+1] - CFG.realms[Math.min(9,r)]; };
  if(g.realm < mnR || (g.realm === mnR && prog < mnP * spanOf(mnR))) return false;
  if(g.realm > mxR || (g.realm === mxR && prog > mxP * spanOf(mxR))) return false;
  return true;
}
function realmReqLabel(rr){ // 修为门槛显示（realm 语义；段档与 realmName 同源）
  if(rr === undefined || rr === null) return '';
  const arr = Array.isArray(rr.realm);
  const r0 = arr ? (rr.realm[0]||0) : rr.realm;
  const r1 = arr ? (rr.realm[1]===undefined?10:rr.realm[1]) : rr.realm;
  const p0 = (Array.isArray(rr.pos) ? (rr.pos[0]||0) : (rr.pos||0));
  const p1 = (Array.isArray(rr.pos) ? (rr.pos[1]===undefined?1:rr.pos[1]) : 1);
  const lbl = function(r, p){
    if(r >= 10) return '真仙';
    if(r >= 9) return '渡劫期';
    const name = TIER_NAMES[r] || '炼体';
    const span = CFG.realms[Math.min(9,r)+1] - CFG.realms[r];
    const off = span * p;
    const B = REALM_B[r] || 1;
    if(off >= 7*B) return name + '巅峰';
    if(off >= 3*B) return name + '后期';
    if(off >= B) return name + '中期';
    return name + '初期';
  };
  if(arr) return '修为' + lbl(r0, p0) + '~' + lbl(r1, p1);
  return '修为≥' + lbl(r0, p0);
}
/* 境界称号（仅显示用，DL_RS_4.25）：严格按境界细分——
   大乘期分初期/中期/后期/巅峰，渡劫期一劫一级，真仙圆满。
   tierOf 仍用于道行倍率与寿命档位（大乘/渡劫同档），二者互不影响。 */
function realmName(lv){ // 段位显示；无参=当前玩家（realm/subRealm/realmPos 权威直读）；传修为值=任意值换算（道侣等非玩家）
  const g = G;
  if(lv === undefined || lv === null) return subRealm().name;
  if(lv >= CFG.realms[10]) return '真仙';
  const r = realmIdx(lv);
  if(r === 9) return '渡劫·'+Math.min(9, ((g&&g._jie)||0)+1)+'劫';
  const pos = lv - CFG.realms[r];
  const B = REALM_B[r];
  const sub = pos < B ? '初期' : (pos < 3*B ? '中期' : (pos < 7*B ? '后期' : '巅峰'));
  return TIER_NAMES[r]+sub;
}
/* 大境界键（突破检测/排序用，不含小境；渡劫用中文数字以匹配 _REALM_ORDER） */
function realmKey(lv){ // 独立修为条——境界直接读 g.realm
  const g = G;
  if(g.realm >= 10) return '真仙';
  const _pend = (g._breakPending !== undefined && g._breakPending !== null);
  if(g.realm === 9 && !_pend) return '渡劫·'+('一二三四五六七八九'[Math.min(8,(g._jie)||0)])+'劫';
  if(_pend){ // 巅满(3)挂起按当前境巅峰；小境界挂起显示当前段（realm 即当前境）
    if(g._breakPending === 3) return (TIER_NAMES[g.realm]||'炼体')+'·巅峰';
    return (TIER_NAMES[g.realm]||'炼体') + SUB_TIER[g._breakPending];
  }
  return TIER_NAMES[g.realm] || '炼体';
}
/* 道号称号系统（DL_RS_4.33）：渡劫期及以上按灵根授予专属道号（道号与灵根/事迹相关：
   火灵根→炎阳、雷灵根→紫霄……）。
   专有映射优先；未命中的按灵根名提取核心词兜底（去除灵根/兽属后缀取前段）。 */
const TITLE_MAP = {
  '火灵根':'炎阳','木灵根':'青木','水灵根':'玄水','金灵根':'庚金','土灵根':'厚土',
  '风灵根':'巽风','雷灵根':'紫霄','冰灵根':'玄冰',
  '火木灵根':'炎木','火金灵根':'炎金','火水灵根':'炎玄','火土灵根':'炎岳',
  '水木灵根':'青玄','水土灵根':'玄岳','木金灵根':'青金','木土灵根':'青岳',
  '金土灵根':'金岳','金水灵根':'金玄','无灵根':'凡体'
};
/* ============ 道号系统（XL_RS 4.53）============
   元婴（realms[4]）及以上破境时获道号：核心 = [功法字|事迹字|性格字] + [灵根属性字]；
   后缀随境界：元婴/化神·真人 → 炼虚/合体·真君 → 大乘/渡劫·道君 → 真仙·仙尊 */
function soulAttrChar(s){ // 灵根属性 → 道号字
  const n = (s && s.name) || '';
  if(n.indexOf('火')>=0) return '炎';
  if(n.indexOf('雷')>=0) return '霆';
  if(n.indexOf('风')>=0) return '啸';
  if(n.indexOf('冰')>=0) return '霜';
  if(n.indexOf('金')>=0) return '庚';
  if(n.indexOf('木')>=0) return '青';
  if(n.indexOf('水')>=0) return '玄';
  if(n.indexOf('土')>=0) return '岳';
  if(s && s.quality==='fei') return '凡';
  if(s && s.quality==='she') return '元';
  return '灵';
}
function gongfaCharOf(id){ // 主修功法名 → 道号字（去"诀/功/经…"后缀取首字）
  if(!id) return '';
  const name = String(id).replace(/[《》「」]/g,'');
  const core = name.replace(/(诀|功|经|典|录|法|印|指|式|步|剑|掌|拳|刀|术|道|书|篇|真解)$/,'');
  return (core.length ? core[0] : name[0]) || '';
}
function deedCharOf(g){ // 事迹（功德/业力/成就）→ 道号字
  const gd = g.功德||0, ye = g.业力||0;
  if(gd >= 20) return '善';
  if(ye >= 20) return '煞';
  const ach = (g.achievements||[]).length;
  if(ach >= 15) return '镇';
  if(ach >= 8) return '望';
  return '';
}
function daoHaoCoreOf(){ // 生成道号核心（元婴破境时定，终身不变）
  const g = G;
  if(!g.soul) return '';
  const xgMap = {勇猛:'烈', 豪迈:'云', 机敏:'玄', 沉稳:'渊', 隐忍:'幽'};
  const xg = xgMap[g.personality] || '清';
  const gfChar = (g.gongfa && g.gongfa.main) ? gongfaCharOf(g.gongfa.main) : '';
  const deed = deedCharOf(g);
  const first = gfChar || deed || xg; // 功法 > 事迹 > 性格
  return first + soulAttrChar(g.soul);
}
function daoHaoFull(g){ // 完整道号 = 核心 + 境界后缀
  g = g || G;
  if(!g.daoHaoCore) return '';
  let sfx = '真人';
  const t = tierOf();
  if(t >= 11) sfx = '仙尊';
  else if(t >= 8) sfx = '道君';
  else if(t >= 6) sfx = '真君';
  return g.daoHaoCore + sfx;
}
function dhTxt(g){ // 评语用：道号优先，无则用结算称号
  if(!g) return '';
  return g.daoHaoCore ? daoHaoFull(g) : (g.finalTitle || '');
}
function realmTitle(){
  const g=G;
  if(!g.soul || g.realm < 9) return '';
  // 修仙版：渡劫期按灵根授予道号（一般 2 字、与自身灵根相关）——绝不出「某·道君」。
  // 剥壳逻辑仅作旧存档防御
  let n = g.soul.name;
  let base = n;
  if(n.includes('·')){
    const parts = n.split('·');
    const last = parts[parts.length-1];
    if(last==='残' || last==='衰'){
      base = parts.slice(0,-1).join('·');
      if(base.includes('·')) base = base.split('·').pop();
    } else {
      base = last;
    }
  }
  if(!base) base = '道'; // 剥壳退化为空串时兜底，防 TITLE_MAP[''] 空索引
  if(TITLE_MAP[base]) return TITLE_MAP[base] + '道君';
  const strip = base.replace(/^[圣天神]/, '');
  if(strip !== base && TITLE_MAP[strip]) return TITLE_MAP[strip] + '道君';
  // 兜底：提取灵根核心词（去灵根/兽属后缀后取前两字）
  const core = base.replace(/灵根$|草$|蛇$|虎$|猫$|兔$|鹰$|熊$|猿$|龙$|蝎$|蝶$|凤$|狼$|猪$|牛$|马$|蜂$|蛛$|燕$|鹤$|鹏$|猴$|犬$|鼠$|雕$|犀$|驹$|狮$|豹$|花$|竹$|莲$|菊$|兰$|棠$|藤$|树$|塔$|剑$|枪$|弓$|刀$|锤$|槌$|镰$|盾$|棍$|棒$|斧$|叉$|瓶$|权杖$|葫芦$|琵琶$|埙$|针$|链$|弩$/,'');
  return (core.length>=2 ? core.slice(0,2) : base.slice(0,2)) + '道君';
}

/* ============ 道行：力/敏/体/精 + 道胎 + 神通 六项 ============
   升级后的量级：四维与道胎神通加权，叠加境界倍率（每大境界 ×2.2）。
   大乘及以上道行保底百万（XL_RS 4.28）；渡劫/真仙量级千万（最弱配置全稳道胎 + 中等属性）。
   powerBreakdown() 返回各项明细供「道行构成」面板展示（DL_RS_4.42 道行透明化）。 */
function powerBreakdown(){
  const a = G.a;
  // 数值健壮性——防止Infinity/NaN导致道行计算异常
  const _ea = effAttrs(); // 战斗四维终值（base×资质×法宝，分层计算）
  const sLi = isFinite(_ea.力量) ? _ea.力量 : 0;
  const sMin = isFinite(_ea.灵动) ? _ea.灵动 : 0;
  const sTi = isFinite(_ea.气血) ? _ea.气血 : 0;
  const sJing = isFinite(_ea.神识) ? _ea.神识 : 0;
  // 道行重做——四维总和 × 境界倍率 × 灵根品质 × 道胎加成 ×（神通+法则）× 本命法宝
  const base = sLi + sMin + sTi + sJing; // 四维总和（力量/灵动/气血/神识 终值）
  // 境界倍率：低境界指数曲线（每大境界约 ×2.2，×0.2 压缩）；合体起放缓为递减增长（50/75/130/210）
  const _tk = tierOf();
  const mult = _tk <= 6 ? (Math.pow(2.2, _tk) * 0.2) : (_tk === 7 ? 50 : _tk === 8 ? 75 : _tk === 9 ? 130 : 210);
  // 灵根品质系数（与四维资质层/修炼速度同一 _rqc 表）
  const _rqc = RQ_COEF;
  const soulMult = G.soul ? (_rqc[G.soul.quality] || 1.0) : 1.0;
  // 道胎加成：有瑕 −5% / 无缺 0 / 完美 +5%，多枚加算
  let ringMul = 1;
  (G.rings||[]).forEach(r=>{ const _v = ringGradeOf(r.y); ringMul += _v===2 ? 0.05 : _v===0 ? -0.05 : 0; });
  // 神通加成：黄1% / 玄2% / 地3% / 天4%（按游戏原生品阶 artTierName，与图鉴同源）
  let skP = 0;
  (G.shentong||[]).forEach(id=>{ const _st = SHENTONGS[id]; if(!_st) return; const _t = artTierName(id, SHENTONGS); skP += _t==='天' ? 0.04 : _t==='地' ? 0.03 : _t==='玄' ? 0.02 : 0.01; });
  // 法则加成：元素每道 +1% / 至高每道 +3%，与神通加算
  const _laws = G.laws || [];
  const _le = _laws.filter(function(x){ return LAWS_ELEM.indexOf(x) >= 0; }).length;
  const _ls = _laws.filter(function(x){ return LAWS_SUP.indexOf(x) >= 0; }).length;
  const lawP = _le*0.01 + _ls*0.03;
  const skMul = 1 + skP + lawP;
  // 本命法宝加成：凡器1% / 灵器2% / 宝器3% / 仙器4%（与神通+法则乘算）；法域系统已移除
  const xbP = G.extraBone ? ({凡器:0.01, 灵器:0.02, 宝器:0.03, 仙器:0.04}[G.extraBone.grade] || 0) : 0;
  const xbMul = 1 + xbP;
  let total = Math.round(Math.max(0, base * mult * soulMult * ringMul * skMul * xbMul));
  return { base, mult, soulMult, ringMul, skMul, xbMul, skP, lawP, bb: boneBonus(), total: total, raw: total }; // 乘法链道行
}
function woundMult(){ // 伤势系数（道行/修为获取） // 境界加重——境界越高伤及本源，折损每大境界 +2%（大乘上限 16%）
  const _w = G.wound||0;
  const _b = _w>=3 ? 0.5 : _w===2 ? 0.75 : _w===1 ? 0.9 : 1;
  const _h = Math.min(8, G.realm||0) * 0.02;
  return 1 - (1-_b) * (1+_h);
}
function woundHealYears(){ // 自然愈合间隔——境界越高伤及本源越难自愈（炼气 2 年/大乘 6 年）
  return [2,2,3,3,4,4,5,5,6][Math.min(8, G.realm||0)] || 2;
}
function woundHealNeed(){ // 调养所需次数——境界越高消耗越多（1/2/3 次调养-1）
  const _r = G.realm||0;
  return _r >= 6 ? 3 : _r >= 3 ? 2 : 1;
}
function woundDanNeed(){ // 疗伤丹所需颗数——境界越高药力越弱（1/2/3 颗-1）
  const _r = G.realm||0;
  return _r >= 6 ? 3 : _r >= 3 ? 2 : 1;
}
function woundName(){ const _w=G.wound||0; return _w>=3?'濒危':_w===2?'重伤':_w===1?'轻伤':''; }
function power(){ return powerBreakdown().total * woundMult(); } // 伤势折算道行
/* 道行构成面板（DL_RS_4.42）：属性面板「道行」旁的「构成」按钮，展开六项明细，
   让玩家明确成长方向——基础四维/道胎/神通/境界倍率/灵根品质系数各贡献多少。 */
function togglePowerBrk(){
  const el = $('powerBrk'); if(!el) return;
  if(el.style.display === 'block'){ el.style.display='none'; return; }
  const b = powerBreakdown();
  const _w = G.wound||0;
  el.innerHTML = `<div style="font-size:12px;color:var(--dim);line-height:1.8;padding:5px 8px;background:var(--panel);border:1px solid var(--line);border-radius:6px">
    <b style="color:var(--gold)">道行构成</b><br>
    四维总和 <span style="color:var(--gold)">${Math.round(b.base)}</span>（力量+灵动+气血+神识 终值）<br>
    × 境界倍率 <span style="color:var(--gold)">×${b.mult.toFixed(2)}</span>（${realmKey()}）<br>
    × 灵根品质 <span style="color:var(--gold)">×${b.soulMult.toFixed(2)}</span>（${G.soul?(Q_KEYS[G.soul.quality]||''):''}）<br>
    × 道胎加成 <span style="color:var(--gold)">×${b.ringMul.toFixed(2)}</span>（完美+5% / 有瑕−5% 加算）<br>
    × 神通+法则 <span style="color:var(--gold)">×${b.skMul.toFixed(2)}</span>（神通+${Math.round(b.skP*100)}% / 法则+${Math.round(b.lawP*100)}%）<br>
    × 本命法宝 <span style="color:var(--gold)">×${b.xbMul.toFixed(2)}</span>（${G.extraBone?G.extraBone.grade:'无'} · 凡1/灵2/宝3/仙4%）<br>
    <b style="color:var(--gold2)">道行 = ${Math.round(b.base)} × ${b.mult.toFixed(2)} × ${b.soulMult.toFixed(2)} × ${b.ringMul.toFixed(2)} × ${b.skMul.toFixed(2)} × ${b.xbMul.toFixed(2)} = ${b.total}</b>${_w?('<br><span style="color:var(--red)">伤势折算 ×'+woundMult().toFixed(2)+' → '+Math.round(power())+'</span>'):''}</div>`;
  el.style.display='block';
}

/* ============ 开始 / 轮回殿 ============ */
/* 轮回榜（本机生涯纪录）——按评分/道行/等级排序，结算自动入榜，Top10 上榜提示 */
let BOARD_TAB = 'score';
function boardRecord(){
  const g=G;
  const rec = {score:endScoreOf(), power:Math.round(power()), lv:Math.round(realmAbs(g)), jie:(g._jie||0), age:g.age,
    quality:g.soul.quality, soul:g.soul.name, xian:g.soul.xian, god:g.godTitle||(g.endTag?g.endTag:''),
    alive:!!g.alive, t:Date.now(),
    realmTag: g.godTitle ? g.godTitle : (g._sanxian ? (g._sanxian+'劫散仙') : (TIER_NAMES[g.realm]||'炼体'))};
  META.board = META.board||[];
  META.board.push(rec);
  if(META.board.length > 200) META.board = META.board.slice(-200);
  const sorted = META.board.slice().sort(function(a,b){return b.score-a.score;});
  const rank = sorted.indexOf(rec)+1;
  return {rec:rec, rank:rank, onBoard: rank<=10};
}
function setBoardTab(k){ BOARD_TAB=k; renderBoardTabs(); renderBoard(); }
function renderBoardTabs(){
  const tb=$('boardTabs'); if(!tb) return;
  tb.style.display='flex';
  Array.prototype.forEach.call(tb.querySelectorAll('button'), function(b){
    b.className = 'btn mini ' + (b.getAttribute('data-bt')===BOARD_TAB?'primary':'');
  });
}
function boardSortKey(r){ return BOARD_TAB==='power'?r.power : BOARD_TAB==='lv'?r.lv : r.score; }
function boardQualityKey(r){ // 排行榜灵根品质 key——以灵根名属性数为权威（修历史错配：优木灵根→神；无/杂/圣无属性字则用 quality）
  const nm = (r && r.soul) ? String(r.soul) : '';
  const attrs = nm.replace('灵根','').split('').filter(function(c){ return '金木水火土风雷冰'.indexOf(c) >= 0; });
  if(attrs.length) return attrs.length>=5?'pu' : attrs.length===4?'you' : attrs.length===3?'ding' : attrs.length===2?'super' : 'shen';
  const _qk = {fei:1,pu:1,you:1,ding:1,super:1,shen:1,she:1};
  return (r && r.quality && _qk[r.quality]) ? r.quality : 'pu';
}
function boardRealmTag(r){ // 排行榜历史记录境界——新记录用入榜快照 realmTag；旧记录按修为值反推境界段
  if(r && r.realmTag) return r.realmTag;
  if(r && r.god) return r.god;
  const lv = (r && r.lv)||0;
  const rs = CFG.realms||[];
  let idx = 0;
  for(let i=rs.length-1;i>=0;i--){ if(lv >= (rs[i]||0)){ idx=i; break; } }
  return TIER_NAMES[idx] || '炼体';
}
function archiveRealmTag(s){ // 历史存档境界——优先 godTitle 快照（真仙/地仙/N劫散仙/九幽真魔），否则按修为值反推（修 realmKey 读当前局的残留错乱）
  if(s && s.godTitle) return s.godTitle;
  return boardRealmTag(s);
}
function postReqName(pst){ // 宗门职位需求境界名（POST_REQ 旧等级语义 11/21/... → 大境界名）
  const _lv = POST_REQ[pst] || 0;
  return TIER_NAMES[Math.min(9, Math.floor(_lv / 10))] || '';
}
function renderBoard(){
  const panel=$('boardPanel'); if(!panel) return;
  const rows=(META.board||[]).slice();
  rows.sort(function(a,b){return boardSortKey(b)-boardSortKey(a);});
  const top=rows.slice(0,10);
  if(!top.length){ panel.innerHTML='<div class="muted" style="padding:10px 0">尚未有转世记录。完成第一世后，轮回榜将记录你最强的转世。</div>'; return; }
  let h='<div style="display:flex;flex-direction:column;gap:6px">';
  // 4.244：超大函数拆分——单行渲染抽子函数
  top.forEach(function(r,i){ h += boardRowHtml(r, i); });
  h+='</div>';
  panel.innerHTML = h;
}
function boardRowHtml(r, i){ // 轮回榜单行——名次奖牌/评分/道行/境界/灵根/转世者/神位/寿元
  const rank=i+1;
  const medal = rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':('#'+rank);
  const qCls = 'q-'+(r.quality||'pu');
  const godTag = r.god ? '<span class="ering purple" style="font-size:11px">'+escapeHtml(r.god)+'</span>' : ''; // 渲染层转义兜底
  const aliveTag = (r.alive || r.god) ? '' : '<span class="muted" style="font-size:11px">·逝</span>'; // 成仙记录不显示「逝」，仙寿无尽
  const QN={fei:'无',pu:'五',you:'四',ding:'三',super:'双',shen:'天',she:'圣'};
  return '<div style="display:flex;align-items:center;gap:10px;padding:6px 8px;background:var(--cardbg,rgba(0,0,0,0.25));border-radius:8px">'
    + '<span style="width:26px;text-align:center;font-weight:700;color:var(--gold)">'+medal+'</span>'
    + '<span style="width:64px;text-align:center"><b>'+escapeHtml(r.score)+'</b><br><span class="muted" style="font-size:10px">评分</span></span>'
    + '<span style="width:64px;text-align:center"><b>'+escapeHtml(r.power)+'</b><br><span class="muted" style="font-size:10px">道行</span></span>'
    + '<span style="width:40px;text-align:center"><b>'+escapeHtml(boardRealmTag(r))+'</b></span>'
    + '<span style="flex:1;font-size:12px"><span class="atlas-item owned q-'+boardQualityKey(r)+'">'+(QN[boardQualityKey(r)]||'?')+'</span> '+escapeHtml(r.soul)+' '+godTag+'<br><span class="muted" style="font-size:10.5px">'+(r.god?'神寿无尽':'享年'+escapeHtml(r.age)+'岁')+'</span>'+aliveTag+'</span>'
    + '</div>';
}
$('btnBoard').onclick = ()=>{ openBoardModal(); };
/* 轮回榜改为弹窗式 */
function openBoardModal(){
  let m=$('boardModal'); if(m && m.parentNode!==document.body) document.body.appendChild(m);
  if(!m){ m=document.createElement('div'); m.id='boardModal'; m.style.display='none'; document.body.appendChild(m); }
  m.innerHTML = '<div class="evmodal" onclick="if(event.target===this)closeBoardModal()"><div class="evmodal-card">'
    + '<div class="evmodal-head"><b>轮回榜 · 万世留名</b><span style="font-size:11px;color:var(--dim)">（本机生涯纪录）</span><button class="cl" onclick="closeBoardModal()">✕</button></div>'
    + '<div id="boardTabs" style="display:flex;gap:6px;margin-bottom:8px">'
    + '<button class="btn mini" data-bt="score" onclick="setBoardTab(\'score\')">按评分</button>'
    + '<button class="btn mini" data-bt="power" onclick="setBoardTab(\'power\')">按道行</button>'
    + '<button class="btn mini" data-bt="lv" onclick="setBoardTab(\'lv\')">按境界</button></div>'
    + '<div id="boardPanel"></div></div></div>';
  m.style.display='flex';
  try{ renderBoardTabs(); renderBoard(); }catch(e){ const bp=$('boardPanel'); if(bp) bp.innerHTML='<div class="muted" style="padding:10px 0">排行榜渲染异常：'+e.message+'</div>'; }
}
function closeBoardModal(){
  const m=$('boardModal'); if(m){ m.style.display='none'; m.innerHTML=''; }
}
function renderStart(){
  renderLunhui();
  renderAtlasSumm();
  // v4.346：返回轮回殿时若存档面板已展开则刷新——保存新档后返回不再残留旧列表
  const _hp = document.getElementById('historyPanel');
  if(_hp && _hp.style.display === 'block') renderHistorySaves();
}
const BONE_TOTAL = Object.keys(BONE_NAMES).reduce(function(a,k){ return a + BONE_NAMES[k].length; }, 0); // 法宝图鉴总数（4 部位×12 名）
function renderAtlasSumm(){
  const box = $('atlasSumm'); if(!box) return;
  const ns = atlasCountSouls(), ne = atlasCount('events'), nEnd = atlasCount('endings');
  box.innerHTML = `
    <div class="atlas-group"><div class="atlas-gt">收集进度</div><div class="atlas-grow">
      <div class="atlas-chip"><b>${ns}/${SOUL_TOTAL}</b><span>灵根</span></div>
      <div class="atlas-chip"><b>${ne}/${EVENTS.length}</b><span>事件</span></div>
      <div class="atlas-chip"><b>${nEnd}</b><span>结局</span></div>
      <div class="atlas-chip"><b>${Math.min(atlasCount('gongfas'),Object.keys(GONGFAS).length)}/${Object.keys(GONGFAS).length}</b><span>功法</span></div>
      <div class="atlas-chip"><b>${Math.min(atlasCount('shentongs'),Object.keys(SHENTONGS).length)}/${Object.keys(SHENTONGS).length}</b><span>神通</span></div>
      <div class="atlas-chip"><b>${Math.min(atlasCount('bones'),BONE_TOTAL)}/${BONE_TOTAL}</b><span>法宝</span></div>
    </div></div>
    <div class="atlas-group"><div class="atlas-gt">永久加成 · 开局生效</div><div class="atlas-grow">
      <div class="atlas-chip"><b>+${atlasBonus()}</b><span>灵根气运</span></div>
      <div class="atlas-chip"><b>+${achieveBonus()}</b><span>成就气运</span></div>
      <div class="atlas-chip"><b>+${atlasBonusEvents()}</b><span>事件悟性</span></div>
      <div class="atlas-chip"><b>+${endingBonus()}</b><span>结局神识</span></div>
      <div class="atlas-chip"><b>+${gongfaAtlasCultMult()*100}%</b><span>功法修炼</span></div>
      <div class="atlas-chip"><b>+${shentongAtlasBonus()}</b><span>神通四维</span></div>
      <div class="atlas-chip"><b>${collectionTitles().length}</b><span>称号</span></div>
    </div></div>`;
}
$('btnAtlas').onclick = ()=>{ openAtlasModal(); };
/* 图鉴改为弹窗式（跨世收集面板） */
function openAtlasModal(){
  let m=$('atlasModal'); if(m && m.parentNode!==document.body) document.body.appendChild(m);
  if(!m){ m=document.createElement('div'); m.id='atlasModal'; m.style.display='none'; document.body.appendChild(m); }
  m.innerHTML = '<div class="evmodal" onclick="if(event.target===this)closeAtlasModal()"><div class="evmodal-card">'
    + '<div class="evmodal-head"><b>图鉴 · 轮回见闻</b><span style="font-size:11px;color:var(--dim)">（跨世收集）</span><button class="cl" onclick="closeAtlasModal()">✕</button></div>'
    + '<div id="atlasPanel"></div></div></div>';
  m.style.display='flex';
  try{ renderAtlas($('atlasPanel')); }catch(e){ const ap=$('atlasPanel'); if(ap) ap.innerHTML='<div class="muted" style="padding:10px 0">图鉴渲染异常：'+e.message+'</div>'; }
}
function closeAtlasModal(){
  const m=$('atlasModal'); if(m){ m.style.display='none'; m.innerHTML=''; }
}
/* 功法/神通图鉴详情弹窗（复用 artModal 容器） */
function showArtAtlas(cat, id){
  const tbl = cat==='gongfas' ? GONGFAS : SHENTONGS;
  try{ id = decodeURIComponent(id); }catch(e){} // onclick 经 encodeURIComponent 传入，防引号破坏字符串（内部中文 id 解码后不变）
  const it = tbl[id]; if(!it) return;
  let m=$('artModal'); if(!m) return;
  document.body.appendChild(m); // 移至末尾，避免被图鉴/排行榜主弹窗覆盖
  const effTxt = (it.eff && typeof it.eff==='object') ? Object.keys(it.eff).map(k=>(k==='cult'?'修炼':k)+'+'+Math.round(it.eff[k]*100)+'%').join('、') : '无';
  const src = it.org==='坊市' ? '万宝楼购买' : (it.org==='奇遇' ? '机缘获得' : it.org+'藏经阁');
  m.innerHTML = '<div class="evmodal" onclick="if(event.target===this)closeArt()"><div class="evmodal-card">'
    + '<div class="evmodal-head"><b style="color:'+ART_TIER_COLOR[artTierName(id, tbl)]+'">【'+id+'】</b><span class="muted" style="font-size:10px">'+artTierName(id, tbl)+'</span>'+artAttrHtml(id, tbl)+'<span style="font-size:11px;color:var(--dim)">'+src+'</span><button class="cl" onclick="closeArt()">✕</button></div>'
    + '<div class="evmodal-txt">'+it.desc+'</div>'
    + '<div style="font-size:12.5px;color:var(--gold)">'+effTxt+'</div></div></div>';
  m.style.display='flex';
}
/* 图鉴分类 tab——像排行榜一样按「灵根/事件/结局/称号」大类 + 品质筛选切换查看 */
let ATLAS_TAB='soul', ATLAS_Q='all';
function setAtlasTab(k){ ATLAS_TAB=k; ATLAS_Q='all'; const p=$('atlasPanel'); if(!p) return; try{ renderAtlas(p); }catch(e){ p.innerHTML='<div class="muted" style="padding:10px 0">图鉴渲染异常：'+e.message+'</div>'; } }
function setAtlasQ(q){ ATLAS_Q=q; const p=$('atlasPanel'); if(!p) return; try{ renderAtlas(p); }catch(e){ p.innerHTML='<div class="muted" style="padding:10px 0">图鉴渲染异常：'+e.message+'</div>'; } }
function renderAtlas(box){
  const tabBtn = (k,name,on,cls)=> '<button class="btn mini '+(on?'primary':'')+'" onclick="'+cls+'">'+name+'</button>';
  // 大分类 tab
  let html = '<div class="atlas-tabs">'
    + tabBtn('soul','灵根', ATLAS_TAB==='soul',"setAtlasTab('soul')")
    + tabBtn('event','事件', ATLAS_TAB==='event',"setAtlasTab('event')")
    + tabBtn('end','结局', ATLAS_TAB==='end',"setAtlasTab('end')")
    + tabBtn('title','称号', ATLAS_TAB==='title',"setAtlasTab('title')")
    + tabBtn('ach','成就', ATLAS_TAB==='ach',"setAtlasTab('ach')")
    + tabBtn('mishi','秘境', ATLAS_TAB==='mishi',"setAtlasTab('mishi')")
    + tabBtn('dan','丹药', ATLAS_TAB==='dan',"setAtlasTab('dan')")
    + tabBtn('art','功法神通', ATLAS_TAB==='art',"setAtlasTab('art')")
    + tabBtn('bone','法宝', ATLAS_TAB==='bone',"setAtlasTab('bone')")
    + tabBtn('stat','统计', ATLAS_TAB==='stat',"setAtlasTab('stat')")
    + '</div>';
  // 4.215：超大函数拆分——8 个 tab 分支抽为独立子函数（纯重构，渲染逻辑零变化）
  if(ATLAS_TAB==='title') html += renderAtlasTitle();
  else if(ATLAS_TAB==='end') html += renderAtlasEnd();
  else if(ATLAS_TAB==='soul') html += renderAtlasSoul();
  else if(ATLAS_TAB==='bone') html += renderAtlasBone();
  else if(ATLAS_TAB==='art') html += renderAtlasArt();
  else if(ATLAS_TAB==='ach') html += renderAtlasAch();
  else if(ATLAS_TAB==='mishi') html += renderAtlasMishi();
  else if(ATLAS_TAB==='dan') html += renderAtlasDan();
  else if(ATLAS_TAB==='stat') html += renderAtlasStat();
  else html += renderAtlasEvent();
  box.innerHTML = html;
}
/* 图鉴子渲染：各 tab 分支（4.215 从 renderAtlas 拆分，变量全为全局或分支内局部） */
function renderAtlasTitle(){
  let html = '';
  {
    // 收集称号区
    const _titles = collectionTitles();
    html += '<div class="atlas-sec"><h4>收集称号（'+_titles.length+'）</h4><div class="atlas-grid">';
    if(_titles.length) _titles.forEach(t=>{ html += '<span class="atlas-item owned" style="color:var(--gold)">'+t+'</span>'; });
    else html += '<span class="atlas-item locked">持续收集灵根、事件与结局，或达成飞升/成仙成就以解锁称号</span>';
    html += '</div></div>';
  }
  return html;
}
function renderAtlasEnd(){
  let html = '';
  {
    // 结局图鉴
    const endNames = Object.keys(META.atlas.endings||{});
    html += '<div class="atlas-sec"><h4>结局图鉴（'+endNames.length+'）</h4><div class="atlas-grid">';
    
    if(endNames.length) endNames.forEach(n=>{ html += `<span class="atlas-item owned" title="${escapeHtml(n)}">${escapeHtml(n)}</span>`; });
    else html += '<span class="atlas-item locked">尚无达成结局</span>';
    html += '</div></div>';
  }
  return html;
}
function renderAtlasSoul(){
  let html = '';
  {
    // 灵根品质子 tab（带收集计数）
    const QS=[['all','全部',''],['fei','废','q-fei'],['pu','普','q-pu'],['you','优','q-you'],['ding','顶','q-ding'],['super','超','q-super'],['shen','神','q-shen'],['she','圣','q-she']];
    html += '<div class="atlas-tabs sub">'+QS.map(function(x){
      const list = x[0]==='all' ? [] : (SOULS_BY_Q[x[0]]||[]);
      const cnt = x[0]==='all' ? atlasCountSouls()+'/'+SOUL_TOTAL : list.filter(s=>atlasHas('souls',s.name)).length+'/'+list.length;
      const label = x[0]==='all' ? x[1] : '<span class="atlas-item owned '+x[2]+'" style="padding:0 3px">'+x[1]+'</span>';
      return '<button class="btn mini '+(ATLAS_Q===x[0]?'primary':'')+'" onclick="setAtlasQ(\''+x[0]+'\')">'+label+' '+cnt+'</button>';
    }).join('')+'</div>';
    html += '<div class="atlas-sec"><h4>灵根图鉴 · 集齐 10/20/30/36 得气运 +2/+5/+8/+15</h4><div class="atlas-grid">';
    const qlist = ATLAS_Q==='all' ? ['fei','pu','you','ding','super','shen','she'] : [ATLAS_Q];
    qlist.forEach(q=>{
      const list = SOULS_BY_Q[q];
      const ownedN = list.filter(s=>atlasHas('souls', s.name)).length;
      html += `<div class="atlas-qg"><span class="q-${q}" style="font-weight:700">${Q_KEYS[q]}</span> <span class="muted">${ownedN}/${list.length}</span></div>`;
      list.forEach(s=>{
        const owned = atlasHas('souls', s.name);
        html += `<span class="atlas-item ${owned?('owned q-'+q):'locked'}" title="${s.name}（${Q_KEYS[q]}）">${owned?s.name:'???'}</span>`;
      });
    });
    html += '</div></div>';
  }
  return html;
}
function renderAtlasBone(){
  let html = '';
  {
    // 法宝图鉴（跨世记录获得/炼成；按部位分组展示名称池）
    const _ownN = BONE_SLOTS.reduce(function(_a,_sl){ return _a + (BONE_NAMES[_sl]||[]).filter(function(_n){ return atlasHas('bones',_n); }).length; }, 0); // v4.343 仅计当前池（旧版遗留名不计入，与格子一致）
    html += '<div class="atlas-sec"><h4>法宝图鉴（'+_ownN+'/'+BONE_TOTAL+'）</h4>';
    BONE_SLOTS.forEach(function(slot){
      const list = BONE_NAMES[slot]||[];
      const ownN = list.filter(function(n){ return atlasHas('bones', n); }).length;
      html += '<div style="margin:6px 0 2px;font-size:12px;color:var(--gold)">'+slot+'（'+ownN+'/'+list.length+'）</div><div class="atlas-grid">';
      list.forEach(function(n){
        html += atlasHas('bones', n)
          ? '<span class="atlas-item owned" title="'+escapeHtml(n)+'">'+escapeHtml(n)+'</span>'
          : '<span class="atlas-item locked">'+escapeHtml(n)+'</span>';
      });
      html += '</div>';
    });
    html += '<div class="muted" style="font-size:11px">法宝图鉴跨世记录获得与炼成的法宝（含本命祭炼）。</div></div>';
  }
  return html;
}
function renderAtlasArt(){
  // 功法神通图鉴（跨世记录习得，名称+来源+效果）
  // 4.291：超大函数拆分——功法/神通图鉴抽 2 子函数
  // 4.206m：功法神通图鉴按品质排序（天>地>玄>黄，同品质按名称）
  const _tierR = {天:0, 地:1, 玄:2, 黄:3};
  const gfAll = Object.keys(GONGFAS).sort((a,b)=>(_tierR[artTierName(a,GONGFAS)]??9)-(_tierR[artTierName(b,GONGFAS)]??9) || a.localeCompare(b,'zh'));
  const stAll = Object.keys(SHENTONGS).sort((a,b)=>(_tierR[artTierName(a,SHENTONGS)]??9)-(_tierR[artTierName(b,SHENTONGS)]??9) || a.localeCompare(b,'zh'));
  const gfOwn = gfAll.filter(id=>atlasHas('gongfas', id));
  const stOwn = stAll.filter(id=>atlasHas('shentongs', id));
  let html = '';
  html += raaGongfas(gfAll, gfOwn);
  html += raaShentongs(stAll, stOwn);
  return html;
}
function raaGongfas(gfAll, gfOwn){ // 功法图鉴——按品质着色 + 已习得可点详情（未习得锁定）
  let html = '<div class="atlas-sec"><h4>功法图鉴（'+gfOwn.length+'/'+gfAll.length+'）</h4><div class="atlas-grid">';
  gfAll.forEach(id=>{
    const f=GONGFAS[id]||{desc:'',org:'?'};
    const owned = atlasHas('gongfas', id);
    if(owned) html += `<span class="atlas-item owned ev-click" title="${escapeHtml(f.desc)}" onclick="showArtAtlas('gongfas','${encodeURIComponent(id)}')"><span style="color:${ART_TIER_COLOR[artTierName(id, GONGFAS)]}">${escapeHtml(id)}</span><br><span style="font-size:10px;color:var(--dim)">${artTierName(id, GONGFAS)} · ${escapeHtml(f.org)}${f.attr?(' · '+f.attr):''}</span></span>`;
    else html += '<span class="atlas-item locked" title="尚未习得">???</span>';
  });
  html += '</div></div>';
  return html;
}
function raaShentongs(stAll, stOwn){ // 神通图鉴——按品质着色 + 已习得可点详情（未习得锁定）
  let html = '<div class="atlas-sec"><h4>神通图鉴（'+stOwn.length+'/'+stAll.length+'）</h4><div class="atlas-grid">';
  stAll.forEach(id=>{
    const st=SHENTONGS[id]||{desc:'',org:'?'};
    const owned = atlasHas('shentongs', id);
    if(owned) html += `<span class="atlas-item owned ev-click" title="${escapeHtml(st.desc)}" onclick="showArtAtlas('shentongs','${encodeURIComponent(id)}')"><span style="color:${ART_TIER_COLOR[artTierName(id, SHENTONGS)]}">${escapeHtml(id)}</span><br><span style="font-size:10px;color:var(--dim)">${artTierName(id, SHENTONGS)} · ${escapeHtml(st.org)}${st.attr?(' · '+st.attr):''}</span></span>`;
    else html += '<span class="atlas-item locked" title="尚未习得">???</span>';
  });
  html += '</div></div>';
  return html;
}
function renderAtlasAch(){
  let html = '';
  {
    // 成就进度数值取整（历史最高单属性等浮点值不再带长尾巴）
    const _fmtAch = function(n){ return (typeof n==='number') ? Math.round(n) : n; };
    // 成就页（DL_RS_4.139）：收集/生涯/战绩三类，已达成金色勾选、未达成灰色带进度
    const doneN = achDoneCount();
    html += '<div class="atlas-sec"><h4>成就（'+doneN+'/'+ACHIEVEMENTS.length+'）</h4><div class="atlas-grid">';
    ACH_CATS.forEach(function(cat){
      const list = ACHIEVEMENTS.filter(function(a){ return a.cat===cat.k; });
      html += '<div class="atlas-qg"><span style="font-weight:700;color:var(--gold)">'+cat.name+'</span> <span class="muted">'+list.filter(function(a){return a.prog().done;}).length+'/'+list.length+'</span></div>';
      list.forEach(function(a){
        const p = a.prog();
        html += '<div class="ach-item '+(p.done?'done':'lock')+'"><span class="ach-name">'+(p.done?'✓ ':'')+a.name+'</span><span class="ach-desc">'+a.desc+'</span><span class="ach-prog">'+escapeHtml(_fmtAch(p.n))+'/'+escapeHtml(_fmtAch(p.goal))+'</span></div>'; // 进度数值转义兜底
      });
    });
  }
  return html;
}
function renderAtlasMishi(){ // 4.318 秘境图鉴——跨世累计探索次数/最好收获
  let html = '';
  const _ml = META.mishiLog || {};
  const _tot = Object.keys(_ml).reduce(function(s,id){ return s + ((_ml[id]||{}).times||0); }, 0);
  html += '<div class="atlas-sec"><h4>秘境图鉴（'+(typeof MISHI!=='undefined'?MISHI.length:0)+' 处 · 累计探索 '+_tot+' 次）</h4><div class="atlas-grid">';
  if(typeof MISHI!=='undefined') MISHI.forEach(function(ms){
    const _r = _ml[ms.id] || {times:0, best:0};
    const _owned = _r.times > 0;
    html += '<div class="atlas-item ' + (_owned?'owned':'locked') + '" style="text-align:left;line-height:1.7">'
      + '<span style="font-weight:700;color:'+(_owned?'var(--gold)':'var(--dim)')+'">'+ms.name+'</span>'
      + '<span style="display:block;font-size:11px;color:var(--dim)">'+ms.d+'</span>'
      + '<span style="display:block;font-size:11px">' + (_owned ? ('探索 '+_r.times+' 次 · 最好收获 '+_r.best) : '尚未探索') + '</span>'
      + '</div>';
  });
  html += '</div><div class="muted" style="font-size:11px;margin-top:6px">跨世累计，每局结束自动更新。</div></div>';
  return html;
}
function renderAtlasDan(){ // 4.322 丹药图鉴——已炼成/未炼成 + 丹方材料效果
  let html = '';
  const _keys = Object.keys(DANFANGS);
  const _got = _keys.filter(function(id){ return atlasHas('dans', id); }).length;
  html += '<div class="atlas-sec"><h4>丹药图鉴（'+_got+'/'+_keys.length+'）</h4><div class="atlas-grid">';
  _keys.forEach(function(id){
    const df = DANFANGS[id]; const _owned = atlasHas('dans', id);
    html += '<div class="atlas-item ' + (_owned?'owned':'locked') + '" style="text-align:left;line-height:1.7">'
      + '<span style="font-weight:700;color:'+(_owned?'var(--gold)':'var(--dim)')+'">'+df.name+'</span>'
      + '<span class="muted" style="font-size:11px;display:block">材料：妖材×'+df.mat+' + 灵草×'+df.herb+'（基础成功率 '+Math.round(df.p*100)+'%）</span>'
      + '<span style="display:block;font-size:11px">效果：'+df.eff+'</span>'
      + '</div>';
  });
  html += '</div><div class="muted" style="font-size:11px;margin-top:6px">炼成即收集（本世历炼成功记录），跨世累计。</div></div>';
  return html;
}
function statRowsOf(){ // 4.357 跨世统计数据源——statRows 优先；首次调用把历史手动存档并入（防历史数据丢失）
  if(!META.statRows) META.statRows = [];
  if(META.statRows.length===0 && META.historySaves && META.historySaves.length){
    META.historySaves.forEach(function(a){
      META.statRows.push({godTitle:a.godTitle||'', deathCause:a.deathCause||'', soul:(a.soul&&a.soul.quality)?{quality:a.soul.quality}:null, age:a.age||0, score:(typeof a.score==='number')?a.score:0});
    });
  }
  return META.statRows;
}
function renderAtlasStat(){
  let html = '';
  // 4.235：超大函数拆分——结局分类/统计聚合拆 2 子函数
  const _saves = statRowsOf(); // 4.357 跨世统计数据源（轻量记录，自动全量）
  const agg = atlasStatAgg(_saves); // 跨世统计聚合
  const _cnt = agg.cnt, _qual = agg.qual, _n = agg.n, _xianN = agg.xianN;
  const _QNAME = {fei:'无', pu:'五', you:'四', ding:'三', super:'双', shen:'天', she:'圣'};
  const _QCOL = {fei:'#9e9e9e', pu:'#e8e8e8', you:'#7ec850', ding:'#6f9bff', super:'#c39bd3', shen:'#ff6b6b', she:'#ffd700'};
  const _ORDER = ['fei','pu','you','ding','super','shen','she'];
  // 4.257：超大函数拆分——统计卡/结局分布/灵根表抽 3 子函数
  html += '<div class="atlas-sec"><h4>跨世统计（'+_n+' 世）</h4>';
  html += rasCards(agg, _n, _xianN);
  html += rasEnding(_cnt, _n);
  html += rasQuality(_qual, _QNAME, _QCOL, _ORDER);
  html += '<div class="muted" style="font-size:11px;margin-top:6px">基于全量生涯（'+_n+' 局），新局结束自动记录。</div>';
  html += '</div>';
  return html;
}
function rasCards(agg, _n, _xianN){ // 跨世统计卡——成仙/成仙率/平均与最高寿元/平均评分
  let html = '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">';
  const _card = function(k,v){ html += '<div style="flex:1;min-width:96px;text-align:center;padding:8px;border:1px solid var(--line);border-radius:6px"><div style="font-size:19px;font-weight:700;color:var(--gold)">'+v+'</div><div style="font-size:11px;color:var(--dim)">'+k+'</div></div>'; };
  _card('成仙', _xianN+' 世');
  _card('成仙率', _n ? (_xianN/_n*100).toFixed(1)+'%' : '—');
  _card('平均寿元', _n ? Math.round(agg.sumAge/_n) : '—');
  _card('最高寿元', agg.maxAge || '—');
  _card('平均评分', _n ? Math.round(agg.sumScore/_n) : '—');
  html += '</div>';
  return html;
}
function rasEnding(_cnt, _n){ // 结局分布条——真仙/地仙/劫死/反噬/走火/寿终/其他
  let html = '<h4>结局分布</h4>';
  const _keys = ['真仙','地仙','劫死','反噬','走火','寿终','其他'];
  html += '<div style="margin-bottom:10px">';
  _keys.forEach(function(c){
    const v = _cnt[c]||0;
    if(!v) return;
    const w = _n ? (v/_n*100) : 0;
    const _col = c==='真仙' ? '#ffd700' : c==='地仙' ? '#ff9d00' : c==='寿终' ? '#6f9bff' : '#c39bd3';
    html += '<div style="display:flex;align-items:center;gap:6px;font-size:12px;margin:3px 0"><span style="width:44px;color:var(--dim)">'+c+'</span><div style="flex:1;height:12px;background:var(--panel2);border-radius:4px;overflow:hidden"><div style="height:100%;width:'+w.toFixed(1)+'%;background:'+_col+';border-radius:4px"></div></div><span style="width:36px;text-align:right">'+v+'</span></div>';
  });
  html += '</div>';
  return html;
}
function rasQuality(_qual, _QNAME, _QCOL, _ORDER){ // 按灵根品质统计表——世数/成仙/成仙率
  let html = '<h4>按灵根品质</h4><table style="width:100%;border-collapse:collapse;font-size:12px">';
  html += '<tr style="color:var(--dim)"><td style="padding:4px 6px">品质</td><td style="padding:4px 6px;text-align:right">世数</td><td style="padding:4px 6px;text-align:right">成仙</td><td style="padding:4px 6px;text-align:right">成仙率</td></tr>';
  _ORDER.forEach(function(q){
    const d = _qual[q];
    if(!d) return;
    const _col = _QCOL[q] || '#e8e8e8';
    html += '<tr><td style="padding:4px 6px"><span style="color:'+_col+';font-weight:700">'+(_QNAME[q]||q)+'灵根</span></td><td style="padding:4px 6px;text-align:right">'+d.n+'</td><td style="padding:4px 6px;text-align:right">'+d.仙+'</td><td style="padding:4px 6px;text-align:right">'+(d.n?(d.仙/d.n*100).toFixed(1)+'%':'—')+'</td></tr>';
  });
  html += '</table>';
  return html;
}
function atlasStatClass(a){ // 结局分类——真仙/地仙/劫死/反噬/走火/寿终/其他
  if(a.godTitle==='真仙') return '真仙';
  if(a.godTitle==='地仙') return '地仙';
  if(a.godTitle) return a.godTitle;
  const dc = a.deathCause || '';
  if(dc.indexOf('劫')>=0) return '劫死';
  if(dc.indexOf('反噬')>=0) return '反噬';
  if(dc.indexOf('走火')>=0) return '走火';
  if(dc.indexOf('寿')>=0 || dc.indexOf('坐化')>=0) return '寿终';
  return '其他';
}
function atlasStatAgg(_saves){ // 跨世统计聚合——结局分布/灵根品质/寿元评分
  const _cnt = {}, _qual = {};
  let _sumAge=0, _maxAge=0, _sumScore=0, _maxScore=0;
  _saves.forEach(function(a){
    const c = atlasStatClass(a);
    _cnt[c] = (_cnt[c]||0) + 1;
    const q = (a.soul && a.soul.quality) || '?';
    if(!_qual[q]) _qual[q] = {n:0, 仙:0};
    _qual[q].n++;
    if(c==='真仙' || c==='地仙') _qual[q].仙++;
    if(a.age){ _sumAge += a.age; _maxAge = Math.max(_maxAge, a.age); }
    if(typeof a.score === 'number'){ _sumScore += a.score; _maxScore = Math.max(_maxScore, a.score); }
  });
  const _n = _saves.length;
  const _xianN = (_cnt['真仙']||0)+(_cnt['地仙']||0);
  return {cnt:_cnt, qual:_qual, sumAge:_sumAge, maxAge:_maxAge, sumScore:_sumScore, maxScore:_maxScore, n:_n, xianN:_xianN};
}
function renderAtlasEvent(){
  // 4.251：超大函数拆分——品质 tab/收益文本/图鉴网格抽 3 子函数
  return raeTabs() + raeGrid();
}
function raeTabs(){ // 事件品质子 tab（带收集计数）
  let html = '';
  const EQ=[['all','全部',''],['common','白','ev-common'],['uncommon','绿','ev-uncommon'],['rare','蓝','ev-rare'],['epic','紫','ev-epic'],['legend','红','ev-legend'],['mythic','金','ev-mythic']];
  html += '<div class="atlas-tabs sub">'+EQ.map(function(x){
    const list = x[0]==='all' ? [] : EVENTS.filter(e=>e && e.q===x[0]);
    const cnt = x[0]==='all' ? atlasCount('events')+'/'+EVENTS.length : list.filter(e=>atlasHas('events',e.name)).length+'/'+list.length;
    const label = x[0]==='all' ? x[1] : '<span class="atlas-item owned '+x[2]+'" style="padding:0 3px">'+x[1]+'</span>';
    return '<button class="btn mini '+(ATLAS_Q===x[0]?'primary':'')+'" onclick="setAtlasQ(\''+x[0]+'\')">'+label+' '+cnt+'</button>';
  }).join('')+'</div>';
  return html;
}
function raeGainsText(e){ // 事件选项收益文本——代词替换/百分比加成/效果/决斗/成功率，多选项用 ／ 分隔
  return (e.opts||[]).map(o=>{
    let t = o.label.replace(/\{ta\}/g, ((G&&G.gender)==='女') ? '他' : '她')+'：'; // 代词占位符（未开局/轮回后 G 为 null 时按男性处理，防图鉴渲染异常）
    const parts=[];
    if(o.pctEff){ Object.keys(o.pctEff).forEach(k=>{ parts.push(k==='ALL' ? '全属性+'+Math.round(o.pctEff[k]*100)+'%' : k+'+'+Math.round(o.pctEff[k]*100)+'%'); }); }
    const ef = fmtEff(o.eff); if(ef) parts.push(ef);
    if(o.duelTxt) parts.push(o.duelTxt);
    if(!parts.length && o.roll) parts.push('成功率'+Math.round((o.roll.chance+(o.roll.extra||0))*100)+'%');
    if(!parts.length) parts.push('无');
    return t + parts.join('，');
  }).join(' ／ ');
}
function raeGrid(){ // 事件图鉴网格——品质分组标题 + 事件项（已收集显明细/未解锁 ???
  let html = '';
  html += '<div class="atlas-sec"><h4>事件图鉴</h4>';
  // 4.333 事件链栏目——全部链一览（已完成/进行中/未触发 + 起点门槛），让「奔一条链」成为可规划目标
  {
    const _cks = Object.keys(CHAINS||{});
    if(_cks.length){
      const _gd = G||{}; // v4.337 判空——轮回殿/未开局 G=null 时事件链按未触发展示（跨世收集不依赖局内态）
      const _doneN = _cks.filter(_id=>(_gd.chainDone && _gd.chainDone[_id])).length;
      html += '<div class="atlas-qg"><span style="font-weight:700;color:#c9a86a">事件链</span> <span class="muted">'+_doneN+'/'+_cks.length+' 完成</span></div>';
      _cks.forEach(_id=>{
        const _def = CHAINS[_id]; if(!_def || !_def.steps || !_def.steps.length) return;
        const _st = _def.steps;
        const _first = EV_BY_CHAIN[_id+':'+_st[0]]||null;
        const _done = !!(_gd.chainDone && _gd.chainDone[_id]);
        const _cur = (_gd.chain && _gd.chain.id===_id) ? Math.min(_gd.chain.step, _st.length) : 0;
        const _stTxt = _done ? '<span style="color:#35705a">已完成</span>' : (_cur>0 ? '<span style="color:#c9a86a">进行中 '+_cur+'/'+_st.length+'</span>' : '<span class="muted">未触发</span>');
        const _cond = (!_done && !_cur && _first && _first.req) ? ' · 起点：'+needText(_first.req) : '';
        // 4.352 隐藏结局收集状态（链有隐藏终局时显示 未解锁/已解锁）
        let _hdTxt = '';
        if(_def.hiddenStep){
          const _hev = EV_BY_CHAIN[_id+':'+_def.hiddenStep];
          if(_hev){ const _hOwn = atlasHas('events', _hev.name); _hdTxt = ' · <span class="muted">隐藏结局</span>' + (_hOwn ? '<span style="color:#c9a86a">已解锁</span>' : '<span class="muted">未解锁</span>'); }
        }
        html += '<div style="font-size:13px;line-height:1.8">'+(_done?'✓':(_cur>0?'▸':'·'))+' <b>'+escapeHtml(_def.name||_id)+'</b>（'+_st.length+' 段）'+_stTxt+_cond+_hdTxt+'<br><span class="muted" style="font-size:12px">'+escapeHtml(_def.desc||'')+'</span></div>';
      });
    }
  }
  html += '<div class="atlas-grid">';
  const qlist2 = ATLAS_Q==='all' ? ['common','uncommon','rare','epic','legend','mythic'] : [ATLAS_Q];
  qlist2.forEach(q=>{
    const list = EVENTS.filter(e=>e && e.q===q);
    // 自定义机缘事件并入图鉴（钩子直推、不在 EVENTS 池）——按品质分组展示，已收集/未解锁均可见
    if(q==='mythic'){ [EV_HUNDUN_XIANDAN, EV_XISUI_GUYUAN, EV_HUNDUN_JING].forEach(_ce=>{ if(_ce && _ce.q===q && list.indexOf(_ce)<0) list.push(_ce); }); }
    const ownedN = list.filter(e=>atlasHas('events', e.name)).length;
    const c = q==='common'?'#d9e2f5':q==='uncommon'?'#7ec850':q==='rare'?'#6f9bff':q==='epic'?'#c39bd3':q==='legend'?'#ff6b6b':'#ffd700';
    html += `<div class="atlas-qg"><span style="font-weight:700;color:${c}">${EV_Q[q]}品质</span> <span class="muted">${ownedN}/${list.length}</span></div>`;
    list.forEach(e=>{
      const owned = atlasHas('events', e.name);
      if(owned){
        const gains = raeGainsText(e); // 4.251：收益文本抽子函数
        // 事件名经 encodeURIComponent 存入 data-ev 属性、onclick 内 decodeURIComponent 还原，
        // 避免事件名含单引号/双引号时注入破坏 JS 字符串；title 一并做 HTML 转义
        html += `<span class="atlas-item owned ev-${q} ev-click" data-ev="${encodeURIComponent(e.name)}" title="${escapeHtml(e.name)}｜${escapeHtml(gains)}" onclick="showEventDetail(decodeURIComponent(this.dataset.ev))">${escapeHtml(e.name)}</span>`;
      }else{
        html += `<span class="atlas-item locked" title="${e.name}（尚未解锁，解锁后可查看收益）">???</span>`;
      }
    });
  });
  html += '</div></div>';
  return html;
}
/* 图鉴查看事件收益——已收集事件点击弹出详情浮层（文本 + 各选项收益/需求/成功率） */
function fmtEff(o){
  if(!o) return '';
  const F = {悟性:'悟性',气血:'气血',力量:'力量',灵动:'灵动',神识:'神识',家境:'家境',气运:'气运',声望:'声望',灵石:'灵石',贡献:'贡献',功德:'功德',业力:'业力',lv:'修为境界',youBreak:'灵根升华',bone:'法宝'};
  return Object.keys(o).filter(k=>o[k]!==undefined&&o[k]!==null&&o[k]!==0).map(k=>{
    const v = o[k];
    if(k==='cult') return '修炼×'+v; // 链环节修炼补偿（考核折算一次修炼推进）
    return (F[k]||k) + (v===true ? '' : (v>0?('+'+v):v));
  }).join(' · ');
}
function needText(nd){
  if(!nd) return '';
  const parts=[];
  if(nd.attr) Object.keys(nd.attr).forEach(k=>{ parts.push(k+'≥'+nd.attr[k]); });
  if(nd.realm !== undefined) parts.push(realmReqLabel(nd)); // v4.349 realm 语义显示（与事件校验同源）
  if(nd.money) parts.push('灵石≥'+nd.money);
  if(nd.prestige) parts.push('声望≥'+nd.prestige);
  if(nd.age) parts.push('年龄≥'+nd.age);
  if(nd.ye !== undefined) parts.push('业力≥'+nd.ye);   // 4.351 魔道门槛显示
  if(nd.daoXin !== undefined) parts.push('道心≤'+nd.daoXin);
  return parts.join('、');
}
function optGain(o){
  const lines=[];
  if(o.pctEff){
    const parts=[];
    Object.keys(o.pctEff).forEach(k=>{
      const v = Math.round(o.pctEff[k]*100);
      parts.push(k==='ALL' ? '全属性+'+v+'%' : k+'+'+v+'%');
    });
    lines.push('<div class="gn">'+parts.join(' · ')+'（永久）</div>');
  }
  if(o.eff && Object.keys(o.eff).some(k=>o.eff[k])) lines.push('<div class="gn">'+fmtEff(o.eff)+'</div>');
  if(o.duelTxt) lines.push('<div class="rs">'+o.duelTxt+'</div>');
  if(o.roll){
    const pct = Math.round((o.roll.chance+(o.roll.extra||0))*100);
    const s = fmtEff(o.roll.succ), f = fmtEff(o.roll.fail);
    let t = '成功率 '+pct+'%';
    if(s) t += ' · 成功：'+s;
    if(f) t += ' · 失败：'+f;
    if(o.roll.death) t += ' · 含 '+Math.round(o.roll.death*100)+'% 殒命风险';
    lines.push('<div class="rs">'+t+'</div>');
  }
  return lines.join('');
}
function eventDetailHTML(ev){
  const c = ev.q==='common'?'#d9e2f5':ev.q==='uncommon'?'#7ec850':ev.q==='rare'?'#6f9bff':ev.q==='epic'?'#c39bd3':ev.q==='legend'?'#ff6b6b':'#ffd700';
  let h = '<div class="evmodal" onclick="if(event.target===this)closeEventDetail()"><div class="evmodal-card">'
    + '<div class="evmodal-head"><b>【'+ev.name+'】</b><span style="font-size:11px;color:'+c+'">'+EV_Q[ev.q]+'品质</span><button class="cl" onclick="closeEventDetail()">×</button></div>'
    + '<div class="evmodal-txt">'+ev.text+'</div>';
  (ev.opts||[]).forEach((o,i)=>{
    h += '<div class="evopt"><div><span class="ol">选项'+(i+1)+' · '+o.label+'</span>'+(needText(o.need)?'<span class="ne">（需'+needText(o.need)+'）</span>':'')+'</div>'+optGain(o)+'</div>';
  });
  h += '</div></div>';
  return h;
}
function showEventDetail(name){
  let ev = EV_BY_NAME[name];
  if(!ev) ev = (name==='混沌五行仙丹' ? EV_HUNDUN_XIANDAN : name==='灵根共鸣' ? EV_XISUI_GUYUAN : name==='混沌经' ? EV_HUNDUN_JING : null); // 自定义机缘事件（钩子直推、不在 EVENTS 池）
  if(!ev) return;
  let el = $('evModal'); if(!el){ el=document.createElement('div'); el.id='evModal'; document.body.appendChild(el); }
  el.innerHTML = eventDetailHTML(ev);
}
function closeEventDetail(){ const el=$('evModal'); if(el) el.innerHTML=''; }
$('btnStart').onclick = ()=>{ startNewLife(); };

/* ============ 投胎 ============ */
/* 开局随机性格（驱动自动挂机倾向，角色扮演拟真）——
   性格只影响「并列合理选项」的偏好（风格差异），核心保命/冲关策略不受影响，保证各性格长期收益期望相近。
   hunt=猎妖档位偏好（稳/中/猛）；act=常规行动偏好；evRisk=事件风险偏好（0 稳 / 1 中 / 2 敢赌） */
const PERSONALITIES = [
  {id:'yong', name:'勇猛', hunt:'猛', act:'历练', evRisk:2, desc:'热血刚烈，好勇敢拼。猎妖喜猛、行事爱赌一线，也常在绝境搏出生天。'},
  {id:'chen', name:'沉稳', hunt:'中', act:'苦修', evRisk:0, desc:'深思熟虑，稳扎稳打。修炼求稳、行事求全，鲜少行险。'},
  {id:'ji',   name:'机敏', hunt:'中', act:'交游', evRisk:1, desc:'八面玲珑，善于取舍。猎妖居中、行事务实，偶尔也肯赌一把。'},
  {id:'yin',  name:'隐忍', hunt:'中', act:'经营', evRisk:0, desc:'谨小慎微，隐忍求存。行事保守，宁稳勿险，厚积薄发。'},
  {id:'hao',  name:'豪迈', hunt:'猛', act:'历练', evRisk:2, desc:'豪爽大气，敢作敢当。猎妖喜猛、行事积极，认准了便一往无前。'}
];
const PERS_BY_NAME = {}; PERSONALITIES.forEach(p=>{ PERS_BY_NAME[p.name]=p; });
/* 开局随机姓名（男女各一组，古风仙侠风格） */
const NAME_MALE  = ['凌风','夜痕','墨尘','萧烈','苏尘','叶凌','秦锋','沈墨','陆离','顾北辰','白夜','风无痕','洛青州','韩煜','江云舟','楚狂','燕临','赵烬','林破军','周天行','魏无涯','陈孤鸿','徐夜行','古云霄','谢听雨','冯不破','曹野','许重楼','姜太白','温沉舟','时雨','云惊鸿'];
const NAME_FEMALE= ['苏婉','柳如烟','白芷','叶灵犀','顾清欢','沈青瑶','洛璃','楚辞','云梦','林晚','秦月','江疏影','夜阑','温言','夏栀','苏浅浅','姜婉宁','花想容','柳含烟','安知若','楚晚宁','青瑶','顾香凝','洛清浅','叶知秋','白霜华','秦素衣','苏挽月','温酒','薛凝霜','林辞','许愿'];
function rollPersona(){
  const g2 = Math.random()<0.5?'男':'女';
  // 性别性格差异化——男性偏阳刚（勇猛/豪迈），女性偏柔稳（沉稳/隐忍），机敏中性；
  //   权重设计保证整体各性格出现率均衡：男女各约 50% 人口时，五种性格整体均约 20%。
  const pool = g2==='男'
    ? [['勇猛',3],['豪迈',3],['机敏',2],['沉稳',1],['隐忍',1]]
    : [['沉稳',3],['隐忍',3],['机敏',2],['勇猛',1],['豪迈',1]];
  let tot=0; pool.forEach(function(x){ tot+=x[1]; });
  let r=Math.random()*tot, pn=pool[0][0];
  for(let i=0;i<pool.length;i++){ r-=pool[i][1]; if(r<0){ pn=pool[i][0]; break; } }
  return {gender:g2, name:pick(g2==='男'?NAME_MALE:NAME_FEMALE), personality:pn};
}
function rollAttrs(){
  // 投胎页只定出身（家境/气运）；战斗四维与悟性改在灵根觉醒后按灵根类型倾向生成
  const a = {
    气血: 0, 悟性: 0, 力量: 0, 灵动: 0, 神识: 0, 家境: ri(5,70), 气运: ri(5,70)
  };
  // 保存基础随机值（用于开局显示"总值（基础+加成）"）
  const _base = {气血:0, 悟性:0, 力量:0, 灵动:0, 神识:0, 家境:a.家境, 气运:a.气运};
  a.气运 += atlasBonus(); // 图鉴收集里程碑 → 永久气运加成
  a.气运 += achieveBonus(); // 成就殿堂里程碑 → 永久气运加成
  // 战斗四维不设上限（仅保底 0），其余三维保持 1-100
  FIGHT_ATTRS.forEach(k=>{ a[k]=Math.max(0, a[k]); });
  OTHER_ATTRS.forEach(k=>{ a[k]=clamp(a[k],1,100); });
  // 计算加成值 = 总值 - 基础值（clamp后可能略有差异，取近似值）
  const _bonus = {};
  ATTRS.forEach(k=>{ _bonus[k] = Math.max(0, Math.round((a[k] - _base[k]) * 10) / 10); });
  const _rp = rollPersona();
  return {a, cultBonus:0, gender:_rp.gender, name:_rp.name, personality:_rp.personality, evFlags:{}, _attrBase:_base, _attrBonus:_bonus,
    gongxian:0, gongfa:{main:null, sub:null}, shentong:[], gongfaOwned:[], shentongOwned:[], post:'', _freeArtDone:false}; // 贡献/功法/神通/任职字段
}
/* 来世天赋（轮回殿全满解锁，终局娱乐玩法）——
   定制灵根（觉醒品质保底，越高级越贵）/ 指定命格（本局必得）/ 指定一次高品质事件（本局必触发） */
const GIFT_WQ_COST = {fei:0, pu:10, you:25, ding:50, super:75, shen:100, she:150}; // 定制灵根补圣品档（7 档与灵根品质体系一致）
const GIFT_EV_COST = {legend:30, mythic:45}; // 高品质事件=红/金品（与自动暂停收窄一致），紫品不再可指定
let GIFT = (typeof META!=='undefined' && META && META.gift) ? {wuQ:META.gift.wuQ||null, fate:META.gift.fate||null, evQ:META.gift.evQ||null} : {wuQ:null, fate:null, evQ:null}; // 来世天赋配置持久化（刷新/重开不丢失）
function giftCost(){
  let c=0;
  if(GIFT.wuQ) c += GIFT_WQ_COST[GIFT.wuQ]||0;
  if(GIFT.fate) c += FATE_COST;
  if(GIFT.evQ) c += GIFT_EV_COST[GIFT.evQ]||0;
  return c;
}
function renderGift(){
  const box=$('giftBox'); if(!box) return;
  const QNAME = Q_KEYS; // 4.207g 引用全局品质名映射（原内联字面量与 Q_KEYS 一致）
  // shenGan 不参与全满解锁（防老存档被锁来世天赋）；4.116 轮回殿全满才开放
  const allMax = LUNHUI_DEF.every(d=> d.k==='shenGan' || lunhuiVal(d.k)>=d.max);
  const _hasGift = GIFT && (GIFT.wuQ || GIFT.fate || GIFT.evQ);
  // 4.233：超大函数拆分——未满只读/全满定制拆 2 子函数
  if(!allMax){ renderGiftLocked(box, _hasGift); return; }
  renderGiftFull(box);
}
function renderGiftLocked(box, _hasGift){ // 轮回殿未满——无配置隐藏；有配置只读展示（仅可取消退款）
  if(!_hasGift){ box.style.display='none'; return; }
  // 轮回殿未满但已有配置 → 只读展示，仅可取消（老存档加点回退时玩家仍能看到/取消配置）
  box.style.display='block';
  let h0='<div class="card" style="padding:10px"><div style="font-size:13px;margin-bottom:6px"><b>来世天赋</b> <span class="muted" style="font-size:11.5px">轮回殿未满——以下为已保留配置，仅可取消退款</span></div>';
  h0 += '<div style="font-size:12px;margin-bottom:8px">灵根：<b style="color:var(--gold)">'+(GIFT.wuQ?Q_KEYS[GIFT.wuQ]:'未定制')+'</b>　命格：<b style="color:var(--gold)">'+(GIFT.fate||'未指定')+'</b></div>';
  h0 += '<button class="lhbtn" id="btnGiftClearAll" style="width:auto;padding:0 10px;font-size:11px;white-space:nowrap">取消全部配置（退款 '+giftCost()+' 点）</button></div>';
  box.innerHTML = h0;
  const _cl=$('btnGiftClearAll'); if(_cl) _cl.onclick=()=>{ META.lundian += giftCost(); GIFT={wuQ:null,fate:null,evQ:null}; giftBaseRestore(); saveMeta(); if($('lunDian')) $('lunDian').textContent=META.lundian; renderGift(); };
}
function renderGiftFull(box){ // 轮回殿全满——定制灵根 + 指定命格 + 事件绑定
  box.style.display='block';
  // 4.258：超大函数拆分——头部/折叠内容/事件绑定抽 3 子函数
  let h = rgfHead();
  if(!_giftCollapsed) h += rgfBody();
  h += '</div>';
  box.innerHTML = h;
  rgfBind(box);
}
function rgfHead(){ // 轮回殿标题 + 折叠按钮
  return '<div class="card" style="padding:10px"><div style="font-size:13px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><span><b>来世天赋</b> <span class="muted" style="font-size:11.5px">轮回殿已圆满——消耗轮回点定制来世（觉醒品质保底，进入新世后清空，可取消退款）</span></span><button class="lhbtn" id="btnGiftFold" style="width:auto;padding:0 8px;font-size:11px;white-space:nowrap">'+(_giftCollapsed?'展开天赋 ▼':'收起天赋 ▲')+'</button></div>';
}
function rgfBody(){ // 折叠内容——定制灵根（品质保底，越高级越贵）+ 指定命格（本局必得）
  let h = '';
  // 1) 定制灵根
  h += '<div style="font-size:12px;margin:6px 0 3px;color:var(--gold2)">定制灵根（觉醒品质保底，越高级越贵）</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px">';
  Object.keys(GIFT_WQ_COST).forEach(k=>{
    const sel = GIFT.wuQ===k;
    h += '<button class="lhartbtn q-'+k+'" data-gw="'+k+'" style="'+(sel?'outline:2px solid var(--gold);color:var(--gold) !important;':'')+'">'+Q_KEYS[k]+'('+GIFT_WQ_COST[k]+')</button>'; // 宽按钮自适应（修 lhbtn 24px 固定尺寸导致按钮过小文字溢出）
  });
  h += '</div>';
  // 2) 指定命格
  h += '<div style="font-size:12px;margin:8px 0 3px;color:var(--gold2)">指定命格（本局必得，价格 '+FATE_COST+' 点）</div>';
  h += '<select id="giftFateSel" style="width:100%;padding:4px;font-size:12px;background:#1a1626;color:#e9c46a;border:1px solid #3a3350;border-radius:6px">'
     + '<option value="">— 不指定 —</option>';
  FATE_POOL.forEach(f=>{ h += '<option value="'+f.name+'" '+(GIFT.fate===f.name?'selected':'')+'>'+f.name+'（'+f.desc+'）</option>'; });
  h += '</select>';
  h += '<div class="muted" style="font-size:11px;margin-top:6px">已投入 <b style="color:var(--gold)">'+giftCost()+'</b> 轮回点</div>'; // 移除指定高品质事件（高寿命下自然触发高品质事件，选项冗余）
  return h;
}
function rgfBind(box){ // 灵根按钮/命格选择/折叠按钮事件绑定（退款回滚基线 + 重新应用另一配置）
  box.querySelectorAll('[data-gw]').forEach(b=>{ b.onclick=()=>{
    const k=b.getAttribute('data-gw'), cost=GIFT_WQ_COST[k];
    if(GIFT.wuQ===k){ // 取消定制→退款+回滚基线觉醒（不触发重掷）；命格仍配置时重新应用
      META.lundian+=cost; GIFT.wuQ=null; 
      giftBaseRestore(); 
      if(GIFT.fate) reAwaken();
    }
    else if((META.lundian||0)>=cost){ if(GIFT.wuQ) META.lundian+=GIFT_WQ_COST[GIFT.wuQ]; META.lundian-=cost; GIFT.wuQ=k; reAwaken(); }
    saveMeta(); $('lunDian').textContent=META.lundian; renderGift();
  };});
  const fs=$('giftFateSel'); if(fs) fs.onchange=()=>{
    const v=fs.value;
    if(GIFT.fate){ // 取消指定命格→退款+回滚基线；灵根仍配置时重新应用
      META.lundian += FATE_COST; GIFT.fate=null; 
      giftBaseRestore(); 
      if(GIFT.wuQ) reAwaken();
    }
    if(v && (META.lundian||0)>=FATE_COST){ META.lundian-=FATE_COST; GIFT.fate=v; reAwaken(); }
    saveMeta(); $('lunDian').textContent=META.lundian; renderGift();
  };
  const gf=$('btnGiftFold'); if(gf) gf.onclick=()=>{ _giftCollapsed=!_giftCollapsed; renderGift(); };
}
function renderRoll(){
  const ag = $('rollAttrs'); ag.innerHTML='';
  const gdEl = $('rollGender'); if(gdEl) gdEl.innerHTML = `<span style="margin-right:12px">姓名 <b style="font-size:15px;color:var(--gold2)">${escapeHtml(G.name)||'无名'}</b></span><span style="margin-right:12px">性别 <b style="font-size:15px;color:var(--gold2)">${escapeHtml(G.gender)||'男'}</b></span><span>性格 <b style="font-size:15px;color:var(--gold2)">${escapeHtml(G.personality)}</b></span>`; // 转义
  // 投胎页只显示出身属性（家境/气运），战斗天赋在灵根觉醒后显形
  ['家境','气运'].forEach(k=>{ const _base = G._attrBase ? G._attrBase[k] : null; const _bonus = G._attrBonus ? G._attrBonus[k] : null; const _val = Math.round(G.a[k]*10)/10; const _hasBonus = (_base !== null && _bonus !== null && _bonus > 0); ag.insertAdjacentHTML('beforeend', bar(k, _val, '', _hasBonus ? _bonus : null) ); });
  const fam = G.a.家境;
  let bg='山村贫家';
  if(fam<20){bg='山村贫家';}
  else if(fam<40){bg='城镇小康';}
  else if(fam<60){bg='小贵族/富商';}
  else if(fam<80){bg='宗门子弟';}
  else {bg='皇族/顶级宗门';}
  $('rollTips').innerHTML = `出身 <b>${bg}</b> · <span class="muted">寿元有限，修炼慢者将空耗一生。</span>`;
  const _gb = $('giftBox');
  if(_gb) _gb.style.display=''; // 交还 renderGift 控制（轮回殿全满才显示）
  renderGift(); // 来世天赋面板（投胎页）
  // 更新重新投胎按钮状态（消耗1轮回点，防止无限刷开局）
  const _rerollBtn = $('btnReroll');
  const _ld = META.lundian || 0;
  _rerollBtn.style.display='';
  if (_ld < 1) {
      _rerollBtn.disabled = true;
      _rerollBtn.textContent = '重新投胎（轮回点不足）';
      _rerollBtn.title = '轮回点不足，无法重新投胎';
    } else {
      _rerollBtn.disabled = false;
      _rerollBtn.textContent = '重新投胎（消耗1轮回点，剩余' + _ld + '）';
      _rerollBtn.title = '重新投胎消耗1点轮回点';
    }
  // 投胎/觉醒合并为一页——出身、灵根与战斗天赋同页显形，觉醒区常显
  const _bb = $('btnBegin'); if(_bb) _bb.style.display='';
  renderAwaken(); // 渲染灵根与先天资质（觉醒已在 startNewLife / reAwaken 完成）
  renderDaoTong('daoTongRollBox'); // 投胎页道统传承选择（真实开局流程在此页）
}
$('btnReroll').onclick = ()=>{ 
  // 重新投胎消耗1点轮回点，防止无限刷开局
  if ((META.lundian||0) < 1) { 
    $('btnReroll').disabled = true; 
    $('btnReroll').title = '轮回点不足，无法重新投胎'; 
    return; 
  }
  META.lundian = (META.lundian||0) - 1;
  saveMeta();
  _prevAttrs = null; // 重投重置属性高亮基准（修复：原路径沿用旧局基准）
  const _g = GIFT; GIFT = {wuQ:null, fate:null, evQ:null}; // 隔离定制生成无定制基线
  G = rollAttrs(); 
  // 重投同时重抽命格与灵根（一页成型）
  initLifeFields();
  awakenSoul(G);
  G._giftBase = giftBaseSnapshot();
  GIFT = _g;
  if(GIFT.wuQ || GIFT.fate) reAwaken(); // 应用持久化定制
  renderRoll(); 
};
function initLifeFields(){ // 投胎/觉醒合并——开局字段初始化（原 btnAccept 逻辑，startNewLife / reAwaken 调用）
  G._fateAttrBonus = {}; // 命格四维/悟性加成暂存容器（觉醒掷点时叠加）
  G.achievements = []; // 成就先清空再应用命格（命格·天生法宝会 push 成就，避免被后续清空）
  G._fates = rollFates(); applyFateBase(G); // 抽取/应用命格（含来世天赋指定命格）
  G.age = 0; G.realm = 0; G.subRealm = 0; G.realmPos = 0; // 36 条独立修为条权威字段

  G.soul = null; G.dual = null; G.rings = []; G.dualRings = []; // G.skills 死字段清除
  G.famous = null; // 旧存档兼容字段（气运既定模式已移除）
  G.money = 100 + G.a.家境*5; G.prestige = 0; G.org = ''; G.spouse = ''; G.master = '';
  G.alive = true; G.deathCause = ''; G.godTitle=''; // shenkaoN/god 死字段清除 G._gongdeAscend=false; G._huamo=false; G._moAscend=false; // 魔道飞升两步状态（化魔池/魔躯）开局重置
  G.shenkaoDone = false; G._shenDone = false;
  G.log = []; G.yearCount = 0; // G.title 死字段清除
  G.actionDone = false; G.hunting = false; G.youApt = null; // _at99/_youBreak 死字段清除
  G.exclusiveUsed = {}; G.onceUsed = {}; G.chain = null; G.lifeCap = null; G._lifeBonus = 0; G.herbs = 0; G.danfangOwned = ['hui','ning','cui']; G._breakBuff = 0; G.caveLv = 0; G.daoXin = 50; G._statDone = false; // 4.357 世末统计入档守卫（每局至多一条）
  G.wound = 0; // 伤势（0无/1轻/2重/3濒危）
  G.stats = {hunt:0, fight:0, wuxin:0}; // 4.207b 本世历战统计（猎妖/斗法/走火入魔） // 洞府等级（0无/1灵泉/2地脉/3九天） // 炼丹系统字段（灵草/丹方/突破丹buff） // _tier 死字段清除 // 灵根升华寿元加成初始化
  G.artifacts = {}; // 灵宝持有（突破判定已取消）
  G.materials = 0; // 妖兽材料显式初始化（原依赖 ||0 兜底）
  G._orgRecruitCount = 0; // 新游戏重置势力招揽触发次数
  // 修仙版：新游戏重置事件多分支状态（防止跨局残留）
  G._marryFocus = false; // _mutateMode/_marryMode 死字段清除（变异机制已废除）
  G.recentEvents = []; // _mutTriggerMult/_mutGoodBonus 死字段清除（变异机制已废除）
  G.shaKills = 0; G.shaGate = null; G.shaRound = 0; G.shaDone = false; G.shaFailed = false; G.shaRouteDone = false; // 幽冥魔渊百胜计数；DL_RS_4.207：入口标记/杀戮场轮次/百胜/失败退出/地狱路完成
  // 清理旧版神劫兼容遗留字段（_godTrial/_qualNotified，无读取点）
  // 来世天赋——指定一次高品质事件（本局必触发）
  G._giftEv = GIFT.evQ || null;
  applyDaoTongAwaken(); // 转世道统觉醒——开局时已选则立即应用
}
function applyDaoTongAwaken(){ // 道统觉醒独立函数——投胎页选中后进局前（btnBegin）再次应用
  if(!G || !GIFT) return;
  G.gongfaOwned = G.gongfaOwned || []; G.shentongOwned = G.shentongOwned || [];
  G.gongfa = G.gongfa || {main:null, sub:null};
  if(GIFT.daoG && !(GONGFAS[GIFT.daoG] && GONGFAS[GIFT.daoG].special) && (META.daoTong && META.daoTong.gongfas || []).indexOf(GIFT.daoG)>=0 && G.gongfaOwned.indexOf(GIFT.daoG)<0){
    G.gongfaOwned.push(GIFT.daoG);
    if(!G.gongfa.main) G.gongfa.main = GIFT.daoG;
    if(typeof syncArtBonus==='function'){ try{ syncArtBonus(); }catch(e){} }
  }
  if(GIFT.daoShentong && !(SHENTONGS[GIFT.daoShentong] && SHENTONGS[GIFT.daoShentong].special) && (META.daoTong && META.daoTong.shentongs || []).indexOf(GIFT.daoShentong)>=0 && G.shentongOwned.indexOf(GIFT.daoShentong)<0){
    G.shentongOwned.push(GIFT.daoShentong);
  }
}
function reAwaken(){ // 来世天赋（定制灵根/命格）配置后重抽命格并重新觉醒，灵根与四维实时更新
  if(!G) return;
  initLifeFields();
  awakenSoul(G);
  renderRoll();
}
/* 来世天赋基线觉醒快照——开局（startNewLife/btnReroll）以无定制状态觉醒并快照；
   取消定制（退点）时恢复基线，实现退款回到未定制开局，不再触发重掷（消除免费重掷循环） */
function giftBaseSnapshot(){
  if(!G) return null;
  return {
    soul: G.soul ? JSON.parse(JSON.stringify(G.soul)) : null,
    dual: G.dual ? JSON.parse(JSON.stringify(G.dual)) : null,
    fates: G._fates ? JSON.parse(JSON.stringify(G._fates)) : [],
    a: JSON.parse(JSON.stringify(G.a||{})),
    _attrBase: JSON.parse(JSON.stringify(G._attrBase||{})),
    _attrBonus: JSON.parse(JSON.stringify(G._attrBonus||{})),
    _fateAttrBonus: JSON.parse(JSON.stringify(G._fateAttrBonus||{})),
    achievements: (G.achievements||[]).slice()
  };
}
function giftBaseRestore(){
  const _s = G && G._giftBase;
  if(!_s){ reAwaken(); return; } // 兼容旧局（无基线 → 回滚重掷）
  G.soul = _s.soul; G.dual = _s.dual; G._fates = _s.fates;
  G.a = Object.assign({}, _s.a);
  G._attrBase = _s._attrBase ? JSON.parse(JSON.stringify(_s._attrBase)) : {};
  G._attrBonus = _s._attrBonus ? JSON.parse(JSON.stringify(_s._attrBonus)) : {};
  G._fateAttrBonus = Object.assign({}, _s._fateAttrBonus||{});
  G.achievements = (_s.achievements||[]).slice();
  renderRoll();
}

/* ============ 灵根觉醒（两次抽取） ============ */
function rollQuality(g){
  // 六档品质概率池（低级/普通/高级/顶级/超级/神级 = 30/30/22/12/5/1）
  let qpool = {fei:30, pu:30, you:22, ding:12, super:5, shen:1, she:0.5};   // 圣灵根：万中无一（0.5%）
  if(g.a.家境>=70){ qpool.fei-=8; qpool.you+=5; qpool.ding+=3; }
  if(g.a.家境>=85){ qpool.ding+=6; qpool.super+=2; qpool.shen+=1; qpool.she+=0.5; qpool.fei-=4; }
  // 轮回殿「线性转移」：双/天/圣灵根增加的概率从废/普通均匀转移，归一化抽取总概率恒 100，
  // 每点固定概率（玩家可预期），满加成后仍保持 双<天<圣 依次更稀有、高阶相对低位保持。
  const ksu = lunhuiVal('superTop'), ks = lunhuiVal('shenTop'), ksh = lunhuiVal('sheTop');
  qpool.fei  = Math.max(qpool.fei  - ksu*0.03 - ks*0.015 - ksh*0.0075, 0);
  qpool.pu   = Math.max(qpool.pu   - ksu*0.03 - ks*0.015 - ksh*0.0075, 0);
  qpool.super+= ksu*0.07;  // 每点双灵根概率 +0.07%（满100：5%→12%）
  qpool.shen += ks*0.04;   // 每点天灵根概率 +0.04%（满100：1%→5%）
  qpool.she  += ksh*0.025; // 每点圣灵根概率 +0.025%（满100：0.5%→3%）
  // 基础池归一化抽取：roll 使用实际权重总和，保证各品质概率 = 权重/总权重
  let total = 0;
  ['fei','pu','you','ding','super','shen','she'].forEach(k=>{ total += Math.max(qpool[k],0); });
  let roll = Math.random()*total, acc=0, quality='fei';
  for(const k of ['fei','pu','you','ding','super','shen','she']){ acc+=Math.max(qpool[k],0); if(roll<acc){quality=k;break;} }
  return quality;
}
function rollSoul(quality){
  // 灵根品质为固定属性：从对应品质的词库中抽取，灵根自带类型（决定成长倾向）
  let pool = SOULS_BY_Q[quality];
  return pick(pool);
}
/* 灵根觉醒初始倾向加成（按灵根类型） + 顶级/天灵根的全面增幅 */
const AWAKE_BONUS = {
  huo:  {力量:10, 气血:6, 灵动:4},   // 火：灼烈攻伐
  wu:   {力量:8,  神识:6, 悟性:3},   // 金：锋锐
  shui: {气血:8,  灵动:6, 神识:4},   // 水：柔韧多变
  feng: {灵动:10, 力量:5, 气血:3},   // 风：迅疾
  lei:  {力量:8,  灵动:8, 神识:3},   // 雷：爆裂
  bing: {神识:10, 气血:5, 悟性:3},   // 冰：沉静
  shou: {气血:10, 力量:6, 神识:2},   // 土：厚重
  zhi:  {气血:8,  悟性:6, 神识:4},   // 木：生发
  bt:   {力量:5, 气血:5, 灵动:4, 神识:5, 悟性:3} // 无/杂/圣：均衡小幅觉醒
};
const Q_BONUS = {
  ding: {力量:4, 气血:4, 神识:4, 灵动:3, 悟性:3},
  super:{力量:5, 气血:5, 神识:5, 灵动:4, 悟性:4},
  shen: {力量:6, 气血:6, 神识:6, 灵动:5, 悟性:5}
};
/* 先觉醒灵根、后定天赋——四维按灵根类型倾向掷点（区间），悟性受品质上限约束（生成即受限，不再"觉醒后砍属性"） */
const ATTR_BIAS = {
  huo:  {力量:[2,12], 灵动:[1,11], 气血:[1,10], 神识:[0,8]},  // 火：力量灵动突出
  wu:   {力量:[2,12], 灵动:[0,9],  气血:[0,9],  神识:[2,12]}, // 金：力量+神识
  shui: {力量:[0,8],  灵动:[1,11], 气血:[2,12], 神识:[1,10]}, // 水：均衡偏气血
  feng: {力量:[1,10], 灵动:[2,12], 气血:[0,8],  神识:[1,9]},  // 风：灵动突出
  lei:  {力量:[2,12], 灵动:[2,12], 气血:[0,8],  神识:[1,10]}, // 雷：力量+灵动
  bing: {力量:[0,8],  灵动:[0,9],  气血:[1,11], 神识:[2,12]}, // 冰：神识+气血
  shou: {力量:[1,11], 灵动:[0,8],  气血:[2,12], 神识:[0,8]},  // 土：气血突出
  zhi:  {力量:[0,8],  灵动:[0,9],  气血:[2,12], 神识:[2,12]}, // 木：气血+神识
  bt:   {力量:[1,11], 灵动:[1,11], 气血:[1,11], 神识:[1,11]}  // 无/杂/圣：全属性均衡
};
function rollAwakenAttrs(g, quality, cat){
  const a = g.a;
  // 四维按灵根类型倾向掷点
  const bias = ATTR_BIAS[cat] || {};
  ['力量','灵动','气血','神识'].forEach(k=>{
    const rng = bias[k] || [0,10];
    a[k] = ri(rng[0], rng[1]);
  });
  // 悟性按品质上限掷点（WU_LIMIT 见全局常量区，4.207g 起统一）
  const wuCap = Math.min(70, WU_LIMIT[quality] || 100);
  a.悟性 = ri(5, wuCap);
  // 记录天赋随机基础值（家境/气运保留投胎页原随机值）
  ['力量','灵动','气血','神识','悟性'].forEach(k=>{ g._attrBase[k] = a[k]; });
  // 属性分层——base=纯开局基础（资质放大基准），轮回/图鉴加成继续写 a（后天固定层）
  g.base = {}; ['力量','灵动','气血','神识'].forEach(k=>{ g.base[k] = a[k]; });
  g.attrVer = 2;
  g._bCount = 0; g._sCount = 0; // 大/小境界突破次数（属性计算明细用）
  // 叠加永久加成：轮回殿加点 + 图鉴事件悟性
  a.力量 += lunhuiVal('liLiang'); a.灵动 += lunhuiVal('minJie');
  a.气血 += lunhuiVal('tiLi');    a.神识 += lunhuiVal('jingShen');
  a.神识 += endingBonus(); // 结局图鉴里程碑 → 永久神识加成
  a.悟性 += lunhuiVal('wuXing')*0.3; // 开局加成收敛 0.5→0.3（防开局顶满）
  a.悟性 += atlasBonusEvents(); // 事件图鉴收集里程碑 → 永久悟性加成
  // 命格暂存加成（根骨清奇等四维/悟性命格加成，btnAccept 时暂存于 _fateAttrBonus）
  if(g._fateAttrBonus) Object.keys(g._fateAttrBonus).forEach(k=>{ a[k] += g._fateAttrBonus[k]; });
  // 悟性 clamp 到品质上限（生成即受限）
  a.悟性 = Math.min(a.悟性, WU_LIMIT[quality] || 100);
  FIGHT_ATTRS.forEach(k=>{ a[k]=Math.max(0, a[k]); });
  a.悟性 = clamp(a.悟性, 1, 100);
  // 更新加成拆分（总值 - 随机基础值）
  ATTRS.forEach(k=>{ g._attrBonus[k] = Math.max(0, Math.round((a[k] - g._attrBase[k]) * 10) / 10); });
}
function awakenSoul(g){
  let quality = rollQuality(g);
  if(GIFT && GIFT.wuQ) quality = GIFT.wuQ; // 来世天赋·定制灵根
  const s = rollSoul(quality);
  rollAwakenAttrs(g, quality, s.cat); // 修仙版：已去除先天修为机制（不适配灵根体系）——觉醒后从炼体初期开始修炼
  g.soul = {cat:s.cat, name:s.name, quality, xian:0};
  g.famous = null; // 旧存档兼容字段
  atlasGain('souls', s.name); // 本局暂存，世末结算入图鉴
  // 四灵根个体资质（DL_RS_4.5）：约 15% 四灵根资质接近顶级（可修炼至大乘巅峰），
  // 其余普通四灵根上限合体；无论哪种，大机遇方可勉强突破至渡劫
  if(quality==='you') g.youApt = Math.random()<0.15 ? 89 : 79;
  // 灵根类型觉醒加成
  const bonus = AWAKE_BONUS[s.cat]||{};
  Object.keys(bonus).forEach(k=>{ g.a[k] = clampAttr(k, g.a[k]+bonus[k]); });
  // 神通图鉴收集 → 永久四维加成（觉醒即生效）
  { const _stB = shentongAtlasBonus(); if(_stB){ ['力量','灵动','气血','神识'].forEach(k=>{ g.a[k] = clampAttr(k, g.a[k]+_stB); }); } }
  // 顶级/天灵根额外增幅
  const qb = Q_BONUS[quality]||{};
  Object.keys(qb).forEach(k=>{ g.a[k] = clampAttr(k, g.a[k]+qb[k]); });
  // 灵根品质影响悟性上限——无灵根/五行杂灵根悟性领悟受限，高品质灵根悟性上限更高（WU_LIMIT 见全局常量区，4.207g 起统一）
  const _wuLimit = WU_LIMIT[quality] || 100;
  if(g.a.悟性 > _wuLimit){
    const _oldWu = g.a.悟性;
    g.a.悟性 = _wuLimit;
    addLog(`灵根品质限制悟性领悟，悟性上限调整为 ${_wuLimit}（原 ${Math.round(_oldWu)}）。`, 'note');
  }
  // 灵根类型/品质加成计入加成拆分——觉醒页"总值（基础+加成）"显示准确
  ATTRS.forEach(k=>{ g._attrBonus[k] = Math.max(0, Math.round((g.a[k] - g._attrBase[k]) * 10) / 10); });
  return {soul:g.soul};
}
function renderAwaken(){
  // 投胎/觉醒合并为一页——纯显示灵根与先天资质（觉醒已在 startNewLife / reAwaken 完成）
  const s = G.soul;
  const qcn = Q_KEYS[s.quality];
  $('awaName').textContent = s.name;
  $('awaName').className = 'awa-big ' + Q_COLOR[s.quality];
  $('awaInfo').innerHTML = `综合修炼 ×${cultMultLabel().toFixed(2)}`;
  // 先天资质只显示战斗四维+悟性（家境/气运已在投胎区显示，避免同页重复）
  const _ag = $('awaAttrs');
  if(_ag){ _ag.innerHTML='';
    ['力量','灵动','气血','神识','悟性'].forEach(k=>{
      const _base = G._attrBase ? G._attrBase[k] : null;
      const _bonus = G._attrBonus ? G._attrBonus[k] : null;
      const _val = Math.round(G.a[k]*10)/10;
      const _hasBonus = (_base !== null && _bonus !== null && _bonus > 0);
      _ag.insertAdjacentHTML('beforeend', bar(k, _val, k==='神识'?'psi':'', _hasBonus ? _bonus : null));
    });
  }
  // 一页成型——觉醒区常显（来世天赋面板保留，配置后实时重算）
}
/* 新手引导弹窗 */
function showGuide(){
  if($('guideModal')) return;
  const div = document.createElement('div');
  div.id = 'guideModal';
  div.innerHTML = `<div class="evmodal" onclick="if(event.target===this)closeGuide()">
    <div class="evmodal-card">
      <div class="evmodal-head"><b>新手指南</b><button class="btn mini" onclick="closeGuide()">关闭</button></div>
      <div style="margin-top:12px;line-height:1.85;font-size:13.5px">
        <p><b>目标</b>：自六岁觉醒灵根起，修炼修为、凝成道胎、历事修仙，最终渡过飞升之劫，成就真仙。</p>
        <p><b>先天资质</b>：战斗四维（力量/灵动/气血/神识）影响修炼与战斗；悟性提升修炼速度；家境影响灵石与事件；气运影响机缘与渡劫；功德与业力（正魔道业）只影响渡劫成败。</p>
        <p><b>修炼行动</b>：苦修=纯修为最快（消耗灵石）；历练=属性+修为兼顾（最危险）；交游=悟性+机缘；经营=赚取灵石。按钮上标注了当前状态的预估修为收益，可直观对比。</p>
        <p><b>道胎</b>：破境自动凝成。自炼气至大乘共八枚，分有瑕/无缺/完美三档——完美加快修炼、有瑕拖慢修炼，属性亦随档位大幅提升。灵根品质越高、悟性与气运越高，越易凝出完美道胎。</p>
        <p><b>狩猎</b>：三档对应不同境界妖兽，越高奖励越丰厚（灵石/妖丹淬体/法宝机缘）但风险越大。战斗策略可根据自身属性选择。</p>
        <p><b>事件</b>：每年可能触发随机事件，分 6 个品质（白/绿/蓝/紫/红/金），高品质事件奖励丰厚但可能有属性门槛。部分事件可形成连锁。</p>
        <p><b>飞升路径</b>：大乘巅峰后踏入渡劫，九重天劫连渡（三雷劫、三火劫、三风劫），渡尽即飞升为真仙（天仙）；若渡劫失败而幸存，则按渡过的劫数成为几劫散仙，可自造仙基再证地仙。</p>
        <p><b>轮回殿</b>：每局结束根据表现获得轮回点，可永久提升开局资质、修炼速度、事件概率等。轮回点越多，下一世起点越高。命格祭炼可获得额外先天优势。</p>
        <p style="color:var(--gold2);margin-top:8px"><b>提示</b>：点击顶部「自动」可开启自动挂机，速度可调（×1~×8）。随时可暂停手动操作。顶部「指南」可随时重看本指南。</p>
      </div>
      <div style="margin-top:16px;text-align:center"><button class="btn primary" onclick="closeGuide()">我知道了</button></div>
    </div>
  </div>`;
  document.body.appendChild(div);
}
function closeGuide(){
  const m = $('guideModal');
  if(m) m.remove();
  try{ localStorage.setItem('dl_guide_seen','1'); }catch(e){}
}
$('btnGuide').onclick = showGuide;

$('btnBegin').onclick = ()=>{
  // 来世天赋应用即消费——确认进入新一世后清空配置，重开不再自动保持选中
  if(GIFT && (GIFT.wuQ||GIFT.fate||GIFT.evQ)){ GIFT = {wuQ:null, fate:null, evQ:null}; META.gift = {wuQ:null, fate:null, evQ:null}; saveMeta(); }
  G.age = 6;
  // 修仙版：经验累积制，无开局修为命格（原「天生修为/天骄血脉」已改为道基/天赋类）
  if(hasFate(G,'money')){ const fm = FATE_POOL.find(f=>f && f.money); G.money += (fm?fm.money:1000); }      // 命格·家财万贯
  if(hasFate(G,'prestige')){ const fp = FATE_POOL.find(f=>f && f.prestige); G.prestige += (fp?fp.prestige:40); } // 命格·声名鹊起
  $('logBox').innerHTML = '';
  addLog(`六岁生辰，${G.gender==='女'?'女儿':'男儿'}${G.soul.name}${Q_KEYS[G.soul.quality]!==G.soul.name ? '（'+Q_KEYS[G.soul.quality]+'）' : ''}觉醒，自此踏上修仙之路，修为自 <b>${realmName()}</b> 起步。`, 'sys');
  if(G.soul.quality==='fei') addLog('你为无灵根之体，虽可炼体淬身，却无法引气入体、踏入修仙正途……', 'note');
  if(G._fates && G._fates.length) addLog(`—— 轮回余荫庇佑，今生得蒙 <b>${G._fates.map(f=>f.name).join('、')}</b>。`, 'good');
  applyDaoTongAwaken(); // 进局前应用道统觉醒（投胎页选中 → 局内生效）
  show('screen-game'); renderGame(); startYear();
  // 新手引导——首次进入游戏弹出指南，老玩家通过 localStorage 跳过
  if(!localStorage.getItem('dl_guide_seen')){ setTimeout(showGuide, 500); }
};

/* ============ 关键事件飘字（DL_RS_4.195） ============ */
/* 非阻塞正反馈：左下角浮现后自动淡出，自动挂机不打断节奏；最多同屏 4 条（DL_RS_4.203：由右上角改至左下角，避开属性/动作/事件区） */
function showToast(txt, color, bg, size){ // 4.359 size='lg' 大横幅模式（大境界突破用，驻留 3200ms）
  if(__NORENDER) return; // 渲染开关
  const box = document.getElementById('toastBox');
  if(!box) return;
  const d = document.createElement('div');
  d.className = 'toast' + (size==='lg' ? ' lg' : '');
  if(color){ d.style.borderColor = color; d.style.borderLeftColor = color; d.style.color = color; }
  if(bg){ d.style.background = bg; }
  d.innerHTML = txt;
  box.appendChild(d);
  while(box.children.length > 4) box.removeChild(box.firstChild);
  setTimeout(()=>{ d.classList.add('out'); setTimeout(()=>d.remove(), 450); }, size==='lg' ? 3200 : 1800); // 大横幅驻留更久；普通飘字 1800ms
}
/* 境界大突破检测：跨大境界（元婴→化神等）时飘字提示一次；降级不提示 */
const _REALM_ORDER = ['炼体','炼气','筑基','金丹','元婴','化神','炼虚','合体','大乘','渡劫·一劫','渡劫·二劫','渡劫·三劫','渡劫·四劫','渡劫·五劫','渡劫·六劫','渡劫·七劫','渡劫·八劫','渡劫·九劫','真仙'];
function checkRealmBreak(g){
  if(!g || !g.soul) return;
  const k = realmKey(); // realmKey 4.195 已直接读 g.realm（挂起返回 X·巅峰 不在 _REALM_ORDER，不误飘）
  if(g._lastRealm === undefined){ g._lastRealm = k; return; }
  const a = _REALM_ORDER.indexOf(g._lastRealm), b = _REALM_ORDER.indexOf(k);
  if(b > a && a >= 0){ // _lastRealm 若为旧档遗留格式（indexOf=-1），a=-1 时 b>a 恒真会误报突破——加 a>=0 排除 // b>=0 冗余（b>a 且 a>=0 已蕴含 b>0），删除
    showToast('⚡ 境界突破 · '+k+' ⚡', '#ffd700', 'rgba(40,32,12,.95)', 'lg');
    addLog('—— <b>突破至'+k+'！</b>——','good');
  }
  g._lastRealm = k;
}

/* ============ 日志 ============ */
// XL_RS：批量静默（年份批量推进时暂存非噪音日志，回合末统一渲染）
let LOG_SILENT = false, _BATCH_LOGS = [], _SILENT_EV = false;
/* 连续经营日志合并辅助——解析"经营所得 +N 灵石"的金额与 ×N 计数
   XL_RS 4.205v：匹配放宽为"经营所得 +N"前缀（尾句措辞自由），防硬编码漂移 */
const OP_EARN_RE = /经营所得 \+(\d+)/;
function _opEarn(t){ const _m = String(t).match(OP_EARN_RE); return _m ? parseInt(_m[1]) : null; }
function _opCnt(t){ const _m = String(t).match(/×(\d+)/); return _m ? parseInt(_m[1]) : 1; }
function flushBatchLogs(){ // 重复批次日志收为一条（连续相同文本+类别合并，显示末条真实年份 ×N）
  const _mb = [];
  for(const _pb of _BATCH_LOGS){
    const _lb = _mb[_mb.length-1];
    if(_lb && _lb[0]===_pb[0] && _lb[1]===_pb[1]){ _lb[2] = _pb[2]; _lb[3]++; }
    else _mb.push([_pb[0], _pb[1], _pb[2], 1]);
  }
  _mb.forEach(_pb=>{ addLog(_pb[3] > 1 ? (_pb[0]+' <span style="color:var(--dim)">×'+_pb[3]+'</span>') : _pb[0], _pb[1], _pb[2]); });
  _BATCH_LOGS = [];
}
function addLog(text, cls, _age){
  if(__NORENDER) return; // 渲染开关（批测免日志）
  text = String(text).replace(/\{ta\}/g, (G && G.gender==='女') ? '他' : '她'); // 性别代词占位符（与主角异性者，如道侣）
  // 4.301：超大函数拆分——批量/实时分支抽 2 子函数
  if(LOG_SILENT){ alBatch(text, cls); return; }
  alLive(text, cls, _age);
}
function alBatch(text, cls){ // 批量推进（LOG_SILENT）——经营合并为一条（总额累加，年份更新）；note 保留
  if(cls !== 'sys'){
    if(cls==='good' && _opEarn(text)!==null){ // 批量推进中连续经营合并为一条（总额累加，年份更新）
      const _pb = _BATCH_LOGS[_BATCH_LOGS.length-1];
      if(_pb && _pb[1]==='good' && _opEarn(_pb[0])!==null){
        _pb[0] = _pb[0].replace(OP_EARN_RE, '经营所得 +' + (_opEarn(_pb[0]) + _opEarn(text)));
        _pb[2] = G.age;
        return;
      }
    }
    _BATCH_LOGS.push([text, cls, G.age]); // 批量日志记录真实年份（note 保留——渡劫蓄势等关键提示不可吞）
  }
}
/* ============ 日志折叠（4.316）——类别筛选 + 年份分组折叠 ============ */
let _logFilter = 'live'; // live=实时增量；all/good/bad/sys/gold=静态筛选视图
let _logFoldAll = false;
function logMatch(cls, f){ // 类别匹配（重要=gold/note/red 合并）
  if(f==='all') return true;
  if(f==='gold') return cls==='gold'||cls==='note'||cls==='red';
  return cls===f;
}
function renderLogFilter(f){ // 静态筛选视图——按年份分组，组头折叠/展开（默认展开最近 3 组）
  const box=$('logBox'); if(!box) return;
  box.innerHTML='';
  const rows = (G.log||[]).filter(function(e){ return logMatch(e.cls, f); });
  const groups=[]; let cur=null;
  rows.forEach(function(e){ if(!cur || cur.age!==e.age){ cur={age:e.age, items:[]}; groups.push(cur); } cur.items.push(e); });
  const _exp = Math.max(0, groups.length-3);
  groups.forEach(function(gr, i){
    const open = _logFoldAll || i>=_exp;
    const h=document.createElement('div');
    h.className='logGroupHead';
    h.style.cssText='cursor:pointer;font-size:11px;color:var(--gold);padding:4px 2px;border-top:1px dashed var(--line);user-select:none';
    h.innerHTML = (open?'▾':'▸')+' 第 '+(gr.age===null||gr.age===undefined?'?':gr.age)+' 年 · '+gr.items.length+' 条';
    h.onclick=function(){ const b=gr._body; if(!b) return; const _no = b.style.display==='none'; b.style.display = _no?'':'none'; h.innerHTML = (_no?'▾':'▸')+' 第 '+(gr.age===null||gr.age===undefined?'?':gr.age)+' 年 · '+gr.items.length+' 条'; };
    box.appendChild(h);
    const b=document.createElement('div'); gr._body=b;
    b.style.cssText = open?'':'display:none';
    gr.items.forEach(function(e){
      const d=document.createElement('div');
      d.className='entry '+(e.cls||'');
      d.innerHTML = '<span style="color:var(--dim);font-size:11px">['+(e.age===null||e.age===undefined?'?':e.age)+'岁]</span> '+e.text;
      b.appendChild(d);
    });
    box.appendChild(b);
  });
  box.scrollTop = box.scrollHeight;
}
function renderLogLive(){ // 从 G.log 重建实时视图（退出筛选/点实时）
  const box=$('logBox'); if(!box) return;
  box.innerHTML='';
  const rows = (G.log||[]).slice(-350);
  rows.forEach(function(e){
    const d=document.createElement('div');
    d.className='entry '+(e.cls||'');
    d.innerHTML = '<span style="color:var(--dim);font-size:11px">['+(e.age===null||e.age===undefined?'?':e.age)+'岁]</span> '+e.text;
    box.appendChild(d);
  });
  box.scrollTop = box.scrollHeight;
}
function setLogFilter(f){ // 切换日志视图
  _logFilter = f;
  document.querySelectorAll('#logBar .btn').forEach(function(b){ b.style.color = (b.getAttribute('data-lf')===f) ? 'var(--gold)' : ''; });
  if(f==='live'){ renderLogLive(); } else { renderLogFilter(f); }
}
(function(){ const _lb=$('logBar'); if(_lb) _lb.addEventListener('click', function(ev){ const _b=ev.target.closest?ev.target.closest('button[data-lf]'):null; if(_b) setLogFilter(_b.getAttribute('data-lf')); }); })();
function alLive(text, cls, _age){ // 实时渲染——连续经营合并（年份相邻）/G.log 软上限 5000/DOM 上限 350 + 追加滚动
  if(cls==='good' && _opEarn(text)!==null && G.log.length){ // 逐年行动中连续经营合并（上一条同为经营且年份相邻）
    const _last = G.log[G.log.length-1];
    if(_last && _last.cls==='good' && _opEarn(_last.text)!==null && _last.age === ((_age!==undefined)?_age:(G&&G.age!==undefined?G.age:null))-1){
      const _na = _opEarn(_last.text), _nb = _opEarn(text);
      _last.text = '经营所得 +' + (_na+_nb) + ' 灵石，操劳间体魄亦有所长。<span style="color:var(--dim)">×' + (_opCnt(_last.text)+1) + '</span>';
      _last.age = (_age !== undefined) ? _age : ((G && G.age!==undefined) ? G.age : null);
      if(_logFilter === 'live'){
        const box = $('logBox');
        if(box && box.lastChild){ box.lastChild.innerHTML = _last.text; box.scrollTop = box.scrollHeight; }
      }
      return;
    }
  }
  G.log.push({text, cls, age: (_age !== undefined) ? _age : ((G && G.age!==undefined) ? G.age : null)});
  // G.log数组软上限——防止长时间挂机或恶意超大存档导致内存耗尽
  if(G.log.length > 5000){
    G.log.splice(0, G.log.length - 5000);
  }
  if(_logFilter !== 'live') return; // 4.316 筛选视图静态——新日志仅入 G.log（退出筛选回实时可见）
  const box = $('logBox');
  if(!box) return; // logBox 缺失（异常 DOM）——仅记录 G.log，跳过渲染
  // 自动挂机长时间运行：限制日志条数避免 DOM 膨胀
  if(box.children.length > 500){
    while(box.children.length > 350) box.removeChild(box.firstChild);
  }
  const d = document.createElement('div');
  d.className = 'entry ' + (cls||'');
  d.innerHTML = text;
  box.appendChild(d);
  box.scrollTop = box.scrollHeight;
}

/* 灵根境界上限——无灵根不可引气入体（炼体巅峰封顶），在修炼结算、吸收道胎突破、大机缘提升等所有境界提升通道后统一调用兜底。 */
// 修为统一入口——跨大境界战斗四维+6（破境升华）、渡劫期每渡一劫+1（境界越高，精进越多）
function lvGainWithAttr(n, tag){ // 修为统一入口——36 条独立修为条（realm/subRealm/realmPos），段内推进 + 满点挂起
  const g=G;
  if(g._breakPending !== undefined && g._breakPending !== null) return realmAbs(g); // 突破挂起中——修为停在满点
  if(g.realm >= 9){ return realmAbs(g); } // 渡劫/真仙：修为不累积
  const _sb = (g.subRealm === undefined || g.subRealm === null) ? 0 : g.subRealm;
  const _len = subSegLen(g, _sb); // 当前小境界段长（初 B/中 2B/后 4B/巅 10B）
  g.realmPos = Math.min(_len, (g.realmPos||0) + n * woundMult()); // 段内推进（防御截断，绝不跨段） // 伤势减修炼
  capLvBySoul(g);
  // 满点判定：realmPos 达当前段段长 → 挂起（小境 bp=段位；巅段 bp=3 大境界关口，等玩家点「渡劫/飞升之劫」）
  if(Math.abs(g.realmPos - _len) < 0.01){
    g.realmPos = _len;
    if(_sb === 3){
      if(g.soul && g.soul.quality==='fei'){ g.realmPos = _len - 1; if(g.realm===0) addLog('<b>炼体巅峰：</b>你为无灵根之体，炼体已至极限，却无法引气入体，此生止步炼体境。','bad'); return inRealmProg(g); }
      g._breakPending = 3;
    } else { g._breakPending = _sb; }
    return inRealmProg(g);
  }
  return inRealmProg(g);
}
// 突破按钮执行——修为满点后由玩家主动触发（小境 roll / 大境天劫 / 大乘飞升之劫）
function doBreak(){
  const g=G;
  if(g._breakPending === undefined || g._breakPending === null || !g.alive) return;
  const _bIdx = g.realm;
  const _sub = g._breakPending;
  const _r = g.realm; // 境界即状态字段（巅满挂起 realm 已是当前境）
  // 4.284：超大函数拆分——大境界/小境界/破境升华抽 3 子函数
  if(_sub === 3) dbBig(g, _r);
  else dbSmall(g, _r, _sub);
  g._breakPending = null;
  dbLift(g, _bIdx, g.realm);
}
/* ============ 生涯快照（4.317）——总结页成长曲线数据点 ============ */
function careerPush(g, _big){ // 境界突破成功时采集 {age, 境界序号, 道行}
  g.career = g.career || [];
  const _idx = ((g.realm||0) >= 9) ? 90 : ((g.realm||0)*10 + (g.subRealm||0)); // 境界序号 0-39；渡劫期 90
  const _last = g.career[g.career.length-1];
  if(_last && _last.idx === _idx && _last.age === g.age) return; // 同境界同年不重复
  g.career.push({age:g.age, idx:_idx, dao:Math.round(power()), big:!!_big});
  if(g.career.length > 500) g.career.splice(0, g.career.length-500); // 上限防爆
}
function flsBlock4(g){ // 区块四——生涯成长曲线（境界/道行双折线，内联 SVG 无外部依赖）
  let _c = (g.career||[]).slice();
  if(_c.length < 1){ _c.push({age:6, idx:0, dao:0, big:false}); }
  if(_c.length < 2){ _c.push({age:g.age, idx:((g.realm||0)>=9?90:(g.realm||0)*10+(g.subRealm||0)), dao:Math.round(power()), big:false}); }
  const _minA = Math.min(6, _c[0].age), _maxA = Math.max(g.age||0, _c[_c.length-1].age);
  let _idxMax = 40, _daoMax = 1;
  _c.forEach(function(p){ if(p.idx > _idxMax) _idxMax = p.idx; if(p.dao > _daoMax) _daoMax = p.dao; });
  const _W = 560, _H = 190, _L = 34, _R = 40, _T = 16, _B = 26;
  const _iw = _W - _L - _R, _ih = _H - _T - _B;
  const _px = function(a){ return _L + (a - _minA) / Math.max(1, _maxA - _minA) * _iw; };
  const _py = function(i){ return _T + (1 - i / _idxMax) * _ih; };
  const _dy = function(d){ return _T + (1 - d / _daoMax) * _ih; };
  const _lineJ = _c.map(function(p){ return _px(p.age).toFixed(1)+','+_py(p.idx).toFixed(1); }).join(' ');
  const _lineD = _c.map(function(p){ return _px(p.age).toFixed(1)+','+_dy(p.dao).toFixed(1); }).join(' ');
  let _dots = '';
  _c.forEach(function(p){ if(p.big) _dots += '<circle cx="'+_px(p.age).toFixed(1)+'" cy="'+_py(p.idx).toFixed(1)+'" r="3" fill="#e8b84b" stroke="#0d1424" stroke-width="1"><title>第'+p.age+'年 · 大境界突破</title></circle>'; });
  const _ticks = [0, 0.25, 0.5, 0.75, 1].map(function(t){ const _a = Math.round(_minA + t*(_maxA-_minA)); return '<text x="'+(_L + t*_iw).toFixed(1)+'" y="'+(_H-7)+'" text-anchor="middle" font-size="10" fill="var(--dim)">'+_a+'岁</text>'; }).join('');
  return '<div class="es-block"><div class="es-row"><b>生涯成长</b>境界 / 道行随年龄曲线</div>'
    + '<svg viewBox="0 0 '+_W+' '+_H+'" style="width:100%;height:auto;display:block" xmlns="http://www.w3.org/2000/svg">'
    + '<line x1="'+_L+'" y1="'+_T+'" x2="'+_L+'" y2="'+(_H-_B)+'" stroke="var(--line)" stroke-width="1"/>'
    + '<line x1="'+_L+'" y1="'+(_H-_B)+'" x2="'+(_W-_R)+'" y2="'+(_H-_B)+'" stroke="var(--line)" stroke-width="1"/>'
    + '<polyline points="'+_lineJ+'" fill="none" stroke="#e8b84b" stroke-width="2"/>'
    + '<polyline points="'+_lineD+'" fill="none" stroke="#7ecbce" stroke-width="1.6" stroke-dasharray="4 3"/>'
    + _dots + _ticks
    + '<text x="'+(_W-_R+6)+'" y="'+(_py(10)).toFixed(0)+'" font-size="10" fill="#e8b84b">境界</text>'
    + '<text x="'+(_W-_R+6)+'" y="'+(_dy(_daoMax*0.5)).toFixed(0)+'" font-size="10" fill="#7ecbce">道行</text>'
    + '</svg></div>';
}
function dbBig(g, _r){ // 大境界突破（第 4 小境巅满）——渡劫判定/晋境/道胎/混沌经淬炼/大乘→渡劫期
  if(g.soul && g.soul.quality==='fei'){ g.subRealm = 3; g.realmPos = subSegLen(g,3) - 1;  addLog('<b>炼体巅峰：</b>你为无灵根之体，炼体已至极限，却无法引气入体，此生止步炼体境。','bad'); g._breakPending = null; return; }
  if(realmBreakCheck(g, _r)){
    g.realm += 1; g.subRealm = 0; g.realmPos = 0;  // 突破成功：修为清零、晋入新境（36 条：小境界归零）
    careerPush(g, true); // 4.317 大境界突破生涯快照
    condenseDaotai(_r);
    // 混沌经·破境淬炼——天灵根以下小概率提升灵根品质（shen/she 无淬炼，仅享 +15% 提速）
    if(chaosJingOn(g) && ['pu','you','ding','super'].indexOf(g.soul.quality)>=0 && Math.random() < 0.03) chaosJingRefine(g); // 4.306 混沌经淬炼概率 2%→3%（低品质逆天改命概率链略提）
    if(_r === 8){ g.realm = 9; g.subRealm = 0;  g._dujieFirst = 1; } // 大乘→渡劫期（realm=9），当年蓄势不渡劫（次年逐年渡劫）
    if(g.spouse) g.spouseLv = Math.min(10, Math.max(g.spouseLv||0, _r+1));
    if(!g.daoHaoCore && _r >= 3){ g.daoHaoCore = daoHaoCoreOf(); addLog(`—— <b>道号加身</b>：元婴既成，道号「${g.daoHaoCore}」由此奠定，此后人称你「${daoHaoFull()}」。——`,'good'); }
  }
}
function dbSmall(g, _r, _sub){ // 小境界突破——概率判定 + 固定奖励（全四维）+ 失败折损 5%
  const _p = BRK_COEF[g.soul.quality] || 0.85;
  if(Math.random() < _p){
    g.subRealm = _sub + 1; g.realmPos = 0;  // 突破成功——晋入下一小境（36 条：下一段从 0 起）
    // 小境界突破固定奖励（折半取整）——炼体1/炼气1/筑基2/金丹3/元婴4/化神5/炼虚6/合体7/大乘8（全四维）
    const _subAdd = [1,1,2,3,4,5,6,7,8][_r] || 8;
    FIGHT_ATTRS.forEach(k=>{ g.base[k] = (g.base[k]||0) + _subAdd; }); // 小境界奖励写入基础层
    g._sCount = (g._sCount||0) + 1; // 小境界突破次数
    careerPush(g, false); // 4.317 小境界突破生涯快照
    addLog(`修为精进，跨入<b>${TIER_NAMES[_r]}${SUB_TIER[_sub+1]}</b>！（战斗四维 +${_subAdd}）`,'good');
    showToast('修为精进 · '+TIER_NAMES[_r]+SUB_TIER[_sub+1], '#8be08b', 'rgba(14,30,20,.92)'); // 4.359 小境界突破即时飘字
  } else {
    g.realmPos = subSegLen(g, _sub) * 0.95;  // 突破失败——当前段内折 5%（段内 95%） // 失败——当前段显示修为折损 5%
    addLog('小境界冲击失利，修为折损 5%。','bad');
  }
}
function dbLift(g, _bIdx, _aIdx){ // 破境升华——跨大境界战斗四维 +6（渡劫期过渡提示）
  if(!g.alive) return;
  let _up = 0;
  if(_aIdx > _bIdx) _up += (_aIdx-_bIdx)*6; // 破境升华：跨大境界战斗四维+6
  if(_aIdx===9 && _bIdx<9) addLog(`—— <b>踏入渡劫期</b>：修为圆满，九重天劫在望。 ——`,'good'); // 大乘→渡劫过渡显式提示
  if(_up > 0){
    FIGHT_ATTRS.forEach(k=>{ g.a[k] += _up; });
    addLog(`<b>破境升华</b> 修为跨越新境界，肉身与根基随之蜕变——<b>战斗四维 +${_up}</b>（跨大境界+6）。`,'good');
  }
}
// 功德金身飞升——大乘巅峰由玩家主动选择（替代原 endYear 自动判定）
function doGongdeAscend(){
  const g=G;
  const _gdNet=(g.功德||0)-(g.业力||0);
  if(_gdNet < 200 || g._jinShenFail || g.godTitle || g._sanxian || !g.alive) return;
  if(!g._jinShenDone){
    g._jinShenDone = true;
    if(Math.random() < Math.min(0.50, 0.30 + _gdNet/10000)){
      g._gongdeAscend = true;
      addLog('功德圆满，金光自虚空中垂落——你以无量功德凝聚<b>功德金身</b>，肉身成圣，九劫未起，白日飞升！','good');
      ascend(); return;
    } else if(Math.random() < 0.10){
      addLog('功德金身凝聚失败，金光反噬——你的肉身与道行在刹那崩碎，<b>身死道消</b>！','bad');
      die('金身塑造失败，功德反噬，身死道消'); return;
    } else {
      g._jinShenFail = true;
      addLog('功德金身塑造失败，你气血翻涌、根基震荡，所幸性命无碍；此后渡劫可得功德余晖庇佑（渡劫成功率+功德/100）。','bad');
      return;
    }
  }
}
// 魔道飞升——大乘巅峰由玩家主动选择（化魔池→凝魔躯两阶段）
function doMoAscend(){
  const g=G;
  const _gdNet=(g.功德||0)-(g.业力||0);
  if(_gdNet > -200 || g.godTitle || g._sanxian || !g.alive) return;
  if(!g._huamo){
    if(Math.random() < Math.min(0.55, 0.40 + (-_gdNet)/10000)){
      g._huamo = true;
      addLog('业力滔天，魔气自虚空垂落——你踏入<b>化魔池</b>，魔气灌体，根基崩裂又重铸，生死一线……','bad');
    } else {
      die('堕入化魔池，心魔噬体，道消身死'); return;
    }
  } else if(Math.random() < 0.50){
    g._moAscend = true; g.godTitle='九幽真魔'; g.shenkaoDone = true;
    g.realm = 10; g.subRealm = 0; g.realmPos = 0; 
    if(g.achievements.indexOf('魔道飞升')<0) g.achievements.push('魔道飞升');
    addLog('—— <b>魔躯凝聚成！</b>九幽魔气尽归于身，你证得 <b>九幽真魔</b>之位，飞升九幽魔界，魔威永镇！——','bad');
    finishLife('九幽真魔'); return;
  } else {
    die('凝魔躯功败垂成，魔气暴走，形神俱灭'); return;
  }
}
// 小境界突破判定已并入 lvGainWithAttr（段满触发 roll，成功清零晋段、失败折损 5%）
function capLvBySoul(g){
  if(!g || !g.soul) return;
  if(g.soul.quality==='fei' && g.realm >= 1){
    g.realm = 0; g.subRealm = Math.min(g.subRealm||0, 3); g.realmPos = Math.min(g.realmPos, subSegLen(g,3));  // 无灵根不可引气入体，修为上限锁死炼体巅（事件/机缘同样封顶）  XL_RS 4.195：realmPos 版
  }
}

/* 修为进度（修仙版）：当前大境界内修为累积进度 0-1——四段（初/中/后/巅）推进、渡劫 9 劫、真仙圆满 */
/* 修仙版：分境界修为条——每个大境界与每个小境界单独累积修为，所需修为随境界递增。
   显示刻度独立于连续修为值（底层 lv 仍连续累积，境界判定/渡劫/寿命等全链不受影响）；
   进度完全由 lv 在境界区间内的实际位置映射，条满即实际跨过小境/大境关口。 */
const REALM_B = [10, 50, 250, 1250, 6250, 31250, 156250, 781250, 3906250, 0]; // 每境基础 B（B_i=10×5^(i-1)），境内四段需求 = 1B/2B/4B/10B

const SUB_TIER = ['初期','中期','后期','巅峰'];
function subRealm(){ // 独立修为条——直接按 realm/realmPos（境界即状态，无需修为换算）
  const g = G;
  if(g.realm >= 10) return {name:'真仙', cur:0, need:0, subProg:1};
  const _pend6 = (g._breakPending !== undefined && g._breakPending !== null);
  if(_pend6){ // 突破挂起——显示挂起段位满进度（realm 已是当前境）
    const _ps = g._breakPending;
    const _B1 = REALM_B[g.realm];
    const _need2 = [1,2,4,10][_ps]*_B1; // 36 条：初 B/中 2B/后 4B/巅 10B
    return {name: (TIER_NAMES[g.realm]||'炼体')+SUB_TIER[_ps], cur: _need2, need: _need2, subProg: 1};
  }
  if(g.realm === 9){
    if(g._dixian || g.godTitle === '地仙'){ return {name:'地仙', cur:0, need:0, subProg:-1}; } // 4.207f 地仙优先于散仙——防地仙残留"N劫散仙"
    if(g._sanxian){ return {name:(g._sanxian||1)+'劫散仙', cur:0, need:0, subProg:-1}; } // 散仙修为锁定——subProg:-1 标记，渲染端显示"修为锁定"无进度条 // 散仙——修为锁定，段位显示劫数
    const _j = Math.min(9, (g._jie)||0);
    return {name:'渡劫·'+(_j+1)+'劫', cur:_j, need:9, subProg:_j/9};
  }
  const pos = g.realmPos;
  const _sb = (g.subRealm === undefined || g.subRealm === null) ? 0 : g.subRealm;
  const _len = subSegLen(g, _sb); // 36 条：段长即当前小境界上限
  const subFrac = Math.min(1, Math.max(0, pos/_len));
  return {name: TIER_NAMES[g.realm]+SUB_TIER[_sb], cur: Math.round(Math.min(pos,_len)), need: _len, subProg: subFrac};
}
/* 修为数字缩写：过万显示 x.x万，未过万原样 */
function fmtW(n){
  n = Number(n) || 0;
  if(n < 10000) return String(n);
  const w = Math.round(n/1000)/10;
  return w + '万';
}

/* ============ HUD ============ */
/* 紧凑属性条渲染（动作按钮区域内，手机上无需上划即可查看关键属性） */ // 去重（原重复 4 遍）
// 上一次属性值（用于变化高亮检测）
let _prevAttrs = null;
/* 全局渲染开关——批测/静默推进置 true 跳过全部渲染入口（替代此前临时替换函数 hack）；仅影响渲染/日志/toast，逻辑层不受影响 */
let __NORENDER = false;
function renderCompactStats(){
  if(__NORENDER) return; // 渲染开关
  const g=G, a=g.a;
  const cs = document.getElementById("compactStats");
  if(!cs) return;
  const _ea2 = effAttrs(); // 面板显示战斗四维终值
  const cur = {力量:_ea2.力量, 灵动:_ea2.灵动, 气血:_ea2.气血, 神识:_ea2.神识, 悟性:a.悟性, 家境:a.家境, 气运:a.气运, 道行:power()};
  const hl = (k)=>{
    if(!_prevAttrs) return '';
    const diff = cur[k] - _prevAttrs[k];
    if(Math.abs(diff) > 0.01){
      const cls = diff > 0 ? 'attr-highlight attr-up' : 'attr-highlight attr-down';
      return ' class="'+cls+'"';
    }
    return '';
  };
  cs.innerHTML =
    `<span>力量<b${hl('力量')}>${Math.floor(cur.力量)}</b></span>
     <span>灵动<b${hl('灵动')}>${Math.floor(cur.灵动)}</b></span>
     <span>气血<b${hl('气血')}>${Math.floor(cur.气血)}</b></span>
     <span>神识<b${hl('神识')}>${Math.floor(cur.神识)}</b></span>
     <span>悟性<b${hl('悟性')}>${Math.floor(a.悟性)}</b></span>
     <span>家境<b${hl('家境')}>${Math.floor(a.家境)}</b></span>
     <span>气运<b${hl('气运')}>${Math.floor(a.气运)}</b></span>
     <span class="cs-power">道行<b${hl('道行')}>${power()}</b></span>`;
  _prevAttrs = cur;
}
// 挂机渲染节流——AUTO 挂机时同一帧内多次 renderGame 合并为一次
// （单行动双渲染：advanceYears 内 + autoAct 外 → 合并为一次；用户手动操作仍同步渲染）
let __autoRaf = 0;
function showTipModal(title, body){ // 4.327 通用点按弹窗（触屏替代 title 悬停；复用 evmodal 范式）
  let m=$('tipModal'); if(!m){ m=document.createElement('div'); m.id='tipModal'; document.body.appendChild(m); }
  m.innerHTML = '<div class="evmodal" onclick="if(event.target===this)closeTipModal()"><div class="evmodal-card">'
    + '<div class="evmodal-head"><b>'+title+'</b><button class="cl" onclick="closeTipModal()">✕</button></div>'
    + '<div style="font-size:13px;line-height:1.75">'+body+'</div>'
    + '</div></div>';
  m.style.cssText='position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9999;background:rgba(0,0,0,.55)';
}
function closeTipModal(){ const m=$('tipModal'); if(m) m.style.display='none'; }
function showLifeTip(){ const _c = lifeCapOf(); const _r = Math.max(0, _c - G.age); showTipModal('寿元', '当前 <b>'+G.age+'</b> 岁，寿元上限 <b>'+_c+'</b> 岁，余 <b>'+_r+'</b> 年'); }
function showWoundTip(){ showTipModal('伤势', '伤势影响道行（当前 ×'+Math.round(woundMult()*100)+'%）：<br>调养 '+woundHealNeed()+' 次 -1 · 疗伤丹 '+woundDanNeed()+' 颗 -1 · 自愈 '+woundHealYears()+' 年'); }
function showOrgTip(){ showTipModal('势力被动', G.org && ORG_BONUS[G.org] ? escapeHtml(ORG_BONUS[G.org].desc) : '散修，无宗门被动'); }
function showFateBuffs(){
  let m=$('fateModal'); if(!m){ m=document.createElement('div'); m.id='fateModal'; document.body.appendChild(m); }
  const _f = (G._fates||[]).map(function(f){ return '<div style="margin:5px 0"><b style="color:var(--gold)">'+escapeHtml(f.name)+'</b><div style="font-size:12px;color:var(--dim)">'+escapeHtml(f.desc)+'</div></div>'; }).join('');
  const _lh = lunhuiBuffText();
  const _lhTxt = _lh.length ? _lh.map(function(x){ return '<div style="margin:2px 0;font-size:12.5px">'+x+'</div>'; }).join('') : '<div style="font-size:12px;color:var(--dim)">无轮回加护——第一世赤手空拳，于轮回殿加点可强化下一世</div>';
  m.innerHTML = '<div class="evmodal" onclick="if(event.target===this)closeFateBuffs()"><div class="evmodal-card">'
    + '<div class="evmodal-head"><b>命格 · 轮回加护</b><button class="cl" onclick="closeFateBuffs()">✕</button></div>'
    + '<div style="font-size:11.5px;color:var(--dim);margin:2px 0 6px">命格为出生随机天赋 · 轮回加护来自轮回殿加点（跨世继承）</div>'
    + (_f || '<div style="font-size:12px;color:var(--dim)">无命格</div>')
    + '<div style="border-top:1px dashed var(--line);margin:8px 0 4px;padding-top:6px;font-size:12px;color:var(--gold)">—— 轮回加护 ——</div>'
    + _lhTxt
    + '</div></div>';
  m.style.cssText='position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9999;background:rgba(0,0,0,.55)';
}
function closeFateBuffs(){ const m=$('fateModal'); if(m) m.style.display='none'; }
function renderGameAuto(){
  if(__NORENDER) return;
  if(__autoRaf) return;
  // 4.206q：挂机渲染降频 200ms（原 rAF 每帧全量重建 DOM）——移动端低配机主线程被逐帧渲染占满时，
  // 点击事件排队/丢失（表现为「停止」关不掉、速度调不了）；降频后主线程每 200ms 才渲染一次，
  // 交互及时响应。手动操作走 renderGame() 立即刷新，不受影响。
  __autoRaf = setTimeout(()=>{ __autoRaf = 0; renderGame(); }, 200);
}
function renderGame(){
  if(__NORENDER) return; // 渲染开关（批测免全量重建）
  const g=G, a=g.a;
  checkRealmBreak(g); // 境界大突破飘字
  // 4.217：超大函数拆分——按区块抽子函数（渲染输出零变化）
  renderGameTop(g);      // 顶部状态条 + 轮回加护 + 行动标题
  renderCompactStats();  // 紧凑属性条（动作按钮区域内，手机上无需上划即可查看关键属性）
  renderGameAttrs(g, a); // 属性面板（修为条/四维/功德道心/道行构成）
  renderGameSoul(g);     // 灵根道胎 + 法宝信息
  renderGameLife(g);     // 事件链 + 人生轨迹
  renderArt();           // 主界面右侧功法神通面板
}
function renderGameTop(g){ // 顶部状态条 + 轮回加护 + 行动标题
  // 4.293：超大函数拆分——状态胶囊/加护行抽 2 子函数
  const lifeCap = lifeCapOf();
  const remain = Math.max(0, lifeCap - g.age);
  const lowLife = remain < 15;
  $('topStats').innerHTML = rgtStats(g, lifeCap, remain, lowLife);
  rgtHud(g);
}
function rgtStats(g, lifeCap, remain, lowLife){ // 顶部状态胶囊——姓名/道号/性格/性别/境界/修为/道行/寿元/灵石/声望/伤势/势力
  return `<span class="statpill">姓名 <b>${(g.name && String(g.name).trim()) ? escapeHtml(g.name) : '无名'}</b></span>
     ${g.daoHaoCore?`<span class="statpill">道号 <b>${escapeHtml(daoHaoFull())}</b></span>`:''}
     <span class="statpill" title="性格 ${escapeHtml(g.personality)} · 性别 ${escapeHtml(g.gender)||'男'}">${escapeHtml(g.gender)||'男'} · <b>${escapeHtml(g.personality)}</b></span>
     <span class="statpill">境界 <b>${escapeHtml(subRealm().name)}</b></span>
     <span class="statpill" title="修为进度（小境界累积）">修为 <b>${subRealm().subProg<0?'锁定':fmtW(subRealm().cur)+'/'+fmtW(subRealm().need)}</b></span>
     <span class="statpill">道行 <b>${power()}</b></span>
     <span class="statpill ${lowLife?'warn':''}" title="当前 ${g.age} 岁，寿元上限 ${lifeCap} 岁，余 ${remain} 年" onclick="showLifeTip()" style="cursor:pointer">寿元 <b>${g.age}/${lifeCap}岁</b></span>
     <span class="statpill">灵石 <b>${Math.floor(g.money)}</b></span>
     <span class="statpill">声望 <b>${Math.floor(g.prestige)}</b></span>${(g.wound||0)>0 ? ' <span class="statpill" style="color:#e07777;cursor:pointer" title="伤势影响道行（当前 ×'+Math.round(woundMult()*100)+'%）：调养'+woundHealNeed()+'次-1 · 疗伤丹'+woundDanNeed()+'颗-1 · 自愈'+woundHealYears()+'年" onclick="showWoundTip()">伤·'+woundName()+'</span>' : ''} <!-- XL_RS 4.199/4.203：伤势显示+悬停减益提示 -->
     <span class="statpill" title="${escapeHtml(g.org&&ORG_BONUS[g.org]?ORG_BONUS[g.org].desc:'')}" onclick="showOrgTip()" style="cursor:pointer">势力 <b>${escapeHtml(g.org)||'散修'}</b>${g.org&&ORG_BONUS[g.org]?'<span style="font-size:10px;color:var(--dim)">·被动</span>':''}</span>
      `; // 命格并入 hudLunhui 折叠行（4.206y 体验优化）
}
function rgtHud(g){ // 轮回加护行 + 行动标题——命格折叠行（4.206y）
  const lhBuffs = lunhuiBuffText();
  const _fatesTxt = (g._fates||[]).length ? g._fates.map(function(f){return escapeHtml(f.name);}).join('、') : '无';
  $('hudLunhui').innerHTML = `<span style="color:var(--gold)">命格：${_fatesTxt} · 轮回加护 ${lhBuffs.length?lhBuffs.length+' 项':'无'}</span> <button class="btn mini" style="padding:0 10px;font-size:11px;vertical-align:1px" onclick="showFateBuffs()" title="查看命格与轮回加护明细">查看</button>`; // v4.341 命格行按钮化
  $('actionTitle').textContent = `第 ${g.age} 岁 · 选择今年如何度过`;
}
function renderGameAttrs(g, a){ // 属性面板（修为条/四维/功德道心/道行构成）
  // 属性面板
  const sa=$('sideAttrs'); sa.innerHTML='';
  try{ if(!localStorage.getItem('xiuxian_attrTip1')) sa.insertAdjacentHTML('beforeend', '<div style="grid-column:1/-1;font-size:11px;color:var(--dim);opacity:.85;margin-bottom:2px">点击四维/道行/修炼速度可查看计算明细 <span style="cursor:pointer;color:var(--gold)" onclick="this.parentElement.remove();try{localStorage.setItem(\'xiuxian_attrTip1\',\'1\')}catch(e){}">✕ 知道了</span></div>'); }catch(e){} // v4.341 提示行首次显示、可关闭
  sa.insertAdjacentHTML('beforeend', '<div class="attrxp" style="grid-column:1/-1">修为 <b style="color:var(--gold);font-size:13px">'+escapeHtml(subRealm().name)+'</b> '+(subRealm().subProg<0?'<span style="opacity:.72">修为锁定</span>':'<span style="opacity:.72">'+subRealm().cur+'/'+subRealm().need+'</span><span class="xpbar"><i style="width:'+Math.round(subRealm().subProg*100)+'%"></i></span>')+'</div>');
  // 4.207b 突破卡点提示——距下一境界还需约多少年苦修（cultBase 同源估算，移动端决策直观）
  if(g.alive){
    const _sub = subRealm();
    const _tip = renderGameAttrsTip(_sub, g); // 4.236：超大函数拆分——卡点提示段抽子函数
    if(_tip) sa.insertAdjacentHTML('beforeend', '<div style="grid-column:1/-1;font-size:11px;color:var(--gold);opacity:.9;margin:2px 0 0">'+_tip+'</div>');
  }
  // 4.275：超大函数拆分——四维属性条/道心说明抽 2 子函数
  rgaBars(sa, g, a);
  rgaMisc(sa, g);
}
function rgaBars(sa, g, a){ // 四维属性条（战斗终值）+ 点击弹窗绑定 + 悟性/家境/气运
  const _ea3 = effAttrs(); // 属性条显示战斗四维终值
  sa.insertAdjacentHTML('beforeend', bar('力量', _ea3.力量, '', 0, '力量'));
  sa.insertAdjacentHTML('beforeend', bar('灵动', _ea3.灵动, '', 0, '灵动'));
  sa.insertAdjacentHTML('beforeend', bar('气血', _ea3.气血, '', 0, '气血'));
  sa.insertAdjacentHTML('beforeend', bar('神识', _ea3.神识, 'psi', 0, '神识'));
  // 属性弹窗一次性绑定——sa 元素本体不可重建（重建丢监听），仅用 innerHTML 更新内容
  if(!sa._calcBound){ sa._calcBound = true; sa.addEventListener('click', e=>{ const t = e.target.closest('[data-calc]'); if(t) showAttrCalc(t.getAttribute('data-calc')); }); } // 点击属性查看计算明细
  sa.insertAdjacentHTML('beforeend', bar('悟性', a.悟性));
  sa.insertAdjacentHTML('beforeend', bar('家境', a.家境));
  sa.insertAdjacentHTML('beforeend', bar('气运', a.气运));
  sa.insertAdjacentHTML('beforeend', rgaVirtueRow(g)); // 4.250：功德/业力行抽子函数
}
function rgaMisc(sa, g){ // 道心（向道之心）+ 道行构成行 + 基准说明
  // 道心——向道之心（历劫明心，影响心魔与破境）
  sa.insertAdjacentHTML('beforeend', '<div style="grid-column:1/-1;margin-top:2px;font-size:11.5px;color:var(--dim)">道心 <b style="color:'+((g.daoXin||50)>=80?'var(--gold)':(g.daoXin||50)<=20?'#e77':'var(--dim)')+'">'+Math.round(g.daoXin||50)+'</b>/100 <span style="opacity:.65">（向道之心 · 历劫明心，影响心魔与破境）</span></div>');
  sa.insertAdjacentHTML('beforeend', rgaPowerRow()); // 4.250：道行构成行抽子函数
  sa.insertAdjacentHTML('beforeend', '<div class="muted" style="grid-column:1/-1;font-size:11px;margin-top:2px">四维与道行均以普通人 5 为基准</div>');
}
function rgaVirtueRow(g){ // 功德/业力行——正魔道业仅影响渡劫 + 渡劫/突破构成按钮
  return '<div style="grid-column:1/-1;margin-top:2px;padding-top:4px;border-top:1px dashed var(--line);font-size:11.5px;color:var(--dim)">功德 <b style="color:#7ecb7e">'+(g.功德||0)+'</b> · 业力 <b style="color:#e77">'+(g.业力||0)+'</b> <span style="opacity:.65">（正魔道业，仅影响渡劫）</span> <button class="btn mini" style="margin-left:6px;padding:0 8px;font-size:10px" title="查看渡劫成功率构成：基础/法宝/功德业力/气运/庇护/灵根/势力/功法" onclick="openTribModal()">渡劫构成</button> <button class="btn mini" style="padding:0 8px;font-size:10px" title="查看大境界突破成功率与失败后果、小境界突破成功率（与代码同源）" onclick="openBreakModal()">突破构成</button></div>';
}
function rgaPowerRow(){ // 道行构成行——道行终值 + 构成按钮 + 明细容器
  return '<div style="grid-column:1/-1;margin-top:8px;padding-top:6px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:center;gap:10px"><span style="font-size:14px;color:var(--dim)">道行</span><span style="font-size:20px;font-weight:800;color:var(--gold)">'+power()+'</span><button class="btn mini" onclick="togglePowerBrk()">构成</button></div>' + '<div id="powerBrk" style="grid-column:1/-1;margin-top:2px"></div>';
}
function renderGameAttrsTip(_sub, g){ // 突破卡点提示——渡劫期/已满可突破/距下一境界年数/灵根所限
  if(_sub.subProg < 0) return '';
  let _tip = '';
  if(g.realm >= 9){ _tip = '渡劫期：历劫飞升（点击渡劫构成查看成功率）'; }
  else if(_sub.cur >= _sub.need){ _tip = '修为已满，可突破'; }
  else {
    const _per = cultBase();
    if(_per > 0){
      const _y = Math.ceil((_sub.need - _sub.cur) / _per);
      _tip = '距下一境界约需 '+_y+' 年苦修';
    } else if(g.soul && (g.soul.quality==='fei'||g.soul.quality==='pu') && g.realm >= 1){ _tip = '灵根所限，修炼停滞——需机缘改命'; }
  }
  return _tip;
}
function renderGameSoul(g){ // 灵根道胎 + 法宝信息
  // 4.296：超大函数拆分——灵根/道胎法宝抽 2 子函数
  rgsSoul(g);
  rgsRing(g);
}
function rgsSoul(g){ // 灵根道胎 hud——品质名 + 综合修炼倍率（构成按钮）+ 属性倾向
  const s = g.soul;
  // 4.312：签名门——灵根/倍率/道胎/法宝/仙衣无变化则跳过重建（含 ringSlots+hudRingInfo）
  const _sig = (s?s.name:'')+'|'+Q_KEYS[s.quality]+'|'+cultMultLabel().toFixed(2)+'|'+trendDesc(s.cat)+'|'
    + (g.rings||[]).map(function(r){ return r?(r.y+':'+ringLevel(r.y).key):'-'; }).join(',')+'|'
    + (g.bones||[]).map(function(b){ return b.name+b.pct; }).join(',')+'|'
    + (g.extraBone?(g.extraBone.name+g.extraBone.pct):'-')+'|'+(g.godTitle||'')+'|'+(g.godArmor?1:0);
  const _hs = $('hudSoul');
  if(_hs && _hs._sig === _sig) return;
  if(_hs) _hs._sig = _sig;
  $('hudSoul').innerHTML =
    `<span class="soulname ${Q_COLOR[s.quality]}">${s.name}</span>${Q_KEYS[s.quality]!==s.name ? '（'+Q_KEYS[s.quality]+'）' : ''}     <div class="muted" style="font-size:12px">综合修炼 ×${cultMultLabel().toFixed(2)} <button class="btn mini" style="margin:0 3px;padding:0 8px;font-size:10px;vertical-align:1px" title="查看修炼速度构成：基础（基础速度×境界系数）+ 各项加成" onclick="openCultModal()">构成</button> · 属性倾向：${trendDesc(s.cat)}</div>`; // 综合修炼倍率（灵根/功法/道胎等叠乘）
}
function rgsRing(g){ // 道胎槽位 + 法宝信息——八枚道胎槽 + 装备法宝 + 仙衣进度（成仙后）+ 本命法宝
  const rs=$('ringSlots'); rs.innerHTML='';
  const n = 8; // 八枚道胎（炼气至大乘）
  for(let i=0;i<n;i++){
    const r = g.rings[i];
    const cls = r ? ringLevel(r.y).key : '';
    rs.insertAdjacentHTML('beforeend', `<span class="ringslot ${cls}" title="${r?('第'+(i+1)+'枚 · '+ringNameOf(i)+' · '+ringGradeKey(r.y)+(r.skill?(' · 神通 '+r.skill):'')):'空缺'}">${r?i+1:'·'}</span>`);
  }
  let ringInfo = g.rings.map((r,i)=>`<b style="color:${ringGradeOf(r.y)===2?'var(--gold)':ringGradeOf(r.y)===1?'#6ea8ff':'#a0a4ad'}">${ringGradeKey(r.y)}</b> ${ringNameOf(i)}`).join('<br>') || '尚未获得道胎'; // 道胎显示「品质 境界道胎」，去除序号/神通/兽名
  if(g.bones && g.bones.length){
    ringInfo += '<br><b style="color:#e0763a">法宝</b> ' + (BONE_SLOTS.map(_bs=>boneEquipped(_bs)).filter(Boolean).length ? BONE_SLOTS.map(_bs=>boneEquipped(_bs)).filter(Boolean).map(_b=>`${_b.grade}·${_b.name}(${_b.main}+${_b.pct}%)`).join(' / ') : '未装备（法宝库 '+(g.bones||[]).length+' 件）'); // 仅显示装备法宝
    // 仙衣进度仅在成仙后显示（godTitle 已定）——未成仙者不必知晓仙衣之事
    if(g.godTitle){
      ringInfo += '<br><span class="muted" style="font-size:11px">仙衣进度 ' + boneSetCount() + '/4' + (g.godArmor?' · <b style="color:var(--gold)">仙衣已成</b>':'') + '</span>';
    }
  }
  if(g.extraBone){
    ringInfo += '<br><b style="color:#b45ef0">本命法宝</b> ' + g.extraBone.name + '（' + (g.extraBone.grade||'凡器') + ' · ' + g.extraBone.main + '+' + g.extraBone.pct + '%·' + g.extraBone.sub + '+' + g.extraBone.pct + '%）';
  }
  $('hudRingInfo').innerHTML = ringInfo;
}
function renderGameLife(g){ // 事件链 + 人生轨迹
  // 事件链——4.312 签名门：链 id/步骤无变化跳过重建
  const _ch = $('hudChain');
  const _csig = (g.chain ? (g.chain.id+':'+g.chain.step) : '');
  if(_ch && _ch._sig !== _csig){ _ch._sig = _csig; _ch.innerHTML = renderChain(); }
  // 人生轨迹——4.310 移动端(≤480px)合并为 · 分隔单行簇，桌面保持逐行
  const _sep = (typeof window!=='undefined' && window.innerWidth && window.innerWidth<=480) ? '　·　' : '<br>';
  let lf = '';
  if(g.org) lf += '加入 '+g.org+_sep;
  if(g.master) lf += '拜师 '+g.master+_sep;
  if(g.spouse) lf += '道侣 '+g.spouse+'（'+realmName(CFG.realms[Math.min(10,g.spouseLv||0)])+(g.spouseRole?' · '+g.spouseRole:'')+'）· 羁绊'+Math.min(100,(g.bond||0))+_sep // /4.149：关系面板显示道侣名·关系·羁绊;
  if(g.children>0){ lf += '子嗣 '+g.children+' 人'; const _ks=(g.kids||[]).filter(k=>k.done&&k.succ); if(_ks.length>0) lf += '（'+_ks.map(k=>k.name+'·成才').join('、')+'）'; lf += _sep; } // 子嗣个体化显示成才子嗣
  if(g.godTitle) lf += '仙位 · '+g.godTitle+_sep;
  if(g.godArtifact) lf += '神器 · '+g.godArtifact+_sep; // 成仙凝聚的仙装展示
  const _hl = $('hudLife');
  const _lsig = (g.org||'')+'|'+(g.master||'')+'|'+(g.spouse||'')+'|'+(g.children||0)+'|'+(g.godTitle||'')+'|'+(g.godArtifact||'');
  if(_hl && _hl._sig !== _lsig){ _hl._sig = _lsig; _hl.innerHTML = lf || '前路未定。'; }
}
function trendDesc(cat){
  const t = TREND[cat]||{};
  return Object.keys(t).sort((x,y)=>t[y]-t[x]).map(k=>k).slice(0,3).join('/');
}
function chainEndGain(ev){ // 4.333 链终点奖励类型预览（功法/法宝/属性/升华；效果在选项时聚合首选项）
  if(!ev) return '';
  const _p=[];
  if(ev.art) _p.push('功法「'+ev.art+'」');
  if(ev.bone) _p.push('法宝「'+ev.bone+'」');
  if(ev.eff){ const _t=fmtEff(ev.eff); if(_t) _p.push(_t); }
  if(ev.youBreak) _p.push('灵根升华');
  if(ev.opts){ // 效果挂在选项（如冰火淬体终段）：取首个有 eff 的选项，附加"等"
    const _oe=[];
    ev.opts.forEach(_o=>{ if(_o && _o.eff){ const _t=fmtEff(_o.eff); if(_t) _oe.push(_t); } });
    if(_oe.length) _p.push(_oe[0]+(_oe.length>1 ? ' 等' : ''));
  }
  if(ev.roll && ev.roll.succ){ const _t=fmtEff(ev.roll.succ); if(_t) _p.push('或'+_t); }
  return _p.length ? '　→ 可得：'+_p.join(' · ') : '';
}
function renderChain(){
  if(!G.chain) return '';
  const ch = CHAINS[G.chain.id];
  if(!ch) return '';
  const total = ch.steps.length;
  const cur = Math.min(G.chain.step, total);
  // 事件链追踪器——步骤进度 + 终点目标（预期奖励类型），强化长线剧情沉浸感
  const lastEv = EV_BY_CHAIN[G.chain.id+':'+ch.steps[total-1]];
  let html = `<b>事件链：${ch.name}</b>（第 ${cur}/${total} 步）<br><span style="color:var(--dim)">${ch.desc||''}</span>`;
  if(lastEv) html += `<br><span style="color:var(--gold2)">→ 终点：${lastEv.name}</span>${chainEndGain(lastEv)}`;
  ch.steps.forEach((st, i)=>{
    const ev = EV_BY_CHAIN[G.chain.id+':'+st];
    const done = i < G.chain.step;
    const cur2 = i === G.chain.step;
    html += `<br><span class="${done?'on':(cur2?'':'todo')}">${done?'✓':(cur2?'▸':'·')} ${ev?ev.name:st}</span>`;
  });
  return html;
}

/* ============ 修炼 ============ */
// 混沌经是否已装备（主修或辅修位）——装备后按品质分档生效（修炼 +5%/+15%、破境淬炼）
function chaosJingOn(g){
  return !!(g && g.chaosJing && g.gongfa && (g.gongfa.main==='混沌经' || g.gongfa.sub==='混沌经'));
}
// 混沌经·破境淬炼——灵根提升一个品质（杂→四→三→双→天；天灵根及以上无淬炼）
function chaosJingRefine(g){
  const _next = {pu:'you', you:'ding', ding:'super', super:'shen'}[g.soul.quality];
  if(!_next) return;
  const _p = SOULS_BY_Q[_next][Math.floor(Math.random()*SOULS_BY_Q[_next].length)];
  addLog(`<b>混沌经·淬灵：</b>破境之际，混沌道韵自功法深处涌出，冲刷灵根——${Q_KEYS[g.soul.quality]}尽褪杂质，蜕变为${Q_KEYS[_next]}！`,'gold');
  g.soul.quality = _next; g.soul.name = _p.name; g.soul.cat = _p.cat;
}
/* 道胎修炼加成统一入口——每枚完美 +2%、每枚有瑕 -2%（无缺为基准），cultBase/cultMultLabel 共用防漂移 */
function _dtmOf(_g){
  const _rings = _g.rings||[]; let _d = 0;
  _rings.forEach(_r=>{ const _grade = ringGradeOf(_r.y); if(_grade>=2) _d += 0.02; else if(_grade<=0) _d -= 0.02; });
  return _d;
}
function cultBase(){ // 修为体系重构——年修为（点）= 基础速度 × 境界系数 × 加成链（无衰减）
  const g=G;
  const r = g.realm;
  if(r >= 9) return 0; // 渡劫/真仙：不再累积修为（渡劫期每年渡劫判定）
  let speed;
  if(r === 0){ speed = (g.soul.quality==='fei') ? 2.4 : 6; } // 炼体期：有灵根统一 6 点/年、无灵根 2.4 点/年（×1.2 上调）
  else { speed = CFG.cult.speed[g.soul.quality] || 0; }
  if(!(speed > 0)) return 0; // 无灵根进入炼气期后速度 0，止步炼体
  let base = speed * (CFG.cult.coef[r] || 1);
  const fMult = (g._fortune && g._fortune.years>0) ? g._fortune.mult : 1; // 气运眷顾限时 buff（命格已并入下方加算链）
  // 修炼速度加成改为全加算（原叠乘）——命格/气运/轮回殿/势力/道胎/功法/图鉴/洞府同层累加
  const _add = (hasFate(G,'cult') ? 0.05 : 0) + (fMult - 1) + lunhuiVal('cultTop')*0.025 + (orgCultMult() - 1) + _dtmOf(g) + (gongfaCultMult() - 1) + gongfaAtlasCultMult() + (chaosJingOn(g) ? ((g.soul.quality==='shen'||g.soul.quality==='she') ? 0.15 : 0.05) : 0) + [0,0.10,0.20,0.35][g.caveLv||0];
  return base * Math.max(0, 1 + _add);
}
// tierMult（境界修炼难度倍率）已删除——境界难度改由「境界系数」体现（低境系数小、高境系数大）
// 综合加成倍率（HUD/觉醒页展示）——XL_RS 4.126 起仅含加成链（不含基础速度×境界系数）
function cultMultLabel(){
  const g=G;
  if(g.realm >= 9) return 1; // 渡劫/真仙不再累积修为
  const _f2 = (g._fortune && g._fortune.years>0) ? g._fortune.mult : 1; // 气运眷顾（命格已并入下方加算链）
  // 全加算链（与 cultBase 一致防漂移）
  const _add = (hasFate(g,'cult') ? 0.05 : 0) + ((g._fortune && g._fortune.years>0) ? g._fortune.mult - 1 : 0) + lunhuiVal('cultTop')*0.025 + (orgCultMult() - 1) + _dtmOf(g) + (gongfaCultMult() - 1) + gongfaAtlasCultMult() + (chaosJingOn(g) ? ((g.soul.quality==='shen'||g.soul.quality==='she') ? 0.15 : 0.05) : 0) + [0,0.10,0.20,0.35][g.caveLv||0];
  return Math.max(0, 1 + _add);
}
// 修炼衰减链（QUAL_DECAY/qDecay/ageMult/linggenCap/linggenDecay/levelMult）已整体删除——
// 修为体系重构为"纯自然限制"：境界跨度由区间表（B_i=10×5^(i-1)）与境界系数自然决定，寿元独立构成瓶颈，无任何软/硬修炼上限
function atGate(){
  const g=G;
  const _t = tierOf(); // 境界序号=应有道胎数（炼气1…大乘8）；巅满挂起 tierOf 修正为当前境，不越级判下一境关口
  for(let i=0;i<_t;i++){ if(g.realm >= i+1 && g.rings.length <= i) return true; }
  return false;
}
/* 属性成长倾向：按灵根属性累加 */
function trendGrow(coef){
  const g=G, t = TREND[g.soul.cat]||{};
  Object.keys(t).forEach(k=>{ g.a[k] += t[k]*coef; });
}

/* 大境界突破（修仙版）：每处大境界关口（修为值门槛）修为到位即触发破境天劫（见 realmBreakCheck），
   渡劫成功凝道胎自然突破大境界——晋入新境界 + 随境界递增的战斗四维增幅仪式日志。 */
const BREAK_TEXT = [
  '体魄圆满，引气入体，跨入炼气之境！',
  '气凝丹田，筑就道基，晋入筑基之境！',
  '丹火初燃，凝结金丹，踏入金丹之境！',
  '金丹裂变，元婴初成，晋升元婴之境！',
  '元婴归神，神识通玄，成就化神之境！',
  '神返虚无，炼虚合道，晋入炼虚之境！',
  '虚合于体，法相天地，踏入合体之境！',
  '身合大道，登临大乘，晋位大乘之境！',
  '道行圆满，天劫将临，踏入渡劫之境，名震九州！'
];
/* 修仙版：破境天劫（大境界突破 = 渡劫，取代原"猎妖晋境"）——修为抵达关口触发破境天劫：
   成功率 = 基础（随境界递减）+ 气运修正 + 功德业力修正 + 轮回殿天劫庇护；
   成功凝道胎晋境；失败修为倒退、经脉受损，元婴及以上再折寿元。 */
function realmBreakCheck(g, idx){
  // 4.229：超大函数拆分——心魔劫（前置）与破境天劫（主判定）拆 2 子函数，返回语义零变化
  const _xmBonus = realmXinmo(g, idx); // 心魔劫——false=劫失败已处理；0=未触发；0.05=勘破成功（本次破境+5%）
  if(_xmBonus === false) return false;
  return realmTianjie(g, idx, _xmBonus);
}
function realmXinmo(g, idx){ // 心魔劫——大境界突破前置劫（功德护道削弱心魔，业力养魔增强心魔）；返回 false=劫失败已处理 / 0=未触发 / 0.05=勘破成功
  // 心魔劫——大境界突破前置劫（功德护道削弱心魔，业力养魔增强心魔）
  let _xmBonus = 0;
  const _gd = Math.max(0, (g.功德||0) - (g.业力||0));
  const _ye = Math.max(0, (g.业力||0) - (g.功德||0));
  const _trig = Math.max(0.05, Math.min(0.35, 0.12 + Math.floor(_ye/500)*0.05 - Math.floor(_gd/1000)*0.05 + ((g.daoXin||50)>=80 ? -0.05 : (g.daoXin||50)<=20 ? 0.05 : 0))); // 道心坚固（≥80）触发−5% / 道心蒙尘（≤20）触发+5%
  if(Math.random() < _trig){
    const _rate = Math.min(0.83, Math.max(0.40, Math.min(0.80, 0.70 + Math.floor(_gd/500)*0.05 - Math.floor(_ye/250)*0.05 + ((g.daoXin||50)-50)*0.001)) + (g.spouse && (g.bond||0)>=80 ? 0.03 : 0)); // 道心修正（±5% 满格，40~83% clamp 内） // 4.168：羁绊≥80 道侣护道，心魔劫成功率+3%（clamp 外，恒定生效）
    if(Math.random() < _rate){
      _xmBonus = 0.05;
      let _wv = gainWu(2); g.a.悟性 = (g.a.悟性||0) + _wv;
      g.a.神识 = (g.a.神识||0) + 3;
      g.a.气运 = (g.a.气运||0) + 2;
      g.daoXin = Math.min(100, (g.daoXin||50) + 3); // 勘破心魔，道心+3
      addLog('—— <b>心魔劫</b>：业障化形、心魔来袭，你道心通明、勘破虚妄，道心精进（悟性+2、神识+3、气运+2、道心+3，本次破境成功率+5%）！——','good');
      return _xmBonus;
    } else {
      const _lp2 = [1,5,10,30,80,150,300,500][idx] || 500;
      g.subRealm = 1; g.realmPos = subSegLen(g, 1);  // realmPos 版（境界不变，退 1 小境到中期）
      g._lifeCut = (isFinite(g._lifeCut)?g._lifeCut:0) + _lp2;
      g.lifeCap = lifeCapOf();
      if(Math.random() < 0.03){
        addLog('—— <b>心魔劫</b>：业障缠身、心魔反噬，你走火入魔、神魂俱灭，<b>身死道消</b>！——','bad');
        die('走火入魔，心魔噬体而亡');
        return false;
      }
      g.daoXin = Math.max(0, (g.daoXin||50) - 4); // 心魔入体，道心−4
      addLog('—— <b>心魔劫</b>：心魔化形侵蚀道心，你道心失守、走火入魔——修为倒退、经脉受损，寿元折损 '+_lp2+' 年，境界止步于此（道心−4）。——','bad');
      return false;
    }
  }
  return 0;
}
function realmTianjie(g, idx, _xmBonus){ // 破境天劫——主判定；返回 true=渡劫成功 / false=失败（死亡或退境已处理）
  const _ch = rtChance(g, idx, _xmBonus); // 4.254：成功率构成抽子函数（clamp 后）
  const p = _ch.p;
  const _s4 = _ch.s4, _base4 = _ch.base4;
  const _jn = rtJname(idx, g); // 4.254：天劫名称/失败参数抽子函数
  const _jname = _jn.jname, _dp = _jn.dp, _lp = _jn.lp;
  addLog('—— <b>破境天劫</b>：'+_jname+'降临（成功率 '+Math.round(p*100)+'%，失败退1小境、折寿'+_lp+'年'+( _dp>0 ? ('、死亡'+(_dp*100)+'%') : '')+'）——','sys'); // 突破成功率透明化
  if(Math.random() < p){
    if(g._breakBuff>0){ g._breakBuff -= 1; addLog('突破丹之力护持道基，天劫威能大减！','good'); }
    addLog(`—— <b>破境天劫</b>：${_jname}降临，你以${g.soul?g.soul.name:'凡躯'}硬撼天威，渡劫成功，境界升华！——`,'good');
    g.daoXin = Math.min(100, (g.daoXin||50) + 2); // 历劫明心，道心+2
    if(!g.realmAges) g.realmAges = [];
    if(!g.realmAges[idx+1]) g.realmAges[idx+1] = g.age; // 记录大境界突破年龄（传记·境界历程）
    return true;
  }
  // /4.115：突破失败小概率死亡（按品质分层，最高 5%：低品质高危、高品质近乎无死）
  if(Math.random() < _dp){
    addLog(`—— <b>破境天劫</b>：${_jname}降临，你根基崩碎、神魂俱灭，<b>身死道消</b>！——`,'bad');
    die('破境天劫失败，根基崩碎，身死道消');
    return false;
  }
  g.subRealm = 1; g.realmPos = subSegLen(g, 1);    // 破境失败统一退 1 小境（realm 不变）（退至后段起点，修为清零重攒）
  // 四维根基护道——失败反噬减免（达基准不减免，四维翻倍减25%、三倍减50%，上限50%）
  const _mit = Math.max(0, Math.min(0.5, (_s4/_base4 - 1) * 0.5));
  g.a.气血 = Math.max(1, (g.a.气血||0) - Math.round((4 + idx*1.5) * (1 - _mit)));
  g._lifeCut = (isFinite(g._lifeCut)?g._lifeCut:0) + Math.round(_lp * (1 - _mit)); // 持久化到 _lifeCut，由 lifeCapOf 统一结算（含 80% 保底 clamp）
  g.lifeCap = lifeCapOf();
  g.daoXin = Math.max(0, (g.daoXin||50) - 2); // 道途受挫，道心−2
  addLog(`—— <b>破境天劫</b>：${_jname}降临，你终究未能渡过——修为倒退、经脉受损，寿元折损 ${Math.round(_lp*(1-_mit))} 年${_mit>0?('（根基浑厚，反噬减免'+(Math.round(_mit*100))+'%）'):''}，境界止步于此（道心−2）。——`,'bad');
  return false;
}
function rtChance(g, idx, _xmBonus){ // 破境天劫成功率构成——基础档/气运/功德业力/神感/命格/灵根品质/道心/法则/突破丹/伤势/洞府/四维根基，clamp 5%~95%
  const _base = [0.85,0.80,0.75,0.70,0.65,0.60,0.55,0.50][idx] || 0.45;
  let p = _base + (g.a.气运-50)*0.002 + _xmBonus;
  p += Math.max(-0.10, Math.min(0.10, ((g.功德||0)-(g.业力||0))*0.01));
  p += (META.lunhui&&META.lunhui.shenGan||0)*0.001;
  p += (hasFate(g,'jieti')?0.05:0); // 命格·道基稳固：破境天劫成功率+5%
  // 灵根品质影响基础突破成功率——品质越低越难（过程性天堑，配合寿元构成「来不及突破就寿尽」）
  const _qq = (g.soul && g.soul.quality) || 'fei';
  p += BRK_QMOD[_qq] || 0; // 品质修正加减上限 ±15%（等比 ×0.5 收敛）
  p += (g.daoXin||50) >= 90 ? 0.02 : (g.daoXin||50) <= 10 ? -0.02 : 0; // 道心通明（≥90）破境+2% / 道心蒙尘（≤10）−2%
  p += lawForce(g) * 0.02; // 法则之力——每道破境天劫+2%
  p += (g._breakBuff>0 ? 0.10 : 0); // 突破丹——大境界破境天劫成功率+10%
  p += ((G.wound||0) >= 3 ? -0.10 : 0); // 濒危体虚，破境成功率-10%
  p += (g.caveLv>=1 ? [0,0.02,0.04,0.06][g.caveLv] : 0); // 洞府灵气护道——破境天劫+2/4/6%
  // 四维根基修正（A方案）——四维总和相对境界基准（炼气60→大乘480），达基准0修正、翻倍+4%（上限+6%）、六成-2.4%（下限-2.4%）
  const _e4 = effAttrs(); // 破境根基按战斗四维终值
  const _s4 = (_e4.力量||0)+(_e4.灵动||0)+(_e4.气血||0)+(_e4.神识||0);
  const _base4 = (idx+1)*60;
  const _s4r = Math.max(-0.6, Math.min(1.5, _s4/_base4 - 1)) * 0.04;
  p += _s4r;
  p = Math.max(0.05, Math.min(0.95, p));
  return {p: p, s4: _s4, base4: _base4};
}
function rtJname(idx, g){ // 天劫名称与失败参数——大乘→渡劫的飞升之劫专名（其余 X天劫）；失败死亡概率/折寿梯度
  const nextName = TIER_NAMES[Math.min(idx+1,9)] || '新境'; // 修复大乘档误显示"大乘→大乘"（应显示渡劫）
  const _jname = idx === 8 ? '飞升之劫' : (nextName + '天劫'); // 大乘→渡劫的飞升之劫专名（其余 X天劫）
  const _qq = (g && g.soul && g.soul.quality) || 'fei';
  const _dp = (BRK_DP[_qq] || 0.05); // 失败死亡概率（提示用）
  const _lp = [1,5,10,30,80,150,300,500][idx] || 500; // 失败折寿梯度（提示用）
  return {jname: _jname, dp: _dp, lp: _lp};
}
function startYear(){
  if(__NORENDER) return; // 渲染开关
  const g=G;
  if(g.spouse && g.bond===undefined) g.bond=30; // 旧档道侣补初始羁绊
  if(!g.kids) g.kids=[]; // 旧档子嗣个体兜底
  if(!g.enemies) g.enemies=[]; // 旧档仇敌兜底
  // 寿元将尽提示
  const cap = lifeCapOf();
  if(cap - g.age < 10){ addLog(`<b>你的寿元已所剩无几（${cap-g.age} 年）</b>，若不能在寿尽前突破更高境界，此生便到此为止。`, 'bad'); }
  // 修仙版：破境自动凝胎——年初若已越过未凝关口（正常修炼动作会即时凝成，此处防御事件加级/存档穿越）
  if(atGate() && g.rings.length < 8){
    if(!(g.soul && g.soul.quality==='fei')){
      const _need = Math.min(8, tierOf()); // 境界序号=应有道胎数（炼气1…大乘8），去掉 4.205g 的 +1 修正——筑基巅满不再凝金丹道胎，炼虚巅满不再凝合体道胎
      for(let _ni=0;_ni<_need;_ni++){ if(g.realm >= _ni+1 && g.rings.length <= _ni){ condenseDaotai(_ni); break; } }
    }
  }
  // 修仙版：神位感应/神位继承已移除（无神位体系）；渡劫与散仙在 endYear 年度推进中自动判定
  // 修仙版：渡劫圆满由 endYear 渡劫系统判定（第 9 劫成功即 ascend 真仙），此处不再走神考直升
  // 一次性提示标志——游戏无读档续玩功能，无需持久化（审查项非缺陷）
  // （通查修复）：改用独立标志 _shenkaoNotified 记录"已提示"，勿复用 _shenDone——
  // _shenDone 语义为"渡劫失败、仙途断绝"；改用 _shenkaoNotified 记录"已提示"，勿复用 _shenDone
  if(g.shenkaoDone && g.realm<10 && !g._shenkaoNotified){
    g._shenkaoNotified = true;
    addLog('你已具备飞升之资——九劫尽渡，只待渡尽九劫、臻至渡劫圆满，便可一举飞升成仙。','good');
  }
  renderActions();
  // 修仙版：神考/神位体系已移除（无神位）；渡劫与散仙在年度推进中自动判定
  // 修仙版：自创神位已移除（无神位体系）
}
function lifeCapOf(){
  const g=G;
  // 散仙：败劫重伤，寿元锁定（败劫时设定 6-9 年），不再随等级重算
  if(g._sanxian){ return g.lifeCap || (g.age + 10); }
  const t = tierOf();
  //  寿命表：炼体100/炼气150/筑基200/金丹500/元婴1000/化神2000/炼虚4000/合体7000/大乘12000/渡劫12000/真仙99999
  // 每境固定寿元（无境界内微增）——寿元独立构成"来不及突破就寿尽"的自然瓶颈
  let base;
  if(t === 11){ base = 99999; }                                  // 真仙：与天同寿
  else if(t === 10 || t === 9){ base = 12000; }                  // 渡劫期维持大乘寿元（修为固定）
  else {
    const CAP = [100,150,200,500,1000,2000,4000,7000,12000,12000];
    base = CAP[t] || 100;
  }
  base += lunhuiVal('life');                                     // 轮回殿寿元加点
  g._lifeBase = Math.round(base);
  // 飞升/渡劫失败削减（_lifeCut）为持久惩罚，档位重算不覆盖
  const _lb = isFinite(g._lifeBase) ? g._lifeBase : 0;
  let _lc = isFinite(g._lifeCut) ? g._lifeCut : 0;
  if(_lb > 0) _lc = Math.min(_lc, Math.max(0, _lb * 0.8)); // 渡劫失败削减上限（最多削 80% 基准，防多次失败压死寿元）
  const _lbonus = isFinite(g._lifeBonus) ? g._lifeBonus : 0; // 灵根升华持久寿元加成
  const _artLife = (g._artBonus && g._artBonus.寿元) || 0; // 天级功法寿元加成（装备生效）
  const _kidCost = isFinite(g._kidDeduct) ? g._kidDeduct : 0; // 传道折寿（持久，档位重算不覆盖）
  g.lifeCap = Math.max(1, Math.min(99999, Math.round((_lb || g.lifeCap || 0) + _lbonus + _artLife - _lc - _kidCost)));
  return g.lifeCap;
}

/* ============ 行动 ============ */
/* 灵宝（DL_RS_4.42）：灵石后期出口——一次性购买永久属性微增，可购多个 */
const ARTIFACTS = [
  {id:'ling', name:'灵犀玉佩', price:500,  eff:{气血:3, 悟性:1}, desc:'温养神魂，体魄渐凝'},
  {id:'li',   name:'玄铁护腕', price:800,  eff:{力量:3},         desc:'淬炼筋骨，臂力渐长'},
  {id:'min',  name:'追风靴',   price:900,  eff:{灵动:3, 气血:1}, desc:'轻若无物，身法更捷'},
  {id:'jing', name:'蕴神珠',   price:1200, eff:{神识:3, 悟性:1}, desc:'凝神静气，神识凝练'},
  {id:'sui',  name:'千年灵髓', price:2000, eff:{气血:5, 力量:2}, desc:'伐骨洗髓，肉身脱胎换骨'},
  {id:'feng', name:'御风行云', price:2600, eff:{灵动:5, 神识:1}, desc:'乘风御云，身法灵动，神识微明'},
  {id:'tian', name:'气运罗盘', price:3000, eff:{气运:3, 悟性:2}, desc:'窥探天机一线，气运微增'}
];
function toggleCang(){
  const p=$('cangPanel'); if(!p) return;
  if(p.style.display !== 'none'){ p.style.display='none'; return; }
  renderCang(); p.style.display='block';
}
/* 藏经阁——本势力功法/神通列表（贡献兑换；入宗免费择一）+ 功法神通装备 + 宗门任职 */
function renderCang(){
  const g=G;
  const p=$('cangPanel'); if(!p) return;
  if(!g.org){ p.innerHTML='<div class="muted">无门无派，藏经阁无处可寻。</div>'; return; }
  const gfList = Object.keys(GONGFAS).filter(id=>GONGFAS[id].org===g.org);
  const stList = Object.keys(SHENTONGS).filter(id=>SHENTONGS[id].org===g.org);
  const gx = g.gongxian||0;
  const eq = g.gongfa||{main:null, sub:null};
  // 4.223：超大函数拆分——按藏经阁区块抽子函数（各区块返回 html 片段，渲染结果零变化）
  let h = `<div style="border:1px solid var(--line);border-radius:8px;padding:8px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px"><div style="color:var(--gold);font-weight:700">藏经阁 · ${escapeHtml(g.org)}</div><button class="btn mini" title="关闭藏经阁" onclick="toggleCang()">✕ 关闭</button></div>
    <div class="muted" style="font-size:11px;margin-bottom:6px">宗门贡献 <b style="color:var(--gold)">${gx}</b>${g.post?(' · 职务 <b>'+g.post+'</b>（每年 +'+POST_SALARY[g.post]+' 贡献）'):''}${!g._freeArtDone?' · <b style="color:#7ecb7e">入宗可免费择一</b>':''}</div>`;
  h += renderCangGongfa(g, gfList, eq, gx);  // 功法区（主修 100% / 辅修 50%）
  h += renderCangShentong(g, stList, gx);    // 神通区（最多 6 门）
  h += renderCangPost(g);                // 任职区（化神 lv41+）
  h += renderCangDan(g, gx);                 // 丹药区（贡献兑换）
  p.innerHTML = h;
}
function renderCangGongfa(g, gfList, eq, gx){ // 功法区——未习得兑换/免费习得，已习得装备主修/辅修
  let h = '<div style="font-size:12px;color:var(--dim);margin-top:4px">—— 功法（主修 100% / 辅修 50%）——</div>';
  gfList.forEach(id=>{
    const f=GONGFAS[id];
    const owned = ownGongfa(id);
    const isMain = eq.main===id, isSub = eq.sub===id;
    const effTxt = Object.keys(f.eff).map(k=>k==='cult'?('修炼+'+Math.round(f.eff[k]*100)+'%'):(k+'成长+'+Math.round(f.eff[k]*100)+'%')).join('、');
    h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 2px;border-bottom:1px dashed #3a3a44">
      <div><b style="color:${ART_TIER_COLOR[artTierName(id, GONGFAS)]}">${id}</b><span class="muted" style="font-size:10px"> · ${artTierName(id, GONGFAS)}</span>${artAttrHtml(id, GONGFAS)} <span class="muted" style="font-size:11px">${f.desc}</span></div>`;
    if(!owned){
      h += `<button class="btn mini" ${gx<gongfaCost(id) && g._freeArtDone?'disabled':''} onclick="buyCang('${id}','gongfa')">${!g._freeArtDone?'免费习得':'兑换 '+gongfaCost(id)+' 贡献'}</button>`;
    } else {
      h += `<div style="display:flex;gap:4px">
        <button class="btn mini ${isMain?'auto-on':''}" onclick="equipGongfa('${id}','main')">${isMain?'主修 ✓':'主修'}</button>
        <button class="btn mini ${isSub?'auto-on':''}" onclick="equipGongfa('${id}','sub')">${isSub?'辅修 ✓':'辅修'}</button>
      </div>`;
    }
    h += '</div>';
  });
  return h;
}
function renderCangShentong(g, stList, gx){ // 神通区——未习得兑换/免费习得，已习得装备（最多 6 门）
  let h = '<div style="font-size:12px;color:var(--dim);margin-top:6px">—— 神通（最多 6 门）——</div>';
  stList.forEach(id=>{
    const st=SHENTONGS[id];
    const owned = ownShentong(id);
    const on = (g.shentong||[]).indexOf(id)>=0;
    const effTxt = Object.keys(st.eff).map(k=>k+'+'+Math.round(st.eff[k]*100)+'%').join('、');
    h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 2px;border-bottom:1px dashed #3a3a44">
      <div><b style="color:${ART_TIER_COLOR[artTierName(id, SHENTONGS)]}">${id}</b><span class="muted" style="font-size:10px"> · ${artTierName(id, SHENTONGS)}</span>${artAttrHtml(id, SHENTONGS)} <span class="muted" style="font-size:11px">${st.desc}</span></div>`;
    if(!owned){
      h += `<button class="btn mini" ${gx<shentongCost(id) && g._freeArtDone?'disabled':''} onclick="buyCang('${id}','shentong')">${!g._freeArtDone?'免费习得':'兑换 '+shentongCost(id)+' 贡献'}</button>`;
    } else {
      h += `<button class="btn mini ${on?'auto-on':''}" onclick="equipShentong('${id}')">${on?'装备中 ✓':(g.shentong||[]).length>=6?'位满':'装备'}</button>`;
    }
    h += '</div>';
  });
  return h;
}
function renderCangPost(g){ // 任职区（化神 lv41+）——按境界任职 · 年领贡献/俸禄
  let h = '<div style="font-size:12px;color:var(--dim);margin-top:6px">—— 宗门任职（按境界任职 · 年领贡献/俸禄）——</div>';
  ['外门','内门','真传','堂主','护法','长老','掌门'].forEach(pst=>{
    const on = g.post===pst;
    const locked = !reqLvPass(g, POST_REQ[pst]);
    const _tip = pst+'：年贡献+'+POST_SALARY[pst]+'、俸禄灵石+'+POST_PAY[pst]+(POST_CULT[pst]?('、修炼+'+Math.round(POST_CULT[pst]*100)+'%'):'')+(locked?('（需'+postReqName(pst)+'期）'):'');
    h += '<button class="btn mini '+(on?'auto-on':'')+'" '+(locked?'disabled':'')+' title="'+_tip+'" onclick="setPost(\''+pst+'\')">'+pst+(on?' ✓':(locked?('·'+postReqName(pst)):''))+'</button> ';
  });
  return h;
}
function renderCangDan(g, gx){ // 丹药区（DL_RS_4.165：贡献兑换丹药——修为外的属性出口）
  let h = '<div style="font-size:12px;color:var(--dim);margin-top:6px">—— 丹药（贡献兑换）——</div>';
  h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 2px;border-bottom:1px dashed #3a3a44">
      <div><b style="color:#d9a05b">悟性丹</b><span class="muted" style="font-size:11px"> 悟性 +3（感悟更快）</span></div>
      <button class="btn mini" ${gx<300?'disabled':''} onclick="buyDan('wu')">300 贡献</button></div>`;
  h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 2px;border-bottom:1px dashed #3a3a44">
      <div><b style="color:#d9a05b">淬体丹</b><span class="muted" style="font-size:11px"> 气血 +3（根骨更坚）</span></div>
      <button class="btn mini" ${gx<300?'disabled':''} onclick="buyDan('qi')">300 贡献</button></div>`;
  h += '<div class="muted" style="font-size:11px;margin-top:4px">贡献途径：宗门任务事件 · 论道大会 · 上缴妖兽材料 · 宗门任职。</div>';
  return h;
}

/* 藏经阁丹药兑换——贡献换属性（修为外出口） */
function buyDan(which){
  const g=G, cost=300;
  if((g.gongxian||0) < cost){ showToast('贡献不足（需 '+cost+'）','#c0392b'); return; }
  g.gongxian -= cost;
  if(which==='wu'){ const v=gainWu(3); g.a.悟性 += v; addLog('服下悟性丹，悟性 +'+v+'。','good'); showToast('悟性 +'+v,'#7ecb7e'); }
  else { g.a.气血 += 3; addLog('服下淬体丹，气血 +3。','good'); showToast('气血 +3','#7ecb7e'); }
  renderCang();
}

function toggleShop(){
  const p=$('shopPanel'); if(!p) return;
  if(p.style.display !== 'none'){ p.style.display='none'; return; }
  renderShop(); p.style.display='block';
}
// 购置洞府（逐级购买；闭关修为/破境加成，见 cultBase/realmBreakCheck）
function buyCave(id){
  const g=G;
  const CAVES = {1:{name:'灵泉洞府',price:1500}, 2:{name:'地脉洞府',price:6000}, 3:{name:'九天仙府',price:25000}};
  const c = CAVES[id];
  if(!c) return;
  if((g.caveLv||0) >= id){ addLog('你已拥有'+c.name+'。','sys'); renderShop(); return; }
  if(id !== ((g.caveLv||0)+1)){ addLog('洞府需逐级购置。','note'); renderShop(); return; }
  if(g.money < c.price){ addLog('灵石不足（需 '+c.price+'，现有 '+Math.floor(g.money)+'）。','bad'); renderShop(); return; }
  g.money -= c.price;
  g.caveLv = id;
  addLog(`<b>万宝楼：</b>你购得${c.name}（${c.price} 灵石）——灵气汇聚，此后闭关修炼事半功倍。`,'good');
  renderShop(); renderGame();
}

function renderShop(){
  const g=G;
  const owned = g.artifacts||{};
  // 4.220：超大函数拆分——按坊市区块抽子函数（各区块返回 html 片段，渲染结果零变化）
  let html = '<div style="border:1px solid var(--line);border-radius:8px;padding:8px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><div style="color:var(--gold);font-weight:700">万宝楼 · 灵石 '+Math.floor(g.money)+'</div><button class="btn mini" title="关闭万宝楼" onclick="toggleShop()">✕ 关闭</button></div>';
  html += renderShopGrocer(g);          // 坊市杂货——丹药/妖丹/法宝
  html += renderShopDanfang(g);         // 炼丹区
  html += renderShopCave(g);            // 洞府
  html += renderShopArtifacts(g, owned);// 灵宝
  html += renderShopGongfa(g);          // 坊市功法
  html += renderShopShentong(g);        // 坊市神通
  html += renderShopRefine(g);          // 炼器阁重铸
  html += '<div class="muted" style="font-size:11px;margin-top:4px">灵宝可重复购买、永久生效，价格随次数递增（每次 +50%）——后期灵石的主要出口。</div></div>';
  $('shopPanel').innerHTML = html;
}
function renderShopGrocer(g){ // 坊市杂货——丹药/妖丹/法宝（灵石出口扩展）
  // 4.278：超大函数拆分——商品行生成抽子函数
  let html = '<div style="font-size:12px;color:var(--gold);margin:8px 0 2px">—— 万宝楼杂货 ——</div>';
  html += rsgRow(g, '回气丹', '#d9a05b', '气血 +8', 60, "buyDanShop('hui')");
  html += rsgRow(g, '疗伤丹', '#e07777', '伤势-1', 80, "buyDanShop('liao')");
  html += rsgRow(g, '凝神丹', '#d9a05b', '悟性 +2（感悟更快）', 120, "buyDanShop('ning')");
  html += rsgRow(g, '妖兽材料', '#a5b8ff', '妖丹/兽骨（上缴宗门或日后炼丹）', 30, 'buyMatShop()');
  html += rsgRow(g, '凡器法宝', '#8bc8ea', '炼气可炼化 · 随机部位', 300, "buyBoneShop('凡器')");
  html += rsgRow(g, '灵器法宝', '#a5b8ff', '筑基可炼化 · 随机部位', 1000, "buyBoneShop('灵器')");
  return html;
}
function rsgRow(g, name, color, desc, price, onclick){ // 杂货单商品行——名称/描述/购买按钮（灵石不足禁用）
  return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 2px;border-bottom:1px dashed #3a3a44">'
    + '<div><b style="color:'+color+'">'+name+'</b> <span class="muted" style="font-size:11px">'+desc+'</span></div>'
    + '<button class="btn mini" '+(g.money<price?'disabled':'')+' onclick="'+onclick+'">'+price+' 灵石</button></div>';
}
function renderShopDanfang(g){ // 炼丹区——妖材×灵草 → 丹药
  let html = '<div style="font-size:12px;color:var(--gold);margin:8px 0 2px">—— 炼丹（妖材×'+(g.materials||0)+' · 灵草×'+(g.herbs||0)+'） ——</div>';
  Object.keys(DANFANGS).forEach(function(id){
    const df = DANFANGS[id];
    const owned = (g.danfangOwned||[]).indexOf(id)>=0;
    const en = owned && (g.materials||0)>=df.mat && (g.herbs||0)>=df.herb;
    const pct = Math.min(95, Math.round((df.p + Math.min(0.10,(g.a.悟性||0)*0.001) + Math.min(0.10, g.realm*0.02))*100));
    if(owned){
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 2px;border-bottom:1px dashed #3a3a44">'
        + '<div><b style="color:#d9a05b">'+df.name+'</b> <span class="muted" style="font-size:11px">妖材×'+df.mat+' 灵草×'+df.herb+' · '+df.eff+' · 成功率'+pct+'%</span></div>'
        + '<button class="btn mini" '+(en?'':'disabled')+' onclick="lianDan(\''+id+'\')">炼制</button></div>';
    } else {
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 2px;border-bottom:1px dashed #3a3a44">'
        + '<div><b style="color:#7a7a8a">'+df.name+'</b> <span class="muted" style="font-size:11px">丹方未得 · '+df.eff+'</span></div>'
        + '<button class="btn mini" '+(g.money<df.buy?'disabled':'')+' onclick="buyDanfang(\''+id+'\')">'+df.buy+' 灵石购方</button></div>';
    }
  });
  return html;
}
function renderShopCave(g){ // 洞府——灵气加成（闭关修为+突破护道）
  let html = '<div style="font-size:12px;color:var(--gold);margin:8px 0 2px">—— 洞府（当前：'+['无','灵泉','地脉','九天仙府'][g.caveLv||0]+'） ——</div>';
  const CAVES = [
    {id:1, name:'灵泉洞府', price:1500, txt:'闭关修为+10% · 破境+2%'},
    {id:2, name:'地脉洞府', price:6000, txt:'闭关修为+20% · 破境+4%'},
    {id:3, name:'九天仙府', price:25000, txt:'闭关修为+35% · 破境+6%'}
  ];
  CAVES.forEach(c=>{
    const _own = (g.caveLv||0) >= c.id;
    html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 2px;border-bottom:1px dashed #3a3a44">'
      + '<div><b style="color:'+(c.id===3?'#ffd700':c.id===2?'#c39bd3':'#8bc8ea')+'">'+c.name+'</b> <span class="muted" style="font-size:11px">'+c.txt+'</span></div>'
      + '<button class="btn mini" '+(_own||g.money<c.price?'disabled':'')+' onclick="buyCave('+c.id+')">'+(_own?'已拥有':c.price+' 灵石')+'</button></div>';
  });
  return html;
}
function renderShopArtifacts(g, owned){ // 灵宝——可重复购买、永久生效、价格随次数递增
  let html = '';
  ARTIFACTS.forEach(a=>{
    const n = owned[a.id]||0;
    const price = Math.round(a.price * (1 + 0.5*n));
    html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 2px;border-bottom:1px dashed #3a3a44">
      <div><b>${a.name}</b> <span class="muted" style="font-size:11px">${a.desc}</span><br>
      <span style="font-size:11px;color:var(--gold)">${Object.keys(a.eff).map(k=>k+'+'+a.eff[k]).join(' / ')}</span></div>
      <button class="btn mini" ${g.money<price?'disabled':''} onclick="buyArtifact('${a.id}')">${n>0?('已购'+n+' · '):''}${price} 灵石</button></div>`;
  });
  return html;
}
function renderShopGongfa(g){ // 坊市出售功法（散修大众，灵石购买，一次习得）
  let html = '';
  const gfShop = Object.keys(GONGFAS).filter(id=>GONGFAS[id].org==='坊市');
  if(gfShop.length){
    html += '<div style="font-size:12px;color:var(--gold);margin:8px 0 2px">—— 功法（修炼增益，购得后可装备主修/辅修）——</div>';
    gfShop.forEach(id=>{
      const f=GONGFAS[id];
      const own = (g.gongfaOwned||[]).indexOf(id)>=0;
      html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 2px;border-bottom:1px dashed #3a3a44">
        <div><b style="color:${ART_TIER_COLOR[artTierName(id, GONGFAS)]}">${id}</b><span class="muted" style="font-size:10px"> · ${artTierName(id, GONGFAS)}</span> <span class="muted" style="font-size:11px">${f.desc}</span></div>
        <button class="btn mini" ${own||g.money<200?'disabled':''} onclick="buyGongfaShop('${id}')">${own?'已习得':200+' 灵石'}</button></div>`;
    });
  }
  return html;
}
function renderShopShentong(g){ // 坊市出售神通（战斗增益，购得后可装备）
  let html = '';
  const stShop = Object.keys(SHENTONGS).filter(id=>SHENTONGS[id].org==='坊市');
  if(stShop.length){
    html += '<div style="font-size:12px;color:var(--gold);margin:8px 0 2px">—— 神通（战斗增益，购得后可装备）——</div>';
    stShop.forEach(id=>{
      const st=SHENTONGS[id];
      const own = (g.shentongOwned||[]).indexOf(id)>=0;
      html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 2px;border-bottom:1px dashed #3a3a44">
        <div><b style="color:${ART_TIER_COLOR[artTierName(id, SHENTONGS)]}">${id}</b><span class="muted" style="font-size:10px"> · ${artTierName(id, SHENTONGS)}</span> <span class="muted" style="font-size:11px">${st.desc}</span></div>
        <button class="btn mini" ${own||g.money<150?'disabled':''} onclick="buyShentongShop('${id}')">${own?'已习得':150+' 灵石'}</button></div>`;
    });
  }
  return html;
}
function renderShopRefine(g){ // 4.167 炼器阁：法宝重铸（凡器→灵器→宝器；仙器不可重铸）
  let html = '';
  const _bones = g.bones||[];
  const _ref = _bones.filter(b=>b && b.grade!=='仙器');
  if(_ref.length){
    html += '<div style="font-size:12px;color:var(--gold);margin:8px 0 2px">—— 炼器阁（法宝重铸）——</div>';
    _ref.forEach(b=>{
      const _fee = b.grade==='凡器' ? 300 : b.grade==='灵器' ? 1500 : 8000;
      const _mat = b.grade==='凡器' ? 2 : b.grade==='灵器' ? 4 : 8;
      const _succ = b.grade==='凡器' ? 0.70 : b.grade==='灵器' ? 0.50 : 0.30;
      const _tgt = b.grade==='凡器' ? '灵器' : b.grade==='灵器' ? '宝器' : '仙器';
      const _reqLv = _tgt==='仙器' ? 8 : _tgt==='宝器' ? 4 : 2; // realm 境界门槛
      const _reqRing = _tgt==='仙器' ? 8 : _tgt==='宝器' ? 4 : 1;
      const _pityTxt = (_tgt==='仙器' && (g._refinePity||0) > 0) ? ('<span style="color:#e0763a"> · 保底 '+(g._refinePity||0)+'/5</span>') : '';
      const _can = g.money>=_fee && (g.materials||0)>=_mat && g.realm>=_reqLv && (g.rings||[]).length>=_reqRing;
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 2px;border-bottom:1px dashed #3a3a44">'
        + '<div><b>'+b.name+'</b><span class="muted" style="font-size:10px"> · '+b.grade+'（'+b.main+'+'+b.pct+'%）→ '+_tgt+'</span>'+_pityTxt+'</div>'
        + '<button class="btn mini" '+(_can?'':'disabled')+' data-id="'+b.id+'" onclick="reforgeBone(this.dataset.id)">'+_fee+' 灵石+'+_mat+'材 · '+Math.round(_succ*100)+'%</button></div>';
    });
    html += '<div class="muted" style="font-size:11px">重铸消耗妖兽材料，失败不退；凡→灵/灵→宝 失败 15% 法宝受损（凡器碎裂 / 灵器跌回凡器）；宝→仙 失败仅损材料，累计 5 次必成。本命法宝不参与重铸。</div>';
  }
  return html;
}
/* 坊市丹药购买——回气丹（气血+8）/ 凝神丹（悟性+2） */
function buyDanShop(which){
  const g=G;
  const pr = which==='hui' ? 60 : which==='ning' ? 120 : 80; // 疗伤丹 80 灵石
  if(g.money < pr){ addLog('灵石不足（需 '+pr+'）。','bad'); renderShop(); return; }
  g.money -= pr;
  if(which==='hui'){ g.a.气血 += 8; addLog('服下回气丹，气血 +8。','good'); }
  else if(which==='ning'){ const v=gainWu(2); g.a.悟性 += v; addLog('服下凝神丹，悟性 +'+v+'。','good'); }
  else { // 境界越高丹药效果越弱（1/2/3 颗疗伤丹-1）
    const _need = woundDanNeed();
    G._woundDan = (G._woundDan||0) + 1;
    if(G._woundDan >= _need){
      G._woundDan = 0;
      g.wound = Math.max(0,(g.wound||0)-1);
      addLog('服下疗伤丹，药力化开，伤势-1。','good');
    } else {
      addLog('服下疗伤丹，药力渐微（还需 '+( _need-G._woundDan)+' 颗方能见效）。','note');
    }
  } 
  renderShop(); renderGame();
}
/* 坊市购妖兽材料（30 灵石/枚） */
function buyMatShop(){
  const g=G;
  if(g.money < 30){ addLog('灵石不足（需 30）。','bad'); renderShop(); return; }
  g.money -= 30;
  g.materials = (g.materials||0) + 1;
  addLog('购得妖兽材料一枚（妖丹/兽骨），现持 '+g.materials+' 份。','good');
  renderShop(); renderGame();
}
/* 坊市购法宝（凡器 300 / 灵器 1000，复用 equipBone；修为不足自动退回灵石） */
function buyBoneShop(grade){
  const g=G;
  const fee = grade==='凡器' ? 300 : 1000;
  if(g.money < fee){ addLog('灵石不足（需 '+fee+'）。','bad'); renderShop(); return; }
  g.money -= fee;
  const info = equipBone(grade);
  if(!info){ g.money += fee; addLog('修为不足无法炼化，'+fee+' 灵石已退回。','bad'); }
  renderShop(); renderGame();
}
/* 丹方表——材料（妖兽材料×mat + 灵草×herb），成功率受悟性/境界修正（总上限95%） */
const DANFANGS = {
  hui:   {name:'回气丹', mat:1, herb:1, p:0.85, eff:'气血+8', buy:0},
  ning:  {name:'凝神丹', mat:1, herb:2, p:0.80, eff:'悟性+2', buy:0},
  cui:   {name:'淬体丹', mat:1, herb:2, p:0.80, eff:'气血+5', buy:0},
  tupo:  {name:'突破丹', mat:1, herb:3, p:0.70, eff:'下次大境界破境成功率+10%', buy:300},
  shou:  {name:'寿元丹', mat:2, herb:3, p:0.65, eff:'寿元+10', buy:500},
  qiyun: {name:'气运丹', mat:2, herb:4, p:0.60, eff:'气运+1', buy:800},
  liao: {name:'疗伤丹', mat:1, herb:1, p:0.85, eff:'伤势-1', buy:80}, // 疗伤丹——伤势-1
};
/* 炼丹——妖材+灵草 → 丹药（成功即服/入袋，失败损材料） */
function lianDan(id){
  const g=G, a=g.a, df = DANFANGS[id];
  if(!df) return;
  if((g.danfangOwned||[]).indexOf(id)<0){ addLog('尚未掌握此丹方。','bad'); renderShop(); return; }
  if((g.materials||0) < df.mat || (g.herbs||0) < df.herb){ addLog(`材料不足（需妖兽材料×${df.mat}、灵草×${df.herb}）。`,'bad'); renderShop(); return; }
  g.materials -= df.mat; g.herbs -= df.herb;
  // 成功率：基础 + 悟性修正（每10点+1%，上限+10%） + 境界修正（每大境界+2%，上限+10%），总上限 95%
  let p = df.p + Math.min(0.10, (a.悟性||0)*0.001) + Math.min(0.10, g.realm*0.02);
  p = Math.min(0.95, p);
  if(Math.random() < p){ g._danOk = (g._danOk||0) + 1; atlasGain('dans', id); // 4.314 成就计数：炼丹成功；4.322 丹药图鉴记录
    if(id==='hui'){ a.气血 += 8; addLog('炼丹成功！服下回气丹，气血+8。','good'); }
    else if(id==='ning'){ const v=gainWu(2); a.悟性 += v; addLog('炼丹成功！服下凝神丹，悟性+'+v+'。','good'); }
    else if(id==='cui'){ a.气血 += 5; addLog('炼丹成功！服下淬体丹，气血+5。','good'); }
    else if(id==='tupo'){ g._breakBuff = (g._breakBuff||0) + 1; addLog('炼丹成功！突破丹入手（下次小境界突破成功率+10%）。','good'); }
    else if(id==='shou'){ g._lifeBonus = (isFinite(g._lifeBonus)?g._lifeBonus:0) + 10; addLog('炼丹成功！服下寿元丹，寿元+10。','good'); }
    else if(id==='qiyun'){ a.气运 += 1; addLog('炼丹成功！服下气运丹，气运+1。','good'); } else if(id==='liao'){ // 境界越高丹药效果越弱（进度与坊市共算）
      const _need = woundDanNeed();
      G._woundDan = (G._woundDan||0) + 1;
      if(G._woundDan >= _need){
        G._woundDan = 0;
        g.wound = Math.max(0,(g.wound||0)-1);
        addLog('炼丹成功！服下疗伤丹，药力化开，伤势-1。','good');
      } else {
        addLog('炼丹成功！服下疗伤丹，药力渐微（还需 '+( _need-G._woundDan)+' 颗方能见效）。','note');
      }
    }
  } else {
    addLog(`炼丹失败……${df.name}的药材尽毁（材料已耗）。`,'bad');
  }
  renderShop(); renderGame();
}
/* 坊市购丹方（突破/寿元/气运丹方需灵石解锁） */
function buyDanfang(id){
  const g=G, df=DANFANGS[id];
  if(!df || !df.buy) return;
  if((g.danfangOwned||[]).indexOf(id)>=0){ addLog('你已掌握此丹方。','sys'); return; }
  if(g.money < df.buy){ addLog('灵石不足（需 '+df.buy+'）。','bad'); renderShop(); return; }
  g.money -= df.buy;
  g.danfangOwned = g.danfangOwned || [];
  g.danfangOwned.push(id);
  addLog(`购得「${df.name}」丹方（灵石-${df.buy}）。`,'good');
  renderShop(); renderGame();
}
function buyArtifact(id){
  const g=G;
  const a = ARTIFACTS.find(x=>x && x.id===id); if(!a) return;
  g.artifacts = g.artifacts||{};
  const n = g.artifacts[id]||0;                       // 已购次数
  const price = Math.round(a.price * (1 + 0.5*n));    // 价格随次数递增（每购一件 +50%）
  if(g.money < price){ addLog('灵石不足。','bad'); renderShop(); return; }
  g.money -= price;
  g.artifacts[id] = n + 1;
  Object.keys(a.eff).forEach(k=>{ g.a[k]+=a.eff[k]; });
  addLog(`<b>万宝楼：</b>你购得「${a.name}」第 ${n+1} 件（${price} 灵石），${Object.keys(a.eff).map(k=>k+'+'+a.eff[k]).join('、')}，永久生效。`,'good');
  renderShop(); renderGame();
}

/* 坊市购功法（200 灵石，一次习得） */
function buyGongfaShop(id){
  const g=G; const f=GONGFAS[id];
  if(!f || f.org!=='坊市') return;
  if((g.gongfaOwned||[]).indexOf(id)>=0){ addLog('已习得「'+id+'」。','sys'); return; }
  const price=200;
  if(g.money < price){ addLog('灵石不足（需 '+price+'，现有 '+Math.floor(g.money)+'）。','bad'); renderShop(); return; }
  g.money -= price;
  g.gongfaOwned = g.gongfaOwned||[]; g.gongfaOwned.push(id);
  atlasGain('gongfas', id); // 本局暂存，世末结算入图鉴
  addLog(`<b>万宝楼：</b>你购得功法「${id}」（${price} 灵石）——${f.desc}，可于右侧面板装备主修/辅修。`,'good');
  renderShop(); renderGame();
}
/* 坊市购神通（150 灵石，一次习得） */
function buyShentongShop(id){
  const g=G; const st=SHENTONGS[id];
  if(!st || st.org!=='坊市') return;
  if((g.shentongOwned||[]).indexOf(id)>=0){ addLog('已习得「'+id+'」。','sys'); return; }
  const price=150;
  if(g.money < price){ addLog('灵石不足（需 '+price+'，现有 '+Math.floor(g.money)+'）。','bad'); renderShop(); return; }
  g.money -= price;
  g.shentongOwned = g.shentongOwned||[]; g.shentongOwned.push(id);
  atlasGain('shentongs', id); // 本局暂存，世末结算入图鉴
  addLog(`<b>万宝楼：</b>你购得神通「${id}」（${price} 灵石）——${st.desc}，可于右侧面板装备。`,'good');
  renderShop(); renderGame();
}

function renderActions(){
  if(__NORENDER) return; // 渲染开关
  const g=G;
  const btns = $('actionBtns'); btns.innerHTML='';
  // 突破挂起 / 渡劫期 → 覆盖行动区（突破/渡劫按钮）
  if(g && g.alive){
    const _eb0=$('eventBox'); if(_eb0) _eb0.innerHTML='';
    if(g._breakPending !== undefined && g._breakPending !== null){ renderBreakOverlay(btns); return; }
    if(isDujieOf()){ renderDujieOverlay(btns); return; } // 渡劫期统一判定
  }
  // 4.216：超大函数拆分——按区块抽子函数（按钮/行为/文本零变化）
  renderActionsMain(g, btns);   // 四大主行动
  renderActionsHunt(g, btns);   // 狩猎 + 更多机缘折叠
  renderActionsWound(g, btns);  // 调养
  renderActionsSpouse(g, btns); // 道侣/传道
  renderActionsOrg(g, btns);    // 宗门/坊市
  $('eventBox').innerHTML='';
}
function renderActionsMain(g, btns){ // 四大主行动（苦修/历练/交游/经营）
  const acts = [
    {k:'苦修', d:'闭关潜修，修为稳步增长，但消耗灵石。'},
    {k:'历练', d:'游历修仙界、猎杀妖兽，属性与道行增长最快，也最危险。'},
    {k:'交游', d:'拜师交友、经营人脉，悟性与机缘。'},
    {k:'经营', d:'经商任务赚取灵石，贴补修炼资源。'},
  ];
  acts.forEach(act=>{
    const _kuCost = act.k==='苦修' ? Math.floor((15 + g.a.家境*0.2) * (CFG.cult.coef[g.realm] || 1)) : 0; // 费用随境界
    const _noMoney = act.k==='苦修' && g.money < _kuCost; // 灵石不足无法苦修（视觉 locked + 原生禁用，与上缴材料一致）
    const b=document.createElement('button'); b.className='btn'+( _noMoney?' btn-locked':'');
    b.disabled = _noMoney;
    b.title = _noMoney ? ('灵石不足（需 '+_kuCost+'），无法苦修。') : act.d;
    b.onclick=()=>doAction(act.k);
    // 按钮直接标注当前状态下的预估修为收益（同公式估算），玩家可直观对比行动效率；
    // 先天 0 凡人无法修炼，仅显示行动名与常人收益
    if(g.soul){
      const est = estSoulGain(act.k);
      const costTxt = act.k==='苦修' ? ` · -${_kuCost}灵石` : '';
      const earnTxt = act.k==='经营' ? ` · 灵石+${fmtW(Math.floor((55+g.a.家境*3.2+30)*orgMoneyMult()))}` : '';
      // 4.328 历练风险量化：遇险(7%)时若气血不足(<10)且已成年，20% 殒命 → 约 1.4%/年；气血充足则遇险仅伤不亡
      let riskTxt = '';
      if(act.k==='历练'){ const _ld = (g.age>=12 && (g.a.气血||0)<10) ? Math.round(0.07*0.20*100) : 0; riskTxt = _ld>0 ? ` <span style="color:var(--red)">殒险~${_ld}%/年</span>` : ` <span style="color:var(--dim)">遇险仅伤</span>`; }
      const byTxt = act.k==='交游' ? ' · 悟性/人脉' : ''; // 4.329 交游副产可视化（悟性成长+拜师/顿悟机缘）
      b.innerHTML = `${act.k} <span style="font-size:11px;color:var(--dim)">修为+${fmtW(rr(est))}${costTxt}${earnTxt}${byTxt}</span>${riskTxt}`;
    } else {
      const extra = {苦修:'气血悟性微增', 历练:'力量灵动气血提升', 交游:'悟性家境提升', 经营:'赚取灵石'}[act.k]||'';
      b.innerHTML = `${act.k} <span style="font-size:11px;color:var(--dim)">${extra}</span>`;
    }
    btns.appendChild(b);
  });
}
function renderActionsHunt(g, btns){ // 狩猎 + 更多机缘折叠
  // 狩猎历练：斩获灵石/妖丹/法宝（独立于修炼行动，可自由选择）
  {
    const bH=document.createElement('button'); bH.className='btn';
    const _hidx = Math.min(8, Math.max(0, g.realm));
    const _hdp = Math.round(huntDeathP(_hidx,'中')*100); // 4.328 狩猎风险量化（中档当前境界实时殒命率）
    bH.title='狩猎妖兽：斩获灵石、妖丹淬体与法宝机缘，亦伴凶险（中档殒命率约 '+_hdp+'%，进界面可看三档详情）。';
    bH.innerHTML=`狩猎 <span style="font-size:11px;color:var(--dim)">妖兽历练 · 灵石/法宝</span> <span style="font-size:11px;color:var(--red)">殒${_hdp}%</span>`;
    bH.onclick=()=>{ openHuntUI(); };
    btns.appendChild(bH);
  }
  // 4.206r：更多机缘折叠——低频/随机行动（逛坊市/采药/探秘/斗法论道/悟道）收进「更多机缘」，点开展开/收起；
  // 自动挂机走 decideNext/execNext 不经按钮、事件选择走 eventBox，折叠不影响；pick() 仅匹配突破/渡劫等特殊按钮。
  {
    const bMore=document.createElement('button'); bMore.className='btn';
    bMore.innerHTML=`更多机缘 <span style="font-size:11px;color:var(--dim)">探秘/坊市/采药/论道/悟道</span> <span class="more-arrow" style="font-size:10px;color:var(--dim)">▼</span>`;
    bMore.title='展开/收起：探秘、逛坊市、采药、斗法论道、悟道';
    bMore.onclick=()=>{ const _box=$('moreActs'); if(!_box) return; const _open=_box.style.display==='flex'; _box.style.display=_open?'none':'flex'; bMore.classList.toggle('more-open', !_open); const _ar=bMore.querySelector('.more-arrow'); if(_ar) _ar.textContent=_open?'▼':'▲'; };
    btns.appendChild(bMore);
  }
  const moreBox=document.createElement('div'); moreBox.id='moreActs';
  moreBox.style.cssText='display:none;width:100%;flex-wrap:wrap;gap:8px';
  renderActionsMore(g, moreBox); // 折叠内容
  btns.appendChild(moreBox);
}
function renderActionsMore(g, moreBox){ // 逛坊市/采药/探秘/斗法/悟道
  // 逛坊市——奇遇/零钱（独立行动）
  {
    const bM=document.createElement('button'); bM.className='btn';
    bM.title='逛坊市：游逛一日，偶有奇遇（捡漏/残卷/拍卖），亦或赚些零碎灵石。';
    bM.innerHTML=`逛坊市 <span style="font-size:11px;color:var(--dim)">奇遇/零钱</span>`;
    bM.onclick=()=>doAction('逛坊市');
    moreBox.appendChild(bM);
  }
  // 采药——灵草（炼丹材料）
  {
    const bH=document.createElement('button'); bH.className='btn';
    bH.title='采药：入山采掘灵草，为炼丹备材（妖材×灵草→丹药，坊市丹房炼制）。';
    bH.innerHTML=`采药 <span style="font-size:11px;color:var(--dim)">灵草/炼丹材</span>`;
    bH.onclick=()=>doAction('采药');
    moreBox.appendChild(bH);
  }
  // 探秘——秘境冒险（按境界解锁，机缘/凶险并存）
  {
    const bS=document.createElement('button'); bS.className='btn';
    bS.title='探秘：入秘境冒险（'+MISHI.map(function(ms){return ms.name;}).join('→')+'），机缘与凶险并存。';
    bS.innerHTML=`探秘 <span style="font-size:11px;color:var(--dim)">${mishiOf(g).name}/机缘</span>`;
    bS.onclick=()=>doAction('探秘');
    moreBox.appendChild(bS);
    // 4.315 秘境图鉴按钮
    const bM=document.createElement('button'); bM.className='btn small';
    bM.title='秘境图鉴：各秘境探索次数与最好收获';
    bM.innerHTML=`秘境 <span style="font-size:11px;color:var(--dim)">图鉴</span>`;
    bM.onclick=()=>openMishiModal();
    moreBox.appendChild(bM);
  }
  // 斗法论道——与同境修士切磋（道行）或坐而论道（悟性道心），炼气解锁
  if((g.realm||0) >= 1){
    const bF=document.createElement('button'); bF.className='btn';
    bF.title='斗法论道：与同境修士切磋比斗（道行）或坐而论道（悟性道心），每年限一次。';
    bF.innerHTML=`斗法论道 <span style="font-size:11px;color:var(--dim)">切磋/悟道</span>`;
    bF.onclick=()=>openFightPanel();
    moreBox.appendChild(bF);
  }
  // 悟道——炼虚解锁（元素法则），合体解锁（至高法则）；每悟一道获法则之力（破境+2%/渡劫+1%）
  if(g.realm >= 5){
    const bW=document.createElement('button'); bW.className='btn';
    bW.title='悟道：闭关参悟天地法则（恒定 10 年 + 灵石），每悟一道获法则之力（破境+2% / 渡劫+1%）；每二十年亦有一次顿悟机缘（成功率较低）。';
    bW.innerHTML=`悟道 <span style="font-size:11px;color:var(--dim)">法则之力 ${lawForce(g)}/35</span>`;
    bW.onclick=()=>{ openWuDaoPanel(); };
    moreBox.appendChild(bW);
  }
}
function renderActionsWound(g, btns){ // 调养——伤势恢复（伤时出现）
  if((g.wound||0) > 0){
    const bY=document.createElement('button'); bY.className='btn';
    bY.title='闭关调养：静心疗伤，伤势-1（1 年，修为×0.5）。';
    bY.innerHTML=`调养 <span style="font-size:11px;color:#e07777">${woundName()}</span>`;
    bY.onclick=()=>doAction('调养');
    btns.appendChild(bY);
  }
}
function renderActionsSpouse(g, btns){ // 道侣互动 + 传道
  // 道侣互动——弹窗聚合（替代 4 按钮，自动模式不受影响：pickKind→doAction 不经按钮）
  if(g.spouse){
    const bSp=document.createElement('button'); bSp.className='btn';
    bSp.innerHTML=`道侣 <span style="font-size:11px;color:var(--dim)">羁绊 ${Math.min(100,(g.bond||0))} · 双修/游历/论道/赠礼</span>`;
    bSp.title='与道侣互动：双修、游历、论道、赠礼（羁绊成长，渡劫加成上限+5%）。';
    bSp.onclick=()=>toggleSpousePanel();
    btns.appendChild(bSp);
  }  // 传道——有可传道的成熟子嗣时出现（道基成长→出师成才→血脉护佑渡劫加成）
  if(matureKids().length>0){
    const bC=document.createElement('button'); bC.className='btn';
    bC.innerHTML=`传道 <span style="font-size:11px;color:var(--dim)">寿元-1 · 子嗣道基+16~24</span>`;
    bC.title='向子嗣传道：折损一年寿元，助其道基成长；道基满后出师成才（成才子嗣渡劫+2%，上限+4%）。';
    bC.onclick=()=>doAction('传道');
    btns.appendChild(bC);
  }
}
function renderActionsOrg(g, btns){ // 宗门 + 坊市
  // 宗门——弹窗聚合（捐献/藏经阁/上缴材料）
  if(g.soul && g.org){
    const bOrg=document.createElement('button'); bOrg.className='btn';
    bOrg.innerHTML=`宗门 <span style="font-size:11px;color:var(--dim)">贡献 ${g.gongxian||0} · 妖丹×${g.materials||0}</span>`;
    bOrg.title='宗门：捐献灵石换声望、藏经阁兑换功法神通与任职、上缴妖兽材料。';
    bOrg.onclick=()=>toggleOrgPanel();
    btns.appendChild(bOrg);
  }
  const bShop=document.createElement('button'); bShop.className='btn';
  bShop.textContent='万宝楼'; bShop.title='万宝楼：消耗灵石购买灵宝、丹药、功法神通与洞府（后期金钱出口）；与「更多机缘·逛坊市」（奇遇/零钱）不同。';
  bShop.onclick=()=>toggleShop();
  btns.appendChild(bShop);
}
// 突破覆盖层——修为满点后行动区仅显示突破/渡劫/飞升之劫（功德/魔道飞升并列可选）
function renderBreakOverlay(btns){
  const g=G, _sub=g._breakPending, _r=realmOf(), _S=CFG.realms[_r], _B=REALM_B[_r]; // 境界统一入口（巅满挂起按当前境）
  const _mk=(txt,desc,fn)=>{ const b=document.createElement('button'); b.className='btn'; b.title=desc; b.onclick=fn; b.innerHTML=txt; btns.appendChild(b); };
  if(_sub === 3){
    if(_r >= 8){ // 大乘巅满：飞升之劫 + 功德/魔道飞升并列
      // 大乘巅峰：飞升之劫 + 功德/魔道飞升并列（自主选择）
      _mk('飞升之劫即将降临','修为圆满，冲击飞升之劫——渡过则踏入渡劫期，九重天劫在望', ()=>{ advanceYears('突破',1); });
      const _gdNet=(g.功德||0)-(g.业力||0);
      if(_gdNet>=200 && !g._jinShenFail) _mk('功德金身 · 飞升','以无量功德凝聚功德金身，肉身成圣，白日飞升（成功率 '+Math.round(Math.min(0.50,0.35+_gdNet/10000)*100)+'%）', ()=>{ doGongdeAscend(); if(g.alive && !g.godTitle) renderGame(); });
      if(_gdNet<=-200) _mk(g._huamo?'凝魔躯 · 魔道飞升':'魔道飞升 · 化魔池', g._huamo?'魔气已灌体，凝魔躯证九幽真魔之位':'堕入化魔池，魔气灌体，凝魔躯飞升九幽魔界', ()=>{ doMoAscend(); if(g.alive && !g.godTitle) renderGame(); });
    } else {
      const _bt = rtJname(_r, g); const _bp = rtChance(g, _r, 0).p; // 4.328 破境天劫风险量化（rtJname/rtChance 同源；g 必须传，否则形参错位）
      _mk('渡劫','修为圆满，冲击'+TIER_NAMES[_r+1]+'天劫（成功率 '+Math.round(_bp*100)+'%：失败折寿 '+_bt.lp+' 年、死亡 '+Math.round(_bt.dp*100)+'%）——渡过则境界升华，失败退境折寿', ()=>{ advanceYears('突破',1); });
    }
  } else {
    const _p=BRK_COEF[g.soul.quality] || 0.85;
    _mk('突破','冲击'+TIER_NAMES[_r]+SUB_TIER[_sub+1]+'（成功率 '+Math.round(_p*100)+'%，失败修为折损5%）', ()=>{ advanceYears('突破',1); });
  }
}
// 渡劫期覆盖层——行动区仅显示当前劫数按钮（点击渡此一劫）
function renderDujieOverlay(btns){
  const g=G;
  const _n = Math.min(9, (g._jie||0)+1);
  const _jk = ['雷','雷','雷','火','火','火','风','风','风'][_n-1];
  const _p = g._dujieFirst ? 0 : tribRate(g, _n);
  // 4.330 飞升之路对比（演出层，数值不动）：硬渡九劫 vs 功德金身/魔道飞升（同源成功率）
  const _gdNet=(g.功德||0)-(g.业力||0);
  let _pathTxt = '硬渡九劫 · 当前成功率 '+(g._dujieFirst?'?':Math.round(_p*100)+'%');
  if(_gdNet>=200 && !g._jinShenFail) _pathTxt += ' ｜ 功德金身可择（成功率 '+Math.round(Math.min(0.50,0.35+_gdNet/10000)*100)+'%）';
  else if(_gdNet<=-200) _pathTxt += ' ｜ 魔道飞升可择（成功率 '+Math.round(Math.min(0.55,0.40+(-_gdNet)/10000)*100)+'%）';
  else if(g._jinShenFail) _pathTxt += '（功德金身曾尝试失败，此路已断）';
  const _pi=document.createElement('div'); _pi.className='muted'; _pi.style.cssText='font-size:11px;margin:2px 0 6px;color:var(--gold)'; _pi.innerHTML=_pathTxt; btns.appendChild(_pi);
  const b=document.createElement('button'); b.className='btn';
  b.title = g._dujieFirst ? '天劫蓄势待发，来年渡第一重雷劫' : ('引动天劫，渡此一劫（成功率 '+Math.round(_p*100)+'%；失败：20% 身死道消 / 80% 重伤沦为'+(_n)+'劫散仙）'); // 4.328 渡劫失败后果量化
  b.onclick = ()=>{ advanceYears('渡劫',1); };
  b.innerHTML = (g._dujieFirst ? '渡劫 · 蓄势' : ('渡劫 · 第'+_n+'/9重'+_jk+'劫')) + (g._dujieFirst ? '' : ' <span style="font-size:11px;color:var(--dim)">'+Math.round(_p*100)+'%</span>');
  btns.appendChild(b);
}
/* 道侣互动面板（弹窗聚合） */
function toggleSpousePanel(){
  const p=$('spousePanel'); if(!p) return;
  if(p.style.display !== 'none'){ p.style.display='none'; return; }
  renderSpousePanel(); p.style.display='block';
}
function renderSpousePanel(){
  const g=G;
  const p=$('spousePanel'); if(!p || !g.spouse) return;
  const _bd0 = Math.min(100, (g.bond||0));
  const _sl = Math.min(10, Math.max(0, g.spouseLv||0));
  const _acts = [
    {k:'双修', tip:'与道侣双修：修为略减，羁绊渐深（羁绊每点+0.05%渡劫成功率，上限+5%）。'},
    {k:'游历', tip:'与道侣同游：羁绊渐深，途中或有际遇（灵石/悟性/气运）。'},
    {k:'论道', tip:'与道侣论道：当次修为×1.03，羁绊渐深。'},
    {k:'赠礼', tip:'赠礼道侣：耗灵石，羁绊大涨；情深时或得回赠。'}
  ];
  let h = `<div style="border:1px solid var(--line);border-radius:8px;padding:8px">
    <div style="color:var(--gold);font-weight:700;margin-bottom:2px">道侣 · ${escapeHtml(g.spouse)}</div>
    <div class="muted" style="font-size:11px;margin-bottom:6px">羁绊 <b style="color:var(--gold)">${_bd0}</b>/100（渡劫加成 +${(_bd0*0.05).toFixed(1)}%，上限+5%）· 道侣境界 ${realmName(CFG.realms[_sl])}</div>`;
  _acts.forEach(a=>{
    const estS = g.soul ? estSoulGain(a.k)*(a.k==='论道'?1.03:1) : 0;
    const _fee = a.k==='赠礼' ? ' · '+(50+Math.round(_bd0*5))+'灵石' : '';
    const _by = {双修:'羁绊+2', 游历:'羁绊+1·际遇', 论道:'羁绊+1', 赠礼:'羁绊+3'}[a.k] || ''; // 4.329 道侣行动副产可视化（羁绊增量同源）
    h += `<button class="btn mini" style="width:100%;margin:2px 0" title="${a.tip}" onclick="doAction('${a.k}')">${a.k} <span style="font-size:11px;color:var(--dim)">修为+${fmtW(rr(estS))}${(a.k==='论道'?'(×1.03)':_fee)}${_by?(' · '+_by):''}</span></button>`;
  });
  h += '</div>';
  p.innerHTML = h;
}
/* 宗门面板（弹窗聚合：捐献/藏经阁/上缴材料） */
function toggleOrgPanel(){
  const p=$('orgPanel'); if(!p) return;
  if(p.style.display !== 'none'){ p.style.display='none'; return; }
  renderOrgPanel(); p.style.display='block';
}
function renderOrgPanel(){
  const g=G;
  const p=$('orgPanel'); if(!p || !g.org) return;
  const costOrg = Math.floor(150 + g.a.家境*3);
  const _gx = 30 + g.realm*3;
  // 4.268：超大函数拆分——头部操作/宗门任务区抽 2 子函数
  let h = `<div style="border:1px solid var(--line);border-radius:8px;padding:8px">`;
  h += orgHead(g, costOrg, _gx);
  h += orgTask(g);
  h += `</div>`;
  p.innerHTML = h;
}
function orgHead(g, costOrg, _gx){ // 宗门头部——标题/关闭/贡献材料/捐献/藏经阁/上缴
  let h = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px"><div style="color:var(--gold);font-weight:700">宗门 · ${escapeHtml(g.org)}</div><button class="btn mini" title="关闭宗门面板" onclick="toggleOrgPanel()">✕ 关闭</button></div>`;
  h += `<div class="muted" style="font-size:11px;margin-bottom:6px">贡献 <b style="color:var(--gold)">${g.gongxian||0}</b> · 妖丹材料 <b style="color:var(--gold)">${g.materials||0}</b>${g.post?(' · 任职 '+g.post):''}</div>`;
  h += `<button class="btn mini" style="width:100%;margin:2px 0" ${g.money<costOrg?'disabled':''} title="向宗门捐献灵石，兑换声望与师承资源。" onclick="donateOrg()">捐献灵石 <span style="font-size:11px;color:var(--dim)">-${costOrg}灵石 · 声望+${Math.max(1,Math.floor(costOrg/80)*orgPrestigeMult())}</span></button>`;
  h += `<button class="btn mini" style="width:100%;margin:2px 0" title="藏经阁：贡献兑换功法神通，化神后可任宗门职务，另有丹药兑换。" onclick="toggleOrgPanel(); toggleCang();">藏经阁 <span style="font-size:11px;color:var(--dim)">功法神通 · 任职 · 丹药</span></button>`;
  h += `<button class="btn mini" style="width:100%;margin:2px 0" ${g.materials>0?'':'disabled'} title="${g.materials>0?'将历练所得妖兽材料上缴宗门，换取贡献与声望。':'没有材料可上缴——先狩猎妖兽获取材料。'}" onclick="shangjiao()">上缴材料 <span style="font-size:11px;color:var(--dim)">妖丹×${g.materials||0} · 贡献+${_gx}</span></button>`;
  return h;
}
function orgTask(g){ // 宗门任务区——进行中任务/接取新任务
  let h = `<div style="border:1px solid var(--line);border-radius:8px;padding:6px;margin-top:6px">`;
  h += `<div style="color:var(--gold);font-weight:700;margin-bottom:4px">宗门任务 <span style="font-size:11px;color:var(--dim)">贡献主要来源</span></div>`;
  h += g._orgTask ? `
    <div style="font-size:12px;margin-bottom:4px">「${TASK_NAMES[g._orgTask.kind]}」${g._orgTask.desc}<br><span style="color:var(--dim);font-size:11px">进度 ${g._orgTask.left}/${g._orgTask.goal} · 完成奖 贡献+${g._orgTask.gx} 声望+${g._orgTask.pre} 灵石+${g._orgTask.money}</span></div>
    <button class="btn mini" style="width:100%;margin:2px 0" title="执行一次宗门任务（按任务类型判定成败，失败轻罚）。" onclick="doOrgTask()">执行任务 <span style="font-size:11px;color:var(--dim)">${g._orgTask.left}/${g._orgTask.goal}</span></button>`
  : `
    <div style="font-size:12px;margin-bottom:4px">宗门分派任务：斩妖/寻宝/护送/除魔/采药，完成得贡献与声望。</div>
    <button class="btn mini" style="width:100%;margin:2px 0" title="接取宗门任务（按当前境界匹配任务）。" onclick="genOrgTask()">接取任务</button>`;
  h += `</div>`;
  return h;
}
/* ============ 4.208b 宗门任务系统 ============ */
const TASK_NAMES = {斩妖:'斩妖除患', 寻宝:'秘境寻宝', 护送:'商队护送', 除魔:'除魔卫道', 采药:'采药献宗'};
function genOrgTask(){ // 接取宗门任务——按境界档匹配任务池，reward 随档位提升
  const g=G;
  if(!g.org){ addLog('无门无派，宗门任务无处接取。','bad'); return; }
  const r = Math.min(8, g.realm||0);
  const _pool = r>=6 ? ['斩妖','护送','除魔'] : r>=4 ? ['寻宝','护送','除魔'] : r>=2 ? ['斩妖','寻宝','采药'] : ['斩妖','采药'];
  const kind = _pool[Math.floor(Math.random()*_pool.length)];
  const goal = (kind==='斩妖'||kind==='采药') ? 3 : 2;
  const _lv = Math.min(3, Math.floor(r/3)); // 0-3 奖励档（境界越高任务越重奖越厚）
  g._orgTask = {kind:kind, goal:goal, left:goal, gx:40+_lv*25, pre:1+_lv, money:50*(_lv+1)+Math.floor(Math.random()*30),
    desc: kind==='斩妖' ? `剿灭${CFG.ring.tierDesc[r]}妖兽${goal}次` : kind==='寻宝' ? `探秘秘境${goal}次` : kind==='护送' ? `护送商队${goal}次` : kind==='除魔' ? `清剿${r>=6?'魔渊魔修':'魔修'}${goal}次` : `采集灵草${goal}次`};
  addLog(`宗门任务「${TASK_NAMES[kind]}」：${g._orgTask.desc}（奖励贡献+${g._orgTask.gx}、声望+${g._orgTask.pre}、灵石+${g._orgTask.money}）。`,'sys');
  renderGame(); renderOrgPanel();
}
function doOrgTask(){ // 执行一次宗门任务——按类型判定成败；完成结算奖励，失败轻罚
  const g=G;
  if(!g.org){ addLog('无门无派，宗门任务无处接取。','bad'); renderGame(); return; }
  if(!g._orgTask){ genOrgTask(); return; }
  const t = g._orgTask, r = Math.min(8, g.realm||0);
  let ok = false, note='';
  if(t.kind==='斩妖'){ ok = Math.random() < Math.min(0.95, huntSuccessP(r, '中')); note = ok ? '斩妖得手' : '妖兽凶悍，被逼退却'; }
  else if(t.kind==='寻宝'){ ok = Math.random() < Math.min(0.9, Math.max(0.2, 0.5 + ((g.a.气运||50)-50)*0.004)); note = ok ? '寻得珍宝' : '秘境中空手而归'; }
  else if(t.kind==='护送'){ ok = Math.random() < fightWinRate({power: Math.max(1, power()*0.85)}); note = ok ? '击退劫匪，商队平安' : '劫匪势大，商队受损'; }
  else if(t.kind==='除魔'){ ok = Math.random() < Math.min(0.9, Math.max(0.15, (g.daoXin||50)*0.008)); note = ok ? '荡平魔氛' : '魔修狡诈，无功而返'; }
  else if(t.kind==='采药'){ ok = Math.random() < 0.9; note = ok ? '采得灵草' : '灵草难寻，空手而回'; }
  if(ok){
    t.left--;
    if(t.kind==='采药'){ g.herbs = (g.herbs||0)+1; note+='（灵草+1）'; }
    else if(t.kind==='斩妖'){ g.materials = (g.materials||0)+1; note+='（妖材+1）'; }
    else if(t.kind==='寻宝'){ const _m = 20+Math.floor(Math.random()*30); g.money = (g.money||0)+_m; note+='（灵石+'+_m+'）'; }
    addLog(`宗门任务「${TASK_NAMES[t.kind]}」：${note}（${t.left}/${t.goal}）。`,'good');
    if(t.left<=0){
      g.gongxian = (g.gongxian||0)+t.gx; g.prestige = (g.prestige||0)+t.pre; g.money = (g.money||0)+t.money;
      addLog(`<b>宗门任务完成！</b>贡献+${t.gx}、声望+${t.pre}、灵石+${t.money}。`,'good');
      g._orgTask = null;
    }
  } else {
    if(Math.random() < 0.5){ g.wound = Math.min(2, (g.wound||0)+1); addLog(`宗门任务「${TASK_NAMES[t.kind]}」：${note}，不慎负伤。`,'bad'); }
    else { g.a.气血 = Math.max(5, (g.a.气血||0)-6); addLog(`宗门任务「${TASK_NAMES[t.kind]}」：${note}，气血受损。`,'bad'); }
    clampAll();
  }
  renderGame(); renderOrgPanel();
}
function donateOrg(){
  doAction('宗门贡献');
  const _op=$('orgPanel');
  if(_op && _op.style.display!=='none') renderOrgPanel();
}

/* 修炼速度构成面板——基础（基础速度 × 境界系数）+ 加成链（无衰减） */
function cultBreakdown(){ // 修炼构成面板与 cultBase 同用加算链（parts 为加成值，cultV=1+Σ）
  const g=G;
  const r = g.realm;
  const parts = [];
  const fate = hasFate(g,'cult');
  if(fate) parts.push({name:'命格·天纵奇才', val:0.05, on:true, txt:'修炼速度+5%'});
  const _lun = lunhuiVal('cultTop')*0.025;
  if(_lun!==0) parts.push({name:'轮回殿·修炼天赋', val:_lun, on:true, txt:'每点+2.5%'});
  const _f2 = (g._fortune && g._fortune.years>0) ? g._fortune.mult - 1 : 0;
  if(_f2!==0) parts.push({name:'气运眷顾', val:_f2, on:true, txt:'限时 buff，剩 '+Math.max(0,(g._fortune&&g._fortune.years)||0)+' 年'});
  const _org = orgCultMult() - 1;
  if(_org!==0) parts.push({name:'势力传承', val:_org, on:true, txt:g.org+' 道统'});
  const _dt = _dtmOf(g);
  if(_dt!==0) parts.push({name:'道胎共鸣', val:_dt, on:true, txt:'道胎品阶加持'});
  const _gf = gongfaCultMult() - 1;
  if(_gf!==0) parts.push({name:'功法修炼', val:_gf, on:true, txt:'主修全效·辅修半效'});
  const _at = gongfaAtlasCultMult();
  if(_at!==0) parts.push({name:'功法图鉴', val:_at, on:true, txt:'收集加成'});
  const _cave = [0,0.10,0.20,0.35][g.caveLv||0]; // 洞府灵气（修炼构成面板展示）
  if(_cave!==0) parts.push({name:'洞府·灵气', val:_cave, on:true, txt:['','灵泉洞府','地脉洞府','九天仙府'][g.caveLv||0]});
  let cultV = 1;
  parts.forEach(p=>{ cultV += p.val; }); // 加算合计
  const perYear = cultBase(); // 苦修基准（点/年）
  const speedTxt = r===0 ? ((g.soul.quality==='fei')?'2.4':'6') : String(CFG.cult.speed[g.soul.quality]||0);
  const coef = (r < CFG.cult.coef.length) ? CFG.cult.coef[r] : 0;
  return {parts, cultV, perYear, speedTxt, coef, r};
}
function cultPanelHtml(){
  const g=G;
  if(!g.soul) return '<div class="muted">尚未觉醒灵根，无法修炼。</div>';
  const b=cultBreakdown();
  let h = `<div style="border:1px solid var(--line);border-radius:8px;padding:8px">
    <div style="color:var(--gold);font-weight:700;margin-bottom:2px">修炼速度构成</div>
    <div class="muted" style="font-size:11px;margin-bottom:6px">苦修基准每年修为 <b style="color:var(--gold)">+${fmtW(rr(b.perYear))}</b> · 综合加成 ×${b.cultV.toFixed(2)}（与 HUD 一致）</div>`;
  h += '<div style="font-size:12px;color:var(--dim);margin-top:4px">—— 基础（基础速度 × 境界系数）——</div>';
  const baseTxt = (b.r===0 ? ('炼体期 '+(g.soul.quality==='fei'?'2.4':'6')+' 点/年') : (g.soul.name+' 基础 '+b.speedTxt+' 点/年 × 境界系数 '+b.coef));
  h += `<div style="display:flex;justify-content:space-between;padding:3px 2px;border-bottom:1px dashed #3a3a44"><span style="font-size:12px">基础修炼</span><span style="font-size:12px;color:var(--dim)">${baseTxt}</span></div>`;
  b.parts.forEach(it=>{
    h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 2px;border-bottom:1px dashed #3a3a44">
      <span style="font-size:12px">${it.name} <span class="muted" style="font-size:10px">${it.txt||''}</span></span>
      <span style="font-size:12px;font-weight:700;color:${it.on?'var(--gold)':'var(--dim)'}">${it.val>=0?'+':'−'}${Math.abs(Math.round(it.val*100))}%</span></div>`; // 加算显示
  });
  h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 2px"><span style="font-size:12px;color:var(--gold);font-weight:700">加成合计</span><span style="font-size:13px;color:var(--gold);font-weight:700">×${b.cultV.toFixed(2)}</span></div>`;
  h += '<div class="muted" style="font-size:11px;margin-top:6px">行动倍率：苦修×1.0 / 历练×0.55 / 交游×0.50 / 经营×0.42；每年修为 = 基础 × 加成 × 行动倍率。每境修为独立累计，突破后从 0 开始。</div></div>';
  return h;
}
function openCultModal(){
  const m=$('cultModal'); if(!m) return;
  const b=$('cultModalBody'); if(b) b.innerHTML = cultPanelHtml();
  m.style.display='flex';
}
function closeCultModal(){
  const m=$('cultModal'); if(m) m.style.display='none';
}
/* 预估修为收益（DL_RS_4.85）：与 doAction 修炼增益完全同公式，
   供行动按钮直接展示当前状态下的预估修为 +N（年修为×行动倍率，段内截断），玩家可直观对比各行动效率 */
function estSoulGain(kind){ // 预估修为收益 = 年修为 × 行动倍率（段内截断）
  const g=G;
  if(!g.soul) return 0;
  if(g.realm >= 9) return 0; // 渡劫/真仙不再累积修为
  const mult = CFG.cult.actionMult[kind] || 0.5;
  let gain = cultBase() * mult;
  const r = g.realm;
  const S = CFG.realms[r], B = REALM_B[r];
  const _sb = (g.subRealm === undefined || g.subRealm === null) ? 0 : g.subRealm;
  const need = subSegLen(g, _sb); // 36 条段长（段内封顶）
  if((g.realmPos||0) + gain > need) gain = Math.max(0, need - (g.realmPos||0));
  return gain;
}
function doAction(kind){
  const g=G, a=g.a;
  // 防御 g.soul 未初始化（正常觉醒后必存在，但防后续新增入口误调）
  if(!g.soul) return;
  // 灵石消耗行动（DL_RS_4.46）：宗门贡献（金钱换声望）——药浴已移除
  if(kind==='宗门贡献'){ doActionGongxian(g, a); return; } // 4.240：超大函数拆分——大宗分支抽子函数
  // 逛坊市——1 年行动（无修为），30% 触发坊市奇遇，否则小赚零碎灵石
  if(kind==='逛坊市'){
    advanceYears('逛坊市', 0);
    if(Math.random() < 0.30){
      const _pool = EVENTS.filter(e=>e.marketEv);
      if(_pool.length){
        const _ev = _pool[Math.floor(Math.random()*_pool.length)];
        showEvent(_ev);
      }
    } else {
      const _inc = 15 + Math.floor(Math.random()*20);
      g.money += _inc;
      addLog(`你在坊市闲逛一日，淘得些零碎物件转手，赚得 <b>${_inc}</b> 灵石。`,'good');
    }
    renderGame();
    return;
  }
  // 采药——入山寻草，1 年行动（0.15 倍修为），产出炼丹灵草
  if(kind==='采药'){
    advanceYears('采药', 0);
    renderGame();
    return;
  }
  // 调养——闭关疗伤（1 年行动，0.5 倍修为，伤势-1）
  if(kind==='调养'){ doActionTiaoYang(g); return; }
  // 探秘——秘境冒险（1 年行动，0.15 倍修为，按当前境界档位抽 1 个秘境事件）
  if(kind==='探秘'){ doActionTanMi(g); return; }
  // 苦修批量预算截断——灵石只够部分年份时按可支撑年数推进，一年都修不起则提示中断（防大乘 100 年/批空转与扣穿）
  if(kind==='苦修'){
    const _kw = Math.floor((15 + a.家境*0.2) * (CFG.cult.coef[g.realm] || 1));
    const _can = Math.floor(g.money / Math.max(1, _kw));
    const _capB = lifeCapOf();
    const _unitB = (_capB >= 10000 ? 100 : _capB >= 1000 ? 10 : 1);
    if(_can < 1){
      if(!(AUTO && AUTO.on)) addLog(`灵石不足（需 ${_kw}），无法苦修。`,'bad');
      renderActions(); return;
    }
    if(_can < _unitB){ advanceYears(kind, Math.max(1, _can)); renderGame(); return; }
  }
  // XL_RS：寿命自适应批量推进（百年→1年/回合、千年→10年/回合、万年→100年/回合）
  advanceYears(kind, 0);
}
function doActionGongxian(g, a){ // 宗门贡献——金钱换声望（悟性/力量微增），270 灵石约换 3 声望
  const cost = Math.floor(150 + a.家境*3);
  if(g.money < cost){ addLog('囊中羞涩，拿不出像样的贡献。','bad'); renderActions(); return; }
  g.money -= cost;
  // 宗门贡献收益上调（悟性/力量翻倍、声望比例提高）——270 灵石约换 3 声望 + 1.8 属性，对标坊市性价比但仍多换声望解锁事件
  const ratio = Math.max(1, Math.round(Math.floor(cost/80) * orgPrestigeMult()));
  g.prestige += ratio;
  a.悟性+=0.4; a.力量+=0.6;
  addLog(`<b>宗门贡献</b> 向${g.org}捐献 <b>${cost} 灵石</b>，师门声望 <b>+${ratio}</b>，门中资源向你倾斜（悟性、力量微增）。`,'good');
  clampAll(); triggerEvent();
}
function doActionTiaoYang(g){ // 调养——闭关疗伤（0.5 倍修为，境界越高恢复越慢）
  advanceYears('调养', 0.5);
  const _w = g.wound||0;
  if(_w > 0){ // 境界越高调养消耗越多（1/2/3 次调养-1）
    const _need = woundHealNeed();
    g._woundHeal = (g._woundHeal||0) + 1;
    if(g._woundHeal >= _need){
      g._woundHeal = 0;
      g.wound = _w - 1;
      addLog('闭关调养，静心疗伤，伤势渐愈（伤势-1）。','good');
    } else {
      addLog('闭关调养，静心疗伤（调养 '+g._woundHeal+'/'+_need+'，伤势未愈）。','note');
    }
  }
  else { addLog('你已无伤，无需调养。','note'); }
  renderGame();
}
/* ============ 秘境体系（4.315：合并增强现有探秘系统） ============ */
const MISHI = [
  {id:'lingy', name:'灵药谷', secLv:0, d:'灵气氤氲、灵药遍地（炼气期秘境）', rw:{money:30, herbs:1}},
  {id:'shouyao', name:'妖兽林', secLv:1020, d:'妖兽横行，妖丹妖材颇丰（筑基~金丹秘境）', rw:{money:100, mats:1}},
  {id:'yiji', name:'上古遗迹', secLv:26520, d:'上古修士洞府遗落，遗宝灵石（元婴~化神秘境）', rw:{money:400, herbs:2}},
  {id:'zhanchang', name:'仙魔战场', secLv:664020, d:'仙魔大战古战场，残宝与功法残页（炼虚~大乘秘境）', rw:{money:1500, mats:2}}
];
function mishiOf(g){ // 当前境界对应秘境（对齐 _secLv 档位阈值）
  const _r = g ? (g.realm||0) : 0;
  if(_r < 2) return MISHI[0];
  if(_r < 4) return MISHI[1];
  if(_r < 6) return MISHI[2];
  return MISHI[3];
}
function openMishiModal(){ // 秘境图鉴——探索次数/最好收获
  const _m=$('mishiModal'); if(_m) _m.style.display='flex';
  const _b=$('mishiModalBody'); if(!_b) return;
  const _log=(G.mishiLog||{});
  _b.innerHTML = MISHI.map(function(ms){
    const _ml=_log[ms.id]||{times:0, best:0};
    const _cur = mishiOf(G).id===ms.id;
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 4px;border-bottom:1px dashed var(--line)">'
      + '<span style="font-size:12.5px;line-height:1.5"><b style="color:'+(_cur?'var(--gold)':'var(--dim)')+'">'+ms.name+'</b>' + (_cur?' <span style="font-size:10px;color:var(--gold)">当前</span>':'') + '<br><span style="font-size:11px;color:var(--dim)">'+ms.d+'</span></span>'
      + '<span style="font-size:11px;color:var(--dim);white-space:nowrap">探索 '+_ml.times+' 次' + (_ml.best>0?(' · 最好收获 '+_ml.best):'') + '</span></div>';
  }).join('');
}
function closeMishiModal(){ const _m=$('mishiModal'); if(_m) _m.style.display='none'; }
function doActionTanMi(g){ // 探秘——秘境冒险（重伤/濒危禁入，10% 轻伤/2% 重伤，按境界档抽秘境事件）
  if((g.wound||0) >= 2){ addLog('伤势'+woundName()+'，不宜涉险探秘，先调养吧。','bad'); renderGame(); return; } // 重伤/濒危禁探秘
  advanceYears('探秘', 0);
  // 秘境凶险——10% 轻伤 / 2% 重伤（伤势影响与恢复已境界差异化，探秘风险同步落地）
  const _inj = Math.random();
  if(_inj < 0.02){
    g.wound = Math.min(3,(g.wound||0)+2);
    addLog('秘境凶险！你遭禁制反噬，伤势'+woundName()+'。','bad');
  } else if(_inj < 0.12){
    g.wound = Math.min(3,(g.wound||0)+1);
    addLog('秘境历练凶险，你被妖兽所伤（'+woundName()+'）。','bad');
  }
  const _secLv = (g.realm < 2) ? 0 : (g.realm < 4) ? 1020 : (g.realm < 6) ? 26520 : 664020; // 灵药谷/妖兽林/上古遗迹/仙魔战场
  const _pool = EVENTS.filter(e=>e._secret && e._secLv===_secLv);
  if(_pool.length){
    const _ev = _pool[Math.floor(Math.random()*_pool.length)];
    showEvent(_ev);
  } else {
    addLog('你入山探秘一日，只寻得些寻常草木，一无所获。','sys');
  }
  // 4.315 秘境体系化——当前秘境基础产出 + 小概率法宝/功法残页 + 探索图鉴记录
  const _ms = mishiOf(g);
  if(_ms){
    g.money = (g.money||0) + _ms.rw.money;
    g.herbs = (g.herbs||0) + (_ms.rw.herbs||0);
    g.materials = (g.materials||0) + (_ms.rw.mats||0);
    const _loot = _ms.rw.money + (_ms.rw.herbs||0)*20 + (_ms.rw.mats||0)*15;
    const _r = Math.random();
    if(_r < 0.08){ // 8% 法宝（凡器入法宝库，不自动装备）
      const _bId = 'm'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36);
      const _bn = ['玄铁古剑','碧玉灵簪','紫檀木尺','流云法袍','镇山印'][Math.floor(Math.random()*5)];
      g.bones = g.bones || [];
      g.bones.push({id:_bId, slot:BONE_SLOTS[Math.floor(Math.random()*BONE_SLOTS.length)], grade:'凡器', name:_bn, pct:0.30, main:'力量', skill:'势如破竹'});
      addLog('秘境深处寻得一件法宝「'+_bn+'」（凡器，已入法宝库）。','good');
    } else if(_r < 0.13){ // 5% 功法残页——习得随机未拥有常规功法（GONGFAS 无混沌经等事件功法，天然不白嫖）
      const _poolG = Object.keys(GONGFAS).filter(function(k){ return (g.gongfaOwned||[]).indexOf(k) < 0; });
      if(_poolG.length){
        const _gn = _poolG[Math.floor(Math.random()*_poolG.length)];
        g.gongfaOwned = g.gongfaOwned || [];
        g.gongfaOwned.push(_gn);
        addLog('秘境残页悟得功法「'+_gn+'」（已入功法库，可至功法页装备）。','good');
      }
    }
    addLog('秘境归来：于「'+_ms.name+'」寻得灵石+'+_ms.rw.money+(_ms.rw.herbs?('、灵草+'+_ms.rw.herbs):'')+(_ms.rw.mats?('、妖材+'+_ms.rw.mats):'')+'。','sys');
    g.mishiLog = g.mishiLog || {};
    const _ml = g.mishiLog[_ms.id] || {times:0, best:0};
    _ml.times += 1; _ml.best = Math.max(_ml.best, _loot);
    g.mishiLog[_ms.id] = _ml;
  }
  renderGame();
}
function doActionYear(kind){
  const g=G, a=g.a;
  if(kind==='突破'){ doBreak(); return; } // 突破年——修为满点手动突破（不产生其他收益，突破后恢复行动区）
  // 苦修灵石不足——该年不修炼（修为未增长）；自动模式按钮已禁用不会选到，此处为绕过 UI 直接调用的兜底
  if(kind==='苦修'){
    const _kc = Math.floor((15 + a.家境*0.2) * (CFG.cult.coef[g.realm] || 1)); // 校验与扣费同源（随境界）
    if(g.money < _kc){
      if(!(AUTO && AUTO.on)) addLog(`灵石不足（需 ${_kc}），无法苦修。`,'bad');
      return;
    }
  }
  if(kind==='逛坊市'){ /* 0.3 倍修为（actionMult），事件仍由 doAction 外层触发 */ }
  // 4.218：超大函数拆分——按行动类型抽子函数（结算/日志/中止语义零变化）
  doActionYearGain(g, a, kind);      // 通用修为结算（含段内截断）
  doActionYearHerb(g, a, kind);      // 采药产出
  if(doActionYearKuxiu(g, a, kind)) return;    // 苦修（走火入魔致死中止）
  if(doActionYearLilian(g, a, kind)) return;   // 历练（遇险致死中止）
  doActionYearJiaoyou(g, a, kind);   // 交游
  doActionYearJingying(g, a, kind);  // 经营
  if(doActionYearSpouse(g, a, kind)) return; // 双修/游历/论道/赠礼（赠礼灵石不足中止）
  doActionYearChuandao(g, a, kind);  // 传道
  clampAll();
  // 突破判定已统一并入 lvGainWithAttr（段满触发：小境 roll 晋段、巅段满破境天劫），此处不再重复处理
}
function doActionYearGain(g, a, kind){ // 通用修为结算——年修为（基础速度×境界系数×加成链）× 行动倍率；段内截断（突破判定由 lvGainWithAttr 统一处理）
  const mult = CFG.cult.actionMult[kind] || 0.5;
  let gain = cultBase() * mult; // 修为体系重构——无衰减链
  if(kind==='论道') gain *= 1.03; // 4.168：道侣论道增益
  const _r = g.realm;
  if(_r < 9){
    const _S = CFG.realms[_r], _B = REALM_B[_r];
    const _sb = (g.subRealm === undefined || g.subRealm === null) ? 0 : g.subRealm;
    const _need = subSegLen(g, _sb); // 36 条段长（段内封顶）
    if((g.realmPos||0) + gain > _need) gain = Math.max(0, _need - (g.realmPos||0));
  } else { gain = 0; }
  if(gain > 0) addLog(`<b>${kind}</b> 修为 +${rr(gain)}`, 'sys');
  lvGainWithAttr(gain);
}
function doActionYearHerb(g, a, kind){ // 采药产出——85% 得1株、15% 得2株；5% 遇险折气血
  if(kind==='采药'){
    const _h = Math.random()<0.15 ? 2 : 1;
    g.herbs = (g.herbs||0) + _h;
    addLog(`你于山野采药一日，采得灵草 <b>${_h}</b> 株（现持 ${g.herbs} 株）。`,'good');
    if(Math.random() < 0.05){ g.a.气血 = Math.max(1, (g.a.气血||0)-3); addLog('山涧湿滑，你不慎跌落，气血-3。','bad'); }
  }
}
function doActionYearKuxiu(g, a, kind){ // 苦修——属性微增 + 灵石消耗 + 走火入魔/顿悟心魔（返回 true 中止本行动年）
  if(kind==='苦修'){
    a.气血+=0.1; a.悟性+=gainWuSmall(0.05); trendGrow(0.4);
    // 苦修灵石消耗随境界提升——(15+家境×0.2)×境界系数（炼气1/筑基2/金丹5/元婴10/化神20/炼虚50/合体100/大乘200），渡劫不累积修为时系数兜底1
    const cost = Math.floor((15 + a.家境*0.2) * (CFG.cult.coef[g.realm] || 1));
    g.money -= cost; // 灵石已在开头校验充足
    if(Math.random()<0.015){
      // /4.63：走火入魔——修为折损但大境界永不倒退（保底当前大境界关口，已凝道胎之境不失）；4.63 触发率 6%→1.5%、致死率 5%→0.5%，惩罚减轻（气血-1/悟性-1），苦修恢复可用
      const backLv = Math.max(0.002, 0.01 - Math.max(0, g.realm-1) * 0.0008);
      g.stats = g.stats || {hunt:0, fight:0, wuxin:0}; g.stats.wuxin++; // 4.207b 历战统计
      const _ri = g.realm;
      const _gate = _ri === 0 ? 0 : (CFG.realms[_ri] || 0); // 保底当前大境界起点（段内折损，不退境）
      g.realmPos = Math.max(0, g.realmPos * (1 - backLv));  // realmPos 版（折损段内修为）
      g.daoXin = Math.max(0, (g.daoXin||50) - 3); // 急功近利损道心
      addLog(`强行冲关，走火入魔！经脉受损，心神受创，修为折损 ${rr(backLv*100)}%，境界未失（道心−3）。`, 'bad');
      a.气血-=1; a.悟性-=1;
      if(Math.random()<0.005){ die('走火入魔，经脉尽断'); return true; }
    }
    // 4.207b 专属事件：顿悟 / 心魔（苦修路上偶有奇遇与劫难）
    const _rkw2 = Math.random();
    if(_rkw2 < 0.02){ a.悟性 += gainWu(2); g.daoXin = Math.min(100,(g.daoXin||50)+1); addLog('<b>顿悟：</b>闭关中忽有灵光，道心愈坚（悟性+2 · 道心+1）。','good'); }
    else if(_rkw2 < 0.035){ g.daoXin = Math.max(0,(g.daoXin||50)-2); addLog('<b>心魔：</b>杂念丛生，心魔滋生，历劫方破（道心−2）。','bad'); }
  }
}
function doActionYearLilian(g, a, kind){ // 历练——属性成长 + 机缘/遇险/秘境遗藏（返回 true 中止本行动年）
  if(kind==='历练'){
    // 历练属性成长下调（力量 0.7→0.5、灵动 0.5→0.45、机缘 0.14→0.11），
    // 仍是属性成长最快的路线，但不再碾压苦修/交游/经营
    a.力量+=0.5; a.灵动+=0.45; a.气血+=0.3; trendGrow(0.8);
    const r=Math.random();
    if(r<0.11){
      const ev = pick(['偶遇一株仙草，服下后气血大增','猎得一块法宝，融合后道行暴涨','在遗迹中发现修炼心得，悟性大进']);
      if(ev.includes('仙草')){ a.气血+=8; addLog(`<b>机缘：</b>${ev}（气血+8）`,'good');}
      else if(ev.includes('法宝')){
        const bi = equipBone('灵器');
        if(bi){
          if(g.achievements.indexOf('融合法宝')<0) g.achievements.push('融合法宝');
          addLog(`<b>机缘：</b>${ev}——<b>${bi.grade}·${bi.name}</b>（${bi.main}+${bi.pct}%，已入法宝库）。`,'good');
        } else {
          a.气血+=10;
          if(g.achievements.indexOf('融合法宝')<0) g.achievements.push('融合法宝');
          addLog(`<b>机缘：</b>${ev}（气血+10）`,'good');
        }
      }
      else { a.悟性 += gainWu(10); a.神识+=6; addLog(`<b>机缘：</b>${ev}（悟性+${gainWu(10)}，神识+6）`,'good');}
    } else if(r<0.18){
      const dmg=ri(4,10);
      addLog(`历练遇险，受了些伤，气血-${dmg}。`,'bad'); a.气血-=dmg;
      // 幼年（12岁前）受庇护，不会因历练丧命
      if(g.age>=12 && a.气血<10 && Math.random()<0.20){ die('历练途中力竭身死'); return true; }
      if(a.气血<5) a.气血=5;
    }
    // 4.207b 专属事件：秘境遗藏
    if(Math.random() < 0.02){
      const _loot = Math.floor(ri(50,150) * (CFG.cult.coef[g.realm]||1));
      g.money += _loot; g.prestige = (g.prestige||0) + 1;
      addLog('<b>机缘：</b>偶入前人洞府，寻得遗藏灵石 '+_loot+'（声望+1）。','good');
    }
  }
}
function doActionYearJiaoyou(g, a, kind){ // 交游——悟性家境成长 + 拜师/顿悟/结怨
  if(kind==='交游'){
    // 交游悟性成长上调（0.4→0.5），并增设「论道顿悟」——走人脉路线的修士悟性成长不输苦修
    // 基础行动悟性增加也受衰减
    a.悟性+=gainWuSmall(0.1); a.家境+=0.3; trendGrow(0.3);
    const r=Math.random();
    // （通查修复）：无灵根凡人不入宗门（凡人无缘宗门，收徒/开宗事件亦已按品质与修为前置）
    if(!g.master && g.age>=12 && r<0.25){ gainMaster(); }
    if(r<0.08){ a.家境+=2; addLog('结识贵人，家境微涨。','good'); }
    else if(r<0.13){ a.悟性 += gainWu(3); addLog('与故友论道，一朝顿悟，悟性大涨。','good'); }
    // 4.207b 专属事件：结怨
    if(Math.random() < 0.015){
      g.prestige = Math.max(0,(g.prestige||0)-2);
      addLog('<b>风波：</b>言语不慎得罪同修，结下嫌隙（声望−2）。','bad');
    }
  }
}
function doActionYearJingying(g, a, kind){ // 经营——灵石收益 + 商机/劫掠
  if(kind==='经营'){
    // 经营收益上调（金币基数 40→55、家境系数 3→3.2），且劳碌经营亦小幅磨炼体魄
    const earn = Math.floor((55 + a.家境*3.2 + ri(0,60)) * orgMoneyMult());
    g.money += earn; a.家境 += 0.3;
    a.力量 += 0.1; a.气血 += 0.05;
    addLog(`经营所得 +${Math.floor(earn)} 灵石，操劳间体魄亦有所长。`,'good');
    if(Math.random()<0.3){ a.家境+=0.2; }
    trendGrow(0.15);
    // 4.207b 专属事件：商机 / 劫掠
    const _rjy2 = Math.random();
    if(_rjy2 < 0.03){ const _extra = Math.floor(earn*0.5); g.money += _extra; addLog('<b>商机：</b>恰逢市价大涨，额外赚得灵石 '+_extra+'。','good'); }
    else if(_rjy2 < 0.045){ const _loss = Math.min(g.money, ri(20,60)); g.money -= _loss; addLog('<b>劫掠：</b>归途遇劫匪，破财消灾（灵石−'+_loss+'）。','bad'); }
  }
}
function doActionYearSpouse(g, a, kind){ // 道侣互动——双修/游历/论道/赠礼（返回 true 中止本行动年）
  // 4.285：超大函数拆分——四类道侣互动抽 4 子函数
  if(kind==='双修') return daysShuang(g, a);
  if(kind==='游历') return daysYou(g, a);
  if(kind==='论道') return daysLun(g);
  if(kind==='赠礼') return daysZeng(g, a);
}
function daysShuang(g, a){ // 道侣双修——修为取交游档（0.50），主收益为羁绊成长（渡劫加成/事件前置）
  // 道侣双修——修为取交游档（0.50），主收益为羁绊成长（渡劫加成/事件前置）
  if(g.spouse){
    const _b0 = Math.min(100, (g.bond||0));
    g.bond = Math.min(100, _b0 + 2);
    if(Math.random()<0.12){ a.悟性+=gainWuSmall(0.5); addLog('与'+g.spouse+'双修，心神通明，悟性微增。','good'); }
    if(Math.random()<0.15){ g.bond = Math.min(100, g.bond+2); addLog(`与${g.spouse}鸾凤和鸣，羁绊更深（羁绊 ${_b0}→${g.bond}）。`,'good'); }
    else addLog(`与${g.spouse}双修论道，阴阳相济，羁绊渐深（${_b0}→${g.bond}）。`,'good');
  } else {
    addLog('你孑然一身，无人可共双修。','note');
  }
}
function daysYou(g, a){ // 道侣同游——羁绊+1，小概率际遇（灵泉灵石/论道悟性/高人指点气运）
  if(g.spouse){
    const _b0 = Math.min(100,(g.bond||0));
    g.bond = Math.min(100, _b0 + 1);
    const _r = Math.random();
    if(_r<0.12){ const _m=50+Math.floor(Math.random()*250); g.money=(g.money||0)+_m; addLog('与'+g.spouse+'同游，偶得一处灵泉，采得灵石 +'+_m+'。','good'); }
    else if(_r<0.22){ a.悟性+=gainWu(1); addLog('与'+g.spouse+'论道山水间，心有所悟，悟性微增。','good'); }
    else if(_r<0.27){ a.气运=(a.气运||0)+1; addLog('与'+g.spouse+'同游，得高人指点，气运+1。','good'); }
    addLog('与'+g.spouse+'结伴游历，羁绊渐深（'+_b0+'→'+g.bond+'）。','good');
  } else { addLog('你孑然一身，无人可共游历。','note'); }
}
function daysLun(g){ // 道侣论道——羁绊+1（修为×1.03 已计入通用结算）
  if(g.spouse){
    const _b0 = Math.min(100,(g.bond||0));
    g.bond = Math.min(100, _b0 + 1);
    addLog('与'+g.spouse+'论道三日夜，印证所学，修为增益（×1.03），羁绊渐深（'+_b0+'→'+g.bond+'）。','good');
  } else { addLog('你孑然一身，无人可共论道。','note'); }
}
function daysZeng(g, a){ // 赠礼道侣——灵石换羁绊，情深时或得回赠（返回 true 中止本行动年）
  if(g.spouse){
    const _b0 = Math.min(100,(g.bond||0));
    const _cost = 50 + Math.round(_b0*5);
    if(g.money < _cost){ addLog('囊中羞涩，拿不出像样的礼物。','bad'); return true; }
    g.money -= _cost;
    g.bond = Math.min(100, _b0 + 3);
    let _rt = '道侣收下礼物，情意渐浓（羁绊 '+_b0+'→'+g.bond+'）。';
    if(_b0>=60 && Math.random()<0.30){
      if(Math.random()<0.5){ a.悟性+=gainWu(2); _rt = '道侣收下礼物，情意更浓（羁绊 '+_b0+'→'+g.bond+'），并回赠一枚聚灵丹，悟性+2。'; }
      else { a.气血=(a.气血||0)+2; _rt = '道侣收下礼物，情意更浓（羁绊 '+_b0+'→'+g.bond+'），并为你温养经脉，气血+2。'; }
    }
    addLog(_rt,'good');
  } else { addLog('你孑然一身，无人可收你的礼物。','note'); }
}
function doActionYearChuandao(g, a, kind){ // 传道——寿元-1，道基+16~24（悟性加成），出师成才判定
  if(kind==='传道'){
    // 子嗣传道——寿元-1，道基+16~24（悟性加成），出师成才判定
    const _ks = matureKids();
    if(_ks.length>0){
      const _k = _ks[0];
      const _add = Math.round(16 + Math.random()*8 + (a.悟性||0)/20);
      const _prev = _k.dao;
      _k.dao = Math.min(100, _k.dao + _add);
      g._kidDeduct = (g._kidDeduct||0) + 1; // 传道折寿（lifeCapOf 持久扣减）
      if(g.lifeCap) g.lifeCap = Math.max(g.age+1, g.lifeCap-1);
      g.daoXin = Math.min(100, (g.daoXin||50) + 1); // 道统传承，道心自坚
      addLog('你将毕生所学凝成一缕道意，渡入子嗣<b>'+_k.name+'</b>心田（道基 '+_prev+'→'+_k.dao+'，寿元-1）。','good');
      if(_k.dao>=100){
        const _qIdx = ['fei','pu','you','ding','super','shen','she'];
        const _qi = Math.max(0,_qIdx.indexOf(_k.quality));
        const _p = Math.max(0.15, Math.min(0.90, 0.40 + _qi*0.08 + (_k.talent/100)*0.20 + ((a.气运||50)-50)*0.002));
        _k.done = true;
        if(Math.random() < _p){
          _k.succ = true;
          g.prestige = (g.prestige||0)+10; a.悟性 += gainWuSmall(2); // 声望在 g.prestige（原 a.声望 为孤儿字段丢失）
          addLog('<b>出师成才！</b>子嗣<b>'+_k.name+'</b>得你真传，青出于蓝——血脉护佑（渡劫+2%）。','good');
        } else {
          g.prestige = (g.prestige||0)+3; // 同上
          addLog('子嗣<b>'+_k.name+'</b>出师，虽未至大成，亦承你衣钵，中规中矩。','note');
        }
      }
    } else {
      addLog('子嗣尚幼或已尽得传承，暂无可传道之人。','note');
    }
  }
}

/* XL_RS：年份推进单位自适应（寿命上限百年→1年/回合、千年→10年/回合、万年→100年/回合）
   内部逐年模拟（事件/渡劫/年龄事件零损失），渲染回合末一次；
   遇事件中断交回玩家（自动挂机则低品质事件静默结算），处理完由 endYear 自动续跑剩余年份。 */
function advanceYears(kind, n){
  const g=G;
  // 4.276：超大函数拆分——准备段/推进循环抽 2 子函数
  const n2 = ayPrep(kind, n);
  const _used = ayLoop(g, kind, n2);
  _SILENT_EV = false;
  LOG_SILENT = false;
  flushBatchLogs();
  renderCompactStats();
  if(!g.alive || g.godTitle) return; // 结局已由 die/finishLife 渲染
  if(_used > 1) addLog(`—— <b>${kind} ${_used} 载</b>，岁月流转，道行渐深。 ——`,'sys');
  if(g._evPause || g._stepRemain > 0){
    g._evPause = false;
    if(g._stepRemain > 0) addLog(`闭关因故中断，余 <b>${g._stepRemain}</b> 年待续。`,'note');
    if(AUTO.on){ renderGameAuto(); } else { renderGame(); }
    return;
  }
  if(AUTO.on){ renderGameAuto(); } else { renderGame(); }
  startYear();
}
function ayPrep(kind, n){ // 年限推进准备——行动单位/剩余步数/寿尽保护/静默标记（返回实际推进年数 n2）
  const g=G;
  const _cap = lifeCapOf();
  const _dujie = isDujieOf(); // 渡劫期统一判定（排除突破挂起）
  const _unit = (kind==='突破' || kind==='渡劫' || _dujie || g._sanxian) ? 1 : (_cap >= 10000 ? 100 : _cap >= 1000 ? 10 : 1); // 渡劫期行动单位强制 1 年（每年渡一劫，不可批量连渡）；XL_RS 4.191：散仙寿元无多，同样恢复一年一行动；XL_RS 4.193：突破/渡劫按钮行动强制 1 年（突破后立即恢复行动区；渡劫逐年而渡）
  const _isResume = !!g._stepRemain; // 事件中断后自动续跑——续跑期间不再判定品质池（本批首年已判过）
  let n2 = g._stepRemain || (n > 0 ? n : _unit);
  g._stepRemain = 0;
  g._evPause = false; // 事件中断独立标记（1 年批中断时 _stepRemain=0，不能依赖其判中断）
  if(n2 > _unit) n2 = _unit;
  const _left = Math.max(0, _cap - g.age);
  n2 = Math.max(1, Math.min(n2, _left)); // 寿尽保护：余量不足按实际推进，绝不跳死
  g._lastKind = kind;
  LOG_SILENT = n2 > 1; _BATCH_LOGS = []; // 渡劫期行动单位 1 年——日志实时渲染（蓄势/渡劫逐年可见，年份真实）
  // 嵌套防御——前次 advanceYears 未正常复位残留 _SILENT_EV 时告警（防跨回合静默吞事件）
  if(_SILENT_EV && !(AUTO && AUTO.on)){ console.warn('_SILENT_EV 残留：前次 advanceYears 未复位', G && G.age); }
  _SILENT_EV = !!(AUTO && AUTO.on) || n2 > 1; // 批量推进（10年/100年批）时低品质事件自动静默决策——一次行动不再连环弹卡；红/金/黑/链/特殊事件照常弹出中断
  return n2;
}
function ayLoop(g, kind, n2){ // 年限推进循环——doActionYear + 事件结算 + 中断/渡劫逐年截断（返回实际推进年数）
  const _isResume = !!g._stepRemain;
  let _used = 0;
  for(let i=0;i<n2;i++){
    _used = i+1;
    doActionYear(kind);
    if(!g.alive) break;
    const r = triggerEvent(true, (i>0) || _isResume); // /h：品质池事件按行动判定——批量时仅批次首年判一次（中断续跑不再重判）；其余年份只跑强制钩子（招揽/元始令/魔渊/链/婚姻按年照常）
    if(!g.alive) break;
    if(r === true){ g._stepRemain = n2-i-1; g._evPause = true; break; }   // 手动/高品质事件：中断闭关（XL_RS 4.68：'event' 分支永不命中——triggerEvent 只返回 true/'silent'/false，删除冗余）
    if(r === 'silent'){
      // 静默结算内若弹出事件链卡片（强制链环节），中断等待处理
      if($('eventBox') && $('eventBox').querySelector('.eventcard')){ g._stepRemain = n2-i-1; break; }
      continue; // 静默结算完成（当年已在 resolveEvent 内推进）
    }
    endYear(true);
    if(!g.alive || g.godTitle) break;
    // 渡劫期强制逐年——入劫后截断批量推进（含大乘巅批次内破境入劫场景，剩余年份不再连渡）
    if(isDujieOf()){ g._stepRemain = 0; break; } // 渡劫期统一判定（含挂起排除）
  }
  return _used;
}
// XL_RS：事件选项门槛判定（静默自动决策用，与 showEvent 禁用逻辑一致）
function optEnabled(o, g){
  if(!o || !o.need) return true;
  const n = o.need;
  if(n.realm !== undefined && !reqRealmPass(g, n)) return false; // v4.349 realm 语义
  if(n.lv && !reqLvPass(g, n.lv)) return false;
  if(n.attr){ for(const k in n.attr){ if(g.a[k] < n.attr[k]) return false; } }
  if(n.prestige && g.prestige < n.prestige) return false;
  if(n.money && g.money < n.money) return false;
  return true;
}
// XL_RS：静默事件自动决策（复刻 autoAct 的性格风险偏好）
function autoPickIdx(ev){
  const g = G;
  const opts = (ev.opts||[]).map((o,i)=>({o,i})).filter(x=>optEnabled(x.o,g));
  if(!opts.length) return 0;
  const _risk = (PERS_BY_NAME[g.personality||'']||{}).evRisk || 0;
  // 4.290：超大函数拆分——六类决策抽 6 子函数（null=未命中继续下一条）
  let _r = apiSha(opts, _risk); if(_r!==null) return _r;
  _r = apiOrg(ev, opts); if(_r!==null) return _r;
  _r = apiMo(opts); if(_r!==null) return _r;
  _r = apiSpouse(ev, opts); if(_r!==null) return _r;
  _r = apiMarket(ev, opts); if(_r!==null) return _r;
  return apiRisk(opts, _risk);
}
function apiSha(opts, _risk){ // 幽冥魔渊入口——仅勇猛/豪迈踏入；99 级飞升窗口期不涉险
  const _sha = opts.find(x=>x.o._shaEnter);
  if(!_sha) return null;
  const _godWin = G.realm >= 9;
  if(_risk>=2 && !_godWin) return _sha.i;
  const _safe = opts.find(x=>!x.o._shaEnter);
  return _safe ? _safe.i : _sha.i;
}
function apiOrg(ev, opts){ // 宗门择主静默决策——85% 正派优先、15% 入魔道宗、无正派则散修（/4.99）
  if(!ev._orgSelect) return null;
  const _zheng = opts.find(x=>x.o._org && ['天尸宗','阴冥宗','血煞宗'].indexOf(x.o._org)<0);
  if(_zheng && Math.random() >= 0.15) return _zheng.i;
  const _mo = opts.find(x=>x.o._org && ['天尸宗','阴冥宗','血煞宗'].indexOf(x.o._org)>=0);
  if(_mo) return _mo.i;
  const _san = opts.find(x=>!x.o._org);
  return _san ? _san.i : 0;
}
function apiMo(opts){ // 魔道宗门自动决策——入魔道者走邪路（优先业力选项，与正道安全优先对称）
  if(!(G.org && ['天尸宗','阴冥宗','血煞宗'].indexOf(G.org)>=0)) return null;
  const _ye = opts.find(x=>x.o.eff && (x.o.eff.业力||0)>0);
  return _ye ? _ye.i : null;
}
function apiSpouse(ev, opts){ // 道侣事件自动决策——优先无风险正羁绊，其次正羁绊 roll（AI 积极经营羁绊）
  if(!ev.spouseEv) return null;
  const _bp = opts.find(x=>x.o.eff && (x.o.eff.bond||0)>0 && !x.o.roll);
  if(_bp) return _bp.i;
  const _br = opts.find(x=>x.o.roll && x.o.roll.succ && (x.o.roll.succ.bond||0)>0);
  if(_br) return _br.i;
  return opts[0].i;
}
function apiMarket(ev, opts){ // 坊市事件自动决策——优先无风险正收益（非灵石键），其次正收益 roll（AI 敢于小赌）
  if(!ev.marketEv) return null;
  const _mp = opts.find(x=>x.o.eff && !x.o.roll && Object.keys(x.o.eff).some(k=>k!=='灵石' && (x.o.eff[k]||0)>0));
  if(_mp) return _mp.i;
  const _mr = opts.find(x=>x.o.roll && x.o.roll.succ && Object.keys(x.o.roll.succ).some(k=>k!=='灵石' && (x.o.roll.succ[k]||0)>0));
  if(_mr) return _mr.i;
  return opts[0].i;
}
function apiRisk(opts, _risk){ // 性格风险偏好兜底——勇猛/豪迈敢赌高成功率 roll，沉稳/隐忍只选无风险
  if(_risk>=2){ const t = opts.find(x=>x.o.roll && (x.o.roll.chance||0)>=0.75) || opts.find(x=>!x.o.roll); return t ? t.i : 0; }
  if(_risk===1){ const t = opts.find(x=>!x.o.roll) || opts.find(x=>x.o.roll && (x.o.roll.chance||0)>=0.8); return t ? t.i : 0; }
  const t = opts.find(x=>!x.o.roll); return t ? t.i : opts[0].i;
}

// 悟性成长难度——越接近上限越难涨（55 后减半、80 后仅 1/5），防止悟性人人满值、凸显图鉴/轮回殿加成价值
function gainWu(n){
  const w = (typeof G!=='undefined' && G && G.a) ? G.a.悟性 : 0;
  let m = 1;
  if(w >= 80) m = 0.05; // 悟性衰减强化 80+×0.1→×0.05
  else if(w >= 55) m = 0.3; // 55+×0.4→×0.3
  else if(w >= 40) m = 0.65;
  const raw = n * 0.25 * m * orgWuMult() * gongfaWuMult(); // 功法悟性加成
  if(w >= 80) return Math.max(0, raw); // 80+ 档返回实际小数（可 0）——杜绝 ceil+max(1) 保底 +1 使衰减失效（筑基就满值根因）
  return Math.max(1, Math.ceil(Math.ceil(raw)));
}
// 基础行动悟性增加也受衰减（小数版本，用于苦修/交游的固定悟性增长）
function gainWuSmall(n){
  const w = (typeof G!=='undefined' && G && G.a) ? G.a.悟性 : 0;
  let m = 1;
  if(w >= 80) m = 0.05; // 悟性衰减强化 80+×0.1→×0.05
  else if(w >= 55) m = 0.3; // 55+×0.4→×0.3
  else if(w >= 40) m = 0.65;
  return n * m * gongfaWuMult(); // 功法悟性加成
}
function clampAll(){
  FIGHT_ATTRS.forEach(k=>{ G.a[k]=Math.max(0, G.a[k]); }); // 战斗四维无上限
  OTHER_ATTRS.forEach(k=>{ G.a[k]=clamp(G.a[k],1,100); });
  if(G.money!==undefined) G.money = Math.max(0, G.money);
  if(G.prestige!==undefined) G.prestige = Math.max(0, G.prestige);
}

/* ============ 势力 / 师承 ============ */
/* ============ 势力被动（DL_RS_4.141：势力差异化被动，加入即生效） ============ */
/* ============ 功法神通体系（DL_RS_4.225）：藏经阁贡献兑换、入宗免费择一 ============
   功法（主修 100% / 辅修 50%）：增加修炼速度或特殊属性（悟性）；
   神通（最多同时装备 6 门）：增加战斗四维（力量/灵动/气血/神识）。
   来源：各势力藏经阁（消耗贡献兑换；入宗时藏经阁免费择一）。 */
/* GONGFAS 已外置 data 文件 */;
/* 功法/神通品质——按效果强弱自动分档（黄/玄/地/天 → 蓝/紫/红/金）
   功法强度=cult%+悟性%；神通强度=四维%之和。天≥10(功)/≥16(神)、地≥7/≥12、玄≥5/≥9、黄以下 */
function artTierOf(obj, kind){
  if(obj && obj.special === true) return '天'; // 特殊功法（混沌经——不入常规效果链，直接定级天）
  const eff = obj && obj.eff ? obj.eff : {};
  let s = 0;
  if(kind==='gongfa'){
    s = Math.round(((eff.cult||0) + (eff.悟性||0)) * 100);
    if(s >= 10) return '天';
    if(s >= 7)  return '地';
    if(s >= 5)  return '玄';
    return '黄';
  }
  ['力量','灵动','气血','神识'].forEach(k=>{ s += Math.round((eff[k]||0)*100); });
  if(s >= 16) return '天';
  if(s >= 12) return '地';
  if(s >= 9)  return '玄';
  return '黄';
}
const ART_TIER_COLOR = {黄:'#4f8bd6', 玄:'#9b6ae0', 地:'#d95757', 天:'#c9a227'}; // 黄蓝/玄紫/地红/天金
function artTierName(id, tbl){ return artTierOf(tbl[id], tbl===GONGFAS ? 'gongfa' : 'shentong'); }
/* SHENTONGS 已外置 data 文件 */;
function orgReqPass(org){
  const g=G, r=ORG_REQ[org];
  if(!r) return {pass:true};
  if(g.age < r.minAge) return {pass:false, reason:'需年满'+r.minAge+'岁'};
  return r.check(g);
}

function orgTrend(k){
  if(!G || !G.org || !ORG_BONUS[G.org]) return 1;
  const t = ORG_BONUS[G.org].trend;
  return (t && t[k]) ? t[k] : 1;
}
/* 灵根属性契合——功法/神通附加属性（attr），灵根含同属性时获得加成；
   灵根越单纯加成越高：天/异灵根=15%、双=7.5%、三=5%、四=3.75%、五行杂=3%；圣灵根（五行俱全）额外+5% */
const EL5_ATTR = ['金','木','水','火','土'], SP3_ATTR = ['风','雷','冰'];
function soulAttrsOf(soul){
  if(!soul) return [];
  const n = soul.name || '';
  if(n==='无灵根') return [];
  if(n==='五行杂灵根' || n==='圣灵根') return EL5_ATTR.slice();
  return EL5_ATTR.concat(SP3_ATTR).filter(e=>n.indexOf(e)>=0);
}
function attrMatchBonus(attr){
  if(!attr || typeof G==='undefined' || !G || !G.soul) return 0; // 开局前（图鉴/主菜单）G 未初始化防御
  const g=G;
  const attrs = soulAttrsOf(g.soul);
  if(!attrs.length || attrs.indexOf(attr)<0) return 0;
  const base = 0.15 / attrs.length;
  return g.soul.quality==='she' ? base + 0.05 : base;
}
/* 功法/神通属性标签（带色）+ 当前灵根契合提示 */
const ATTR_COLOR = {金:'#ffd76e', 木:'#9fe08a', 水:'#7ec8ff', 火:'#ff8a5c', 土:'#d9b98a', 风:'#a8e6a1', 雷:'#9db8ff', 冰:'#8fd8ff'};
function artAttrHtml(id, tbl){
  const it = tbl[id];
  if(!it || !it.attr) return '';
  const col = ATTR_COLOR[it.attr] || '#ccc';
  const ab = attrMatchBonus(it.attr);
  const hit = ab>0 ? ` <span style="color:#7ecb7e;font-size:11px">灵根契合 +${Math.round(ab*100)}%</span>` : '';
  return `<span style="font-size:11px;color:${col};border:1px solid ${col};border-radius:4px;padding:0 4px;margin:0 4px 0 2px">${it.attr}</span>${hit}`;
}
/* 功法/神通效果数值标签（修炼/悟性/四维加成）——弹窗内与属性标签并列显示，此前只有描述、效果不可见 */
const EFF_NAMES = {cult:'修炼', 悟性:'悟性', 力量:'力量', 灵动:'灵动', 气血:'气血', 神识:'神识'};
function artEffHtml(id, tbl, lvMult){ // lvMult：参悟层数倍率（功法传入，神通不传）
  const it = tbl[id];
  if(!it || !it.eff) return '';
  const parts = [];
  for(const k in it.eff){
    let v = it.eff[k];
    if(!v) continue;
    if(lvMult) v = v * lvMult; // 显示当前层数实际效果
    const nm = EFF_NAMES[k] || k;
    parts.push(nm+(v>0?'+':'')+Math.round(v*100)+'%');
  }
  return parts.length ? ` <span style="color:#d9a05b;font-size:11px">【${parts.join(' ')}】</span>` : '';
}
/* 功法修炼加成：主修全效 + 辅修半效（仅 cult 键）；XL_RS 4.48c：灵根契合改乘算——契合加成独立乘区，放大功法实际效果 */
/* 功法参悟——层数系统（1~9 层，每层效果+12%，9层满≈1.96x） */
function gongfaLvOf(id){ // 参悟层数（默认 1）
  return Math.min(9, Math.max(1, (G.gongfaLv||{})[id] || 1));
}
function gongfaLvMult(id){ // 层数倍率：1+(层-1)×0.12
  return 1 + (gongfaLvOf(id)-1)*0.12;
}
function gongfaLvName(id){ // 修仙风层名：第几重（1~9）
  const _cn = ['','一','二','三','四','五','六','七','八','九'];
  return '第' + (_cn[gongfaLvOf(id)] || gongfaLvOf(id)) + '重';
}
function wuGongfaCost(id){ // 参悟灵石：200×层×品质系数（黄1/玄2/地3/天4）
  const _t = artTierName(id, GONGFAS);
  const _q = _t==='天'?4 : _t==='地'?3 : _t==='玄'?2 : 1;
  return 200 * gongfaLvOf(id) * _q;
}
function wuGongfaRate(id){ // 参悟成功率：60% + (悟性-50)×0.3% + 道心×0.1% - 层×2%，钳 5%~90%
  const g=G;
  let p = 0.60 + (g.a.悟性-50)*0.003 + ((g.daoXin||50)-50)*0.001 - gongfaLvOf(id)*0.02;
  return Math.max(0.05, Math.min(0.90, p));
}
function doWuGongfa(id){ // 参悟：消耗 10 年+灵石，成功层+1（<=9），失败不掉层
  const g=G;
  const f=GONGFAS[id]; if(!f) return;
  if((g.gongfaOwned||[]).indexOf(id) < 0) return;
  if(gongfaLvOf(id) >= 9){ addLog('「'+id+'」已臻九层圆满，参悟无可精进。','note'); return; }
  const _cost = wuGongfaCost(id);
  if((g.money||0) < _cost){ addLog('灵石不足，无法参悟功法（需 '+_cost+' 灵石）。','bad'); renderArt(); return; }
  if(g.age + 10 > lifeCapOf()){ addLog('寿元不足以支撑十年参悟。','bad'); return; }
  g.money -= _cost; g.age += 10;
  const _p = wuGongfaRate(id);
  if(Math.random() < _p){
    g.gongfaLv = g.gongfaLv || {}; g.gongfaLv[id] = gongfaLvOf(id) + 1;
    addLog('—— <b>功法参悟</b>：十年闭关，你于「'+id+'」上更进一层（'+gongfaLvName(id)+'，效果 ×'+gongfaLvMult(id).toFixed(2)+'）。——','good');
  } else {
    addLog('功法参悟失败：瓶颈难破，十年时光与灵石付诸东流（成功率 '+Math.round(_p*100)+'%）。','bad');
  }
  syncArtBonus(); clampAll(); closeArt(); renderGame(); renderArt();
}
function gongfaCultMult(){ // 功法修炼加成全加算（主修/辅修/灵根契合同层累加）
  const g=G; let m=1, match=1;
  const gf = g.gongfa || {};
  if(gf.main){ const f=GONGFAS[gf.main]; if(f){ if(f.eff.cult) m += f.eff.cult * gongfaLvMult(gf.main); if(f.eff.cult && f.attr) match += attrMatchBonus(f.attr); } } // 参悟层数倍率
  if(gf.sub){ const f=GONGFAS[gf.sub]; if(f){ if(f.eff.cult) m += f.eff.cult*0.5 * gongfaLvMult(gf.sub); if(f.eff.cult && f.attr) match += attrMatchBonus(f.attr)*0.5; } }
  return m + (match - 1);
}
/* 功法悟性加成（悟性成长 ×(1+主修+辅修半效)）——灵根契合同为乘算 */
function gongfaWuMult(){
  const g=G; let m=1, match=1;
  const gf = g.gongfa || {};
  if(gf.main){ const f=GONGFAS[gf.main]; if(f){ if(f.eff.悟性) m += f.eff.悟性 * gongfaLvMult(gf.main); if(f.eff.悟性 && f.attr) match += attrMatchBonus(f.attr); } } // 参悟层数倍率
  if(gf.sub){ const f=GONGFAS[gf.sub]; if(f){ if(f.eff.悟性) m += f.eff.悟性*0.5 * gongfaLvMult(gf.sub); if(f.eff.悟性 && f.attr) match += attrMatchBonus(f.attr)*0.5; } }
  return m * match;
}
/* 神通四维加成（装备 ≤6 门，百分比） */
function shentongBonus(){
  const g=G, out={力量:0,灵动:0,气血:0,神识:0};
  (g.shentong||[]).forEach(id=>{ const st=SHENTONGS[id]; if(st){
    const ab = st.attr ? attrMatchBonus(st.attr) : 0; // 灵根属性契合乘算（独立乘区）
    const mult = 1 + ab;
    Object.keys(st.eff).forEach(k=>{ out[k]=(out[k]||0)+st.eff[k]*mult; });
  } });
  return out;
}
/* 已拥有功法/神通是否可入库 */
function ownGongfa(id){ return (G.gongfaOwned||[]).indexOf(id)>=0; }
function ownShentong(id){ return (G.shentongOwned||[]).indexOf(id)>=0; }
/* 天级功法特殊效果（寿元/气运/渡劫）——按装备主修100%/辅修50%结算，装备变更时同步（气运动态加减） */
function syncArtBonus(){
  const g=G; if(!g || !g.gongfa) return;
  let life=0, luck=0, trib=0;
  const _ids = [g.gongfa.main, g.gongfa.sub];
  _ids.forEach((id,i)=>{
    const f = id && GONGFAS[id]; if(!f || !f.bonus) return;
    const m = i===0 ? 1 : 0.5;
    life += Math.round((f.bonus.寿元||0)*m * gongfaLvMult(id)); // 参悟层数倍率
    luck += (f.bonus.气运||0)*m * gongfaLvMult(id);
    trib += (f.bonus.渡劫||0)*m * gongfaLvMult(id);
  });
  const prevLuck = g._artBonusLuck || 0;
  if(prevLuck){ g.a.气运 = Math.max(0, Math.round(((g.a.气运||0) - prevLuck)*10)/10); }
  g._artBonusLuck = luck;
  g.a.气运 = Math.round(((g.a.气运||0) + luck)*10)/10;
  g._artBonus = {寿元:life, 渡劫:trib};
}
function equipGongfa(id, slot){
  const g=G; g.gongfa = g.gongfa || {main:null, sub:null};
  if(slot==='main'){
    if(g.gongfa.main===id){ g.gongfa.main=null; addLog(`卸下功法「${id}」。`,'sys'); }
    else { if(g.gongfa.sub===id) g.gongfa.sub=null; g.gongfa.main=id; addLog(`<b>主修功法</b>改为「${id}」（100% 效果）。`,'good'); }
  } else {
    if(g.gongfa.sub===id){ g.gongfa.sub=null; addLog(`卸下功法「${id}」。`,'sys'); }
    else { if(g.gongfa.main===id) g.gongfa.main=null; g.gongfa.sub=id; addLog(`<b>辅修功法</b>改为「${id}」（50% 效果）。`,'good'); }
  }
  syncArtBonus(); // 装备变更同步天级功法特殊效果
  renderGame(); renderCang();
}
function equipShentong(id){
  const g=G; g.shentong = g.shentong || [];
  const i = g.shentong.indexOf(id);
  if(i>=0){ g.shentong.splice(i,1); addLog(`卸下神通「${id}」。`,'sys'); }
  else {
    if(g.shentong.length>=6){ addLog('神通位已满（最多 6 门），先卸下一门。','bad'); return; }
    g.shentong.push(id); addLog(`<b>装备神通</b>「${id}」。`,'good');
  }
  renderGame(); renderCang();
}
/* 自动模式自动装配功法神通——主修=已习得中最强、辅修=次强、神通=前6强；仅变化时渲染，幂等 */
function autoEquipArt(){
  const g=G;
  if(!g || !g.alive) return;
  // 异宗功法不可装备（散修/本宗/坊市功法可）——防御旧档遗留
  const _gfOk = id=>{ const _o=GONGFAS[id]&&GONGFAS[id].org; return !_o || _o==='坊市' || _o==='奇遇' || !g.org || g.org===_o; }; // 奇遇功法（金事件天级）全势力可装备
  const _stOk = id=>{ const _o=SHENTONGS[id]&&SHENTONGS[id].org; return !_o || _o==='坊市' || _o==='奇遇' || !g.org || g.org===_o; }; // 奇遇神通全势力可装备
  const gf = g.gongfa = g.gongfa || {main:null, sub:null};
  const st = g.shentong = g.shentong || [];
  // 4.237：超大函数拆分——强度/排序/采购/法宝拆 4 子函数
  // 自动坊市采购——功法主/副或神通槽有空位且灵石充足时，自动购买坊市最强空缺（每次至多 1 件，留 200 灵石缓冲防掏空）
  let bought = autoEquipArtBuy(g);
  const ownedGf = (g.gongfaOwned||[]).filter(_gfOk), ownedSt = (g.shentongOwned||[]).filter(_stOk);
  if(!ownedGf.length && !ownedSt.length && !(g.bones||[]).length && !bought) return;
  let changed = bought;
  if(ownedGf.length){
    const gfBest = artSort(ownedGf, GONGFAS);
    if(gfBest.length){
      const b1 = gfBest[0];
      if(gf.main !== b1){ gf.main = b1; addLog(`<b>自动主修</b>「${b1}」（100% 效果）。`,'good'); changed = true; }
      const rest = gfBest.filter(id=>id!==gf.main);
      const b2 = rest.length ? rest[0] : null;
      if(gf.sub !== b2){ gf.sub = b2; if(b2) addLog(`<b>自动辅修</b>「${b2}」（50% 效果）。`,'good'); changed = true; }
    }
  }
  // 神通：按强度填满 6 槽
  if(ownedSt.length && st.length<6){
    const stBest = artSort(ownedSt, SHENTONGS);
    for(const id of stBest){
      if(st.length>=6) break;
      if(st.indexOf(id)<0){ st.push(id); addLog(`<b>自动装备神通</b>「${id}」。`,'good'); changed = true; }
    }
  }
  // 法宝自动装备——每部位装备已持有中品阶最高者（仙器>宝器>灵器>凡器）
  if(autoEquipArtBone(g)) changed = true;
  if(changed){ syncArtBonus(); renderGame(); renderArt && renderArt(); } // 装备变更同步天级功法特殊效果
}
function artPower(id){ // 功法/神通强度——正效求和 + 灵根契合度加成
  let t=0; const e=GONGFAS[id]||SHENTONGS[id];
  if(e && e.eff){ for(const k in e.eff){ if(e.eff[k]>0) t+=e.eff[k]; } }
  if(e && e.attr) t += attrMatchBonus(e.attr);
  return t;
}
function artSort(arr, pool){ // 按强度降序排序并过滤池内存在
  return arr.slice().sort((a,b)=>artPower(b)-artPower(a)).filter(id=>pool[id]);
}
function autoEquipArtBuy(g){ // 自动坊市采购——功法主/副或神通槽有空位且灵石充足时购坊市最强空缺（每次至多 1 件，留 500 灵石缓冲）
  let bought = false;
  const _needGf = !g.gongfa.main || !g.gongfa.sub;
  const _needSt = g.shentong.length < 6;
  if(_needGf || _needSt){
    const _money = g.money||0;
    const _shopGfPool = Object.keys(GONGFAS).filter(id=>GONGFAS[id].org==='坊市' && (g.gongfaOwned||[]).indexOf(id)<0);
    const _shopStPool = Object.keys(SHENTONGS).filter(id=>SHENTONGS[id].org==='坊市' && (g.shentongOwned||[]).indexOf(id)<0);
    if(_needGf && _shopGfPool.length && _money >= 200+500){ // 采购留 500 灵石缓冲，防批量行动掏空
      const _b = artSort(_shopGfPool, GONGFAS)[0];
      g.money = _money - 200;
      (g.gongfaOwned = g.gongfaOwned||[]).push(_b);
      atlasGain('gongfas', _b);
      addLog(`<b>自动采购</b>坊市购得功法「${_b}」（200 灵石）——${GONGFAS[_b].desc}。`,'good');
      bought = true;
    } else if(_needSt && _shopStPool.length && _money >= 150+500){
      const _b = artSort(_shopStPool, SHENTONGS)[0];
      g.money = _money - 150;
      (g.shentongOwned = g.shentongOwned||[]).push(_b);
      atlasGain('shentongs', _b);
      addLog(`<b>自动采购</b>坊市购得神通「${_b}」（150 灵石）——${SHENTONGS[_b].desc}。`,'good');
      bought = true;
    }
  }
  return bought;
}
function autoEquipArtBone(g){ // 法宝自动装备——每部位装备已持有中品阶最高者（仙器>宝器>灵器>凡器，本命占槽跳过）
  const _gRank = gr => gr==='仙器' ? 3 : gr==='宝器' ? 2 : gr==='灵器' ? 1 : 0;
  const bones2 = g.bones||[];
  let changed = false;
  if(bones2.length){
    const eq2 = g.boneEquip = g.boneEquip||{};
    for(const _bs of BONE_SLOTS){
      if(g.extraBone && g.extraBone.slot===_bs) continue; // 本命占槽不自动装备
      const cand = bones2.filter(b=>b.slot===_bs);
      if(!cand.length) continue;
      const best = cand.slice().sort((a,b)=>_gRank(b.grade)-_gRank(a.grade) || (b.pct||0)-(a.pct||0))[0];
      if(eq2[_bs] !== best.id){
        eq2[_bs] = best.id;
        addLog(`<b>自动装备法宝</b>「${best.grade}·${best.name}」（${best.main}+${best.pct}%）。`,'good');
        changed = true;
      }
    }
  }
  return changed;
}
function gongfaCost(id){ const f=GONGFAS[id]; return f ? (f.org==='元始宗' ? 240 : 120) : 0; }
function shentongCost(id){ const st=SHENTONGS[id]; return st ? (st.org==='元始宗' ? 160 : 90) : 0; }
/* 主界面右侧「功法 · 神通」面板——8 个装备槽（主修/辅修 + 神通6），点击槽位弹窗选择 */
function renderArt(){
  const g=G, p=$('artPanel'); if(!p) return;
  const eq = g.gongfa||{main:null, sub:null};
  const stOn = g.shentong||[];
  // 4.312：签名门——功法(含层数)/神通/法宝装备集合无变化则跳过重建（挂机 200ms 渲染不再全量刷低频面板）
  const _sig = (eq.main||'')+'|'+gongfaLvOf(eq.main)+'|'+(eq.sub||'')+'|'+gongfaLvOf(eq.sub)+'|'+(stOn||[]).join(',')+'|'
    + BONE_SLOTS.map(function(_bs){ var _b=boneEquipped(_bs); var _bm=(g.extraBone&&g.extraBone.slot===_bs)?g.extraBone:null; return _bm?('本'+_bm.name+_bm.pct):(_b?(_b.name+_b.pct):'-'); }).join(',');
  if(p._sig === _sig) return;
  p._sig = _sig;
  // 4.262：超大函数拆分——槽位工厂/功法/神通/法宝区抽 4 子函数
  let h = '';
  h += artSectionGongfa(eq);
  h += artSectionShentong(stOn);
  h += artSectionBones(g);
  p.innerHTML = h;
}
function artSlot(label, txt, empty, oc){ // 槽位工厂——空态提示/装备态样式/点击弹窗
  let tip='点击选择', sub='';
  if(empty){
    tip = (label==='主修'||label==='辅修') ? '未装备 · 入宗免费择一或奇遇习得'
        : (label.indexOf('神通')===0) ? '未装备 · 藏经阁/奇遇习得'
        : (label==='本命') ? '未装备 · 机缘铸成本命'
        : (label==='武器'||label==='法衣'||label==='鞋履'||label==='饰品') ? '未装备 · 装备后 '+BONE_ATTR[label]+' 加成'
        : '未装备 · 坊市/猎妖/奇遇可得';
    sub = '<span style="font-size:9px;color:var(--dim);opacity:.75">'+tip.slice(4)+'</span>';
  }
  return '<div style="border:1px solid '+(empty?'#3a3a44':'var(--gold2)')+';border-radius:8px;padding:6px 8px;cursor:pointer;min-height:42px;display:flex;flex-direction:column;justify-content:center;gap:1px;background:rgba(255,255,255,.02)" title="'+tip+'" onclick="'+oc+'">'
    + '<span style="font-size:10.5px;color:var(--dim)">'+label+'</span>'
    + '<span style="font-size:12px;color:'+(empty?'var(--dim)':'var(--gold)')+';font-weight:700">'+txt+'</span>'
    + sub + '</div>';
}
function artSectionGongfa(eq){ // 功法区——主修100%/辅修50%，槽位显示参悟层数；未装备折叠单行（4.341）
  let h = '<div style="font-size:12px;color:var(--gold);margin-bottom:6px">—— 功法（主修100% / 辅修50%）——</div>';
  if(!eq.main && !eq.sub){ h += '<div style="border:1px dashed #3a3a44;border-radius:8px;padding:7px 10px;cursor:pointer;font-size:12px;color:var(--dim);margin-bottom:10px" onclick="openArtSlot(\'gf\',\'main\')">功法 未装备 · 入宗免费择一或奇遇习得（点击选择）</div>'; return h; }
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">' // 槽位显示参悟层数
    + artSlot('主修', eq.main?(escapeHtml(eq.main)+' <span style="font-size:10px;color:var(--dim)">'+gongfaLvName(eq.main)+'</span>'):'未装备', !eq.main, "openArtSlot('gf','main')")
    + artSlot('辅修', eq.sub?(escapeHtml(eq.sub)+' <span style="font-size:10px;color:var(--dim)">'+gongfaLvName(eq.sub)+'</span>'):'未装备', !eq.sub, "openArtSlot('gf','sub')")
    + '</div>';
  return h;
}
function artSectionShentong(stOn){ // 神通区——6 槽；全空折叠单行（4.341）
  let h = '<div style="font-size:12px;color:var(--gold);margin-bottom:6px">—— 神通（'+stOn.length+'/6）——</div>';
  if(!stOn.length){ h += '<div style="border:1px dashed #3a3a44;border-radius:8px;padding:7px 10px;cursor:pointer;font-size:12px;color:var(--dim)" onclick="openArtSlot(\'st\',\'0\')">神通 0/6 未装备 · 藏经阁/奇遇习得（点击装备）</div>'; return h; }
  h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">';
  for(let i=0;i<6;i++){
    const id = stOn[i]||null;
    h += artSlot('神通'+(i+1), id?escapeHtml(id):'未装备', !id, "openArtSlot('st','"+i+"')");
  }
  h += '</div>';
  return h;
}
function artSectionBones(g){ // 法宝装备区——2 列槽位（含本命占槽专属样式，仅装备后加成生效）；全空折叠单行（4.341）
  let h = '<div style="font-size:12px;color:var(--gold);margin:10px 0 6px">—— 法宝（装备后生效 · 百分比加成）——</div>';
  const _any = BONE_SLOTS.some(function(_bs){ return (g.extraBone && g.extraBone.slot===_bs) ? true : !!boneEquipped(_bs); });
  if(!_any){ h += '<div style="border:1px dashed #3a3a44;border-radius:8px;padding:7px 10px;cursor:pointer;font-size:12px;color:var(--dim)" onclick="openArtSlot(\'bone\',\'武器\')">法宝 未装备 · 装备后 力量/气血/灵动/神识 加成（点击装备）</div>'; return h; }
  h += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px">';
  for(const _bs of BONE_SLOTS){
    const _bm = g.extraBone && g.extraBone.slot===_bs ? g.extraBone : null;
    const _b = _bm || boneEquipped(_bs);
    h += artSlot(_bs, _bm ? '本命·'+escapeHtml(_bm.name)+'（'+(_bm.main||'')+'+'+(_bm.pct||0)+'%·'+(_bm.sub||'')+'+'+(_bm.pct||0)+'%）' : (_b?(escapeHtml(_b.name)+'（'+( _b.main||'')+'+'+(_b.pct||0)+'%）'):'未装备'), !_b, _bm ? '' : "openArtSlot('bone','"+_bs+"')"); // 本命占槽显示专属样式
  }
  h += '</div>';
  return h;
}
/* 点击槽位弹出选择窗 */
function openArtSlot(type, slot){
  const g=G, m=$('artModal'); if(!m) return;
  document.body.appendChild(m); // 层级兜底
  let title = '', items = [];
  // 4.232：超大函数拆分——功法/法宝/神通三分支列表构建拆 3 子函数
  if(type==='gf'){
    title = slot==='main' ? '选择主修功法' : '选择辅修功法';
    items = openArtSlotGf(g, slot);
  } else if(type==='bone') {
    title = '装备'+slot+'法宝（'+BONE_ATTR[slot]+'加成 · 装备后生效）';
    const _bone = openArtSlotBone(g, slot); // 本命法宝占用时返回 {block:true}（已提示）
    if(_bone.block){ closeArt(); renderGame(); return; }
    items = _bone.items;
  } else {
    title = '装备神通（最多 6 门）';
    items = openArtSlotSt(g, slot);
  }
  if(items.length<=1){
    if(type==='bone'){
      items = ['<div class="muted" style="padding:8px 0">尚未获得法宝——可经奇遇、秘境际遇获得，或出生时携带法宝命格。</div>'];
    } else {
      items = ['<div class="muted" style="padding:8px 0">尚未习得——加入宗门后可在藏经阁兑换（入宗可免费择一），或经奇遇习得。</div>'];
    }
  }
  m.innerHTML = '<div class="evmodal" onclick="if(event.target===this)closeArt()"><div class="evmodal-card">'
    + '<div class="evmodal-head"><b>'+title+'</b><button class="cl" onclick="closeArt()">✕</button></div>'
    + '<div class="evmodal-txt">'+items.join('')+'</div></div></div>';
  m.style.display = 'flex';
}
function openArtSlotGf(g, slot){ // 功法槽列表（主/辅修——含装备中标记/参悟层数/参悟按钮/卸下）
  const cur = slot==='main' ? (g.gongfa||{}).main : (g.gongfa||{}).sub;
  const items = [];
  (g.gongfaOwned||[]).forEach(id=>{
    const f=GONGFAS[id]; if(!f) return;
    const on = id===cur;
    const _lv = gongfaLvOf(id); // 参悟层数
    const _cn = ['','一','二','三','四','五','六','七','八','九'];
    items.push(`<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 2px;border-bottom:1px dashed #3a3a44">
      <div style="cursor:pointer;flex:1" onclick="artChoose('gf','${slot}','${id}')"><b style="color:${on?'var(--gold)':ART_TIER_COLOR[artTierName(id, GONGFAS)]}">${escapeHtml(id)}</b><span class="muted" style="font-size:10px"> · ${artTierName(id, GONGFAS)}</span> ${artAttrHtml(id, GONGFAS)} ${on?'<span style="color:var(--gold);font-size:11px">✓ 装备中</span>':''}${artEffHtml(id, GONGFAS, gongfaLvMult(id))}<span class="muted" style="font-size:11px">${_cn[_lv]||_lv}重（×${gongfaLvMult(id).toFixed(2)}） · ${escapeHtml((f.desc||'').replace(/——[^，]*\+[\d.]+%(?:、[^，]*\+[\d.]+%)?/, '').replace(/^，\s*/, ''))}</span></div>
      ${_lv>=9?'<span class="muted" style="font-size:10px;white-space:nowrap">九层圆满</span>':`<button class="btn mini" style="white-space:nowrap" onclick="event.stopPropagation(); doWuGongfa('${id}')" title="闭关十年参悟（灵石 ${wuGongfaCost(id)} · 成功率 ${Math.round(wuGongfaRate(id)*100)}%）">参悟 ${_cn[_lv]||_lv}重→${_cn[_lv+1]||(_lv+1)}重</button>`}</div>`);
  });
  items.push(`<div style="padding:7px 2px;cursor:pointer;color:var(--dim)" onclick="artChoose('gf','${slot}','__none__')">（卸下）</div>`);
  return items;
}
function openArtSlotBone(g, slot){ // 法宝槽列表（含本命占用检查/装备中标记/卸下）——本命占位返回 {block:true}
  if(g.extraBone && g.extraBone.slot===slot){
    addLog('此法宝位已被本命法宝「'+(g.extraBone.name||'')+'」占据，无法装备其他法宝。','note');
    return {block:true};
  }
  const items = [];
  const cur = (g.boneEquip||{})[slot];
  (g.bones||[]).forEach(b=>{
    if(b.slot!==slot) return;
    const on = b.id===cur;
    items.push(`<div style="padding:7px 2px;border-bottom:1px dashed #3a3a44;cursor:pointer" onclick="artChoose('bone','${slot}','${b.id}')"><b style="color:${on?'var(--gold)':''}">${escapeHtml(b.grade)}·${escapeHtml(b.name)}</b> ${on?'<span style="color:var(--gold);font-size:11px">✓ 装备中</span>':''}<span class="muted" style="font-size:11px">${BONE_ATTR[slot]}+${b.pct}%${b.skill?('·'+escapeHtml(b.skill)):''}</span></div>`);
  });
  items.push(`<div style="padding:7px 2px;cursor:pointer;color:var(--dim)" onclick="artChoose('bone','${slot}','__none__')">（卸下）</div>`);
  return {items};
}
function openArtSlotSt(g, slot){ // 神通槽列表（最多 6 门——含已装备标记/卸下）
  const items = [];
  const stOn = g.shentong||[];
  (g.shentongOwned||[]).forEach(id=>{
    const st=SHENTONGS[id]; if(!st) return;
    const on = stOn.indexOf(id)>=0;
    items.push(`<div style="padding:7px 2px;border-bottom:1px dashed #3a3a44;cursor:pointer" onclick="artChoose('st','${slot}','${id}')"><b style="color:${on?'var(--gold)':ART_TIER_COLOR[artTierName(id, SHENTONGS)]}">${escapeHtml(id)}</b><span class="muted" style="font-size:10px"> · ${artTierName(id, SHENTONGS)}</span> ${artAttrHtml(id, SHENTONGS)} ${on?'<span style="color:var(--gold);font-size:11px">✓ 已装备</span>':''}${artEffHtml(id, SHENTONGS)}<span class="muted" style="font-size:11px">${escapeHtml((st.desc||'').replace(/——[^，]*\+[\d.]+%(?:、[^，]*\+[\d.]+%)?/, '').replace(/^，\s*/, ''))}</span></div>`);
  });
  items.push(`<div style="padding:7px 2px;cursor:pointer;color:var(--dim)" onclick="artChoose('st','${slot}','__none__')">（卸下）</div>`);
  return items;
}
/* 弹窗选择回调 */
function artChoose(type, slot, id){
  const g=G;
  if(type==='gf'){
    if(id==='__none__'){
      const k = slot==='main' ? 'main' : 'sub';
      const old = g.gongfa && g.gongfa[k];
      if(old){ g.gongfa[k]=null; addLog('已卸下'+(k==='main'?'主修':'辅修')+'功法「'+old+'」。','sys'); }
    } else {
      equipGongfa(id, slot);
    }
  } else if(type==='bone'){
    if(id!=='__none__' && g.extraBone && g.extraBone.slot===slot){ addLog('此法宝位已被本命法宝占据，无法装备其他法宝。','note'); closeArt(); renderGame(); return; }
    const eq = g.boneEquip = g.boneEquip||{};
    if(id==='__none__'){
      const old = eq[slot];
      if(old){ eq[slot]=null; const b=(g.bones||[]).find(x=>x.id===old); addLog('卸下'+slot+'法宝「'+(b?b.name:slot)+'」。','sys'); }
    } else {
      eq[slot]=id;
      const b=(g.bones||[]).find(x=>x.id===id);
      addLog('装备'+slot+'法宝「'+(b?b.name:'')+'」，'+(b?b.main:'')+'+'+(b?b.pct:0)+'%。','good');
    }
  } else {
    if(id==='__none__'){
      const stOn = g.shentong||[];
      const cur = stOn[Number(slot)];
      if(cur){ const i=stOn.indexOf(cur); if(i>=0) stOn.splice(i,1); addLog('卸下神通「'+cur+'」。','sys'); }
    } else {
      equipShentong(id);
    }
  }
  closeArt();
  renderGame();
}
/* 关闭弹窗 */
function closeArt(){
  const m=$('artModal'); if(m){ m.style.display='none'; m.innerHTML=''; }
}
function buyCang(id, kind){
  const g=G;
  const cost = kind==='gongfa' ? gongfaCost(id) : shentongCost(id);
  if(!g.org){ addLog('无门无派，无处求法。','bad'); return; }
  if(!g._freeArtDone){
    g._freeArtDone = true;
    if(kind==='gongfa'){ g.gongfaOwned=(g.gongfaOwned||[]); if(g.gongfaOwned.indexOf(id)<0) g.gongfaOwned.push(id); }
    else { g.shentongOwned=(g.shentongOwned||[]); if(g.shentongOwned.indexOf(id)<0) g.shentongOwned.push(id); }
    atlasGain(kind==='gongfa'?'gongfas':'shentongs', id); // 本局暂存，世末结算入图鉴
    // 元始宗六艺收集记录（入宗赐法可选中）
    if((GONGFAS[id]&&GONGFAS[id].org==='元始宗')||(SHENTONGS[id]&&SHENTONGS[id].org==='元始宗')){ g.tangmenArts = g.tangmenArts||[]; if(g.tangmenArts.indexOf(id)<0) g.tangmenArts.push(id); } // 六艺含神通，记录不限功法
    addLog(`<b>入宗赐法！</b>藏经阁为你敞开，你免费习得「${id}」。`,'good');
  } else if((g.gongxian||0) >= cost){
    g.gongxian -= cost;
    if(kind==='gongfa'){ g.gongfaOwned=(g.gongfaOwned||[]); if(g.gongfaOwned.indexOf(id)<0) g.gongfaOwned.push(id); }
    else { g.shentongOwned=(g.shentongOwned||[]); if(g.shentongOwned.indexOf(id)<0) g.shentongOwned.push(id); }
    atlasGain(kind==='gongfa'?'gongfas':'shentongs', id); // 本局暂存，世末结算入图鉴
    // 元始宗六艺收集记录（贡献兑换）
    if((GONGFAS[id]&&GONGFAS[id].org==='元始宗')||(SHENTONGS[id]&&SHENTONGS[id].org==='元始宗')){ g.tangmenArts = g.tangmenArts||[]; if(g.tangmenArts.indexOf(id)<0) g.tangmenArts.push(id); } // 六艺含神通，记录不限功法
    addLog(`<b>藏经阁兑换：</b>你以 <b>${cost} 贡献</b> 换来「${id}」（余 ${g.gongxian}）。`,'good');
  } else {
    addLog(`贡献不足（需 ${cost}，现有 ${g.gongxian||0}）——可参加宗门任务、论道大会或上缴妖兽材料。`,'bad');
    return;
  }
  renderGame(); renderCang();
}
function shangjiao(){
  const g=G;
  if(!g.org){ addLog('无门无派，妖兽材料无处上缴。','bad'); return; }
  if(!(g.materials>0)){ addLog('你手头没有可上缴的妖兽材料——先历练猎妖。','bad'); return; }
  g.materials -= 1;
  const gx = 30 + g.realm*3;
  g.gongxian = (g.gongxian||0) + gx;
  const pre = Math.max(1, Math.floor(gx/12));
  g.prestige = (g.prestige||0) + pre;
  addLog(`<b>上缴宗门：</b>你向${g.org}上缴一批妖兽材料（妖丹/兽骨），贡献 <b>+${gx}</b>、声望 +${pre}（余 ${g.materials} 份材料）。`,'good');
  try{ renderGame(); }catch(e){ console.warn('shangjiao render:', e); } // 渲染异常不阻断数据生效
  renderActions(); // 上缴后立即重建行动按钮——材料归零则「上缴材料」即时禁用，不再出现点了没反应
  const _op=$('orgPanel'); if(_op && _op.style.display!=='none') renderOrgPanel(); // 面板开着时同步刷新（4.303 修复：原行外泄至函数外，顶层语句使上缴后面板不刷新）
}
function setPost(p){
  const g=G;
  if(!g.org){ addLog('无门无派，何以任职。','bad'); return; }
  if(!reqLvPass(g, POST_REQ[p]||99)){ const _rq=Math.floor((POST_REQ[p]||99)/10); addLog(`任职「${p}」需修为 ${realmReqLabel({realm:_rq, pos:((POST_REQ[p]||99)-_rq*10)/10})}。`,'bad'); return; } // v4.349 realm 语义（POST_REQ 旧等级由 reqLvPass 换算）
  if(g.post===p){ g.post=''; addLog('你卸任宗门职务，专心修行。','note'); }
  else { g.post=p; addLog(`<b>荣任${g.org}${p}！</b>每年按职务领受宗门贡献。`,'good'); }
  renderGame(); renderCang();
}

function orgCultMult(){ // 势力修炼加成全加算（势力基础/灵根匹配/职位同层累加）
  let _x = (G&&G.org&&ORG_BONUS[G.org])?((ORG_BONUS[G.org].cultMult||1)-1):0;
  if(G && G.soul){
    if(G.org==='龙象宗' && /土|金/.test(G.soul.name||'')) _x += 0.10;
    else if(G.org==='风雷谷' && /风|雷/.test(G.soul.name||'')) _x += 0.05;
  }
  if(G && G.post && POST_CULT[G.post]) _x += POST_CULT[G.post]; // 职位修炼加成
  return 1 + _x;
}function orgWuMult(){ return (G&&G.org&&ORG_BONUS[G.org])?(ORG_BONUS[G.org].wuMult||1):1; }
function orgMoneyMult(){ return (G&&G.org&&ORG_BONUS[G.org])?(ORG_BONUS[G.org].moneyMult||1):1; }
function orgPrestigeMult(){ return (G&&G.org&&ORG_BONUS[G.org])?(ORG_BONUS[G.org].prestigeMult||1):1; }
/* 择宗灵根匹配度（土/金入龙象宗、风/雷入风雷谷、水/木入灵宝阁） */
function orgWeight(org){
  // 按新灵根池属性匹配（无武魂残留）；土/金·龙象、风/雷·风雷、水/木·灵宝
  const g=G, s=g.soul||{};
  let w = 1;
  if(org==='龙象宗'){ if(/土|金/.test(s.name||'')) w+=2; }
  else if(org==='风雷谷'){ if(/风|雷/.test(s.name||'')) w+=4; }
  else if(org==='灵宝阁'){ if(/水|木/.test(s.name||'')) w+=1; }
  else if(org==='太阴宫'){ if(/水|冰/.test(s.name||'')) w+=2; }
  else if(org==='血煞宗'){ if(/火/.test(s.name||'')) w+=1; }
  else if(org==='真阳门'){ if(/金|雷/.test(s.name||'')) w+=1; }
  else if(org==='天机阁'){ if(s.quality!=='fei') w+=1; }
  else if(org==='太虚剑宗'){ if(/金|风/.test(s.name||'')) w+=1; }
  else if(org==='紫霄学宫'){ if(/雷/.test(s.name||'')) w+=1; }
  else if(org==='镇魔司'){ if(/金|土/.test(s.name||'')) w+=1; }
  else if(org==='巨灵宗'){ if(s.cat==='shou'||/土/.test(s.name||'')) w+=1; }
  return w;
}/* 14岁「宗门择主」事件：按家境给候选池、按灵根加权排序、玩家自主选择（可散修） */
function buildOrgSelectEvent(){
  const g=G;
  // 家境分层候选池（保留原有逻辑）
  let pool = g.a.家境>=60
    ? ['龙象宗','灵宝阁','风雷谷','太阴宫','天机阁','紫霄学宫','镇魔司','巨灵宗']
    : ['太阴宫','真阳门','天尸宗','阴冥宗','血煞宗','太虚剑宗','混元宗'];
  // 按势力加入要求过滤——不满足要求的不显示（避免玩家选了才发现进不去）
  const available = [];
  const locked = [];
  pool.forEach(function(org){
    const r = orgReqPass(org);
    if(r.pass) available.push(org);
    else locked.push({name:org, reason:r.reason});
  });
  // 保底：若无可加入势力，则以散修身份继续（可选「婉拒各方」）
  // 按灵根匹配度加权排序
  available.sort(function(a,b){ return orgWeight(b)-orgWeight(a); });
  const opts = available.map(function(org){
    const b=ORG_BONUS[org]||{};
    return {label:org+(b.desc?('·'+b.desc):''), eff:{}, _org:org};
  });
  // 显示被锁定的势力（灰色+原因，让玩家知道目标）
  if(locked.length){
    opts.push({label:'—— 以下势力暂未达到加入条件 ——', eff:{}, _lockedHeader:true, _disabled:true});
    locked.forEach(function(l){
      opts.push({label:l.name+'（'+l.reason+'）', eff:{}, _org:l.name, _locked:true, _disabled:true});
    });
  }
  opts.push({label:'婉拒各方，暂为散修（保留太阴宫招揽等机缘）', eff:{}, _org:''});
  return {name:'宗门择主', text:'十四岁，灵根觉醒的少年郎迎来命运的分岔口——多家宗门遣使相邀、争相招揽，是择木而栖，还是独行天下？', opts, _orgSelect:true, _special:true};
}
function joinOrg(org){
  const g=G;
  if(!org){ g.org=''; addLog('你婉拒了各方势力，云游四方，静待机缘。','note'); return; }
  g.org = org;
  g._orgRecruitCount = 3; // 加入势力后锁定，不再触发势力招揽
  const b = ORG_BONUS[org]||{};
  let pre = 10;
  if(org==='太阴宫') pre=20; else if(org==='元始宗') pre=25;
  g.prestige += pre;
  // 修仙版：正魔道影响功德/业力（仅影响渡劫）
  const _zhengOrg = ['龙象宗','风雷谷','灵宝阁','太阴宫','真阳门','元始宗','天机阁','太虚剑宗','紫霄学宫','镇魔司','巨灵宗','混元宗'].indexOf(org)>=0;
  const _moOrg = ['天尸宗','阴冥宗','血煞宗'].indexOf(org)>=0;
  if(_zhengOrg){ g.功德=(g.功德||0)+5; }
  if(_moOrg){ g.业力=(g.业力||0)+30; } // 入魔道势力业力 +5->+30（魔道线起步）
  addLog(`你加入了 <b>${org}</b>${b.desc?('——'+b.desc):''}，宗门声望 +${pre}${_zhengOrg?'，功德 +5':''}${_moOrg?'，业力 +5':''}。`,'sys');
}
function gainMaster(){
  const g=G;
  // 拜师看天赋——无灵根不被任何强者收徒；
  // 五行杂灵根只配低阶名师，四灵根拜金丹长老，天灵根方可遇隐世大乘老祖与太阴宫太上长老
  const qo=['fei','pu','you','ding','super','shen'];
  const qIdx = qo.indexOf(g.soul.quality);
  if(qIdx < 1){
    addLog('曾有名师路过，见你灵根废劣，摇头而去——天下强者，无人愿收无灵根为徒。','note');
    return;
  }
  // 敌对势力检查：魔道三宗成员不能拜师正道宗门
  const hostileOrgs = ['天尸宗','阴冥宗','血煞宗'];
  let pool;
  if(qIdx >= 3) pool = ['一位金丹长老','某宗门长老','隐世的大乘老祖'];
  else if(qIdx === 2) pool = ['一位金丹长老','某宗门长老'];
  else pool = ['城中筑基前辈','宗门执事'];
  if(qIdx >= 3 && hostileOrgs.indexOf(g.org)<0) pool.push('太阴宫太上长老');
  const m = pick(pool);
  g.master = m;
  g.cultBonus += 1.2;
  addLog(`机缘之下，你拜师 ${m}，修炼事半功倍（修炼基数+1.2）。`,'good');
}

/* ============ 猎妖 ============ */
function fightMood(p, win){ // 4.321 战斗演出——按胜率注入战况措辞（纯展示，不影响判定）
  if(win){ if(p>=0.75) return '碾压式'; if(p>=0.5) return '激战'; return '险胜'; }
  if(p>=0.7) return '意外失手'; if(p>=0.4) return '势均力敌不敌'; return '力战不敌'; }
function huntSuccessP(idx, choice){
  const g=G;
  // 4.207e 猎妖对抗重构——成功率 = 归一化道行 vs 档位威胁对抗比（替代原线性属性加成；道行已含四维×灵根×道胎×神通×法则×本命）
  const _norm = power() / BEAST_TYP[Math.min(8, g.realm||0)]; // 归一化道行：1=该境界典型修士，灵根/法宝/道胎/神通越强越高
  const _mul = HUNT_MUL[choice] || 1;
  let p = 0.15 + 0.85 * _norm / (_norm + _mul);
  p += lunhuiVal('huntTop')*0.015; // 轮回殿「猎妖福缘」加护：每点 +1.5% 猎妖成功率
  p += stanceBonus().win; // 战斗姿态修正
  p *= woundMult(); // 伤势影响猎妖成功率（轻伤×0.9；重伤禁猎不触发）
  const _cap = choice==='猛'?0.62 : choice==='中'?0.78 : 0.95; // 4.307 猛档封顶 58→62%（成仙率回归拉回，仍显著低于中/稳，对抗比天然分层，封顶仅防极端加成溢出）
  return clamp(p, 0.05, _cap);
}
function huntDeathP(idx, choice){
  const g=G;
  // 4.207e 猎妖对抗重构——殒命率 = 档位威胁相对实力的对抗（替代原线性属性修正，消除高境界"殒0%"碾压）
  const _norm = power() / BEAST_TYP[Math.min(8, g.realm||0)];
  const _mul = HUNT_MUL[choice] || 1;
  let p = 0.004 + 0.04 * _mul * _mul / Math.max(0.5, _norm); // 4.305 档位威胁平方化——猛档殒命率显著高于中/稳（典型阶段13%→5%，高实力压下限）
  if(idx<3) p *= 0.6; // 低龄关口妖兽年份低，凶险更小
  if(G && G.org==='元始宗') p *= 0.7; // 元始宗攻伐流派——猎妖反噬率-30%（攻伐之道讲求全身而退）
  if(G && hasFate(G,'death')){ const fd = FATE_POOL.find(f=>f && f.death); p = Math.max(0, p-(fd?fd.death:0.05)); } // 命格·坚如磐石：猎妖殒命率降低（数值取命格定义，避免硬编码漂移）
  const _smH = stanceBonus(); // 战斗姿态修正
  if(_smH.hurt>0) p += _smH.hurt*0.06;      // 全力进攻：莽撞冒进，殒命风险略增
  else if(_smH.hurt<0) p *= (1+_smH.hurt*0.5); // 身法游斗/真身：灵巧或皮糙，殒命风险下降
  if((G.wound||0) >= 1) p += 0.04; // 带伤猎妖——重伤殒命风险+4%（重伤禁猎，实际仅轻伤生效）
  const _floor = choice==='猛'?0.05 : choice==='中'?0.02 : 0.01; // 4.305 档位殒命下限拉开：猛5%/中2%/稳1%（高实力下三档风险仍可感知）
  return clamp(p, _floor, 0.5);
}
function openHuntUI(){
  const g=G;
  const idx = Math.min(8, Math.max(0, g.realm)); // 妖兽档位随境界提升
  $('actionTitle').textContent = `第 ${g.age} 岁 · 狩猎妖兽（历练）`;
  renderCompactStats(); // 狩猎界面也更新紧凑属性条
  const btns=$('actionBtns'); btns.innerHTML='';
  const tiers = [
    {k:'稳', d:'猎杀低阶妖兽，胜算较高，收益平平。'},
    {k:'中', d:'猎杀中阶妖兽，胜负参半，收益颇丰。'},
    {k:'猛', d:'强杀高阶妖兽，凶险不小，收益惊人。'},
  ];
  tiers.forEach(t=>{
    const b=document.createElement('button'); b.className='btn';
    const sp = Math.round(huntSuccessP(idx,t.k)*100);
    const dp = Math.round(huntDeathP(idx,t.k)*100);
    const rg = beastPowerRange(idx, t.k);
    b.title = t.d;
    const _ry = (v)=>{ if(v>=10000) return (v/10000).toFixed(1)+'万'; return String(Math.round(v)); }; // 妖力格式化
    b.innerHTML = `${t.k} <span style="font-size:11px;color:var(--gold)">${tierRange(rg)}妖兽</span> <span style="font-size:11px;color:var(--dim)">妖力${_ry(rg[0])}~${_ry(rg[1])}</span> <span style="font-size:11px;color:var(--dim)">成${sp}% 殒${dp}%</span>`;
    b.onclick=()=>resolveHunt(t.k, idx);
    btns.appendChild(b);
  });
  $('eventBox').innerHTML = `<div id="stanceBar" style="margin-bottom:8px"></div><div class="muted">狩猎妖兽换取修行资源：灵石、妖丹淬体、法宝机缘。稳妥求存，还是富贵险中求？（成功率已按你的道行与妖兽阶位实时计算——道行越高胜算越高；中/猛档成功亦可能带伤而归）</div>`;
  renderStanceBar(); // 狩猎战术选择
}
/* genSkill（道胎/狩猎动态神通命名）已整体移除——道胎只给四维加成，神通回归纯装备式功法神通（事件 shenPool） */
/* ============ DL_RS_4.107：灵根属性·同源妖兽 ============
   灵根名推导属性 → 猎妖时多数（65%）遇到同源妖兽（草木灵根配木系、冰系灵根配冰系妖兽……）。
   同源妖兽妖力契合灵根，淬体效果更佳；异系妖兽则无加成——不同灵根的养成路线由此分化。 */
function soulEle(name){
  const n = String(name||'');
  if(/(冰|霜|雪)/.test(n)) return 'bing';
  if(/(雷)/.test(n)) return 'lei';
  if(/(火)/.test(n)) return 'huo';
  if(/(风)/.test(n)) return 'feng';
  if(/(木|草|藤|蔓|莲|菊|花|棠|树|叶)/.test(n)) return 'zhi';
  if(/(水)/.test(n)) return 'shui';
  if(/(金|剑|刀|枪|锤|斧|塔|珠|印)/.test(n)) return 'wu';
  if(/(土)/.test(n)) return 'shou';
  if(/(灵根)/.test(n)) return 'bt';
  return 'shou';
}
const ELE_BEAST = {
  bt:   {n:['月珀灵猫','霜纹灵狐','寒潭玉蛙','碧瞳灵龟'], e:['皓月仙兔','云水玄龟']},  // 先天灵根池（无/杂/圣灵根）
  // 妖兽名取用修仙界设定优先，无对应者再自创；按妖力分普通/强力两档
  bing: {n:['霜蚕','雪貂','玄冰蟒','冰髓狐'], e:['玄冥冰蜃','寒渊雪魈']},
  lei:  {n:['雷纹豹','迅雷貂','雷翎鸦','雷甲蜥'], e:['紫霄雷雕','雷角狰']},
  huo:  {n:['赤火狼','火鬃狮','炎甲兽','烈焰狐'], e:['熔岩蜥王','焚天炎龙']},
  zhi:  {n:['青藤妖','荆棘妖','噬灵藤','毒瘴花'], e:['万年藤皇','上古树灵']},
  long: {n:['土鳞龙','幼蛟','赤鳞龙','墨鳞蛟'], e:['金鳞地龙','雷鳞蛟']},
  she:  {n:['青鳞蟒','翠竹青','玄冠蛇','九纹玉蟒'], e:['青纹蛟','碧磷蟒']},
  zhu:  {n:['血纹蛛','地穴蛛','赤目蛛','毒斑蛛'], e:['血纹蛛皇','噬灵蛛皇']},
  shou: {n:['玄纹虎','风影狼','玉髓兔','铁背狼'], e:['撼山巨猿','裂爪玄熊']},
  qin:  {n:['紫翎雕','金翎鹰','铁喙隼','追云鹤'], e:['鎏金鹏王','紫翼鹰王']},
  fu:   {n:['金纹灵猴','雪纹灵兔','月纹貂','瑞云灵鹿'], e:['九霄灵狐','七彩仙鹿']},
  wu:   {n:['白牙虎','玄甲战熊','鎏金狮','啸岳狼'], e:['碎岳猿','铁甲玄犀']},
  feng: {n:['逐风狼','裂风豹','青羽鸢','飓风雕'], e:['裂风狼王','扶摇风鹏']},
  shui: {n:['水纹蛇','碧纹蟾','黑鳞鲛','沉渊龟'], e:['玄渊蛟','碧澜水母']}
};
const ELE_BEAST_KEYS = Object.keys(ELE_BEAST);
function genBeast(ele, y){
  const g = ELE_BEAST[ele] || ELE_BEAST.shou;
  const arr = (y>=10000) ? (g.e||g.n) : (g.n||g.e);
  return arr[Math.floor(Math.random()*arr.length)];
}

/* 妖兽妖力生成（ry）：按妖兽档位生成，档位区间严格递进——妖力越高，难度越大、掉落越丰
   （妖兽分阶：一阶~九阶，对应炼体~大乘，见 beastTierName；法宝品阶与气血门槛随妖力提升）。
   注：原"道胎年限/献祭环"概念已移除——道胎唯破境自凝，品质由灵根决定，与猎妖无关。 */
function beastPower(idx, choice){
  const base = [
    [100,400],[400,1000],[1000,3000],[3000,8000],[8000,15000],
    [15000,40000],[40000,80000],[80000,120000],[100000,200000]
  ][Math.min(idx,8)] || [1000,5000];
  const mul = HUNT_MUL[choice] || 1; // 4.207e 档位威胁倍率（稳0.55/中1.0/猛1.8）
  let y = Math.round(rnd(base[0], base[1]) * mul);
  return y;
}
function beastPowerRange(idx, choice){ // 猎妖三档预估妖力区间（与 beastPower 同源倍率）
  const base = [
    [100,400],[400,1000],[1000,3000],[3000,8000],[8000,15000],
    [15000,40000],[40000,80000],[80000,120000],[100000,200000]
  ][Math.min(idx,8)] || [1000,5000];
  const mul = HUNT_MUL[choice] || 1; // 4.207e 档位威胁倍率（稳0.55/中1.0/猛1.8）
  return [Math.round(base[0]*mul), Math.round(base[1]*mul)];
}
/* 妖兽分阶（一阶~九阶，对应炼体~大乘）——修仙版阶位体系，替代旧版年限标注
   内部仍以妖力数值（ry）驱动难度/掉落，展示层统一按阶位名 */
function beastTierName(ry){
  if(ry>=120000) return '九阶';
  if(ry>=80000)  return '八阶';
  if(ry>=40000)  return '七阶';
  if(ry>=15000)  return '六阶';
  if(ry>=8000)   return '五阶';
  if(ry>=3000)   return '四阶';
  if(ry>=1000)   return '三阶';
  if(ry>=400)    return '二阶';
  return '一阶';
}
function tierRange(rg){ // 区间转阶位文本（如「五~六阶」）
  const lo = beastTierName(rg[0]), hi = beastTierName(rg[1]);
  return lo===hi ? lo : lo+'~'+hi;
}
function resolveHunt(choice, idx){
  const g=G, a=g.a;
  if((g.wound||0) >= 2){ addLog('伤势'+woundName()+'，不宜狩猎，先调养吧。','bad'); return; } // 重伤/濒危禁狩猎
  let p = huntSuccessP(idx, choice);
  g.stats = g.stats || {hunt:0, fight:0, wuxin:0}; g.stats.hunt++; // 4.207b 历战统计
  // 4.260：超大函数拆分——成功/失败分支抽 2 子函数
  if(Math.random() < p){ rhSuccess(g, a, choice, idx, p); } // 4.321 传入成功率供战况措辞
  else { rhFail(g, a, idx, p); } // 4.321 传入成功率供战况措辞
  clampAll();
  settleZhenshen(); // 真身结算
  triggerEvent();
}
function rhSuccess(g, a, choice, idx, p){ // 狩猎成功——斩获妖兽：妖丹淬体/灵石收敛/材料/战损风险/法宝掉落/兽血淬体
  g._huntKill = (g._huntKill||0) + 1; // 4.314 成就计数：猎妖成功
  /* 狩猎历练：斩获妖兽，妖丹淬体、收取灵石，机缘得法宝/本命/神通（道胎唯破境凝成，不再于狩猎中吸收） */
  const ry = beastPower(idx, choice); // 后续仅读取未重赋值，let 改 const
  const myEleRaw = soulEle(g.soul.name);
  const myEle = ELE_BEAST[myEleRaw] ? myEleRaw : 'shou'; // 兜底校验，未来新增灵根属性不会落出妖兽元素池
  const ele = (Math.random() < 0.65) ? myEle : pick(ELE_BEAST_KEYS.filter(k=>k!==myEle));
  const beast = genBeast(ele, ry);
  const bonus = CFG.ring.statBonus[choice];
  a.力量 += Math.floor(bonus*0.5); a.灵动 += Math.floor(bonus*0.3); a.气血 += Math.floor(bonus*0.5);
  a.神识 += Math.floor(bonus*0.4); trendGrow(1.2);
  // 高境界狩猎灵石收敛——idx≥6 起封顶（炼虚3000/合体4000/大乘6000·猛猎），避免大乘期灵石数十万；元婴前不动
  const _mCap = [999999,999999,999999,999999,999999,999999, 3000, 4000, 6000];
  const _mul = (choice==='稳'?1:choice==='中'?2:4);
  const money = Math.max(3, Math.min(Math.round(ry/40) * _mul, _mCap[Math.min(idx,8)]));
  g.money += money;
  g.materials = (g.materials||0) + 1; // 猎妖斩获妖兽材料（可上缴宗门换贡献）
  const _mood = fightMood(p, true); // 4.321 战况措辞（p=本次成功率）
  let logTxt = `<b>狩猎成功！</b>${_mood}斩获<b>${beastTierName(ry)}</b>·<b>${beast}</b>，妖丹淬体（力量+${Math.floor(bonus*0.5)} 灵动+${Math.floor(bonus*0.3)} 气血+${Math.floor(bonus*0.5)} 神识+${Math.floor(bonus*0.4)}），收获灵石 <b>${money}</b>`;
  logTxt += '。'; addLog(logTxt,'good');
  // 4.207e 战损机制（C 方案）：中/猛档成功狩猎亦有带伤而归风险——档位威胁越高越易轻伤（复用伤势系统，重伤禁猎/疗伤丹/调养）
  const _normH = power() / BEAST_TYP[Math.min(8, g.realm||0)];
  const _thH = (HUNT_MUL[choice]||1) / Math.max(0.5, _normH);
  const _hurtP = choice==='猛' ? 0.06+_thH*0.06 : choice==='中' ? 0.02+_thH*0.04 : 0.01+_thH*0.03;
  if(Math.random() < _hurtP){
    g.wound = Math.max(g.wound||0, 1);
    addLog(`虽然斩获${beastTierName(ry)}${beast}，但搏杀中${['挂彩负伤','被兽爪撕开护体灵光，受了轻伤','力竭之下被妖兽余威震伤经脉'][Math.floor(Math.random()*3)]}，需调养片刻。`,'bad');
  }
  absorbBone(ry);        // 法宝掉落（品阶按妖兽档位）
  if(ry >= 100000 && choice==='猛'){ a.气血+=10; addLog(`${beastTierName(ry)}妖兽兽血淬体，肉身再次蜕变！`,'good'); }
}
function rhFail(g, a, idx, p){ // 狩猎失败——妖兽濒死反扑：气血/悟性受创，重伤退避（不陨落）
  const _smR = stanceBonus(); // 受伤按姿态调整
  const dmg = Math.max(2, Math.round(ri(12,22) * (1+_smR.hurt)));
  a.气血 -= dmg;
  // 狩猎失败：妖兽濒死反扑，心神受创
  const huntWuLoss = ri(1,3);
  a.悟性 = Math.max(1, a.悟性 - huntWuLoss);
  const _moodF = fightMood(p||0.3, false); // 4.321 战况措辞（兜底 0.3=力战不敌）
  addLog(`<b>狩猎失败！</b>${_moodF}——${CFG.ring.tierDesc[idx]}濒死反扑，你身受重伤（气血-<span class="dmg">${dmg}</span>、悟性-${huntWuLoss}）。`,'bad');
  addLog('你拼死挣脱，重伤退避，修养数载，来年再战。','note'); // 4.208a 猎妖失败不再陨落——打不过就跑，重伤退避（根除自动挂机累计死亡）
  a.气血 = Math.max(a.气血, 5); // 重伤后不跌破普通人基准
  g.wound = Math.min(3, (g.wound||0) + 2); // 猎妖重伤
}

/* 修仙版：成仙结局见 ascend——渡劫九劫尽渡即飞升真仙，散仙重铸仙基证地仙 */
/* 渡劫成功率（修仙版）：基础逐劫递减（第1劫 61% → 第9劫 45%，每劫 -2%），叠加法宝/功德业力/气运/轮回殿「天劫庇护」
   法宝：宝器每件 +1%、仙器每件 +3%（灵器及以下不加）；四件圆满时该加成 ×1.5（合计上限 +18%）
   功德业力：每点 ±0.05%（上限 ±10%，200 点吃满）；气运：每点 ±0.1%；天劫庇护：每点 +0.10%（满100 +10%）；总封顶 80% */
function tribRate(g, jieN){
  const _jn = Math.max(1, Math.min(9, jieN||1)); // 九劫基础逐劫递减 61%→45%
  let p = 0.61 - (_jn-1)*0.02;
  const _rb = ['凡器','灵器','宝器','仙器'];
  const _bs = (g.bones||[]).filter(function(b){ return b && _rb.indexOf(b.grade)>=2; });
  if(g.extraBone && _rb.indexOf(g.extraBone.grade)>=2) _bs.push(g.extraBone); // 本命法宝（宝器/仙器）计入渡劫加成
  if(_bs.length){
    var _fp = 0;
    _bs.forEach(function(b){ _fp += b.grade==='仙器' ? 0.03 : 0.01; });
    _fp = Math.min(0.18, _fp);
    p += _bs.length>=4 ? _fp*1.5 : _fp;
  }
  p += clamp((g.功德||0)*0.0005 - (g.业力||0)*0.0005, -0.10, 0.10); // 每点 ±0.05%，200 点吃满 ±10%
  p += (g.a.气运 - 50) * 0.001;
  p += (lunhuiVal('shenGan')||0) * 0.001;
  // 4.59→4.141：灵根品质渡劫加成——天灵根（含异灵根）+5%，圣灵根 +8%（双灵根及以下无加成也不减值）
  const _tq = (g.soul && g.soul.quality) || '';
  if(_tq === 'she') p += 0.08; // 圣灵根渡劫加成 5%→8%
  else if(_tq === 'shen') p += 0.05; // 天灵根渡劫加成 2.5%→5%

  if(g.org==='元始宗') p += 0.05; // 元始宗被动·渡劫成功率+5%
const _lfD = lawForce(g); if(_lfD) p += _lfD * 0.01; // 法则之力——每道渡劫+1%
  if(g.post==='掌门') p += 0.02; // 掌门渡劫成功率+2%
  if(g.spouse && (g.bond||0)>0){ p += Math.min((g.bond||0)*0.0005, 0.05); } // 道侣同心——羁绊每点+0.05%，上限+5%
  const _kx = succKids().length; if(_kx>0){ p += Math.min(_kx*0.02, 0.04); } // 血脉护佑——成才子嗣每名+2%，上限+4%
  if(g._jinShenFail){ p += Math.min((g.功德||0)/10, 0.15); } // 功德余晖上限 30%→15% 4.99：功德余晖——金身塑造失败者渡劫成功率 +功德/10（上限+30%，门槛降后配套）
  p += (g._artBonus && g._artBonus.渡劫) || 0; // 天级功法渡劫加成（装备生效）
  return clamp(p, 0.05, 0.85);
}
/* 渡劫成功率构成（tribRate 同源拆解，供渡劫构成面板展示） */
function tribBreakdown(g){
  const _curJie = Math.min(9, Math.max(1, ((g&&g._jie)||0)+1)); // 当前待渡劫数
  // 4.273：超大函数拆分——基础/法宝与修正项抽 2 子函数
  const bp = tbBase(g, _curJie);
  const p = tbMods(g, bp.parts, bp.p);
  const _final = clamp(p, 0.05, 0.85);
  return {parts:bp.parts, raw:p, total:_final, capped:_final !== p};
}
function tbBase(g, _curJie){ // 渡劫基础成功率 + 法宝加成（含本命法宝/四件圆满）
  const parts = [];
  let p = 0.61 - (_curJie-1)*0.02;
  parts.push({name:'基础渡劫成功率', txt:'第'+_curJie+'劫 · 逐劫递减（61%→45%，每劫-2%）', val:0.61 - (_curJie-1)*0.02});
  const _rb = ['凡器','灵器','宝器','仙器'];
  const _bs = (g.bones||[]).filter(function(b){ return b && _rb.indexOf(b.grade)>=2; });
  if(g.extraBone && _rb.indexOf(g.extraBone.grade)>=2) _bs.push(g.extraBone); // 本命法宝（宝器/仙器）计入渡劫加成与四件圆满
  if(_bs.length){
    var _fp = 0;
    _bs.forEach(function(b){ _fp += b.grade==='仙器' ? 0.03 : 0.01; });
    const _raw = Math.min(0.18, _fp);
    const _fp2 = _bs.length>=4 ? _raw*1.5 : _raw;
    p += _fp2;
    parts.push({name:'法宝加成', txt:(_bs.length>=4?'四件圆满 ×1.5':'宝器+1%/件·仙器+3%/件')+'（共'+_bs.length+'件）', val:_fp2});
  }
  return {parts: parts, p: p};
}
function tbMods(g, parts, p){ // 渡劫修正项——功德业力/气运/庇护/灵根/势力/道侣/血脉/金身/法则/天级功法
  const _gd = clamp((g.功德||0)*0.0005 - (g.业力||0)*0.0005, -0.10, 0.10);
  if(_gd !== 0){ p += _gd; parts.push({name:_gd>0?'功德庇佑':'业力缠身', txt:'每点±0.05%（±10%封顶）', val:_gd}); }
  const _qy = ((g.a.气运||50) - 50) * 0.001;
  if(_qy !== 0){ p += _qy; parts.push({name:'气运', txt:'(气运-50)×0.1%', val:_qy}); }
  const _bh = (lunhuiVal('shenGan')||0) * 0.001;
  if(_bh > 0){ p += _bh; parts.push({name:'天劫庇护', txt:'轮回殿加点 · 每点+0.10%', val:_bh}); }
  const _tq = (g.soul && g.soul.quality) || '';
  if(_tq === 'she'){ p += 0.08; parts.push({name:'圣灵根', txt:'渡劫成功率+8%', val:0.08}); }
  else if(_tq === 'shen'){ p += 0.05; parts.push({name:'天灵根', txt:'渡劫成功率+5%', val:0.05}); }
  if(g.org==='元始宗'){ p += 0.05; parts.push({name:'元始宗被动', txt:'势力渡劫加成', val:0.05}); }
  if(g.spouse && (g.bond||0)>0){ const _dlB = Math.min((g.bond||0)*0.0005, 0.05); p += _dlB; parts.push({name:'道侣同心', txt:'羁绊每点+0.05%（上限+5%）· 当前'+Math.min(100,(g.bond||0))+'点', val:_dlB}); }
  const _kx2 = succKids().length; if(_kx2>0){ const _kv = Math.min(_kx2*0.02, 0.04); p += _kv; parts.push({name:'血脉护佑', txt:'成才子嗣每名+2%（上限+4%）· 当前'+_kx2+'名', val:_kv}); }
  if(g._jinShenFail){ const _yh = Math.min((g.功德||0)/10, 0.15); p += _yh; parts.push({name:'金身余晖', txt:'功德/10（上限+15%）', val:_yh}); } // 面板文案与代码一致（4.147 已从 30% 下调至 15%）
  const _lfD2 = lawForce(g); if(_lfD2){ p += _lfD2*0.01; parts.push({name:'法则之力', txt:'每道+1%（当前 '+_lfD2+' 道）', val:_lfD2*0.01}); } // 渡劫构成同源
const _gf = (g._artBonus && g._artBonus.渡劫) || 0;
  if(_gf){ p += _gf; parts.push({name:'天级功法', txt:'装备生效', val:_gf}); }
  return p;
}
// ============ XL_RS 4.184：悟道系统 ============
// 解锁：炼虚（元素法则）→ 合体（至高法则）；每悟一道获法则之力（元素+1 / 至高+3）
// 法则之力：每道 破境+2% / 渡劫+1%（叠加进破境/渡劫构成面板）
function wuDaoRate(g){
  const _l = g.laws || [];
  const _e = _l.filter(function(x){ return LAWS_ELEM.indexOf(x)>=0; }).length;
  const _s = _l.filter(function(x){ return LAWS_SUP.indexOf(x)>=0; }).length;
  let p = _e < LAWS_ELEM.length ? (0.25 - _e*0.03) : (0.10 - _s*0.025); // 至高基准改 10%−已悟×2.5%（第4道后钳至下限 2%）
  p += ((g.daoXin||50) - 50) * 0.002;             // 道心（道心-50）×0.2%
  p += (g.a.悟性||0) * 0.0003;                    // 悟性 ×0.03%
  const _ri = g.realm;
  if(_ri >= 8) p += 0.05; else if(_ri >= 7) p += 0.04; // 境界加成对齐境界名——大乘+5% / 合体+4% / 炼虚+0
  return Math.max(0.02, Math.min(0.60, p));
}
function wuDaoCost(g){
  const _e = (g.laws||[]).filter(function(x){ return LAWS_ELEM.indexOf(x)>=0; }).length;
  return _e < LAWS_ELEM.length ? 1000 : 3000;
}
/* 斗法论道——修士切磋（道行比斗）与论道（悟性道心），每年限一次共用冷却 */
const FIGHT_NAMES = ['玄机子','青莲剑仙','赤炎真人','紫霄道君','白鹤童子','玉衡散人','无涯子','天璇真人','木灵仙姑','风雷上人','云中君','九幽客','丹青子','流光剑尊','冰魄仙子','枯荣老怪','御风真人','太虚道人','离火真人','沧澜居士'];
function genFightNPC(){ // 生成同境界 NPC 修士（实力 0.85~1.25 浮动）
  const g=G;
  const _p = power();
  const _pers = ['豪迈','谨慎','勇猛','机敏','沉稳'];
  const _pr = 0.85 + Math.random()*0.40;
  return {
    name: FIGHT_NAMES[Math.floor(Math.random()*FIGHT_NAMES.length)],
    pers: _pers[Math.floor(Math.random()*_pers.length)],
    power: Math.max(1, Math.round(_p * _pr)),
    wux: Math.max(5, Math.min(95, Math.round((g.a.悟性||50)*0.8 + Math.random()*40 - 20))),
    dx: Math.max(10, Math.min(100, Math.round((g.daoXin||50)*0.8 + Math.random()*30 - 15)))
  };
}
function fightWinRate(np){ // 斗法胜率 = 我方/(我方+敌方)，钳 10%~90%
  const _p = power();
  return Math.max(0.10, Math.min(0.90, _p/(_p+np.power)));
}
function lunDaoRate(np){ // 论道胜率 = (悟性*0.6+道心*0.4)/(双方和)，钳 10%~90%
  const g=G;
  const _m = (g.a.悟性||50)*0.6 + (g.daoXin||50)*0.4;
  const _e = np.wux*0.6 + np.dx*0.4;
  return Math.max(0.10, Math.min(0.90, _m/(_m+_e)));
}
function doFight(){ // 斗法：押注境界灵石，胜夺灵石+声望+战利品，败损气血+声望（押注退还）
  const g=G;
  g.stats = g.stats || {hunt:0, fight:0, wuxin:0}; g.stats.fight++; // 4.207b 历战统计
  if((g._fightCd||0) === g.age){ addLog('今日已与人斗法论道，来年再战。','note'); return; }
  if((g.a.气血||0) < 40){ addLog('气血不足，不宜与人斗法。','bad'); return; }
  if((g.wound||0) >= 2){ addLog('伤势'+woundName()+'，不宜斗法，先调养吧。','bad'); return; } // 重伤/濒危禁斗法
  const np = window._fightNPC; if(!np) return;
  g._fightCd = g.age;
  const _w = fightWinRate(np);
  const _stake = 100 * (CFG.cult.coef[g.realm] || 1);
  g.money = (g.money||0) - _stake;
  // 4.298：超大函数拆分——胜负结算抽 2 子函数
  if(Math.random() < _w) dfWin(g, np, _w, _stake);
  else dfLose(g, np, _w, _stake);
  closeFight(); syncArtBonus(); clampAll(); renderGame(); renderActions();
}
function dfWin(g, np, _w, _stake){ // 斗法取胜——赢灵石/声望 + 战利品（5% 凡器入法宝库 / 25% 妖材）
  g._fightWin = (g._fightWin||0) + 1; // 4.314 成就计数：斗法胜利
  g.money += _stake*2;
  g.prestige = (g.prestige||0) + 2;
  const _fw = fightMood(_w, true); // 4.321 战况措辞
  addLog('—— <b>斗法取胜</b>：'+_fw+'击败「'+np.name+'」（胜率 '+Math.round(_w*100)+'%），赢回灵石 <b>'+(_stake*2)+'</b>，声望+2。——','good');
  const _drop = Math.random();
  if(_drop < 0.05){ // 5%：凡器法宝（入法宝库，不自动装备）
    const _bId = 'b'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36);
    const _bn = ['铁精剑','磐石印','青木尺','流沙幡','玄铁环'][Math.floor(Math.random()*5)];
    g.bones = g.bones || [];
    g.bones.push({id:_bId, slot:BONE_SLOTS[Math.floor(Math.random()*BONE_SLOTS.length)], grade:'凡器', name:_bn, pct:0.30, main:'力量', skill:'势如破竹'});
    addLog('并从他身上搜得一件法宝「'+_bn+'」（凡器，已入法宝库）。','good');
  } else if(_drop < 0.30){ // 25%：妖材
    const _v = Math.round(10 + Math.random()*10);
    g.materials = (g.materials||0) + _v;
    addLog('并搜得妖材 ×'+_v+'。','good');
  }
}
function dfLose(g, np, _w, _stake){ // 斗法落败——押注退还/声望-1/气血两成 + 受创（8% 重伤 / 30% 轻伤）
  g.money += _stake; // 押注退还（不赔灵石）
  g.prestige = Math.max(0, (g.prestige||0) - 1);
  g.a.气血 = Math.max(1, (g.a.气血||0) - Math.round((g.a.气血||0)*0.20));
  const _wr = Math.random(); // 落败受创——8% 重伤（+2）/30% 轻伤（+1）
  if(_wr < 0.08) g.wound = Math.min(3, (g.wound||0) + 2);
  else if(_wr < 0.38) g.wound = Math.min(3, (g.wound||0) + 1);
  const _fl = fightMood(_w, false); // 4.321 战况措辞
  addLog('—— <b>斗法落败</b>：'+_fl+'「'+np.name+'」，气血折损两成（<span class="dmg">-'+Math.round((g.a.气血||0)*0.20)+'</span>），声望-1（押注退还）'+(g.wound?'，落得'+woundName()+'。':'。')+'——','bad');
}
function doLunDao(){ // 论道：悟性道心比斗，胜道心+1声望+1，败道心-1
  const g=G;
  if((g._fightCd||0) === g.age){ addLog('今日已与人斗法论道，来年再战。','note'); return; }
  const np = window._fightNPC; if(!np) return;
  g._fightCd = g.age;
  const _w = lunDaoRate(np);
  if(Math.random() < _w){
    g.daoXin = Math.min(100, (g.daoXin||50) + 1);
    g.prestige = (g.prestige||0) + 1;
    addLog('—— <b>论道得悟</b>：与「'+np.name+'」坐而论道，机锋占先、心有所得，道心+1，声望+1。——','good');
  } else {
    g.daoXin = Math.max(0, (g.daoXin||50) - 1);
    addLog('—— <b>论道受挫</b>：被「'+np.name+'」辩得哑口无言，道心-1，来日再证。——','bad');
  }
  closeFight(); clampAll(); renderGame(); renderActions();
}
function openFightPanel(){ // 斗法论道面板（NPC 展示 + 斗法/论道按钮）
  const g=G;
  window._fightNPC = genFightNPC();
  const np = window._fightNPC;
  const _w = fightWinRate(np), _ld = lunDaoRate(np);
  const _stake = 100 * (CFG.cult.coef[g.realm] || 1);
  let m = $('fightModal');
  if(!m){ m = document.createElement('div'); m.id='fightModal'; m.style.cssText='position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9999;background:rgba(0,0,0,.55)'; document.body.appendChild(m); }
  m.style.display='flex';
  m.innerHTML = '<div class="evmodal" onclick="if(event.target===this)closeFight()"><div class="evmodal-card">'
    + '<div class="evmodal-head"><b>斗法论道</b><button class="cl" onclick="closeFight()">✕</button></div>'
    + '<div class="evmodal-txt">'
    + '<div style="padding:10px 0;border-bottom:1px dashed #3a3a44;margin-bottom:10px">'
    + '<b style="color:var(--gold)">'+escapeHtml(np.name)+'</b><span class="muted" style="font-size:11px"> · '+realmName()+' · 性格'+escapeHtml(np.pers)+'</span><br>'
    + '<span class="muted" style="font-size:12px">道行 '+np.power+' · 悟性 '+np.wux+' · 道心 '+np.dx+'</span></div>'
    + '<div style="font-size:12px;margin-bottom:10px">'
    + '<b>斗法</b>：押注 '+_stake+' 灵石，胜率 '+Math.round(_w*100)+'%<br>'
    + '<span class="muted" style="font-size:11px">胜：夺灵石、声望+2、几率战利品；败：气血-20%、声望-1（押注退还）</span><br><br>'
    + '<b>论道</b>：胜率 '+Math.round(_ld*100)+'%<br>'
    + '<span class="muted" style="font-size:11px">胜：道心+1、声望+1；败：道心-1</span></div>'
    + '<div style="display:flex;gap:8px">'
    + '<button class="btn" style="flex:1" onclick="doFight()">斗法（'+_stake+'灵石）</button>'
    + '<button class="btn" style="flex:1" onclick="doLunDao()">论道</button>'
    + '</div>'
    + '<div class="muted" style="font-size:11px;margin-top:10px">每年限一次（斗法/论道共用冷却）</div>'
    + '</div></div></div>';
}
function closeFight(){
  const m = $('fightModal'); if(m) m.style.display='none';
}
function canWuDao(g){
  return !!g && g.realm >= 6 && (g.laws||[]).length < 17; // 元素法则解锁对齐境界名——炼虚期（664020，原误为化神）
}
function doWuDao(byDun){
  const g = G;
  if(!canWuDao(g)) return;
  const _l = g.laws || [];
  const _e = _l.filter(function(x){ return LAWS_ELEM.indexOf(x)>=0; }).length;
  let _pool = (_e < LAWS_ELEM.length) ? LAWS_ELEM.slice() : (g.realm >= 7 ? LAWS_SUP.slice() : []); // 至高法则需合体期解锁
  _pool = _pool.filter(function(x){ return _l.indexOf(x) < 0; });
  if(!_pool.length){
    if(_e >= LAWS_ELEM.length && g.realm < 7) addLog('元素法则已圆满，至高法则需合体期方可参悟。','note');
    return;
  }
  const _law = _pool[Math.floor(Math.random() * _pool.length)];
  const _sup = LAWS_SUP.indexOf(_law) >= 0;
  const _cost = byDun ? 0 : wuDaoCost(g);
  if(!byDun){
    if((g.money||0) < _cost){ addLog('灵石不足，无法支撑闭关悟道（需 '+_cost+' 灵石）。','bad'); return; }
    if(g.age + 10 > lifeCapOf()){ addLog('寿元不足以支撑十年闭关悟道。','bad'); return; }
    g.money -= _cost;
    g.age += 10;
  }
  const _p = byDun ? wuDaoRate(g) * 0.25 : wuDaoRate(g); // 顿悟（免费机缘）成功率仅为闭关的四分之一
  if(Math.random() < _p){
    g.laws = _l.concat([_law]);
    g.daoXin = Math.min(100, (g.daoXin||50) + 1); // 参悟法则，向道之心愈坚（道心+1）
    addLog((byDun ? '—— <b>顿悟</b>：修行途中灵光乍现，你于冥冥中参悟' : '—— <b>闭关悟道</b>：十年闭关，一朝顿开，参悟') + '<b>「'+_law+'法则」</b>！法则之力 +' + (_sup ? 3 : 1) + '（共 '+lawForce(g)+'/35）——','good');
  } else {
    if(byDun){ addLog('顿悟机缘未至，你与「'+_law+'法则」擦肩而过。','note'); return; }
    g.daoXin = Math.max(0, (g.daoXin||50) - 2);
    addLog('闭关悟道失败：道韵反噬，道心 -2（当前 '+Math.round(g.daoXin)+'），十年时光与灵石付诸东流。','bad');
    if(Math.random() < 0.05){
      const _c = Math.max(1, Math.round((g.realmPos||0) * 0.05));
      g.realmPos = Math.max(0, g.realmPos - _c);  // realmPos 版（段内修为倒退）
      addLog('—— <b>走火入魔</b>：悟道失败气机紊乱，修为折损 5%（不跨境）。——','bad');
    }
  }
  clampAll();
  const _wb = $('wudaoModalBody');
  if(_wb && !byDun) _wb.innerHTML = wuDaoPanelHtml();
  if(!byDun) renderGame();
}
function wuDaoPanelHtml(){
  const g = G;
  if(!g || !g.soul) return '<div class="muted">尚未觉醒灵根。</div>';
  const _l = g.laws || [];
  const _e = _l.filter(function(x){ return LAWS_ELEM.indexOf(x)>=0; }).length;
  const _s = _l.filter(function(x){ return LAWS_SUP.indexOf(x)>=0; }).length;
  const _lf = lawForce(g);
  const _can = canWuDao(g);
  const _cost = wuDaoCost(g);
  const _rEl = wuDaoRate(g);
  // 4.286：超大函数拆分——法则展示/悟道操作抽 2 子函数
  let h = '<div style="font-size:13px;font-weight:600;color:var(--gold2);margin-bottom:4px">悟道 · 法则参悟</div>';
  h += '<div style="font-size:12px;margin-bottom:6px">法则之力 <b style="color:var(--gold)">'+_lf+' / 35</b> <span class="muted" style="font-size:11px">每道：破境+2% · 渡劫+1%</span></div>';
  h += wdLaws(_l, _e, _s);
  h += wdAction(_can, _cost, _rEl);
  return h;
}
function wdLaws(_l, _e, _s){ // 元素法则（8 · 炼虚解锁）/至高法则（9 · 合体解锁）展示
  let h = '<div style="font-size:11px;color:var(--gold2);margin:4px 0 2px">—— 元素法则（8 · 炼虚解锁）——</div>';
  h += '<div style="font-size:12px;line-height:1.8">' + LAWS_ELEM.map(function(x){ return _l.indexOf(x)>=0 ? '<b style="color:var(--gold)">'+x+'</b>' : '<span style="color:var(--dim)">'+x+'</span>'; }).join('　') + ' <span class="muted" style="font-size:11px">已悟 '+_e+'/8（每道+1 法则之力）</span></div>';
  h += '<div style="font-size:11px;color:var(--gold2);margin:6px 0 2px">—— 至高法则（9 · 合体解锁）——</div>';
  h += '<div style="font-size:12px;line-height:1.8">' + LAWS_SUP.map(function(x){ return _l.indexOf(x)>=0 ? '<b style="color:var(--gold)">'+x+'</b>' : '<span style="color:var(--dim)">'+x+'</span>'; }).join('　') + ' <span class="muted" style="font-size:11px">已悟 '+_s+'/9（每道+3 法则之力）</span></div>';
  return h;
}
function wdAction(_can, _cost, _rEl){ // 悟道成功率/闭关按钮/顿悟说明
  let h = '<div style="font-size:11px;color:var(--gold2);margin:6px 0 2px">—— 悟道成功率 ——</div>';
  h += '<div style="font-size:12px">当前悟道成功率 <b style="color:var(--gold)">'+Math.round(_rEl*100)+'%</b>（元素基准 25%−已悟×3% / 至高基准 10%−已悟×2.5% + 道心修正（道心−50）×0.2% + 悟性×0.03% + 境界：炼虚+0/合体+4%/大乘+5%）</div>';
  if(_can){
    h += '<div style="margin-top:8px"><button class="btn" style="width:100%" onclick="doWuDao(false)">闭关悟道 · 恒定 10 年 + '+_cost+' 灵石</button></div>';
  } else {
    h += '<div class="muted" style="font-size:12px;margin-top:8px">十七道法则已尽数参悟，悟道之路圆满。</div>';
  }
  h += '<div class="muted" style="font-size:11px;margin-top:8px">每二十年有一次顿悟机缘（免费参悟，成功率仅为闭关四分之一）；闭关失败道心-2、灵石白耗、5% 走火折损 5% 修为（不跨境）。</div>';
  return h;
}
function openWuDaoPanel(){
  const m = $('wudaoModal'); if(!m) return;
  const b = $('wudaoModalBody'); if(b) b.innerHTML = wuDaoPanelHtml();
  m.style.display = 'flex';
}
function closeWuDaoModal(){
  const m = $('wudaoModal'); if(m) m.style.display = 'none';
}
function tribModalHtml(){
  const g=G;
  if(!g || !g.soul) return '<div class="muted">尚未觉醒灵根。</div>';
  const b = tribBreakdown(g);
  let h = '<div style="font-size:12px;line-height:1.9">';
  h += '<div style="font-size:13px;font-weight:600;color:var(--gold2);margin-bottom:4px">渡劫成功率构成</div>';
  h += '<div style="font-size:12px;margin-bottom:6px">当前渡劫成功率 <b style="color:var(--gold)">'+Math.round(b.total*100)+'%</b>'+ (b.capped?' <span style="color:var(--red)">（已触 80% 上限）</span>':'') +' · 每劫独立判定</div>';
  h += '<div style="font-size:11px;color:var(--gold2);margin:4px 0 2px">—— 成功率加成 ——</div>';
  b.parts.forEach(pp=>{
    h += '<div style="display:flex;justify-content:space-between;gap:10px;font-size:12px"><span>'+pp.name+(pp.txt?' <span style="color:var(--dim)">'+pp.txt+'</span>':'')+'</span><b style="color:'+(pp.val>=0?'var(--gold)':'var(--red)')+';white-space:nowrap">'+(pp.val>=0?'+':'')+(pp.val*100).toFixed(1)+'%</b></div>';
  });
  h += '<div style="font-size:11px;color:var(--gold2);margin:6px 0 2px">—— 说明 ——</div>';
  h += '<div class="muted" style="font-size:11px">九劫连渡（3雷3火3风），每劫独立判定；基础成功率逐劫递减（第1劫61%→第9劫45%）；失败 20% 身死、80% 沦为 N 劫散仙（可自造仙基证地仙）；总成功率钳制 5%~85%。</div>';
  h += '</div>';
  return h;
}
// 突破构成面板（与 realmBreakCheck / lvGainWithAttr 公式同源拆解）
function breakModalHtml(){
  const g=G;
  if(!g || !g.soul) return '<div class="muted">尚未觉醒灵根。</div>';
  const r = g.realm;
  const _qq = g.soul.quality || 'fei';
  const _qualName = Q_KEYS[_qq] || _qq;
  let h = '<div style="font-size:12px;line-height:1.9">';
  if(r >= 9){
    h += '<div style="font-size:13px;font-weight:600;color:var(--gold2);margin-bottom:4px">突破构成</div>';
    h += '<div class="muted" style="font-size:11px">渡劫期不再累积修为、不涉及境界突破——渡劫成败请查看「渡劫构成」。</div>';
    h += '</div>';
    return h;
  }
  // 4.241：超大函数拆分——成功率构成计算/详情行渲染抽 2 子函数
  const c = breakChanceOf(g, r, _qq); // 成功率构成（含 5%~95% 钳制）
  const nextName = TIER_NAMES[Math.min(r+1,9)] || '新境';
  h += '<div style="font-size:13px;font-weight:600;color:var(--gold2);margin-bottom:4px">突破构成 · '+TIER_NAMES[r]+' → '+nextName+'</div>';
  h += '<div style="font-size:12px;margin-bottom:6px">大境界突破成功率 <b style="color:var(--gold)">'+Math.round(c._final*100)+'%</b> <span class="muted" style="font-size:11px">（钳制 5%~95%）</span></div>';
  h += brkDetailHtml(g, r, _qq, _qualName, c); // 构成行 + 失败后果 + 小境界 + 修为需求
  h += '</div>';
  return h;
}
function breakChanceOf(g, r, _qq){ // 大境界突破成功率构成计算（含 5%~95% 钳制）
  const _base = [0.85,0.80,0.75,0.70,0.65,0.60,0.55,0.50][r] || 0.45;
  const _qqMod = BRK_QMOD[_qq] || 0;
  let p = _base + (g.a.气运-50)*0.002;
  const _gd = Math.max(-0.10, Math.min(0.10, ((g.功德||0)-(g.业力||0))*0.01));
  p += _gd;
  p += (META.lunhui&&META.lunhui.shenGan||0)*0.001;
  const _jt = hasFate(g,'jieti') ? 0.05 : 0;
  p += _jt;
  p += _qqMod;
  p += lawForce(g) * 0.02; // 法则之力——每道破境+2%
  const _final = Math.max(0.05, Math.min(0.95, p));
  const _dp = (BRK_DP[_qq] || 0.05);
  const _lp = [1,5,10,30,80,150,300,500][r] || 500;
  const _subP = BRK_COEF[_qq] || 0.85;
  return {_final:_final, _base:_base, _qqMod:_qqMod, _gd:_gd, _jt:_jt, _dp:_dp, _lp:_lp, _subP:_subP};
}
function brkDetailHtml(g, r, _qq, _qualName, c){ // 成功率构成行 + 失败后果 + 小境界 + 修为需求
  let h = '<div style="font-size:11px;color:var(--gold2);margin:4px 0 2px">—— 成功率构成 ——</div>';
  const rows = [
    ['基础成功率', '境界越高越难（'+TIER_NAMES[r]+'档）', c._base],
    ['灵根品质修正', _qualName+'（加减上限 15%）', c._qqMod],
    ['气运修正', '(气运-50)×0.2%', (g.a.气运-50)*0.002],
    ['功德业力修正', '每点差值 1%（±10% 封顶）', c._gd],
    ['天劫庇护', '轮回殿·每点+0.1%', (META.lunhui&&META.lunhui.shenGan||0)*0.001],
    ['命格·道基稳固', hasFate(g,'jieti')?'已生效':'未拥有', c._jt],
    ['法则之力', lawForce(g)+' 道（每道+2%）', lawForce(g)*0.02]
  ];
  rows.forEach(pp=>{
    if(pp[2] === 0 && pp[0]!=='基础成功率') return;
    h += '<div style="display:flex;justify-content:space-between;gap:10px;font-size:12px"><span>'+pp[0]+' <span style="color:var(--dim)">'+pp[1]+'</span></span><b style="color:'+(pp[2]>=0?'var(--gold)':'var(--red)')+';white-space:nowrap">'+(pp[2]>0?'+':'')+(pp[2]*100).toFixed(1)+'%</b></div>';
  });
  h += '<div style="font-size:11px;color:var(--gold2);margin:6px 0 2px">—— 失败后果 ——</div>';
  h += '<div style="font-size:12px">死亡 <b style="color:var(--red)">'+((c._dp)*100)+'%</b>（'+_qualName+'） · 未死则退 1 小境（后段起点、修为清零重攒）+ <b style="color:var(--red)">折寿 '+c._lp+' 年</b></div>';
  h += '<div style="font-size:11px;color:var(--gold2);margin:6px 0 2px">—— 小境界突破 ——</div>';
  h += '<div style="font-size:12px">小境界成功率 <b style="color:var(--gold)">'+Math.round(c._subP*100)+'%</b>（仅受灵根品质 '+_qualName+'，fei 85% → she 95%） · 失败修为折损 5%（留在段内）</div>';
  h += '<div style="font-size:11px;color:var(--gold2);margin:6px 0 2px">—— 修为需求 ——</div>';
  h += '<div class="muted" style="font-size:11px">'+TIER_NAMES[r]+'四段需求：初 '+REALM_B[r].toLocaleString()+' / 中 '+REALM_B[r].toLocaleString()+' / 后 '+(2*REALM_B[r]).toLocaleString()+' / 巅 '+(4*REALM_B[r]).toLocaleString()+'；破境需再 '+(10*REALM_B[r]).toLocaleString()+'（当前境共需 '+(17*REALM_B[r]).toLocaleString()+'，突破后从 0 重攒）</div>';
  return h;
}
function openBreakModal(){
  const m=$('breakModal'); if(!m) return;
  const b=$('breakModalBody'); if(b) b.innerHTML = breakModalHtml();
  m.style.display='flex';
}
function closeBreakModal(){
  const m=$('breakModal'); if(m) m.style.display='none';
}
function openTribModal(){
  const m=$('tribModal'); if(!m) return;
  const b=$('tribModalBody'); if(b) b.innerHTML = tribModalHtml();
  m.style.display='flex';
}
function closeTribModal(){
  const m=$('tribModal'); if(m) m.style.display='none';
}
function ascend(){
  const g=G, a=g.a;
  g.realm = 10; g.subRealm = 0; g.realmPos = 0; 
  g.godTitle = '真仙';
  g.shenkaoDone = true;
  if(g.achievements.indexOf('飞升成仙')<0) g.achievements.push('飞升成仙');
  // 真仙体魄：九劫淬炼，四维大增
  a.力量 += 30; a.灵动 += 30; a.气血 += 30; a.神识 += 30;
  // 仙衣凝聚——四件法宝共鸣（飞升关联）
  if(boneSetComplete()){
    g.godArmor = true;
    a.力量 += 20; a.灵动 += 16; a.气血 += 20; a.神识 += 16;
    if(g.achievements.indexOf('仙衣凝聚')<0) g.achievements.push('仙衣凝聚');
    addLog('四件法宝共鸣升腾，<b>仙衣凝聚</b>！仙道之力与法宝完美融合，四维再上一层！','good');
  } else {
    addLog('法宝未集齐四件，未能凝聚仙衣——道途虽成，略有缺憾。','note');
  }
  // 道胎圆满：全部道胎被仙力洗炼至完美档
  const boostArr = (arr)=>{ if(!arr) return;
    ['力量','灵动','气血','神识'].forEach((k,i)=>{
      let dSum = 0;
      arr.forEach(r=>{ const oldB = ringAttrBonus(r.y); r.y = 2; if(!g.attrVer){ const newB = ringAttrBonus(r.y); dSum += newB[i]-oldB[i]; } });
      if(!g.attrVer && dSum>0) a[k] += Math.round(a[k] * dSum); // 旧档：百分比差×当前基础补差；新档由 effAttr 实时反映（XL_RS 4.205m）
    });
  };
  boostArr(g.rings); boostArr(g.dualRings);
  addLog(`———— 九重天劫尽数渡过，肉身成仙——你飞升为 <b>真仙</b>，与天同寿，永镇修仙界！————`,'good');
  finishLife('飞升');
}

/* ============ 事件系统（品质 + 事件链 + 强制完成） ============ */
const EV_Q = {common:'白', uncommon:'绿', rare:'蓝', epic:'紫', legend:'红', mythic:'金'};
/* 事件链定义：step 顺序触发，后续环节强制出现 */
/* CHAINS 已外置 data 文件 */;
function chainNextEvent(chain){
  if(!chain) return null;
  const def = CHAINS[chain.id];
  if(!def) return null;
  // 4.352 隐藏结局——advanceChain 已跳转（step=steps.length+1）后，此处返回隐藏终局事件（条件在跳转时判定过）
  if(chain.step >= def.steps.length){
    if(def.hiddenStep && chain.step === def.steps.length + 1){
      const _hev = EV_BY_CHAIN[chain.id+':'+def.hiddenStep];
      if(_hev) return _hev;
    }
    return null;
  }
  const evId = def.steps[chain.step];
  const ev = EV_BY_CHAIN[chain.id+':'+evId];
  if(ev && ev.req && !passReq(ev)) return null; // 事件链等级/属性门槛——不满足则暂停链，等下一年
  return ev;
}

function passHiddenReq(ev){ // 4.352 隐藏结局门槛——hiddenReq 属性判定（气运/业力/悟性/声望/功德/道心等），满足才推进隐藏终局
  const g = G; if(!ev || !ev.hiddenReq) return true;
  const _getV = k => {
    if(k==='业力') return g.业力||0;
    if(k==='功德') return g.功德||0;
    if(k==='声望') return g.prestige||0;
    if(k==='道心') return (g.daoXin===undefined||g.daoXin===null)?50:g.daoXin;
    return (g.a && g.a[k])||0;
  };
  for(const k in ev.hiddenReq){ if(_getV(k) < ev.hiddenReq[k]) return false; }
  return true;
}

function pickWeighted(list){
  // w 负值会污染总权重导致提前返回错误事件——Math.max(0,...) 排除（w=0 保持 ||1 语义不变）
  let total = 0;
  list.forEach(e=>{ total += Math.max(0, e.w||1); });
  let r = Math.random()*total;
  for(const e of list){ r -= Math.max(0, e.w||1); if(r<=0) return e; }
  return list[list.length-1];
}
// 事件前置条件判定（req）：不满足则不进入触发池（如等级区间、属性、势力、配偶、师承、声望、灵石等）
function passReq(e){
  const g=G, a=g.a;
  if(!e.req) return true;
  const r=e.req;
  // 4.277：超大函数拆分——基础门槛/状态门槛/品质门槛抽 3 子函数
  if(!prBasic(g, a, r)) return false;
  if(!prStatus(g, r)) return false;
  if(!prQuality(g, r)) return false;
  return true;
}
function prBasic(g, a, r){ // 基础门槛——等级/年龄/属性/事件联动/势力/职务
  //  修复：r.lv 数字（如 30）被误当数组导致门槛失效——数字按"需≥该级"处理，数组按 [min,max] 处理
  if(r.realm !== undefined && !reqRealmPass(g, r)) return false; // v4.349 realm 语义（事件数据已迁移）；兼容遗留 lv 字段
  if(r.lv && !reqLvPass(g, r.lv)) return false;
  if(r.age){ const mn=r.age[0]||0, mx=r.age[1]===undefined?999:r.age[1]; if(g.age<mn || g.age>mx) return false; }
  if(r.attr){ for(const k in r.attr){ if(a[k] < r.attr[k]) return false; } }
  if(r.ev && !(g.evFlags && g.evFlags[r.ev])) return false;      //  事件联动：需先经历特定机缘
  if(r.notEv && g.evFlags && g.evFlags[r.notEv]) return false;   //  事件联动：需未经历特定机缘
  if(r.org && g.org!==r.org) return false;
  if(r.hasOrg && !g.org) return false;
  if(r.post && g.post!==r.post) return false; // 职务门槛（掌门专属事件）
  if(r.notOrg){ if(typeof r.notOrg==='string'){ if(g.org===r.notOrg) return false; } else if(g.org) return false; }   // notOrg=true 要求无势力；notOrg='某宗' 要求非该宗成员
  if(r.orgIn && r.orgIn.indexOf(g.org||'')<0) return false; // 势力白名单（''=散修），异宗不可触发（元始宗功法仅散修/元始宗可参悟）
  return true;
}
function prStatus(g, r){ // 状态门槛——道侣/师尊/声望/钱财/法宝/魔渊/子嗣/灵根/弥留
  if(r.spouse && !g.spouse) return false;
  if(r.master && !g.master) return false;
  if(r.prestige && g.prestige < r.prestige) return false;
  if(r.money && g.money < r.money) return false;
  if(r.rings && g.rings.length < r.rings) return false;
  if(r.shaKills && (g.shaKills||0) < r.shaKills) return false; // 幽冥魔渊前置——百胜（杀够100场）
  if(r.hasChild && !(g.children>0)) return false;
  if(r.quality && g.soul.quality!==r.quality) return false;      // 灵根品质
  if(r.lifeLeft){ const _left = Math.max(0, (g.lifeCap||0) - g.age); if(_left >= r.lifeLeft) return false; } // 弥留类事件——剩余寿元不足 lifeLeft 年才触发（防"离寿尽还很远却触发弥留事件"的违和感）
  if(r.ye !== undefined && (g.业力||0) < r.ye) return false;   // 4.351 业力门槛（魔道事件：业障深重者方入魔宫视野）
  if(r.daoXin !== undefined && (g.daoXin===undefined||g.daoXin===null?50:g.daoXin) > r.daoXin) return false; // 4.351 道心上限（魔道事件）
  return true;
}
function prQuality(g, r){ // 品质门槛——品质下限/白名单/排除/大乘/仇敌/宗门贡献
  if(r.minQuality){ const qo=['fei','pu','you','ding','super','shen','she'];
    if(qo.indexOf(g.soul.quality) < qo.indexOf(r.minQuality)) return false; } // 品质下限（DL_RS_4.14：无灵根开不了宗立不了派）
  if(r.qualityIn && r.qualityIn.indexOf(g.soul.quality) < 0) return false; // 品质白名单（洗髓丹限双灵根及以下）
  if(r.notQuality && r.notQuality.indexOf(g.soul.quality)>=0) return false;   // 排除品质（DL_RS_4.14）
  if(r.atCap && g.realm < 8) return false;
   if(r.enemy && !(g.enemies && g.enemies.length)) return false; // 有仇敌才触发寻仇事件
   if(r.gongxian && (g.gongxian||0) < r.gongxian) return false; // 宗门贡献门槛 // 四灵根修炼到合体巅峰（79级）即进入大机缘触发池——统一阈值，资质接近顶级者不再因 89 门槛更难遇灵根升华大机缘
  return true;
}
/* XL_RS 4.205z：事件特殊触发钩子注册表——triggerEvent 原强制事件块整体封装（行为不变重构）；
   每个 hook 返回 true=已触发（调用方立即停止后续判定），false/undefined=继续；
   数组顺序 = 原 if 顺序（顺序敏感，勿调换） */
// 混沌经（4.206i）——金色机缘事件：获得特殊天级功法「混沌经」；需装备主修/辅修功法位生效；效果按灵根品质分档（天灵根以下 +5% 修炼速度+破境淬炼；天灵根及以上 +15%）
const EV_HUNDUN_JING = {
  band:4, q:'mythic', minAge:30,
  req:null,
  name:'混沌经',
  text:'你于古洞府遗迹中偶得一块混沌玉简，玉简之上道纹天成，竟是一部失传的至高功法「混沌经」！传说此经可借混沌道韵淬炼灵根、洗练资质……',
  opts:[
    {label:'参悟混沌经', chaosJing:true, eff:{悟性:5}, txt:'你静坐三日，参悟混沌经第一重。经义如混沌初开，与你的灵根隐隐呼应……'},
    {label:'道不同不相为谋', eff:{}, txt:'此经玄奥莫测，你自忖缘法未至，将其放回原处。'}
  ]
};
// 4.206l：金事件奖励的稀有天级功法（org:'奇遇'，仅经金事件 artPool 获得）标记 special——与混沌经同标准，不入道统传承池（防转世白嫖稀有事件奖励）
['万寿丹经','天机气运诀','渡厄真经'].forEach(function(_n){ if(GONGFAS[_n]) GONGFAS[_n].special = true; });
// 混沌经注入功法表（特殊被动功法：org 奇遇不入坊市/藏经阁；效果按品质在 cultBase 特判，不入 GONGFAS 常规效果链）
GONGFAS['混沌经'] = {tier:'天', org:'奇遇', special:true, eff:{}, desc:'混沌初开时一缕道韵化生的无上功法。需主动装备到主修/辅修功法位才生效：天灵根以下修炼 +5%（大境界突破时小概率淬炼灵根、提升一个品质）；天灵根及以上 +15%。'};
// 混沌五行仙丹（4.206f）——五行杂灵根专属金色机缘：洗去杂质蜕变为圣灵根（逆天改命之大机缘；触发率远低于灵根共鸣，成功率受气运影响）
const EV_HUNDUN_XIANDAN = {
  band:4, q:'mythic', minAge:30,
  req:{qualityIn:['pu']},
  name:'混沌五行仙丹',
  text:'一位游方老道与你论道三日后，抚须而笑：「你五行杂灵根，看似废材，实为混沌未分之相。此丹炼自混沌初开时的一缕仙气，或可助你洗尽杂质、返本归圣。」说罢赠你一枚流光溢彩的仙丹……',
  opts:[
    {label:'服下仙丹·洗炼归圣', hundunXiandan:true, eff:{悟性:5, 神识:5}, txt:'你盘膝服下混沌五行仙丹，只觉灵根深处如开天辟地，五行之气翻涌归一……'},
    {label:'心存疑虑·暂缓', eff:{}, txt:'仙丹虽妙，但你拿不准药性，选择暂缓服用。'}
  ]
};
// A2 机缘逆天改命（4.206e）——低品质专属机缘「灵根共鸣」：资质越差越受天道垂怜，洗去杂质返本归元（不调寿命/修炼速度数值，升品后修炼速度自然随品质提升）
const EV_XISUI_GUYUAN = {
  band:3, q:'mythic', minAge:30,
  req:{qualityIn:['pu','you','ding']},
  name:'灵根共鸣',
  text:'是夜静修，丹田深处忽有一缕灵光震颤不休——天地灵气竟主动涌入百脉，与你的灵根隐隐共鸣。你冥冥中感应，这是一场可遇不可求的「返本归元」之机……',
  opts:[
    {label:'顺应共鸣·洗髓归元', xiSui:true, eff:{悟性:3, 神识:2}, txt:'你顺其自然，任灵光冲刷灵根，洗去一缕杂质，资质返本归元！'},
    {label:'稳住道心', eff:{悟性:1}, txt:'机缘虽妙，但你选择稳守道心，静待下一次天缘。'}
  ]
};
const EVENT_TRIGGER_HOOKS = [
  // ① 元始令独立机缘——每令独立小概率判定（不受品质池稀释；已集越多未得令概率越高，温和补缺）
  function evHookYuanshiLing(g){
    if(g.age>=16 && (g.yuanshiLing||[]).length<6){
      const _miss = EVENTS.filter(e=> e.ling && (g.yuanshiLing||[]).indexOf(e.ling)<0 && (!e.minAge || g.age>=e.minAge) && passReq(e));
      if(_miss.length>0){
        const _pLing = 0.004 + (g.yuanshiLing||[]).length*0.003; // 基础 0.4%/年 + 已集×0.3%
        if(Math.random() < _pLing){
          const _evL = _miss[Math.floor(Math.random()*_miss.length)];
          if(_evL.once) g.onceUsed[_evL.name]=true;
          showEvent(_evL); return true;
        }
      }
    }
  },
  // ② 元始宗传承——六枚元始令集齐后解锁隐藏势力（终身一次判定）
  function evHookYuanshiChuancheng(g){
    if(g.yuanshiLing && g.yuanshiLing.length>=6 && !g.onceUsed['元始宗传承'] && !g._tangmenTried){
      g._tangmenTried = true;
      const _tm = EV_BY_NAME['元始宗传承'];
      if(_tm){ showEvent(_tm); return true; }
    }
  },
  // ③ 势力招揽——区间触发（12-25岁），不同势力不同年龄门槛；散修不锁定，最多 3 次
  function evHookOrgRecruit(g){
    if(g.age>=12 && g.age<=25 && !g.org && (g._orgRecruitCount||0)<3){
      // 12-14岁概率较低（早期只有太玄圣宗招揽），15-20岁高峰，21-25岁递减
      let recruitP = 0;
      if(g.age < 15) recruitP = 0.30;
      else if(g.age < 21) recruitP = 0.50;
      else recruitP = 0.35;
      if(hasFate(g,'event')) recruitP += 0.10; // 命格·福缘深厚：事件触发率+10%
      if(Math.random() < recruitP){
        g._orgRecruitCount = (g._orgRecruitCount||0) + 1;
        showEvent(buildOrgSelectEvent());
        return true;
      }
    }
  },
  // ④ 26 岁保底招揽——一直未加入且未触发满 3 次则强制一次
  function evHookOrgRecruit26(g){
    if(g.age===26 && !g.org && (g._orgRecruitCount||0)<3){
      g._orgRecruitCount = 3; // 保底后不再触发
      showEvent(buildOrgSelectEvent());
      return true;
    }
  },
  // ⑤ 幽冥魔渊入口——炼虚期+，终生一次；找到后每年强制赴杀戮场
  function evHookShaGate(g){
    if(g.age>=60 && g.realm>=6 && !g.shaGate && !g._shaGateSkip && Math.random() < Math.min(0.05, 0.01 + (g.a.气运||0)*0.0004)){ // 补年龄检查（事件定义 minAge:60，防天骄低龄触发）
      const _evE = EV_BY_NAME['幽冥魔渊·入口'];
      if(_evE){ if(_evE.once) g.onceUsed[_evE.name]=true; showEvent(_evE); return true; }
    }
  },
  // ⑥ 魔渊杀戮场——入口已开且未失败且未百胜，每年强制（连续四轮，难度累增）
  function evHookShaKill(g){
    if(g.shaGate && !g.shaFailed && (g.shaKills||0)<100){
      const _evA = EV_BY_NAME['魔渊杀戮场'];
      if(_evA){ showEvent(_evA); return true; }
    }
  },
  // ⑦ 深渊路——百胜后强制一次（触发即标记完成；失败退出则链终）
  function evHookShaRoute(g){
    if((g.shaKills||0)>=100 && !g.shaFailed && !g.shaRouteDone){
      const _evD = EV_BY_NAME['幽冥魔渊·深渊路'];
      if(_evD){ g.shaRouteDone = true; if(_evD.once) g.onceUsed[_evD.name]=true; showEvent(_evD); return true; }
    }
  },
  // ⑧ 道侣专属——结缘纪念每 100 年固定；随机道侣事件 1.5%/年（福缘深厚+1%），触发后 30 年冷却
  function evHookSpouse(g){
    if(g.spouse && (g.spouseLv!==undefined)){
      let _spPick = null;
      if(g.age>0 && g.age%100===0 && g._spouseAnni!==g.age){
        g._spouseAnni = g.age;
        _spPick = EV_BY_NAME['结缘纪念'] || null;
      } else {
        const _pS = 0.015 + (hasFate(g,'event')?0.01:0);
        if(Math.random() < _pS){
          const _pool = EVENTS.filter(e=>e.spouseEv && e.name!=='结缘纪念'
            && (!e.needBond || (g.bond||0)>=e.needBond)
            && !(g._spouseCd && g._spouseCd[e.name] && g.age < g._spouseCd[e.name]));
          if(_pool.length) _spPick = _pool[Math.floor(Math.random()*_pool.length)];
        }
      }
      if(_spPick){
        g._spouseCd = g._spouseCd || {};
        if(_spPick.name!=='结缘纪念') g._spouseCd[_spPick.name] = g.age + 30;
        showEvent(_spPick);
        return true;
      }
    }
  },
  // ⑨ 相亲——16-45 岁未婚 10%/年
  function evHookMarriage(g){
    if(g.age>=16 && g.age<45 && !g.spouse && Math.random()<0.10){ marriage(); }
  },
  // ⑩ 事件链——激活中的链下一步骤强制出现（不可跳过），链尽则清空
  function evHookChain(g){
    if(g.chain){
      const ev = chainNextEvent(g.chain);
      if(ev){
        if(ev.needOrg && g.org!==ev.needOrg){ // 4.336 宗门机缘随宗而止——换宗后宗门专属链不再续接（防「元始宗弟子受风雷谷传承」逻辑矛盾）
          const _cd = CHAINS[g.chain.id];
          g.chain=null;
          addLog('<b>机缘未竟：</b>「'+(_cd?_cd.name:'')+'」的宗门传承需在「'+ev.needOrg+'」内方可续缘，离宗之后，此缘就此止步。','note');
          return false;
        }
        showEvent(ev); return true;
      }
      g.chain = null;
    }
  },
  // ⑪ 灵根共鸣——低品质（杂/四/三）专属返本归元机缘：资质越差越受天道垂怜（不调寿命/速度数值，靠机缘升品；50 岁后 0.5%/年，一生至多 3 次）
  function evHookXiSuiGuyuan(g){
    const _q = g.soul && g.soul.quality;
    if(_q !== 'pu' && _q !== 'you') return false; // 杂/四灵根专属——资质最差者最受天道垂怜（三灵根及以上已有成仙路径，不再叠机缘）
    if(g.age < 30) return false; // 三十而立后机缘渐显（低品质寿终早，触发窗口需提前）
    const _maxN = _q==='pu' ? 3 : 1; // 杂灵根至多三次返本归元（杂→四→三→双），四灵根一次（四→三）
    if((g._xiSuiN||0) >= _maxN) return false;
    if(Math.random() < 0.025){
      g._xiSuiN = (g._xiSuiN||0) + 1;
      showEvent(EV_XISUI_GUYUAN);
      return true;
    }
    return false;
  },
  // ⑫ 混沌五行仙丹——五行杂灵根专属金色机缘：洗去杂质蜕变为圣灵根（30 岁后 0.6%/年，一生至多一次；成功率受气运影响在 resolveEvent 判定）
  function evHookHundunXiandan(g){
    const _q = g.soul && g.soul.quality;
    if(_q !== 'pu') return false;
    if(g.age < 30) return false;
    if(g._hundunN) return false;
    if(Math.random() < 0.006){
      g._hundunN = 1;
      showEvent(EV_HUNDUN_XIANDAN);
      return true;
    }
    return false;
  },
  // ⑬ 混沌经——金色机缘：获得特殊天级功法（30 岁后 0.3%/年，任何灵根皆可；效果按品质分档且需装备功法位生效，一生一次机会）
  function evHookHundunJing(g){
    if(g.age < 30) return false;
    if(g._hunjingMet) return false;
    if(Math.random() < 0.003){
      g._hunjingMet = 1;
      showEvent(EV_HUNDUN_JING);
      return true;
    }
    return false;
  }
];
function triggerEvent(batch, skipPool){
  const g=G;
  if(isDujieOf()) return false; // 渡劫期心无旁骛——不再触发任何事件（含强制/随机/事件链）
  const band = g.age<14?0 : g.age<30?1 : g.age<60?2 : 3;
  // 特殊触发钩子（原强制事件块——行为不变重构；顺序敏感，勿调换）
  for(let _i=0; _i<EVENT_TRIGGER_HOOKS.length; _i++){
    const _r = EVENT_TRIGGER_HOOKS[_i](g);
    if(_r) return _r;
  }
  // 4.228：超大函数拆分——品质池构建+触发判定拆 triggerEventPool（返回 true/'silent'/false/undefined 语义零变化）
  if(!skipPool){ return triggerEventPool(g, batch, band); } // 品质池按行动判定——批量时仅批次首年判定；强制钩子不受影响
}
function triggerEventPool(g, batch, band){ // 品质池构建 + 触发判定——返回 true=弹出事件 / 'silent'=静默结算 / false=批量无事 / undefined=单年无事已推进
  // 4.245：超大函数拆分——权重/品质抽取/事件池构建抽 3 子函数
  // 4.281：超大函数拆分——空池降档/事件结算抽 2 子函数
  const w = tepWeights(); // 六档品质区间权重（金/红/黑随轮回殿加点，绿/蓝固定）
  let q='common', giftForced=false;
  const _gq = tepQuality(g, w); // 来世天赋指定 / 六档随机抽取
  q = _gq.q; giftForced = _gq.giftForced;
  // 近期不重复机制——排除最近 6 个已出现事件（防止低品事件扎堆刷脸），池空时允许回退
  const _capNow = lifeCapOf(); // maxAge 寿元感知——事件年龄窗口随寿元等比放大（基准=炼体100寿）
  const buildEp = (qq)=> tepPool(g, band, qq, _capNow);
  let pool = buildEp(q);
  const _fb = tepFallback(g, w, band, _capNow, q, giftForced, buildEp, pool);
  q = _fb.q; pool = _fb.pool; giftForced = _fb.giftForced;
  if(giftForced || (pool.length && Math.random() < (0.60 + (G && hasFate(G,'event') ? 0.10 : 0)))){ // 年度触发率 0.65->0.60 微降；命格·福缘深厚+10%；来世天赋指定事件强制触发
    if(giftForced) G._giftEv = null; // 指定事件成功触发才消耗
    // 4.333 因果簿：擦肩而过的链起点，后续年份权重 ×2（命运会再找上你）
    if(g.fateBook){ // 4.334 因果簿限时窗口：每次年度事件消耗 1 次，2 次后移除（缘分只给两年）
      const _fb2 = {};
      Object.keys(g.fateBook).forEach(_cid=>{ const _r = g.fateBook[_cid]; const _t = (_r && _r.t!==undefined) ? _r.t-1 : 0; if(_t>=0) _fb2[_cid] = {t:_t}; });
      g.fateBook = Object.keys(_fb2).length ? _fb2 : null;
      if(g.fateBook){ pool = pool.map(_e => (_e.chainStart && g.fateBook[_e.chainId]) ? Object.assign({}, _e, {w:(_e.w||1)*2}) : _e); }
    }
    const ev = pickWeighted(pool);
    tepSettle(g, ev); // 注册 once/专属/近期不重复
    // 4.333 因果簿：本次落选的链起点记入（下次权重 ×2，直至触发）
    if(pool.length>1 && !giftForced){ // 4.334 因果簿记入：最多 2 条活跃，新链让位；记录窗口 2 次
      let _act = g.fateBook ? Object.keys(g.fateBook).length : 0;
      pool.forEach(_e=>{ if(_e.chainStart && _e!==ev && !(g.chainDone && g.chainDone[_e.chainId]) && !(g.chain && g.chain.id===_e.chainId)){ if(_act<2){ g.fateBook = g.fateBook||{}; g.fateBook[_e.chainId] = {t:2}; _act++; } } });
    }
    // 链起点：激活事件链（后续环节由 advanceChain 推进并强制出现）
    // XL_RS：自动挂机批量静默——低品质普通事件按自动决策静默结算（不弹卡不中断闭关）；高品质/特判/链事件照常弹出
    if(batch && _SILENT_EV && (ev.q==='common'||ev.q==='uncommon'||ev.q==='rare') && !ev.type && !ev.mode && !ev.chainId && !ev._special){
      addLog(`【事件】${ev.name}（${EV_Q[ev.q]}品质）`,'ev-'+ev.q);
      atlasGain('events', ev.name); // 本局暂存，世末结算入图鉴
      resolveEvent(ev, autoPickIdx(ev));
      return 'silent';
    }
    showEvent(ev);
    return true;
  } else {
    if(batch) return false;
    addLog(`第 ${g.age} 岁 · 这一年风平浪静，平平安安。`,'note');
    endYear();
  }
}
function tepFallback(g, w, band, _capNow, q, giftForced, buildEp, pool){ // 空池降档——指定品质无事件时逐级向上找（来世天赋保留待后续阶段）
  if(pool.length===0){
    if(giftForced){ // 指定品质本阶段无事件 → 保留指定（等后续阶段强制），本次按普通品质走
      giftForced=false;
      const rq2 = Math.random();
      q = rq2<w.wM?'mythic':rq2<w.wM+w.wL?'legend':rq2<w.wM+w.wL+w.wE?'epic':rq2<w.wM+w.wL+w.wE+w.wR?'rare':rq2<w.wM+w.wL+w.wE+w.wR+w.wU?'uncommon':'common';
      pool = buildEp(q);
      // 向更高品质逐级找事件（向上降档）——白/绿被等级淘汰后，份额自然流入最低未淘汰品质（权重表不动）
      const order = ['mythic','legend','epic','rare','uncommon','common'];
      let qi = order.indexOf(q);
      while(pool.length===0 && qi > 0){
        qi--;
        q = order[qi];
        pool = buildEp(q);
      }
    }
  }
  return {q:q, pool:pool, giftForced:giftForced};
}
function tepSettle(g, ev){ // 事件结算登记——一次性/专属标记 + 近期不重复记录（低品可重复事件限最近 6 个）
  if(ev.once) g.onceUsed[ev.name]=true;
  if(ev.ex) g.exclusiveUsed[ev.ex]=true;
  // 近期不重复：仅对可重复事件（common/rare 且非 once）记录最近 6 个
  if((ev.q==='common'||ev.q==='uncommon'||ev.q==='rare') && !ev.once){
    g.recentEvents = g.recentEvents || [];
    g.recentEvents.push(ev.name);
    if(g.recentEvents.length>6) g.recentEvents.shift();
  }
}
function tepWeights(){ // 六档品质区间权重——金/红/黑随轮回殿加点（0.05%/点/0.1%/点/0.1%/点），绿/蓝固定宽保证递减
  // 随机品质抽取（DL_RS_4.132 六档梯级区间法：白>绿>蓝>紫>红>金，对应道胎色；
  // 金/红/黑为轮回殿加点区间（满加成后黑14%/红6.5%/金3.0%，仍维持梯级；4.216 金加点 0.1%→0.05%），
  // 绿>蓝为固定宽度保证 0 加成与满加成均为严格递减分布）
  const lhE = lunhuiVal('epicEv')*0.001;    // 紫事件 +0.1%/点（上限 +6%）
  const lhL = lunhuiVal('legendEv')*0.001;  // 红事件 +0.1%/点（上限 +5%）
  const lhM = lunhuiVal('mythicEv')*0.0005; // 金事件 +0.05%/点（上限 +2.5%，4.216 与红拉开档次）
  const wM = 0.005 + lhM;                   // 神话（金）区间 0.5% 起步
  const wL = 0.015 + lhL;                   // 传说（红）区间 1.5% 起步
  const wE = 0.08 + lhE;                    // 史诗（黑）区间 8% 起步（满加成 14%）
  const wR = 0.21;                         // 稀有（紫）区间 22% 固定
  const wU = 0.34;                         // 进阶（黄）区间 32% 固定
  return {wM:wM, wL:wL, wE:wE, wR:wR, wU:wU};
}
function tepQuality(g, w){ // 品质抽取——来世天赋指定高品质事件（成功触发时才消耗）/ 六档随机（消费 1 随机数）
  if(G._giftEv){ return {q:G._giftEv, giftForced:true}; }
  const rq = Math.random();
  let q='common';
  if(rq < w.wM) q='mythic';
  else if(rq < w.wM + w.wL) q='legend';
  else if(rq < w.wM + w.wL + w.wE) q='epic';
  else if(rq < w.wM + w.wL + w.wE + w.wR) q='rare';
  else if(rq < w.wM + w.wL + w.wE + w.wR + w.wU) q='uncommon';
  return {q:q, giftForced:false};
}
function tepPool(g, band, q, _capNow){ // 事件池构建——品质/年龄带（寿元等比）/次数/链/宗门/等级淘汰 + 元始令缺口加权 + 近期不重复
  let pb = EVENTS.filter(e=>e && (e.art ? true : (e.needOrg ? true : e.band===band)) && e.q===q // 元始宗功法事件不受年龄带限制（残卷参悟随时可成）；4.360 宗门专属链事件不受年龄带限制（入宗即可续缘）
    && (!e.minAge || g.age>=e.minAge) && (!e.maxAge || g.age<=Math.round(e.maxAge*_capNow/100)) // 绝对年龄→寿元比例（100寿=基准）
    && !(e.once && g.onceUsed[e.name])
    && !(e.ex && g.exclusiveUsed[e.ex])
    && !(e.chainId && !e.chainStart)   // 链环节（非起点）只由链驱动
    && !(e.chainId && e.chainStart && g.chainDone && g.chainDone[e.chainId])  // 链起点 once
    && (!e.needOrg || g.org===e.needOrg)
    && !e._manual // 独立判定事件（幽冥魔渊/深渊路）不参与品质池，节奏由 triggerEvent 独立控制
    && !e._secret // 秘境事件只由「探秘」行动触发
    && !(e.q==='common' && g.realm>=7)     // 修仙版：合体后白品质生活流淘汰（凡人线保留人间烟火）
    && !(e.q==='uncommon' && g.realm>=9)   // 修仙版：渡劫后绿品质生活流淘汰
    && passReq(e));
  // 4.351 宗门渊源冲突——ORG_TENSION 敌对势力链起点过滤（如元始宗弟子不触发风雷谷龙脉链起点；已开始的链不受影响）
  if(g.org && ORG_TENSION && ORG_TENSION[g.org]){
    const _t = ORG_TENSION[g.org];
    pb = pb.filter(e=> !(e.chainId && e.chainStart && CHAINS[e.chainId] && CHAINS[e.chainId].org && _t.indexOf(CHAINS[e.chainId].org)>=0));
  }
  pb = pb.filter(e=> e.name!=='元始宗传承'); // 元始宗传承只由「六枚元始令集齐」钩子触发，不可随机抽取
  // 元始令缺口加权——已集令越多，未得令权重越高（温和补缺，避免隐藏势力永远差最后一枚）
  if((g.yuanshiLing||[]).length>0 && (g.yuanshiLing||[]).length<6){
    const _have = (g.yuanshiLing||[]).length;
    const _mult = 1 + _have*0.35;
    pb = pb.map(e=> (e.ling && g.yuanshiLing.indexOf(e.ling)<0) ? Object.assign({}, e, {w:(e.w||1)*_mult}) : e);
  }
  // 元始宗功法缺口加权已移除——残卷五部各凭机缘（避免保底+加权把隐藏势力变成必得线）；
  // const _tmHave = (g.tangmenArts||[]).length;
  // if(_tmHave>0 && _tmHave<6 && g.evFlags && g.evFlags['tangmen1']){
  //   const _tmMult = (g.age>=80 ? 1.5 : 1.1) * (1 + _tmHave*0.15);
  //   pb = pb.map(e=> (e.art && g.tangmenArts.indexOf(e.art)<0) ? Object.assign({}, e, {w:(e.w||1)*_tmMult}) : e);
  // }
  if(g.recentEvents && g.recentEvents.length){
    const f = pb.filter(e=>g.recentEvents.indexOf(e.name)<0);
    if(f.length) return f;
  }
  return pb;
}
function showEvent(ev){
  const g=G;
  const _isHQ = ev.q==='legend'||ev.q==='mythic';
  // 4.221：超大函数拆分——按事件展示流程抽子函数（渲染/中止语义零变化）
  showEventPause(ev, g, _isHQ); // 红/金品事件自动暂停（AUTO.pauseMs）
  showEventLog(ev, g);          // 事件日志 + 本局图鉴暂存
  const box=$('eventBox'); box.innerHTML='';
  // 对决类事件（武斗/死斗/精英赛）在选项前提供战斗战术选择
  if(ev.mode){ box.insertAdjacentHTML('afterbegin','<div id="stanceBar" style="margin-bottom:8px"></div>'); renderStanceBar(); }
  const card=showEventCard(ev, g, box); // 事件卡片（标题/品质/正文/链标签）
  const optsDiv=document.createElement('div'); optsDiv.className='opts';
  showEventOpts(ev, g, box, card, optsDiv); // 选项渲染 + 注入（含兜底/need/roll 预览）
}
function showEventPause(ev, g, _isHQ){ // 仅红/金品事件（legend/mythic）触发时，自动模式下按玩家设置暂停（AUTO.pauseMs：0 不暂停/1.5s/3s/5s）后自动恢复，避免玩家错过关键机缘又无需整局手点
  const _pauseMs = AUTO.pauseMs||0;
  if(AUTO.on && _isHQ && !ev._special && _pauseMs > 0){
    AUTO.on = false; AUTO._hqPaused = true;
    _SILENT_EV = false; // 暂停后本回合余下年份不再静默吞事件（_SILENT_EV 由 advanceYears 冻结，需同步解除）
    $('btnAuto').textContent = '自动';
    $('btnAuto').classList.remove('auto-on');
    $('autoHint').textContent = '红金品质事件触发！自动已暂停，' + (_pauseMs/1000) + '秒后自动恢复'; $('autoHint').title = $('autoHint').textContent;
    addLog(`—— 红金品质事件「${ev.name}」（${EV_Q[ev.q]}品）触发，自动暂停${_pauseMs/1000}秒 ——`, 'note');
    setTimeout(()=>{ if(AUTO._hqPaused){ AUTO._hqPaused=false; AUTO.on=true; $('btnAuto').textContent='停止'; $('btnAuto').classList.add('auto-on'); $('autoHint').textContent='自动挂机中……点击「停止」随时接管手动'; $('autoHint').title='自动挂机中……点击「停止」随时接管手动'; } }, _pauseMs);
  }
}
function showEventLog(ev, g){ // 事件触发即写入日志（含事件名与品质），使「本局历程」能看出几岁发生了什么事件
  addLog(`【事件】${ev.name}${ev._special?'':('（'+EV_Q[ev.q]+'品质）')}`, 'ev-'+ev.q);
  if(!ev._special) atlasGain('events', ev.name); // 本局暂存，世末结算入图鉴（宗门择主等特殊事件不计）
}
function showEventCard(ev, g, box){ // 事件卡片——标题/品质/链标签/正文（性别代词占位符替换）
  const qCls = 'q-'+ev.q;
  const _isGlow = ev.q==='rare'||ev.q==='epic'||ev.q==='legend'||ev.q==='mythic'; // 蓝品及以上卡片发光（视觉反馈），但仅红/金触发自动暂停
  const card=document.createElement('div'); card.className='eventcard' + (_isGlow ? ` high-quality hq-${ev.q}` : '');
  const chainTag = (ev.chainId && CHAINS[ev.chainId]) ? `<span class="chtag">事件链 · ${CHAINS[ev.chainId].name}</span>` : '';
  const EVCOL={common:'#d9e2f5',uncommon:'#7ec850',rare:'#6f9bff',epic:'#c39bd3',legend:'#ff6b6b',mythic:'#ffd700'};
  const qtagHtml = ev._special ? '' : `<span class="qtag ${qCls}" style="color:${EVCOL[ev.q]||'#d9e2f5'}">${EV_Q[ev.q]}品质</span>`;
  // 4.319 稀有度可视化——标题按品质着色 + 顶部品质色带 + 高品星标（common 标题默认金）
  const _qc = EVCOL[ev.q] || '#d9e2f5';
  const _enCol = ev.q==='common' ? 'var(--gold)' : _qc;
  const _stars = ev.q==='legend' ? ' ★★' : (ev.q==='mythic' ? ' ★★★' : (ev.q==='epic' ? ' ★' : ''));
  const _band = ev.q && ev.q!=='common' && ev.q!=='uncommon' ? `<span class="hq-band" style="background:${_qc}"></span>` : '';
  card.innerHTML = _band + `<div class="en" style="color:${_enCol}">【${ev.name}】${_stars}${qtagHtml}${chainTag}</div><div>${(ev.text||'').replace(/\{ta\}/g, (G.gender==='女'?'他':'她'))}</div>`; // 性别代词占位符
  return card;
}
function showEventOpts(ev, g, box, card, optsDiv){ // 选项渲染——兜底/need 门槛/roll 预览/注入
  // 事件保证至少一个「无要求选项」——若事件所有选项都带属性/条件门槛（配置漏配时防御），
  // 自动追加「就此作罢」兜底选项：无需任何条件即可选，手动/自动挂机均不会卡死，也绝不绕过属性门槛。
  // 当前事件库每事件本就含无 need 选项，此分支仅在新增事件漏配时兜底。
  let opts = ev.opts || [];
  if(opts.every(o=>o && (o.need || o.needEv))){
    opts = opts.concat([{label:'就此作罢', eff:{}, _fallback:true}]);
  }
  // 4.243：超大函数拆分——门槛解析/预览渲染抽 2 子函数
  opts.forEach((o,i)=>{
    const b=document.createElement('button'); b.className='btn';
    const nd = optNeedInfo(g, o); // 选项门槛解析（need/needEv/_disabled）
    b.textContent = (o.label + nd.needTxt).replace(/\{ta\}/g, (G.gender==='女') ? '他' : '她'); // 代词占位符
    optPreview(b, o); // 奖励/roll 预览
    b._o = o; // 供自动挂机决策（优先选无风险选项）
    if(nd.dis){
      b.disabled = true; b.className = 'btn btn-locked'; b.title = '条件不足，无法选择';
    } else if(o._fallback){
      // 兜底「作罢」选项——无任何门槛，收尾与正常选项一致（事件链照常推进、进入下一年）
      b.onclick = ()=>{
        addLog('你思虑再三，此事终究与你无缘，就此作罢。','note');
        advanceChain(ev);
        clampAll();
        endYear();
      };
    } else {
      b.onclick = ()=>resolveEvent(ev, i);
    }
    optsDiv.appendChild(b);
  });
  card.appendChild(optsDiv);
  box.appendChild(card);
  $('actionBtns').innerHTML=''; // 事件出现后强制完成，屏蔽其他行动
}
function optNeedInfo(g, o){ // 选项门槛解析——need（修为/属性/声望/灵石/宗门/配偶/师承/道胎）/needEv 联动/_disabled
  let dis=false, needTxt='';
  // 选项属性要求（need）：需求常显（达标高亮可用、不足置灰禁用）
  if(o.need){
    const miss=[], reqs=[];
    const n=o.need;
    if(n.realm !== undefined){ const _lb=realmReqLabel(n); reqs.push(_lb); if(!reqRealmPass(g,n)) miss.push(_lb); } // v4.349 realm 语义显示
    if(n.attr){ Object.keys(n.attr).forEach(k=>{ reqs.push(`${k}≥${n.attr[k]}`); if(g.a[k]<n.attr[k]) miss.push(`${k}≥${n.attr[k]}`); }); }
    if(n.prestige){ reqs.push(`声望≥${n.prestige}`); if(g.prestige<n.prestige) miss.push(`声望≥${n.prestige}`); }
    if(n.money){ reqs.push(`灵石≥${n.money}`); if(g.money<n.money) miss.push(`灵石≥${n.money}`); }
    if(n.org){ reqs.push(`需${n.org}`); if(g.org!==n.org) miss.push(`需${n.org}`); }
    if(n.spouse){ reqs.push('需有配偶'); if(!g.spouse) miss.push('需有配偶'); }
    if(n.master){ reqs.push('需有师承'); if(!g.master) miss.push('需有师承'); }
    if(n.rings){ reqs.push(`需${n.rings}枚道胎`); if(g.rings.length<n.rings) miss.push(`需${n.rings}枚道胎`); }
    if(reqs.length) needTxt='（需'+reqs.join('，')+'）';
    if(miss.length) dis=true;
  }
  //  事件联动：选项需先经历特定机缘（needEv），未满足则置灰禁用
  if(o.needEv && !(g.evFlags && g.evFlags[o.needEv])){ dis=true; needTxt += '（需先经历特定机缘）'; }
  // 自定义禁用（势力选择中未满足加入条件的势力/分隔标题）
  if(o._disabled){ dis=true; }
  return {dis:dis, needTxt:needTxt};
}
function optPreview(b, o){ // 选项预览——pctEff 奖励文本 + roll 成功率/成败/殒命 title + 洗髓成功率提示
  // 百分比奖励预览（势力链终点特色奖励）
  if(o.pctEff){
    const parts=[];
    Object.keys(o.pctEff).forEach(k=>{
      const v = Math.round(o.pctEff[k]*100);
      parts.push(k==='ALL' ? `全属性+${v}%` : `${k}+${v}%`);
    });
    b.textContent += '（奖励：'+parts.join('，')+'）';
  }
  // roll选项收益预览——悬停title即时展示成功率/成败收益/殒命风险，无需跳图鉴
  if(o.roll){
    const _pct = Math.round((o.roll.chance+(o.roll.extra||0))*100);
    const _s = fmtEff(o.roll.succ), _f = fmtEff(o.roll.fail);
    let _t = '成功率 '+_pct+'%';
    if(_s) _t += ' · 成功：'+_s;
    if(_f) _t += ' · 失败：'+_f;
    if(o.roll.death) _t += ' · 含 '+Math.round(o.roll.death*100)+'% 殒命风险';
    b.title = _t;
  } else if(o.xiSui){
    // 洗髓丹成功率提示（气运判定）
    b.title = '洗髓成功率随气运与灵根品质：15% + 气运×0.4%/点 + 品质加成（五行杂+20%/四灵根+13%/三灵根+6%/双灵根+0），上限 75%；失败则灵根不变、气血-5';
  }
}
function finishChain(g, def, ev){ // 4.352 链完成统一出口——事件终局/普通末步/隐藏终局共用：记完成+成就+嘉奖（嘉奖仅首次发放，防双线重复）
  g.chain = null;
  g.chainDone = g.chainDone||{};
  const _first = !g.chainDone[ev.chainId];
  g.chainDone[ev.chainId]=true;
  if(ev.markDone){
    g[ev.markDone]=true; // 链终通用钩子
  }
  if(g.achievements.indexOf('事件链·'+def.name) < 0) g.achievements.push('事件链·'+def.name);
  if(_first){
    // 4.351 链成嘉奖——CHAINS bonus 显式配置（四维/悟性/修为段内百分比/声望），完成链时一次性发放
    const _cb = def.bonus;
    if(_cb){
      const _logs = [];
      (['力量','灵动','气血','神识']).forEach(_k=>{ if(_cb[_k]){ g.a[_k]=(g.a[_k]||0)+_cb[_k]; _logs.push(_k+' +'+_cb[_k]); } });
      if(_cb.悟性){ const _wu=gainWu(_cb.悟性); g.a.悟性=(g.a.悟性||0)+_wu; _logs.push('悟性 +'+_wu); }
      if(_cb.声望){ g.prestige=(g.prestige||0)+_cb.声望; _logs.push('声望 +'+_cb.声望); }
      if(_cb.修为){ const _seg=subSegLen(g,(g.subRealm===undefined||g.subRealm===null)?0:g.subRealm); const _amt=Math.max(1,Math.round(_seg*_cb.修为)); g.realmPos=Math.min(_seg,(g.realmPos||0)+_amt); _logs.push('修为 +'+_amt); }
      if(_logs.length) addLog('<b>链成嘉奖：</b>'+_logs.join('、')+'。','good');
    }
  }
  addLog(`<b>事件链「${def.name}」全部完成！</b>一段完整的机缘就此落下帷幕。`,'good');
}
function advanceChain(ev, opt){
  const g=G;
  if(!ev.chainId) return;
  if(ev.chainStart){
    g.chain = {id:ev.chainId, step:1};
  } else if(g.chain && g.chain.id===ev.chainId){
    const def = CHAINS[ev.chainId];
    if(!def){ g.chain = null; return; } // （防御）：链定义缺失时终止链，防止 def.steps 崩溃
    // 多分支事件链——选项 chainGoto 跳转到指定步骤；事件/选项 chainEnd 提前结束链
    if(opt && opt.chainGoto){
      const gi = def.steps.indexOf(opt.chainGoto);
      g.chain.step = (gi >= 0) ? gi : (g.chain.step + 1);
    } else {
      g.chain.step += 1;
    }
    if(opt && opt.chainEnd){
      // 4.333 主动中断（选项放弃/提前离开）——不记完成、不打成就，提示机缘未竟
      g.chain = null;
      addLog(`<b>机缘未竟：</b>「${def.name}」的命运之线就此止步。`,'note');
    } else if(ev.chainEnd || g.chain.step >= def.steps.length){
      // 4.352 隐藏结局跳转——末步终局满足隐藏条件：不直接完成，推进隐藏终局（step 指向 steps.length+1）
      if(def.hiddenStep && g.chain.step === def.steps.length){
        const _hev = EV_BY_CHAIN[ev.chainId+':'+def.hiddenStep];
        if(_hev && passHiddenReq(_hev)){
          g.chain.step = def.steps.length + 1;
          addLog('<b>机缘未尽，另有天机：</b>你隐约感到，这条命运之线的尽头还藏着一道更深的后手……','note');
          return;
        }
      }
      finishChain(g, def, ev); // 4.352 完成统一出口（事件终局/普通末步/隐藏终局共用）：记完成+成就+嘉奖（首次）
    }
  }
}
/* 事件共鸣——事件收益与角色状态挂钩（灵根属性/品质/境界/命格共鸣），
   同一事件不同角色触发结果不同，增强每局体验差异；收益正放大不惩罚，mult 适中防膨胀 */
function evSynMult(ev){
  const g=G; if(!ev || !ev.syn) return 1;
  let m=1, tag=[];
  if(ev.syn.cat && g.soul && g.soul.cat===ev.syn.cat){ m*=ev.syn.catMult||1.35; tag.push('灵根共鸣'); }
  if(ev.syn.wq && g.soul && g.soul.quality===ev.syn.wq){ m*=ev.syn.wqMult||1.2; tag.push('品质共鸣'); }
  if(ev.syn.lv && reqLvPass(g, ev.syn.lv)){ m*=ev.syn.lvMult||1.4; tag.push('境界共鸣'); }
  if(ev.syn.fate && hasFate(g, ev.syn.fate)){ m*=ev.syn.fateMult||1.25; tag.push('命格共鸣'); }
  if(m!==1 && tag.length) g._synTag = tag.join('·');
  return m;
}
/* 洗髓丹——洗去灵根一个属性（提纯升品：双→天、三→双、四→三、杂→四；天/圣/无灵根无可洗属性，无效） */
function xiSuiDan(){
  const g=G, s=g.soul;
  const q=s.quality;
  if(q==='shen' || q==='she' || q==='fei'){
    addLog('洗髓丹入腹，但你的灵根已极纯（或本就无灵根），毫无杂质可洗，药力尽散。','bad');
    return;
  }
  const _oldQ=q, _oldName=s.name;
  let newQ, newName, newCat;
  const sameAttrs=(a,b)=> a.length===b.length && a.every(c=>b.indexOf(c)>=0);
  if(q==='pu'){
    const _p = SOULS_BY_Q.you[Math.floor(Math.random()*SOULS_BY_Q.you.length)];
    newQ='you'; newName=_p.name; newCat=_p.cat;
  } else {
    const attrs = _oldName.replace('灵根','').split('');
    attrs.splice(Math.floor(Math.random()*attrs.length),1); // 洗去一个随机属性
    newQ = attrs.length===1 ? 'shen' : attrs.length===2 ? 'super' : attrs.length===3 ? 'ding' : 'you';
    const pool = SOULS_BY_Q[newQ];
    let found = pool.find(x=> sameAttrs(x.name.replace('灵根','').split(''), attrs));
    if(!found) found = pool[Math.floor(Math.random()*pool.length)];
    newName = found.name; newCat = found.cat;
  }
  s.quality=newQ; s.name=newName; s.cat=newCat;
  addLog(`—— <b>洗髓丹生效</b>：灵根中的一缕杂质被洗去，<b>${Q_KEYS[_oldQ]}·${_oldName}</b> → <b>${Q_KEYS[newQ]}·${newName}</b>，资质返本归元，修炼之道豁然开朗！——`,'good');
}
function resolveEvent(ev, idx){
  const g=G, a=g.a;
  // 防御事件无选项/选项缺失（新增事件漏配 opts 时兜底，保持链推进与年份流转）
  if(!ev.opts || !ev.opts.length || !ev.opts[idx]){
    addLog('此事终究与你无缘，暂且作罢。','note');
    advanceChain(ev);
    clampAll();
    endYear(!!_SILENT_EV);
    return;
  }
  const o = ev.opts[idx];
  // 4.225：超大函数拆分——按事件语义拆 9 个子函数（早退分支返回 true 由主函数透传，渲染/结算语义零变化）
  if(resolveEventOrg(g, ev, o)) return;        // 宗门择主/元始宗传承/幽冥魔渊（入口+杀戮场）
  resolveEventMarriage(g, ev, o);              // 道侣选择事件多分支（不中止）
  if(resolveEventFight(g, ev, o, idx)) return; // 仇敌寻仇/修士对决（陨落则中止）
  resolveEventRecruit(g, ev, o, idx);          // 太玄圣宗招揽（不中止）
  if(resolveEventConsume(g, ev, o)) return;    // 洗髓丹/混沌五行仙丹/混沌经（立即结算）
  resolveEventEff(g, a, ev, o);                // 固定效果（事件共鸣倍率）
  resolveEventGain(g, a, ev, o);               // 元始令/功法/神通/永久加成
  resolveEventLink(g, a, ev, o);               // 事件联动（evSet/evClear/evAdd）
  const rollOut = resolveEventRoll(g, a, ev, o); // 风险判定 roll（死亡中止）
  if(rollOut.dead) return;
  resolveEventBless(g, a, ev, o, rollOut.win);   // 气运眷顾/法宝机缘/建宗立派
  advanceChain(ev, o);
  clampAll();
  endYear(!!_SILENT_EV); // 修仙版：神位体系已移除，事件结算后正常推进年度
}
function resolveEventOrg(g, ev, o){ // 宗门择主/元始宗传承/幽冥魔渊——选择后立即结算年度，返回 true
  // 4.274：超大函数拆分——四类势力事件抽 4 子函数 + 年度收尾抽 1 子函数
  if(ev._orgSelect) return reoOrgSelect(g, ev, o);
  if(ev.type==='tangmen') return reoTangmen(g, ev, o);
  if(o._shaEnter) return reoShaEnter(g, ev, o);
  if(ev && ev._shaOpen && !o._shaEnter){ g._shaGateSkip = true; } // 拒绝入口后本世不再触发（防每年重复判定）
  if(o._shaArena) return reoShaArena(g, ev, o);
  return false;
}
function reoEnd(ev){ // 势力事件年度收尾——事件链推进 + 属性钳制 + 年度结算
  advanceChain(ev);
  clampAll();
  endYear(!!_SILENT_EV);
}
function reoOrgSelect(g, ev, o){ // 宗门择主事件——直接按所选加入/散修
  // 宗门择主事件——直接按所选加入/散修，收尾与正常事件一致
  // 加入势力后锁定（_orgRecruitCount=3），选散修不锁定允许后续再次触发
  joinOrg(o._org);
  if(o._org){ g._orgRecruitCount = 3; } // 已加入势力，不再触发招揽
  reoEnd(ev);
  return true;
}
function reoTangmen(g, ev, o){ // 元始宗传承——集齐六枚元始令后执掌元始宗（隐藏势力）
  g.onceUsed = g.onceUsed || {};
  g.onceUsed['元始宗传承'] = true; // 终身一次：无论入宗还是散修，均登记已触发
  if(o._join){
    const _old = g.org;
    if(_old && _old!==o._join){ g.org=''; g.prestige=0; addLog(`你脱离了 ${_old}，与旧日宗门斩断羁绊。`,'note'); }
    joinOrg(o._join);
  } else {
    addLog('你隐于江湖，以六部功法自成一脉，不再开宗立派。','note');
  }
  // 分支提前返回需自行结算选项固定收益（声望/属性）
  if(o.eff){
    Object.keys(o.eff).forEach(k=>{
      let v = o.eff[k];
      if(k==='声望'){ g.prestige += v; }
      else { if(k==='悟性' && v>0) v = gainWu(v); g.a[k] += v; addLog(`${k} ${v>0?'+':''}${v}`,'sys'); }
    });
  }
  reoEnd(ev);
  return true;
}
function reoShaEnter(g, ev, o){ // 幽冥魔渊入口确认——开启魔渊杀戮场
  g.shaGate = true;
  addLog('<b>幽冥魔渊！</b>血色城门在身后轰然关闭——你已置身幽冥魔渊。此后每年需赴魔渊杀戮场：连续四轮、难度累增，累计战胜百人方有资格闯深渊路；败则重创退出，再无重来。','good');
  reoEnd(ev);
  return true;
}
function reoShaArena(g, ev, o){ // 魔渊杀戮场——四轮难度递增（85%/72%/58%/45%），失败削属性/15% 战死/退出
  const _round = g.shaRound || 0;
  const _chance = [0.85, 0.72, 0.58, 0.45][_round] || 0.45; // 四轮难度递增
  if(Math.random() < _chance){
    g.shaKills = (g.shaKills||0) + 25;
    g.shaRound = _round + 1;
    if(g.shaKills >= 100){
      addLog(`<b>第 ${_round+1} 轮获胜，百胜达成！</b>连续四次杀穿魔渊杀戮场，累计战胜百人——深渊路入口为你洞开！`,'good');
      showToast('百胜达成 · 深渊路开启', '#ff6b6b');
    } else {
      addLog(`<b>第 ${_round+1} 轮获胜！</b>（约${Math.round(_chance*100)}%胜率）你于百人围杀中杀出一条血路，累计战胜 ${g.shaKills}/100 人。`,'good');
    }
  } else {
    if(Math.random() < 0.15){ die('战死于魔渊杀戮场'); return true; }
    g.a.力量 = Math.max(1, (g.a.力量||0)-4); g.a.气血 = Math.max(1, (g.a.气血||0)-4); g.a.灵动 = Math.max(1, (g.a.灵动||0)-4);
    g.shaFailed = true;
    addLog('<b>败北！</b>你在魔渊杀戮场中力战不敌，侥幸捡回性命——力量-4、气血-4、灵动-4，幽冥魔渊的机缘与你无缘，你被逐出，此生不可再入。','bad');
  }
  reoEnd(ev);
  return true;
}
function resolveEventMarriage(g, ev, o){ // 道侣选择事件多分支（不中止，走尾部年度结算）
  if(ev.type==='marriage'){
    const _mrm = o._marryMode || 'arrange';
    if(o._marryTxt) addLog(o._marryTxt,'note');
    if(_mrm==='focus'){
      addLog('你暂不考虑儿女情长，一心向道，修炼之心更加坚定。','good');
    } else if(!g.spouse){
      // 主动追求/接受安排都触发marriage，但候选偏好不同
      marriage();
    }
  }
}
function resolveEventFight(g, ev, o, idx){ // 仇敌寻仇/修士对决——陨落返回 true 中止，对决后必中止（自结算）
  // 仇敌寻仇——正面对决/破财消灾/以德报怨/避而不见（占年，走尾部 endYear；陨落则 return）
  if(ev.type==='enemy'){
    if(resolveEnemy(ev, idx)) return true;
  }
  // 修士对决（DL_RS_4.99）：挑战赛/精英赛/生死斗——道行检验，胜者多得
  if(ev.type==='duel'){
    resolveDuel(ev, idx);
    return true;
  }
  return false;
}
function resolveEventRecruit(g, ev, o, idx){ // 太玄圣宗招揽·加入太玄圣宗（不中止）
  // 太玄圣宗招揽·加入太玄圣宗——散修应召真正加入太玄圣宗势力（org 切换为太玄圣宗，宗门贡献走太玄圣宗）
  // 加入势力后锁定_orgRecruitCount=3，避免后续重复触发势力招揽
  if(ev.name==='太玄圣宗招揽' && idx===0 && !g.org){ g.org='太玄圣宗'; g._orgRecruitCount=3; g.prestige+=20; addLog('<b>太玄圣宗供奉：</b>你应召加入太玄圣宗，自此在殿内供奉之位上效力（殿内功勋·声望获取+50%、力量成长+6%）。','good'); }
}
function resolveEventConsume(g, ev, o){ // 洗髓丹/混沌五行仙丹/混沌经——处理完立即结算年度，返回 true
  // 4.287：超大函数拆分——三类特殊消耗抽 3 子函数
  if(o.xiSui) return recXiSui(g, ev, o); // 洗髓丹
  if(o.hundunXiandan) return recHundun(g, ev, o); // 混沌五行仙丹
  if(o.chaosJing) return recJing(g, ev, o); // 混沌经
  return false;
}
function recXiSui(g, ev, o){ // 洗髓丹——气运判定（15%+气运×0.4%/点+品质修正，上限75%）；失败气血-5
  const _qMod = {pu:0.20, you:0.13, ding:0.06, super:0}[g.soul.quality] || 0; // 品质越低越易洗去杂质（五行杂+20%/四灵根+13%/三灵根+6%/双灵根+0，梯度较 d 版微收防 0 加成触线）
  const _p = Math.max(0.05, Math.min(0.75, 0.15 + (g.a.气运||50)*0.004 + _qMod));
  if(Math.random() < _p){
    addLog('<b>成功：</b>药力化开，灵根中的杂质被洗去一缕，你只觉灵台澄澈，与大道更近一分！','good');
          xiSuiDan();
    if(o.eff){ Object.keys(o.eff).forEach(k=>{ const v=o.eff[k]; g.a[k]=(g.a[k]||0)+v; addLog(`${k} +${v}。`,'sys'); }); }
  } else {
    addLog('<b>失败：</b>药力在灵根中冲撞数日，终究未能洗去杂质——灵根未变，经脉略有受损（气血-5）。','bad');
    g.a.气血 = Math.max(1,(g.a.气血||1)-5);
  }
  advanceChain(ev); clampAll(); endYear(!!_SILENT_EV);
  return true;
}
function recHundun(g, ev, o){ // 混沌五行仙丹——成功率受气运影响（8%+气运×0.5%/点，下限5%上限85%）；成功蜕圣灵根，失败气血-8
  const _pS = Math.max(0.05, Math.min(0.85, 0.08 + (g.a.气运||50)*0.005));
  if(Math.random() < _pS){
    const _pC = SOULS_BY_Q.she[Math.floor(Math.random()*SOULS_BY_Q.she.length)];
    addLog('<b>成功：</b>混沌五行仙丹入腹，药力如混沌初开、五行归一——杂灵根中的杂质被尽数洗炼，蜕变为圣灵根！','gold');
    g.soul.quality = 'she';
    g.soul.name = _pC.name;
    g.soul.cat = _pC.cat;
    if(o.eff){ Object.keys(o.eff).forEach(k=>{ const v=o.eff[k]; g.a[k]=(g.a[k]||0)+v; addLog(`${k} +${v}。`,'sys'); }); }
  } else {
    addLog('<b>失败：</b>混沌药力在你灵根中翻涌冲撞数日，终究未能洗去杂质——灵根未变，经脉重创（气血-8）。','bad');
    g.a.气血 = Math.max(1,(g.a.气血||1)-8);
  }
  advanceChain(ev); clampAll(); endYear(!!_SILENT_EV);
  return true;
}
function recJing(g, ev, o){ // 混沌经——获得特殊天级功法（被动生效：cultBase 按品质 +5%/+15%；大境界突破小概率淬炼灵根）
  g.chaosJing = true;
  if((g.gongfaOwned||[]).indexOf('混沌经')<0){ g.gongfaOwned = g.gongfaOwned||[]; g.gongfaOwned.push('混沌经'); } // 入装备池——需主动装备主修/辅修位才生效
  atlasGain('gongfas', '混沌经'); // 本局暂存，世末结算入图鉴
  addLog('<b>习得混沌经：</b>混沌玉简化作一道流光没入识海，一部无上功法自此与你性命交修——混沌经（天级）！','gold');
  if(o.eff){ Object.keys(o.eff).forEach(k=>{ const v=o.eff[k]; g.a[k]=(g.a[k]||0)+v; addLog(`${k} +${v}。`,'sys'); }); }
  advanceChain(ev); clampAll(); endYear(!!_SILENT_EV);
  return true;
}
function resolveEventEff(g, a, ev, o){ // 固定效果——事件共鸣倍率（lv/youBreak 不缩放），属性/资源结算
  if(o.eff){
    // 事件共鸣倍率——lv/youBreak 不缩放（直接加等级/灵根升华机制特殊），其余数值收益按共鸣放大
    g._synTag = '';   // 重置，避免上次事件共鸣标签残留到本次日志
    const m = evSynMult(ev);
    const synTxt = (m!==1 && g._synTag) ? `（${g._synTag}，收益×${m.toFixed(2)}）` : '';
    Object.keys(o.eff).forEach(k=>{
      if(k==='灵石'||k==='声望'||k==='贡献'||k==='herbs'||k==='materials'){ reeResource(g, k, o.eff[k], m, synTxt); } // 4.248：通用资源结算抽子函数
      else if(k==='lv'){ reeLvGain(g, o.eff[k]); } // 修仙版：事件"修为+N"为旧等级语义，修为制下换算为修为值（10 级一境线性映射） // 4.248：修为结算抽子函数
      // 灵根升华（youBreak）事件已随「变异机制废除」整体移除，此处处理分支一并清除
      else if(k==='功德'||k==='业力'){ reeVirtue(g, k, o.eff[k]); } // 4.248：功德/业力（境界加权）抽子函数
      else if(k==='子嗣'||k==='kidDao'||k==='enemyAdd'||k==='promote'||k==='bond'||k==='spouseLv'||k==='spouseLost'){ reeLife(g, k, o.eff[k], m); } // 4.248：人生类副作用（子嗣/道侣/擢升/结怨）抽子函数
      else if(k==='cult'){ reeCult(g, o.eff[k]); } // 链环节修炼补偿——考核年份折算为一次修炼推进（过考修为大进，抵消长链占年损失） // 4.248：链环节补偿抽子函数
      else { if(typeof console!=='undefined' && console.warn && !['力量','灵动','气血','神识','悟性','家境','气运'].includes(k)) console.warn('[resolveEventEff] 未消费eff键: '+k+'='+o.eff[k]); let v=Math.round(o.eff[k]*m*orgTrend(k)); if(k==='悟性' && v>0) v=gainWu(v); a[k]+=v; addLog(`${k} ${v>0?'+':''}${v}${synTxt}`,'sys'); }
    });
  }
}
function reeResource(g, k, v0, m, synTxt){ // 通用资源结算——灵石/声望/贡献/灵草/妖材（按共鸣倍率缩放）
  if(k==='灵石'){ const v=Math.round(v0*m); g.money += v; addLog(`灵石 ${v>0?'+':''}${v}${synTxt}`,'good'); }
  else if(k==='声望'){ g.prestige += Math.round(v0*m); }
  else if(k==='贡献'){ const v=Math.round(v0*m); g.gongxian=(g.gongxian||0)+v; addLog(`贡献 +${v}。`,'good'); }
  else if(k==='herbs'){ const v=Math.round(v0*m); g.herbs=(g.herbs||0)+v; addLog(`灵草 ${v>0?'+':''}${v}。`,'good'); } // 秘境灵草
  else if(k==='materials'){ const v=Math.round(v0*m); g.materials=(g.materials||0)+v; addLog(`妖材 ${v>0?'+':''}${v}。`,'good'); } // 秘境妖材
}
function reeVirtue(g, k, v0){ // 功德/业力结算——境界加权（基础系数 2、境界 0.25），不再蚀养道心
  // 功德获取量提升——基础系数 1→2、境界加权 0.15→0.25（低境界翻倍，高境界约×2）；4.142 衰减已回退（实测把功德飞升路径整体压垮）
  const v = Math.round(v0*(2+g.realm*0.25));
  if(k==='功德'){ g.功德=Math.max(0,(g.功德||0)+v);
    // 道心与善恶解耦——功德/业力不再蚀养道心（道心=向道之心，由历劫/悟道/心魔磨砺）
    addLog(`功德 ${v>0?'+':''}${v}。`,'good');
  } else { g.业力=Math.max(0,(g.业力||0)+v); // 业力不再蚀道心（道心=向道之心）
    addLog(`业力 ${v>0?'+':''}${v}。`,'bad'); } // 业力获取同步提升
}
function reeLvGain(g, v0){ // 修为结算——事件修为封顶（最多提升一个小境界=当前段长），只增不减、不受个体资质上限截断倒退
  let _lvAdd = effLvValue(v0); // v4.349 奖励换算函数（等价 expOfLv(v0)-expOfLv(0)）
  const _rE = g.realm;
  if(_rE < 9){ const _cap = subSegLen(g, (g.subRealm===undefined||g.subRealm===null)?0:g.subRealm)||1; if(_lvAdd > _cap) _lvAdd = _cap; } // 封顶当前段长（最多提升一个小境界）
  lvGainWithAttr(_lvAdd); addLog(`修为 +${Math.round(_lvAdd)}（最多一个小境界）！`,'good');
}
function reeLife(g, k, v0, m){ // 人生类副作用结算——子嗣/子嗣道基/结怨/擢升/羁绊/道侣境界/道侣缘尽
  if(k==='子嗣'){ const v=Math.round(v0*m); g.children=Math.max(0,(g.children||0)+v); for(let _i=0;_i<v;_i++){ newKid(); } while(v<0 && (g.kids||[]).length>0){ g.kids.pop(); } addLog(`子嗣 ${v>0?'+':''}${v}。`,'sys'); } // 子嗣个体化同步
  else if(k==='kidDao'){ const _kk=(g.kids||[]).find(k=>!k.done); if(_kk){ _kk.dao=Math.min(100,_kk.dao+Math.round(v0)); addLog('子嗣<b>'+_kk.name+'</b>道基 +'+Math.round(v0)+'。','sys'); } } // 子嗣道基（作用于首名未出师子嗣）
  else if(k==='enemyAdd'){ addEnemy(v0); } // 结怨（生成仇敌+业力）
  else if(k==='promote'){ const _p=v0; if(g.org && _p && reqLvPass(g, POST_REQ[_p]||99)){ const _oi=POST_ORDER.indexOf(g.post||''); const _ni=POST_ORDER.indexOf(_p); if(_ni>_oi){ g.post=_p; addLog('你荣任'+g.org+'<b>'+_p+'</b>！宗门上下同贺。','good'); if(_p==='掌门' && g.achievements.indexOf('荣登掌门')<0) g.achievements.push('荣登掌门'); } else { addLog('你已任更高职务，此番擢升推作嘉奖。','note'); } } } // 宗门擢升（事件任职）
  else if(k==='bond'){ const _v=Math.round(v0); g.bond=Math.min(100,(g.bond||0)+_v); addLog(`羁绊 ${_v>0?'+':''}${_v}。`,'good'); } // 道侣羁绊（不随共鸣缩放）
  else if(k==='spouseLv'){ if(g.spouse){ const _sl=Math.min(10,Math.max(0,(g.spouseLv||0)+Math.round(v0))); if(_sl!==(g.spouseLv||0)){ g.spouseLv=_sl; addLog(`道侣境界提升至「${realmName(CFG.realms[_sl])}」！`,'good'); } } } // 道侣境界提升（上限渡劫）
  else if(k==='spouseLost'){ g.spouse=''; g.spouseRole=''; g.bond=0; addLog('道侣缘尽，从此孑然一身。','note'); } // 道侣离世/离心
}
function reeCult(g, v0){ // 链环节修炼补偿——考核年份折算为一次修炼推进（过考修为大进，抵消长链占年损失，无衰减）
  let cg = v0; // 链环节修炼补偿（无衰减），段内截断
  const _rE = g.realm;
  if(_rE < 9){
    const _SE = CFG.realms[_rE];
    const _segLenE = subSegLen(g, (g.subRealm===undefined||g.subRealm===null)?0:g.subRealm); // 36 条段长（段内封顶）
    if((g.realmPos||0) + cg > _segLenE) cg = Math.max(0, _segLenE - (g.realmPos||0));
  }
  if(cg > 0){ lvGainWithAttr(cg, '考核磨砺'); addLog(`<b>修为大进</b> 考核磨砺修为沉淀，修为 +${rr(cg)}`,'good'); }
}
function resolveEventGain(g, a, ev, o){ // 元始令/功法/神通/永久加成（登记习得类）
  // 4.270：超大函数拆分——五类奖励登记抽 5 子函数
  regLing(g, ev);
  regArt(g, ev);
  regShen(g, o);
  regArtPool(g, o);
  regPct(a, o);
}
function regLing(g, ev){ // 元始令登记——集齐六部解锁隐藏势力元始宗
  // 元始宗功法收集——事件 art 字段登记功法（集齐六部解锁隐藏势力元始宗，autoAct 无碍）
  if(ev.ling){
    g.yuanshiLing = g.yuanshiLing || [];
    if(g.yuanshiLing.indexOf(ev.ling) < 0){
      g.yuanshiLing.push(ev.ling);
      addLog(`<b>获得元始令·${ev.ling}！</b>（${g.yuanshiLing.length}/6）`,'good');
    }
  }
}
function regArt(g, ev){ // 事件功法登记——宗门归属校验（他宗功法无缘参悟），习得入藏经阁库
  if(ev.art){
    const _artOrg = GONGFAS[ev.art] ? GONGFAS[ev.art].org : null;
    if(_artOrg && _artOrg!=='坊市' && g.org && g.org!==_artOrg){
      addLog(`你已拜入${g.org}，无缘参悟他宗功法「${ev.art}」。`,'bad');
    } else {
    g.tangmenArts = g.tangmenArts || [];
    if(g.tangmenArts.indexOf(ev.art) < 0){
      g.tangmenArts.push(ev.art);
      g.gongfaOwned = g.gongfaOwned || []; if(g.gongfaOwned.indexOf(ev.art)<0) g.gongfaOwned.push(ev.art); // 习得功法入藏经阁库，可装备主修/辅修
      atlasGain('gongfas', ev.art); // 本局暂存，世末结算入图鉴
      // 功法无习得被动——宗门增益（ORG_BONUS['元始宗'] 六绝版）即集齐六部功法的回报，避免双重叠加
      addLog(`<b>习得元始宗功法「${ev.art}」！</b>（${g.tangmenArts.length}/6）`,'good');
    }
    }
  }
}
function regShen(g, o){ // 奇遇神通——shenPool 随机习得一门未拥有的奇遇神通
  // 奇遇神通——机缘事件选项 shenPool 字段，随机习得一门未拥有的奇遇神通
  if(o.shenPool){
    const _shenPool = o.shenPool.filter(_shenId=>SHENTONGS[_shenId] && (g.shentongOwned||[]).indexOf(_shenId)<0);
    if(_shenPool.length){
      const _shenId = _shenPool[Math.floor(Math.random()*_shenPool.length)];
      g.shentongOwned = g.shentongOwned||[]; g.shentongOwned.push(_shenId);
      atlasGain('shentongs', _shenId); // 本局暂存，世末结算入图鉴
      addLog(`<b>机缘神通！</b>你于机缘中习得神通「${_shenId}」（${SHENTONGS[_shenId].desc}）。`,'good');
    }
  }
}
function regArtPool(g, o){ // 机缘功法——artPool 随机习得一门未拥有的奇遇功法（金事件奖励天级功法）
  // 机缘功法——事件选项 artPool 字段，随机习得一门未拥有的奇遇功法（金事件奖励天级功法）
  if(o.artPool){
    const _artPool = o.artPool.filter(_artId=>GONGFAS[_artId] && (g.gongfaOwned||[]).indexOf(_artId)<0);
    if(_artPool.length){
      const _artId = _artPool[Math.floor(Math.random()*_artPool.length)];
      g.gongfaOwned = g.gongfaOwned||[]; g.gongfaOwned.push(_artId);
      atlasGain('gongfas', _artId);
      addLog(`<b>机缘功法！</b>你于机缘中参悟功法「${_artId}」（${GONGFAS[_artId].desc}）。`,'good');
    }
  }
}
function regPct(a, o){ // 势力链终点特色奖励——百分比永久加成（怪物之心全属性/撼岳锤法力量/龙威气血）
  // 势力链终点特色奖励——百分比永久加成（怪物之心全属性/撼岳锤法力量/龙威气血）
  if(o.pctEff){    Object.keys(o.pctEff).forEach(k=>{
      const pct = Math.round(o.pctEff[k]*100);
      if(k==='ALL'){
        ['力量','灵动','气血','神识','悟性'].forEach(ak=>{ a[ak] = Math.round(a[ak]*(1+o.pctEff[k])); });
        addLog(`<b>${pct}% 全属性永久加成！</b>（力量 ${a['力量']} / 灵动 ${a['灵动']} / 气血 ${a['气血']} / 神识 ${a['神识']} / 悟性 ${a['悟性']}）`,'good');
      } else {
        a[k] = Math.round(a[k]*(1+o.pctEff[k]));
        addLog(`<b>${k} +${pct}%（永久）！</b>当前 ${k} ${a[k]}。`,'good');
      }
    });
  }
}
function resolveEventLink(g, a, ev, o){ // 事件联动——evSet 记录机缘标记；evAdd 在已拥有标记时追加联动奖励
  //  事件联动：选项 evSet 记录机缘标记；evAdd 在已拥有标记时追加联动奖励
  if(o.evSet){ g.evFlags = g.evFlags||{}; g.evFlags[o.evSet]=true; addLog('<b>机缘引线：</b>命运之线悄然系上。','good'); }
  if(o.evClear && g.evFlags){ delete g.evFlags[o.evClear]; addLog('<b>机缘消散：</b>命运之线悄然断裂，后续机缘不再降临。','note'); } // 清除机缘标记（选项直接拒绝/放弃时终止后续事件链）
  if(o.evAdd && g.evFlags && g.evFlags[o.evAdd.flag]){
    const ex2 = o.evAdd.eff||{};
    const act2 = {};
    Object.keys(ex2).forEach(k=>{ let v=ex2[k]; if(k==='悟性' && v>0) v=gainWu(v); act2[k]=v; });
    const tx2 = Object.keys(act2).map(k=> k==='灵石' ? `灵石 ${act2[k]>0?'+':''}${act2[k]}` : `${k} ${act2[k]>0?'+':''}${act2[k]}`).join('，');
    Object.keys(act2).forEach(k=>{ if(k==='灵石'){ g.money += act2[k]; } else { g.a[k] += act2[k]; } });
    addLog(`<b>联动加成：</b>${o.evAdd.txt||'此前的机缘在此刻呼应'}（${tx2}）。`,'good');
  }
}
function resolveEventRoll(g, a, ev, o){ // 风险判定 roll——成功/无 roll 返回 win:true；失败可死亡（dead:true 中止）
  let win = true; // 标记 roll 是否成功（逆天机缘的 buff 仅成功/无 roll 时生效）
  if(o.roll){
    const _r = rerRoll(g, a, o); // 4.259：概率/结果/死亡判定抽子函数
    win = _r.win;
    if(_r.dead) return {dead:true, win:false};
  }
  return {dead:false, win:win};
}
function rerApply(g, a, key, v, isSucc){ // roll 奖励/代价键路由——灵石/贡献/子嗣/功德/业力/洗髓/羁绊/道侣境界/子嗣道基/道侣缘尽/事件标记/其他属性
  if(key==='灵石'){ g.money+=v; }
  else if(key==='贡献'){ g.gongxian=(g.gongxian||0)+v; }
  else if(key==='声望'){ g.prestige=(g.prestige||0)+v; } // 4.352 声望键特判——roll 成功/失败声望奖励走权威字段（原 else 错加 a.声望 无效字段）
  else if(key==='子嗣'){ g.children=Math.max(0,(g.children||0)+v); for(let _i=0;_i<v;_i++){ newKid(); } while(v<0 && (g.kids||[]).length>0){ g.kids.pop(); } addLog(`子嗣 ${v>0?'+':''}${v}。`,'sys'); }
  else if(key==='功德'){ const _v=v; g.功德=Math.max(0,(g.功德||0)+_v); }
  else if(key==='业力'){ const _v=v; g.业力=Math.max(0,(g.业力||0)+_v); }
  else if(key==='xiSui'){ xiSuiDan(); }
  else if(key==='bond'){ g.bond=Math.min(100,(g.bond||0)+Math.round(v)); }
  else if(key==='spouseLv'){ if(g.spouse){ const _sl=Math.min(10,Math.max(0,(g.spouseLv||0)+Math.round(v))); if(_sl!==(g.spouseLv||0)){ g.spouseLv=_sl; addLog(`道侣境界提升至「${realmName(CFG.realms[_sl])}」！`,'good'); } } }
  else if(key==='kidDao'){ const _kk=(g.kids||[]).find(kk=>!kk.done); if(_kk){ _kk.dao=Math.min(100,_kk.dao+Math.round(v)); } }
  else if(key==='spouseLost'){ g.spouse=''; g.spouseRole=''; g.bond=0; }
  else if(key==='evClear'){ if(g.evFlags) delete g.evFlags[v]; }
  else if(key==='修为'){ const _seg=subSegLen(g,(g.subRealm===undefined||g.subRealm===null)?0:g.subRealm); const _amt=Math.max(1,Math.round(_seg*v)); g.realmPos=Math.min(_seg,(g.realmPos||0)+_amt); } // 4.352 修为键=段内百分比（0.15=15%段长），与链嘉奖同语义
  else if(key==='herbs'){ g.herbs=(g.herbs||0)+Math.round(v); addLog(`灵草 +${Math.round(v)}。`,'good'); } // 4.355 灵草（roll 路径漏配分支，原落 a.herbs 无效字段）
  else if(key==='materials'){ g.materials=(g.materials||0)+Math.round(v); addLog(`妖材 +${Math.round(v)}。`,'good'); } // 4.355 妖材（同 herbs）
  else if(key==='lv'){ reeLvGain(g, v); } // 4.355 修为等级键（上古传承/战场传承 roll 成功奖励原落 a.lv 无效字段）
  else if(key==='寿元'){ g._lifeBonus=(isFinite(g._lifeBonus)?g._lifeBonus:0)+Math.round(v); lifeCapOf(); addLog(`寿元上限 +${Math.round(v)}。`,'good'); } // 4.355 寿元（古仙残念隐藏结局 roll 成功奖励原落 a.寿元 无效字段）
  else { if(typeof console!=='undefined' && console.warn && !['力量','灵动','气血','神识','悟性','家境','气运'].includes(key)) console.warn('[rerApply] 未消费roll奖励键: '+key+'='+v); // 4.355 开发期告警——未知键静默失效防再犯
    let _vv=v; if(key==='悟性' && _vv>0 && isSucc) _vv=gainWu(_vv); a[key]+=_vv; }
}
function rerRoll(g, a, o){ // roll 概率计算与结果——成功奖励/失败代价/失败死亡判定
  const base = a.悟性*0.004 + a.气血*0.003 + a.气运*0.004 + a.神识*0.002 + (o.roll.extra||0);
  const p = clamp(o.roll.chance + base, 0.05, 0.95);
  if(Math.random()<p){
    addLog(`<b>成功：</b>${o.roll.succText||'你赌赢了。'}`,'good');
    if(o.roll.succ) Object.keys(o.roll.succ).forEach(k=>{ rerApply(g, a, k, o.roll.succ[k], true); });
    // 百胜累计改由「魔渊杀戮场」事件链动态判定（四轮×25人），此处无 _shaKills 事件残留
    return {dead:false, win:true};
  }
  addLog(`<b>失败：</b>${o.roll.failText||'代价沉重。'}`,'bad');
  if(o.roll.fail) Object.keys(o.roll.fail).forEach(k=>{ rerApply(g, a, k, o.roll.fail[k], false); });
  if(o.roll.death && Math.random()<o.roll.death){ die(o.roll.deathText||'死于非命'); return {dead:true, win:false}; }
  return {dead:false, win:false};
}
function resolveEventBless(g, a, ev, o, rollWin){ // 逆天机缘/法宝机缘/建宗立派（roll 失败则机缘落空）
  // 逆天机缘「气运眷顾」buff——roll 失败则机缘落空（不给 buff）；成功/无 roll 则生效。
  // 多次机缘叠乘倍率、取更长时长（气运主角之运，机缘可叠加）
  if(o.fortune && rollWin){
    if(g._fortune){ g._fortune.mult *= o.fortune.mult; g._fortune.years = Math.max(g._fortune.years, o.fortune.years); }
    else { g._fortune = {years:o.fortune.years, mult:o.fortune.mult}; }
    g._heroFate = true;
    if(!g.achievements.includes('逆天机缘')) g.achievements.push('逆天机缘');
    addLog(`<b>气运眷顾！</b>${o.heroTxt||''}${o.fortune.years} 年内修炼速度 <b>×${g._fortune.mult}</b>——你仿佛被命运选中，直奔传说而去！`,'good');
  }
  // 法宝机缘（DL_RS_4.41，XL_RS 4.165 修订）：事件选项 bone 字段 → 装备一件法宝；roll 失败则机缘落空（成功/无 roll 才入手）
  if(o.bone && rollWin){
    const info = equipBone(o.bone);
    if(info) addLog(`<b>法宝入体！</b>远古法宝与你完全契合——<b>${info.grade}·${info.name}</b> 炼化入体，${info.main}+${info.pct}%（已入法宝库）${info.skill?('，附「'+info.skill+'」'):''}。`,'good');
  }
  if(o.joinOrg){ joinOrg(o.joinOrg); } // 建宗立派事件——选择后加入自建宗门
}
function resolveDuel(ev, idx){
  const g=G;
  const o = ev.opts[idx];
  if(o){ //  事件联动：对决选项同样支持 evSet/evAdd
    if(o.evSet){ g.evFlags = g.evFlags||{}; g.evFlags[o.evSet]=true; addLog('<b>机缘引线：</b>命运之线悄然系上。','good'); }
  if(o.evClear && g.evFlags){ delete g.evFlags[o.evClear]; addLog('<b>机缘消散：</b>命运之线悄然断裂，后续机缘不再降临。','note'); } // 清除机缘标记（选项直接拒绝/放弃时终止后续事件链）
    if(o.evAdd && g.evFlags && g.evFlags[o.evAdd.flag]){
      const ex2 = o.evAdd.eff||{};
      const act2 = {};
      Object.keys(ex2).forEach(k=>{ let v=ex2[k]; if(k==='悟性' && v>0) v=gainWu(v); act2[k]=v; });
      const tx2 = Object.keys(act2).map(k=> k==='灵石' ? `灵石 ${act2[k]>0?'+':''}${act2[k]}` : `${k} ${act2[k]>0?'+':''}${act2[k]}`).join('，');
      Object.keys(act2).forEach(k=>{ if(k==='灵石'){ g.money += act2[k]; } else { g.a[k] += act2[k]; } });
      addLog(`<b>联动加成：</b>${o.evAdd.txt||'此前的机缘在此刻呼应'}（${tx2}）。`,'good');
    }
  }
  if(!o){ addLog('你思虑片刻，终究没有下场。','note'); }
  else if(ev.mode==='elite') resolveElite(o);
  else if(ev.mode==='death') resolveDeath();
  else if(ev.mode==='league') resolveLeague(ev, o); // 4.335 擂台连战
  else resolveArena();
  advanceChain(ev, o);
  clampAll();
  settleZhenshen(); // 真身结算（对决/大赛/死斗共用）
  if(g.alive) endYear();
}
/* 战斗策略决策——战斗前选择战术姿态，影响成败与代价（贴合强攻/敏攻/防御流派）；
   法天相地：合体期以上可开，道行暴涨但力竭后虚弱，冷却 3 年 */
const STANCES = {
  junheng:{name:'均衡', d:'攻守兼备，四平八稳。', win:0, hurt:0},
  jingong:{name:'全力进攻', d:'强攻流：胜率更高（受力量加成），但莽撞冒进、受伤更重。', win:0.05, hurt:0.45, attr:['力量'], w:0.0018},
  youdou:{name:'身法游斗', d:'敏攻流：胜率提升（受灵动/神识加成），身法灵巧、受伤更轻。', win:0.02, hurt:-0.35, attr:['灵动','神识'], w:0.0010},
};
function stanceBonus(){
  const g=G, a=g.a, st=STANCES[g.stance]||STANCES.junheng;
  let win=st.win;
  (st.attr||[]).forEach(k=>{ win += Math.max(0,(a[k]||5)-5)*st.w; });
  const zs=!!g.zhenshen;
  if(zs) win += 0.12; // 法天相地：道行暴涨，胜率大增
  return {win, hurt: zs ? -0.3 : st.hurt, zs};
}
function renderStanceBar(){
  const g=G;
  const el=document.getElementById('stanceBar'); if(!el) return;
  const zsAvail = g.realm>=7;
  const zsOn = !!g.zhenshen;
  const zsCd = g._zsCd && g.age < g._zsCd;
  let h = '<span style="font-size:11px;color:var(--dim)">战斗战术：</span>';
  Object.keys(STANCES).forEach(k=>{
    const st=STANCES[k];
    h += `<button class="btn mini ${g.stance===k?'primary':''}" title="${st.d}" onclick="setStance('${k}')">${st.name}</button>`;
  });
  if(zsAvail){
    h += `<button class="btn mini ${zsOn?'primary':''}" title="法天相地：道行暴涨、胜率大增，但力竭后气血-8、冷却3年" onclick="toggleZhenshen()">法天相地${zsCd?'（休养中）':(zsOn?'·已激活':'')}</button>`;
  }
  el.innerHTML = h;
}
function setStance(k){ G.stance=k; renderStanceBar(); }
function toggleZhenshen(){
  const g=G;
  if(g._zsCd && g.age < g._zsCd){ addLog('法天相地力竭未复，尚需休养。','note'); return; }
  g.zhenshen = !g.zhenshen;
  addLog(g.zhenshen ? '<b>法天相地激活！</b>修为奔涌如潮，你的道行暴涨！' : '你散去法天相地。','sys');
  renderStanceBar();
}
function settleZhenshen(){
  const g=G;
  if(!g.zhenshen) return;
  g.zhenshen=false;
  g._zsCd = g.age + 3;
  g.a.气血 = Math.max(1, g.a.气血-8);
  addLog('<b>法天相地力竭。</b>修为透支，气血受损（-8），三年内难以再次施展。','bad');
}
function duelOppP(ratio){
  return power() * ratio * (0.93 + Math.random()*0.14);
}
function duelWinP(opp){
  const g=G, a=g.a;
  const p = power();
  let pr = 0.5 + (p - opp)/Math.max(opp,1) * 1.1;
  pr += (effAttr('力量')-5)*0.001 + (effAttr('灵动')-5)*0.0008 + (effAttr('气血')-5)*0.0004 + (a.气运-30)*0.001; // 终值判定
  pr += ({fei:-0.10, pu:-0.05, you:0.03, ding:0.10, super:0.14, shen:0.18, she:0.20}[g.soul.quality]||0); // 补圣灵根（最高档 +0.20）
  const _sm = stanceBonus(); // 战斗姿态修正
  pr += _sm.win;
  return clamp(pr, 0.05, 0.95);
}
// 结怨——生成/强化仇敌（上限3，超出则最旧仇敌加深仇恨）；每次结怨业力+3
function addEnemy(n){
  const g=G;
  if(!g.enemies) g.enemies=[];
  const _cnt = Math.max(1, Math.round(n||1));
  let _last = null;
  for(let i=0;i<_cnt;i++){
    if(g.enemies.length>=3){ g.enemies[0].ratio = Math.min(1.35, g.enemies[0].ratio+0.15); continue; }
    let _nm = ENEMY_NAMES[Math.floor(Math.random()*ENEMY_NAMES.length)];
    let _guard = 0;
    while(g.enemies.some(e=>e.name===_nm) && _guard++<20){ _nm = ENEMY_NAMES[Math.floor(Math.random()*ENEMY_NAMES.length)]; }
    const _r = Math.max(0, g.realm-1);
    _last = {name:_nm, lv:_r, ratio:0.85+Math.random()*0.25, born:g.age||0, kind:'仇怨'};
    g.enemies.push(_last);
  }
  g.业力 = (g.业力||0) + 3*_cnt;
  if(_last) addLog('你结下仇怨，仇家<b>'+_last.name+'</b>记恨于心。（业力+'+3*_cnt+'）','bad');
}
// 寻仇结算——正面对决（道行检验）/破财消灾/以德报怨/避而不见；返回 true 表示已陨落（跳过年度推进）
function resolveEnemy(ev, idx){
  const g=G, o=ev.opts[idx];
  if(!o) return false;
  if(!g.enemies || !g.enemies.length){ addLog('仇敌已散去，恩怨暂了。','note'); return false; }
  const _e = g.enemies[0];
  const _r = g.realm;
  if(_e.lv < _r-1) _e.lv = _r - (Math.random()<0.5?0:1); // 境界追赶：玩家突破后仇敌紧随（落后0~1大境界）
  const _opp = duelOppP(_e.ratio);
  let _pr = duelWinP(_opp);
  if(g.spouse && (g.bond||0)>=60) _pr = Math.min(0.95, _pr + Math.min(0.10, (g.bond||0)*0.001)); // 4.168：道侣助阵，对决胜率+羁绊×0.1%（上限+10%）
  const _lp = [0,1,3,8,15,30,60,120];
  // 4.295：超大函数拆分——四类处置抽 4 子函数
  if(o._act==='fight'){ if(reFight(g, o, _e, _r, _pr, _lp)) return true; }
  else if(o._act==='pay') rePay(g, o, _e, _r);
  else if(o._act==='mercy') reMercy(g, o, _e, _r);
  else if(o._act==='flee') reFlee(g, _e);
  clampAll();
  return false;
}
function reFight(g, o, _e, _r, _pr, _lp){ // 生死战——胜：灵石/声望/业力+仇敌退场；败：气血受损/身死/折寿/仇敌气焰更盛
  if(Math.random() < _pr){
    g.money = (g.money||0) + Math.round(150 + _r*90);
    g.prestige = (g.prestige||0) + 6;
    g.业力 = (g.业力||0) + 3;
    addLog('仇家<b>'+_e.name+'</b>毙于你剑下，恩怨了结，威名更盛。（业力+3）','good');
    g.enemies.shift();
  } else {
    g.a.气血 = Math.max(1,(g.a.气血||0)-Math.round(8+_r*2));
    if(Math.random() < 0.03){ die('仇家刀下'); return true; }
    g._lifeCut = (g._lifeCut||0) + _lp[_r];
    _e.ratio = Math.min(1.35, _e.ratio+0.12);
    addLog('你败于仇家<b>'+_e.name+'</b>之手，身受重创（气血受损、折寿'+_lp[_r]+'年），对方气焰更盛。','bad');
  }
  return false;
}
function rePay(g, o, _e, _r){ // 破财消灾——灵石足则恩怨两清，不足则怨隙更深
  const _cost = 200 + _r*120;
  if(g.money >= _cost){
    g.money -= _cost;
    addLog('你以 '+_cost+' 灵石破财消灾，仇家收下厚礼，恩怨两清。','good');
    g.enemies.shift();
  } else {
    _e.ratio = Math.min(1.35, _e.ratio+0.08);
    addLog('你灵石不足（需 '+_cost+'），仇家冷笑而去，怨隙更深。','bad');
  }
}
function reMercy(g, o, _e, _r){ // 以德报怨——净功德≥100 感化成功（功德+/业力-），不足则徒增怨隙
  const _gd = Math.max(0,(g.功德||0)-(g.业力||0));
  if(_gd >= 100){
    g.功德 = (g.功德||0) + 5;
    g.业力 = Math.max(0,(g.业力||0)-15);
    addLog('你以德报怨，仇家<b>'+_e.name+'</b>幡然醒悟、化敌为友。（功德+5，业力-15）','good');
    g.enemies.shift();
  } else {
    _e.ratio = Math.min(1.35, _e.ratio+0.06);
    addLog('你道心未足（需净功德≥100），感化不成，仇家嗤之以鼻。','bad');
  }
}
function reFlee(g, _e){ // 避而不战——声望受损，仇敌气焰更盛
  g.prestige = Math.max(0,(g.prestige||0)-3);
  _e.ratio = Math.min(1.35, _e.ratio+0.15);
  addLog('你避而不战，声望受损，仇家<b>'+_e.name+'</b>气焰更盛。','bad');
}
function resolveArena(){
  const g=G;
  const r = Math.round(120 + g.realm*70);
  const opp = duelOppP(0.92);
  if(Math.random() < duelWinP(opp)){
    g.money += r; g.prestige += 5; g.a.气血 += 2; g.a.力量 += 1; g.a.灵动 += 1;
    addLog(`<b>武斗场获胜！</b>你连挫数名对手，赢下灵石 ${r}、声望 +5，实战之下气血、力量与身法愈发扎实。`,'good');
  } else {
    g.money -= Math.max(30, Math.round(r*0.5));
    const _sa=stanceBonus(); g.a.气血 -= Math.max(1, Math.round(2*(1+_sa.hurt)));
    addLog('武斗场上一时不敌，你败下阵来，赔了彩金，身上添了几处淤青。','bad');
  }
}
function resolveElite(o){
  const g=G;
  // 诸宗联办论道大会（DL_RS_4.110）：贴合设定——预选赛（小组循环）→ 晋级赛 → 淘汰赛（十六强/八强/半决赛）→ 总决赛
  g._lunGroup = g.realm>=4?'元婴组':(g.realm>=3?'金丹组':'筑基组');
  // 4.242：超大函数拆分——赛程定义/结果结算抽 2 子函数
  const stages = eliteStages(); // 8 段赛程（难度递增 0.72→1.26）
  let wins = 0;
  for(let i=0;i<stages.length;i++){
    const st = stages[i];
    if(Math.random() < duelWinP(duelOppP(st.r))){
      wins++;
      addLog(`<b>论道 · ${st.name}：胜！</b>你在万众瞩目下一举击败对手，全场为之沸腾。`,'good');
    } else {
      addLog(`<b>论道 · ${st.name}：负。</b>强敌环伺，你力战不敌，论道之旅就此止步。`,'bad');
      break;
    }
  }
  eliteReward(wins, g); // 论道结果结算（魁首/亚军/四强八强/十六强以下/预选赛止步）
}
function eliteStages(){ // 论道大会赛程——预选赛 3 轮 → 晋级赛 → 十六强/八强/半决赛/总决赛
  return [
    {name:'预选赛·首轮', r:0.72},
    {name:'预选赛·次轮', r:0.78},
    {name:'预选赛·末轮', r:0.84},
    {name:'晋级赛', r:0.92},
    {name:'十六强', r:1.0},
    {name:'八强', r:1.08},
    {name:'半决赛', r:1.16},
    {name:'总决赛', r:1.26},
  ];
}
function eliteReward(wins, g){ // 论道结果结算——按胜场分 5 档奖励（灵石/声望/属性/宗门贡献/法宝）
  // 4.267：超大函数拆分——魁首(含亚军)/中档/低档抽 3 子函数
  if(wins >= 7){ elTop(wins, g); return; }
  if(wins >= 5){ elMid(wins, g); return; }
  elLow(wins, g);
}
function elTop(wins, g){ // 魁首/亚军档——高额奖励+宗门擢升+元始令+宝器
  if(wins === 8){
    const r = Math.round(800 + g.realm*200);
    g.money += r; g.prestige += 40; g.a.力量 += 4; g.a.灵动 += 3; g.a.气血 += 3; g.a.悟性 += gainWu(4);
    if(g.achievements.indexOf('论道魁首')<0) g.achievements.push('论道魁首');
    g.gongxian = (g.gongxian||0) + 300; // 论道魁首宗门贡献大赏（合并宗门大比）
    if(g.org && Math.random()<0.30){ // 魁首 30% 概率宗门擢升（promote 提前一档，修为达标才任）
      const _oi=POST_ORDER.indexOf(g.post||'');
      if(_oi>=0 && _oi<POST_ORDER.length-1){
        const _np=POST_ORDER[_oi+1];
        if(reqLvPass(g, POST_REQ[_np]||99)){ g.post=_np; addLog('<b>宗门擢升！</b>论道魁首之名震动宗门，你被破格擢升为<b>'+_np+'</b>！','good'); }
        else addLog('论道魁首之名震动宗门，宗门有意擢升你为<b>'+_np+'</b>，可惜修为尚差一线，暂且搁置。','note');
      }
    }
    if(g._lunGroup==='元婴组' && (g.yuanshiLing||[]).indexOf('玄令')<0){
      g.yuanshiLing = g.yuanshiLing || [];
      g.yuanshiLing.push('玄令');
      addLog('<b>获得元始令·玄令！</b>元婴组魁首之名，引动元始宗传承之钥显现。（'+g.yuanshiLing.length+'/6）','good');
    }
    const bi = equipBone('宝器');
    if(bi) addLog(`<b>问鼎论道大会！</b>你在诸宗联办论道大会总决赛上力压群雄，夺得<b>论道魁首</b>！灵石 +${r}、声望 +40，诸宗盟主亲授<b>宝器·${bi.name}</b>法宝，名动天下！`,'good');
    else addLog(`<b>问鼎论道大会！</b>你在诸宗联办论道大会总决赛上力压群雄，夺得<b>论道魁首</b>！灵石 +${r}、声望 +40，诸宗盟主亲授宝器法宝——可惜你修为不足无法融合，只能交由宗门保管。`,'good');
  } else {
    const r = Math.round(500 + g.realm*120);
    g.money += r; g.prestige += 20; g.a.力量 += 2; g.a.灵动 += 1; g.a.悟性 += gainWu(3);
    g.gongxian = (g.gongxian||0) + 150; // 论道亚军宗门贡献（合并宗门大比）
    const bi = equipBone('宝器');
    if(bi) addLog(`<b>论道 · 亚军！</b>你一路杀入论道大会总决赛，惜败于绝顶高手。诸宗盟主赠<b>宝器·${bi.name}</b>法宝，灵石 +${r}、声望 +20，虽败犹荣。`,'good');
    else addLog(`<b>论道 · 亚军！</b>你一路杀入论道大会总决赛，惜败于绝顶高手。诸宗盟主赠宝器法宝——可惜你修为不足无法融合，只能交由宗门保管，灵石 +${r}、声望 +20，虽败犹荣。`,'good');
  }
}
function elMid(wins, g){ // 四强/八强档——灵石/声望/属性/贡献
  const r = Math.round(300 + g.realm*80);
  g.money += r; g.prestige += 12; g.a.力量 += 1; g.a.悟性 += gainWu(1);
  g.gongxian = (g.gongxian||0) + 60; // 四强/八强宗门贡献（合并宗门大比）
  addLog(`你跻身论道大会 ${wins===6?'四强':'八强'}，最终惜败——收获灵石 ${r}、声望 +12 与宝贵的实战磨砺。`,'sys');
}
function elLow(wins, g){ // 十六强/预选赛档——基础奖励
  if(wins >= 3){
    const r = Math.round(180 + g.realm*50);
    g.money += r; g.prestige += 7; g.a.悟性 += gainWu(1);
    g.gongxian = (g.gongxian||0) + 20; // 十六强及以下宗门贡献（合并宗门大比）
    addLog(`你通过论道大会${wins===4?'晋级赛':'预选赛'}，止步${wins===4?'十六强':'晋级赛'}，拿到灵石 ${r}、声望 +7，也算见识了修仙界群英。`,'note');
  } else {
    const r = Math.round(100 + g.realm*30);
    g.money += r; g.prestige += 4;
    g.gongxian = (g.gongxian||0) + 20; // 预选赛止步宗门贡献（合并宗门大比）
    addLog(`论道大会你止步预选赛，重在参与——拿到出场灵石 ${r}、声望 +4。`,'note');
  }
}
function resolveDeath(){
  const g=G;
  const r = Math.round(900 + g.realm*220);
  const opp = duelOppP(1.18);
  if(Math.random() < duelWinP(opp)){
    g.money += r; g.prestige += 15; g.a.气血 += 5; g.a.力量 += 3; g.a.灵动 += 2;
    addLog(`<b>生死斗 · 生还！</b>黑角斗场的死斗中你力斩强敌，赢得灵石 ${r}、声望 +15，从尸山血海中全身而退。`,'good');
  } else {
    g.money -= Math.max(60, Math.round(200 + g.realm*80));
    const _sd=stanceBonus(); g.a.气血 -= Math.max(2, Math.round(12*(1+_sd.hurt))); g.a.力量 -= 4;
    addLog('<b>生死斗惨败！</b>你被打成重伤，赔尽积蓄，休养经年才缓过气来。','bad');
    if(Math.random() < 0.05){ die('倒在黑角斗场的血泊之中'); }
  }
}
function resolveLeague(ev, o){ // 4.335 擂台连战——连战 _leagueSeg 场（难度 0.72→1.27 递增），每胜力量/灵动递增奖励，败则中断受伤
  const g=G;
  const segs = Math.min(8, Math.max(3, ev._leagueSeg||5));
  const rBase = ev._leagueBase||100;
  let wins = 0;
  for(let i=0;i<segs;i++){
    const r = 0.72 + (i/(segs-1))*0.55;
    if(Math.random() < duelWinP(duelOppP(r))){
      wins++;
      addLog(`<b>擂台 · 第${i+1}/${segs}场：胜！</b>你力挫对手，全场喝彩雷动。`,'good');
    } else {
      addLog(`<b>擂台 · 第${i+1}/${segs}场：负。</b>强手如林，你力战不敌，连胜就此中断。`,'bad');
      break;
    }
  }
  const rw = Math.round(rBase + g.realm*60);
  if(wins>0){
    g.money += rw*wins; g.prestige += 3*wins; g.a.力量 += wins; g.a.灵动 += Math.ceil(wins/2);
    addLog(`<b>擂台连战告一段落。</b>你连战连胜 ${wins} 场，赢下灵石 ${rw*wins}、声望 +${3*wins}，实战磨砺之下力量 +${wins}、灵动 +${Math.ceil(wins/2)}。`,'good');
  } else {
    const _sa=stanceBonus(); g.a.气血 = Math.max(1, g.a.气血-Math.max(1, Math.round(3*(1+_sa.hurt))));
    addLog('擂台首场即败，你灰头土脸退下擂台，身上添了几处新伤。','bad');
  }
}
// 子嗣个体化——得子生成子嗣对象（name/quality/talent/dao/born/done/succ）
const KID_MALE = ['承远','慕仙','守一','明轩','清晏','之衡','长风','砚秋','云舟','鹤鸣','景行','怀瑾','疏狂','照夜','观澜','少卿','青崖','九思'];
const KID_FEMALE = ['若曦','晚晴','初雪','梦溪','芷兰','青黛','月白','听雨','疏桐','南枝','含章','清辞','云锦','昭华','静姝','明玦','照影','知微'];
const ENEMY_NAMES = ['血魔老祖','黑风老怪','白骨夫人','赤炎上人','幽冥散人','噬魂魔君','铁面煞星','阴煞真人','万毒老人','孤煞客']; // 仇敌名池
function kidSurname(){
  const _n = (G && G.name) || '';
  return _n ? _n.slice(0,1) : '苏';
}
function newKid(){
  const g=G;
  const _qIdx = ['fei','pu','you','ding','super','shen','she'];
  const _pq = (g.soul && g.soul.quality) || 'pu';
  const _pi = Math.max(0, _qIdx.indexOf(_pq));
  const _roll = Math.random();
  let _qi = _pi;
  if(_roll < 0.25) _qi = Math.min(6, _pi+1);
  else if(_roll < 0.5) _qi = Math.max(0, _pi-1);
  const _kid = {
    name: kidSurname() + pick(Math.random()<0.5 ? KID_MALE : KID_FEMALE),
    quality: _qIdx[_qi],
    talent: Math.min(100, Math.max(30, Math.round(50 + Math.random()*50 + ((g.a.气运||50)-50)*0.3))),
    dao: 0, born: g.age, done: false, succ: false
  };
  g.kids = g.kids || [];
  g.kids.push(_kid);
  return _kid;
}
function matureKids(){
  const g=G;
  return (g.kids||[]).filter(k=> (g.age-(k.born||0))>=8 && k.dao<100 && !k.done);
}
function succKids(){
  const g=G;
  return (g.kids||[]).filter(k=> k.done && k.succ);
}
function marriage(){
  const g=G;
  if(g.spouse) return;
  const cands=[];
  // 玩家性别随机（男/女），道侣为异性（g.gender 体系 DL_RS_4.157）
  const _pMale = (g.gender === '女'); // 道侣为男性？
  cands.push({n:'青梅竹马的恋人', t:'你与青梅竹马的恋人结为道侣，此生的羁绊自此有了归处。', eff:{悟性:2,力量:2}});
  cands.push({n:'门当户对的联姻对象', t:'家族为你定下一门门当户对的亲事，多了一份助力。', eff:{家境:8}});
  if(g.org) cands.push({n:'同门知心人', t:'你在宗门里寻到了知心人，朝夕相处，情愫渐生。', eff:{悟性:2,神识:2}});
  if((effAttr('力量')||0)>=20 || (effAttr('灵动')||0)>=20) cands.push({n:'并肩作战的同伴', t:'刀光剑影里，你与一位并肩作战的同伴生了情愫。', eff:{力量:3,灵动:3}}); // 终值判定
  if(_pMale){
    cands.push({n:'救下的落魄书生', t:'你在尘世救下一位落魄书生，他从此与你相依为命。', eff:{气血:3,悟性:2}});
    if((g.a.家境||0)>=30) cands.push({n:'世家公子', t:'豪门世家看中你的潜力，将公子托付于你。', eff:{家境:8,悟性:1}});
    cands.push({n:'蓝颜知己', t:'他懂你的抱负，也懂你的孤寂——得此知己，此生无憾。', eff:{悟性:2}});
  } else {
    cands.push({n:'救下的孤女', t:'你在尘世救下一位孤女，她从此与你相依为命。', eff:{气血:3,悟性:2}});
    if((g.a.家境||0)>=30) cands.push({n:'世家千金', t:'豪门世家看中你的潜力，将千金许配于你。', eff:{家境:8,悟性:1}});
    cands.push({n:'红颜知己', t:'她懂你的抱负，也懂你的孤寂——得此知己，此生无憾。', eff:{悟性:2}});
  }
  const c = cands[Math.floor(Math.random()*cands.length)];
  // /4.150：道侣生成个人名（spouse 存名字；关系类型存 spouseRole；性别与玩家相反，名字池/代词随性别）
  g.spouse = pick(_pMale ? ['萧景玄','顾长渊','谢无咎','沈孤鸿','叶清微','陆惊鸿','楚云深','苏折枝','洛青衫','温怀瑾','韩之恒','秦月白','慕容修远','上官云止','云暮寒','柳青崖','姜疏狂','林晚照'] : ['苏婉清','林轻尘','沈凝霜','白若雪','叶含烟','楚疏影','洛清瑶','顾月璃','陆云袖','唐芷若','云听澜','柳疏月','姜梦瑶','温灵犀','韩碧落','秦秋水','慕容青黛','上官白薇']);
  g.spouseRole = c.n;
  g.spouseGender = _pMale ? '男' : '女';
  g.spouseLv = g.realm; // 4.168：道侣境界随主角破境成长
  g.bond = 20 + Math.floor(Math.random()*15); // 道侣羁绊 0-100（双修/事件成长，渡劫加成上限+5%）
  Object.keys(c.eff).forEach(k=>{ g.a[k]=(g.a[k]||0)+c.eff[k]; });
  addLog(c.t,'good');
  addLog((_pMale?'他':'她')+'名唤 <b>'+g.spouse+'</b>（'+g.spouseRole+'），与你结下这段道缘。','good');
  if(Math.random()<0.5){ g.children=(g.children||0)+1; const _k=newKid(); addLog('次年，你有了第一个孩子'+_k.name+'。','good'); }
}

/* ============ 年度收尾 ============ */
/* 功法神通收集奖励——本局习得里程碑，每档一次、永久生效（功法→修炼基数，神通→战斗四维） */
const ART_COLLECT = {
  gongfas: [
    {n:5,  cult:0.5, txt:'收集 5 门功法，触类旁通，修炼基数 +0.5'},
    {n:10, cult:0.8, txt:'收集 10 门功法，博采众长，修炼基数 +0.8'},
    {n:15, cult:1.2, txt:'收集 15 门功法，贯通百家，修炼基数 +1.2'},
    {n:20, cult:1.6, txt:'收集 20 门功法，所学渐成体系，修炼基数 +1.6'},
    {n:30, cult:2.0, txt:'收集 30 门功法，学贯古今，修炼基数 +2.0'}
  ],
  shentongs: [
    {n:10, attrs:{力量:3, 灵动:3}, txt:'收集 10 门神通，出手老练，力量 +3、灵动 +3'},
    {n:20, attrs:{气血:5, 神识:5}, txt:'收集 20 门神通，法力精纯，气血 +5、神识 +5'},
    {n:30, attrs:{力量:5, 灵动:5}, txt:'收集 30 门神通，招式随心，力量 +5、灵动 +5'},
    {n:40, attrs:{气血:8, 神识:8}, txt:'收集 40 门神通，万法皆通，气血 +8、神识 +8'},
    {n:60, attrs:{力量:8, 灵动:8, 气血:8, 神识:8}, txt:'收集 60 门神通，万法归一，战斗四维各 +8'}
  ]
};
function checkArtCollect(){
  const g=G, a=g.a;
  if(!g || !g.gongfaOwned) return;
  const gf = (g.gongfaOwned||[]).length;
  const st = (g.shentongOwned||[]).length;
  g.artColGf = g.artColGf||0; g.artColSt = g.artColSt||0;
  (ART_COLLECT.gongfas||[]).forEach(t=>{
    if(gf>=t.n && g.artColGf<t.n){
      g.cultBonus=(g.cultBonus||0)+t.cult;
      g.artColGf=t.n;
      addLog('<b>功法收集奖励：</b>'+t.txt+'（永久）。','good');
    }
  });
  (ART_COLLECT.shentongs||[]).forEach(t=>{
    if(st>=t.n && g.artColSt<t.n){
      Object.keys(t.attrs).forEach(k=>{ a[k]=(a[k]||0)+t.attrs[k]; });
      g.artColSt=t.n;
      addLog('<b>神通收集奖励：</b>'+t.txt+'（永久）。','good');
    }
  });
}
function endYear(batch){
  const g=G;
  checkArtCollect(); // 功法神通收集奖励（本局习得里程碑，每年年末校验一次）
  // （修复）：年度收尾先清空事件卡片，防止异常路径下残留卡片被 AUTO 反复点击（曾致 bh1 链起点事件后 40~86 岁无日志、年龄直接跳到寿元耗尽）
  const _eb=$('eventBox'); if(_eb) _eb.innerHTML='';
  g.age += 1;
  g.yearCount += 1;
  // 4.219：超大函数拆分——按年度结算项抽子函数（结算/中止语义零变化）
  endYearHeal(g);          // 伤势自然愈合
  endYearDaoXin(g);        // 道心年度结算
  endYearWuDao(g);         // 悟道顿悟
  endYearOrg(g);           // 魔道业力 + 宗门任职俸禄
  endYearFortune(g);       // 气运眷顾 buff 递减
  if(endYearDujie(g, batch)) return;   // 飞升渡劫（渡劫圆满/身死/变散仙 中止）
  if(endYearSanxian(g)) return;        // 散仙自造仙基（证地仙 中止）
  const cap = lifeCapOf();
  if(g.age >= cap){ die('寿元耗尽，坐化于修行之地'); return; }
  if(batch) return;
  checkAchieves(); // 4.314 年度成就检查（条件满足自动解锁+发奖励）
  // XL_RS：事件中断闭关后自动续跑剩余年份（手动选择/自动挂机均生效）
  if(g._stepRemain > 0 && g.alive && !g.godTitle){
    const _k = g._stepRemain; g._stepRemain = 0;
    advanceYears(g._lastKind || '历练', _k);
    return;
  }
  if(AUTO.on){ renderGameAuto(); } else { renderGame(); }
  startYear();
}
function endYearHeal(g){ // 伤势自然愈合——按境界间隔（低境界 6 年/高境界 2 年）
  g._woundTick = (g._woundTick||0) + 1;
  if((g.wound||0) > 0 && g._woundTick >= woundHealYears()){
    g._woundTick = 0;
    g.wound = Math.max(0, (g.wound||0) - 1);
    addLog('伤势自然愈合，伤势-1。','good');
  }
}
function endYearDaoXin(g){ // 道心年度结算——道心通明（≥90）成就；道心崩塌（≤10）1% 心魔缠身折损 5% 修为（不跨境界）
  // 年度不再按功德/业力蚀养道心（道心=向道之心）
  if(g.daoXin >= 90 && g.achievements.indexOf('道心通明') < 0){ g.achievements.push('道心通明'); addLog('—— <b>道心通明</b>：历经沧桑道心愈发澄澈，自此道途坦荡（破境天劫+2%）。——','good'); }
  if(g.daoXin <= 10 && Math.random() < 0.01){
    const _c = Math.max(1, Math.round((g.realmPos||0) * 0.05));
    g.realmPos = Math.max(0, g.realmPos - _c);  // realmPos 版（段内修为倒退）
    addLog('—— <b>心魔缠身</b>：道心蒙尘，修行之际心魔骤起，修为折损 5%（道心 '+Math.round(g.daoXin)+'）。——','bad');
  }
}
function endYearWuDao(g){ // 悟道——炼虚后每二十年一次顿悟机缘（免费参悟未悟法则，不耗灵石不耗年）
  if(canWuDao(g) && (g.yearCount||0) % 20 === 0){ doWuDao(true); } // 顿悟改为每二十年一次（免费参悟未悟法则）
}
function endYearOrg(g){ // 魔道宗门被动业力 + 宗门任职按年领贡献+俸禄灵石（境界门槛由岗位自身保证）
  // 魔道宗门被动业力——修炼魔功自然业力缠身，每年 +1（到渡劫期业力可达魔道飞升门槛；正道路线不受影响）
  if(g.org && ['天尸宗','阴冥宗','血煞宗'].indexOf(g.org)>=0){
    g.业力 = (g.业力||0) + 1;
  }
  if(g.org && g.post){
    g.gongxian = (g.gongxian||0) + (POST_SALARY[g.post]||0);
    g.money = (g.money||0) + (POST_PAY[g.post]||0);
    if(Math.random()<0.05) addLog(`<b>宗门任职：</b>你作为${g.org}的${g.post}，领受宗门贡献 +${POST_SALARY[g.post]}、俸禄 +${POST_PAY[g.post]} 灵石。`,'sys');
  }
}
function endYearFortune(g){ // 逆天机缘「气运眷顾」buff 剩余年份递减（归零后消失）
  if(g._fortune){ g._fortune.years -= 1; if(g._fortune.years <= 0) g._fortune = null; }
}
function endYearDujie(g, batch){ // 飞升渡劫（91-99 一劫一级，三雷三火三风）；返回 true 中止本年年末
  // 渡劫期每年渡一劫：91 渡第一重雷劫……99 渡第九重风劫；九劫全过 → 真仙（100 级，与天同寿）
  // 失败：两成身死道消；八成重伤侥幸未死 → N 劫散仙（修为锁定渡劫第 N 劫，不再渡劫，可自造仙基成地仙）
  // 成功率修正：法宝（宝器每件+1%、仙器每件+3%、合计上限+18%，四件圆满该加成 ×1.5）+ 功德业力（每点 ±0.1%、上限±10%）+ 气运 + 轮回殿「天劫庇护」
  // 功德飞升——渡劫前净功德 >=200 塑造功德金身（成功率 35%+净功德×0.01%，上限 50%）
  // 魔道飞升——渡劫前净业力 >=200，入化魔池、凝魔躯，成则证九幽真魔飞升九幽魔界（成功率 40%+|业力|×0.01%，上限 55%）
  if(isDujieOf()){ // 渡劫期统一判定（排除突破挂起；功德/魔道飞升在大乘巅峰按钮自主选择），每年渡一劫
    if(g._dujieFirst){ g._dujieFirst = 0; addLog('—— <b>踏入渡劫之境</b>：天劫蓄势待发，来年将渡第一重雷劫。——','note'); }
    else if((g._jie||0) < 9){
      // 4.292：超大函数拆分——渡劫判定抽 edjTry（成败/身死/散仙三路）
      const jieN = (g._jie||0) + 1;
      const _jk = ['雷','雷','雷','火','火','火','风','风','风'][jieN-1];
      const _p = tribRate(g, jieN);
      return edjTry(g, batch, jieN, _jk, _p);
    }
  }
}
function edjTry(g, batch, jieN, _jk, _p){ // 渡劫判定——成功晋劫（九劫飞升）/失败两成身死/八成重伤成 N 劫散仙
  if(Math.random() < _p){
    g._jie = jieN;
    FIGHT_ATTRS.forEach(k=>{ g.a[k] += 1; }); // 渡劫期每渡一劫战斗四维+1（修为固定，不再随修为推进）
    addLog(`—— <b>第${jieN}重${_jk}劫</b>渡过！（成功率 ${Math.round(_p*100)}%）天威渐散，道行又进一步${jieN>=9?'，仙门已在眼前':''}。——`,'good');
    if(jieN >= 9 && !g.godTitle){ ascend(); return true; }
  } else {
    addLog(`—— <b>第${jieN}重${_jk}劫</b>轰然降临！（成功率 ${Math.round(_p*100)}%）天威如狱，你根基崩裂、气血逆涌……`,'bad');
    if(Math.random() < 0.20){
      if(g.spouse && (g.bond||0)>=90 && (g.spouseLv||0)>=3 && !g._spouseShield && Math.random() < 0.20){
        g._spouseShield = true;
        g.bond = Math.max(0, (g.bond||0) - 20);
        addLog('—— <b>第'+jieN+'重'+_jk+'劫</b>：生死一瞬，'+g.spouse+'以身为盾替你挡下天威——你重伤未死，道侣却仙基崩裂、重伤垂危（羁绊-20，此后不再相助）。——','bad');
      } else {
        die('第'+jieN+'重'+_jk+'劫身死道消'); return true;
      }
    }
    g._sanxian = jieN;
    g.realm = 9; g.subRealm = 0; g.realmPos = 0;  // 散仙修为固定渡劫起点（realm=9），劫数由 _sanxian 显示
    // 散仙寿元按渡过的劫数计算——每劫 10~15 年，上限 100 年（劫数越多仙基越稳，越接近渡劫圆满活得越久）
    g.lifeCap = g.age + Math.min(100, jieN * (10 + Math.floor(Math.random()*6)));
    addLog(`你于第${jieN}重${_jk}劫中身受重伤，侥幸未死——沦为 <b>${jieN}劫散仙</b>。散仙之躯可自造仙基，若成则证得地仙之位，然寿元所剩无多。`,'bad');
    clampAll();
    if(batch) return true;
    renderGame();
    startYear();
    return true;
  }
}
function endYearSanxian(g){ // 散仙自造仙基（4.60）：分两步——先筑仙台、再凝道果；道胎品质（有瑕/无缺/完美）影响两步成功率；返回 true 中止本年年末
  if(g._sanxian && !g.godTitle && g.alive){
    const _tai = (g.rings||[]).reduce(function(m,r){ return Math.max(m, (r&&r.y)||0); }, 0);
    if(!g._xiantai){
      if(Math.random() < ([0.012, 0.016, 0.03][_tai] || 0.012)){
        g._xiantai = true;
        addLog('—— <b>筑仙台成！</b>你于废墟中重塑根基，一座仙台拔地而起，只待凝道果证道！——','good');
      }
    } else if(Math.random() < ([0.014, 0.02, 0.035][_tai] || 0.014)){
      g._dixian = true; g.godTitle = '地仙'; g.shenkaoDone = true; g._sanxian = null; // 4.207f 地仙清理散仙标记，防修为段位残留「N劫散仙」
      g.realm = 9; g.subRealm = 0; g.realmPos = 0;  // 地仙修为固定渡劫起点（realm=9，仙位由 godTitle 显示）
      if(g.achievements.indexOf('证得地仙')<0) g.achievements.push('证得地仙');
      addLog('—— <b>凝道果成！</b>仙台之上道果凝聚，你证得 <b>地仙</b>之位，虽非真仙，亦超脱生死！——','good');
      finishLife('地仙'); return true;
    } else if(Math.random() < 0.5){
      g.a.气血 = Math.max(1, (g.a.气血||0) - 3);
      addLog('凝道果失败，仙体再受重创，气血亏损……','bad');
    }
  }
}
function die(cause){
  const g=G;
  g.alive=false; g.deathCause=cause;
  addLog(`—— ${cause} ——`,'bad');
  // 死亡时立即关闭自动模式，防止 setInterval 在 finishLife 后继续触发 renderGame 覆盖结局页面
  if(AUTO && AUTO.on){
    AUTO.on=false;
    AUTO._hqPaused = false; // v4.347：清暂停恢复标记——防红金事件挂起的 setTimeout 在结算后误恢复自动
    const _ba=$('btnAuto'); if(_ba){ _ba.textContent='自动'; _ba.classList.remove('auto-on'); }
    const _ah=$('autoHint'); if(_ah){ _ah.textContent='自动模式：按需智能行动、自动事件与猎妖，随时可停'; } // v4.347：同步提示文本，避免残留「挂机中」
  }
  finishLife();
}

/* ============ 结局 ============ */
// 综合评分（分数制，无上限）：境界 + 道行 + 成就 + 仙位 + 战斗四维
//  与道行口径同步（×10 放大）：炼气数千、金丹数万、元婴数万、大乘数十万、真仙数百万，大乘保底 10 万，无封顶
function endScoreParts(){ // 4.325 评分构成明细（与 endScoreOf 同源，总结页拆解展示用）
  const g=G;
  const parts = [];
  let score = 0;
  // 数值健壮性——防止Infinity/NaN导致评分计算异常
  const safeLv = realmAbs(g);
  score += (safeLv/125500) * 120;                        // 境界项分母 2510→125500（4.92 修为×50 同步），否则评分随修为暴涨50倍破上限
  const pw = power();
  const pwP = Math.round(isFinite(pw) ? pw / 10 : 0);  // 道行（新口径百万级，×600→×10 同步放大）
  score += pwP; parts.push({label:'道行', val:pwP});
  const achN = (g.achievements||[]).length;
  const achP = achN * 250; score += achP; parts.push({label:'成就×'+achN, val:achP});
  if(g.godTitle){ score += 1500; parts.push({label:'仙位', val:1500}); }  // 仙位
  if(safeLv >= CFG.realms[10]){ score += 5000; parts.push({label:'飞升成仙', val:5000}); }
  // 属性全部计入——战斗四维（普通人基准 5）均值超 5 部分 ×30；
  // 悟性/家境/气运（上限 100、开局 5-70）同样以 5 为基准，超部分 ×10（成长空间有限故权重较低）
  const avg = FIGHT_ATTRS.reduce((s,k)=>s+(isFinite(g.a[k])?g.a[k]:0),0) / 4;
  const fP = Math.max(0, Math.round((avg - 5) * 30)); score += fP; parts.push({label:'战斗四维', val:fP}); // 战斗四维（以普通人 5 为基准）
  let oP = 0; OTHER_ATTRS.forEach(k=>{ const _av = isFinite(g.a[k]) ? g.a[k] : 0; oP += Math.max(0, Math.round((_av - 5) * 10)); }); // 同四维均值 isFinite 防护（缺字段不污染评分）
  score += oP; parts.push({label:'悟性/家境/气运', val:oP});
  // 道胎按品质档计分（有瑕+400/无缺+800/完美+1600——品质越高价值越大）
  (g.rings||[]).forEach(r=>{
    const g2 = ringGradeOf(r.y); // 统一走 ringGradeOf 解析（兼容旧存档年限值），避免依赖 y>=2 的巧合
    const rv = g2 >= 2 ? 1600 : g2 >= 1 ? 800 : 400;
    score += rv; parts.push({label:g2>=2?'完美道胎':g2>=1?'无缺道胎':'有瑕道胎', val:rv});
  });
  // 法宝按品阶计分（凡器+200/灵器+300/宝器+600/仙器+1200）——4.332 只计装备在身的（boneEquipped 四槽同源），同品合并显示
  const _eqBones = [];
  BONE_SLOTS.forEach(function(_s){ const _b = boneEquipped(_s); if(_b) _eqBones.push(_b); });
  const _byGrade = {};
  _eqBones.forEach(function(_b){ _byGrade[_b.grade] = (_byGrade[_b.grade]||0) + 1; });
  Object.keys(_byGrade).forEach(function(_gr){
    const _c = _byGrade[_gr];
    const bv = _gr==='仙器' ? 1200 : _gr==='宝器' ? 600 : _gr==='灵器' ? 300 : 200;
    score += bv*_c; parts.push({label:'法宝·'+_gr+(_c>1?'×'+_c:''), val:bv*_c});
  });
  if(g.extraBone){ score += 800; parts.push({label:'本命法宝', val:800}); } // 本命法宝（罕见，约宝器档）
  // 移除 4.28b 大乘评分保底 10 万（与道行保底同步删除）——弱配大乘评分随道行自然呈现
  return {parts:parts, score: Math.round(score)};
}
function endScoreOf(){ return endScoreParts().score; } // 4.325 评分=同源明细聚合（保持原调用兼容）
/* 轮回点奖励（DL_RS_4.32）：以境界保底 + 评分上浮结算——
   境界决定最低档（评分不降档：高境界不会因评分波动而少拿奖励，
   修复「高境界+4 却因评分略低只得 +3」），评分决定档内加成（同境界评分越高越丰）。
   凡人保底 1 点；境界越高保底越高，成仙（万中无一）才高额。 */
function lundianReward(){
  const g=G, s = endScoreOf();
  // 修仙版轮回点（XL_RS 4.27）：按境界结算——金丹及以下保底 1；元婴 2；化神 3；炼虚 4；合体 5；大乘/渡劫 6；散仙 7；地仙 8；真仙 9
  let base;
  if(g._dixian || g.godTitle==='地仙') base = 8;   // 地仙（自造仙基）
  else if(g.realm >= 10) base = 9;        // 真仙
  else if(g._sanxian) base = 7;                     // 散仙（败劫未死）
  else if(g.realm >= 8) base = 6;         // 大乘 / 渡劫期
  else if(g.realm >= 7) base = 5;         // 合体
  else if(g.realm >= 6) base = 4;         // 炼虚
  else if(g.realm >= 5) base = 3;         // 化神
  else if(g.realm >= 4) base = 2;         // 元婴
  else base = 1;                                    // 金丹及以下（保底）
  // 评分加成（1~3）：评分越高奖励越多
  let extra = 0;
  if(s >= 1500000) extra = 3;           // 神级评分（真仙/顶级道号）
  else if(s >= 400000) extra = 2;       // 极限级评分（渡劫/高配大乘）
  else extra = 1;                       // 保底 +1
  return base + extra;
}
/* 道胎品质分级（有瑕/无缺/完美，颜色灰蓝金） */
const RING_LV = [
  {max:1, name:'有瑕道胎', key:'rl-100', p:60},
  {max:2, name:'无缺道胎', key:'rl-1000', p:150},
  {max:3, name:'完美道胎', key:'rl-10000', p:320}
];
function ringLevel(y){
  y = ringGradeOf(y);
  // 防御未赋值——按有瑕处理
  if(y===undefined || y===null || isNaN(y)) return RING_LV[0];
  for(const L of RING_LV){ if(y < L.max) return L; }
  return RING_LV[RING_LV.length-1];
}
/* 神通强度随道胎位递增（第九神通远强于第一神通） */
/* 4.207d 删除死函数 ringSkillP（道胎神通概率旧实现，无任何调用） */
function ringTag(r, i){
  const L = ringLevel(r.y);
  // 品质已含档位信息，直接显示品质名
  return `<span class="ering ${L.key}">${ringGradeKey(r.y)} ${ringNameOf(i)}</span>`; // 总结页道胎同游戏页格式「品质 境界道胎」，去序号/兽名/神通称号
}

// 性格评语（DL_RS_4.203：数据驱动——性格 × 本局实际成就，去掉纯套话，增强专属感）
function persEvalOf(){
  const g=G, s=g.soul||{};
  const age=g.age;
  const peak = g.realm>=10 ? '登临仙位' : g.realm>=9 ? ('以「'+(dhTxt(g)||s.name||'')+'」之名威震修仙界') : g.realm>=7 ? '修成炼虚法相' : g.realm>=5 ? '跻身元婴之境' : g.realm>=3 ? '小有所成' : '止步于修士之路的开端';
  const orgTxt = g.org ? ('于'+g.org+'扎根') : '';
  const p = g.personality;
  if(p==='勇猛') return pick([
    '你性烈如火，一生以战为骨，'+orgTxt+'从不后退半步——'+peak+'，便是热血浇出的答案。',
    '好勇斗狠四个字，你认了一辈子。'+age+' 载刀光剑影，你从未在战场上低过头。'
  ]);
  if(p==='沉稳') return pick([
    '你一生谨慎持重，把每一分修为都踩得极稳——'+age+' 载修行路一步没走错，终'+peak+'。',
    '不急不躁，步步为营。'+orgTxt+'你这份稳，才让'+(s.name||'灵根')+'伴你走到了 '+realmName()+'。'
  ]);
  if(p==='机敏') return pick([
    '你八面玲珑，善察人心——'+orgTxt+(g.realm>=9?('一路'+peak):'在乱世里活得比谁都明白')+'。',
    '机敏圆滑，是你在'+(g.org||'这乱世')+'活得最久的本事，'+age+' 年风浪，你皆从容化解。'
  ]);
  if(p==='隐忍') return pick([
    '你隐忍半生，厚积薄发——'+peak+'，是你忍字当头换来的答案。',
    '能屈能伸，'+age+' 年蛰伏不鸣，'+(g.realm>=9?'终鸣惊人':'熬过了所有艰难')+'。'
  ]);
  if(p==='豪迈') return pick([
    '快意恩仇是你一生的底色，'+orgTxt+peak+'，行事从不问值不值。',
    '你一生豪气干云，'+age+' 载恩怨分明。'+(s.name||'灵根')+'之名与你，皆是痛快二字。'
  ]);
  return '';
}

/* 正魔风格判定——魔（魔道飞升/入魔道宗/净功德业力≥40）、正（功德证道/净功德≥40）、其余中性 */
function deedStyleOf(g){
  const gd = g.功德||0, ye = g.业力||0;
  if(g._moAscend || g._moOrg || ye - gd >= 40) return 'mo';
  if(g._gongdeAscend || gd - ye >= 40) return 'zheng';
  return 'zhong';
}

function endEvalOf(){
  const g=G;
  const s=g.soul, qcn=Q_KEYS[s.quality], pw=power();
  const lv=g.realm; // ctx.lv 语义=境界序号（评语 cond 已改 c.g.realm 直读）
  const ach=[...(new Set(g.achievements||[]))];
  const fate=[];
  if(g.org) fate.push('入'+g.org);
  if(g.master) fate.push('拜师'+g.master);
  if(g.spouse) fate.push('结缡'+g.spouse);
  if(g.children) fate.push('育子'+g.children+'人');
  const _sks = succKids(); if(_sks.length>0) fate.push('道统传承·'+_sks[0].name); // 成才子嗣承继道统
  const fateTxt = fate.length ? fate.join('、') : '一生漂泊，无有定所';
  const artifactTxt = g.godArtifact ? `你以「${g.godArtifact}」为凭，` : '';
  const godPathTxt = g._dixian ? '重铸仙基' : (g._gongdeAscend ? '功德证道' : (g._moAscend ? '魔道飞升' : (g.godTitle ? '九劫尽渡' : '')));
  // 4.288：超大函数拆分——评语段生成抽 eeoBody（数据准备/组装保留主函数）
  // 正魔仙凡四风格——飞升→仙途（xian）；业力超功德→魔道（mo）；功德超业力→正道（zheng）；其余凡尘（fan）——整体贯穿评语各段，非首尾贴句
  const style = (g._dixian || g._gongdeAscend || g._moAscend || g.godTitle || g.realm >= 10 || g.endTag) ? 'xian' : (deedStyleOf(g)==='mo' ? 'mo' : (deedStyleOf(g)==='zheng' ? 'zheng' : 'fan'));
  const _asc = !!(g._dixian || g._gongdeAscend || g._moAscend || g.godTitle || g.realm >= 10);
  // 上下文对象（评语数据函数的参数）
  const _soulN = (s.name === qcn) ? qcn : qcn + s.name; // 4.207f 评语灵根名去重（圣灵根个体名=品质名时避免「圣灵根圣灵根」）
  const ctx = {g, s, qcn, pw, lv, ach, fateTxt, artifactTxt, godPathTxt, style, asc:_asc, soulName:_soulN};
  const body = eeoBody(ctx, g);
  return `<div class="end-eval-p">${body.first}</div><div class="end-eval-p">${body.second}</div><div class="end-eval-p">${body.realmEval}</div><div class="end-eval-p">${body.third}</div>${body.personaTxt?`<div class="end-eval-p">${body.personaTxt}</div>`:''}`; // 评语结构=总评/灵根/境界历程/享年结语/性格
}
function eeoBody(ctx, g){ // 评语五段生成——总评（EVAL_FIRST）/灵根（endEvalSecond）/境界历程（endEvalRealm）/享年结语（EVAL_THIRD）/性格（persEvalOf）
  // 第一段：命运总评（数据驱动匹配）
  const firstItem = EVAL_FIRST.find(item => item.cond(ctx));
  const first = firstItem ? pick(firstItem.texts.map(fn => fn(ctx))) : '';
  // 第二段：灵根点评（类型 × 品质）——4.231 拆 endEvalSecond
  const second = endEvalSecond(g.soul);
  // 第六段：际遇 + 享年 + 结语（数据驱动匹配）——境界历程叙述 4.231 拆 endEvalRealm
  let realmEval = endEvalRealm(g);
  let third = (g.realm >= 10 ? '神寿无尽，与天地同存。' : `享年 ${g.age} 岁。`); // 取消一生际遇小节
  const thirdItem = EVAL_THIRD.find(item => item.cond(ctx));
  if(thirdItem) third += pick(thirdItem.texts.map(fn => fn(ctx))); // 结语按风格函数化（与 EVAL_FIRST 一致）
  // 性格评语
  const personaTxt = persEvalOf();
  return {first:first, second:second, realmEval:realmEval, third:third, personaTxt:personaTxt};
}
function endEvalSecond(s){ // 灵根点评（类型 × 品质）——评语数据驱动表
  const typeDesc = {
    huo: pick(['火灵根，性烈如火——攻伐之气扑面而来，一言不合便以火行道。','火灵根傍身，你走的是炽烈刚猛的路，一身火气便是你的锋芒。']),
    wu: pick(['金灵根，锋锐内蕴——五行之中杀伐最利，炼器布阵皆有过人之资。','金灵根由锐金淬炼而成，锋芒毕露，攻守皆在一念之间。']),
    shui: pick(['水灵根，上善若水——柔韧多变，润物无声，道途绵长而不绝。','水灵根生于江河、长于湖海，你以水之柔韧，化尽了修行路上的千般险阻。']),
    feng: pick(['风灵根，迅疾如风——来去无踪，身法灵动，天下武功唯快不破。','风灵根与天地同气，你身法如风，一息千里，快意恩仇。']),
    lei: pick(['雷灵根，雷法刚猛——动若惊雷，攻伐爆裂，天威之下万物俯首。','雷灵根淬炼于九霄雷霆，你出手如雷，一击便教人胆寒。']),
    bing: pick(['冰灵根，寒冰沉静——凝神静气，心若冰清，道心之坚少有人及。','冰灵根生于极寒，你心性沉静，以冰之坚寒，守住了一生道心。']),
    shou: pick(['土灵根，厚重如山——气血雄浑，根基稳固，是稳扎稳打的修炼之资。','土灵根承大地之厚重，你一步一个脚印，把根基修得坚如磐石。']),
    zhi: pick(['木灵根，生生不息——草木荣枯皆成道，采药炼丹如鱼得水。','木灵根生于泥土、长于天地，你把草木的一枯一荣修成了自己的道。']),
    bt: pick(['根基中正平和，五行流转皆可修习——根骨之浑厚，道途平缓而绵长。','上善若水，兼收并蓄——你根基浑厚，各道皆可涉猎。'])
  };
  const qDesc = {
    fei: pick(['无灵根，修炼如逆水行舟，旁人十年之功，你要付出一生。可灵根虽废，你的狠劲却不曾废过。','无灵根起步，注定要比旁人多吃百倍的苦。可你偏不信命，硬生生把绝路走成了自己的路。']),
    pu: pick(['五行杂灵根，资质平平。可修仙界从不问灵根贵贱——平凡之魂，也能走出一段不凡的路。','五行杂灵根，不起眼的天赋，却是一段真实人生的起点。平凡之魂，亦有平凡人的滚烫。']),
    you: pick(['四灵根，资质上佳，是大多数修士仰望的存在，宗门愿为你倾注资源。','四灵根，资质出挑。你的名字，本该写在宗门重点培养的名册上。']),
    ding: pick(['三灵根，天生王者之姿，血脉里流淌着强者的印记，一呼一吸间皆是天骄气象。','三灵根，天骄之姿。从觉醒那一刻起，强者之路就已在脚下铺开。']),
    super: pick(['双灵根，绝世罕见。这种层次的天赋，整个修仙界都屈指可数——你生来就注定要搅动风云。','双灵根，凌驾顶级之上。血脉之强横，连太玄圣宗的史官都要为你多落几笔。']),
    shen: pick(['天灵根，万中无一。你，本就是为了成仙而生——这是太玄圣宗史册上都要浓墨重彩的一笔。','天灵根，天生不凡。这世上能与你比肩的觉醒者，一个时代也出不了几个。']),
    she: pick(['圣灵根，五行俱全、与道合真——这是传说级的资质，整个修仙界万古难见，你生来便是要证道的。','圣灵根，万古不遇。五行圆满、道韵天成，你的存在本身，就是天道对这一个时代的偏爱。'])
  };
  return `${typeDesc[s.cat]||''}${qDesc[s.quality]||''}`;
}
function endEvalRealm(g){ // 境界历程叙述（按突破年龄成句，来自 realmBreakCheck 记录）
  let realmEval = '';
  const _RA = g.realmAges || [];
  const _RAT = ['炼体','炼气','筑基','金丹','元婴','化神','炼虚','合体','大乘','渡劫'];
  let _rLast = -1;
  for(let _i=1;_i<=9;_i++){ if(_RA[_i]) _rLast = _i; }
  if(_rLast > 0){
    const _rParts = [];
    for(let _i=1;_i<=_rLast;_i++){
      if(!_RA[_i]) continue;
      const _nm = _RAT[_i];
      if(_i===1) _rParts.push(_RA[_i]+'岁炼体入门');
      else if(_i===9) _rParts.push(_RA[_i]+'岁踏入渡劫');
      else _rParts.push(_RA[_i]+'岁'+_nm);
    }
    realmEval = '境界历程：' + _rParts.join('，') + '。';
    if(_rLast >= 9) realmEval += '你一路破境直抵渡劫，道途之顺，近乎天意。';
    else if(_rLast >= 7) realmEval += '从炼体到'+_RAT[_rLast]+'，你把每一步都走成了坚实的台阶。';
    else if(_rLast >= 5) realmEval += '虽未登临绝顶，你也踏过了炼体以来的每一重山。';
    else realmEval += '修行路上，每一步都不曾虚度。';
  } else {
    realmEval = '境界历程：此生成于凡尘，止于凡尘。';
  }
  return realmEval;
}

function finishLife(force){
  const g=G;
  g.alive = false;
  // 结束游戏时立即关闭自动模式，防止 setInterval 在 show('screen-end') 后继续触发 renderGame 覆盖结局页面
  if(AUTO && AUTO.on){
    AUTO.on=false;
    AUTO._hqPaused = false; // v4.347：清暂停恢复标记——防红金事件挂起的 setTimeout 在结算后误恢复自动
    const _ba=$('btnAuto'); if(_ba){ _ba.textContent='自动'; _ba.classList.remove('auto-on'); }
    const _ah=$('autoHint'); if(_ah){ _ah.textContent='自动模式：按需智能行动、自动事件与猎妖，随时可停'; } // v4.347：同步提示文本，避免残留「挂机中」
  }
  g.endTag = force || ''; // 结局档位（飞升/地仙），供评语与后续判定使用
  // 4.226：超大函数拆分——按结算流程拆 5 个子函数（结局档位/图鉴/头部/总结页，渲染语义零变化）
  const _meta = finishLifeMeta(g);                    // 轮回点/道统铭刻/轮回榜/跨局成就 + saveMeta + 清总结页残留
  const _t = finishLifeTitle(g, force);               // 结局标题分档（含散仙按劫数分档）
  const endTitle = _t.title, endClass = _t.cls;
  const s=G.soul;
  const qw = Q_KEYS[s.quality];
  const title = G.daoHaoCore ? daoHaoFull(G) : realmTitle(); // 道号统一——优先新版道号（元婴定核心、随境界升后缀），无则回退旧版灵根道号
  G.finalTitle = title;
  const causeTxt = (force) ? '成仙' : (g.deathCause||'寿终正寝'); // force 非空即成仙档位
  finishLifeAtlas(g, endTitle);                            // 世末结算——本局收集统一写入跨世图鉴（里程碑日志）
  finishLifeHead(g, force, _meta.rew, _meta.b, endTitle, endClass, s, qw, title); // 正魔风格 + 标题 + 评分 + 评语
  $('endSummary').innerHTML = finishLifeSummary(g, s, qw, title, causeTxt);       // 总结页三区块
  show('screen-end');
}
function finishLifeMeta(g){ // 轮回点/道统铭刻/轮回榜/跨局成就记录 + saveMeta + 清总结页残留
  const rew = lundianReward(); // 轮回点按本局评分奖励（凡人保底 1 点，成仙 10 点）
  if(!g._statDone){ g._statDone = true; // 4.357 世末自动入档（轻量，供图鉴·统计全量聚合；与手动精华存档解耦）
    if(!META.statRows) META.statRows = [];
    META.statRows.push({godTitle:g.godTitle||'', deathCause:g.deathCause||'', soul:(g.soul&&g.soul.quality)?{quality:g.soul.quality}:null, age:g.age||0, score:endScoreOf()});
  }
  META.lundian = (META.lundian||0) + rew;
  recordDaoTong(); // 转世道统铭刻——按品质传承本局功法神通（各至多 3 门）
  const _b = boardRecord(); // 轮回榜记录（本局评分/道行/等级入榜）
  // 跨局成就记录（成仙/道号/冠军 → 收集称号）
  const _rec = META.records = META.records || {};
  if(g.endTag || g.godTitle) _rec.god = true; // 成仙：真仙/地仙即记（godTitle 仅成仙时赋值）
  if(g.realm >= 9) _rec.apex = true;
  if(g.realm >= 9) _rec.titled = true;
  if((g.achievements||[]).indexOf('论道魁首') >= 0) _rec.champion = true;
  // 4.318 秘境图鉴跨世累计——本局探秘记录并入轮回殿
  if(!META.mishiLog) META.mishiLog = {}; // 4.320 防御：任意路径下 META.mishiLog 缺失不崩溃
  const _ml0 = g.mishiLog || {};
  Object.keys(_ml0).forEach(function(id){
    const _cur = _ml0[id] || {times:0, best:0};
    const _mt = META.mishiLog[id] = META.mishiLog[id] || {times:0, best:0};
    _mt.times += _cur.times || 0;
    _mt.best = Math.max(_mt.best, _cur.best || 0);
  });
  // 成就系统——记录历史最优（评分/道行/等级），驱动「战绩类」成就判定
  if(_b.rec.score > (_rec.bestScore||0)) _rec.bestScore = _b.rec.score;
  if(_b.rec.power > (_rec.bestPower||0)) _rec.bestPower = _b.rec.power;
  if(_b.rec.lv > (_rec.bestLv||0)) _rec.bestLv = _b.rec.lv;
  if((_b.rec.jie||0) > (_rec.bestJie||0)) _rec.bestJie = _b.rec.jie||0;
  // 成就系统扩展——记录更多生涯维度（驱动新增成就）
  const _ach2 = g.achievements || [];
  if(_ach2.indexOf('仙器法宝')>=0) _rec.shiwan = true;
  if(_ach2.indexOf('极限淬体')>=0) _rec.jixian = true;
  if((g.rings||[]).length>=8) _rec.nineRings = true;
  if((g.bones||[]).length>=4) _rec.bonesAll = true;
  if(g.spouse) _rec.spouse = true;
  if(g.children && g.children>=1) _rec.child = true;
  const _cap2 = g.lifeCap || 0;
  if(_cap2>=500) _rec.longLife = true;
  if(_cap2>=1000) _rec.longLife2 = true;
  const _an = ['力量','灵动','气血','神识','悟性'];
  for(let _i=0;_i<_an.length;_i++){ const _v=(g.a||{})[_an[_i]]||0; if(_v>(_rec.bestAttr||0)) _rec.bestAttr=_v; }
  saveMeta();
  // 新局开局的总结页必须清空上一局的「本局历程」残留（否则新局总结页仍显示旧局历程，需手动点击才刷新）
  const _endLife=$('endLife'); _endLife.style.display='none'; _endLife.innerHTML='';
  return {rew:rew, b:_b};
}
function finishLifeTitle(g, force){ // 结局标题分档——成仙档位/渡劫分档/散仙按劫数/境界递降
  // 4.297：超大函数拆分——强制结局/境界结局抽 2 子函数
  if(force) return fltForce(g, force);
  return fltRealm(g);
}
function fltForce(g, force){ // 强制结局——飞升（功德/仙域）/地仙/九幽真魔
  if(force==='飞升'){
    if(g._gongdeAscend){ return {title:'真仙 · 功德证道', cls:'shen'}; }
    return {title:'真仙 · 飞升仙域', cls:'shen'};
  } else if(force==='地仙'){
    return {title:'地仙 · 重铸仙基', cls:'shen'};
  }
  return {title:'九幽真魔 · 魔道飞升', cls:'mo'}; // 魔道紫档
}
function fltRealm(g){ // 境界结局——成仙档/渡劫分档（散仙按劫数）/境界递降
  if(g.realm>=10){
    if(g.godTitle==='九幽真魔') return {title:'九幽真魔 · 魔道飞升', cls:'mo'}; // 魔道紫档
    if(g._gongdeAscend) return {title:'真仙 · 功德证道', cls:'shen'};
    return {title:'真仙 · 飞升仙域', cls:'shen'};
  }
  if(g.realm>=9){ // 渡劫期（realms[10]-1==realms[9]，原高分支恒被吞）按渡劫进度分档
    if(g._sanxian){ // 散仙结局——败劫幸存，修为锁定，按劫数分档
      const _sx = g._sanxian||0;
      if(_sx>=7) return {title:'八劫散仙 · 半步仙基', cls:'ding'};
      if(_sx>=5) return {title:'六劫散仙 · 劫后余生', cls:'ding'};
      if(_sx>=3) return {title:'四劫散仙 · 残躯存道', cls:'ding'};
      return {title:'散仙 · 仙途未竟', cls:'ding'};
    }
    const _trib = (g._jie||0);
    if(_trib>=9) return {title:'渡劫九重 · 半步成仙', cls:'ding'};
    if(_trib>=4) return {title:'渡劫强者 · 惊世之才', cls:'ding'};
    return {title:'渡劫修士 · 天劫临头', cls:'ding'}; // 渡劫期未过半身陨——非散仙也非大乘（不再错显大乘绝巅）
  }
  if(g.realm>=8) return {title:'大乘 · 一方巨擘', cls:'ding'};
  if(g.realm>=7) return {title:'合体 · 一方强者', cls:'you'};
  if(g.realm>=6) return {title:'炼虚 · 名动一域', cls:'you'};
  if(g.realm>=5) return {title:'化神 · 人中翘楚', cls:'you'};
  if(g.realm>=4) return {title:'元婴 · 小有名气', cls:'pu'};
  if(g.realm>=3) return {title:'金丹 · 站稳脚跟', cls:'pu'};
  if(g.realm>=2) return {title:'筑基 · 平顺一生', cls:'pu'};
  if(g.realm>=1) return {title:'炼气 · 初踏仙途', cls:'fei'};
  const legend = (g.achievements||[]).length >= 3;
  return {title: legend ? '凡人 · 不凡一生' : '凡人 · 尘埃一生', cls:'fei'};
}
function finishLifeAtlas(g, endTitle){ // 世末结算——本局收集（功法/神通）统一写入跨世图鉴，里程碑日志
  // 世末结算——本局收集（灵根/功法/神通/事件）统一写入跨世图鉴
  const _m0g = gongfaAtlasCultMult(), _m0s = shentongAtlasBonus();
  const _atlasAdd = flushAtlasGain();
  if(_atlasAdd && (_atlasAdd.gongfas || _atlasAdd.shentongs)){
    const _m1g = gongfaAtlasCultMult(), _m1s = shentongAtlasBonus();
    if(_m1g > _m0g) addLog(`<b>图鉴里程碑</b>跨世功法收集达成：修炼速度+${Math.round(_m1g*100)}%（下世起永久生效）。`,'good');
    if(_m1s > _m0s) addLog(`<b>图鉴里程碑</b>跨世神通收集达成：四维+${_m1s}（下世起永久生效）。`,'good');
  }
  recordAtlas('endings', endTitle); // 结局图鉴记录
}
function epitaphOf(g){ // 4.324 盖棺定论——总结页标题下一句话墓志铭（roguelike 分享点）
  const _r = g.realm;
  const realm = TIER_NAMES[_r] + '期';
  const age = g.age;
  const _id = g.org ? g.org.replace(/宗$/, '') + '弟子' : '散修';
  const _asc = !!(g._dixian || g._gongdeAscend || g._moAscend || g.godTitle || g.realm >= 10);
  if(_asc){
    let _how;
    if(g._dixian) _how = '劫满重铸仙基，证道地仙';
    else if(g._gongdeAscend) _how = '功德圆满，霞举飞升';
    else if(g._moAscend) _how = '以杀证道，魔焰焚天';
    else _how = '九劫尽渡，白日飞升';
    return pick([
      _how + '，' + realm + '之境，享年' + age + '岁。',
      '以' + _id + '之身，历' + age + '载修行，终至' + realm + '，' + _how + '。',
      realm + '登临绝顶——' + _id + '，' + _how + '。'
    ]);
  }
  const _ageTxt = age < 80 ? '英年早逝' : age < 200 ? '寿至百岁' : age < 400 ? '垂老而终' : '寿元绵长';
  return pick([
    _ageTxt + '的' + _id + '，止步' + realm + '。',
    realm + '之境，' + age + '岁而终——' + _id + '的一生，到此为止。',
    '抱憾而终的' + _id + '，空留' + realm + '之业，享年' + age + '岁。'
  ]);
}
function showScoreDetail(){ // 4.331 评分构成弹窗（触屏友好：点按查看，替代总结页直接铺开）
  showTipModal('评分构成', scoreDetailTxt());
}
function scoreDetailTxt(){ // 4.325 评分构成明细文案 + 升级提示（'再高 X 分可多得 1 点轮回点'）
  const _dp = endScoreParts();
  const _show = _dp.parts.filter(function(p){ return p.val > 0; });
  const _next = _dp.score < 400000 ? 400000 - _dp.score : _dp.score < 1500000 ? 1500000 - _dp.score : 0;
  let t = _show.map(function(p){ return p.label + ' ' + p.val; }).join(' · ');
  if(_next > 0) t += ' · <span style="color:var(--gold)">再高 ' + _next.toLocaleString() + ' 分可多得 1 点轮回点</span>';
  else t += ' · <span style="color:var(--gold)">评分已至巅峰，轮回点上浮拉满</span>';
  t += '<div style="margin-top:8px;border-top:1px dashed var(--line);padding-top:6px;font-size:11.5px;color:var(--dim)">轮回点按境界+评分：金丹及以下+1 · 元婴+2 · 化神+3 · 炼虚+4 · 合体+5 · 大乘/渡劫+6 · 散仙+7 · 地仙+8 · 真仙+9，评分高再上浮 1~3</div>';
  return t;
}
function finishLifeHead(g, force, rew, _b, endTitle, endClass, s, qw, title){ // 正魔风格 + 结局标题 + 评分 + 评语
  // 正魔风格——结局称号辉光 + 道途标签（正道金辉/魔道紫煞，中性无标签）
  const _deed = deedStyleOf(g);
  $('endTitle').innerHTML = escapeHtml(endTitle) + (_deed==='zheng'||_deed==='mo' ? ` <span class="deed-tag ${_deed}">${_deed==='zheng'?'正道':'魔道'}</span>` : '');
  $('endTitle').className = 'end-title ' + Q_COLOR[endClass] + (_deed==='mo' ? ' st-mo' : _deed==='zheng' ? ' st-zheng' : '');
  const _epi = epitaphOf(g); // v4.340 总结话语仅保留一处——只作一世评语开场（头部不再重复）
  const sc = endScoreOf();
  $('endScore').innerHTML = `<div style="display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap">
      <span class="score-big">${sc}</span>
      <span style="text-align:left">综合评分 · 无上限<br><span class="muted" style="font-size:13px">${force ? '神寿无尽' : `享年 <b>${g.age}</b> 岁`} · 修为 <b>${escapeHtml(realmName())}</b> · 道行 <b>${power()}</b> · ${escapeHtml(s.name)}${qw!==s.name ? '（'+qw+'）' : ''}${title?' · 道号「'+title+'」':''}</span></span>
    </div>
    <div class="muted" style="margin-top:8px">轮回点 <b class="cost">+${rew}</b> <span style="font-size:12px">（按境界+评分，详情见「查看评分构成」）</span></div>
    <div style="margin-top:8px"><button class="btn mini" onclick="showScoreDetail()">查看评分构成</button> <span style="font-size:11px;color:var(--dim)">逐项评分与轮回点上浮</span></div>
    ${_b.onBoard?`<div class="muted" style="margin-top:8px;color:var(--gold)">🏆 本局评分跻身<b>轮回榜第 ${_b.rank} 名</b>！从此榜上留名。</div>`:''}`;
  $('endEval').innerHTML = `<h3>一世评语</h3><div class="end-eval-p">${escapeHtml(_epi)}</div>${endEvalOf()}`; // v4.339 总结话语作为评语开场
}
function finishLifeSummary(g, s, qw, title, causeTxt){ // 总结页三区块——灵根道胎神通/最终属性历战/人生轨迹结局
  // 4.247：超大函数拆分——三区块组装抽 3 子函数
  return flsBlock1(g, s, qw) + flsBlock2(g) + flsBlock3(g, causeTxt) + flsBlock4(g);
}
function flsBlock1(g, s, qw){ // 区块一——姓名性格性别灵根/功法（主辅修含层数）/神通/道胎/法宝/本命法宝/仙衣
  // 4.263：超大函数拆分——基础行/功法神通/道胎法宝抽 3 子函数
  let sum = '<div class="es-block">';
  sum += fbBase(g, s, qw);
  sum += fbGfSt(g);
  sum += fbRings(g);
  sum += '</div>';
  return sum;
}
function fbBase(g, s, qw){ // 基础行——姓名/性格/性别/灵根（品质名与灵根名相同时不重复）
  let sum = '';
  sum += `<div class="es-row"><b>姓名</b>${(g.name && String(g.name).trim()) ? escapeHtml(g.name) : '无名'}</div>`; // 纯空格姓名兜底无名
  sum += `<div class="es-row"><b>性格</b>${escapeHtml(g.personality)}</div>`;
  sum += `<div class="es-row"><b>性别</b>${escapeHtml(g.gender)||'男'}</div>`;
  sum += `<div class="es-row"><b>灵根</b>${escapeHtml(s.name)}${qw && qw !== s.name ? '（'+escapeHtml(qw)+'）' : ''}</div>`; // 品质名与灵根名相同时不重复（无/杂/圣灵根）
  return sum;
}
function fbGfSt(g){ // 功法（主/辅修含层数）+ 神通——按品质着色（artTierOf 判定）
  let sum = '';
  // 结算面板展示功法（主修/辅修）与神通
  const _gf2 = g.gongfa || {};
  // 总结页功法/神通按品质着色（黄蓝/玄紫/地红/天金，artTierOf 判定）
  const _tierColor = function(_id, _tbl){ const _t = artTierName(_id, _tbl); return ART_TIER_COLOR[_t] || '#8f8fff'; };
  if(_gf2.main || _gf2.sub){
    const _gfTxt = [];
    if(_gf2.main) _gfTxt.push(`<span class="ering" style="border-color:${_tierColor(_gf2.main, GONGFAS)};color:${_tierColor(_gf2.main, GONGFAS)}">主修·${escapeHtml(_gf2.main)}（${gongfaLvName(_gf2.main)}）</span>`); // 功法显示层数
    if(_gf2.sub) _gfTxt.push(`<span class="ering" style="border-color:${_tierColor(_gf2.sub, GONGFAS)};color:${_tierColor(_gf2.sub, GONGFAS)}">辅修·${escapeHtml(_gf2.sub)}（${gongfaLvName(_gf2.sub)}）</span>`);
    sum += `<div class="es-row"><b>功法</b><span class="es-rings">${_gfTxt.join('')}</span></div>`;
  }
  if(g.shentong && g.shentong.length){
    sum += `<div class="es-row"><b>神通</b><span class="es-rings">${g.shentong.map(function(_sid){ const _c = _tierColor(_sid, SHENTONGS); return `<span class="ering" style="border-color:${_c};color:${_c}">${escapeHtml(_sid)}</span>`; }).join('')}</span></div>`;
  }
  return sum;
}
function fbRings(g){ // 道胎/法宝/本命法宝/仙衣行
  let sum = '';
  sum += `<div class="es-row"><b>道胎</b><span class="es-rings">${(g.rings||[]).map(ringTag).join('')||'<span class="muted">无</span>'}</span></div>`;
  // 副道胎已随双生灵根移除（g.dual 恒 null），原 if(false) 死代码已删
  if(g.bones && g.bones.length) sum += `<div class="es-row"><b>法宝</b><span class="es-rings">${BONE_SLOTS.map(_bs=>boneEquipped(_bs)).filter(Boolean).map(_b=>{const _by=_b.grade==='仙器'?2:_b.grade==='宝器'?1:0; return `<span class="ering ${ringLevel(_by).key}">${_b.grade}·${_b.name}（${_b.main}+${_b.pct}%）</span>`;}).join('')||'<span class="muted">无</span>'}</span></div>`;
  if(g.extraBone) sum += `<div class="es-row"><b>本命法宝</b><span class="es-rings"><span class="ering purple">${escapeHtml(g.extraBone.name)}（${escapeHtml(g.extraBone.grade||'凡器')} · ${g.extraBone.main}+${g.extraBone.pct}%·${g.extraBone.sub}+${g.extraBone.pct}%）</span></span></div>`; // 转义
  if(g.godArmor) sum += `<div class="es-row"><b>仙衣</b><span style="color:var(--gold)">四件法宝共鸣，仙衣加身</span></div>`; // 成道凝装
  return sum;
}
function flsBlock2(g){ // 区块二——最终属性（战斗四维高亮 + 功德业力道行）+ 本世历战
  let sum = '';
  sum += `<div class="es-block"><div class="es-row"><b>最终属性</b></div><div class="es-attrs">`;
  [['气血',''],['力量','fight'],['灵动','fight'],['神识','psi'],['悟性',''],['家境',''],['气运','']].forEach(([k,cls])=>{
    sum += `<span class="es-attr ${cls}">${k}<b> ${Math.floor((g.a||{})[k]||0)}</b></span>`;
  });
  sum += `<span class="es-attr gd">功德<b> ${Math.floor(g.功德||0)}</b></span>`; // 最终属性增功德/业力
  sum += `<span class="es-attr ye">业力<b> ${Math.floor(g.业力||0)}</b></span>`;
  sum += `<span class="es-attr fight">道行<b> ${power()}</b></span>`;
  sum += `</div></div>`;
  // 4.207b 本世历战统计（复盘：猎妖/斗法/走火入魔/历劫）
  const _stz = g.stats || {};
  const _dujieN = (g.realmAges||[]).filter(Boolean).length;
  sum += `<div class="es-row"><b>本世历战</b>猎妖 ${_stz.hunt||0} 战 · 斗法 ${_stz.fight||0} 战 · 走火入魔 ${_stz.wuxin||0} 次 · 大境界历劫 ${_dujieN} 重</div>`;
  return sum;
}
function flsBlock3(g, causeTxt){ // 区块三——人生轨迹与结局（势力师承道侣子嗣仙位结局成就）
  let sum = '';
  sum += `<div class="es-block">`;
  if(g.org) sum += `<div class="es-row"><b>势力</b>${escapeHtml(g.org)}</div>`;
  if(g.master) sum += `<div class="es-row"><b>师承</b>${escapeHtml(g.master)}</div>`;
  if(g.spouse) sum += `<div class="es-row"><b>道侣</b>${escapeHtml(g.spouse)}</div>`;
  if(g.children) sum += `<div class="es-row"><b>子嗣</b>${g.children} 人${(g.kids||[]).filter(k=>k.done&&k.succ).map(k=>' · '+escapeHtml(k.name)+'（成才）').join('')}</div>`; // 道统传承显示
  if(g.godTitle) sum += `<div class="es-row"><b>仙位</b>${escapeHtml(g.godTitle)}</div>`;
  sum += `<div class="es-row"><b>结局</b>${escapeHtml(causeTxt)}</div>`;
  sum += `<div class="es-row"><b>成就</b>${[...new Set(g.achievements)].map(escapeHtml).join('、')||'无'}</div>`; // 转义
  sum += `</div>`;
  return sum;
}
$('btnAgain').onclick = ()=>{
  // 轮回重开新一世——上局定制不延续，清空残留配置
  if(GIFT && (GIFT.wuQ||GIFT.fate||GIFT.evQ)){ GIFT = {wuQ:null, fate:null, evQ:null}; META.gift = {wuQ:null, fate:null, evQ:null}; saveMeta(); }
  startNewLife();
};
$('btnBackStart').onclick = ()=>{ renderStart(); show('screen-start'); };
$('btnSaveArchive').onclick = ()=>{ saveLifeArchive(); };
/* 查看本局历程：按年龄时间线展示本局全部日志（每次打开都渲染最新 G.log，杜绝旧局残留）；
   DL_RS_4.17：每条日志以金色「第X岁」标注年份，让哪一年发生了什么事一目了然 */
let _lifePage = 0; // 历程分页页码（0=最新一页），支持翻看更早记录
let _lifeFilter = 'all'; // 历程筛选：all/common/uncommon/rare/epic/legend/mythic/event/action
let _lifeSearch = ''; // 历程搜索关键字
function renderLifeLog(box){
  const log = G.log || [];
  if(log.length===0){ box.innerHTML='<div class="entry note">这一世平淡如水，没有留下任何值得书写的事迹。</div>'; return; }
  // 搜索框与日志列表分离，搜索时只更新日志列表，不重新创建搜索框，避免打断输入法
  const logListEl = box.querySelector('#logListContainer');
  if(logListEl){
    // 搜索框已存在，只更新日志列表
    updateLogList(box);
    return;
  }
  // 4.282：超大函数拆分——筛选栏 HTML/交互绑定抽 2 子函数
  // 第一次渲染：创建完整面板（包括搜索框和筛选按钮）
  box.innerHTML = rllHead();
  rllBind(box);
  updateLogList(box);
}
function rllHead(){ // 本局历程头部——标题/筛选按钮/搜索框/计数（首次渲染一次性创建）
  const filters = [
    {k:'all', n:'全部'}, {k:'event', n:'事件'}, {k:'action', n:'行动'},
    {k:'common', n:'白'}, {k:'uncommon', n:'绿'}, {k:'rare', n:'蓝'},
    {k:'epic', n:'紫'}, {k:'legend', n:'红'}, {k:'mythic', n:'金'}
  ];
  let html = `<h3 id="logTitle" style="margin:0 0 10px">本局历程</h3>`;
  html += `<div class="log-filter-bar">`;
  filters.forEach(f=>{
    const active = _lifeFilter===f.k ? 'active' : '';
    const qcls = f.k.startsWith('ev-') || ['common','uncommon','rare','epic','legend','mythic'].includes(f.k) ? 'q-'+f.k : '';
    html += `<button class="log-filter-btn ${qcls} ${active}" data-filter="${f.k}">${f.n}</button>`;
  });
  html += `<input class="log-search-input" id="logSearchInput" placeholder="搜索关键字..." value="">`;
  html += `<span class="log-filter-count" id="logCount"></span>`;
  html += `</div>`;
  html += `<div id="logListContainer"></div>`;
  html += `<div id="logPager"></div>`;
  return html;
}
function rllBind(box){ // 筛选按钮/搜索框事件绑定（防抖 300ms，不重建搜索框）
  // 绑定筛选按钮
  box.querySelectorAll('.log-filter-btn').forEach(btn=>{
    btn.onclick = ()=>{
      _lifeFilter = btn.dataset.filter;
      _lifePage = 0;
      // 更新筛选按钮状态
      box.querySelectorAll('.log-filter-btn').forEach(b=>{
        b.classList.toggle('active', b.dataset.filter === _lifeFilter);
      });
      updateLogList(box);
    };
  });
  // 绑定搜索框（防抖机制，不重新创建搜索框）
  const searchInput = box.querySelector('#logSearchInput');
  if(searchInput){
    let searchTimer = null;
    searchInput.oninput = (e)=>{
      if(searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(()=>{
        _lifeSearch = e.target.value;
        _lifePage = 0;
        updateLogList(box);
      }, 300);
    };
    searchInput.oncompositionend = (e)=>{
      if(searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(()=>{
        _lifeSearch = e.target.value;
        _lifePage = 0;
        updateLogList(box);
      }, 300);
    };
  }
}
// 只更新日志列表，不重新创建搜索框
function updateLogList(box){
  const log = G.log || [];
  // 4.271：超大函数拆分——过滤分页/渲染抽 2 子函数
  const fr = ullFilter(log);
  ullBody(box, fr.filtered, fr.show, fr.pages);
}
function ullFilter(log){ // 过滤（类型/搜索）+分页计算（每页 300 条）
  const matchFilter = (l)=>{
    if(_lifeFilter==='all') return true;
    if(_lifeFilter==='event') return (l.cls||'').startsWith('ev-');
    if(_lifeFilter==='action') return !(l.cls||'').startsWith('ev-');
    return (l.cls||'') === 'ev-'+_lifeFilter;
  };
  const matchSearch = (l)=>{
    if(!_lifeSearch) return true;
    return (l.text||'').replace(/<[^>]*>/g,'').toLowerCase().includes(_lifeSearch.toLowerCase()); // 先去 HTML 标签再搜索
  };
  const filtered = log.filter(l=> matchFilter(l) && matchSearch(l));
  const PER=300, pages = Math.max(1, Math.ceil(filtered.length/PER));
  if(_lifePage<0) _lifePage=0; if(_lifePage>pages-1) _lifePage=pages-1;
  const end = filtered.length - _lifePage*PER;
  const start = Math.max(0, end-PER);
  const show = filtered.slice(start, end);
  return {filtered: filtered, show: show, pages: pages};
}
function ullBody(box, filtered, show, pages){ // 渲染——标题/计数/列表/分页器
  // 更新标题
  const titleEl = box.querySelector('#logTitle');
  if(titleEl) titleEl.textContent = `本局历程（共 ${G.log.length} 条，筛选后 ${filtered.length} 条）`;
  // 更新计数
  const countEl = box.querySelector('#logCount');
  if(countEl) countEl.textContent = `显示 ${show.length}/${filtered.length} 条`;
  // 更新日志列表
  const listEl = box.querySelector('#logListContainer');
  if(listEl){
    if(show.length===0){
      listEl.innerHTML = '<div class="entry note">没有符合筛选条件的记录。</div>';
    } else {
      let html = '';
      show.forEach(l=>{
        const hasAge = /^第\s*\d+\s*岁/.test(l.text||'');
        const ageTxt = (!hasAge && l.age!=null) ? `<span class="ly">第${l.age}岁</span>` : '';
        html += `<div class="entry ${l.cls||''}">${ageTxt} ${l.text}</div>`;
      });
      listEl.innerHTML = html;
    }
  }
  // 更新分页
  const pagerEl = box.querySelector('#logPager');
  if(pagerEl){
    if(pages>1){
      pagerEl.innerHTML = `<div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn" id="lgOlder" ${_lifePage>=pages-1?'disabled':''}>‹ 更早记录</button>
        <span class="muted" style="font-size:12px">第 ${_lifePage+1}/${pages} 页 · 每页 300 条</span>
        <button class="btn" id="lgNewer" ${_lifePage<=0?'disabled':''}>更新记录 ›</button>
        </div>`;
      const oldBtn = pagerEl.querySelector('#lgOlder'), newBtn = pagerEl.querySelector('#lgNewer');
      if(oldBtn) oldBtn.onclick = ()=>{ _lifePage = Math.min(pages-1, _lifePage+1); updateLogList(box); };
      if(newBtn) newBtn.onclick = ()=>{ _lifePage = Math.max(0, _lifePage-1); updateLogList(box); };
    } else {
      pagerEl.innerHTML = '';
    }
  }
}
$('btnLifeLog').onclick = ()=>{
  const box = $('endLife');
  if(box.style.display !== 'none'){ box.style.display='none'; box.innerHTML=''; return; }
  _lifePage = 0; // 每次打开历程从最新一页开始
  _lifeFilter = 'all'; // 每次打开重置筛选
  _lifeSearch = ''; // 每次打开重置搜索
  renderLifeLog(box);
  box.style.display='block';
};
function startNewLife(){
  closeAllModals(); // 新局关闭所有遗留弹窗（防轮回重开后成就墙自动弹出）
  // 来世天赋配置持久化（META.gift），开局不再清空——防轮回点白白损失；
  // 先以无定制状态生成基线觉醒（退点回滚目标），再应用已配置的定制（品质保底/命格指定）
  const _g = GIFT;
  GIFT = {wuQ:null, fate:null, evQ:null};
  G = rollAttrs();
  _prevAttrs = null; // 重置属性高亮对比基准（避免上一局属性影响新局高亮）
  // 投胎/觉醒合并为一页——开局即初始化字段/抽取命格/觉醒灵根，灵根与战斗天赋同页显形
  initLifeFields();
  awakenSoul(G);
  G._giftBase = giftBaseSnapshot(); // 无定制基线觉醒（退点回滚目标）
  GIFT = _g;
  if(GIFT.wuQ || GIFT.fate) reAwaken(); // 应用持久化定制配置
  renderRoll();
  show('screen-roll');
}

/* ============ 事件库（139 个，分品质/互斥/once/事件链；DL_RS_4.7 扩充 18 个修仙界情节事件） ============ */
/* EVENTS 已外置 data 文件 */
// （防御）：启动即清理 EVENTS 数组空洞（编辑遗留 `},,` 等会插入 undefined），避免 find/filter 遍历崩溃
EVENTS = EVENTS.filter(e=>!!e);
// 4.304：事件查找映射——启动即构建 name / chainId:step 索引，find/filter 线性扫描改 O(1)（事件库 150+ 条）
const EV_BY_NAME = {}; const EV_BY_CHAIN = {};
EVENTS.forEach(function(_e){ if(!_e) return; if(_e.name) EV_BY_NAME[_e.name] = _e; if(_e.chainId !== undefined && _e.step !== undefined){ const _k = _e.chainId+':'+_e.step; if(EV_BY_CHAIN[_k] === undefined) EV_BY_CHAIN[_k] = _e; } });

/* ============ 成就系统 ============
   4.314：结构化成就表——年度检查解锁（key 与既有 g.achievements 字符串一致，老存档不重复发奖）；
   批测（__NORENDER）短路，不污染数值。 */
const ACHIEVES = [
  {key:'初入道途', d:'踏入炼气，正式踏上修仙路', cond:function(g){return (g.realm||0)>=1;}, rw:{money:100}},
  {key:'筑基有成', d:'筑就仙基，寿元大进', cond:function(g){return (g.realm||0)>=2;}, rw:{money:200}},
  {key:'金丹大道', d:'凝结金丹，踏上大道', cond:function(g){return (g.realm||0)>=3;}, rw:{money:300}},
  {key:'元婴化神', d:'元婴出窍，化神有望', cond:function(g){return (g.realm||0)>=4;}, rw:{money:400}},
  {key:'炼虚合体', d:'炼虚合体，道体合一', cond:function(g){return (g.realm||0)>=6;}, rw:{money:600}},
  {key:'大乘之巅', d:'大乘圆满，只待天劫', cond:function(g){return (g.realm||0)>=8;}, rw:{money:800}},
  {key:'百岁修士', d:'寿元过百，少见高龄', cond:function(g){return (g.age||0)>=100;}, rw:{herbs:3}},
  {key:'千年道行', d:'活过千岁，当世罕见的大修士', cond:function(g){return (g.age||0)>=1000;}, rw:{money:1000}},
  {key:'首杀妖兽', d:'第一次猎妖得手', cond:function(g){return (g._huntKill||0)>=1;}, rw:{mats:1}},
  {key:'斗法首胜', d:'第一次斗法取胜', cond:function(g){return (g._fightWin||0)>=1;}, rw:{money:150}},
  {key:'丹道初窥', d:'炼成第一炉丹药', cond:function(g){return (g._danOk||0)>=1;}, rw:{herbs:2}},
  {key:'功法小成', d:'任一功法参悟至第三重', cond:function(g){return Object.keys(g.gongfaLv||{}).some(function(k){return (g.gongfaLv[k]||0)>=3;});}, rw:{mats:2}},
  {key:'功法大成', d:'任一功法参悟至第九重圆满', cond:function(g){return Object.keys(g.gongfaLv||{}).some(function(k){return (g.gongfaLv[k]||0)>=9;});}, rw:{money:500}},
  {key:'法宝', d:'获得第一件法宝', cond:function(g){return (g.bones||[]).length>=1;}, rw:{money:100}},
  {key:'仙器法宝', d:'获得仙器级法宝', cond:function(g){return (g.bones||[]).some(function(b){return !!(b&&b.grade==='仙器');});}, rw:{money:800}},
  {key:'本命法宝', d:'炼成本命法宝，心意相通', cond:function(g){return !!g.extraBone;}, rw:{money:300}},
  {key:'道侣同心', d:'结为道侣，双修同游', cond:function(g){return !!g.spouse;}, rw:{herbs:3}},
  {key:'儿孙满堂', d:'育有两名子嗣', cond:function(g){return (g.children||0)>=2;}, rw:{mats:2}},
  {key:'宗门中坚', d:'宗门贡献达 500', cond:function(g){return (g.gongxian||0)>=500;}, rw:{money:300}},
  {key:'富甲一方', d:'身家灵石过万', cond:function(g){return (g.money||0)>=10000;}, rw:{herbs:5}},
  {key:'渡劫初试', d:'渡过第一重天劫', cond:function(g){return (g._jie||0)>=1;}, rw:{money:500}},
  {key:'仙衣凝聚', d:'四件法宝共鸣，凝聚仙衣', cond:function(g){return !!g.godArmor;}, rw:{money:1000}},
  {key:'飞升成仙', d:'九劫圆满，肉身成仙', cond:function(g){return !!g.godTitle;}, rw:{money:2000}}
];
function achGot(k){ return (G.achievements||[]).indexOf(k)>=0; }
function achRwTxt(rw){ return [rw&&rw.money?('灵石+'+rw.money):'', rw&&rw.mats?('妖材+'+rw.mats):'', rw&&rw.herbs?('灵草+'+rw.herbs):''].filter(Boolean).join('、'); }
function tryUnlockAch(k){ // 解锁单个成就（条件满足+未解锁→push 成就+发奖励+日志）；批测短路不污染数值
  if(typeof __NORENDER!=='undefined' && __NORENDER) return false;
  const g=G; if(!g) return false;
  const def=ACHIEVES.find(function(a){return a.key===k;}); if(!def) return false;
  if(achGot(k)) return false;
  if(!def.cond(g)) return false;
  g.achievements = g.achievements||[]; g.achievements.push(k);
  if(def.rw){ g.money=(g.money||0)+(def.rw.money||0); g.materials=(g.materials||0)+(def.rw.mats||0); g.herbs=(g.herbs||0)+(def.rw.herbs||0); }
  const _t = achRwTxt(def.rw);
  addLog('<b>成就达成：'+k+'</b>'+( _t?('（奖励 '+_t+'）'):'')+'——'+def.d,'gold');
  return true;
}
function checkAchieves(){ // 年度成就检查（endYear batch 分支后调用；批测/无局短路）
  if(typeof __NORENDER!=='undefined' && __NORENDER) return;
  if(!G) return;
  for(let i=0;i<ACHIEVES.length;i++){ tryUnlockAch(ACHIEVES[i].key); }
}
function openAchModal(){ // 成就墙弹窗——已达成金色✓+奖励，未达成置灰显示条件
  const _m=$('achModal'); if(_m) _m.style.display='flex';
  const _b=$('achModalBody'); if(!_b) return;
  _b.innerHTML = ACHIEVES.map(function(a){
    const _got = achGot(a.key);
    const _rw = achRwTxt(a.rw);
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 4px;border-bottom:1px dashed var(--line)">'
      + '<span style="font-size:12.5px;line-height:1.5' + (_got?'':';opacity:.55') + '">' + (_got?'<b style="color:var(--gold)">✓ '+a.key+'</b>':a.key)
      + '<br><span style="font-size:11px;color:var(--dim)">'+a.d+(_got&&_rw?(' · 已领 '+_rw):'')+'</span></span>'
      + '<span style="font-size:11px;color:var(--dim);white-space:nowrap">'+(_got?'已达成':'未达成')+'</span></div>';
  }).join('');
}
function closeAchModal(){ const _m=$('achModal'); if(_m) _m.style.display='none'; }

/* ============ 自动挂机 ============
   自动模式下：行动按需智能选择（缺钱经营/寿元紧张苦修/近关口苦修/低悟性交游/常规历练），
   猎妖选「中」档，事件优先选无风险选项；随时可手动停止。 */
let AUTO = {on:false, speed:4, cool:0, acc:0, pauseMs:1500, strat:{alchemy:true, wu:true, wudao:true, org:true, forge:true, duel:true, mishi:true}}; // 4.313 策略开关——默认全开（等价旧智能决策）；alchemy=自动炼丹延寿/买寿元方 wu=自动参悟 wudao=悟道 org=宗门任务 forge=炼器 duel=斗法 mishi=秘境探索
try{ const _ap = parseInt(localStorage.getItem('dl_rs_autoPause')||'1500', 10); if(!isNaN(_ap) && [0,1500,3000,5000].indexOf(_ap)>=0) AUTO.pauseMs = _ap; }catch(e){}
try{ const _st = JSON.parse(localStorage.getItem('dl_rs_strat')||'null'); if(_st && typeof _st==='object'){ for(const _k in AUTO.strat){ if(typeof _st[_k]==='boolean') AUTO.strat[_k]=_st[_k]; } } }catch(e){}
/* 策略开关辅助——批测/UI 共用（AUTO 缺失或未定义时默认开=旧行为） */
function stratOn(k){ try{ return !(AUTO && AUTO.strat && AUTO.strat[k]===false); }catch(e){ return true; } }
function openStratModal(){ const _m=$('stratModal'); if(_m) _m.style.display='flex'; const _b=$('stratModalBody'); if(_b){ _b.innerHTML = STRAT_ITEMS.map(function(s){ return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 4px;border-bottom:1px dashed var(--line)"><span style="font-size:13px;line-height:1.5"><b style="color:var(--gold)">'+s.n+'</b><br><span style="font-size:11px;color:var(--dim)">'+s.d+'</span></span><button class="btn mini" style="min-width:56px;padding:6px 10px" onclick="toggleStrat(\''+s.k+'\')" id="stbt_'+s.k+'">'+(AUTO.strat[s.k]?'开':'关')+'</button></div>'; }).join(''); }
  STRAT_ITEMS.forEach(function(s){ const _b=$('stbt_'+s.k); if(_b) _b.style.color = AUTO.strat[s.k] ? 'var(--gold)' : 'var(--dim)'; }); }
function toggleStrat(k){ if(!AUTO.strat) AUTO.strat={}; if(AUTO.strat[k]===undefined) AUTO.strat[k]=true; AUTO.strat[k]=!AUTO.strat[k]; try{ localStorage.setItem('dl_rs_strat', JSON.stringify(AUTO.strat)); }catch(e){} openStratModal(); }
function closeStratModal(){ const m=$('stratModal'); if(m) m.style.display='none'; }
const STRAT_ITEMS=[
  {k:'alchemy', n:'自动延寿', d:'寿尽前 30 年自动炼服寿元丹 / 买丹方（耗药材灵石）'},
  {k:'wu', n:'自动参悟', d:'灵石富余（留 500 缓冲）时闭关参悟主修功法'},
  {k:'wudao', n:'自动悟道', d:'炼虚后定期闭关参悟法则（耗 10 年）'},
  {k:'org', n:'宗门任务', d:'贡献不足时自动做宗门任务换贡献'},
  {k:'forge', n:'自动炼器', d:'法宝可升阶且资源足时自动重铸（耗材料灵石）'},
  {k:'duel', n:'自动斗法', d:'金丹+气血足时挑战同境修士赚灵石（有走火风险）'},
  {k:'mishi', n:'秘境探索', d:'周期性入当前秘境冒险（有伤势风险，机缘与凶险并存）'}
];
const _updAutoBtns = () => {
  const _sb = document.getElementById('btnAutoSpeed');
  if(_sb){ _sb.textContent = '速度 ×'+AUTO.speed; _sb.style.color = AUTO.speed>1 ? 'var(--gold)' : ''; }
  const _pb = document.getElementById('btnAutoPause');
  if(_pb){ _pb.textContent = '暂停 '+(AUTO.pauseMs===0?'关':(AUTO.pauseMs/1000)+'s'); _pb.style.color = AUTO.pauseMs>0 ? 'var(--gold)' : ''; }
};
_updAutoBtns();
// 4.206q：移动端 touchstart 即时响应（click 在 touchend 后合成，移动端有 ~300ms 延迟，
// 挂机高频渲染下主线程忙时点击易排队/丢失→「停止」关不掉、速度调不了）；
// preventDefault 阻止 click 双触发（桌面无 touchstart 走 onclick，防抖锁兜底重复）。
const _autoToggle = function(ev){
  if(ev && ev.type === 'touchstart' && ev.cancelable) ev.preventDefault();
  const _wasPaused = AUTO._hqPaused; // 红金品质事件暂停恢复中
  AUTO._hqPaused = false; // 玩家手动操作，取消高品质事件的自动恢复
  const _now = Date.now();
  if(AUTO._btnLock && (_now - AUTO._btnLock) < 400) return; // 4.206p：防抖——移动端渲染卡顿下连点只生效一次，避免自动/停止来回翻转
  AUTO._btnLock = _now;
  if(_wasPaused){ AUTO.on = false; } // 暂停恢复中点击=明确停止（取消恢复、保持关闭），避免 on=!on 误判为"开启"导致无法关闭
  else { AUTO.on = !AUTO.on; }
  $('btnAuto').textContent = AUTO.on ? '停止' : '自动';
  $('btnAuto').classList.toggle('auto-on', AUTO.on);
  $('autoHint').textContent = AUTO.on ? '自动挂机中……点击「停止」随时接管手动' : '自动模式：按需智能行动、自动事件与猎妖，随时可停'; $('autoHint').title = AUTO.on ? '自动挂机中……点击「停止」随时接管手动' : '自动模式：行动按需智能选择（缺钱经营/寿元紧张苦修/近关口苦修/低悟性交游/常规历练）、自动选择事件与猎妖，随时可停';
};
$('btnAuto').addEventListener('touchstart', _autoToggle, {passive:false});
$('btnAuto').onclick = _autoToggle;
const _autoSpeed = function(ev){
  if(ev && ev.type === 'touchstart' && ev.cancelable) ev.preventDefault();
  const _sopts = [1,4,8];
  AUTO.speed = _sopts[(_sopts.indexOf(AUTO.speed)+1)%_sopts.length];
  _updAutoBtns();
  try{ localStorage.setItem('dl_rs_autoSpeed', String(AUTO.speed)); }catch(e){}
};
const _autoPause = function(ev){
  if(ev && ev.type === 'touchstart' && ev.cancelable) ev.preventDefault();
  const _popts = [0,1500,3000,5000];
  AUTO.pauseMs = _popts[(_popts.indexOf(AUTO.pauseMs)+1)%_popts.length];
  _updAutoBtns();
  try{ localStorage.setItem('dl_rs_autoPause', String(AUTO.pauseMs)); }catch(e){}
};
const _abS=document.getElementById('btnAutoSpeed'); if(_abS){ _abS.addEventListener('touchstart', _autoSpeed, {passive:false}); _abS.onclick=_autoSpeed; }
const _abP=document.getElementById('btnAutoPause'); if(_abP){ _abP.addEventListener('touchstart', _autoPause, {passive:false}); _abP.onclick=_autoPause; }
const _abSt=document.getElementById('btnStrat'); if(_abSt){ _abSt.addEventListener('touchstart', function(ev){ if(ev.cancelable) ev.preventDefault(); openStratModal(); }, {passive:false}); _abSt.onclick=function(){ openStratModal(); }; }
const _abAch=document.getElementById('btnAch'); if(_abAch){ _abAch.addEventListener('touchstart', function(ev){ if(ev.cancelable) ev.preventDefault(); openAchModal(); }, {passive:false}); _abAch.onclick=function(){ openAchModal(); }; }

// 4.362：所有弹窗关闭 X 按钮加 touchstart 即时响应——移动端高频渲染下 onclick 易丢失，touchstart 立即关闭
(function(){
  var modalIds=['stratModal','achModal','mishiModal','cultModal','tribModal','breakModal','wudaoModal'];
  modalIds.forEach(function(mid){
    var m=document.getElementById(mid);
    if(!m) return;
    var spans=m.querySelectorAll('span[onclick]');
    for(var i=0;i<spans.length;i++){
      var s=spans[i];
      if(s.getAttribute('title')!=='关闭') continue;
      // 增大触控热区到 44x44px
      s.style.display='inline-flex';
      s.style.alignItems='center';
      s.style.justifyContent='center';
      s.style.minWidth='32px';
      s.style.minHeight='32px';
      s.style.padding='6px';
      s.addEventListener('touchstart', function(ev){
        if(ev.cancelable) ev.preventDefault();
        var fn=this.getAttribute('onclick');
        if(fn){ try{ eval(fn); }catch(e){} }
      }, {passive:false});
    }
  });
})();

// 检测是否有任何弹窗打开（自动挂机时暂停，防止高频渲染吞掉关闭按钮事件）
function anyModalOpen(){
  // 弹窗打开时自动暂停——防止高频渲染吞掉关闭按钮 touch/click 事件
  if(anyModalOpen()) return;
  var ids=['stratModal','achModal','mishiModal','cultModal','tribModal','breakModal','wudaoModal','atlasModal','boardModal','artModal'];
  for(var i=0;i<ids.length;i++){ var m=document.getElementById(ids[i]); if(m && getComputedStyle(m).display!=='none') return true; }
  var ev=document.querySelector('.evmodal'); if(ev&&getComputedStyle(ev).display!=='none') return true;
  return false;
}
// 关闭所有弹窗（新局/切屏时调用，防遗留弹窗遮挡）
function closeAllModals(){
  var ids=['stratModal','achModal','mishiModal','cultModal','tribModal','breakModal','wudaoModal','atlasModal','boardModal','artModal'];
  for(var i=0;i<ids.length;i++){ var m=document.getElementById(ids[i]); if(m) m.style.display='none'; }
  document.querySelectorAll('.evmodal').forEach(function(e){ e.style.display='none'; });
}

setInterval(()=>{
  if(!AUTO.on) return;
  // btnAuto 可能尚未渲染，防御空值
  const btnAuto = $('btnAuto');
  // 结算界面：自动停止
  if($('screen-end') && $('screen-end').classList.contains('active')){ if(btnAuto) btnAuto.click(); return; }
  // 游戏未进行中（投胎/觉醒界面）：不动，等手动进入
  if(!$('screen-game') || !$('screen-game').classList.contains('active')) return;
  // 速度累加器——每 tick 累积 speed，达 3.6 阈值即执行一次动作；
  // ×1 约每 4 tick 一次、×2 约每 2 tick 一次、×4 每 tick 一次、×8 每 tick 约两次（真正线性倍速，修复 ×8 与 ×4 同速 bug）
  AUTO.acc = (AUTO.acc || 0) + AUTO.speed;
  const STEP = 3.6;
  while(AUTO.acc >= STEP && AUTO.on){
    AUTO.acc -= STEP;
    if(!autoAct()) break; // 无可用动作则停止本轮
  }
}, 60);
// 单次自动动作：事件优先选无风险选项；行动默认历练、猎妖选中档；返回是否实际点击
/* 自动决策抽纯函数——autoAct（UI 挂机）与 autoPre（批测）共用同一决策源，阈值只改一处（根治 4.205t 双份代码漂移）
   纯函数：决策无副作用（仅斗法预生成 window._fightNPC 供 doFight 使用）；
   返回动作标识：'heal'疗伤丹 / 'rest'调养 / 'qi'回气丹 / '经营' / '苦修' / '悟道' / '参悟' / '斗法' / null=无高优决策（走行动池）
   ctx.actCount：频率计数（调用方递增后传入，UI 与批测各自维护同源计数） */
function decideNext(g, ctx){
  ctx = ctx || {};
  const _c = (ctx.actCount != null) ? ctx.actCount : (g._autoActCount||0);
  // 4.266：超大函数拆分——急救/寿命渡劫/成长行动抽 3 子函数
  const _h = dnHeal(g, _c);
  if(_h) return _h;
  const _l = dnLife(g, _c);
  if(_l) return _l;
  return dnProgress(g, _c);
}
function dnHeal(g, _c){ // 急救层——伤势按级购服/调养，气血急救
  if((g.wound||0) >= 3 && g.money >= 80) return 'heal'; // 濒危按需购服（缺口颗数由 execNext 计算）
  if((g.wound||0) >= 2) return 'rest'; // 重伤优先调养
  if((g.wound||0) === 1 && _c % 2 === 0) return 'rest'; // 轻伤隔年调养
  if((g.a.气血||0) < 35 && g.money >= 60) return 'qi'; // 回气丹急救（60 灵石 +8 血）
  return null;
}
function dnLife(g, _c){ // 寿命/渡劫层——寿尽前 30 年延寿（炼丹/买丹方），15 年苦修冲刺，渡劫期备战
  // A1 寿命管理——寿尽前 30 年自动延寿（寿元丹：材料够即炼；灵石够且未掌握丹方则买丹方）；寿尽前 15 年全力苦修冲修为（突破延寿）
  if(!g._sanxian && lifeCapOf() - g.age < 30 && stratOn('alchemy')){ // 4.313 策略开关
    if((g.danfangOwned||[]).indexOf('shou') >= 0){
      if((g.materials||0) >= 2 && (g.herbs||0) >= 3) return '炼寿元';
      if((g.herbs||0) >= 3 && (g.money||0) >= Math.max(0, 2-(g.materials||0))*30) return '炼寿元';
    }
    if((g.danfangOwned||[]).indexOf('shou') < 0 && (g.money||0) >= 1000) return '买寿元方';
  }
  if(!g._sanxian && lifeCapOf() - g.age < 15 && (g.realm||0) < 9){ // 4.308 寿尽冲刺灵石不足防空转：够苦修则苦修，不够先经营攒钱（同渡劫备战，避免 AUTO 下静默空转卡死）
    const _kc = Math.floor((15 + g.a.家境*0.2) * (CFG.cult.coef[g.realm] || 1));
    return (g.money||0) >= _kc ? '苦修' : '经营'; }
  if(isDujieOf()){ // 渡劫期灵石够→苦修（提道行→渡劫率↑），不够→经营备战（每年渡一劫，不涉险）
    const _need9 = Math.floor((15 + g.a.家境*0.2) * (CFG.cult.coef[g.realm] || 1)) * 20;
    return (g.money||0) < _need9 ? '经营' : '苦修';
  }
  return null;
}
function dnProgress(g, _c){ // 成长行动层——悟道/参悟/宗门任务/自动炼器/斗法
  if(stratOn('wudao') && canWuDao(g) && !g._sanxian && (g.money||0) >= wuDaoCost(g) && g.age + 10 <= lifeCapOf() && wuDaoRate(g) >= 0.08 && _c % 3 === 0) return '悟道'; // 炼虚后定期闭关悟道（法则之力：破境+2%/渡劫+1%）；4.313 策略开关
  if(stratOn('wu') && !g._sanxian && (g.gongfa||{}).main && gongfaLvOf(g.gongfa.main) < 9 && (g.money||0) >= wuGongfaCost(g.gongfa.main) + 500 && g.age + 10 <= lifeCapOf() && wuGongfaRate(g.gongfa.main) >= 0.30 && _c % 3 === 0) return '参悟'; // 主修层<9 定期闭关参悟（灵石留 500 缓冲）；4.313 策略开关
  if(stratOn('org') && g.org && !g._sanxian && (g.realm||0) < 9 && (g.gongxian||0) < 500 && _c % 6 === 0) return '宗门任务'; // 4.208b 宗门任务——贡献不足时优先做任务（频率%6 不挤占修炼）；4.313 策略开关
  if(stratOn('forge') && !g._sanxian && _c % 12 === 0){ // 4.209 自动炼器——有可升阶法宝且资源足时低频重铸（凡→灵→宝→仙，量力而行）；4.313 策略开关
    const _cand = (g.bones||[]).find(function(b){ if(!b || b.grade==='仙器') return false;
      const _f2 = b.grade==='凡器' ? 300 : b.grade==='灵器' ? 1500 : 8000;
      const _m2 = b.grade==='凡器' ? 2 : b.grade==='灵器' ? 4 : 8;
      const _rl = b.grade==='凡器' ? 2 : b.grade==='灵器' ? 4 : 8;
      const _rr = b.grade==='凡器' ? 1 : b.grade==='灵器' ? 4 : 8;
      return (g.money||0) >= _f2 && (g.materials||0) >= _m2 && g.realm >= _rl && (g.rings||[]).length >= _rr; });
    if(_cand) return '炼器';
  }
  if(stratOn('mishi') && (g.realm||0) >= 1 && (g.wound||0) < 2 && g.age + 1 <= lifeCapOf() && _c % 10 === 0) return '探秘'; // 4.315 秘境探索——%10 低频，机缘与凶险并存（策略开关可关）
  if(stratOn('duel') && !g._sanxian && (g.realm||0) >= 3 && (g.a.气血||0) > 50 && (g._fightCd||0) !== g.age && (g.money||0) >= 200 && _c % 8 === 0){ // 斗法修复——门槛 0.55/0.52 + 金丹+ + 频率%8；4.313 策略开关
    window._fightNPC = genFightNPC();
    const _fT = (g.wound||0) >= 1 ? 0.55 : 0.52;
    if(fightWinRate(window._fightNPC) > _fT) return '斗法';
  }
  return null;
}
/* 执行 decideNext 返回的动作（无 DOM 渲染）；opts.log=false 时静默（批测）；返回是否执行了高优动作 */
function execNext(act, g, opts){
  opts = opts || {};
  const _log = opts.log !== false;
  if(act === 'heal'){ return execHeal(g, _log); } // 4.256：疗伤丹购服抽子函数
  if(act === 'rest'){ doAction('调养'); return true; }
  if(act === 'qi'){ g.money -= 60; g.a.气血 += 8; if(_log){ addLog('自动服下回气丹，气血 +8。','good'); } return true; }
  if(act === '斗法'){ doFight(); return true; }
  if(act === '宗门任务'){ doOrgTask(); return true; }
  if(act === '炼器'){ return execForge(g, _log); } // 4.256：自动炼器抽子函数
  if(act === '悟道'){ doWuDao(false); return true; }
  if(act === '参悟'){ doWuGongfa(g.gongfa.main); return true; }
  if(act === '探秘'){ doActionTanMi(g); return true; } // 4.315 自动秘境探索
  if(act === '炼寿元'){ return execAlchemy(g, _log); } // 4.256：自动炼丹抽子函数
  if(act === '买寿元方'){
    if((g.money||0) >= 500){
      g.money -= 500;
      g.danfangOwned = g.danfangOwned || [];
      if((g.danfangOwned||[]).indexOf('shou') < 0) g.danfangOwned.push('shou');
      if(_log) addLog('寿尽在即，购得「寿元丹」丹方（灵石-500）。','good');
    }
    return true;
  }
  if(act === '经营' || act === '苦修'){
    if(act === '苦修'){ const _kc = Math.floor((15 + g.a.家境*0.2) * (CFG.cult.coef[g.realm] || 1)); if((g.money||0) < _kc){ doAction('经营'); return true; } } // 4.308 灵石不足自动转经营，防空转
    doAction(act); return true; }
  return false;
}
function execHeal(g, _log){ // 自动疗伤——按缺口购服疗伤丹（每 80 灵石一颗，攒满即愈）
  const _needD = woundDanNeed();
  const _gap = _needD - (g._woundDan||0);
  const _n = Math.max(1, Math.min(_gap, Math.floor(g.money/80)));
  const _w0 = g.wound||0;
  for(let _i=0;_i<_n;_i++){
    g.money -= 80;
    g._woundDan = (g._woundDan||0) + 1;
    if(g._woundDan >= _needD){ g._woundDan = 0; g.wound = Math.max(0,(g.wound||0)-1); }
  }
  if(_log){ const _red = (g.wound||0) < _w0; addLog(_red ? '自动购服疗伤丹 ×'+_n+'，伤势-1。' : '自动购服疗伤丹 ×'+_n+'（药力渐微，还需 '+(g._woundDan>0?_needD-g._woundDan:_needD)+' 颗）。', _red?'good':'note'); }
  return true;
}
function execForge(g, _log){ // 自动炼器——静默重铸首件可升阶法宝（4.209）
  const _c2 = (g.bones||[]).find(function(b){ if(!b || b.grade==='仙器') return false;
    const _f2 = b.grade==='凡器' ? 300 : b.grade==='灵器' ? 1500 : 8000;
    const _m2 = b.grade==='凡器' ? 2 : b.grade==='灵器' ? 4 : 8;
    const _rl = b.grade==='凡器' ? 2 : b.grade==='灵器' ? 4 : 8;
    const _rr = b.grade==='凡器' ? 1 : b.grade==='灵器' ? 4 : 8;
    return (g.money||0) >= _f2 && (g.materials||0) >= _m2 && g.realm >= _rl && (g.rings||[]).length >= _rr; });
  if(_c2){ reforgeBone(_c2.id, {log:false, render:false}); }
  return true;
}
function execAlchemy(g, _log){ // 自动炼丹——寿元丹（材料补足/成功率按悟性境界提升）
  const _df = DANFANGS['shou'];
  if((g.danfangOwned||[]).indexOf('shou') >= 0 && (g.herbs||0) >= _df.herb){
    const _needM = Math.max(0, _df.mat - (g.materials||0));
    const _cost = _needM * 30;
    if((g.money||0) >= _cost){ g.money -= _cost; g.materials = (g.materials||0) + _needM; }
    if((g.materials||0) >= _df.mat){
      g.materials -= _df.mat; g.herbs -= _df.herb;
      const _pp = Math.min(0.95, _df.p + Math.min(0.10, (g.a.悟性||0)*0.001) + Math.min(0.10, g.realm*0.02));
      if(Math.random() < _pp){ g._lifeBonus = (isFinite(g._lifeBonus)?g._lifeBonus:0) + 10; if(_log) addLog('自动炼丹：寿元丹成，寿元+10。','good'); }
      else if(_log) addLog('自动炼丹：寿元丹炼废，材料损耗。','bad');
    }
  }
  return true;
}

function autoAct(){
  if(!AUTO.on) return false;
  try{ autoEquipArt(); }catch(e){ console.warn('autoEquipArt:', e); } // 自动装配功法神通
  const eb = $('eventBox') ? $('eventBox').querySelector('.eventcard') : null;
  const ab = $('actionBtns');
  // 4.227：超大函数拆分——事件卡片/行动区按钮选择拆 3 子函数（决策语义零变化）
  if(eb){ return autoActEvent(eb); }       // 事件卡片按钮自动选择（择主/魔渊/魔道/风险偏好）
  else if(ab){ return autoActAction(ab); } // 行动区按钮自动选择（狩猎档位 / 智能决策）
  return false;
}
function autoActEvent(eb){ // 事件卡片按钮自动选择——宗门择主/魔渊入口/魔道业力/性格风险偏好；返回 true=已处理
  const btns = [...eb.querySelectorAll('button')];
  if(!btns.length) return false;
  // 4.283：超大函数拆分——择主/魔渊魔道/风险偏好抽 3 子函数
  // 事件选择按性格风险偏好——勇猛/豪迈敢赌高成功率 roll，沉稳/隐忍只选无风险
  const _p5 = PERS_BY_NAME[G.personality||'']; const _risk = _p5 ? _p5.evRisk : 0;
  let target = aaeOrg(btns) || aaeSha(btns, _risk) || aaeRisk(btns, _risk);
  // 事件渲染已保证存在无门槛选项（含「就此作罢」兜底），此处必有可用按钮——
  // 不强制解除禁用（那会绕过属性门槛）；防御兜底点第一个（若全禁用则为「作罢」选项）
  if(!target) target = btns.find(b=>!b.disabled) || btns[0];
  target.click(); return true;
}
function aaeOrg(btns){ // 宗门择主 AUTO 决策——正派优先（不主动入魔道，业力损渡劫），无正派则散修
  const _orgSelBtn = btns.find(b=>b._o && ('_org' in b._o)); // 择主判定用选项 _org 字段（_orgSelect 标记在事件对象上，不在按钮上）
  if(!_orgSelBtn) return null;
  const _zhengBtn = btns.find(b=>b._o && b._o._org && ['天尸宗','阴冥宗','血煞宗'].indexOf(b._o._org)<0 && !b.disabled);
  const _moBtn = btns.find(b=>b._o && b._o._org && ['天尸宗','阴冥宗','血煞宗'].indexOf(b._o._org)>=0 && !b.disabled);
  const _sanBtn = btns.find(b=>b._o && !b._o._org && !b.disabled);
  // 自动模式择主与批测 autoPickIdx 同步——85% 正派优先、15% 概率入魔道宗（模拟随机修士含魔修者），无正派则魔道/散修
  return (_zhengBtn && Math.random()>=0.15) ? _zhengBtn : (_moBtn || _zhengBtn || _sanBtn || btns.find(b=>!b.disabled) || btns[0]);
}
function aaeSha(btns, _risk){ // 幽冥魔渊入口 AUTO 决策 + 魔道宗门自动决策——业力选项优先
  // 幽冥魔渊入口 AUTO 决策——仅勇猛/豪迈性格踏入；99 级飞升窗口期一律不涉险（防渡劫圆满被入口拖死）
  const _shaBtn = btns.find(b=>b._o && b._o._shaEnter);
  if(_shaBtn){
    const _riskHigh = _risk>=2;
    const _godWin = G.realm>=9;
    return (_riskHigh && !_godWin) ? _shaBtn : (btns.find(b=>b._o && !b._o._shaEnter && !b.disabled) || btns.find(b=>!b.disabled && b!==_shaBtn) || _shaBtn);
  }
  // 魔道宗门自动决策——入魔道者走邪路（优先业力选项），与 autoPickIdx 同步（正魔对称）
  if(G.org && ['天尸宗','阴冥宗','血煞宗'].indexOf(G.org)>=0){
    const _yeBtn = btns.find(b=>b._o && b._o.eff && (b._o.eff.业力||0)>0 && !b.disabled);
    if(_yeBtn) return _yeBtn;
  }
  return null;
}
function aaeRisk(btns, _risk){ // 性格风险偏好兜底——勇猛/豪迈敢赌高成功率 roll，沉稳/隐忍只选无风险
  if(_risk>=2){ return btns.find(b=>b._o && b._o.roll && !b.disabled && (b._o.roll.chance||0)>=0.75) || btns.find(b=>b._o && !b._o.roll && !b.disabled); }
  else if(_risk===1){ return btns.find(b=>b._o && !b._o.roll && !b.disabled) || btns.find(b=>b._o && b._o.roll && !b.disabled && (b._o.roll.chance||0)>=0.8); }
  else { return btns.find(b=>b._o && !b._o.roll && !b.disabled); }
}
function autoActAction(ab){ // 行动区按钮自动选择——狩猎档位 / 智能决策；返回 true=已处理
  const btns = [...ab.querySelectorAll('button')];
  if(!btns.length) return false;
  const title = $('actionTitle') ? $('actionTitle').textContent : '';
  let t = null;
  if(title.includes('狩猎')){
    t = autoActHunt(btns); // 狩猎三档按性格+成功率护栏自动选择
  } else {
    const _r = autoActPick(btns); // 智能行动决策（decideNext/宗门运营/丹药/悟道/参悟/斗法/冲关/偏好）
    if(_r === true) return true;  // 子决策已直接执行行动（透传 return true 语义）
    t = _r;
  }
  t.click(); return true;
}
function autoActHunt(btns){ // 狩猎档位——性格偏好 + 死亡率/成功率护栏降档；返回待点击按钮
  // 狩猎档位按性格（勇猛/豪迈喜猛，余者居中）；死亡概率≥10% 自动降档，防连猎致死
  const _hunt=(PERS_BY_NAME[G.personality||'']||{}).hunt||'中';
  const _idx = Math.min(8, Math.max(0, (G.realm||0)));
  const _dTh = (G.wound||0) >= 1 ? 0.06 : 0.10; // 带伤猎妖降档更严格（轻伤殒命率≥6%即降档）
  let _safe = '稳';
  for(const _c of ['中','猛']){
    // 自动狩猎保守：死亡概率≥阈值 视为不安全降档
    if(huntDeathP(_idx, _c) < _dTh) _safe = _c;
  }
  // 性格偏好档位若不安全则降级到安全档位
  let _final = (_hunt==='猛' && _safe!=='猛') ? _safe : _hunt;
  // 4.207e 成功率护栏：对抗重构后猛/中档成功率下降，成功率不足自动降档求稳（避免自动猛猎连败伤身）
  if(_final === '猛' && huntSuccessP(_idx,'猛') < 0.45){ // 4.305 猛档成功率护栏同步新封顶58%（贴顶不降，低实力强杀才降档）
    _final = (huntSuccessP(_idx,'中') >= 0.55) ? '中' : '稳';
  } else if(_final === '中' && huntSuccessP(_idx,'中') < 0.50){
    _final = '稳';
  }
  return btns.find(b=>!b.disabled && b.textContent.trim().startsWith(_final))
    || btns.find(b=>!b.disabled && b.textContent.trim().startsWith(_safe))
    || btns.find(b=>!b.disabled) || btns[0];
}
function autoActPick(btns){ // 智能行动决策——返回 true=已直接执行，否则返回待点击按钮
  const g = G;
  const pick = (txt)=> btns.find(b=>!b.disabled && b.textContent.trim().startsWith(txt));
  let chosen = null;
  const _feiLock = g.soul.quality==='fei' && g.realm>=1; // 无灵根：炼体巅峰后修为锁死
  const _hp = g.a.气血||0; // 气血统一读取
  const _dujie = isDujieOf(); // 渡劫期统一判定（排除突破挂起）
  const _actCount = (g._autoActCount = (g._autoActCount||0) + 1);
  // 高优决策统一走 decideNext（autoAct 与 autoPre 同源，阈值只改一处）——疗伤/重伤调养/轻伤调养/回气急救/渡劫期/悟道/功法参悟/斗法
  {
    const _act = decideNext(g, {actCount:_actCount});
    if(_act){ execNext(_act, g, {log:true}); renderGameAuto(); return true; }
  }
  // 修为满点挂起 → 点突破/渡劫/飞升之劫（功德/魔道飞升由玩家手动选择，自动走九劫主线）；渡劫期 → 点渡劫按钮（每年渡一劫）
  if(g._breakPending !== undefined && g._breakPending !== null){ chosen = pick('飞升之劫即将降临') || pick('渡劫') || pick('突破') || btns[0]; }
  else if(_dujie){ chosen = pick('渡劫') || btns[0]; }
  // 4.246：超大函数拆分——宗门运营/分级决策链抽 2 子函数
  if(autoActOrg(g, btns, pick, _actCount)) return true; // 宗门自动运营——入宗免费功法→材料上缴→贡献兑换
  if(_hp < 35 && g.money >= 60){ // 气血急救——坊市回气丹（60 灵石 +8 血），优先于一切行动
    g.money -= 60; g.a.气血 += 8;
    addLog('自动服下回气丹，气血 +8。','good');
    return true;
  }
  chosen = autoActFallback(g, pick, _feiLock, _hp, _dujie, _actCount); // 分级决策链
  return chosen || btns.find(b=>!b.disabled) || btns[0];
}
function autoActOrg(g, btns, pick, _actCount){ // 宗门自动运营——入宗免费择一功法 → 材料上缴换贡献 → 贡献兑换本宗功法/神通
  if(!g.org) return false;
  const _gfIds = Object.keys(GONGFAS).filter(id=>GONGFAS[id].org===g.org);
  if(!g._freeArtDone && _gfIds.length){ buyCang(_gfIds[0],'gongfa'); return true; }
  if(g._freeArtDone && (g.materials||0) > 0 && (_actCount % 2 === 0)){ shangjiao(); return true; }
  if(g._freeArtDone){
    const _gfNew = _gfIds.filter(id=>(g.gongfaOwned||[]).indexOf(id)<0);
    if(_gfNew.length && (g.gongxian||0) >= gongfaCost(_gfNew[0])){ buyCang(_gfNew[0],'gongfa'); return true; }
    const _stIds = Object.keys(SHENTONGS).filter(id=>SHENTONGS[id].org===g.org);
    const _stNew = _stIds.filter(id=>(g.shentongOwned||[]).indexOf(id)<0);
    if(_stNew.length && (g.gongxian||0) >= shentongCost(_stNew[0])){ buyCang(_stNew[0],'shentong'); return true; }
  }
  return false;
}
function autoActFallback(g, pick, _feiLock, _hp, _dujie, _actCount){ // 分级决策链——缺钱经营/无灵根/气血避险/渡劫备战/寿元冲刺/道胎苦修/悟道/参悟/斗法/狩猎/交游/性格
  // 4.265：超大函数拆分——生存/成长/战斗三层抽 3 子函数
  const _s = aafSurvival(g, pick, _feiLock, _hp, _dujie);
  if(_s) return _s;
  const _g2 = aafGrowth(g, pick, _actCount);
  if(_g2) return _g2;
  return aafCombat(g, pick, _hp, _actCount);
}
function aafSurvival(g, pick, _feiLock, _hp, _dujie){ // 生存层——缺钱经营/无灵根/气血避险/渡劫备战
  if(g.money < Math.floor((15 + g.a.家境*0.2) * (CFG.cult.coef[g.realm] || 1)) * 20){ return pick('经营'); } // 缺钱阈值随苦修年费 // 批量苦修/狩猎消耗大，灵石不足先经营补足
  if(_feiLock){ return pick((g.a.悟性||0) < 25 ? '交游' : '经营'); }
  if(_hp < 50){ return pick('苦修') || pick('交游'); } // 气血<50 停战斗类行动（历练/狩猎/探秘），避险苦修/交游
  if(_dujie){ const _need9 = Math.floor((15 + g.a.家境*0.2) * (CFG.cult.coef[g.realm] || 1)) * 20; return (g.money||0) < _need9 ? (pick('经营') || pick('交游') || pick('苦修')) : (pick('苦修') || pick('交游') || pick('经营')); } // 渡劫期灵石够→苦修（提道行→渡劫率↑），不够→经营备战 // 渡劫期强制安全行动——每年渡一劫，历练/狩猎易送死，经营攒灵石备战
  return null;
}
function aafGrowth(g, pick, _actCount){ // 成长层——寿元冲刺/道胎段顶苦修/悟道/功法参悟
  if(g.realm < 9 && (lifeCapOf() - g.age) < 20){ return pick('苦修'); }
  if((g.rings||[]).length < 8 && g.realm < (g.rings||[]).length + 1){
    const _r9 = g.realm;
    const _S9 = CFG.realms[_r9];
    const _segTop9 = _S9 + subSegBase(G, (G.subRealm===undefined||G.subRealm===null)?0:G.subRealm) + subSegLen(G, (G.subRealm===undefined||G.subRealm===null)?0:G.subRealm); // 36 条段长
    const _gap = Math.max(0, _segTop9 - CFG.realms[_r9] - inRealmProg(g)); // 距本段顶（突破点）距离
    const _perYear = Math.max(1, cultBase()*(CFG.cult.actionMult['苦修']||1.0));
    if(_gap < _perYear*3){ return pick('苦修'); }
  }
  if(canWuDao(g) && !g._sanxian && (g.money||0) >= wuDaoCost(g) && g.age + 10 <= lifeCapOf() && wuDaoRate(g) >= 0.08 && _actCount % 3 === 0){ doWuDao(false); return true; } // 悟道接入——炼虚后定期闭关悟道（法则之力：破境+2%/渡劫+1%）；渡劫期已在上方拦截（不可跳年）
  if(!g._sanxian && (g.gongfa||{}).main && gongfaLvOf(g.gongfa.main) < 9 && (g.money||0) >= wuGongfaCost(g.gongfa.main) + 500 && g.age + 10 <= lifeCapOf() && wuGongfaRate(g.gongfa.main) >= 0.30 && _actCount % 3 === 0){ doWuGongfa(g.gongfa.main); return true; } // 功法参悟接入——主修层<9 时定期闭关参悟（灵石留 500 缓冲）
  return null;
}
function aafCombat(g, pick, _hp, _actCount){ // 战斗层——斗法/狩猎/交游/性格默认
  if(!g._sanxian && (g.realm||0) >= 3 && (g.a.气血||0) > 50 && (g._fightCd||0) !== g.age && (g.money||0) >= 200 && _actCount % 8 === 0){ window._fightNPC = genFightNPC(); const _fT = (g.wound||0) >= 1 ? 0.55 : 0.52; if(fightWinRate(window._fightNPC) > _fT){ doFight(); return true; } } // 斗法修复——胜率恒 44~54%（NPC 0.85~1.25 倍），门槛 0.70 死代码；改 0.55/0.52 + 金丹+ + 频率%8 // /4.203：斗法接入——轻伤阈值提高至 78%，避免带伤斗法
  if(_hp >= 50 && _actCount % ((g.bones||[]).length <= 1 ? 2 : 3) === 0 && g.realm < 9){ return pick('狩猎'); } // 狩猎加血线门槛（<50 不涉险） // 定期狩猎：法宝补给智能（法宝少则频率翻倍，保障本命祭炼素材）
  if(g.a.悟性 < 30){ return pick('交游'); } // 悟性线 20→30（提升事件门槛/炼丹/悟道成功率）
  return pick((PERS_BY_NAME[g.personality||'']||{}).act || '历练'); // 常规行动按性格偏好
}

/* ============ 启动 ============ */
loadMeta();
// 来世天赋配置持久化——GIFT 声明早于 loadMeta 调用，此处同步恢复
if(META && META.gift){ GIFT = {wuQ:META.gift.wuQ||null, fate:META.gift.fate||null, evQ:META.gift.evQ||null}; }
renderStart();
// 4.207c 刷新回顶——禁止浏览器恢复旧滚动位置（刷新/后退后页面始终从顶部开始）
try{ if('scrollRestoration' in history) history.scrollRestoration = 'manual'; }catch(e){}
window.scrollTo(0,0);
