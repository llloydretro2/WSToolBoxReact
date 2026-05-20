# CardToolBox 前端

基于 React + Vite 打造的卡牌与桌游多合一工具集，提供 Weiss Schwarz 卡片查询与对战辅助、日麻役种/牌效/牌桌中枢工具，以及骰子、棋钟等通用桌游工具。

## 常用命令

```bash
npm run dev
npm run lint
npm run test:mahjong
npm run build
```

## 麻将测试

```bash
npm run test:mahjong:core
npm run test:mahjong:yaku
npm run test:mahjong
```

- `test:mahjong:core`：向听、和牌、牌效、符、点数。
- `test:mahjong:yaku`：普通役种与役满检测。
- `test:mahjong`：完整麻将回归测试，包含 Python 参考结果对照的牌效验证。
