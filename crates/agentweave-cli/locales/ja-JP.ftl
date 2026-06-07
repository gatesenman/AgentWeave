## AgentWeave CLI — 日本語

app-name = AgentWeave
app-description = 統一クロスベンダーAIエージェント構成管理
app-long-description = AgentWeave - クロスベンダー統一エージェント構成管理システム。
    一度定義して、すべてのベンダーに生成。AIコーディングツール間のシームレスな移行。

# コマンド
cmd-init = プロジェクトのAgentWeave構成を初期化
cmd-generate = ベンダー固有の構成ファイルを生成
cmd-validate = AgentWeave構成を検証
cmd-diff = バージョンまたはベンダー間の構成差分を表示
cmd-watch = 構成変更を監視して自動再生成
cmd-import = 既存のベンダー構成をAgentWeave形式にインポート
cmd-vendors = サポートされているベンダーとその機能を一覧表示
cmd-status = 現在の構成ステータスを表示
cmd-sync = 複数のIDEにわたってリアルタイムで構成を同期

# 初期化
init-success = { $path } にAgentWeaveプロジェクト '{ $name }' を初期化しました
init-created-dirs = 構成ディレクトリを作成しました

# 生成
generate-start = { $vendor } の構成を生成しています...
generate-all = すべてのターゲットベンダーの構成を生成しています...
generate-success = { $vendor } 構成を正常に生成しました
generate-no-targets = ターゲットベンダーが構成されていません。agentweave.yamlにtargetsを追加してください
generate-complete = 生成完了：{ $count } ベンダーを処理しました

# 検証
validate-success = 構成は有効です
validate-error = 検証エラー：{ $error }

# インポート
import-start = { $vendor } から構成をインポートしています...
import-success = { $vendor } 構成を正常にインポートしました
import-no-adapter = ベンダー '{ $vendor }' のアダプターが見つかりません

# ベンダー
vendors-header = サポートされているベンダー：
vendors-row = { $name } — { $concepts } コンセプトをサポート

# ステータス
status-header = AgentWeave ステータス
status-project = プロジェクト：{ $name }
status-agents = エージェント：{ $count }
status-rules = ルール：{ $count }
status-skills = スキル：{ $count }
status-hooks = フック：{ $count }
status-mcp = MCPサーバー：{ $count }
status-targets = ターゲット：{ $targets }

# 監視と同期
watch-start = { $path } の変更を監視しています...
watch-dev = （開発中の機能 - notifyクレートを使用してファイルシステムイベントを監視します）
sync-start = '{ $mode }' モードで同期を開始しています...
sync-dev = （開発中の機能）

# 差分
diff-label = 差分：{ $from } → { $to }
diff-dev = （開発中の機能）

# エラー
error-config-not-found = { $path } に構成が見つかりません。まず 'agentweave init' を実行してください。
error-vendor-unknown = 不明なベンダー：{ $vendor }

# ガバナンス
governance-policy-violation = ポリシー違反：{ $message }
governance-quota-exceeded = クォータ超過 { $subject }/{ $resource }：{ $current }/{ $limit }
governance-permission-denied = アクセス拒否：ユーザー '{ $user }' に '{ $permission }' 権限がありません
