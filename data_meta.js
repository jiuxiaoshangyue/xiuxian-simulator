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
  xingdou: {name:'妖域之缘', desc:'深入万妖山脉的际遇', steps:['xingdou1','xingdou2','xingdou3']},
  wuhundian: {name:'太玄圣宗之路', desc:'在太玄圣宗内步步高升', steps:['whd1','whd2','whd3']},
  hunbing: {name:'法宝遗泽', desc:'发现远古法宝残片，历经融合试炼、法宝共鸣，最终得一件万年法宝入体', steps:['hb1','hb2','hb3']},
  hanyue: {name:'龙象锤韵', desc:'在龙象宗磨砺锤法根基，领悟撼岳锤法真意', steps:['ht1','ht2','ht3','ht4']},
  landian: {name:'风雷龙脉', desc:'在风雷谷淬体觉醒，唤醒远古龙魂', steps:['ld1','ld2','ld3','ld4']},
  binghuo: {name:'阴阳灵泉', syn:{cat:'zhi',catMult:1.3}, desc:'寻得阴阳灵泉，冰泉淬体与火泉炼魂二择其一', steps:['bh1','bh2','bh3','bh4']},
  xingluo: {name:'大楚权谋', desc:'入大楚皇朝宫廷卷入夺嫡之局，从龙之功与夺嫡风波两条截然不同的路', steps:['xl1','xl2','xl3','xl4']},
  dasai: {name:'诸宗联办论道大会', desc:'诸宗联办论道大会——筑基/金丹/元婴三组论道，初赛、复赛、决赛，夺魁者冠绝同辈', steps:['ds1','ds2','ds3','ds4']},
  dongfu: {name:'古修洞府', desc:'发现上古修士遗留洞府，破禁而入，探宝参悟', steps:['df1','df2','df3','df4']}
}
