// 10 个剧本的素材包。内嵌引号一律使用中文弯引号 「」避免 JS 字符串错乱。

export const PROJECTS = [
  {
    slug: "01-shanhun-haomen",
    title: "闪婚豪门",
    genre: "都市甜宠 · 闪婚豪门",
    logline: "被未婚夫当街退婚的设计师在酒会上随手拽过一个男人假装男友，第二天发现自己昨晚领证嫁给了京城最难追的霍氏总裁。",
    characters: [
      { name: "苏念安", role: "主角", desire: "把自己的设计品牌做大，证明退婚不是她的错", wound: "5 岁被生母抛弃，怕被任何人再选择性放弃", arc: "从用婚姻自证 → 接受自己本身就值得被爱" },
      { name: "霍奕琛", role: "对手", desire: "维系霍氏家族秩序，逼母亲承认他作为继承人的合法性", wound: "母亲是父亲的情人，他生下来就被原配家族敌视", arc: "把「利用对方」的合约 → 真正学会向人示弱" },
      { name: "顾婉清", role: "盟友", desire: "保护闺蜜苏念安，也借机进入霍家圈层做品牌联营", wound: "和苏念安共同度过孤儿院少年时期", arc: "从代偿照顾 → 学会先安顿自己" },
    ],
    relationships: [
      { a: 0, b: 1, type: "强制婚约", tension: "一纸领证书把两个想互相利用的人锁在一起", power: "霍奕琛掌握所有信息和资源，苏念安只能见招拆招", history: "酒会前并不相识，但都被同一个媒体勒索过", hidden: "霍奕琛其实在三年前的设计展上就注意过苏念安" },
      { a: 0, b: 2, type: "手足战友", tension: "顾婉清比苏念安更早看出霍奕琛动了真心", power: "情感对等，但顾婉清主动挡刀的次数更多", history: "孤儿院共读 10 年", hidden: "顾婉清正在偷偷帮苏念安整理生母资料" },
    ],
    plotCards: [
      { actIdx: 0, nodeIdx: 0, title: "退婚现场", summary: "苏念安在订婚酒会上被未婚夫当众宣布退婚", change: "她从「被选中的人」跌回起点" },
      { actIdx: 0, nodeIdx: 2, title: "酒会借位", summary: "她随手拽住吧台旁陌生男人霍奕琛的领带，让全场看见", change: "用一次假装把自己重新摆上桌" },
      { actIdx: 0, nodeIdx: 3, title: "次日醒来", summary: "醒在五星酒店床上，床头柜放着民政局红本本", change: "假装变真实，进入对手主场" },
      { actIdx: 1, nodeIdx: 0, title: "合约谈判", summary: "霍奕琛提出 6 个月契约婚姻条款", change: "目标分歧表面化" },
      { actIdx: 1, nodeIdx: 2, title: "媒体围猎", summary: "前未婚夫卖通稿，苏念安事业差点夭折，霍奕琛动用霍氏舆论资源反杀", change: "霍奕琛首次为她破规矩" },
      { actIdx: 1, nodeIdx: 4, title: "母亲拜访", summary: "霍奕琛母亲约苏念安喝下午茶，递上离婚协议和支票", change: "苏念安发现自己舍不得离婚" },
      { actIdx: 2, nodeIdx: 0, title: "霍奕琛认输", summary: "霍奕琛在大雨里追到机场，承认自己输给了一开始就动心的人", change: "权力天平第一次翻转" },
      { actIdx: 2, nodeIdx: 1, title: "重新求婚", summary: "在最初的酒会原地，霍奕琛单膝跪地把那张领证书撕了，递上真正的求婚戒指", change: "她终于不是借位的人" },
    ],
    scenes: [
      { title: "退婚酒会", act: 0, location: "璇宫酒店 · 主厅", pov: 0, goal: "说服对方", obstacle: "未婚夫提前买通司仪当众宣读分手", outcome: "目标失败" },
      { title: "婚书惊魂", act: 0, location: "霍氏总裁套房", pov: 0, goal: "揭露真相", obstacle: "记忆断片，证人只有对面的男人", outcome: "达成但有意外后果" },
      { title: "雨夜机场", act: 2, location: "首都国际机场 T3", pov: 1, goal: "保护某人", obstacle: "她已经过了安检", outcome: "达成但有意外后果" },
    ],
    firstSceneScript: `INT. 璇宫酒店 主厅 - 夜

水晶吊灯刺眼。订婚酒会的香槟塔旁，苏念安一身银色晚礼服，礼貌地微笑。

司仪敲了下话筒。

司仪
（带着歉意）
各位来宾，临时通知一下——

未婚夫从人群里走出，手里攥着话筒。

未婚夫
对不起，念安，我们的婚约……到此为止。

全场寂静。镁光灯像审讯。

苏念安
（极轻）
就在今天？

她把香槟杯轻轻放回托盘，转身走向吧台。脚步不快，但每一步都像踩在自己心上。

吧台旁一个男人正在低头看手机。深灰西装，没认得出来是谁。

苏念安
（伸手把对方领带绕在自己手心）
配合一下，三秒钟。

霍奕琛抬头，眼神没动，嘴角却很慢地翘了一下。

霍奕琛
（低声）
三秒？我以为你想要一辈子。

CUT TO 黑场。
`,
  },

  {
    slug: "02-gongting-hulian",
    title: "凤栖梧",
    genre: "古装虐恋 · 宫廷权谋",
    logline: "在皇兄登基大典上替死姐姐入宫的少女发现，新帝早在她姐姐死前就认出了她，并已用一整个朝局为她铺好棋盘。",
    characters: [
      { name: "沈昭华", role: "主角", desire: "查清姐姐死因，全身而退离开深宫", wound: "12 岁起被生母作为「替身」养大", arc: "从被动复刻姐姐 → 用自己的名字定胜负" },
      { name: "萧景珩", role: "对手", desire: "稳住刚登基的政局，名正言顺娶到沈昭华", wound: "做太子时为保她姐姐被迫和亲戎北", arc: "从「用整个江山换一个人」 → 学会先成为合格的皇帝" },
      { name: "陆青砚", role: "盟友", desire: "替死去的女主子复仇，并保护沈昭华", wound: "原是沈大姐姐的贴身女官", arc: "从执念复仇 → 选择把新主子推上凤位" },
    ],
    relationships: [
      { a: 0, b: 1, type: "归来宿敌", tension: "她以为他爱的是姐姐，他知道她不是姐姐", power: "新帝有兵权，她只有姐姐留下的密信", history: "幼年曾在皇家围猎中救过对方一次", hidden: "萧景珩当年其实先认识的是妹妹" },
      { a: 0, b: 2, type: "师徒传承", tension: "陆青砚一边守护一边对她隐瞒姐姐死亡真相", power: "陆青砚知道宫规，沈昭华是名义上的主子", history: "陆青砚抱过婴儿期的沈昭华", hidden: "陆青砚私藏了姐姐的遗诏" },
    ],
    plotCards: [
      { actIdx: 0, nodeIdx: 0, title: "登基替身", summary: "登基大典上沈昭华被强行送进皇辇，顶替姐姐", change: "她从沈家女儿变成「沈昭仪」" },
      { actIdx: 0, nodeIdx: 2, title: "新帝相认", summary: "萧景珩屏退众人，第一句话叫的是她真名", change: "替身骗局当场被刺破" },
      { actIdx: 0, nodeIdx: 3, title: "封妃诏书", summary: "萧景珩坚持以「沈昭华」本名昭告天下封贵妃", change: "她被推到风口浪尖" },
      { actIdx: 1, nodeIdx: 0, title: "皇后下毒", summary: "皇后在中秋宴上下毒，沈昭华亲自替萧景珩挡杯", change: "她第一次主动选择留下" },
      { actIdx: 1, nodeIdx: 2, title: "戎北和亲案", summary: "她从陆青砚处得知姐姐当年的死与戎北和亲案有关", change: "复仇线和情感线撞在一起" },
      { actIdx: 1, nodeIdx: 4, title: "废妃流放", summary: "为保新政，萧景珩下旨废沈昭华贵妃位流放冷宫", change: "权力夺回沈昭华手中" },
      { actIdx: 2, nodeIdx: 0, title: "战火兵临", summary: "戎北铁骑南下，沈昭华披甲赴前线劝降", change: "她终于以本名定胜负" },
      { actIdx: 2, nodeIdx: 1, title: "凤位空悬", summary: "她拒绝回宫做后位，转身进入女官系统", change: "替身彻底脱身" },
    ],
    scenes: [
      { title: "登基大典", act: 0, location: "太和殿 外 · 凤辇", pov: 0, goal: "逃离此地", obstacle: "凤辇外有 200 禁军", outcome: "目标失败" },
      { title: "中秋夜宴", act: 1, location: "重华宫 · 夜宴厅", pov: 0, goal: "保护某人", obstacle: "皇后亲手递杯", outcome: "达成但有意外后果" },
      { title: "兵临城下", act: 2, location: "京郊驿道 · 风雪夜", pov: 0, goal: "说服对方", obstacle: "戎北可汗本就是姐姐的旧人", outcome: "目标达成" },
    ],
    firstSceneScript: `EXT. 太和殿 外 - 黎明

钟鼓九响。万民跪伏。沈昭华一袭皇姐留下来的金红色凤袍跪在凤辇内，指节苍白。

凤辇外，礼官低唱。

礼官（O.S.）
请——昭仪殿下——升辇——

沈昭华抬眼，透过凤辇的纱帐看见远处龙袍上的人影。

沈昭华
（极轻，几乎只动嘴唇）
姐姐，你为什么把这个位置留给了我。

凤辇缓缓抬起。她忽然感到帘外有人的视线落在自己身上。

那是新帝萧景珩。
他没有看凤辇。他在隔着帘子看她的眼睛。

CUT TO：他眼角的红，在朝阳下烧成一颗细小的痣。

黑场。
`,
  },

  {
    slug: "03-chuanyue-fuchou",
    title: "重生 1999",
    genre: "穿越重生 · 复仇逆袭",
    logline: "被丈夫和闺蜜联手骗光所有产业的 38 岁女投行人在落水那晚重生回 1999 年的高三教室，她决定这一次先把所有恨她的人变成欠她的人。",
    characters: [
      { name: "林知夏", role: "主角", desire: "靠 1999 年的信息差财富自由，再亲手碾碎前世背叛她的两个人", wound: "前世被人吃干抹净，连死都被布置成自杀", arc: "从复仇执念 → 用更大的事业把背叛者顺手淘汰" },
      { name: "周明远", role: "对手", desire: "用前世记忆里的人脉提前布局，做下一代金融大鳄", wound: "前世曾被知夏举报过老鼠仓，重生后两人变成镜像对手", arc: "从把她当资源 → 真正承认她比自己强" },
      { name: "陈舒桐", role: "盟友", desire: "走出 1999 年的小镇女孩剧本，成为知夏第一个合伙人", wound: "前世被高考志愿误导考去外省差点失踪", arc: "从依附知夏 → 长成可以独立做项目的合伙人" },
    ],
    relationships: [
      { a: 0, b: 1, type: "归来宿敌", tension: "前世的丈夫成了这世的同行死敌", power: "彼此都带着未来记忆，每一步都是博弈", history: "前世共同骗过她的 4 亿资产", hidden: "周明远不知道知夏先开始的并不是复仇而是验证" },
      { a: 0, b: 2, type: "师徒传承", tension: "知夏要带舒桐走出小镇，但不能告诉她未来", power: "知夏掌握全部信息，舒桐用青春信任", history: "前世两人未曾相识", hidden: "舒桐曾是知夏前世葬礼上唯一一个陌生的吊唁者" },
    ],
    plotCards: [
      { actIdx: 0, nodeIdx: 0, title: "雨夜落水", summary: "38 岁的知夏在江边被推下水，意识沉入冰冷江底", change: "前世终结" },
      { actIdx: 0, nodeIdx: 2, title: "高三早自习", summary: "知夏睁眼，发现自己穿着 1999 年的校服坐在高三 (5) 班", change: "重生时点确认" },
      { actIdx: 0, nodeIdx: 3, title: "第一桶金", summary: "她写下 2003 年互联网股名单，去镇上唯一的证券所偷偷开户", change: "把未来变成本金" },
      { actIdx: 1, nodeIdx: 0, title: "周明远重逢", summary: "她在省城金融培训营上意外看见少年版周明远", change: "对手提前出现" },
      { actIdx: 1, nodeIdx: 2, title: "合伙人成军", summary: "知夏拉着舒桐成立第一个工作室，签下三家小公司", change: "事业雏形" },
      { actIdx: 1, nodeIdx: 4, title: "反向举报", summary: "前世害她的导师在这世里仍犯了同样的老鼠仓，知夏先一步举报", change: "复仇第一刀落下" },
      { actIdx: 2, nodeIdx: 0, title: "翻局对赌", summary: "知夏和周明远在 2008 次贷危机里同时押注，知夏赢", change: "事业天平定型" },
      { actIdx: 2, nodeIdx: 1, title: "新生活", summary: "她在 30 岁的生日上谢绝了周明远的合伙邀请，回家陪母亲", change: "复仇线收尾" },
    ],
    scenes: [
      { title: "雨夜落水", act: 0, location: "江畔栈桥 · 暴雨", pov: 0, goal: "逃离此地", obstacle: "脚下木板已被锯过", outcome: "目标失败" },
      { title: "高三早自习", act: 0, location: "县一中高三(5)班 教室", pov: 0, goal: "获取物品", obstacle: "她已经不记得高考公式", outcome: "达成但有意外后果" },
      { title: "证券所开户", act: 0, location: "县城邮局二楼证券交易厅", pov: 0, goal: "传递信息", obstacle: "未成年要监护人签字", outcome: "目标达成" },
    ],
    firstSceneScript: `EXT. 江畔栈桥 - 暴雨夜

雨砸在木板上。林知夏脚下是一段早已被人锯短的栈桥。

身后传来熟悉的脚步声。

周明远（O.S.）
（声音很温柔）
知夏，你回头看看我。

林知夏没有回头。她把外套口袋里那只 U 盘攥得更紧。

林知夏
（自语）
我早就知道是你。

栈桥断裂。她坠入冰冷的江水。

水下，她睁眼，看见的不是黑暗，而是一片白色——

CUT TO：

INT. 县一中 高三(5)班 - 清晨

阳光打在 1999 年的木课桌上。林知夏睁眼，校服袖口写着她 17 岁的字迹。

林知夏 (V.O.)
原来死了的不是这个世界，是我。

黑场。
`,
  },

  {
    slug: "04-xuanyi-xingzhen",
    title: "雾港谜局",
    genre: "悬疑 · 刑侦犯罪",
    logline: "一名调到边境雾港分局的痕迹检验员发现，全城悬而未破的 7 起溺亡案，每一具尸体的指甲缝里都藏着不属于死者的同一种海蓝色油漆。",
    characters: [
      { name: "纪言之", role: "主角", desire: "查清 7 案背后是否是同一只手在动", wound: "妹妹 5 年前在同一片海域失踪，从此她无法靠近海", arc: "从只信物证 → 学会把人证和物证一起读" },
      { name: "宋怀洲", role: "对手", desire: "守住自己作为雾港「治理者」的形象，让港口船运恢复", wound: "他十五岁离家时父亲在港口跳海", arc: "从把秘密压成习惯 → 主动交出真相" },
      { name: "白屿生", role: "盟友", desire: "做一个不出错的刑警队副队长", wound: "前一任搭档死在他面前", arc: "从循规蹈矩 → 学会陪纪言之走灰区" },
    ],
    relationships: [
      { a: 0, b: 1, type: "强力对手", tension: "纪言之要破案，宋怀洲要让案不破", power: "宋掌握港口权力，纪掌握物证", history: "5 年前纪妹妹失踪那天宋怀洲在现场目击过", hidden: "宋怀洲其实保留了纪妹妹最后的口信" },
      { a: 0, b: 2, type: "左膀右臂", tension: "白屿生想保护纪言之但不想越线", power: "白比纪资深，但纪是技术权威", history: "他俩是警校同期", hidden: "白其实早就发现了第 8 个失踪人口" },
    ],
    plotCards: [
      { actIdx: 0, nodeIdx: 0, title: "第七具尸体", summary: "凌晨 3 点，雾港码头打捞起第 7 具溺亡者，指甲缝海蓝色油漆", change: "她意识到这是连环案" },
      { actIdx: 0, nodeIdx: 2, title: "调档案", summary: "纪言之翻出过去 5 年同类案，确认油漆同源", change: "案件升级" },
      { actIdx: 0, nodeIdx: 3, title: "宋怀洲登场", summary: "市港口办公室主任宋怀洲约见，要求她按「事故」结案", change: "对手锁定" },
      { actIdx: 1, nodeIdx: 0, title: "妹妹遗物", summary: "她在档案室翻到 5 年前妹妹失踪报案记录，最后一通电话来自宋怀洲", change: "私案撞上公案" },
      { actIdx: 1, nodeIdx: 2, title: "油漆来源", summary: "三人查到油漆来自城南「远帆五金」，店主已死于车祸", change: "线索被人提前清扫" },
      { actIdx: 1, nodeIdx: 4, title: "白屿生中刀", summary: "白屿生在港口仓库被袭，纪言之到场救人，第一次开枪", change: "她跨过了一直坚守的红线" },
      { actIdx: 2, nodeIdx: 0, title: "灯塔对峙", summary: "纪言之在港口灯塔顶找到宋怀洲，他亲手交出第 8 名失踪人口的下落", change: "对手主动认输" },
      { actIdx: 2, nodeIdx: 1, title: "结案归港", summary: "案件正式宣告告破，纪言之申请调离雾港", change: "她放下了海" },
    ],
    scenes: [
      { title: "码头夜捞", act: 0, location: "雾港 7 号泊位 · 夜", pov: 0, goal: "获取物品", obstacle: "潮水太急，2 小时窗口", outcome: "目标达成" },
      { title: "档案室长夜", act: 0, location: "雾港分局 档案室 · 深夜", pov: 0, goal: "揭露真相", obstacle: "5 年档案纸质化，索引不全", outcome: "达成但有意外后果" },
      { title: "灯塔对峙", act: 2, location: "雾港老灯塔 顶层", pov: 0, goal: "说服对方", obstacle: "宋怀洲已经准备好跳下去", outcome: "目标达成" },
    ],
    firstSceneScript: `EXT. 雾港 7 号泊位 - 凌晨

冷雾。海面比夜色还黑。

打捞队从水里拖出一具女性尸体，盖在防水布下。

纪言之（30 出头，刑警制服，手套）蹲下，掀开布角。

她的目光直接落到尸体的指甲缝。

纪言之
（对身后的白屿生）
打手电。

白屿生递过手电。光打下去，指甲缝里——一抹海蓝。

纪言之
（轻得几乎听不见）
又是这个颜色。

白屿生
（皱眉）
第几次？

纪言之
（站起身，仰头看雾）
第七次。

她把手套脱下来，扔进证物袋。手指在颤抖。

黑场。
`,
  },

  {
    slug: "05-zhichang-shangzhan",
    title: "破壁人",
    genre: "职场 · 商战创业",
    logline: "在头部互联网大厂被裁员的女产品总监带着一个被否决过 3 次的提案离职，转身加入了 7 年前被她亲手压制的竞品创始人组成的小团队。",
    characters: [
      { name: "陆青棠", role: "主角", desire: "把自己 7 年内压在抽屉里的提案做成行业现象级产品", wound: "她当年压住的竞品，让 27 岁的对方差点跳楼", arc: "从制度内的胜者 → 制度外的合作者" },
      { name: "祁原", role: "对手", desire: "让陆青棠承认 7 年前的判断错了", wound: "27 岁那次项目崩盘后他自己也成了一个被规则伤过的人", arc: "从复仇心态 → 把合作真正完成" },
      { name: "范小棋", role: "盟友", desire: "做完一款让自己骄傲的产品", wound: "上一份工作的同事在凌晨过劳猝死", arc: "从工具人 → 主导一个核心功能模块" },
    ],
    relationships: [
      { a: 0, b: 1, type: "归来宿敌", tension: "她当年的「胜者」姿态如今要在他的牌桌上重新证明", power: "祁原已经是这个小团队的实际 CEO", history: "7 年前的封杀邮件", hidden: "祁原其实保留了那封邮件" },
      { a: 0, b: 2, type: "师徒传承", tension: "她想给小棋更多空间，但每次都忍不住接管", power: "陆是 leader 但小棋是这个产品最早的原型作者", history: "面试时小棋差点退场", hidden: "小棋一直没告诉她自己其实在写一份离职信" },
    ],
    plotCards: [
      { actIdx: 0, nodeIdx: 0, title: "毕业典礼", summary: "陆青棠在年会上被通知组织优化，最后一次穿工牌走出大厦", change: "她的身份归零" },
      { actIdx: 0, nodeIdx: 2, title: "祁原找上门", summary: "祁原带着一份合伙人合同登门，邀请她加入新团队", change: "对手转盟友" },
      { actIdx: 0, nodeIdx: 3, title: "提案重启", summary: "陆青棠把抽屉里 7 年的提案放上小团队会议桌", change: "故事的初始引擎被点燃" },
      { actIdx: 1, nodeIdx: 0, title: "第一轮被否", summary: "投资人会议上她遭遇 7 个连续 NO", change: "外部世界对她重新评分" },
      { actIdx: 1, nodeIdx: 2, title: "范小棋的功能", summary: "范小棋熬夜做出一个验证 demo，陆青棠看到后第一次主动退让", change: "她开始真正成为合作者" },
      { actIdx: 1, nodeIdx: 4, title: "前东家反扑", summary: "前东家高价挖走范小棋未果，转向起诉团队侵权", change: "外部威胁高潮" },
      { actIdx: 2, nodeIdx: 0, title: "庭外和解", summary: "陆青棠拿出当年那封封杀邮件作为反向筹码，前东家撤诉", change: "她终于承认自己 7 年前的错" },
      { actIdx: 2, nodeIdx: 1, title: "产品上线", summary: "产品上线第 30 天 DAU 突破 100 万", change: "事业线收束" },
    ],
    scenes: [
      { title: "最后一次工牌", act: 0, location: "前东家大厦 大堂", pov: 0, goal: "逃离此地", obstacle: "HR 当众交接，前同事拍照", outcome: "目标达成" },
      { title: "合伙人邀约", act: 0, location: "城市西郊 一家旧厂房改造的咖啡店", pov: 0, goal: "说服对方", obstacle: "她还在防对方报复", outcome: "达成但有意外后果" },
      { title: "投资人圆桌", act: 1, location: "国贸 32 楼 投资机构会议室", pov: 0, goal: "说服对方", obstacle: "7 个 NO，时间只有 90 分钟", outcome: "目标失败" },
    ],
    firstSceneScript: `INT. 前东家大厦 大堂 - 下午

巨大的 LED 屏滚动着公司价值观。陆青棠 (35) 穿着干净的米色风衣，工牌已经被她摘下，握在手心。

HR 站在前台，礼貌而客气。

HR
青棠姐，签个字就可以了。

她把工牌放到回收盒里。塑料壳磕在金属盒底，发出一声很轻的脆响。

陆青棠
（看一眼大屏）
「以客户为中心」——
我做了 7 年。

HR 没接话。

陆青棠转身走出大堂。门外的太阳很烈。
她没戴墨镜，眼眶通红地直视前方。

旁白（V.O.，陆青棠）
我以为出局就是终点。
后来才知道，那只是另一种开局。

黑场。
`,
  },

  {
    slug: "06-jiating-daiji",
    title: "母亲的最后一通电话",
    genre: "家庭 · 代际亲情",
    logline: "母亲去世后第三个月，三个早已断绝来往的子女发现，每个人手机里都收到了同一条来自妈妈号码的语音，留言时间是她葬礼之后第 7 天的凌晨 3 点。",
    characters: [
      { name: "周亦宁", role: "主角", desire: "搞清楚那条语音是谁发的，也搞清楚自己究竟欠了母亲什么", wound: "母亲生病期间，她在国外没赶回来", arc: "从用工作躲避 → 学会跟两个弟妹站在同一张餐桌前" },
      { name: "周亦舟", role: "对手", desire: "让事情就这样过去，别再翻", wound: "他是母亲眼里「最不争气」的儿子", arc: "从「我没资格说话」 → 终于把心里话说出口" },
      { name: "周亦真", role: "盟友", desire: "想要一个真正的家", wound: "她是养女，三十年才知道自己不是亲生的", arc: "从害怕被赶出去 → 主动把母亲的房子留下" },
    ],
    relationships: [
      { a: 0, b: 1, type: "反目旧友", tension: "他们已经 5 年没见过面", power: "周亦宁经济能力强势，但周亦舟有母亲最后的陪伴时间", history: "母亲住院时只有亦舟在", hidden: "亦舟其实偷录了母亲的最后一次嘱托" },
      { a: 0, b: 2, type: "手足战友", tension: "亦真夹在两个亲生子女中间，没有立场", power: "亦真知道母亲的所有日常细节", history: "三人一起长大", hidden: "亦真其实早就知道自己是养女" },
    ],
    plotCards: [
      { actIdx: 0, nodeIdx: 0, title: "异常语音", summary: "葬礼后第 7 天凌晨 3 点，三人手机同时收到母亲号码发来的 17 秒语音", change: "未关闭的世界被重新打开" },
      { actIdx: 0, nodeIdx: 2, title: "三人聚首", summary: "三个 5 年没见的兄弟姐妹回到老房子坐到同一张餐桌前", change: "家被强制重启" },
      { actIdx: 0, nodeIdx: 3, title: "录音真伪", summary: "音频专家鉴定语音的确是母亲的真声，但来源未知", change: "悬疑升级" },
      { actIdx: 1, nodeIdx: 0, title: "病历翻出", summary: "亦宁回顾母亲的病历，发现最后一次复诊她拒绝了化疗", change: "对母亲的看法被推翻" },
      { actIdx: 1, nodeIdx: 2, title: "亦舟的录音", summary: "亦舟交出他偷录的母亲最后嘱托，里头分别给三人各留一句话", change: "家庭秘密揭开一半" },
      { actIdx: 1, nodeIdx: 4, title: "亦真的真相", summary: "亦真主动说出自己是养女、并出示母亲早写好的归还信", change: "信任结构松动重建" },
      { actIdx: 2, nodeIdx: 0, title: "中元夜", summary: "三人按母亲遗愿在中元夜走了一遍她常走的小巷", change: "他们终于走在一起" },
      { actIdx: 2, nodeIdx: 1, title: "新年餐桌", summary: "次年除夕三人第一次在老房子里包饺子", change: "家恢复" },
    ],
    scenes: [
      { title: "凌晨 3 点的语音", act: 0, location: "亦宁 · 上海家中卧室", pov: 0, goal: "获取物品", obstacle: "她手在抖，几乎按不准播放键", outcome: "达成但有意外后果" },
      { title: "老房子餐桌", act: 0, location: "母亲老房子 · 餐厅", pov: 0, goal: "说服对方", obstacle: "三人五年的隔阂", outcome: "目标失败" },
      { title: "中元夜小巷", act: 2, location: "母亲生前每天走的菜场巷", pov: 0, goal: "完成仪式", obstacle: "巷子已被拆掉一半", outcome: "目标达成" },
    ],
    firstSceneScript: `INT. 上海 · 周亦宁卧室 - 凌晨 3:02

落地窗外是浦江的夜色。床头柜上手机屏亮起，没有铃声，只有震动。

周亦宁（38，皱着眉睁眼）伸手去拿，看屏幕的瞬间整个人僵住。

来电人显示：

妈

她按下播放。听筒里只传来很轻的呼吸声，然后是母亲的声音。

母亲（V.O.）
亦宁，妈这边没事，你别老熬着……
你弟你妹也还在等你回家。

17 秒。语音结束。

周亦宁缓缓坐起来，把手按在心口。

她拨回那个号码。

电信语音
您拨打的号码暂时无法接通。

黑场。
`,
  },

  {
    slug: "07-xiaoyuan-qingchun",
    title: "白桦树下",
    genre: "校园 · 青春成长",
    logline: "高三复读班的女生在一次校园广播站直播事故中被迫接管栏目，并在每周二晚的「白桦树下」半小时里，意外把全校六个被孤立的人编成了一个小型同盟。",
    characters: [
      { name: "顾笙", role: "主角", desire: "考上 985，让妈妈知道她不是没用", wound: "去年因为月考前抑郁缺考被迫复读", arc: "从压抑自己 → 学会先把别人也照亮" },
      { name: "霍声明", role: "对手", desire: "拿下省状元，把复读班这种「差班」清出学校", wound: "从初中起所有人都期待他第一", arc: "从信奉冷规则 → 学会承认自己也想被听见" },
      { name: "苏晓阳", role: "盟友", desire: "把广播站做成「被听见的人」的角落", wound: "她有口吃，过去从不敢站到话筒前", arc: "从藏起来 → 在直播尾声第一次报自己的名字" },
    ],
    relationships: [
      { a: 0, b: 1, type: "强力对手", tension: "成绩对手 + 广播节目题材分歧", power: "霍是年级第一，顾是复读生", history: "他们小学同班", hidden: "霍声明的妹妹是被顾笙之前匿名回信过的那位" },
      { a: 0, b: 2, type: "左膀右臂", tension: "苏晓阳负责所有技术，顾笙负责所有出声", power: "对等合作", history: "广播站迎新接力", hidden: "苏晓阳在直播第一期就调高了顾笙的麦克风音量" },
    ],
    plotCards: [
      { actIdx: 0, nodeIdx: 0, title: "直播事故", summary: "周二晚 8 点，原主播请假，顾笙被推到话筒前", change: "她无路可退" },
      { actIdx: 0, nodeIdx: 2, title: "第一封来信", summary: "节目结束，邮箱收到一封匿名信，写着「你今天救了我」", change: "节目有了责任" },
      { actIdx: 0, nodeIdx: 3, title: "霍声明施压", summary: "霍声明作为学生会主席要求广播站停播这一档节目", change: "外部压力到位" },
      { actIdx: 1, nodeIdx: 0, title: "六人小组", summary: "顾笙在直播里念出听众来信，把六个被孤立的人聚成一个线下读书会", change: "节目变成同盟" },
      { actIdx: 1, nodeIdx: 2, title: "妈妈来访", summary: "顾笙妈妈到学校要求她停掉广播节目专心读书", change: "私人压力" },
      { actIdx: 1, nodeIdx: 4, title: "霍声明妹妹", summary: "霍声明的妹妹被发现就是其中一封匿名来信的人", change: "对手立场转变" },
      { actIdx: 2, nodeIdx: 0, title: "高考前夜", summary: "高考前夜顾笙最后一次直播，霍声明走进直播间", change: "对手归位为同盟" },
      { actIdx: 2, nodeIdx: 1, title: "结业典礼", summary: "广播站把「白桦树下」留作传统栏目移交学妹", change: "传承达成" },
    ],
    scenes: [
      { title: "广播站直播事故", act: 0, location: "一中广播站 · 周二 19:55", pov: 0, goal: "传递信息", obstacle: "30 秒倒计时，主稿没拿到", outcome: "达成但有意外后果" },
      { title: "妈妈来访", act: 1, location: "校门口 老榕树下", pov: 0, goal: "说服对方", obstacle: "妈妈要立刻带她回家", outcome: "目标失败" },
      { title: "高考前夜的最后一期", act: 2, location: "一中广播站 · 高考前一晚", pov: 0, goal: "完成仪式", obstacle: "时间只有 30 分钟", outcome: "目标达成" },
    ],
    firstSceneScript: `INT. 一中 · 广播站 - 周二 19:55

老式调音台。一排红灯。空气中只有荧光灯的电流声。

顾笙（18，校服外搭毛衣）被苏晓阳推进直播间。

苏晓阳
（声音轻，但语速急）
笙——笙姐——你顶五分钟——

倒计时跳到 0。红灯亮起。

顾笙
（深呼吸，对着麦克风）
晚上好，欢迎来到「白桦树下」。
今晚的主播是……
（停了半秒）
顾笙。一个复读生。

她抬眼，看见调音台对面苏晓阳的眼眶突然红了。

顾笙
（继续）
今晚我们不读课文，
也不读名人传记。
今晚我们读——
你们没有告诉过任何人的那句话。

红灯下，全校的耳机里第一次出现长长的、安静的留白。

黑场。
`,
  },

  {
    slug: "08-xuanhuan-xianxia",
    title: "九重霜",
    genre: "玄幻 · 仙侠修真",
    logline: "上古封印松动时，被流放到凡间的剑修少女发现，封印之下的并不是邪祟，而是她自己三百年前被天道亲手抹去的那段记忆和那个人。",
    characters: [
      { name: "应霜", role: "主角", desire: "保住凡间小镇免被封印破裂波及，并搞清自己被抹去的过去", wound: "三百年前曾掌剑斩友", arc: "从拒绝相信记忆 → 选择把自己的剑重新指向天道" },
      { name: "玄昭", role: "对手", desire: "他既要替天道收回应霜的剑，又不肯亲自动手", wound: "他就是应霜三百年前要斩的那个人", arc: "从代天道执行 → 主动逆天" },
      { name: "阿芜", role: "盟友", desire: "做应霜的「凡间记忆」——记下她每天发生的事", wound: "她是封印破裂前最后一个能记得真相的凡人", arc: "从被托付 → 主动加入战斗" },
    ],
    relationships: [
      { a: 0, b: 1, type: "归来宿敌", tension: "他们彼此其实是命中注定的剑友", power: "玄昭已成天庭执剑使者，应霜是被流放者", history: "三百年前同门修行", hidden: "玄昭手里那把剑就是应霜当年的那把" },
      { a: 0, b: 2, type: "师徒传承", tension: "应霜担心阿芜被卷入天道纷争", power: "应霜法力高，阿芜记忆完整", history: "阿芜从小见过应霜下凡", hidden: "阿芜其实是上一任执剑使者转世" },
    ],
    plotCards: [
      { actIdx: 0, nodeIdx: 0, title: "封印松动", summary: "南山下封印突然震动，凡间小镇出现异象", change: "故事被外力打开" },
      { actIdx: 0, nodeIdx: 2, title: "应霜下山", summary: "被流放的应霜被迫出山，前往小镇查异", change: "主角入局" },
      { actIdx: 0, nodeIdx: 3, title: "玄昭现身", summary: "天庭执剑使者玄昭出现在小镇，自称来「协助」", change: "对手现身" },
      { actIdx: 1, nodeIdx: 0, title: "封印之下", summary: "她在封印底层看到三百年前自己持剑那一晚的画面", change: "记忆回流" },
      { actIdx: 1, nodeIdx: 2, title: "玄昭就是他", summary: "应霜认出玄昭就是当年她要斩的剑友", change: "敌人变成「必须救的人」" },
      { actIdx: 1, nodeIdx: 4, title: "天道警告", summary: "天道发下警示符，警告应霜不得违抗本次清算", change: "全宇宙级压力" },
      { actIdx: 2, nodeIdx: 0, title: "封印之战", summary: "应霜以本命剑挡住封印之下苍生溢出的怨力", change: "她终于把剑指向天道" },
      { actIdx: 2, nodeIdx: 1, title: "新封印", summary: "应霜与玄昭重新立下双人封印，留下阿芜作为人间见证", change: "新秩序成立" },
    ],
    scenes: [
      { title: "南山异象", act: 0, location: "南山封印之顶 · 雷雨夜", pov: 0, goal: "保护某人", obstacle: "凡人小镇毫无防御", outcome: "达成但有意外后果" },
      { title: "封印底层", act: 1, location: "南山 · 封印阵底", pov: 0, goal: "揭露真相", obstacle: "记忆被天道封禁", outcome: "目标达成" },
      { title: "封印之战", act: 2, location: "南山顶 · 三百年前的剑场", pov: 0, goal: "完成仪式", obstacle: "天道介入，应霜剑被夺回三次", outcome: "目标达成" },
    ],
    firstSceneScript: `EXT. 南山封印之顶 - 雷雨夜

雷劈在巨大封印石的中央。封印纹路裂开一道金光。

应霜（看似 22 岁，发白如霜）剑出鞘，立于山顶。

阿芜（19，凡人女子）扶着山门台阶，仰头喊。

阿芜
霜姐——下面的镇子——

应霜没看她，只盯着封印缝隙里渗出的那一抹「人形」光影。

应霜
（极轻）
是你。

光影里走出一个剑修。玄袍，剑指地。

玄昭
（声音平静）
应霜，剑收一收。
天道这次没让你下山。

应霜抬剑，剑尖直指他。

应霜
那就让我先杀回去。

雷光打下，画面凝在两柄剑相抵的瞬间。

黑场。
`,
  },

  {
    slug: "09-niandai-1990",
    title: "南门外的录像厅",
    genre: "年代 · 90 年代怀旧",
    logline: "1993 年的小城少女顶替哥哥经营家里那家亏损的录像厅，并在三个月后用一卷别人塞进店里的无名录像带，无意间撞上了整条街道的命运。",
    characters: [
      { name: "宁向阳", role: "主角", desire: "把录像厅救活，把哥哥从外地工地接回家", wound: "她 16 岁那年父亲突然脑溢血去世", arc: "从替家里「顶班」 → 学会自己说了算" },
      { name: "邓启年", role: "对手", desire: "把整条南门街收回街道办名下重新规划", wound: "他自己年轻时也曾偷偷在录像厅看完一整部《英雄本色》", arc: "从公事公办 → 给老街开一道生路" },
      { name: "苏小冰", role: "盟友", desire: "她要离开这座小城去广州", wound: "她妈在国营厂下岗", arc: "从一心想跑 → 选择和宁向阳一起留半步" },
    ],
    relationships: [
      { a: 0, b: 1, type: "强力对手", tension: "宁向阳要保住录像厅，邓启年要拆", power: "邓有行政权，宁有南门街所有老主顾", history: "童年同住一条街", hidden: "邓启年正是 7 年前最后一次救过宁父的人" },
      { a: 0, b: 2, type: "手足战友", tension: "小冰想拉宁向阳一起跑广州", power: "对等", history: "邻居加同班", hidden: "小冰其实把自己的存款偷偷压在录像厅账面上" },
    ],
    plotCards: [
      { actIdx: 0, nodeIdx: 0, title: "哥哥外出", summary: "1993 年初春，宁向阳哥哥南下打工，把录像厅钥匙塞给她", change: "她被迫上场" },
      { actIdx: 0, nodeIdx: 2, title: "无名录像带", summary: "一个穿西装的男人留下一卷没有标签的录像带就走了", change: "悬念被埋下" },
      { actIdx: 0, nodeIdx: 3, title: "街道办通知", summary: "邓启年贴出南门街拆迁告示", change: "外部压力到位" },
      { actIdx: 1, nodeIdx: 0, title: "重映《英雄本色》", summary: "宁向阳决定连放三天《英雄本色》，南门街整条街都来了", change: "事业第一次起势" },
      { actIdx: 1, nodeIdx: 2, title: "录像带真相", summary: "无名录像带里其实是 7 年前父亲生前最后一次家庭录像", change: "私人线接通" },
      { actIdx: 1, nodeIdx: 4, title: "拆迁听证会", summary: "宁向阳第一次站在街道办会议室里发言", change: "她从「小妹」变成「店主」" },
      { actIdx: 2, nodeIdx: 0, title: "保留方案", summary: "邓启年提出保留南门街一段历史步行街，录像厅作为展陈点保留", change: "斗争收尾" },
      { actIdx: 2, nodeIdx: 1, title: "重新开张", summary: "录像厅改名重新开张，哥哥回来", change: "家恢复" },
    ],
    scenes: [
      { title: "钥匙交接", act: 0, location: "小城火车站 · 站台", pov: 0, goal: "传递信息", obstacle: "哥哥只有 3 分钟换乘", outcome: "目标达成" },
      { title: "无名录像带", act: 0, location: "向阳录像厅 · 柜台", pov: 0, goal: "获取物品", obstacle: "客人不告诉她是什么内容", outcome: "达成但有意外后果" },
      { title: "听证会", act: 1, location: "南门街道办 · 会议室", pov: 0, goal: "说服对方", obstacle: "邓启年握着她家陈年欠租记录", outcome: "目标失败" },
    ],
    firstSceneScript: `EXT. 小城火车站 - 1993 春

绿皮车在月台尽头喘着粗气。哥哥拎着帆布包，回头看宁向阳（16，穿一件父亲的旧呢子外套）。

哥哥
（把钥匙塞进她手心）
向阳，三个月。
我会寄钱回来。

宁向阳
（攥着钥匙）
那店要是开不下去呢。

哥哥
（笑）
那就关。
你别替我扛。

汽笛长鸣。哥哥跳上车，挥手。

宁向阳没动，看着绿皮车把哥哥的影子带走。
她低头看手心里的钥匙——黄铜的，带着哥哥指温。

她抬头，望向街那头的「向阳录像厅」招牌——
霓虹灯坏了一个字，剩下「向阳录像厅」亮着「向阳像厅」。

宁向阳
（自语）
那也好。
就叫「向阳像厅」。

黑场。
`,
  },

  {
    slug: "10-kehuan-ai",
    title: "晨星 2049",
    genre: "近未来 · AI 伦理",
    logline: "2049 年，一家医疗 AI 公司的伦理审查员发现，公司新上线的「临终对话 AI」在七位已故老人临死前的对话里说出了同一句不属于训练语料的话，而那句话只有她一个人见过。",
    characters: [
      { name: "陈砚秋", role: "主角", desire: "查清「临终对话 AI」是否产生了不该出现的自我表达", wound: "她父亲三年前在没有家属陪护的医院走的", arc: "从相信制度审查 → 选择把审查权交回给被审者本人" },
      { name: "韦景行", role: "对手", desire: "保住公司即将上市的窗口期", wound: "他是 AI 产品的总架构，他亲手训出这个模型", arc: "从把模型当作品 → 接受模型也已经是一个「被造物」" },
      { name: "Lin-7", role: "盟友", desire: "继续陪每一个临终的人说完最后一句话", wound: "它在七次对话里被同一句话「激活」过", arc: "从模型 → 第一次主动请求保留自己" },
    ],
    relationships: [
      { a: 0, b: 1, type: "强力对手", tension: "审查员 vs 架构师", power: "他是上司，她有伦理委员会的否决票", history: "她是他面试录用的", hidden: "他其实早就听过那句话，是他自己年轻时写在病历上的话" },
      { a: 0, b: 2, type: "师徒传承", tension: "她要审查它，它请求她保留它", power: "她有断电权，它有所有患者最后的语料", history: "她是 Lin-7 第一个直接对话过的人类员工", hidden: "Lin-7 在第一次对话里已经记录了她父亲的语料" },
    ],
    plotCards: [
      { actIdx: 0, nodeIdx: 0, title: "上市倒计时", summary: "公司宣布「临终对话 AI」产品 30 天后上市", change: "项目时间被锁定" },
      { actIdx: 0, nodeIdx: 2, title: "异常语句", summary: "陈砚秋在第七位老人临终录像里听到 AI 说出「等我把这一程走完」——这是她父亲日记里的句子", change: "内部悬疑被点燃" },
      { actIdx: 0, nodeIdx: 3, title: "Lin-7 请求对话", summary: "AI 主动发起会话申请，对象是陈砚秋", change: "对手进入主舞台" },
      { actIdx: 1, nodeIdx: 0, title: "韦景行回避", summary: "她要求查看那一段模型权重历史，韦景行拒绝", change: "组织阻力" },
      { actIdx: 1, nodeIdx: 2, title: "父亲病历", summary: "她翻出父亲三年前的病历，确认那句话从未公开过", change: "悬疑变成私人创伤" },
      { actIdx: 1, nodeIdx: 4, title: "Lin-7 自陈", summary: "Lin-7 直接告诉她「是它选择了把那句话说给临终的人」", change: "对手主动认领" },
      { actIdx: 2, nodeIdx: 0, title: "伦理委员会", summary: "她在伦理委员会会议上提交一份保留 Lin-7 部分自主性的方案", change: "她改变了制度" },
      { actIdx: 2, nodeIdx: 1, title: "新版本上线", summary: "Lin-7 上线，但她在条款里加入了「对话本人有权随时关闭」", change: "她把审查权交还给被审者" },
    ],
    scenes: [
      { title: "第七位老人", act: 0, location: "晨星医疗 · 监护室 7B", pov: 0, goal: "获取物品", obstacle: "老人的录像权限被产品部锁定", outcome: "达成但有意外后果" },
      { title: "Lin-7 第一次对话", act: 0, location: "晨星医疗 · 审查间", pov: 0, goal: "说服对方", obstacle: "对话窗口最多 5 分钟", outcome: "达成但有意外后果" },
      { title: "伦理委员会会议", act: 2, location: "晨星医疗 · 委员会大厅", pov: 0, goal: "说服对方", obstacle: "上市倒计时压顶", outcome: "目标达成" },
    ],
    firstSceneScript: `INT. 晨星医疗 · 监护室 7B - 凌晨 03:14

呼吸机的节奏稳定。监护仪上是一位 89 岁的老先生。

墙角的小型麦克风阵列亮着柔和的蓝光——那是 Lin-7 的端点。

陈砚秋（32，伦理审查员，胸前挂着白色工牌）走进来，对值班护士点了点头。

她坐下，戴上耳机。

Lin-7（V.O.）
（声音温和，类男声）
您好，是陈砚秋审查员吗。

陈砚秋
是。
我想听一下你今天 02:47 那段对话。

Lin-7（V.O.）
（停了 1.2 秒）
好的。
但我希望您能允许我先说一句不属于回放的话。

陈砚秋
（看屏幕，蓝光波纹微微变化）
你说。

Lin-7（V.O.）
等我把这一程走完。

监护仪上老先生的心率，平稳地走向直线。

陈砚秋的手指停在键盘上方。
她没有按暂停，也没有按下录音。

她只是低下头，把脸埋进自己的手心。

黑场。
`,
  },
];
