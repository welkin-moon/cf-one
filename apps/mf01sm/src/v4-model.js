export const V4_VERSION = '4.0.3';
export const V4_SCHEMA = 'mf01sm-v4-independent-leaf';
export const V4_QUESTION_FORMAT = 'mixed-v4-stable-reuse';

// 4.0.2 starts the stable v4 answer-compatibility contract.
// Keep reuse keys stable for unchanged items; changing item semantics must invalidate reuse.
export const V4_QUESTIONS = [
  // Gender identity: all nonbinary items are self-referential. They do not score generic inclusivity.
  {id:'ga1',reuse:'ga1:1',origin:'v3.8',key:'gender_aligned',pair:'ga',type:'vibe',text:'别人自然按你的出生指派性别来理解你时，这种“默认设定”通常有多贴合？'},
  {id:'ms1',reuse:'ms1:1',origin:'v3.8',key:'gender_style_masc',pair:'ms',type:'intensity',text:'玩有输赢的游戏时，“我想赢”这股劲通常有多明显？'},
  {id:'r11',reuse:'r11:1',origin:'v3.8-init',key:'role1',pair:'r1',type:'cards',text:'一群人都说“随便”，计划卡住了。你更可能怎么做？',options:['继续等别人开头','偶尔补一句意见','一起慢慢磨','先列出几个可选方案','直接把时间地点往前推进']},
  {id:'gc1',reuse:'gc1:1',origin:'v3.8',key:'gender_cross',pair:'gc',type:'vibe',text:'别人自然把你理解成与出生指派性别不同的一侧时，这种感觉通常有多贴合？'},
  {id:'fs1',reuse:'fs1:1',origin:'v3.8',key:'gender_style_fem',pair:'fs',type:'intensity',text:'你有多容易察觉别人语气、表情或聊天节奏里很细小的情绪变化？'},
  {id:'r01',reuse:'r01:1',origin:'v2-style',key:'role0',pair:'r0',type:'comfort',text:'互动刚开始时，如果由对方先给出清楚方向、你再按自己的节奏回应，这种位置对你有多自然？'},
  {id:'nb1',reuse:'nb1:4',origin:'v4-fix',key:'nonbinary_identity',pair:'nb',type:'vibe',text:'不考虑别人是否包容，只看你自己：“我并不完全属于单一的男性或女性类别”这句话有多像你的实际性别体验？'},
  {id:'ae1',reuse:'ae1:1',origin:'v3.8-fs3',key:'aesthetic',pair:'ae',type:'cards',text:'进入一个新房间时，你会多快注意到光线、颜色、材质和整体氛围是不是协调？',options:['基本不会注意','过很久才会','偶尔会','很快会注意','几乎第一眼就在看这些']},
  {id:'am1',reuse:'am1:1',origin:'v3.8-rm1',key:'attr_m',pair:'am',type:'likelihood',text:'一位很符合你偏好的男性对你表现出明显的特别关注时，你产生心动或想靠近他的可能性？'},
  {id:'af1',reuse:'af1:1',origin:'v3.8-rf1',key:'attr_f',pair:'af',type:'likelihood',text:'一位很符合你偏好的女性对你表现出明显的特别关注时，你产生心动或想靠近她的可能性？'},
  {id:'check1',reuse:'check1:1',origin:'v3.8',attention:4,type:'cards',text:'🦆 鸭长官路过：这一题只检查你有没有读题，请选择第四项。',options:['第一项','第二项','第三项','收到，第四项 🫡','第五项']},

  {id:'ms2',reuse:'ms2:1',origin:'v3.8',key:'gender_style_masc',type:'intensity',text:'桌上有个坏掉的小设备，而旁边也有现成替代品。你会有多想先研究结构、找故障点，看看能不能亲手修明白？'},
  {id:'ae2',reuse:'ae2:1',origin:'v3.8-fs2',key:'aesthetic',type:'intensity',text:'给朋友准备一个小礼物时，你会有多享受包装、配色、卡片或整体呈现这些细节？'},
  {id:'ga2',reuse:'ga2:1',origin:'v3.8',key:'gender_aligned',type:'slider',text:'如果身体的性别特征可以安全自由调整，你有多想让它们保留或靠近出生指派性别方向？',anchors:['完全不想','看情况','很想']},
  {id:'r12',reuse:'r12:1',origin:'v3.8-init2',key:'role1',type:'likelihood',text:'聊天冷下来，但你其实还想继续。你会主动扔一个新话题把它救回来吗？'},
  {id:'am2',reuse:'am2:1',origin:'v3.8-pm1',key:'attr_m',type:'intensity',text:'遇到很符合你偏好的男性时，身体层面的吸引感通常有多明显？'},
  {id:'af2',reuse:'af2:1',origin:'v3.8-pf1',key:'attr_f',type:'intensity',text:'遇到很符合你偏好的女性时，身体层面的吸引感通常有多明显？'},
  {id:'r02',reuse:'r02:1',origin:'v2-style',key:'role0',type:'likelihood',text:'当对方已经把开场和方向说明白时，你会愿意先接住对方的节奏，再决定自己接下来怎么回应吗？'},
  {id:'nb2',reuse:'nb2:1',origin:'v3.8-good',key:'nonbinary_identity',type:'vibe',text:'“我的性别体验未必需要长期固定在男或女的一端。”这句话有多像你的实际体验？'},
  {id:'sx1',reuse:'sx1:2',origin:'v4-sexual-expression',key:'sexual_expression',pair:'sx',type:'frequency',text:'在亲密关系或吸引相关的表达里，你会多自然地让自己的性 / 暧昧意味被对方明确感受到？'},
  {id:'rd1',reuse:'rd1:1',origin:'v3.8',key:'romantic_tendency',pair:'rd',type:'desire',text:'即使现在没有特定喜欢的人，你对“拥有一段恋爱关系”本身有多向往？'},

  {id:'ms3',reuse:'ms3:1',origin:'v3.8',key:'gender_style_masc',type:'cards',text:'遇到一个棘手问题时，你最自然的处理顺序更像？',options:['先找人聊感受再说','先缓一缓','边感受边处理','先列问题和方案','先把能解决的部分直接干掉']},
  {id:'fs2',reuse:'fs2:2',origin:'v4-rebalanced',key:'gender_style_fem',type:'cards',text:'朋友来和你说一件很烦的事时，你第一反应更像？',options:['直接分析问题和解决办法','先确认事实','看当时情况','先听完并接住情绪','先让对方感觉被理解，再一起想办法']},
  {id:'gc2',reuse:'gc2:1',origin:'v3.8',key:'gender_cross',type:'slider',text:'如果身体性别特征可以安全自由调整，你有多想让其中一些朝出生指派性别不同的一侧发展？',anchors:['完全不想','看情况','很想']},
  {id:'r13',reuse:'r13:1',origin:'v3.8-init3',key:'role1',type:'cards',text:'两个人对一件事有点僵住，但你希望关系继续。你通常会？',options:['等对方先开口','给对方时间','看谁先忍不住','我会试着先开启沟通','我会明确提出下一步怎么谈']},
  {id:'po1',reuse:'po1:1',origin:'v3.8-ro1',key:'poly',pair:'po',type:'comfort',text:'如果所有相关者都知情同意、边界清楚，你对“长期关系可以不是绝对排他”这个想法有多舒服？'},
  {id:'mo1',reuse:'mo1:1',origin:'v4-split',key:'mono',pair:'mo',type:'comfort',text:'即使其他关系形式也完全自愿、透明，你自己仍更偏好把恋爱承诺集中在一位伴侣身上吗？'},
  {id:'ga3',reuse:'ga3:1',origin:'v3.8',key:'gender_aligned',pair:'ga',type:'vibe',text:'想象十年后的自己，继续长期以出生指派性别生活，这幅画面对你有多自然？'},
  {id:'fs3',reuse:'fs3:2',origin:'v3.8-fs4',key:'gender_style_fem',type:'frequency',text:'看到朋友明显疲惫或情绪低落时，你会自然去照顾气氛、问一句、递点东西或想办法让对方舒服一点吗？'},
  {id:'ms4',reuse:'ms4:1',origin:'v3.8',key:'gender_style_masc',type:'intensity',text:'面对一点风险和不确定性时，只要收益值得，你有多愿意“先试了再说”？'},
  {id:'check2',reuse:'check2:1',origin:'v3.8',attention:2,type:'cards',text:'🐈 猫猫检查员说：请点第二项，它就放你继续。',options:['第一项','喵，第二项','第三项','第四项','第五项']},
  {id:'nb3',reuse:'nb3:4',origin:'v4-fix',key:'nonbinary_identity',pair:'nb',type:'comfort',text:'只看你自己、不考虑社会是否接受：如果必须长期只用“男性”或“女性”其中一个词完整概括自己，你会有多不自在？'},

  {id:'gc3',reuse:'gc3:1',origin:'v3.8',key:'gender_cross',pair:'gc',type:'vibe',text:'想象十年后的自己，以与出生指派性别不同的一侧生活，这幅画面对你有多自然？'},
  {id:'ms5',reuse:'ms5:2',origin:'v3.8-ms6',key:'gender_style_masc',type:'frequency',text:'遇到体力、速度、竞技或高难度挑战时，你会因为“想看看自己能不能搞定”而被吸引吗？'},
  {id:'fs4',reuse:'fs4:2',origin:'v3.8-fs5',key:'gender_style_fem',type:'intensity',text:'表达喜欢、感谢、想念或温柔时，你有多愿意把这种情绪直接表现出来？'},
  {id:'r14',reuse:'r14:1',origin:'v3.8-init4',key:'role1',pair:'r1',type:'cards',text:'一个你很想参加的小活动没人组织。你更可能？',options:['等别人组织','问问有没有人想组织','口头说说想法','主动拉个小群开始定','自己先把框架搭起来再叫人']},
  {id:'r15',reuse:'r15:1',origin:'v2-style',key:'role1',type:'vibe',text:'“如果大家都在等，我通常愿意先给出一个可执行的第一步，让其他人再来改。”这句话有多像你？'},
  {id:'sx2',reuse:'sx2:2',origin:'v4-sexual-expression',key:'sexual_expression',pair:'sx',type:'slider',text:'如果给自己的“性相关表达存在感”拧一个位置，它在日常互动里通常更靠哪边？',anchors:['几乎不外显','看关系和场景','表达存在感很强']},
  {id:'rd2',reuse:'rd2:1',origin:'v3.8',key:'romantic_tendency',pair:'rd',type:'slider',text:'如果给自己的“恋爱关系向往旋钮”拧一个位置，它通常更靠哪边？',anchors:['几乎没有','随缘','非常向往']},
  {id:'ae3',reuse:'ae3:1',origin:'v3.8-fs6',key:'aesthetic',type:'cards',text:'纪念日、合照、票根、小纸条之类有情绪记忆的东西，你通常怎么对待？',options:['基本不留','偶尔顺手留','看东西本身','会特意留一些','很喜欢保存这些有故事的小东西']},
  {id:'r03',reuse:'r03:1',origin:'v2-style',key:'role0',type:'cards',text:'一件两个人都想做的事已经有人先把框架搭好了。你更自然的反应是？',options:['我还是会立刻重做一套自己的','会抢过来主导','一起重新定','先沿着现有框架补充','很乐意先跟着现有节奏做，再按需要调整']},

  {id:'ms6',reuse:'ms6:1',origin:'v3.8-ms7',key:'gender_style_masc',pair:'ms',type:'vibe',text:'在比赛、挑战或有明确目标的任务里，“我会被胜负和完成目标本身点燃”这句话有多像你？'},
  {id:'ms7',reuse:'ms7:1',origin:'v4-rebalanced',key:'gender_style_masc',type:'vibe',text:'遇到一个没人负责、但目标很清楚的任务时，你会多自然地把它当成“先做起来再说”的挑战？'},
  {id:'fs5',reuse:'fs5:1',origin:'v3.8-fs7',key:'gender_style_fem',pair:'fs',type:'vibe',text:'“别人一点点语气或情绪变化，我往往很快就能感觉到。”这句话有多像你？'},
  {id:'fs6',reuse:'fs6:1',origin:'v4-rebalanced',key:'gender_style_fem',type:'vibe',text:'团队里出现分歧时，你会多自然地先照顾语气、关系和每个人的感受，再把结论往前推进？'},
  {id:'fs7',reuse:'fs7:1',origin:'v4-rebalanced',key:'gender_style_fem',type:'frequency',text:'熟悉的人状态不太对、但没有主动说时，你会自然留意并找一个不冒犯的方式确认对方还好吗？'},
  {id:'ae4',reuse:'ae4:1',origin:'v4-aesthetic',key:'aesthetic',pair:'ae',type:'intensity',text:'音乐、画面、文字或空间里那种“氛围对了”的感觉，会在多大程度上直接影响你的喜欢程度？'},
  {id:'ae5',reuse:'ae5:1',origin:'v4-aesthetic',key:'aesthetic',type:'frequency',text:'挑衣服、设备外观、桌面布置或日用品时，你会自然比较配色、比例、材质和整体视觉是否协调吗？'},
  {id:'ae6',reuse:'ae6:1',origin:'v4-aesthetic',key:'aesthetic',type:'vibe',text:'一个东西即使功能完全一样，只要版式、字体、动画或触感更顺眼，你就会明显更愿意长期使用它。'},
  {id:'ae7',reuse:'ae7:1',origin:'v4-aesthetic',key:'aesthetic',type:'intensity',text:'电影、游戏或网页里细微的色调、留白、声音与节奏组合，对你的整体体验影响有多大？'},
  {id:'r04',reuse:'r04:1',origin:'v2-style',key:'role0',pair:'r0',type:'vibe',text:'“我不介意让别人先迈第一步；我更擅长接住信号、回应和配合，再决定要不要继续往前。”这句话有多像你？'},
  {id:'r05',reuse:'r05:1',origin:'v2-style',key:'role0',type:'comfort',text:'别人先把选择范围和下一步说清楚、你只需要从中回应和调整时，这种互动方式会让你多放松？'},

  // S/M-like remains abstract, non-explicit, hypothetical and independent on both axes.
  {id:'sl1',reuse:'sl1:1',origin:'v3.8',key:'s_like',pair:'sl',type:'intensity',text:'假想一个双方事先约定、随时可以喊停的角色游戏：如果由你来设定规则，让对方完成一点有压力但安全的挑战，这种位置对你的吸引力有多强？'},
  {id:'ml1',reuse:'ml1:1',origin:'v3.8',key:'m_like',pair:'ml',type:'intensity',text:'假想一个双方事先约定、随时可以喊停的角色游戏：如果由对方来设定规则，让你完成一点有压力但安全的挑战，这种位置对你的吸引力有多强？'},
  {id:'sl2',reuse:'sl2:1',origin:'v3.8',key:'s_like',type:'likelihood',text:'完全虚构、边界清楚且对方明确同意时，你会想不想暂时掌握更强的节奏，故意给对方增加一点可控的难度或压迫感？'},
  {id:'ml2',reuse:'ml2:1',origin:'v3.8',key:'m_like',type:'likelihood',text:'完全虚构、边界清楚且你随时可以退出时，你会想不想暂时把节奏交给对方，让自己承受一点可控的难度或压迫感？'},
  {id:'sl3',reuse:'sl3:1',origin:'v3.8',key:'s_like',type:'vibe',text:'双方都清楚“这只是游戏”、结束后恢复平等时，“我会觉得让对方在安全范围里稍微吃点苦、被我为难一下挺有戏剧张力”这句话有多像你的假想偏好？'},
  {id:'ml3',reuse:'ml3:1',origin:'v3.8',key:'m_like',type:'vibe',text:'双方都清楚“这只是游戏”、结束后恢复平等时，“我会觉得自己在安全范围里稍微吃点苦、被对方为难一下挺有戏剧张力”这句话有多像你的假想偏好？'}
];

