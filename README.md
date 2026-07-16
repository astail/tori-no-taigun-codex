# トリ・ステップ・パレード

```
╭─────────────────────────────────────────────────╮
│ >_ OpenAI Codex (v0.144.4)                      │
│                                                 │
│ model:     gpt-5.6-sol xhigh   /model to change │
│ directory: ~/git/tori-no-taigun-codex           │
╰─────────────────────────────────────────────────╯

30m
```


群れの足音に合わせて、スペース・クリック・タップで遊ぶ1ボタンのオリジナルリズムゲームです。約66秒、全50入力。`PERFECT = 2点`、`GOOD = 1点`、`MISS = 0点`で満点は100点です。

公開URL: <https://astail.github.io/tori-no-taigun-codex/>

## 特徴

- PCはスペース／クリック、スマートフォンはタップに対応
- 成功・通常・失敗・しゃがみ・飛翔・着地・フィニッシュの鳥モーション
- 約66秒のオリジナルBGMと「ピーピャコ　ピャッコ　ビャー！　ビャー！！」を音型化した鳥声SE
- 早い／ジャスト／遅いを可視化する下段タイミングモニター
- 50判定で厳密に満点100点
- Xへの結果共有（ユーザー操作時のみXの投稿画面を開く）
- 保存・Cookie・アクセス解析・外部APIなし

## ローカル実行

Node.js 22以上を使用します。外部パッケージはありません。

```bash
npm ci
npm run check
npm run preview
```

ブラウザで <http://localhost:4173> を開きます。

音源を再生成する場合:

```bash
npm run audio
```

## Docker

```bash
docker build -t tori-step .
docker run --rm -p 8080:8080 tori-step
```

ブラウザで <http://localhost:8080> を開きます。イメージはdigest固定のマルチステージビルドで作成され、最終コンテナは非rootで実行します。

## テスト

```bash
npm test       # 採点境界、50ノート、音源、画像、セキュリティ不変条件
npm run check  # test + build + 配布物検証
```

GitHub Actionsでは上記に加え、Dockerビルド、非root確認、HTTPスモークテスト、CodeQLを実行します。`main`へのpushがすべて通るとGitHub Pagesへデプロイされます。

## ドキュメント

- [ゲーム仕様](docs/SPECIFICATION.md)
- [設計](docs/ARCHITECTURE.md)
- [素材と権利](docs/ASSETS.md)
- [セキュリティ設計](docs/SECURITY.md)
- [参考調査](docs/RESEARCH.md)
- [テスト方針](docs/TESTING.md)

## 権利について

本作は「一定のリズムを刻む」「音の合図で群れが動く」というゲームデザイン上の着想を参考にした、非公式のオリジナル作品です。任天堂の画像、音声、楽曲、プログラムは使用していません。「リズム天国」は任天堂の商標です。本作は任天堂および同シリーズとは関係ありません。

リポジトリにライセンスファイルは置いていません。公開されていること自体は、コードや素材の再利用許諾を意味しません。
