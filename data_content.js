/* data_content.js · 内容数据（4.166 自单文件拆分：法宝/宗门/评语）
   与 修仙人生模拟器.html 同目录，勿改结构；加载顺序在 meta→arts→events 之后 */

/* ============ 法宝定义（BONE_*） ============ */
const BONE_SLOTS = ['武器','法衣','鞋履','饰品'];
const BONE_ATTR = { '武器':'力量','法衣':'气血','鞋履':'灵动','饰品':'神识' };
/* XL_RS 4.46：法宝名字库——四部件各 12 名，装备/掉落时随机取名 */
const BONE_NAMES = {
  '武器': ['青冥剑','紫电戟','玄铁重剑','破岳锤','赤焰枪','碧水剑','裂空刀','镇岳印','九霄剑','噬魂镰','落星弓','寒霜刃'],
  '法衣': ['天蚕宝衣','紫金道袍','玄龟甲衣','冰蚕丝袍','烈焰法袍','青云法衣','玄武战衣','雷纹道袍','月华素袍','不动明王衣','星辰法衣','玄冥法袍'],
  '鞋履': ['踏云靴','追风履','缩地靴','凌波靴','御空飞靴','步云履','风雷疾行靴','神行履','追云靴','踏影靴','龙鳞战靴','山河履'],
  '饰品': ['凝魂玉','聚灵珠','太虚镜','镇魂铃','万象珠','心魔锁','玄天令','定神珠','星辰链','乾坤环','辟邪玉佩','通灵宝珠']
};

/* ============ 宗门 / 职位定义（POST_* / ORG_BONUS / ORG_REQ） ============ */
/* 宗门任职（化神 lv41+ 可任）：按年领贡献 */
const POST_SALARY = {外门:10, 内门:18, 真传:26, 堂主:35, 护法:50, 长老:70, 掌门:120};
const POST_REQ = {外门:11, 内门:21, 真传:31, 堂主:41, 护法:51, 长老:61, 掌门:71};
const POST_PAY = {外门:10, 内门:30, 真传:60, 堂主:120, 护法:250, 长老:500, 掌门:1000}; // DL_RS_4.155：职位年俸灵石
const POST_CULT = {外门:0, 内门:0, 真传:0, 堂主:0.03, 护法:0.05, 长老:0.07, 掌门:0.10}; // DL_RS_4.155：职位修炼加成
const POST_ORDER = ['外门','内门','真传','堂主','护法','长老','掌门'];