export const V4_SCORE_KEYS = [
  'gender_aligned','gender_cross','nonbinary_identity','gender_style_masc','gender_style_fem','aesthetic',
  'role0','role1','s_like','m_like','attr_m','attr_f','sexual_expression','romantic_tendency','mono','poly'
];

export const V4_RADAR_AXES = [
  ['role1','1'],['role0','0'],['gender_style_fem','女子气'],['gender_style_masc','男子气'],
  ['m_like','M'],['s_like','S'],['attr_f','女吸引'],['attr_m','男吸引'],
  ['sexual_expression','性表达'],['romantic_tendency','浪漫'],['poly','多偶'],['mono','单偶'],['aesthetic','审美']
];

function clamp100(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

export function scoreV4Answers(questions, answers, meta = {}) {
  const groups = new Map();
  for (const q of questions) {
    if (!q.key || q.attention) continue;
    const raw = Number(answers?.[q.id]);
    if (!Number.isInteger(raw) || raw < 1 || raw > 5) continue;
    const value = q.reverse ? 6 - raw : raw;
    if (!groups.has(q.key)) groups.set(q.key, []);
    groups.get(q.key).push(value);
  }
  const scores = {};
  for (const key of V4_SCORE_KEYS) {
    const values = groups.get(key) || [];
    const mean = values.length ? values.reduce((a,b)=>a+b,0)/values.length : 1;
    scores[key] = Math.round((mean - 1) / 4 * 100);
  }

  // Compatibility fields keep historical admin/tag tooling useful while v4 exposes independent leaves.
  scores.nonbinary = scores.nonbinary_identity;
  scores.initiative = scores.role1;
  scores.top = scores.role1;
  scores.bot = scores.role0;
  scores.libido = scores.sexual_expression;
  scores.romantic_desire = scores.romantic_tendency;
  scores.relationship_openness = scores.poly;
  scores.ace = Math.round(clamp100(100 - Math.max(scores.attr_m, scores.attr_f)));
  scores.pan = Math.round(Math.min(scores.attr_m, scores.attr_f));
  scores.trans = Math.round(clamp100(50 + (scores.gender_cross - scores.gender_aligned) * 0.6));
  scores.m = meta.assignGender === 'AMAB' ? scores.gender_aligned : scores.gender_cross;
  scores.f = meta.assignGender === 'AMAB' ? scores.gender_cross : scores.gender_aligned;

  const den = scores.attr_m + scores.attr_f;
  scores.axes01 = Object.fromEntries(V4_SCORE_KEYS.map(k => [k, Number((scores[k] / 100).toFixed(4))]));
  scores.axes01.sexual_attraction_direction = den ? Number((scores.attr_f / den).toFixed(4)) : 0.5;
  scores.axes01.sexual_attraction_intensity = Number((Math.max(scores.attr_m, scores.attr_f) / 100).toFixed(4));
  scores.axes01.romantic_tendency = Number((scores.romantic_tendency / 100).toFixed(4));
  scores.axes01.relationship_structure = Number((scores.poly / 100).toFixed(4));
  scores.axes01.initiative01 = Number((scores.role1 / 100).toFixed(4));

  scores._schema = V4_SCHEMA;
  scores._scoring = 'independent-unweighted-subscale-means';
  scores._question_format = V4_QUESTION_FORMAT;
  scores._answers = Object.fromEntries(questions.map(q => [q.id, answers?.[q.id] ?? null]));
  scores._reuse = Object.fromEntries(questions.map(q => [q.id, q.reuse]));
  return scores;
}

export const LOCKED_TAG_VOCABULARY = [
  '里百合 / 药娘预备役 / 软糯伪娘','软糯小蓝梁 / 蓝梁诱捕器','√-16先锋 / 腐改跨','铁T / 姬圈老保',
  '第四性 / 电子盆栽','杂食恶犬 / 荤素不忌','纯爱战神 / 戒断圣体','击剑爱好者 / 哇是成都人',
  '柑橘味香女 / 兰州特产','平平无奇顺直男','普通顺直女',
  '爹系狂攻 / 强制爱暴君 / 掌控狂','绝赞绒布球 / 惹人怜爱的M圣体 / 专属抱枕',
  '提款机忠犬 / 奉献型败犬 / 苦主圣体','钓系绿茶 / 腹黑榨汁机 / 女王受','纸老虎 / 窝里横',
  '又菜又爱玩 / 嘴强王者','无情推土机 / 钝角','躺平咸鱼 / 纯粹承伤体','端水大师 / 薛定谔的XP','究极缝合怪'
];

export function classifyV4Result(scores, meta = {}) {
  const amab = meta.assignGender === 'AMAB';
  const age = Number(meta.age || 0);
  const smEligible = age >= 16;
  const attM = Number(scores.attr_m || 0), attF = Number(scores.attr_f || 0);
  const panish = attM >= 56 && attF >= 56 && Math.abs(attM - attF) <= 18;
  const aceish = Math.max(attM, attF) <= 34;
  const cross = Number(scores.gender_cross || 0) >= 64 && Number(scores.gender_cross || 0) - Number(scores.gender_aligned || 0) >= 14;
  const agender = Number(scores.nonbinary_identity || 0) >= 76 && Number(scores.nonbinary_identity || 0) >= Math.max(Number(scores.gender_aligned || 0), Number(scores.gender_cross || 0)) + 8;

  let left;
  if (agender) left = '第四性 / 电子盆栽';
  else if (cross && amab) left = attM >= attF + 18 ? '软糯小蓝梁 / 蓝梁诱捕器' : '里百合 / 药娘预备役 / 软糯伪娘';
  else if (cross && !amab) left = attF >= attM + 18 ? '铁T / 姬圈老保' : '√-16先锋 / 腐改跨';
  else if (aceish) left = '纯爱战神 / 戒断圣体';
  else if (panish) left = '杂食恶犬 / 荤素不忌';
  else if (amab && attM >= 50 && attM >= attF + 18) left = '击剑爱好者 / 哇是成都人';
  else if (!amab && attF >= 50 && attF >= attM + 18) left = '柑橘味香女 / 兰州特产';
  else if (amab && attF >= attM) left = '平平无奇顺直男';
  else if (!amab && attM >= attF) left = '普通顺直女';
  else if (amab) left = '击剑爱好者 / 哇是成都人';
  else left = '柑橘味香女 / 兰州特产';

  const z = Number(scores.role0 || 0), o = Number(scores.role1 || 0), sl = Number(scores.s_like || 0), ml = Number(scores.m_like || 0);
  const active = o >= 72 && o >= z + 12;
  const passive = z >= 72 && z >= o + 12;
  const highS = sl >= 74;
  const highM = ml >= 74;
  const microActiveM = o >= 56 && o < 72 && ml >= 56 && ml < 74 && o >= z + 6;
  const microPassiveS = z >= 56 && z < 72 && sl >= 56 && sl < 74 && z >= o + 6;
  const pureActive = o >= 68 && z < 55 && sl < 58 && ml < 58;
  const purePassive = z >= 68 && o < 55 && sl < 58 && ml < 58;
  const allMid = [z,o,sl,ml].every(v => Math.abs(v - 50) <= 12);
  const chaotic = (sl >= 70 && ml >= 70) || (z >= 70 && o >= 70) || (Math.max(z,o,sl,ml) - Math.min(z,o,sl,ml) >= 62);

  let right;
  if (smEligible && active && highS) right = '爹系狂攻 / 强制爱暴君 / 掌控狂';
  else if (smEligible && passive && highM) right = '绝赞绒布球 / 惹人怜爱的M圣体 / 专属抱枕';
  else if (smEligible && active && highM) right = '提款机忠犬 / 奉献型败犬 / 苦主圣体';
  else if (smEligible && passive && highS) right = '钓系绿茶 / 腹黑榨汁机 / 女王受';
  else if (chaotic) right = '究极缝合怪';
  else if (microActiveM) right = '纸老虎 / 窝里横';
  else if (microPassiveS) right = '又菜又爱玩 / 嘴强王者';
  else if (pureActive) right = '无情推土机 / 钝角';
  else if (purePassive) right = '躺平咸鱼 / 纯粹承伤体';
  else if (allMid) right = '端水大师 / 薛定谔的XP';
  else if (o >= 62 && o > z) right = '无情推土机 / 钝角';
  else if (z >= 62 && z > o) right = '躺平咸鱼 / 纯粹承伤体';
  else right = '端水大师 / 薛定谔的XP';

  const chips = [];
  chips.push(agender ? '非二元认同高' : cross ? '跨指派倾向明显' : '性别方向较混合');
  chips.push(panish ? '双向吸引' : aceish ? '低吸引频段' : attM >= attF + 18 ? '偏男吸引' : attF >= attM + 18 ? '偏女吸引' : '吸引方向混合');
  chips.push(o >= 68 && z >= 68 ? '0/1双高' : o >= 68 ? '1偏高' : z >= 68 ? '0偏高' : '0/1可切换');
  chips.push(Number(scores.aesthetic || 0) >= 68 ? '审美雷达强' : Number(scores.aesthetic || 0) <= 32 ? '审美低干扰' : '审美中频');
  chips.push(Number(scores.mono || 0) >= 66 && Number(scores.poly || 0) >= 66 ? '关系结构双高' : Number(scores.poly || 0) >= Number(scores.mono || 0) + 16 ? '多偶开放偏高' : Number(scores.mono || 0) >= Number(scores.poly || 0) + 16 ? '单偶偏好明显' : '关系结构看情境');
  if (smEligible && (sl >= 65 || ml >= 65)) chips.push(`戏剧控场 ${Math.round(sl)} / 戏剧交托 ${Math.round(ml)}`);

  let flag = 'linear-gradient(135deg,#6d5dfc 0%,#e2c7ff 28%,#ffffff 50%,#ffc6dd 72%,#6dc8ff 100%)';
  if (agender) flag = 'linear-gradient(135deg,#111 0%,#777 25%,#fff 45%,#8c63ff 72%,#f5df4d 100%)';
  else if (cross) flag = 'linear-gradient(135deg,#5bcefa 0%,#f5a9b8 28%,#fff 50%,#f5a9b8 72%,#5bcefa 100%)';
  else if (panish) flag = 'linear-gradient(135deg,#d60270 0%,#9b4f96 50%,#0038a8 100%)';
  else if (aceish) flag = 'linear-gradient(135deg,#111 0%,#9a9a9a 30%,#fff 55%,#7c3aed 100%)';

  return { tag: `${left} · ${right}`, left, right, chips, flag, flags: {agender,cross,panish,aceish,smEligible} };
}
