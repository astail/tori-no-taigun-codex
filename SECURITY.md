# セキュリティポリシー

## 脆弱性の報告

脆弱性を見つけた場合は、公開 Issue に詳細を書かず、GitHub の **Private vulnerability reporting** から報告してください。公開前に影響範囲と修正方法を確認します。

## 対象

`main` ブランチの最新バージョンをサポート対象とします。このサイトは個人情報を収集・保存・送信せず、ゲーム結果もページ更新時に破棄されます。

## 公開時の安全策

- 外部JavaScript、CDN、アクセス解析、広告を使用しない
- Content Security Policy と追加のHTTPセキュリティヘッダーを設定
- GitHub Actions と Docker ベースイメージをコミット／digestで固定
- CI、CodeQL、Dependabot、secret scanning を利用
- コンテナは非rootユーザー（UID 101）で実行

詳細は [`docs/SECURITY.md`](docs/SECURITY.md) を参照してください。
