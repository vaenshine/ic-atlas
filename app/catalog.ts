export type Kind = 'ic' | 'mcu' | 'module';
export type Shape =
  | 'dip'
  | 'soic'
  | 'tssop'
  | 'qfp'
  | 'qfn'
  | 'bga'
  | 'to220'
  | 'sot223'
  | 'sot23'
  | 'wroom'
  | 'devkit'
  | 'uno'
  | 'pico'
  | 'sensor'
  | 'radio';
export type Part = {
  id: string;
  name: string;
  subtitle: string;
  kind: Kind;
  family: string;
  package: string;
  shape: Shape;
  pins: number;
  description: string;
  specs: [string, string][];
  uses: string[];
  tip: string;
  pinNotes: [string, string][];
  steps: string[];
  source: string;
  color?: string;
};
export const kindLabels: Record<Kind, string> = {
  ic: '集成电路',
  mcu: '单片机',
  module: '模块与开发板',
};
export const parts: Part[] = [
  {
    id: 'esp32dev',
    name: 'ESP32 DevKitC V4',
    subtitle: 'Wi-Fi / 蓝牙开发板',
    kind: 'module',
    family: '无线连接',
    package: '开发板 · 38P',
    shape: 'devkit',
    pins: 38,
    description:
      '一块能连接网络的微型控制板。它把 ESP32 模组、USB 转串口、电源和排针集成在一起，接上电脑就能开始编程。',
    specs: [
      ['核心', 'ESP32'],
      ['无线连接', 'Wi-Fi + BT'],
      ['GPIO 电平', '3.3 V'],
      ['编程接口', 'Micro USB'],
    ],
    uses: ['智能家居', '物联网设备', '无线传感器'],
    tip: '银色金属罩下面是无线模组；板边的曲折铜线是天线。使用时让天线区域远离大块金属。',
    pinNotes: [
      ['3V3 / GND', '3.3 V 电源与公共地。'],
      ['GPIO', '可编程输入输出；部分引脚与启动、Flash 或输入专用功能相关。'],
      ['TX / RX', '串口发送与接收，用于调试和通信。'],
      ['EN / BOOT', 'EN 用于复位；BOOT 用于进入下载模式。'],
    ],
    steps: [
      '通过 USB 连接电脑，安装 ESP32 开发环境。',
      '编写程序，控制 LED 或读取传感器。',
      '通过 Wi-Fi 把采集的数据发送到网络。',
    ],
    source:
      'https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html',
  },
  {
    id: 'stm32',
    name: 'STM32F103C8T6',
    subtitle: '32 位 ARM 微控制器',
    kind: 'mcu',
    family: '控制与计算',
    package: 'LQFP-48',
    shape: 'qfp',
    pins: 48,
    description:
      '把处理器、存储器和多种外设集成在一起的微控制器。通过程序读取输入、执行判断，再控制灯光、电机等外部设备。',
    specs: [
      ['处理器', 'Cortex-M3'],
      ['最高主频', '72 MHz'],
      ['Flash', '64 KB'],
      ['供电', '2.0–3.6 V'],
    ],
    uses: ['电机控制', '工业仪表', '嵌入式入门'],
    tip: '四边伸出的细脚是 LQFP 的典型特征。顶面的圆点标记 1 脚方向，查看数据手册时先确认顶视图。',
    pinNotes: [
      ['VDD / VSS', '数字电源与地；每组电源附近需要去耦电容。'],
      ['PAx / PBx / PCx', '通用 I/O，多数引脚可复用为串口、定时器等外设。'],
      ['SWDIO / SWCLK', '下载程序与在线调试接口。'],
      ['NRST / BOOT0', '复位与启动模式选择。'],
    ],
    steps: [
      '提供稳定电源、去耦电容与启动配置。',
      '用 ST-LINK 通过 SWD 下载程序。',
      '配置 GPIO 或定时器，点亮一颗 LED。',
    ],
    source:
      'https://www.st.com/en/microcontrollers-microprocessors/stm32f103c8.html',
  },
  {
    id: 'ne555',
    name: 'NE555P',
    subtitle: '经典定时器',
    kind: 'ic',
    family: '模拟与信号',
    package: 'DIP-8',
    shape: 'dip',
    pins: 8,
    description:
      '通过电阻和电容设定时间，产生延时或连续脉冲。理解振荡、定时和占空比时，它是一颗很直观的入门芯片。',
    specs: [
      ['通道', '1'],
      ['供电', '4.5–16 V'],
      ['引脚数量', '8'],
      ['安装方式', '通孔'],
    ],
    uses: ['LED 闪烁', '延时开关', '脉冲发生器'],
    tip: '凹口朝上时，顶视图左上角是 1 脚，沿逆时针编号。DIP 引脚间距常见为 2.54 mm，便于面包板实验。',
    pinNotes: [
      ['1 GND · 8 VCC', '电源地与正电源。'],
      ['2 TRIG · 6 THRES', '触发与阈值输入，感知电容电压。'],
      ['3 OUT · 7 DISCH', '信号输出与电容放电端。'],
      ['4 RESET · 5 CONT', '低电平复位与控制电压输入。'],
    ],
    steps: [
      '搭建数据手册中的无稳态振荡电路。',
      '电容周期性充电和放电，输出高低电平。',
      '改变电阻或电容，观察 LED 闪烁周期。',
    ],
    source: 'https://www.ti.com/product/NE555',
  },
  {
    id: 'lm358',
    name: 'LM358D',
    subtitle: '双运算放大器',
    kind: 'ic',
    family: '模拟与信号',
    package: 'SOIC-8',
    shape: 'soic',
    pins: 8,
    description:
      '内部包含两个运算放大器。它配合反馈电阻，可以放大传感器的微弱信号，也能构成滤波和电压跟随电路。',
    specs: [
      ['通道', '2'],
      ['GBW（典型）', '0.7 MHz'],
      ['供电', '3–30 V'],
      ['安装方式', '表面贴装'],
    ],
    uses: ['传感器信号放大', '有源滤波', '电压缓冲'],
    tip: 'SOIC 的引脚向外弯折，侧面像海鸥翅膀。设计时同时检查输入共模范围和输出摆幅。',
    pinNotes: [
      ['1 OUT1 · 7 OUT2', '两路放大器的输出端。'],
      ['2 IN− · 3 IN+', '第一路反相与同相输入。'],
      ['5 IN+ · 6 IN−', '第二路同相与反相输入。'],
      ['4 V− · 8 V+', '负电源或地，以及正电源。'],
    ],
    steps: [
      '把传感器电压接到同相输入。',
      '用电阻建立负反馈，设置闭环增益。',
      '将放大后的信号送入 ADC。',
    ],
    source: 'https://www.ti.com/product/LM358',
  },
  {
    id: 'atmega',
    name: 'ATmega328P-PU',
    subtitle: '8 位 AVR 微控制器',
    kind: 'mcu',
    family: '控制与计算',
    package: 'DIP-28',
    shape: 'dip',
    pins: 28,
    description:
      '经典 Arduino Uno 的主控芯片。它能执行程序、读取模拟电压、产生 PWM，并通过串口和其他芯片通信。',
    specs: [
      ['架构', '8-bit AVR'],
      ['Flash', '32 KB'],
      ['SRAM', '2 KB'],
      ['最高频率*', '20 MHz'],
    ],
    uses: ['Arduino 入门', '简单自动化', '交互装置'],
    tip: '这里展示 28 脚 DIP 版本；同一芯片还提供其他封装。20 MHz 对应 4.5–5.5 V 供电；其他电压请查看速度等级。',
    pinNotes: [
      ['VCC / AVCC / GND', '数字与模拟电源，以及公共地。'],
      ['PB / PC / PD', '三组 I/O 端口，部分支持 ADC、PWM 或通信。'],
      ['RESET', '低电平复位，也参与 ISP 编程。'],
      ['XTAL1 / XTAL2', '外部晶振连接。'],
    ],
    steps: [
      '准备电源、去耦和需要的时钟电路。',
      '通过 ISP 写入程序，或使用引导程序下载。',
      '读取按钮，利用 PWM 改变 LED 亮度。',
    ],
    source: 'https://www.microchip.com/en-us/product/ATmega328P',
  },
  {
    id: 'wroom',
    name: 'ESP32-WROOM-32E',
    subtitle: 'Wi-Fi / 蓝牙模组',
    kind: 'module',
    family: '无线连接',
    package: '模组 · 38P',
    shape: 'wroom',
    pins: 38,
    description:
      '把 ESP32 芯片、Flash、晶振和射频电路集成在一小块板上。屏蔽罩帮助减少电磁干扰，板载天线负责无线收发。',
    specs: [
      ['处理器', '双核 Xtensa'],
      ['最高主频', '240 MHz'],
      ['供电', '3.0–3.6 V'],
      ['触点', '38'],
    ],
    uses: ['联网终端', '智能插座', '无线网关'],
    tip: '模组提供射频相关电路；构建完整开发板还需要电源、下载接口和连接器。天线区域需要按官方指南留空。',
    pinNotes: [
      ['3V3 / GND', '模组的供电接口。'],
      ['EN', '芯片使能，低电平复位。'],
      ['GPIO', '通用输入输出，使用前核对复用与启动限制。'],
      ['TXD0 / RXD0', 'UART0，可用于程序下载和日志。'],
    ],
    steps: [
      '在载板上提供稳定的 3.3 V 电源。',
      '按推荐布局保留天线净空。',
      '连接下载接口，运行无线应用程序。',
    ],
    source:
      'https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32e_esp32-wroom-32ue_datasheet_en.pdf',
  },
  {
    id: 'rp2040',
    name: 'RP2040',
    subtitle: '双核 ARM 微控制器',
    kind: 'mcu',
    family: '控制与计算',
    package: 'QFN-56',
    shape: 'qfn',
    pins: 56,
    description:
      '双核 Arm Cortex-M0+ MCU，带有可编程输入输出单元 PIO。 RP2040 搭配外部 Flash 保存程序，Pico 板上已经集成所需存储器。',
    specs: [
      ['处理器', '双核 Cortex-M0+'],
      ['最高主频', '133 MHz'],
      ['SRAM', '264 KB'],
      ['封装本体', '7 × 7 mm'],
    ],
    uses: ['Pico 开发板', '自定义键盘', '实时 I/O 控制'],
    tip: '翻到模型底面，观察周边焊盘与中央焊盘。RP2040 的程序通常放在外部 Flash 中。',
    pinNotes: [
      ['IOVDD / GND', 'I/O 电源与地。电源域和去耦连接遵循官方硬件指南。'],
      ['GPIO0–29', '通用输入输出，支持多种外设复用。'],
      ['QSPI', '连接外部 Flash，用于存放程序。'],
      ['USB / SWD', 'USB 通信与串行调试接口。'],
    ],
    steps: [
      '在外部 QSPI Flash 中保存程序。',
      '启动后由两个处理器核心执行任务。',
      '通过 PIO 状态机生成精确的接口时序。',
    ],
    source:
      'https://www.raspberrypi.com/documentation/microcontrollers/microcontroller-chips.html',
  },
  {
    id: 'am3358',
    name: 'AM3358BZCZ60',
    subtitle: 'ARM 应用处理器',
    kind: 'ic',
    family: '控制与计算',
    package: 'NFBGA-324',
    shape: 'bga',
    pins: 324,
    description:
      '基于 Arm Cortex-A8 的应用处理器，带图形与外设接口，可组成运行 Linux 的嵌入式系统。 BGA 描述焊球连接形式；系统还需外部存储器、电源等配套电路。',
    specs: [
      ['处理器', 'Cortex-A8'],
      ['本型号等级', '600 MHz'],
      ['焊球数量', '324'],
      ['封装本体', '15 × 15 mm'],
    ],
    uses: ['Linux 单板机', '工业人机界面', '边缘网关'],
    tip: '这是应用处理器示例。旋转到底面观察 18 × 18 焊球阵列，接线与球位以具体器件资料为准。',
    pinNotes: [
      ['DDR 接口', '连接外部运行内存。'],
      ['启动接口', '通过选定存储设备加载引导程序。'],
      ['电源域', '处理器核心、I/O 等具有独立电源要求。'],
      ['球位坐标', 'BGA 常用字母和数字定位焊球，核对手册的视图方向。'],
    ],
    steps: [
      '电源管理芯片按要求为各电源域上电。',
      '引导程序初始化外部 DDR 和其他硬件。',
      '操作系统运行应用，管理网络与显示外设。',
    ],
    source: 'https://www.ti.com/product/AM3358/part-details/AM3358BZCZ60',
  },
  {
    id: '7805',
    name: 'L7805CV',
    subtitle: '5 V 线性稳压器',
    kind: 'ic',
    family: '电源与驱动',
    package: 'TO-220',
    shape: 'to220',
    pins: 3,
    description:
      '把具有足够余量的直流输入稳定为 5 V。 线性稳压器把输入与输出压差对应的功率转为热量，负载能力取决于散热。',
    specs: [
      ['固定输出', '5 V'],
      ['引脚数量', '3'],
      ['稳压类型', '线性稳压'],
      ['安装方式', '通孔'],
    ],
    uses: ['5 V 电源', '小型控制板', '线性电源实验'],
    tip: '金属片和安装孔用于散热。功耗约为 (输入电压 − 输出电压) × 电流，要结合负载评估温升。',
    pinNotes: [
      ['1 INPUT', '输入电压需要满足手册规定的余量。'],
      ['2 GND', '公共地；此型号金属散热片也连接地。'],
      ['3 OUTPUT', '稳定的 5 V 输出。'],
    ],
    steps: [
      '把直流输入接入稳压器。',
      '内部反馈环路调节输出至 5 V。',
      '检查压差和负载，计算散热需求。',
    ],
    source: 'https://www.st.com/resource/en/datasheet/l78.pdf',
  },
  {
    id: 'ams1117',
    name: 'AMS1117-3.3',
    subtitle: '3.3 V 低压差稳压器',
    kind: 'ic',
    family: '电源与驱动',
    package: 'SOT-223',
    shape: 'sot223',
    pins: 3,
    description:
      '提供固定 3.3 V 的低压差线性稳压输出。 具体电流、压差、输出电容要求与生产厂商有关；此展品采用 UMW 版本资料。',
    specs: [
      ['固定输出', '3.3 V'],
      ['器件厂商', 'UMW'],
      ['封装', 'SOT-223'],
      ['转换方式', '线性'],
    ],
    uses: ['开发板供电', '3.3 V 传感器', '电源转换'],
    tip: '一侧三只小引脚，另一侧一块宽金属散热接片。',
    pinNotes: [
      ['1 GND', '固定输出版本的地引脚。'],
      ['2 OUTPUT / TAB', '输出端与大散热接片电气相连。'],
      ['3 INPUT', '输入端；所需余量取决于负载与压差规格。'],
    ],
    steps: [
      '用输入电容稳定上游供电。',
      '芯片调整内部通路，保持 3.3 V 输出。',
      '按手册选输出电容，并留足散热铜箔。',
    ],
    source: 'https://www.umw-ic.com/pdf/AMS1117-3.3',
  },
  {
    id: 'drv8833',
    name: 'DRV8833PWPR',
    subtitle: '双 H 桥电机驱动器',
    kind: 'ic',
    family: '电源与驱动',
    package: 'HTSSOP-16',
    shape: 'tssop',
    pins: 16,
    description:
      '内部双 H 桥切换电机电流方向，驱动两台直流电机或一台双极步进电机。 可持续驱动电流取决于封装、供电和散热；峰值与连续电流分别对应不同条件。',
    specs: [
      ['驱动通道', '双 H 桥'],
      ['电机电源', '2.7–10.8 V'],
      ['引脚数量', '16'],
      ['散热', '底部焊盘'],
    ],
    uses: ['小车电机', '小型步进电机', '电动玩具'],
    tip: '翻到底面观察散热焊盘。电机供电、电流、散热和续流布局需要一起考虑。',
    pinNotes: [
      ['VM / GND', '电机电源与公共地。'],
      ['AIN / BIN', '来自控制器的输入信号。'],
      ['AOUT / BOUT', '连接电机绕组的功率输出。'],
      ['nSLEEP / nFAULT', '休眠控制与故障指示。'],
    ],
    steps: [
      '单片机输出方向信号和 PWM。',
      'H 桥切换电流方向，让电机正反转。',
      '芯片监测异常，散热设计支持持续工作。',
    ],
    source: 'https://www.ti.com/lit/ds/symlink/drv8833.pdf',
  },
  {
    id: 'ch340',
    name: 'CH340G',
    subtitle: 'USB 转串口芯片',
    kind: 'ic',
    family: '通信与接口',
    package: 'SOP-16',
    shape: 'soic',
    pins: 16,
    description:
      '在 USB 与 UART 串口之间传输数据。 G 后缀版本使用外部时钟元件，CH340 家族的其他后缀有各自封装和功能。',
    specs: [
      ['USB', '全速 USB'],
      ['输出接口', 'UART'],
      ['外部晶振', '12 MHz'],
      ['引脚数量', '16'],
    ],
    uses: ['开发板下载', '串口调试', 'USB 转 TTL'],
    tip: '两侧各 8 根贴片引脚；CH340G 电路通常在附近配置外部晶振。',
    pinNotes: [
      ['UD+ / UD−', '连接 USB 的差分数据线。'],
      ['TXD / RXD', 'UART 发送和接收。'],
      ['XI / XO', 'CH340G 的外部晶振接口。'],
      ['VCC / V3 / GND', '电源连接遵循具体供电方案。'],
    ],
    steps: [
      '电脑通过 USB 识别串口设备。',
      '芯片在 USB 数据包和 UART 位流之间转换。',
      '单片机通过 UART 接收指令或输出日志。',
    ],
    source:
      'https://www.wch-ic.com/products/productsCenter/mcuInterface?categoryId=1&tName=Extension%2FIsolation',
  },
  {
    id: 'max3232',
    name: 'MAX3232IPWR',
    subtitle: 'RS-232 电平转换器',
    kind: 'ic',
    family: '通信与接口',
    package: 'TSSOP-16',
    shape: 'tssop',
    pins: 16,
    description:
      '在逻辑电平串口与 RS-232 信号电平之间转换，包含两路驱动和两路接收。 UART 描述数据时序，RS-232 还规定了电气信号形式，连接时需要匹配电平。',
    specs: [
      ['供电', '3–5.5 V'],
      ['驱动 / 接收', '2 / 2'],
      ['速率等级', '250 kbit/s'],
      ['电压生成', '电荷泵'],
    ],
    uses: ['工业串口', '仪器通信', 'RS-232 转换'],
    tip: 'UART 描述数据收发方式，RS-232 定义接口电气特性。连接设备前核对两端的电平标准。',
    pinNotes: [
      ['TIN / ROUT', '面向逻辑电平系统的一侧。'],
      ['TOUT / RIN', '面向 RS-232 电平的一侧。'],
      ['C1± / C2±', '连接外部电荷泵电容。'],
      ['VCC / GND', '供电与地。'],
    ],
    steps: [
      '控制器输出逻辑电平串口信号。',
      '电荷泵产生转换所需的正负电压。',
      '收发器按 RS-232 电平与外部设备通信。',
    ],
    source: 'https://www.ti.com/lit/ds/symlink/max3232.pdf',
  },
  {
    id: 'w25q',
    name: 'W25Q32JVSSIQ',
    subtitle: '32 Mbit 串行 Flash',
    kind: 'ic',
    family: '存储与时钟',
    package: 'SOP-8 · 宽体',
    shape: 'soic',
    pins: 8,
    description:
      '通过 SPI、Dual 或 Quad 接口保存 32 Mbit 数据，断电后继续保留。 32 Mbit 等于 4 MiB；擦除和写入遵循器件定义的块与页规则。',
    specs: [
      ['存储容量', '32 Mbit / 4 MB'],
      ['接口', 'SPI / Quad SPI'],
      ['供电', '2.7–3.6 V'],
      ['本体宽度', '208 mil'],
    ],
    uses: ['固件存储', '资源文件', '启动程序'],
    tip: '32 Mbit 等于 4 MB。容量的 bit 与 byte 相差 8 倍；这里使用的是 208 mil 宽体 SOP-8 版本。',
    pinNotes: [
      ['CS# / CLK', '片选与串行时钟。'],
      ['IO0–IO3', '串行数据引脚，功能受接口模式影响。'],
      ['VCC / GND', '供电与地。'],
      ['写入 / 擦除', 'Flash 按页编程，更新前可能需要按扇区擦除。'],
    ],
    steps: [
      '控制器通过 SPI 发出读取指令和地址。',
      '芯片返回对应地址的数据。',
      '更新内容时按擦除与编程流程操作。',
    ],
    source:
      'https://www.winbond.com/hq/product/code-storage-flash/qspi-nor/w25q-jv/?__locale=en&partNo=W25Q32JVSSIQ',
  },
  {
    id: '24lc256',
    name: '24LC256-I/P',
    subtitle: 'I²C EEPROM',
    kind: 'ic',
    family: '存储与时钟',
    package: 'DIP-8',
    shape: 'dip',
    pins: 8,
    description:
      '通过 I²C 保存 256 Kbit 数据，支持电擦写和断电保留。 256 Kbit 等于 32 KiB；写入次数与写入时间有规定上限。',
    specs: [
      ['容量', '256 Kbit / 32 KB'],
      ['接口', 'I²C'],
      ['供电', '2.5–5.5 V'],
      ['页大小', '64 byte'],
    ],
    uses: ['参数保存', '校准数据', '设备配置'],
    tip: 'EEPROM 适合保存少量设置。写入寿命和写周期会影响软件设计。',
    pinNotes: [
      ['SDA / SCL', 'I²C 数据与时钟线，需要合适的上拉。'],
      ['A0–A2', '地址选择，可让多个器件共用总线。'],
      ['WP', '硬件写保护。'],
      ['VCC / VSS', '电源与地。'],
    ],
    steps: [
      '控制器指定芯片地址和存储位置。',
      '将配置数据写入 EEPROM，等待写周期完成。',
      '设备重新上电后读取保留的数据。',
    ],
    source: 'https://www.microchip.com/en-us/product/24lc256',
  },
  {
    id: 'ds3231',
    name: 'DS3231SN#',
    subtitle: '高精度实时时钟',
    kind: 'ic',
    family: '存储与时钟',
    package: 'SOIC-16 · 宽体',
    shape: 'soic',
    pins: 16,
    description:
      '内置温度补偿晶振，通过 I²C 提供日期和时间，支持电池备份。 主电源断开后，合适的备份电源可继续维持计时。',
    specs: [
      ['接口', 'I²C'],
      ['内部时钟', '温补晶振'],
      ['主电源', '2.3–5.5 V'],
      ['本体宽度', '300 mil'],
    ],
    uses: ['电子时钟', '定时记录', '设备时间戳'],
    tip: '内部集成了温度补偿晶振。外形采用 300 mil 宽体封装；备用电池接口用于维持计时。',
    pinNotes: [
      ['SDA / SCL', '读取与设置日期时间。'],
      ['VBAT', '备用电源输入，可在主电源移除后维持计时。'],
      ['INT / SQW', '闹钟中断或方波输出。'],
      ['VCC / GND', '主电源与地。'],
    ],
    steps: [
      '先设置正确的日期和时间。',
      '内部温补晶振持续计时。',
      '控制器定期读取时间，或响应闹钟中断。',
    ],
    source: 'https://www.analog.com/en/products/ds3231.html',
  },
  {
    id: 'hc595',
    name: 'SN74HC595N',
    subtitle: '8 位移位寄存器',
    kind: 'ic',
    family: '数字逻辑',
    package: 'DIP-16',
    shape: 'dip',
    pins: 16,
    description:
      '按时钟逐位接收串行数据，再通过锁存器更新 8 路并行输出。 移位寄存器暂存新数据，输出锁存器控制整组输出的更新时间。',
    specs: [
      ['输出位数', '8'],
      ['输入方式', '串行'],
      ['供电', '2–6 V'],
      ['级联能力', '支持'],
    ],
    uses: ['LED 阵列', '数码管', 'I/O 扩展'],
    tip: '两侧各 8 根直插引脚，顶面型号包含 74HC595。',
    pinNotes: [
      ['SER / SRCLK', '串行数据与移位时钟。'],
      ['RCLK', '将移位寄存器的数据锁存到输出。'],
      ['QA–QH', '8 路并行输出，负载受电流额定值限制。'],
      ['OE# / SRCLR#', '输出使能与移位寄存器清零。'],
    ],
    steps: [
      '单片机按位送入 8 位数据。',
      '每个移位时钟推动数据进入寄存器。',
      '锁存后同时更新 8 路输出。',
    ],
    source: 'https://www.ti.com/lit/gpn/SN54HC595',
  },
  {
    id: 'hc00',
    name: 'SN74HC00N',
    subtitle: '四路二输入与非门',
    kind: 'ic',
    family: '数字逻辑',
    package: 'DIP-14',
    shape: 'dip',
    pins: 14,
    description:
      '包含四个独立的双输入与非门；两输入均为高电平时输出低电平。 逻辑门把电平组合变成确定的输出；真值表描述所有输入组合。',
    specs: [
      ['逻辑门', '4 路 NAND'],
      ['每门输入', '2'],
      ['供电', '2–6 V'],
      ['输出形式', '数字电平'],
    ],
    uses: ['逻辑实验', '组合逻辑', '信号控制'],
    tip: '两侧各 7 根直插引脚；74HC00 型号指出逻辑家族与门电路类型。',
    pinNotes: [
      ['A / B', '每路逻辑门的两个输入。'],
      ['Y', '与非运算结果：仅两个输入同时为高时输出低。'],
      ['VCC / GND', '电源与地。'],
      ['闲置输入', '按数据手册将闲置 CMOS 输入固定到有效逻辑电平。'],
    ],
    steps: [
      '为两个输入分别提供确定的高或低电平。',
      '观察四种输入组合。',
      '记录输出，得到 NAND 真值表。',
    ],
    source: 'https://www.ti.com/product/SN74HC00/part-details/SN74HC00N',
  },
  {
    id: 'pc817',
    name: 'PC817X2NSZ1B',
    subtitle: '光耦隔离器件',
    kind: 'ic',
    family: '隔离与采样',
    package: 'DIP-4',
    shape: 'dip',
    pins: 4,
    description:
      '封装内的红外 LED 通过光驱动光电晶体管，在两侧电路之间传递信号。 电流传输比 CTR 有分档和测试条件；隔离能力取决于器件及整板设计。',
    specs: [
      ['输入', '红外 LED'],
      ['输出', '光电晶体管'],
      ['引脚数量', '4'],
      ['信号耦合', '光'],
    ],
    uses: ['信号隔离', '开关量检测', '电源反馈'],
    tip: '光耦封装内有发光器件与受光器件。CTR 表示输出电流与输入电流的比值，会随等级和条件变化。',
    pinNotes: [
      ['1 ANODE · 2 CATHODE', '输入 LED 阳极与阴极，需要限流电阻。'],
      ['4 COLLECTOR · 3 EMITTER', '输出光电晶体管的集电极与发射极。'],
      ['隔离边界', '输入侧和输出侧的电气回路分别设计。'],
    ],
    steps: [
      '输入电流让内部 LED 发光。',
      '光照使输出光电晶体管导通。',
      '输出电路检测变化，实现隔离信号传递。',
    ],
    source:
      'https://global.sharp/products/device/lineup/data/pdf/datasheet/PC817XxNSZ1B_e.pdf',
  },
  {
    id: 'mpu6050',
    name: 'MPU-6050',
    subtitle: '六轴惯性传感器',
    kind: 'ic',
    family: '隔离与采样',
    package: 'QFN-24',
    shape: 'qfn',
    pins: 24,
    description:
      '测量三轴加速度和三轴角速度，通过 I²C 输出数字数据。 加速度计读到的量包含重力影响；姿态估计需要结合传感器数据与算法。',
    specs: [
      ['加速度计', '3 轴'],
      ['陀螺仪', '3 轴'],
      ['数字接口', 'I²C'],
      ['供电', '2.375–3.46 V'],
    ],
    uses: ['姿态感知', '运动检测', '平衡小车'],
    tip: '六轴指 3 轴加速度与 3 轴角速度。长期姿态估计涉及漂移校正与传感器融合。',
    pinNotes: [
      ['SDA / SCL', 'I²C 通信接口。'],
      ['AD0', '选择 I²C 从机地址。'],
      ['INT', '数据就绪等事件中断。'],
      ['VDD / VLOGIC / GND', '器件供电、逻辑电平参考与地。'],
    ],
    steps: [
      '加速度计测量三个方向的加速度分量。',
      '陀螺仪测量绕三个轴的角速度。',
      '软件校准并融合数据，估计运动与姿态。',
    ],
    source:
      'https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Datasheet.pdf',
  },
  {
    id: 'mcp3008',
    name: 'MCP3008-I/P',
    subtitle: '8 通道模数转换器',
    kind: 'ic',
    family: '隔离与采样',
    package: 'DIP-16',
    shape: 'dip',
    pins: 16,
    description:
      '把 8 路模拟输入转换为 10 位数字结果，通过 SPI 读取。 10 位转换对应 1024 个数字码，实际电压范围由参考电压等条件决定。',
    specs: [
      ['分辨率', '10 bit'],
      ['输入通道', '8'],
      ['接口', 'SPI'],
      ['供电', '2.7–5.5 V'],
    ],
    uses: ['电位器读取', '多路传感器', '模拟信号采样'],
    tip: '10 位 ADC 有 1024 个量化等级。输入范围、参考源质量和采样速度都会影响结果。',
    pinNotes: [
      ['CH0–CH7', '8 个模拟输入通道。'],
      ['VREF', '参考电压，决定转换量程。'],
      ['CLK / DIN / DOUT / CS', 'SPI 时钟、数据输入输出与片选。'],
      ['AGND / DGND', '模拟地与数字地，按手册规划连接。'],
    ],
    steps: [
      '把待测电压接入选定通道。',
      '控制器通过 SPI 启动采样。',
      '读取 10 位结果，依据 VREF 换算电压。',
    ],
    source: 'https://www.microchip.com/en-us/product/MCP3008',
  },
  {
    id: 'uno',
    name: 'Arduino Uno R3',
    subtitle: '经典 8 位开发板',
    kind: 'module',
    family: '开发与实验',
    package: '开发板 · Uno',
    shape: 'uno',
    pins: 28,
    description:
      '将 ATmega328P、USB 接口、电源和易接线的排母整合为入门开发平台。 板上提供 14 路数字 I/O 与 6 路模拟输入；这两组标签描述板级接口。',
    specs: [
      ['主控', 'ATmega328P'],
      ['系统时钟', '16 MHz'],
      ['逻辑电平', '5 V'],
      ['模拟输入', '6 路'],
    ],
    uses: ['编程入门', '交互装置', '传感器实验'],
    tip: '这块示意模型突出插座式 DIP 主控、USB Type-B 接口和扩展排母。实际接线依照 Uno R3 引脚图。',
    pinNotes: [
      ['数字 0–13', '数字 I/O，其中一部分支持 PWM。'],
      ['A0–A5', '模拟输入，也可复用为数字接口。'],
      ['5V / 3.3V / GND', '电源输出与地，注意各路电流限制。'],
      ['USB / ICSP', '程序下载、串口与直接编程接口。'],
    ],
    steps: [
      '通过 USB 连接电脑并选择 Uno 开发板。',
      '编写 setup 和 loop 程序。',
      '下载后连接按钮或 LED，观察输入输出。',
    ],
    source: 'https://docs.arduino.cc/hardware/uno-rev3/',
  },
  {
    id: 'pico',
    name: 'Raspberry Pi Pico',
    subtitle: 'RP2040 开发板',
    kind: 'module',
    family: '开发与实验',
    package: '开发板 · 40P',
    shape: 'pico',
    pins: 40,
    description:
      '把 RP2040、外部 Flash、电源和 USB 集成起来，支持 C/C++ 与 MicroPython 项目。 40 位主接口包含 26 路多功能 GPIO，以及电源、接地等引脚。',
    specs: [
      ['主控', 'RP2040'],
      ['板载 Flash', '2 MB'],
      ['GPIO', '26 路'],
      ['逻辑电平', '3.3 V'],
    ],
    uses: ['MicroPython', 'USB 外设', '可编程 I/O'],
    tip: '板边半孔支持把整块 Pico 焊到载板上，也可以焊接排针使用。主控芯片和外部 Flash 是两个器件。',
    pinNotes: [
      ['GP0–GP28', '引出的 GPIO 编号有保留间隔，具体以引脚图为准。'],
      ['VSYS / VBUS / 3V3', '系统电源、USB 电源与 3.3 V 稳压输出。'],
      ['BOOTSEL', '按住后连接 USB，可进入程序下载模式。'],
      ['SWD', '独立的调试接口。'],
    ],
    steps: [
      '按住 BOOTSEL 接入 USB。',
      '将固件 UF2 文件复制到出现的存储设备。',
      '运行 MicroPython 或 C/C++ 程序控制外设。',
    ],
    source: 'https://datasheets.raspberrypi.com/pico/pico-datasheet.pdf',
  },
  {
    id: 'gy521',
    name: 'GY-521 模块',
    subtitle: 'MPU-6050 传感器转接板',
    kind: 'module',
    family: '开发与实验',
    package: '模块 · 8P',
    shape: 'sensor',
    pins: 8,
    description:
      '把 MPU-6050 与电源配套电路放在小板上，并引出易接线的接口。 GY-521 市售版本各有差异；购买与接线时按实物型号和板卡资料确认供电及逻辑电平。',
    specs: [
      ['核心器件', 'MPU-6050'],
      ['运动维度', '6 轴'],
      ['信号接口', 'I²C'],
      ['板型', '通用示意'],
    ],
    uses: ['姿态实验', '运动记录', '小车平衡'],
    tip: 'GY-521 有多种生产版本，模型为通用外形示意。资料链接提供同类 MPU-6050 模组的功能参考。',
    pinNotes: [
      ['VCC / GND', '模块电源与地，具体输入范围取决于板上电源设计。'],
      ['SCL / SDA', '主 I²C 时钟与数据。'],
      ['XDA / XCL', '辅助 I²C 接口。'],
      ['AD0 / INT', '地址选择与中断信号。'],
    ],
    steps: [
      '识别板上的 MPU-6050 与外围器件。',
      '核对模块电平，通过 I²C 连接控制器。',
      '读取加速度和角速度并进行校准。',
    ],
    source: 'https://www.joy-it.net/en/products/SEN-MPU6050',
  },
  {
    id: 'nrf24',
    name: 'nRF24L01+ 模块',
    subtitle: '2.4 GHz 无线收发模块',
    kind: 'module',
    family: '无线连接',
    package: '模块 · 8P',
    shape: 'radio',
    pins: 8,
    description:
      '通过 SPI 接收主控数据，再以 2.4 GHz 无线信号与另一端通信。 通信双方需采用兼容的协议与配置；电源和天线布局会影响链路表现。',
    specs: [
      ['频段', '2.4 GHz'],
      ['控制接口', 'SPI'],
      ['无线速率', '最高 2 Mbit/s'],
      ['芯片供电', '1.9–3.6 V'],
    ],
    uses: ['无线遥控', '短距数据传输', '传感器网络'],
    tip: '板端的曲折铜线是天线。两端使用匹配的频点、地址和速率，才可以建立数据链路。',
    pinNotes: [
      ['VCC / GND', '稳定的电源与地，发射时电流变化需要去耦。'],
      ['SCK / MOSI / MISO / CSN', 'SPI 配置与数据通信。'],
      ['CE', '控制接收、发射等工作状态。'],
      ['IRQ', '数据接收完成等事件中断。'],
    ],
    steps: [
      '通过 SPI 设置频点、地址与数据速率。',
      '将待发送数据装入发送缓冲区。',
      '另一模块接收数据并交给控制器。',
    ],
    source: 'https://www.waveshare.com/nrf24l01-rf-board-b.htm',
  },
  {
    id: 'tps61040',
    name: 'TPS61040DBVR',
    subtitle: '升压 DC/DC 转换器',
    kind: 'ic',
    family: '电源与驱动',
    package: 'SOT-23-5',
    shape: 'sot23',
    pins: 5,
    description:
      '通过开关动作、电感和二极管，把较低的直流输入升高。它配合反馈电阻设定输出电压，常用于小功率偏置电源。',
    specs: [
      ['输入', '1.8–6 V'],
      ['开关频率', '最高 1 MHz'],
      ['封装', 'SOT-23-5'],
      ['控制方式', '开关升压'],
    ],
    uses: ['LCD 偏置', '低功率升压', '电源学习'],
    tip: '五脚 SOT-23 一侧有三脚，另一侧有两脚。电感、二极管与电容都是升压电路的重要组成部分。',
    pinNotes: [
      ['SW', '开关节点，连接电感和整流二极管。'],
      ['FB', '反馈端，利用分压电阻设置目标电压。'],
      ['VIN / GND', '电源输入与地。'],
      ['EN', '使能控制。'],
    ],
    steps: [
      '开关导通时，电感储存能量。',
      '开关关断时，电感通过二极管向输出传送能量。',
      '反馈回路调节开关过程，维持目标电压。',
    ],
    source: 'https://www.ti.com/product/TPS61040',
  },
];
export const packageInfo: Record<
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
    name: '双列直插封装',
    description:
      '两侧排列长引脚，可穿过电路板孔洞焊接，也适合插入面包板。常见于经典逻辑芯片和入门实验。',
    feature: '两排长脚 · 顶部缺口 · 2.54 mm 常见脚距',
    mount: '通孔安装',
  },
  soic: {
    title: 'SOIC / SOP',
    name: '小外形封装',
    description:
      '两侧短引脚呈海鸥翼形，焊接在电路板表面。常见于运放、存储器、接口芯片。',
    feature: '两排弯脚 · 贴片安装 · 多种宽度',
    mount: '表面贴装',
  },
  tssop: {
    title: 'TSSOP',
    name: '薄型小外形封装',
    description:
      '较薄的塑料本体与细间距双侧引脚，常见于接口、驱动和逻辑芯片。部分型号底部带散热焊盘。',
    feature: '薄本体 · 细脚距 · 双侧引脚',
    mount: '表面贴装',
  },
  qfp: {
    title: 'LQFP',
    name: '薄型四边扁平封装',
    description:
      '四边均有向外伸出的引脚，能提供更多信号连接。STM32 等微控制器经常采用这种封装。',
    feature: '四边海鸥翼引脚 · 圆点定位 1 脚',
    mount: '表面贴装',
  },
  qfn: {
    title: 'QFN',
    name: '四边无引线扁平封装',
    description:
      '触点位于底部与侧边，部分设计中央带裸露焊盘，体积紧凑，常见于无线芯片和传感器。',
    feature: '底面焊盘 · 紧凑本体 · 短电气连接',
    mount: '表面贴装',
  },
  bga: {
    title: 'BGA',
    name: '球栅阵列封装',
    description:
      '底部排列焊球，与电路板焊盘连接。适用于高引脚数处理器与存储器，观察时翻转模型看底面。',
    feature: '底部焊球阵列 · 顶面引脚不可见',
    mount: '回流焊',
  },
  to220: {
    title: 'TO-220',
    name: '带散热片的功率封装',
    description:
      '金属散热片帮助导出热量，顶部安装孔可固定散热器。常见于稳压器、功率晶体管。',
    feature: '金属背板 · 安装孔 · 长引脚',
    mount: '通孔安装',
  },
  sot223: {
    title: 'SOT-223',
    name: '带大散热引脚的贴片封装',
    description:
      '本体一侧有小引脚，另一侧有较大的金属散热端。常见于低压差线性稳压器。',
    feature: '三只小脚 · 一块宽散热端',
    mount: '表面贴装',
  },
  sot23: {
    title: 'SOT-23-5',
    name: '微型五引脚封装',
    description:
      '小巧的贴片塑料封装，适合引脚较少的控制和电源芯片。SOT-23 系列还有其他引脚数量。',
    feature: '小本体 · 一侧三脚另一侧两脚',
    mount: '表面贴装',
  },
};
