# アーキテクチャ

## 方針

GitHub Pagesで安全に配信できる、依存パッケージなしの静的サイトとした。ビルドはファイルを検査して `dist/` へコピーするだけで、実行時のサーバー処理や外部APIはない。

## 構成

| ファイル | 責務 |
| --- | --- |
| `src/game-engine.js` | 譜面、判定窓、得点、未入力MISS、結果文言 |
| `src/audio-engine.js` | WAV読み込み、Web AudioでのBGM／SE同時スケジュール、クロック、一時停止 |
| `src/app.js` | DOM、入力、描画、モーション、結果ダイアログ、X Web Intent |
| `scripts/generate-audio.mjs` | BGMと鳥声SEの決定的なPCM合成 |
| `scripts/build.mjs` | シンボリックリンクと中間素材を除外した静的ビルド |
| `scripts/verify-build.mjs` | 必須配布物とCSP／インラインスクリプト不在の確認 |
| `scripts/serve.mjs` | ローカル用のセキュリティヘッダー付き静的サーバー |

## 時刻同期

入力判定の基準を `requestAnimationFrame` や `Date.now()` にせず、BGMを再生する `AudioContext.currentTime` に統一する。

1. BGMとSEを先にデコードする。
2. 開始操作でAudioContextを再開する。
3. BGM開始を現在時刻の160ms後へ予約する。
4. 6回の鳥声SEも同じ開始基準から事前予約する。
5. 入力時は `AudioContext.currentTime - startAt` を譜面時刻と比較する。

この構造により、描画フレームが一時的に遅れても音声と採点基準はずれない。タブ非表示時はAudioContextをsuspendするため、再開後も基準時刻を維持できる。

## 状態

- `loading`: 音源取得・デコード中
- `ready`: 開始可能
- `playing`: 入力受付・採点中
- `paused`: タブ非表示などによる一時停止
- `finished`: 結果表示

`RhythmSession` はDOMを参照しない純粋な採点オブジェクトで、Node.js標準テストから直接検証できる。

## 配布

`npm run build` が `dist/` を作り、Pages workflowがそのディレクトリだけをartifactとして渡す。リポジトリ全体や中間画像は公開サイトへ含めない。相対URLを使うため、リポジトリ名を含むGitHub Pagesのサブパスでも動作する。

DockerはNodeによるビルドと非root nginxによる配信の2段階で、最終イメージにソース、テスト、Node.jsを含めない。
