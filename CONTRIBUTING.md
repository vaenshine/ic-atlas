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

The static build runs `npm run check:updates` first. Updater tests use isolated temporary Git repositories and stub dependency installs; HTTP tests cover the local control endpoints and restart behavior. Keep the upstream URL fixed, preserve local changes and Git history, and require a same-origin session token for installation. Test changes to updater behavior in temporary checkouts. The page version and public `version.json` are generated from `package.json` and the build's Git revision.

中文：欢迎修正知识、补充双语说明和改进模型。器件事实请提供厂商来源，翻译保留单位与适用条件，新增第三方素材请核对再分发许可并附署名。提交前运行上述检查。

静态构建会先运行 `npm run check:updates`。更新测试使用隔离的临时 Git 仓库和模拟依赖安装，HTTP 测试覆盖本地接口与重启流程。更新逻辑需固定官方来源、保留本地修改与 Git 历史，并要求安装请求携带同源会话令牌。请在临时副本中测试更新行为。页面版本与公开 `version.json` 由 `package.json` 和构建时的 Git 提交生成。