const ORG_BONUS = {
  '龙象宗': {trend:{力量:1.12}, desc:'龙象大力·力量成长+12%（土/金系灵根入宗：修炼+10%）'},
  '风雷谷': {trend:{气血:1.12}, desc:'风雷淬体·气血成长+12%（风/雷系灵根入宗：修炼+5%）'},
  '灵宝阁': {wuMult:1.15, trend:{神识:1.10}, desc:'灵宝奇门·悟性成长+15%、神识+10%（水/木系灵根入宗亲和）'},
  '太阴宫': {prestigeMult:1.5, trend:{神识:1.06}, desc:'月华道统·声望获取+50%、神识成长+6%'},
  '真阳门': {trend:{灵动:1.14}, desc:'真阳剑气·灵动成长+14%'},
  '自建宗门': {prestigeMult:1.6, wuMult:1.10, trend:{力量:1.05,灵动:1.05,气血:1.05,神识:1.05}, desc:'宗主之尊·声望获取+60%、悟性成长+10%、全属性成长+5%'},
  // 魔道三宗：业力获取（仅影响渡劫），增益偏战斗
  '天尸宗': {trend:{气血:1.12,力量:1.06}, desc:'御尸炼体·气血成长+12%、力量成长+6%'},
  '阴冥宗': {trend:{神识:1.10,灵动:1.06}, desc:'阴冥诡术·神识成长+10%、灵动成长+6%'},
  '血煞宗': {trend:{力量:1.10,气血:1.10}, desc:'血煞噬魂·力量成长+10%、气血成长+10%'},
  // 元始宗——隐藏正道势力（集齐六枚元始令后经「元始令·归宗」事件解锁，不参与常规招揽）
  '元始宗': {desc:'元始道统·猎妖反噬率-30%、渡劫成功率+5%（六艺功法神通于藏经阁习得，效果见功法神通面板）'}, // XL_RS 4.94：六艺效果归位功法神通；XL_RS 4.95：被动新增渡劫成功率+5%（tribRate 生效）
  // —— XL_RS 4.49：补全设定档 13 槽位（天机阁/太虚剑宗/紫霄学宫/镇魔司/巨灵宗/混元宗）——
  '天机阁': {prestigeMult:1.5, trend:{力量:1.06}, desc:'天机演算·声望获取+50%、力量成长+6%（推演机巧）'},
  '太虚剑宗': {wuMult:1.10, moneyMult:1.10, desc:'太虚剑心·悟性成长+10%、灵石获取+10%（天骄剑修）'},
  '紫霄学宫': {moneyMult:1.25, trend:{神识:1.08}, desc:'紫霄学宫·灵石获取+25%、神识成长+8%（仙道学院）'},
  '镇魔司': {trend:{力量:1.10, 气血:1.06}, desc:'镇魔卫道·力量成长+10%、气血成长+6%（除妖司）'},
  '巨灵宗': {trend:{气血:1.14}, desc:'巨灵神力·气血成长+14%（巨灵体修）'},
  '混元宗': {trend:{力量:1.06,灵动:1.06,气血:1.06,神识:1.06}, desc:'混元归一·全属性成长+6%（中庸兼容）'},
  // XL_RS 4.60：太玄圣宗（殿内供奉）——招揽事件可加入，补增益闭环（声望+50%、力量成长+6%）
  '太玄圣宗': {prestigeMult:1.5, trend:{力量:1.06}, desc:'太玄圣宗·声望获取+50%、力量成长+6%（殿内供奉）'}
};
/* ============ 势力加入要求（DL_RS_4.173：不同势力不同门槛，契合设定） ============ */
const ORG_REQ = {
  '龙象宗': {
    minAge: 16,
    check: function(g){
      const s=g.soul||{};
      if(/土/.test(s.name||'')) return {pass:true};
      if(['ding','super','shen','she'].indexOf(s.quality)>=0 && g.a.气运>=60) return {pass:true};
      return {pass:false, reason:'需土系灵根，或三灵根以上+气运≥60'};
    }
  },
  '风雷谷': {
    minAge: 14,
    check: function(g){
      const s=g.soul||{};
      if(/风|雷/.test(s.name||'') && ['you','ding','super','shen','she'].indexOf(s.quality)>=0) return {pass:true};
      return {pass:false, reason:'需风/雷属性灵根（异灵根修士）'};
    }
  },
  '灵宝阁': {
    minAge: 14,
    check: function(g){
      const s=g.soul||{};
      if(s.cat==='wu'||s.cat==='lei') return {pass:true}; // 4.354：器形灵根概念已删，金/雷系(cat wu/lei)入宗；原 cat==='qi' 永不命中为死代码
      if(['ding','super','shen'].indexOf(s.quality)>=0) return {pass:true};
      return {pass:false, reason:'需金/雷系灵根，或三灵根以上'};
    }
  },
  '太阴宫': {
    minAge: 12,
    check: function(g){
      const s=g.soul||{};
      if(s.quality!=='fei') return {pass:true};
      return {pass:false, reason:'需普通以上灵根'};
    }
  },
  '真阳门': {
    minAge: 14,
    check: function(g){
      const s=g.soul||{};
      if(g.a.灵动>=25) return {pass:true};
      if(/金|雷/.test(s.name||'')) return {pass:true};
      return {pass:false, reason:'需灵动≥25，或金/雷系灵根'};
    }
  },
  '天尸宗': {
    minAge: 14,
    check: function(g){
      if(g.a.气血>=20) return {pass:true};
      return {pass:false, reason:'需气血≥20（魔道宗门，尸修炼体）'};
    }
  },
  '阴冥宗': {
    minAge: 14,
    check: function(g){
      if(g.a.神识>=20) return {pass:true};
      return {pass:false, reason:'需神识≥20（魔道宗门，阴冥修神）'};
    }
  },
  '血煞宗': {
    minAge: 16,
    check: function(g){
      if(g.a.力量>=20) return {pass:true};
      return {pass:false, reason:'需力量≥20（魔道宗门，血煞主杀）'};
    }
  },
  // XL_RS 4.49：补全 13 槽位——天机阁/太虚剑宗/紫霄学宫/镇魔司/巨灵宗/混元宗
  '天机阁': {
    minAge: 12,
    check: function(g){
      const s=g.soul||{};
      if(s.quality!=='fei') return {pass:true};
      return {pass:false, reason:'需普通以上灵根'};
    }
  },
  '太虚剑宗': {
    minAge: 14,
    check: function(g){
      const s=g.soul||{};
      if(['you','ding','super','shen','she'].indexOf(s.quality)>=0) return {pass:true};
      if((g.a.悟性||0)>=50) return {pass:true};
      return {pass:false, reason:'只收天骄——四灵根以上或悟性≥50'};
    }
  },
  '紫霄学宫': {
    minAge: 12,
    check: function(g){
      if(g.a.家境>=50) return {pass:true};
      return {pass:false, reason:'需家境≥50'};
    }
  },
  '镇魔司': {
    minAge: 14,
    check: function(g){
      if((g.a.力量||0)+(g.a.气血||0)>=40) return {pass:true};
      return {pass:false, reason:'需力量+气血≥40'};
    }
  },
  '巨灵宗': {
    minAge: 14,
    check: function(g){
      const s=g.soul||{};
      if(s.cat==='shou') return {pass:true};
      if((g.a.气血||0)>=25) return {pass:true};
      return {pass:false, reason:'需气血≥25或火土风灵根（刚猛之资）'};
    }
  },
  '混元宗': {
    minAge: 12,
    check: function(g){ return {pass:true}; }
  },
  '太玄圣宗': {
    minAge: 17,
    check: function(g){ return {pass:true}; }
  }
};

