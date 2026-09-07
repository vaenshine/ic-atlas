export type Language = 'en' | 'zh';
export const text = (lang: Language, en: string, zh: string) =>
  lang === 'en' ? en : zh;
export const domains: Record<string, [string, string]> = {
  passive: ['Passives', '无源器件'],
  power: ['Power management', '电源管理'],
  discrete: ['Discrete semiconductors', '分立半导体'],
  analog: ['Analog & conversion', '模拟与转换'],
  digital: ['Digital logic & processors', '数字逻辑与处理器'],
  memory: ['Memory', '存储器'],
  interface: ['Wired interfaces', '有线接口'],
  sensor: ['Sensors', '传感器'],
  opto: ['Optoelectronics', '光电器件'],
  connector: ['Connectors', '连接器'],
  rf: ['RF & wireless', '射频与无线'],
  timing: ['Timing & clocks', '定时与时钟'],
  module: ['Modules', '模块'],
};
export const kindNames = {
  ic: ['ICs', '集成电路'],
  mcu: ['MCU / MPU / SoC', '处理器与单片机'],
  module: ['Modules & boards', '模块与开发板'],
  basic: ['Basic components', '基础器件'],
} as const;
export const packageEnglish: Record<
  string,
  {
    title: string;
    name: string;
    description: string;
    feature: string;
    mount: string;
  }
