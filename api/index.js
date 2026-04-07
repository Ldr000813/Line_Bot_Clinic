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

        const userMessage = event.message.text.trim();
        let messagesToSend = [];

        // 全体で共通利用するベースURLと画像URLの定義
        const hostUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
          || process.env.VERCEL_URL
          || "your-ngrok-id.ngrok-free.app";
        const baseUrl = process.env.BASE_URL || `https://${hostUrl}`;

        const imageUrl = `${baseUrl}/time_table.png`;
        const previewUrl = `${baseUrl}/time_table.png`;

        if (userMessage === "新患予約") {
          // 「新患予約」に対する3通の回答
          const msg1 = "下記①〜③の手順で操作されない場合、確認後自動キャンセルになります。また初診予約日の二日前にLINEでリマインダを送信しますのでご対応ください。期限までに反応がない場合は自動キャンセルになります。";
          const msg2 = "①・〈保険証〉や〈資格確認証〉で受診される方はカードを写真に撮り、お送りください。\n　・〈マイナ保険証〉で受診される方はマイナポータルの健康保険証画面にある、資格情報のスクリーンショットをお送りください。1画面に情報が収まらない場合は複数枚のスクリーンショットを撮ってお送りください。\n\n②次に、下記の〈問診票〉フォームに必要事項を入力の上、送信してください。\n\n【問診票フォーム】\nhttps://forms.office.com/r/Vsyy9hpA72\n\n③1，2が完了後、下記〈予約サイト〉のメニュー選択で「新患予約」でご予約ください。\n\n【予約サイト】\nhttps://airreserve.net/reserve/calendar/";
          const msg3 = "⚠️ご注意\n当院での受診意思のある方は、当院LINE公式アカウントをブロックや削除しないでください。\n\n患者さんからのお問い合わせと同様に、当院から患者さんへのご連絡（※）も原則LINEのトークで行っております。\n\n（※）当院からのご連絡は、基本的に次の3種類です。\n・初診予約をされている方への事前リマインド\n・台風など災害でやむを得ず臨時休診とする場合の事前連絡\n・その他、当院が必要と判断した場合のご連絡\n\n当院LINE公式アカウントをブロックや削除されると、当院から患者さんへメッセージが送信できなくなります。\nその場合「当院での受診の意思なし」と判断せざるを得ず、予約自動キャンセル等の処理をさせていただくことになります。\n\n当院での受診意思のある方は、通院中は必ず当院LINE公式アカウントの〈お友だち〉状態を維持してください。\n誤って削除などされた場合は、〈お友だち〉の追加をし直してください。\n\nトーク一覧画面にて、当院LINE公式アカウントがある状態を隠したい場合は「非表示」でご対応ください。";

          messagesToSend = [
            { type: 'text', text: msg1 },
            { type: 'text', text: msg2 },
            { type: 'text', text: msg3 }
          ];
        } else if (userMessage === "再診予約") {
          // 「再診予約」に対する2通の回答（テキスト＋画像）
          const msg1 = "2回目以降の受診の方（なんらかの事情で再診を受診できなかった方を含む）が対象です。\n病状悪化防止のため原則的に毎日お薬を飲んだ計算でお薬が切れる前の日時に予約されることをお勧めします。\n\n下記〈予約サイト〉のメニュー選択で「再診予約」でご予約ください。\n\n【予約サイト】\nhttps://airreserve.net/reserve/calendar/\n【重要】「再診予約」以外に入れないでください。\n※予約が無効になります。\n\n空き枠は随時更新されますが、直近では予約が取れないこともありますので、お早めにご予約ください。\n\n予約当日は、受付をする余裕（5分程度）をもってご来院ください。";

          messagesToSend = [
            { type: 'text', text: msg1 },
            { type: 'image', originalContentUrl: imageUrl, previewImageUrl: previewUrl }
          ];
        } else {
          // それ以外のメッセージに対するデフォルトの回答
          const replyText = "ご連絡ありがとうございます。\n当クリニックが必要と判断した際には対応時間内にスタッフから個別にメッセージをお送りする場合がございます。";

          messagesToSend = [
            { type: 'text', text: replyText },
            { type: 'image', originalContentUrl: imageUrl, previewImageUrl: previewUrl }
          ];
        }

        await client.replyMessage({
          replyToken: event.replyToken,
          messages: messagesToSend
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