/* ============ 一世评语（EVAL_FIRST / EVAL_THIRD，正魔仙凡四风格） ============ */
/* 一世评语（DL_RS_4.7 优化）：多段文学化评语，结合结局 / 灵根 / 成就 / 际遇 / 寿元 */
/* ============ 结局评语系统（数据驱动，新增评语只需改EVAL数据，不用改函数逻辑） ============ */
// 第一段：命运总评（按条件匹配，每条件多条评语随机选取）
// ctx = {g, s, qcn, pw, lv, ach, fateTxt, artifactTxt, godPathTxt}
const EVAL_FIRST = [
  // XL_RS 4.128：正魔仙凡四套整体风格——每档按 style（xian 仙途 / mo 魔道 / zheng 正道 / fan 凡尘）整段换措辞与价值观，不再是首尾贴句
  {cond: c=>c.g.realm>=10 && c.g._heroFate && c.g.age<=45, texts:[
    c=>{ if(c.g._moAscend) return `万古唯一的${c.soulName}——${c.g.age} 岁魔躯凝成，直入九幽。道行 ${c.pw.toLocaleString()}。${c.artifactTxt}你以逆命之姿把仙路踩成脚下血火，诸天万界自此记住了这道魔影——主角两个字，本就该这么写。`;
         return `万古唯一的${c.soulName}——${c.g.age} 岁九劫成仙，道行 ${c.pw.toLocaleString()}。${c.artifactTxt}你触动了那传说中才会显现的逆天机缘，将无数人穷尽一生也走不完的仙路，压缩成了短短数十载。修仙界自此有了主角，而主角，就是你。`; }
  ]},
  {cond: c=>c.g.endTag==='飞升' || c.g.endTag==='地仙' || c.g.endTag==='九幽真魔' || (c.g.realm>=10 && c.g.godTitle), texts:[
    c=>{ const _gd = c.g._gongdeAscend, _mo = c.g._moAscend, _dx = c.g._dixian;
         if(_mo) return `${c.soulName}，魔躯既成，九幽为路。${c.godPathTxt}——道行 ${c.pw.toLocaleString()}。${c.artifactTxt}世人畏你如鬼、恨你入骨，而你立于魔焰之巅睥睨众生：这一世，万劫加身，换一场痛快。`;
         if(_gd) return `${c.soulName}，功德证道，白日飞升。${c.godPathTxt}，道行 ${c.pw.toLocaleString()}。${c.artifactTxt}你以苍生为念、以善行为梯，把「正」字走成了通天大道——青史之上，你是光照后世的那一笔。`;
         if(_dx) return `${c.soulName}，仙基重铸，地仙之身。${c.godPathTxt}，道行 ${c.pw.toLocaleString()}。${c.artifactTxt}仙门已启，你却驻足人间——以地仙之身镇守此界，长生久视，亦是万古不朽。`;
         return `${c.soulName}，${c.godPathTxt}，九劫成仙，道行 ${c.pw.toLocaleString()}。${c.artifactTxt}你飞升仙域，与天同寿——从炼体到飞升，整整一世的跋涉，在此刻化为永恒。自此云海之上，多了一位俯瞰红尘的逍遥客。`; }
  ]},
  {cond: c=>c.g.realm>=10, texts:[
    c=>{ if(c.g._moAscend) return `${c.soulName}，渡尽九劫，魔躯临世。${c.g.godTitle||'九幽真魔'}之名，${c.artifactTxt}自此刻起，连天都要避你的锋芒。`;
         return `${c.soulName}，渡尽九劫，证道成仙。${c.g.godTitle||'真仙'}临世，${c.artifactTxt}你的传说自此刻开始，与日月同辉。`; }
  ]},
  {cond: c=>c.g.realm>=9 && (c.g._jie||0)>=9, // DL_RS_4.157b：渡劫分档按已渡劫数（原 realms[10]-1==realms[9] 覆盖后两条）
   texts:[
    c=>{ if(c.style==='mo') return `九劫加身，魔焰不熄。${dhTxt(c.g)?('世人皆称你「'+dhTxt(c.g)+'」。'):''}${c.g.godTitle?('你已成就'+c.g.godTitle+'，却终究不肯叩那扇仙门——既如此，便让天劫也记住你的名字。'):'你未渡尽九劫，凡间却再无人敢直呼你名。'}`
         if(c.style==='zheng') return `渡劫圆满，功德无量。${dhTxt(c.g)?('世人皆称你「'+dhTxt(c.g)+'」。'):''}${c.g.godTitle?('你已成就'+c.g.godTitle+'，却与仙位擦肩——但这一身功德，已足够你问心无愧地立于青史。'):'你未渡尽九劫，以凡人之躯行完苍生之道，本身就是最大的圆满。'}`
         if(c.style==='xian') return `渡劫圆满，凡人的尽头已被你走穿。${dhTxt(c.g)?('世人皆称你「'+dhTxt(c.g)+'」。'):''}${c.g.godTitle?('你已成就'+c.g.godTitle+'，却终究未叩开仙门——功亏一篑，亦是另一种圆满。'):'你未能渡过第九重天劫，以凡人之躯抵达极限，本身就是最大的传说。'}`
         return `凡人修炼，自有尽头；而你把尽头走成了自己的名字。渡劫九重圆满${dhTxt(c.g)?('「'+dhTxt(c.g)+'」'):''}——${c.g.godTitle?('与仙位擦肩，功亏一篑，却也已是凡间绝响。'):'未渡尽九劫，你仍是古往今来最接近仙的人。'}` }
  ]},
  {cond: c=>c.g.realm>=9 && (c.g._jie||0)>=4, // DL_RS_4.157b：渡劫强者（原 *4 阈值 lv 恒定不达）
   texts:[
    c=>{ if(c.style==='mo') return `${c.s.name}渡劫魔尊，巅峰道行 ${c.pw.toLocaleString()}。${dhTxt(c.g)?('世人皆称你「'+dhTxt(c.g)+'」。'):''}你已站上修仙界最凶戾的峰顶，距九幽只差一道天劫——${c.g.org?('于'+c.g.org+'，连宗主都要让你三分'):'所过之处，修仙界风声鹤唳'}。`
         if(c.style==='zheng') return `${c.s.name}渡劫强者，巅峰道行 ${c.pw.toLocaleString()}。${dhTxt(c.g)?('世人皆称你「'+dhTxt(c.g)+'」。'):''}你已跨入修仙界最巅峰的极少数之列，距渡劫圆满仅一步之遥——${c.g.org?('于'+c.g.org+'名震天下'):'这一身功德正气，已是天下修士的标杆'}。`
         if(c.style==='xian') return `${c.s.name}渡劫强者，巅峰道行 ${c.pw.toLocaleString()}。${dhTxt(c.g)?('世人皆称你「'+dhTxt(c.g)+'」。'):''}你已跨入修仙界最巅峰的极少数之列，距渡劫圆满仅一步之遥，${c.g.org?('于'+c.g.org+'名震天下'):'纵横修仙界，威震一方'}。`
         return `渡劫强者——距渡劫圆满只差半步，可这半步，多少人穷尽一生也迈不过去。${dhTxt(c.g)?('世人皆称你「'+dhTxt(c.g)+'」。'):''}${c.g.org?('于'+c.g.org+'，你的名字无人不晓'):'你的名字，已是修仙界的传说'}。` }
  ]},
  {cond: c=>c.g._sanxian, // XL_RS 4.205：散仙总评——败劫幸存，仙途未竟
    texts:[
    c=>{ const _sx=(c.g._sanxian||0)+'劫散仙';
         if(c.style==='mo') return `败劫余生，${_sx}。你以魔骨硬撼天威，${dhTxt(c.g)?('世人皆称你「'+dhTxt(c.g)+'」。'):''}${c.g.org?('于'+c.g.org+'仍是令人胆寒的魔头'):'修仙界提起你，先惧三分'}。`;
         if(c.style==='zheng') return `败劫余生，${_sx}。天劫没能抹去你，${dhTxt(c.g)?('世人皆称你「'+dhTxt(c.g)+'」。'):''}${c.g.org?('于'+c.g.org+'仍是镇宗之柱'):'你的名号依旧响彻修仙界'}。`;
         return `败劫余生，${_sx}。仙途虽断，道心未灭——${dhTxt(c.g)?('世人皆称你「'+dhTxt(c.g)+'」。'):''}${c.g.org?('于'+c.g.org+'仍是举足轻重的人物'):'你的名号依旧响彻修仙界'}。`; }
  ]},
  {cond: c=>c.g.realm>=9, texts:[
    c=>{ if(c.style==='mo') return `渡劫修士，天劫临头。你已走到魔途的最后一关，${dhTxt(c.g)?('世人皆称你「'+dhTxt(c.g)+'」。'):''}${c.g.org?('于'+c.g.org+'已是令人胆寒的镇宗魔头'):'修仙界提起你，先惧三分'}。`
         if(c.style==='zheng') return `渡劫修士，天劫临头。你已走到飞升前的最后一段路，${dhTxt(c.g)?('世人皆称你「'+dhTxt(c.g)+'」。'):''}${c.g.org?('于'+c.g.org+'已是镇宗之柱'):'在修仙界声名赫赫'}——这一关，苍生看着你。`
         if(c.style==='xian') return `渡劫修士，天劫临头。你已走到飞升前的最后一段路，${dhTxt(c.g)?('世人皆称你「'+dhTxt(c.g)+'」。'):''}${c.g.org?('于'+c.g.org+'已是镇宗之柱'):'在修仙界声名赫赫'}。`
         return `渡劫在即，道行 ${c.pw.toLocaleString()}。九道天劫如悬顶之剑——${c.g.org?('你坐镇'+c.g.org+'，'):''}这一关，是仙凡之隔。` }
  ]},
  {cond: c=>c.g.realm>=8, texts:[
    c=>{ if(c.style==='mo') return `道号已成，大乘魔尊，道行 ${c.pw.toLocaleString()}。${dhTxt(c.g)?('世人皆称你为「'+dhTxt(c.g)+'」。'):''}修仙界绝巅有你一席，${c.g.org?('于'+c.g.org+'号令一方'):'魔焰所至，仙道辟易'}。`
         if(c.style==='zheng') return `道号已成，大乘之尊，道行 ${c.pw.toLocaleString()}。${dhTxt(c.g)?('世人皆称你为「'+dhTxt(c.g)+'」。'):''}修仙界绝巅之列有你一席，${c.g.org?('于'+c.g.org+'扬名立万'):'一身正气，庇护一方苍生'}。`
         if(c.style==='xian') return `道号已成，大乘之尊，道行 ${c.pw.toLocaleString()}。${dhTxt(c.g)?('世人皆称你为「'+dhTxt(c.g)+'」。'):''}修仙界绝巅之列有你一席，${c.g.org?('于'+c.g.org+'扬名立万'):'纵横修仙界，威名赫赫'}——仙门在望，只差最后一步。`
         return `大乘之巅，谁与争锋。${dhTxt(c.g)?('「'+dhTxt(c.g)+'」'):''}道行 ${c.pw.toLocaleString()}——${c.g.org?('于'+c.g.org+'名震一方'):'纵横修仙界，一代传奇'}。` }
  ]},
  {cond: c=>c.g.realm>=7, texts:[
    c=>{ if(c.style==='mo') return `合体魔修，道行 ${c.pw.toLocaleString()}。你已能以一己之力搅动一方风云，虽未得道号，却已是让仙道寝食难安的狠角色——只是午夜梦回，血月之下，仍想去那座更高的山看看。`
         if(c.style==='zheng') return `合体大能，道行 ${c.pw.toLocaleString()}。你已能庇护一方势力，虽未得道号，亦是当世豪杰——只是午夜梦回，仍会想起那座更高的山。`
         if(c.style==='xian') return `合体大能，道行 ${c.pw.toLocaleString()}。你已能庇护一方势力，虽未得道号，亦是当世豪杰——只是午夜梦回，仍会想起那座更高的山。`
         return `合体大能，距大乘只一步之遥。${c.g.org?('你坐镇'+c.g.org+'，声名日隆'):'你已是当世有数的强者'}——只是那一步，终究没能迈过去。` }
  ]},
  {cond: c=>c.g.realm>=6, texts:[
    c=>{ if(c.style==='mo') return `炼虚魔君。法相一出，仙道修士俯首。${c.g.youApt===89?'你本有机会问鼎合体，却把那份天资耗在了刀口舔血上——不悔。':'这条魔路你没能走到尽头，却已足够令人胆寒。'}`
         if(c.style==='zheng') return `炼虚真君之尊，法相足以震慑一方。${c.g.youApt===89?'天赋本可问鼎合体，奈何时运差了一线——但这一世所积功德，无人能及。':'你凭这一身修为与正气，走到了大多数人到不了的地方。'}`
         if(c.style==='xian') return `炼虚真君。法相一出，寻常修士俯首。${c.g.youApt===89?'你本有机会问鼎合体，却终究差了一线。':'这条路你没能走到尽头，却已足够耀眼。'}`
         return `炼虚真君之尊，法相足以震慑一方。${c.g.youApt===89?'天赋本可问鼎合体，奈何时运差了一线。':'你凭这一身修为，走到了大多数人到不了的地方。'}` }
  ]},
  {cond: c=>c.g.realm>=5, texts:[
    c=>{ if(c.style==='mo') return `化神圣者，凶名赫赫。这个境界已是绝大多数修士毕生难以企及的高度，你的名字，修仙界记得——带着三分敬畏。`
         if(c.style==='zheng') return `化神圣者，人中翘楚。这个境界已是绝大多数修士毕生难以企及的高度，你的名字值得被记住——连同你护过的那些人。`
         if(c.style==='xian') return `化神圣者，人中翘楚。这个境界已是绝大多数修士毕生难以企及的高度，你的名字值得被记住。`
         return `化神之境，百修士难出其右。你这一世，没有辱没${c.s.name}之名。` }
  ]},
  {cond: c=>c.g.realm>=4, texts:[
    c=>{ if(c.style==='mo') return `元婴。${c.g.spouse?('道侣'+c.g.spouse+'相伴，'):''}${c.g.children?('儿孙绕膝，'):''}${c.g.org?('于'+c.g.org+'扎根半生，'):''}这一生虽未登顶，却也在刀光里守住了自己的屋檐。`
         if(c.style==='zheng') return `元婴。${c.g.spouse?('道侣'+c.g.spouse+'相伴，'):''}${c.g.children?('儿孙绕膝，'):''}${c.g.org?('于'+c.g.org+'扎根半生，'):''}这一生虽未登顶，却也把日子过成了安稳的模样。`
         if(c.style==='xian') return `元婴。${c.g.spouse?('道侣'+c.g.spouse+'相伴，'):''}${c.g.children?('儿孙绕膝，'):''}${c.g.org?('于'+c.g.org+'扎根半生，'):''}这一生虽未登顶，却也把日子过成了安稳的模样。`
         return `元婴修为，不算顶尖。${c.g.org?('你坐镇'+c.g.org+'，'):''}${c.g.spouse?('与'+c.g.spouse+'相守，'):''}够你用一辈子把日子过安稳。` }
  ]},
  {cond: c=>c.g.realm>=3, texts:[
    c=>{ if(c.style==='mo') return `金丹之境，已是多数修士仰望的高度。${c.g.org?('你于'+c.g.org+'立足'):'你在修仙界站稳了脚跟'}，这一世，没人能小看你。`
         if(c.style==='zheng') return `金丹之境，已是多数修士仰望的高度。${c.g.org?('你于'+c.g.org+'立足'):'你在修仙界站稳了脚跟'}，行得正，这一世没有白活。`
         if(c.style==='xian') return `金丹之境，已是多数修士仰望的高度。${c.g.org?('你于'+c.g.org+'立足'):'你在修仙界站稳了脚跟'}，这一世没有白活。`
         return `金丹修为，超出同侪。虽未登顶，却也算稳扎稳打地走完了这一生。` }
  ]},
  {cond: c=>c.g.realm>=2, texts:[
    c=>{ if(c.style==='mo') return `筑基之境，寻常人眼里的仙师，狠人眼里的垫脚石——而你偏把这垫脚石站成了自己的江山。`
         if(c.style==='zheng') return `筑基之境。与大多数修士一样，你的一生平淡而真实，却从未做过一件亏心事。`
         if(c.style==='xian') return `筑基之境。与大多数修士一样，你的一生平淡而真实，像修仙界上每一粒平凡的尘埃。`
         return `筑基修士，寻常修士里的寻常人。平凡的一生，同样值得好好过完。` }
  ]},
  {cond: c=>c.g.realm>=1, texts:[
    c=>{ if(c.style==='mo') return `炼气修士。${c.s.name}陪你走过了最初的修行之路，只是这条路，终究没能走得更远——可那又如何，你从不后悔入这修行道。`
         if(c.style==='zheng') return `炼气修士。${c.s.name}陪你走过了最初的修行之路，你守着本心，干干净净地走完了这一生。`
         if(c.style==='xian') return `炼气修士。${c.s.name}陪你走过了最初的修行之路，只是这条路，终究没能走得更远。`
         return `炼气修为，初窥门径。平凡的路，平凡的人，却也是一段完整的修士生涯。` }
  ]},
  {cond: c=>c.g.realm>=1 || (c.g.realmPos||0)>0, texts:[
    c=>{ if(c.style==='mo') return `炼体修士。${c.s.name}没能带你走得更远，但你骨子里的那股狠劲，谁见了都要忌惮三分。`
         if(c.style==='zheng') return `炼体修士。${c.s.name}没能带你走得更远，但你认真活过的每一天，都光明磊落。`
         if(c.style==='xian') return `炼体修士。${c.s.name}没能带你走得更远，但那些修炼的清晨与黄昏，你从未后悔。`
         return `炼体修为，在这片修仙界上不值一提。但你认真活过的每一天，都算数。` }
  ]},
  {cond: c=>true, texts:[
    c=>{ if(c.style==='mo') return `没有觉醒出像样的天赋，你平凡地过完了一生——但心里那口不服的气，到死也没散。`
         if(c.style==='zheng') return `没有觉醒出像样的天赋，你平凡地过完了一生，像一滴水汇入岁月的长河——却干净、无愧。`
         if(c.style==='xian') return `没有觉醒出像样的天赋，你平凡地过完了一生，像一滴水汇入岁月的长河。`
         return `天赋平平，际遇平平。可这一生是你的，怎么过，都由你自己说了算。` }
  ]}
];

