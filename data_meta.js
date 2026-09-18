/* data_meta.js · 命格池/轮回殿/事件链数据表（DL_RS_4.158 自单文件拆分，勿改结构） */
const LUNHUI_DEF = [
  {k:'superTop', name:'双灵根', per:'每点+0.07%（满100点 5%→12%）', max:100, desc:'觉醒时更易抽到双灵根'},
  {k:'shenTop', name:'天灵根', per:'每点+0.04%（满100点 1%→5%）', max:100, desc:'觉醒时更易抽到天灵根'},
  {k:'sheTop',  name:'圣灵根', per:'每点+0.025%（满100点 0.5%→3%）', max:100, desc:'觉醒时更易抽到圣灵根'},
  {k:'liLiang', name:'力量', per:'+1 /点', max:10, desc:'出生力量'},
  {k:'minJie', name:'灵动', per:'+1 /点', max:10, desc:'出生灵动'},
  {k:'tiLi',   name:'气血', per:'+1 /点', max:10, desc:'出生气血'},
  {k:'jingShen',name:'神识', per:'+1 /点', max:10, desc:'出生神识'},
  {k:'life',   name:'寿命上限', per:'+1 /点', max:20, desc:'提高出生寿元上限'},
  {k:'wuXing', name:'悟性', per:'+0.3 /点', max:20, desc:'出生悟性'}, // XL_RS 4.188：+0.5→+0.3
  {k:'cultTop', name:'修炼天赋', per:'+2.5% 修炼速度/点', max:30, desc:'提高修为修炼速度'},
  {k:'huntTop', name:'猎妖福缘', per:'+1.5% 猎妖成功率/点', max:15, desc:'提高猎妖成功率、降低凶险'},
  {k:'epicEv',   name:'紫事件', per:'+0.1% 概率/点', max:60, desc:'紫色史诗事件出现概率'},
  {k:'legendEv', name:'红事件', per:'+0.1% 概率/点', max:50, desc:'红色传说事件出现概率'},
  {k:'mythicEv', name:'金事件', per:'+0.05% 概率/点', max:50, desc:'金色神话事件出现概率'},
    {k:'shenGan', name:'天劫庇护', per:'每点+0.10% 渡劫成功率（满100点 +10%）', max:100, desc:'提高渡劫成功率（渡劫期后生效）'} // XL_RS 4.103：文案与 tribRate 实际值对齐（4.74 已把 0.15%→0.10%，此处漏改）
]
const FATE_POOL = [
  {name:'天生法宝', desc:'出生自带一件灵器法宝，气血+10', attr:{气血:10}, bone:'灵器'},
  {name:'天纵奇才', desc:'天生经脉通达，修炼速度+5%', cult:0.05},
  {name:'神眷之子', desc:'气运+15', attr:{气运:15}},
  {name:'世家底蕴', desc:'家境保底 60', famFloor:60},
  {name:'根骨清奇', desc:'战斗四维开局各+5', attr:{力量:5,灵动:5,气血:5,神识:5}},
  {name:'家财万贯', desc:'开局灵石+2000', money:2000},
  {name:'声名鹊起', desc:'初始声望+80', prestige:80},
  {name:'先天道胎', desc:'第一道胎品质提升一档（有瑕→无缺→完美）', ring:1},
  {name:'道基稳固', desc:'天生道基稳固，破境天劫成功率+5%', jieti:0.05},
  {name:'福缘深厚', desc:'事件触发率+10%', event:0.10},
  {name:'坚如磐石', desc:'猎妖殒命率-5%', death:0.05},
]
const CHAINS = {
  // XL_RS 4.38：元始宗奇遇链已删（势力功法专属化），保留妖域/太玄圣宗链
  xingdou: {name:'妖域之缘', desc:'深入万妖山脉的际遇', steps:['xingdou1','xingdou2','xingdou3'], bonus:{悟性:1, 修为:0.05, 声望:5}},
  wuhundian: {name:'太玄圣宗之路', desc:'在太玄圣宗内步步高升', steps:['whd1','whd2','whd3'], bonus:{悟性:1, 修为:0.04, 声望:5}},
  hunbing: {name:'法宝遗泽', desc:'发现远古法宝残片，历经融合试炼、法宝共鸣，最终得一件万年法宝入体', steps:['hb1','hb2','hb3'], bonus:{力量:3, 神识:3, 修为:0.04}},
  hanyue: {name:'龙象锤韵', desc:'在龙象宗磨砺锤法根基，领悟撼岳锤法真意', steps:['ht1','ht2','ht3','ht4'], bonus:{力量:5, 气血:4, 修为:0.05}},
  landian: {name:'风雷龙脉', org:'风雷谷', desc:'在风雷谷淬体觉醒，唤醒远古龙魂', steps:['ld1','ld2','ld3','ld4'], bonus:{力量:4, 气血:4, 神识:3, 修为:0.05}},
  lingbao: {name:'灵宝鉴真', org:'灵宝阁', desc:'在灵宝阁鉴宝开蒙、神材入炉、灵火淬器，终成一件灵宝出世', steps:['lingbao1','lingbao2','lingbao3','lingbao4'], bonus:{神识:5, 悟性:2, 修为:0.05}},
  taiyin: {name:'月华天功', org:'太阴宫', desc:'在太阴宫月下引气、凝太阴神纹、月华淬魂，终得月神临世', steps:['taiyin1','taiyin2','taiyin3','taiyin4'], bonus:{神识:5, 灵动:3, 修为:0.05}},
  zhenyang: {name:'纯阳剑体', org:'真阳门', desc:'在真阳门纯阳筑基、剑气淬体、凝纯阳剑意，终成真阳焚天', steps:['zhenyang1','zhenyang2','zhenyang3','zhenyang4'], bonus:{灵动:5, 力量:4, 修为:0.05}},
  tianshi: {name:'天尸变', org:'天尸宗', desc:'在天尸宗引尸入道、尸丹淬体、成就天尸变，终登尸王之位', steps:['tianshi1','tianshi2','tianshi3','tianshi4'], bonus:{气血:5, 力量:4, 修为:0.05}},
  yinming: {name:'幽冥鬼典', org:'阴冥宗', desc:'在阴冥宗结鬼契、幽冥炼魂、召阴冥鬼将，终成幽冥主宰', steps:['yinming1','yinming2','yinming3','yinming4'], bonus:{神识:5, 灵动:4, 修为:0.05}},
  xuesha: {name:'血煞大法', org:'血煞宗', desc:'在血煞宗血池洗礼、血煞功成、化身血魔，终至血神临凡', steps:['xuesha1','xuesha2','xuesha3','xuesha4'], bonus:{力量:5, 气血:4, 修为:0.05}},
  tianji: {name:'天机演算', org:'天机阁', desc:'在天机阁观星入门、天机推演、逆天改命，终执阁主之位', steps:['tianji1','tianji2','tianji3','tianji4'], bonus:{神识:5, 悟性:2, 修为:0.05}},
  taixu: {name:'太虚剑道', org:'太虚剑宗', desc:'在太虚剑宗凝剑心、万剑朝宗、悟太虚剑域，终问剑仙之道', steps:['taixu1','taixu2','taixu3','taixu4'], bonus:{灵动:5, 力量:4, 修为:0.05}},
  zixiao: {name:'紫霄问道', org:'紫霄学宫', desc:'在紫霄学宫听道、问学百家、明悟道法自然，终授紫霄真人', steps:['zixiao1','zixiao2','zixiao3','zixiao4'], bonus:{神识:5, 悟性:2, 修为:0.05}},
  zhenmo: {name:'镇魔卫道', org:'镇魔司', desc:'在镇魔司斩妖初功、习镇魔大印、降伏大妖，终登司主之位', steps:['zhenmo1','zhenmo2','zhenmo3','zhenmo4'], bonus:{力量:5, 气血:4, 修为:0.05}},
  juli: {name:'巨灵神体', org:'巨灵宗', desc:'在巨灵宗开巨灵血脉、炼金刚不坏、显巨灵神相，终成丈六金身', steps:['juli1','juli2','juli3','juli4'], bonus:{气血:5, 力量:4, 修为:0.05}},
  hunyuan: {name:'混元一气', org:'混元宗', desc:'在混元宗混元筑基、五行归一、五气归元，终窥混元道祖之境', steps:['hunyuan1','hunyuan2','hunyuan3','hunyuan4'], bonus:{力量:3, 灵动:3, 气血:3, 神识:3, 修为:0.05}},  binghuo: {name:'阴阳灵泉', syn:{cat:'zhi',catMult:1.3}, desc:'寻得阴阳灵泉，冰泉淬体与火泉炼魂二择其一', steps:['bh1','bh2','bh3','bh4'], bonus:{气血:5, 神识:4, 修为:0.05}},
  xingluo: {name:'大楚权谋', desc:'入大楚皇朝宫廷卷入夺嫡之局，从龙之功与夺嫡风波两条截然不同的路', steps:['xl1','xl2','xl3','xl4'], hiddenStep:'xl5', bonus:{声望:15, 悟性:2, 修为:0.04}},
  dasai: {name:'诸宗联办论道大会', desc:'诸宗联办论道大会——筑基/金丹/元婴三组论道，初赛、复赛、决赛，夺魁者冠绝同辈', steps:['ds1','ds2','ds3','ds4'], bonus:{声望:15, 悟性:2, 修为:0.04}},
  dongfu: {name:'古修洞府', desc:'发现上古修士遗留洞府，破禁而入，探宝参悟', steps:['df1','df2','df3','df4'], hiddenStep:'df5', bonus:{悟性:2, 神识:4, 修为:0.05}},
  // 4.351 新增两条链
  tianjiao: {name:'天骄争锋', desc:'十年一度诸天骄榜开榜，与同辈骄子论道争锋，连战连捷者加冕魁首', steps:['tj1','tj2','tj3','tj4'], hiddenStep:'tj5', bonus:{声望:15, 悟性:2, 修为:0.04}},
  mogong: {name:'魔宫秘辛', desc:'魔宫使者夜访递上漆黑请柬，卷入正魔之秘——魔功惑心，是入魔还是斩魔，一念之差', steps:['mg1','mg2','mg3','mg4'], hiddenStep:'mg5', bonus:{悟性:2, 修为:0.04}}
}
/* 4.351 宗门渊源冲突——当前势力 → 敌对势力列表：事件池构建时过滤敌对势力链起点（已开始的链不受影响），
   一处配置全局生效，避免"加入某宗却触发敌对势力机缘"的逻辑矛盾 */
const ORG_TENSION = {
  '元始宗': ['风雷谷'],   // 元始宗攻伐激进，风雷谷御兽世家避其锋芒
  '太阴宫': ['真阳门'],   // 阴阳相冲，互为禁忌
  '真阳门': ['太阴宫']
};
