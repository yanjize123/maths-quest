# content/ — 数学游戏内容（P-20261126-maths-game）

格式定义只在 `yanjize123/claude/projects/P-20261126-maths-game/data_model.md`，这里不复述。

- `skills.csv` 知识点（骨架按中国教材顺序，cn_order；英国课程映射在 maps）
- `misconceptions.csv` 错误理解；`buggy_rule` 对应根目录 `rules.js` 中的同名函数
- `items/levelNN.json` 题目模板（第 1 关：level01.json）
- 测试：`node tests/test_content.js`（改动内容后必须全部通过）

状态：全部为 hypothesised（未经教师审核、未经学生数据验证）；cn_order 的单元号待核。
