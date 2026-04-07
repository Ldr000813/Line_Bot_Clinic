require('dotenv').config({ path: '.env.local' });
const { messagingApi } = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'MISSING_ACCESS_TOKEN',
};

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});

// Express（サーバー型）を廃止し、Vercelネイティブの「関数型（Serverless Function）」に書き換え
module.exports = async (req, res) => {
  // 1. 生存確認テスト用 (ブラウザからアクセスされた場合)
  if (req.method === 'GET') {
    return res.status(200).send('LINE Bot is running smoothly in Serverless mode!');
  }

  // 2. LINEからのWebhookを受信した場合
  if (req.method === 'POST') {
    try {
      // Vercelは自動でJSONをパースして req.body に格納します
      const events = req.body.events;

      // LINE管理画面での「検証(Verify)」ボタンを押した時は空のイベントが飛んでくるため、正常系200で即座に返す
      if (!events || events.length === 0) {
         return res.status(200).json({ status: 'Webhook verified' });
      }

      await Promise.all(events.map(async (event) => {
        // メッセージイベント、かつテキストメッセージ以外は無視
        if (event.type !== 'message' || event.message.type !== 'text') {
          return;
        }

        const replyText = "ご連絡ありがとうございます。\n当クリニックが必要と判断した際には対応時間内にスタッフから個別にメッセージをお送りする場合がございます。";

        const hostUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
          || process.env.VERCEL_URL
          || "your-ngrok-id.ngrok-free.app";
        const baseUrl = process.env.BASE_URL || `https://${hostUrl}`;

        const imageUrl = `${baseUrl}/time_table.png`;
        const previewUrl = `${baseUrl}/time_table.png`;

        await client.replyMessage({
          replyToken: event.replyToken,
          messages: [
            { type: 'text', text: replyText },
            { type: 'image', originalContentUrl: imageUrl, previewImageUrl: previewUrl }
          ],
        });
      }));

      // LINEプラットフォームに 200 OK を返す（必須）
      return res.status(200).json({ status: 'success' });
    } catch (err) {
      console.error('Error handling webhook:', err);
      // 万が一エラーになってもクラッシュさせない
      return res.status(500).json({ status: 'error' });
    }
  }

  // 許可されていないメソッド
  return res.status(405).send('Method Not Allowed');
};
