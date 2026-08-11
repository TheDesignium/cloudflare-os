# Cloudflare OS フォーク

本家リポジトリ: [cloudflare/cloudflare-os](https://github.com/cloudflare/cloudflare-os)

## 本家からの変更点

- Workshop、Context、組み込みGatekeeper、Schedulerを対象とした、デプロイ全体のユーザーデータリセット機構を追加。
- Durable Objectの再起動後も確実に復旧できるよう、再開したエージェントターンを完了まで維持。
