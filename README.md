# IC Atlas · Electronics Learning Lab / 电子元件学习实验室

A local Three.js learning workbench with English as the default language and Chinese translations. Explore **200 component categories**, **100 representative devices** and **16 common package types**. The category list follows all 200 entries supplied for this project, organized into 13 functional groups.

本地 Three.js 电子学习工作区，默认英文，支持中文切换。名称与概述提供双语对照；参数、用途、引脚笔记、学习路径及模型标注随语言切换，语言偏好保存在本机。搜索同时匹配中英文，兼容常见连字符形式。

**[Launch the live 3D lab](https://vaenshine.github.io/ic-atlas/)** · **[打开在线实验室](https://vaenshine.github.io/ic-atlas/)**

Open the website and select a category to rotate, zoom, reveal its structure and read bilingual learning notes. Everything runs in your browser; manufacturer references open their original sources.

## GitHub Pages

The live demo is a static React + Three.js build of the same workbench used locally. The `web/` entry and `vite.pages.config.ts` package the shared application for GitHub Pages. Local development continues to use Vinext.

The [Publish IC Atlas workflow](.github/workflows/pages.yml) validates pull requests and publishes changes to `main`. Repository Pages settings use **GitHub Actions**. The workflow automatically adds the repository name to asset paths, so forks can deploy under their own names.

```sh
npm run build:pages
npm run check:pages
```

These commands produce and validate `dist/pages/` for a root URL. To reproduce this project's repository URL on macOS/Linux:

```sh
IC_ATLAS_BASE_PATH=/ic-atlas npm run build:pages
IC_ATLAS_BASE_PATH=/ic-atlas npm run check:pages
```

On PowerShell, set `$env:IC_ATLAS_BASE_PATH = "/ic-atlas"` before running the two npm commands. Upload only `dist/pages/` to a static host. A user/organization site named `username.github.io` uses an empty base path. For a custom domain, adjust the workflow's base-path step for that domain's root.

## Run locally / 本地运行

Double-click `启动芯片实验室.command`, or run:

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:3000/**. Pages, geometry, learning data and fonts are served locally. Manufacturer links open external reference material. Closing the launcher terminal stops its server.

双击启动脚本即可打开本地页面。生产运行使用 `npm run build` 后执行 `npm start`，服务绑定本机回环地址。

## Explore / 学习与操作

- **Categories / 类别**: 200 bilingual families covering passives, protection, discrete semiconductors, power, processors, logic, memory, analog conversion, wired interfaces, RF, timing, sensors, optoelectronics, connectors and modules.
- **Devices / 型号**: 100 specific examples with preserved specifications, pin notes, use cases and manufacturer references. Category cards link to matching device examples where available.
- **Packages / 封装**: 16 package guides including DIP, SOIC, TSSOP, LQFP, QFN, BGA, TO-220, SOT-223, SOT-23, DO-35, DO-41, SMA and TO-92 variants.

Drag to rotate, scroll to zoom, and right-drag to pan. Touch screens use one finger to rotate and two to zoom or pan. With focus in the scene, arrow keys rotate, `+` / `-` zoom and `0` resets. `/` opens search; `Esc` exits enlarged viewing.

工具栏提供总览、顶视图、底视图、缩放与全屏。自动旋转、结构标注和展开滑块辅助观察内部结构。总览按当前筛选显示展品，点击模型进入独立观察。LED、RGB LED、贴片可寻址 RGB LED、轻触开关及滑动开关提供状态演示。

Four guided paths cover basic components, package recognition, development boards and the sensor-to-control signal chain. Learning notes include Overview, Structure and Applications tabs.

## Implementation / 实现

- `app/data/profiles.json`: all 200 categories, bilingual learning notes, representative shapes and links to existing devices.
- `app/catalog.ts`, `app/data/basic.json`, `analog.json`, `digital.json`: the original 100 device examples and Chinese package guides.
- `app/data/translations.json`, `app/i18n.ts`, `app/lessons.ts`: English device content, translated UI/model labels, package guides and learning paths.
- `app/atlas.ts`: category/device lookup, localization and bilingual search normalization.
- `app/models.ts`, `app/family-models.ts`, `app/special-models.ts`, `app/model-utils.ts`: procedural geometry for IC leads and solder balls, PCB assemblies, windings, layered capacitors, optical packages, relay mechanisms and connector contacts.
- `app/scene.tsx`: rendering, OrbitControls, ray picking, annotation projection, structure expansion and resource disposal.

The 200-category catalog uses 88 representative geometry variants. Gallery geometry is merged by material; BGA balls are instanced. Switching models releases geometry, materials and textures. Reduced-motion preferences are respected, and the page provides a WebGL fallback message.

## Validation / 检查

```sh
npx tsc --noEmit
npm run check:models
npm run check:catalog
npm run build
```

Checks cover the exact requested category list, translation completeness, bilingual search, numeric specification preservation, finite geometry, lead/contact/ball counts, translated labels, exploded views and gallery geometry. A minimal canvas shim supports geometry checks without requiring WebGL; rendered appearance is outside these checks.

To extend the catalog, add a bilingual record to `profiles.json`, select a matching `Shape`, implement a geometry variant when needed, and add translated structural labels. Keep generic families and exact device examples separately identified.

## Learning scope / 教学范围

Models illustrate representative external forms and simplified internal structures. Dimensions, die layouts, bond wires, PCB traces and markings are educational approximations. Check the selected manufacturer, exact part number and board revision for dimensions, pin numbering, ratings, wiring and layout. Category-level examples show a common construction; a family can span several package types.

模型用于理解典型外形、基本结构及用途。实际尺寸、脚号、电气连接、额定值和布局以所选厂商、具体料号与硬件版本的数据手册为准。

## License and sources

Original application code, procedural geometry and original explanatory content are available under the [MIT License](LICENSE). Third-party dependencies retain their licenses; complete notices are included in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the static site. Each build also generates `bundled-dependencies.json` with the exact bundled dependency licenses.

Manufacturer names, product identifiers and source links identify examples and reference material. Linked documents and trademarks retain their respective owners' rights. Model construction and reference links are maintained in source so contributors can check and improve accuracy.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow and data/model checks.
