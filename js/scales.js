/*
 * scales.js —— 量表定义与计分引擎
 *
 * 全部维度、条目、锚点、划界分均取自公开发表的标准化自评量表：
 *   PHQ-9  抑郁      Kroenke et al., 2001
 *   GAD-7  焦虑      Spitzer et al., 2006
 *   ASRM   躁狂      Altman et al., 1997（5 条核心条目简版）
 *   MDQ    双相      Hirschfeld et al., 2000
 *   ISI    睡眠      Bastien et al., 2001
 *   PQ-16  精神病性  Ising et al., 2012
 *
 * 本文件不含 DOM 逻辑，计分函数均为纯函数，便于复核。
 * 全局导出：SCALES、TOTAL_ITEMS、computeAll。
 */
(function (global) {
  'use strict';

  /* ---------- 通用选项组 ---------- */

  // PHQ-9 / GAD-7 同用的频率锚点（过去 2 周内）
  var FREQ_0_3 = [
    { value: 0, label: '完全没有' },
    { value: 1, label: '有几天' },
    { value: 2, label: '一半以上天数' },
    { value: 3, label: '几乎每天' }
  ];

  // 是 / 否二选项
  var YES_NO = [
    { value: 1, label: '是' },
    { value: 0, label: '否' }
  ];

  // ISI 严重程度锚点（0 无 ~ 4 非常严重）
  var ISI_STEPS = [
    { value: 0, label: '无' },
    { value: 1, label: '轻微' },
    { value: 2, label: '中等' },
    { value: 3, label: '相当严重' },
    { value: 4, label: '非常严重' }
  ];

  // PQ-16 痛苦程度锚点
  var DISTRESS_0_3 = [
    { value: 0, label: '无痛苦' },
    { value: 1, label: '轻度' },
    { value: 2, label: '中度' },
    { value: 3, label: '重度' }
  ];

  /* ---------- 维度定义 ---------- */

  var SCALES = [
    {
      id: 'phq9',
      name: '抑郁',
      source: 'PHQ-9 患者健康问卷抑郁量表',
      icon: 'cloud',
      timeWindow: '最近两周内',
      max: 27,
      note: 'PHQ-9 为综合医院与社区最常用抑郁筛查工具，中文版信效度良好（α=0.82–0.91）。',
      options: FREQ_0_3,
      items: [
        '做事时提不起劲或没有兴趣',
        '感到心情低落、沮丧或绝望',
        '入睡困难、睡不安稳或睡眠过多',
        '感觉疲倦或没有活力',
        '食欲不振或吃太多',
        '觉得自己很糟，或觉得自己很失败，或让自己、家人失望',
        '对事物专注有困难，例如阅读报纸或看电视时',
        '动作或说话速度缓慢到别人已经察觉，或正好相反——烦躁或坐立不安、动来动去的情况更胜于平常',
        '有不如死掉或用某种方式伤害自己的念头'
      ],
      // 第 9 条为自伤/自杀条目，任一得分 > 0 需即时安全提示
      safetyItemIndex: 8,
      bands: [
        { max: 4, level: '正常范围', tone: 'positive', desc: '无明显抑郁症状，或仅极轻微。' },
        { max: 9, level: '轻度抑郁症状', tone: 'caution', desc: '建议规律作息、增加社会活动与运动，并持续自我观察。' },
        { max: 14, level: '中度抑郁症状', tone: 'caution', desc: '建议寻求心理科/精神科专业人员评估，考虑心理干预。' },
        { max: 19, level: '中重度抑郁症状', tone: 'alert', desc: '强烈建议尽快前往精神科或临床心理门诊接受评估。' },
        { max: 27, level: '重度抑郁症状', tone: 'alert', desc: '请尽快由精神科专业医师评估与干预，不宜独自等待。' }
      ],
      ref: 'Kroenke K, Spitzer RL, Williams JBW. J Gen Intern Med. 2001;16(9):606-613.'
    },

    {
      id: 'gad7',
      name: '焦虑',
      source: 'GAD-7 广泛性焦虑障碍量表',
      icon: 'wind',
      timeWindow: '最近两周内',
      max: 21,
      note: 'GAD-7 为国际通用的焦虑症状自评量表，5、10、15 分分别为轻、中、重度分界值。',
      options: FREQ_0_3,
      items: [
        '感觉紧张、焦虑或急切',
        '不能停止或控制担忧',
        '对各种各样的事情担忧过多',
        '很难放松下来',
        '由于不安而无法静坐',
        '变得容易烦恼或急躁',
        '感到似乎将有可怕的事情发生而害怕'
      ],
      bands: [
        { max: 4, level: '正常范围', tone: 'positive', desc: '无明显焦虑症状。' },
        { max: 9, level: '轻度焦虑症状', tone: 'caution', desc: '可通过呼吸训练、规律运动与作息调整缓解，继续观察。' },
        { max: 14, level: '中度焦虑症状', tone: 'caution', desc: '建议接受专业评估，明确是否需要心理治疗。' },
        { max: 21, level: '重度焦虑症状', tone: 'alert', desc: '建议尽快至精神科/临床心理门诊评估与干预。' }
      ],
      ref: 'Spitzer RL, Kroenke K, Williams JBW, Löwe B. Arch Intern Med. 2006;166(10):1092-1097.'
    },

    {
      id: 'asrm',
      name: '躁狂',
      source: 'ASRM 阿尔泰躁狂量表（5 条核心条目简版）',
      icon: 'flame',
      timeWindow: '最近一周内',
      max: 20,
      note: '取 ASRM 5 项核心他评/自评条目（心境高涨、自大、睡眠需求减少、言语增多、活动增多），每条 0–4 级锚定。',
      items: [
        {
          text: '心境高涨（比平时更愉快、开朗、兴奋）',
          options: [
            { value: 0, label: '我不觉得比平时更愉快或开朗' },
            { value: 1, label: '大部分时间比平时更愉快或开朗' },
            { value: 2, label: '几乎一直比平时更愉快或开朗' },
            { value: 3, label: '我一直比平时更愉快或开朗' },
            { value: 4, label: '我极度愉快或兴奋，已无法控制自己的情绪' }
          ]
        },
        {
          text: '自信心（自我评价）',
          options: [
            { value: 0, label: '我和平时一样看待自己' },
            { value: 1, label: '我比平时更自信' },
            { value: 2, label: '我一直感到比平时更自信' },
            { value: 3, label: '我感到自己有能力或价值明显高于一般人' },
            { value: 4, label: '我相信自己拥有非凡或特殊的能力与价值' }
          ]
        },
        {
          text: '睡眠需求减少',
          options: [
            { value: 0, label: '我不需要比平时睡得少' },
            { value: 1, label: '我比平时睡得少一些，但翌日仍感到疲倦' },
            { value: 2, label: '我比平时睡得少，翌日不觉疲倦' },
            { value: 3, label: '我比平时少睡很多，也不觉得疲倦' },
            { value: 4, label: '我可以整日整夜不睡而毫不觉得疲倦' }
          ]
        },
        {
          text: '言语与思维速度',
          options: [
            { value: 0, label: '我的思维与谈话速度与平时一样' },
            { value: 1, label: '与平时相比有些加快' },
            { value: 2, label: '明显加快，难以打断' },
            { value: 3, label: '持续加快，他人难以跟上' },
            { value: 4, label: '言语多到无法控制' }
          ]
        },
        {
          text: '活动与精力增多',
          options: [
            { value: 0, label: '我的活动量与精力和平时一样' },
            { value: 1, label: '有些增多，能保持控制' },
            { value: 2, label: '明显增多，频繁改变计划或目标' },
            { value: 3, label: '持续增多，难以保持控制' },
            { value: 4, label: '活动量已失控' }
          ]
        }
      ],
      bands: [
        { max: 5, level: '无明显躁狂症状', tone: 'positive', desc: '未见提示躁狂/轻躁狂的症状群。' },
        { max: 10, level: '轻度躁狂症状可能', tone: 'caution', desc: 'ASRM 简版总分 ≥ 6 常提示轻躁狂/躁狂可能，建议结合情绪波动史自我观察。' },
        { max: 20, level: '中重度躁狂症状可能', tone: 'alert', desc: '建议尽快至精神科评估，尤其在已出现冲动消费、少睡不疲、言行失控时。' }
      ],
      ref: 'Altman E, Hedeker D, Peterson JL, Davis JM. Biol Psychiatry. 1997;42(10):948-955.'
    },

    {
      id: 'mdq',
      name: '双相情感障碍',
      source: 'MDQ 心境障碍问卷（第 1 部分 + 发作同步性 + 功能受损）',
      icon: 'waves',
      timeWindow: '一生中某段时间（该段时间内症状同时出现）',
      type: 'mdq',
      max: 13,
      note: 'MDQ 为双相谱系障碍筛查工具。筛查阳性需同时满足三条：症状条目 ≥ 7 项、“曾同时出现”、且造成中度及以上问题。',
      items: [
        '我感到情绪非常高涨或高兴，别人认为我与平时不同，或我因为过度兴奋而惹出麻烦',
        '我容易发怒，以至大声斥责别人，或与人争吵、打架',
        '我感到比平时更自信',
        '我比平时睡得少，而且醒来仍不觉得疲倦',
        '我比平时更健谈，或说话速度比平时快，别人也提到这一点',
        '我的想法一个接一个不断涌现，或思路从一个念头跳到另一个念头',
        '我比平时更容易分心，很难把注意力集中在一件事上',
        '我比平时精力更旺盛，活动明显增多',
        '我比平时更爱交际、更外向，例如主动找人聊天、参加平时不会参加的聚会',
        '我同时开始了许多计划或项目，而别人认为这些计划过多、不智或与我的能力不相称',
        '我做出别人认为过分、不合身份或令人尴尬的事，例如花钱无度、投资轻率、性行为轻率',
        '我做出对自己或他人有危险的行为，例如毫无顾忌地超速驾驶、鲁莽开车',
        '别人说我表现与平时不同，或说我当时的行为可能伤害了自己或他人'
      ],
      options: YES_NO,
      cluster: {
        id: 'mdq_cluster',
        text: '这些症状是否曾经在同一时期内同时出现过？',
        options: YES_NO
      },
      impairment: {
        id: 'mdq_impairment',
        text: '这类情况对您造成的问题严重程度如何？',
        options: [
          { value: 0, label: '没有问题' },
          { value: 1, label: '轻微问题' },
          { value: 2, label: '中度问题' },
          { value: 3, label: '严重问题' }
        ]
      },
      ref: 'Hirschfeld RMA, Williams JBW, Spitzer RL, et al. Am J Psychiatry. 2000;157(11):1873-1875.'
    },

    {
      id: 'isi',
      name: '睡眠障碍',
      source: 'ISI 失眠严重程度指数量表',
      icon: 'moon',
      timeWindow: '最近两周内',
      max: 28,
      note: 'ISI 为失眠严重程度金标准自评量表，7 条目 0–4 计分，总分 0–28。',
      options: ISI_STEPS,
      items: [
        { text: '入睡困难（上床后难以入睡）的程度', lowLabel: '无', highLabel: '非常严重' },
        { text: '维持睡眠困难（夜间易醒、醒后难以再入睡）的程度', lowLabel: '无', highLabel: '非常严重' },
        { text: '早醒（比期望时间过早醒来）的程度', lowLabel: '无', highLabel: '非常严重' },
        { text: '您对目前睡眠状况的“不满意/困扰”程度', lowLabel: '非常满意', highLabel: '非常不满意' },
        { text: '您的睡眠问题对“日常功能”的影响程度（疲倦、注意力、情绪、做事效率等）', lowLabel: '没有影响', highLabel: '非常严重影响' },
        { text: '别人（家人、朋友、同事）在多大程度上“注意到”您的睡眠问题正在损害您的生活质量或外表状态', lowLabel: '完全没有注意到', highLabel: '非常强烈地注意到' },
        { text: '您对目前睡眠问题感到“担忧/苦恼”的程度', lowLabel: '完全没有', highLabel: '非常强烈' }
      ],
      bands: [
        { max: 7, level: '无临床意义的失眠', tone: 'positive', desc: '睡眠状况在正常范围内。' },
        { max: 14, level: '亚临床失眠', tone: 'caution', desc: '存在轻度失眠，建议固定作息、限制睡前屏幕与咖啡因。' },
        { max: 21, level: '中度临床失眠', tone: 'caution', desc: '建议接受专业评估，失眠认知行为治疗（CBT-I）为一线干预。' },
        { max: 28, level: '重度临床失眠', tone: 'alert', desc: '建议尽快至睡眠门诊或精神心理科评估与干预。' }
      ],
      ref: 'Bastien CH, Vallières A, Morin CM. Sleep Med. 2001;2(4):297-307.'
    },

    {
      id: 'pq16',
      name: '精神分裂症（精神病性风险）',
      source: 'PQ-16 前驱期症状问卷 16 项版',
      icon: 'fingerprint',
      timeWindow: '最近一年内的主观体验',
      type: 'pq16',
      max: 16,
      distressMax: 48,
      note: 'PQ-16 用于精神病性症状风险筛查。症状分 = 答“是”的条目数；痛苦分 = 每个答“是”条目的痛苦程度（0–3）之和。',
      items: [
        { text: '我对以前喜欢的事情提不起兴趣？', cluster: '阴性症状' },
        { text: '我常常感觉像以前发生过的事情一模一样地再次经历（似曾相识）？', cluster: '知觉体验' },
        { text: '我有时会闻到或尝到别人闻不到、尝不到的气味或味道？', cluster: '幻觉体验' },
        { text: '我经常听到耳中有异常声音，例如敲击声、咔嗒声、嘶嘶声、拍手声或铃声？', cluster: '幻觉体验' },
        { text: '有时我会分不清自己经历的事情是真实的还是想象的？', cluster: '思维内容' },
        { text: '当我看一个人或照镜子时，我见过眼前的脸发生变化？', cluster: '知觉体验' },
        { text: '初次与人见面时我感到极度焦虑？', cluster: '社交敏感' },
        { text: '我见过其他人显然看不到的东西？', cluster: '幻觉体验' },
        { text: '我的想法有时强烈到几乎能被听见？', cluster: '思维体验' },
        { text: '我有时会在广告、橱窗或周围事物的排列方式中看出（对自己特殊的）含义？', cluster: '思维内容' },
        { text: '有时我感觉自己无法控制自己的想法？', cluster: '思维体验' },
        { text: '我有时会被平时注意不到的远处声音分神？', cluster: '幻觉体验' },
        { text: '我听到过别人听不到的声音，例如窃窃私语声或说话声？', cluster: '幻觉体验' },
        { text: '我常觉得别人跟我过不去、对我不怀好意？', cluster: '思维内容' },
        { text: '尽管看不到任何人，我有种某人或某种力量在我身边的感觉？', cluster: '知觉体验' },
        { text: '我感觉身体的某些部位发生了变化，或某些部位的工作方式与以前不同？', cluster: '躯体知觉' }
      ],
      options: YES_NO,
      distressOptions: DISTRESS_0_3,
      ref: 'Ising HK, Veling W, Loewy RL, et al. Schizophr Bull. 2012;38(6):1288-1296.'
    }
  ];

  /* ---------- 展示元数据（首页卡片 / 答题页 / 结果页共用） ---------- */

  var DIM_META = {
    phq9: { abbr: 'PHQ-9', tagline: '评估最近两周的情绪低落、兴趣减退、精力下降等核心抑郁症状。', minutes: 2 },
    gad7: { abbr: 'GAD-7', tagline: '评估最近两周的紧张、担忧、无法放松等广泛性焦虑症状。', minutes: 1 },
    asrm: { abbr: 'ASRM', tagline: '评估最近一周的心境高涨、自信膨胀、睡眠需求减少等躁狂表现。', minutes: 2 },
    mdq:  { abbr: 'MDQ',  tagline: '回顾一生中是否出现过一段轻躁狂/躁狂时期，及其造成的影响。', minutes: 2 },
    isi:  { abbr: 'ISI',  tagline: '评估最近两周的入睡困难、睡眠维持困难与日间功能受损。', minutes: 2 },
    pq16: { abbr: 'PQ-16', tagline: '筛查最近一年的知觉异常、思维体验与多疑等精神病性风险。', minutes: 3 }
  };

  SCALES.forEach(function (scale) {
    var m = DIM_META[scale.id];
    if (m) {
      scale.abbr = m.abbr;
      scale.tagline = m.tagline;
      scale.minutes = m.minutes;
    }
  });

  /* ---------- 元数据：为条目分配稳定 key ---------- */

  SCALES.forEach(function (scale) {
    scale.items.forEach(function (item, i) {
      if (typeof item === 'string') {
        scale.items[i] = item = { text: item };
      }
      item.key = scale.id + '_' + i;
      // 允许每条独立选项，未指定则继承量表级选项
      item.options = item.options || scale.options;
      if (scale.type === 'pq16') {
        item.distressKey = scale.id + '_d' + i;
      }
    });
  });

  /** 常驻必答条目总数（不含 PQ-16 条件性痛苦评定） */
  var TOTAL_ITEMS = SCALES.reduce(function (sum, scale) {
    return sum + scale.items.length + (scale.cluster ? 1 : 0) + (scale.impairment ? 1 : 0);
  }, 0);

  /** 该量表在当前作答下的常驻必答条目 key 列表 */
  function requiredKeys(scale) {
    var keys = scale.items.map(function (item) { return item.key; });
    if (scale.cluster) keys.push(scale.cluster.id);
    if (scale.impairment) keys.push(scale.impairment.id);
    return keys;
  }

  /* ---------- 分级判定 ---------- */

  function bandOf(scale, score) {
    for (var i = 0; i < scale.bands.length; i++) {
      if (score <= scale.bands[i].max) return scale.bands[i];
    }
    return scale.bands[scale.bands.length - 1];
  }

  /**
   * 单维度计分。
   * @returns {object} { score, maxScore, level, tone, desc, extras, flags }
   */
  function scoreScale(scale, answers) {
    var result = {
      id: scale.id,
      name: scale.name,
      source: scale.source,
      score: 0,
      maxScore: scale.max,
      level: '',
      tone: 'neutral',
      desc: '',
      extras: [],
      flags: []
    };

    if (scale.type === 'mdq') {
      var yesCount = 0;
      scale.items.forEach(function (item) {
        if (answers[item.key] === 1) yesCount++;
      });
      var clustered = answers[scale.cluster.id] === 1;
      var impairment = answers[scale.impairment.id];
      var severeEnough = impairment === 2 || impairment === 3;
      var positive = yesCount >= 7 && clustered && severeEnough;

      result.score = yesCount;
      result.level = positive ? 'MDQ 筛查阳性' : 'MDQ 筛查阴性';
      result.tone = positive ? 'alert' : 'positive';
      result.desc = positive
        ? '同时满足“症状 ≥ 7 项”“症状曾同期出现”“造成中度及以上问题”三项条件，提示双相谱系障碍可能性增高，建议由精神科医师进行结构化访谈确诊。'
        : '未同时满足 MDQ 三项阳性条件（症状 ≥ 7 项、同期出现、中度及以上功能受损）。' +
          (yesCount >= 7 ? ' 症状条目数已达 7 项以上，若日后确认为同期出现并造成困扰，仍建议专业评估。' : '');
      result.extras = [
        { label: '症状条目数', value: yesCount + ' / ' + scale.items.length },
        { label: '同期出现', value: clustered ? '是' : '否' },
        { label: '造成功能受损', value: scale.impairment.options[impairment] ? scale.impairment.options[impairment].label : '未作答' }
      ];
      return result;
    }

    if (scale.type === 'pq16') {
      var symptomScore = 0;
      var distressScore = 0;
      scale.items.forEach(function (item) {
        if (answers[item.key] === 1) {
          symptomScore++;
          var d = answers[item.distressKey];
          distressScore += (typeof d === 'number' ? d : 0);
        }
      });

      var level, tone, desc;
      if (symptomScore < 6) {
        level = '低风险';
        tone = 'positive';
        desc = '症状分低于 6，社区样本中该水平属常见体验，风险较低。';
      } else if (distressScore < 9) {
        level = '需关注';
        tone = 'caution';
        desc = '症状分已达 6 项及以上，但痛苦程度尚未达到高危阈值，建议持续观察这些体验对生活的影响。';
      } else {
        level = '高风险';
        tone = 'alert';
        desc = '症状分 ≥ 6 且痛苦分 ≥ 9，提示精神病性风险增高（求助人群中该划界的灵敏度与特异度均约 87%），建议尽早至精神科或早期干预门诊评估。';
      }

      result.score = symptomScore;
      result.level = level;
      result.tone = tone;
      result.desc = desc;
      result.extras = [
        { label: '症状分', value: symptomScore + ' / ' + scale.max },
        { label: '痛苦分', value: distressScore + ' / ' + scale.distressMax }
      ];
      result.distress = distressScore;
      return result;
    }

    // 直接求和型量表
    var sum = 0;
    scale.items.forEach(function (item) {
      var v = answers[item.key];
      if (typeof v === 'number') sum += v;
    });
    var band = bandOf(scale, sum);
    result.score = sum;
    result.level = band.level;
    result.tone = band.tone;
    result.desc = band.desc;

    if (scale.safetyItemIndex != null) {
      var safety = answers[scale.items[scale.safetyItemIndex].key];
      if (typeof safety === 'number' && safety > 0) {
        result.flags.push({
          tone: 'alert',
          text: 'PHQ-9 第 9 条（自伤/轻生念头）有阳性作答：请务必尽快寻求专业帮助。若此刻有伤害自己的冲动，请立即拨打心理危机援助热线或前往最近的医院急诊。'
        });
      }
    }
    return result;
  }

  /** 全维度计分 + 跨维度组合提示 */
  function computeAll(answers) {
    var results = SCALES.map(function (scale) { return scoreScale(scale, answers); });
    var byId = {};
    results.forEach(function (r) { byId[r.id] = r; });

    // 跨维度提示：双相筛查阳性但抑郁分高时，抗抑郁治疗需警惕转躁
    if (byId.mdq && byId.mdq.tone === 'alert' && byId.phq9 && byId.phq9.score >= 10) {
      results.push({
        id: 'cross_note',
        name: '跨维度提示',
        source: '临床用药安全参考',
        score: null,
        maxScore: null,
        level: '就诊时请主动告知医师',
        tone: 'caution',
        desc: '双相相关筛查阳性且抑郁症状达中度以上时，单用抗抑郁药物存在诱发躁狂/转相的风险，需由精神科医师鉴别双相抑郁并制定方案。',
        extras: [],
        flags: []
      });
    }
    return results;
  }

  global.SCALES = SCALES;
  global.TOTAL_ITEMS = TOTAL_ITEMS;
  global.requiredKeys = requiredKeys;
  global.computeScale = scoreScale;
  global.computeAll = computeAll;
})(window);