// 第三段：结语（按条件匹配，每条件多条结语随机选取）
const EVAL_THIRD = [
  // XL_RS 4.128：结语按正魔仙凡整体风格收束（不再是统一模板+风格尾巴）
  {cond: c=>c.g.realm>=10 && c.g._heroFate && c.g.age<=45, texts:[
    c=> c.g._moAscend ? ' 你的故事，后来被写成了魔典——九幽深处，人人传颂的名字，便叫主角。' : ' 你的故事，后来被写成了传说——大地上人人传颂的名字，便叫主角。'
  ]},
  {cond: c=>c.g.realm>=10 || c.g.endTag, texts:[
    c=>{ if(c.g._moAscend) return pick([' 自此九幽为家，万古魔名。',' 飞升那一刻，仙道记住了最不想记住的名字。']);
         if(c.g._gongdeAscend) return pick([' 自此位列仙班，功德永铭。',' 飞升那一刻，苍生记住了你。']);
         if(c.g._dixian) return pick([' 地仙之身，人间长存。',' 仙门未入，仙骨已成。']);
         return pick([' 从此，仙域多了一段传说。',' 飞升那一刻，下界便只留你的名字。']); }
  ]},
  {cond: c=>c.g._sanxian, // XL_RS 4.205：散仙尾评——败劫幸存
    texts:[
    c=>{ const _sx=(c.g._sanxian||0)+'劫散仙';
         if(c.style==='mo') return pick([' 散仙残躯，魔念未消——雷劫之下活下来的人，从不信命。',' '+_sx+'，人间再无人敢轻视你。']);
         if(c.style==='zheng') return pick([' 败劫不死，散仙之身——你护过的人，会记得你。',' '+_sx+'，道途虽断，风骨犹存。']);
         return pick([' 败劫不死，散仙之身——仙途未竟，人间却多了一段传奇。',' '+_sx+'，道途虽断，风骨犹存。']); }
  ]},
  {cond: c=>c.g.realm>=9 && (c.g._jie||0)>=4, // DL_RS_4.157b：尾评渡劫强者（同上）
   texts:[
    c=>{ if(c.style==='mo') return pick([' 渡劫魔尊，只差一道天劫，九幽便是你的王座。',' 半步魔仙，天下已无人敢与你争锋。']);
         if(c.style==='zheng') return pick([' 渡劫强者，半步之遥便是仙门——苍生记得你的功德。',' 半步成仙，这一身正气已足慰平生。']);
         if(c.style==='xian') return pick([' 渡劫强者，半步之遥便是仙门。',' 渡劫圆满的门槛，你已摸到了边。']);
         return pick([' 渡劫强者，半步之遥便是仙门。',' 渡劫圆满的门槛，你已摸到了边。']); }
  ]},
  {cond: c=>c.g.realm>=9, texts:[
    c=>{ if(c.style==='mo') return pick([' 大乘之巅，魔名昭著。',' 百年之后，修士谈起你仍会压低声音。']);
         if(c.style==='zheng') return pick([' 大乘之巅，足以名垂青史——你护过的人，会记得你。',' 大乘之名，百年之后依然有人传颂。']);
         if(c.style==='xian') return pick([' 大乘之巅，足以名垂青史。',' 大乘之名，百年之后依然有人传颂。',' 修士界的史册，有你重重的一笔。']);
         return pick([' 大乘之巅，足以名垂青史。',' 大乘之名，百年之后依然有人传颂。',' 修士界的史册，有你重重的一笔。']); }
  ]},
  {cond: c=>c.g.realm>=7, texts:[
    c=>{ if(c.style==='mo') return pick([' 你的名字，曾让一方仙道闻风丧胆。',' 一方之地，曾因你而无人敢放肆。']);
         if(c.style==='zheng') return pick([' 你的名字，曾照亮过一方天空。',' 一方之地，曾因你而扬名。']);
         if(c.style==='xian') return pick([' 你的名字，曾照亮过一方天空。',' 一方之地，曾因你而扬名。']);
         return pick([' 你的名字，曾照亮过一方天空。',' 一方之地，曾因你而扬名。']); }
  ]},
  {cond: c=>c.g.realm>=4, texts:[
    c=>{ if(c.style==='mo') return pick([' 平凡也好，狠戾也罢，这一世终是落幕——只是那口气，还没散。',' 岁月不居，这一世就此落下帷幕。']);
         if(c.style==='zheng') return pick([' 平凡也好，辉煌也罢，这一世你问心无愧。',' 岁月不居，这一世就此落下帷幕。']);
         if(c.style==='xian') return pick([' 平凡也好，辉煌也罢，这一世终是落幕。',' 岁月不居，这一世就此落下帷幕。']);
         return pick([' 平凡也好，辉煌也罢，这一世终是落幕。',' 岁月不居，这一世就此落下帷幕。']); }
  ]},
  {cond: c=>true, texts:[
    c=>{ if(c.style==='mo') return pick([' 历史的尘埃里，也有你一粒带着锋芒的砂。',' 滚滚红尘，你曾活成了谁都不服的形状。']);
         if(c.style==='zheng') return pick([' 历史的尘埃里，也有你干干净净的一粒。',' 滚滚红尘，你这一生行得正、立得直。']);
         if(c.style==='xian') return pick([' 历史的尘埃里，也有你的一粒。',' 滚滚红尘，你曾是其中一粒。']);
         return pick([' 历史的尘埃里，也有你的一粒。',' 滚滚红尘，你曾是其中一粒。']); }
  ]}
];
