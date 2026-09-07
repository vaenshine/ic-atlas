# Contributing to IC Atlas

Contributions are welcome for electronics accuracy, English/Chinese explanations, accessible controls and procedural 3D geometry.

1. Fork the repository and create a topic branch.
2. Keep English and Chinese category records aligned. Preserve qualifications and units when translating specifications.
3. Cite a primary manufacturer source for device behavior, specifications or package facts. Link to datasheets and product pages; add third-party media only when its license permits redistribution, with its attribution.
4. Label representative family geometry as educational illustration. Match visible contacts to the selected example and update structural labels in both languages.
5. Run the checks below and describe the user-visible change in your pull request.

```sh
npx tsc --noEmit
npm run check:models
npm run check:catalog
npm run build:pages
npm run check:pages
```

`app/data/profiles.json` contains the 200-category baseline; `app/data/translations.json` translates existing device records. `scripts/fixtures/requested-categories.json` preserves the original category checklist. Coordinate additions to that baseline with corresponding fixture updates. Use `app/family-models.ts` or `app/special-models.ts` for new physical forms.

Pull requests run validation and static-build checks. Updates merged to `main` publish the live GitHub Pages workbench. Contributions to original project material are distributed under the MIT license; third-party material retains its own license.

中文：欢迎修正知识、补充双语说明和改进模型。器件事实请提供厂商来源，翻译保留单位与适用条件，新增第三方素材请核对再分发许可并附署名。提交前运行上述检查。