> = {
  dip: {
    title: 'DIP',
    name: 'Dual in-line package',
    description:
      'Two rows of long leads pass through holes in a PCB. DIP packages are also convenient for sockets and breadboard experiments.',
    feature: 'Two rows of leads · orientation notch · commonly 2.54 mm pitch',
    mount: 'Through-hole',
  },
  soic: {
    title: 'SOIC / SOP',
    name: 'Small-outline package',
    description:
      'Short gull-wing leads run along two sides and solder to surface pads. Common uses include amplifiers, memories and interface ICs.',
    feature: 'Two lead rows · gull-wing bends · multiple body widths',
    mount: 'Surface-mount',
  },
  tssop: {
    title: 'TSSOP / SSOP',
    name: 'Thin small-outline package',
    description:
      'A thin body and fine-pitch leads provide compact connections. Some variants include an exposed thermal pad underneath.',
    feature: 'Thin body · fine pitch · two lead rows',
    mount: 'Surface-mount',
  },
  qfp: {
    title: 'LQFP',
    name: 'Low-profile quad flat package',
    description:
      'Gull-wing leads extend from all four sides, giving microcontrollers and other ICs many accessible connections.',
    feature: 'Four lead rows · dot identifies pin 1',
    mount: 'Surface-mount',
  },
  qfn: {
    title: 'QFN',
    name: 'Quad flat no-lead package',
    description:
      'Contacts sit under the body and at its edges. Many versions include a central exposed pad for thermal or electrical connection.',
    feature: 'Bottom contacts · compact body · short connections',
    mount: 'Surface-mount',
  },
  bga: {
    title: 'BGA',
    name: 'Ball grid array',
    description:
      'An array of solder balls on the underside connects the device to the PCB. Flip the model to inspect this high-density connection pattern.',
    feature: 'Underside solder balls · row-and-column ball coordinates',
    mount: 'Reflow soldering',
  },
  to220: {
    title: 'TO-220',
    name: 'Power package with mounting tab',
    description:
      'The metal tab conducts heat to a heatsink and provides a mounting hole. Its electrical connection depends on the exact device.',
    feature: 'Metal tab · mounting hole · long leads',
    mount: 'Through-hole',
  },
  sot223: {
    title: 'SOT-223',
    name: 'Small-outline package with thermal tab',
    description:
      'Small leads on one side and a broad metal tab on the other are typical of this package, often used for linear regulators.',
    feature: 'Three small leads · wide heat-spreading tab',
    mount: 'Surface-mount',
  },
  sot23: {
    title: 'SOT-23-5',
    name: 'Miniature five-lead package',
    description:
      'A compact package with three leads on one side and two on the other, often used for small analog or power devices.',
    feature: 'Small body · asymmetric 3 + 2 lead arrangement',
    mount: 'Surface-mount',
  },
  glassdiode: {
    title: 'DO-35',
    name: 'Glass axial package',
    description:
      'A small glass tube encloses the junction, with one wire emerging from each end. A band normally identifies the diode cathode.',
    feature: 'Glass body · axial leads · cathode band',
    mount: 'Through-hole',
  },
  diode: {
    title: 'DO-41',
    name: 'Plastic axial package',
    description:
      'A molded cylindrical body with axial leads is common for rectifier diodes. Identify the polarity band before installation.',
    feature: 'Molded cylinder · axial leads · polarity band',
    mount: 'Through-hole',
  },
  sma: {
    title: 'SMA / DO-214AC',
    name: 'Surface-mount diode package',
    description:
      'Broad metal terminals at the ends solder to PCB pads. The stripe on the body usually identifies the cathode.',
    feature: 'Rectangular body · end terminals · polarity stripe',
    mount: 'Surface-mount',
  },
  bjt: {
    title: 'TO-92',
    name: 'Small three-lead package',
    description:
      'A flat marking face and curved back identify this common package. Transistors, regulators and sensors use different pin assignments.',
    feature: 'Flat marking face · curved back · device-specific pinout',
    mount: 'Through-hole',
  },
  sot236: {
    title: 'SOT-23-6',
    name: 'Miniature six-lead package',
    description:
      'Three leads on each side form a small package used for converters, protection devices and other compact circuits.',
    feature: 'Small body · three leads per side',
    mount: 'Surface-mount',
  },
  to263: {
    title: 'TO-263-5',
    name: 'D²PAK surface-mount power package',
    description:
      'A large metal thermal surface carries heat into the PCB. Check its electrical net in the specific device datasheet.',
    feature: 'Large metal thermal pad · five leads',
    mount: 'Surface-mount',
  },
  to2205: {
    title: 'Pentawatt-5',
    name: 'Five-lead power package',
    description:
      'Five long leads and a metal mounting tab support power devices such as audio amplifiers.',
    feature: 'Five leads · thermal tab · mounting hole',
    mount: 'Through-hole',
  },
};
export const markerEnglish: Record<string, string> = {
  'PCB 印制天线': 'PCB antenna',
  'ESP32 无线模组': 'ESP32 wireless module',
  'PCB 天线': 'PCB antenna',
  金属屏蔽罩: 'Metal RF shield',
  模组焊接触点: 'Module solder contacts',
  'RP2040 主控': 'RP2040 microcontroller',
  'USB 接口': 'USB connector',
  板边半孔焊盘: 'Castellated edge pads',
  '数字 / 模拟接口': 'Digital / analog headers',
  六轴惯性传感器: 'Six-axis inertial sensor',
  'I²C 接口排针': 'I²C header',
  '2.4 GHz 印制天线': '2.4 GHz PCB antenna',
  无线收发芯片: 'RF transceiver',
  散热片与安装孔: 'Thermal tab and mounting hole',
  金属散热焊盘: 'Metal thermal pad',
  '1 脚定位缺口': 'Pin 1 orientation notch',
  '1 脚定位圆点': 'Pin 1 dot',
  底面焊球阵列: 'Underside solder-ball array',
  底面焊盘: 'Underside pads',
  散热端子: 'Thermal terminal',
  直插引脚: 'Through-hole leads',
  海鸥翼引脚: 'Gull-wing leads',
  '输入 LED': 'Input LED',
  输出光电晶体管: 'Output phototransistor',
  '色环：棕 黑 红 金': 'Bands: brown, black, red, gold',
  'K 阴极 · 色环端': 'K cathode · banded end',
  轴向引线: 'Axial leads',
  'A 阳极': 'A anode',
  'K 阴极标记': 'Cathode marking',
  表面贴装端子: 'Surface-mount terminals',
  'TO-92 平面 · 丝印侧': 'TO-92 flat marking face',
  '3 脚定义随型号核对': 'Verify device-specific pinout',
  透明环氧透镜: 'Clear epoxy lens',
  红色环氧透镜: 'Red epoxy lens',
  '4 根引脚 · 共阴型示意': 'Four leads · common-cathode example',
  极性与限流电阻需一起确认: 'Check polarity and current limiting',
  '瞬时触点 · 按压接通': 'Momentary contact · press to close',
  同组两脚常通: 'Same-group pins are connected',
  '滑柄 · 选择一侧触点': 'Slider selects one contact',
  'COM 公共端在中间（示意）': 'Center common terminal · example',
  金属屏蔽壳: 'Metal shielding shell',
  '上下双面 · 24 个触点': '24 contacts across both faces',
  '2 × 5 方形镀金针': '2 × 5 gold-plated square pins',
  '2.54 mm 间距示例': '2.54 mm pitch example',
  有方向的塑料护墙: 'Polarized plastic shroud',
  'XH 系列 · 2.50 mm': 'XH series · 2.50 mm pitch',
  螺钉与压线框: 'Screws and wire clamps',
  接线入口: 'Wire entry',
  顶部防爆刻痕: 'Scored pressure vent',
  '负极条纹（示意）': 'Negative polarity stripe',
  '104 = 100,000 pF': '104 = 100,000 pF',
  '陶瓷介质 · 双引脚': 'Ceramic dielectric · two leads',
};
export const markerChinese: Record<string, string> = {
  'Alternating electrodes': '交错电极层',
  'Ceramic dielectric': '陶瓷介质',
  'Solder terminations': '焊接端头',
  'Lossy ferrite body': '有损铁氧体',
  'Embedded winding': '内嵌绕组',
  'Low-resistance metal element': '低阻金属元件',
  'Functional element': '功能材料层',
  'Two coupled windings': '双耦合绕组',
  'Copper winding': '铜线绕组',
  'Ferrite core': '铁氧体磁芯',
  'Positive polarity band': '正极标记带',
  'Temperature-sensitive body': '热敏材料',
  'Voltage-dependent material': '压敏材料',
  'Functional material': '功能材料',
  'Surface-mount terminals': '贴片端子',
  'Radial leads': '径向引线',
  'Fusible link': '可熔断金属丝',
  'Grounded filter body': '接地滤波体',
  'Electrode gap': '电极间隙',
  'Axial terminal': '轴向端子',
  'Powered clock circuit': '有源时钟电路',
  'Quartz resonator': '石英谐振片',
  'Supply, ground and output': '供电、地与输出',
  'Resonator connections': '谐振器端子',
  'Coil and moving contact': '线圈与活动触点',
  'Piezoelectric sound element': '压电发声元件',
  'Sensing element': '感测元件',
  'Rolled electrode structure': '卷绕电极结构',
  'Internal functional blocks': '内部功能结构',
  'Protective housing': '保护外壳',
  'Flip-lock latch': '翻盖锁扣',
  'Fine-pitch contacts': '细间距触点',
  'Polarized shroud': '防反插护墙',
  'Recessed female contacts': '内凹母端触点',
  'Contact rows': '接触端子排',
  'Spring signal contacts': '弹性信号触点',
  'Plug latch recess': '插头卡扣槽',
  'Seal and locking tab': '密封圈与锁扣',
  'Keyed insulating housing': '带定位键的绝缘外壳',
  'Mating contact cavities': '对接触点腔体',
  'Coaxial signal and shield': '同轴信号与屏蔽',
  'Barrel power contact': '圆筒电源触点',
  'Mechanical body': '机械外壳',
  'Multiple contact rows': '多排接触针',
  'Retention screw posts': '固定螺柱',
  'Conductor and insulation crimps': '导体与绝缘压接区',
  'Mating contact': '对接触点',
  'Fusible metal element': '可熔断金属元件',
  'Replaceable fuse contacts': '可更换保险丝触点',
  'Power terminals': '电源端子',
  'Photosensitive junction': '光敏结',
  'Emitter / receiver gap': '发射与接收间隙',
  'Adjustable wiper': '可调滑动触点',
  'Radiating conductor': '辐射导体',
  'User-visible functional surface': '可观察的功能表面',
  'Electrical connections': '电气连接',
  'Family construction example': '类别结构示意',
  'Integrated LED controller': '内置 LED 控制芯片',
  'RGB emitter dies': 'RGB 发光裸片',
  'Optical sensing window': '光学感测窗口',
  'Photodetector and conversion circuit': '光检测与转换电路',
  'Adjacent emitter and detector': '并排发射与接收器',
  'Filtered infrared receiver': '带滤光结构的红外接收头',
  'Infrared emitting junction': '红外发光结',
  'Light-controlled transistor': '受光控制的晶体管',
  'Device-specific lead assignment': '按具体型号确认脚序',
  'Axial copper winding': '轴向铜线绕组',
  'Inductance color bands': '电感量色环',
  'Ceramic resonator element': '陶瓷谐振元件',
  'Resonator coating': '谐振器包覆层',
  'Multilayer ceramic stack': '多层陶瓷叠层',
  'Radial protective coating': '径向器件保护层',
  'Solder eyelet': '焊接孔',
  'Blade and spring receptacle': '插片与弹性插簧',
  'Removable wire plug': '可拔插线缆插头',
  'PCB mating header': 'PCB 配对针座',
  'Surface-mount contacts': '贴片触点',
};
export function markerText(value: string, lang: Language) {
  if (lang === 'en') {
    if (markerEnglish[value]) return markerEnglish[value];
    return value.replace(/(\d+) 个连接引脚/, '$1 connection leads');
  }
  if (markerChinese[value]) return markerChinese[value];
  const reverse = Object.entries(markerEnglish).find(([, v]) => v === value);
  return reverse?.[0] || value;
}
