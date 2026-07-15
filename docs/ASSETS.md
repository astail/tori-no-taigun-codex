# 素材と権利

## 方針

任天堂および「リズム天国」シリーズの画像、音源、楽曲、プログラムを使用しない。ゲームルールの抽象的な着想だけを参考にし、キャラクター造形、配色、背景、BGM、SE、UIは新規制作した。

## 鳥スプライト

- 配布ファイル: `public/assets/images/bird-sprites.png`
- サイズ: 1536 × 1024、RGBA PNG
- 配置: 4列 × 2行、8ポーズ
- 制作方法: OpenAIの組み込み画像生成ツールで作成後、単色クロマキーをローカル除去
- 生成日: 2026-07-16

使用した最終プロンプト:

```text
Use case: stylized-concept
Asset type: 2D web rhythm-game character sprite sheet
Primary request: Create one original, cute, highly simplified orange shorebird character shown in eight clearly different animation poses: (1) marching with left foot forward, (2) marching with right foot forward, (3) perfectly synchronized proud pose, (4) comic stumble/failure with surprised face, (5) crouching before takeoff, (6) airborne with wings spread, (7) gentle landing with feet down, (8) happy finish pose. This is a new original character, not any existing game character.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for local background removal
Subject: the same small round-bodied orange bird in every frame, cream belly, dark navy beak and legs, tiny swept-back feather tuft, expressive dot eyes; no green in the bird
Style/medium: polished flat 2D vector-like game illustration, bold dark navy outlines, clean cel colors, readable at 120px
Composition/framing: exact 4-column by 2-row sprite sheet, one centered full-body pose per equal cell, consistent scale and baseline, generous padding, no panels or dividers
Color palette: burnt orange, warm cream, dark navy, small coral accent; do not use green in subject
Constraints: eight poses only; same character design and proportions in every cell; background must be one perfectly uniform #00ff00 color with no shadows, gradients, texture, reflections, floor plane, lighting variation, borders, labels, or separators; crisp edges; no cast shadow; no contact shadow; no text; no logos; no trademarks; no watermark
Avoid: resemblance to Rhythm Heaven or Nintendo bird characters, realistic feathers, extra characters, props, scenery, perspective distortion
```

クロマキー除去後に、透明角、輪郭、8ポーズ、色残りを目視確認した。生成直後のクロマキー付き中間画像は `.gitignore` とビルド除外規則の対象で、公開リポジトリ／公開サイトには含めない。

## BGM

- 配布ファイル: `public/assets/audio/flock-parade.wav`
- 長さ: 66.0秒
- 形式: 22,050Hz、16-bit、mono PCM WAV
- テンポ: 100 BPM
- 内容: オリジナルのコード進行、ベース、プラック音、打楽器、終止フレーズ

`scripts/generate-audio.mjs` が波形を数式合成する。録音物、サンプルパック、既存曲、生成AI音源を含まない。同じスクリプトから決定的に再生成できる。

## 鳥声SE

- 配布ファイル: `public/assets/audio/bird-call.wav`
- 長さ: 2.4秒
- 形式: 22,050Hz、16-bit、mono PCM WAV
- 内容: 「ピー / ピャコ / ピャッコ / ビャー！ / ビャー！！」を5つの上昇・下降チャープとして音型化

人の音声や既存ゲームのSEは使用していない。

## 背景とUI

CSSの単色、グラデーション、単純図形だけで描画する。外部フォント、アイコンセット、写真は読み込まない。
