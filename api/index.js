require('dotenv').config({ path: '.env.local' });
const express = require('express');
const { middleware, messagingApi } = require('@line/bot-sdk');

// 環境変数の読み込み確認 (Vercelで設定されていないとGlobalでクラッシュするためフォールバックを配置)
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'MISSING_ACCESS_TOKEN',
  channelSecret: process.env.LINE_CHANNEL_SECRET || 'MISSING_SECRET',
};

// Messaging API クライアントの初期化
const client = new messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});

const app = express();

// Webhook エンドポイント (Vercelのパス書き換えに関わらず全てキャッチする)
app.post('*', middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// ブラウザアクセス時の生存確認用
app.get('*', (req, res) => {
  res.send('LINE Bot is running smoothly!');
});

// イベントごとの処理
async function handleEvent(event) {
  // メッセージイベント、かつテキストメッセージ以外は無視
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  // 自動返信のメッセージ内容
  // 「どんなメッセージに対しても、以下のように返しなさい」
  const replyText = "ご連絡ありがとうございます。\n当クリニックが必要と判断した際には対応時間内にスタッフから個別にメッセージをお送りする場合がございます。";

  // Vercel本番環境、またはローカル（Ngrok等）のベースURLを判定
  const hostUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    || process.env.VERCEL_URL
    || "your-ngrok-id.ngrok-free.app"; // ローカルテスト時はここのNGROK URLを書き換えるか、環境変数BASE_URLをご利用ください
  const baseUrl = process.env.BASE_URL || `https://${hostUrl}`;

  // publicフォルダに配置した画像ファイルの名前を指定
  const imageUrl = `${baseUrl}/time_table.png`;
  const previewUrl = `${baseUrl}/time_table.png`;
  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [
      {
        // 1つ目のメッセージ（文章）
        type: 'text',
        text: replyText,
      },
      {
        // 2つ目のメッセージ（画像）
        type: 'image',
        originalContentUrl: imageUrl,
        previewImageUrl: previewUrl,
      }
    ],
  });
}

// Vercel用にExpressアプリをエクスポート
module.exports = app;
