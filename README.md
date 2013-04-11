# Realtime streaming server for samepot-web

[samepot-web](https://github.com/proto-apps/samepot-web)のリアルタイム処理を捌くサーバー


## セットアップ

必要なモジュールをインストール

```sh
$ npm install
```

### 使っているモジュール

* Bowl (クラスタ化)
* Socket.IO (Websocket)
* Redis (接続管理、PubSub)
* Winston (ロガー)

### サーバ起動

開発とリリースの違いはログ出力レベルの設定  
デーモン化したい場合はForeverやSupervisorを使って起動

### development

```sh
$ npm start
```

### production

```sh
$ NODE_ENV=production npm start
```
