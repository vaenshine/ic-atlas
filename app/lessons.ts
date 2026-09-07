export const lessonsZh = [
  {
    title: '认识基础器件',
    description: '二极管 → 三极管 → LED → 开关与连接器',
    ids: ['1n4148', '2n3904', 'led-red-5mm', 'tactile-6x6', 'usb-c-24'],
    tips: [
      '二极管的色环用于识别阴极。对照引脚资料分清电流方向。',
      '三极管由三个端子控制电流。TO-92 的脚序取决于具体型号。',
      '点击点亮按钮观察发光状态，实际电路需要串联限流电阻。',
      '点击按下和松开，观察按钮行程；四脚轻触开关分成两个常通脚组。',
      'USB-C 插座内部有双面触点，金属壳负责屏蔽和机械固定。',
    ],
  },
  {
    title: '从外形认识封装',
    description: '定位 1 脚 → 看引脚排列 → 观察底面',
    ids: ['ne555', 'stm32', 'rp2040', 'am3358'],
    tips: [
      '找到芯片顶端的缺口。顶视图中，左上角是 1 脚。',
      '这颗芯片有四排细脚。数一边的引脚，再乘以四。',
      'QFN 的连接点在底面。点击右侧“底视图”观察焊盘。',
      'BGA 的底面铺满焊球。点击底视图，再尝试放大。',
    ],
  },
  {
    title: '理解一块开发板',
    description: '主控芯片 → 无线模组 → 完整开发板',
    ids: ['stm32', 'wroom', 'esp32dev'],
    tips: [
      '单片机把处理器、存储器与外设集成在芯片里。拖动“结构展开”，看封装内部示意。',
      '无线模组集成了芯片、时钟、Flash 和天线。展开结构，观察屏蔽罩下面。',
      '开发板增加电源、USB 和排针，方便连接电脑与外部器件。',
    ],
  },
  {
    title: '沿着信号学习电路',
    description: '传感器 → 信号处理 → 采样 → 控制输出',
    ids: ['mpu6050', 'lm358', 'mcp3008', 'stm32', 'drv8833'],
    tips: [
      '传感器将物理运动转换为电信号。MPU-6050 内部集成了采样与数字接口。',
      '微弱的模拟传感器信号，可以先由运放放大。',
      'ADC 将模拟电压转换成数值。查看“典型应用”了解采样过程。',
      '单片机读取数据，并根据程序作出判断。',
      '电机驱动芯片把控制信号转换成带动电机所需的电流。',
    ],
  },
];

export const lessonsEn = [
  {
    title: 'Meet basic components',
    description: 'Diode → transistor → LED → switch → connector',
    ids: lessonsZh[0].ids,
    tips: [
      'Find the band marking the diode cathode, then check the datasheet for polarity.',
      'A BJT controls current through three terminals. The lead order of TO-92 devices depends on the part number.',
      'Use the light button to explore the LED. A real circuit needs a current-limiting resistor.',
      'Press and release the button to observe its travel. A four-lead tactile switch has two internally connected pairs.',
      'A USB-C receptacle has contacts on both faces. Its metal shell provides shielding and mechanical support.',
    ],
  },
  {
    title: 'Read a package by its shape',
    description: 'Find pin 1 → inspect the leads → look underneath',
    ids: lessonsZh[1].ids,
    tips: [
      'Locate the notch at the top of this DIP package. In this top view, pin 1 is at the upper left.',
      'This package has leads on four sides. Count one side and multiply by four.',
      'QFN connections sit underneath. Select Bottom view to inspect the pads.',
      'BGA connections form a grid of solder balls. Select Bottom view and zoom in.',
    ],
  },
  {
    title: 'Understand a development board',
    description: 'Microcontroller → wireless module → development board',
    ids: lessonsZh[2].ids,
    tips: [
      'A microcontroller integrates a processor, memory and peripherals. Use Explode to explore the package structure.',
      'A wireless module brings together a chip, clock, Flash and antenna. Lift the shield with the Explode slider.',
      'A development board adds power circuitry, USB and headers for connecting a computer and external components.',
    ],
  },
  {
    title: 'Follow a signal through a circuit',
    description: 'Sense → condition → sample → control → drive',
    ids: lessonsZh[3].ids,
    tips: [
      'A sensor converts physical motion into an electrical signal. The MPU-6050 includes sampling and a digital interface.',
      'An op amp can amplify a weak analog sensor signal before sampling.',
      'An ADC converts an analog voltage into a number. Open Applications to follow the sampling process.',
      'A microcontroller reads data and makes decisions by running a program.',
      'A motor driver converts control signals into the current needed to move a motor.',
    ],
  },
];
