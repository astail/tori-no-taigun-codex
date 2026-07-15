# セキュリティ設計

## 公開リポジトリ前提

リポジトリ内の全ファイルは第三者に読まれる前提で設計する。APIキーやトークンを必要とする実行機能はなく、`.env`、秘密鍵、一般的な認証情報ファイルをGitから除外する。コミット前に追跡対象を検査する。

## ブラウザ側

- 実行可能コードは同一オリジンのES Moduleだけ
- `eval`、`new Function`、インラインスクリプトを不使用
- 外部CDN、広告、アクセス解析、WebSocket、外部API通信を不使用
- 音源fetchは `same-origin`、予期しないredirectは拒否
- X共有はユーザーがボタンを押した場合だけ新規画面へ遷移し、`noopener,noreferrer` を指定
- Cookie、Local Storage、Session Storage、IndexedDBを不使用
- ユーザー入力をHTMLとして挿入しない

HTMLのmeta CSPは、スクリプト・画像・音源・通信先を同一オリジンへ制限する。GitHub Pagesでは任意のレスポンスヘッダーを設定できないため、`frame-ancestors` はmeta CSPでは強制されないという制約がある。Docker／ローカル配信ではnginx／NodeのレスポンスヘッダーとしてCSP、`X-Frame-Options: DENY`、`nosniff`、Referrer Policy、Permissions Policyを付与する。

## CI/CD

- workflow全体の権限は `contents: read`
- Pages deploy jobだけ `pages: write` と `id-token: write`
- checkout時の認証情報永続化を無効化
- GitHub Actionsは可変タグでなくコミットSHA固定
- Dockerベースイメージはmulti-architecture digest固定
- CodeQLをpush、PR、週次で実行
- DependabotがActionsとDockerの更新PRを月次作成
- Pages artifactはテストと配布物検証を通った `dist/` だけ

## コンテナ

- マルチステージでビルドツールを最終イメージから除外
- `nginx-unprivileged` のUID 101で実行
- 8080番ポートのみ
- nginxバージョン表示を無効化
- ディレクトリ一覧なし、存在する静的ファイルだけ配信
- healthcheckあり

## GitHub設定

作成後に以下を有効化する。

- Public repository
- GitHub ActionsをPagesの公開元に設定
- Secret scanning と push protection
- Dependency graph／vulnerability alerts
- Private vulnerability reporting
- mainブランチと `github-pages` environmentの保護（利用可能な範囲）

## 既知の制約

静的Webゲームのタイミング精度は端末、Bluetooth音声、ブラウザのオーディオ遅延に影響される。個人データを扱わないため機密性リスクは小さいが、GitHub Pagesでは独自レスポンスヘッダーを完全には制御できない。より強いヘッダー制御が必要なら、同梱Dockerイメージを管理下のHTTPS環境で配信する。
