# Cloudflare OS フォーク

本家リポジトリ: [cloudflare/cloudflare-os](https://github.com/cloudflare/cloudflare-os)

## 本家からの変更点

- Durable Objectの再起動後も確実に復旧できるよう、再開したエージェントターンを完了まで維持。
- ChatGPT subscriptionでCodexモデルを利用できるよう、ユーザー単位のdevice flow OAuth認証を追加。
- access tokenの期限切れ時に、refresh tokenを使って自動更新。
- Cloudflare Workers上でOAuthフローが動作するよう、Bun向けOAuthフローを登録してbundleへ組み込み。
