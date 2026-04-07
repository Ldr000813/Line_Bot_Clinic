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
          const msg2 = "①・〈保険証〉や〈資格確認証〉で受診される方はカードを写真に撮り、お送りください。\n　・〈マイナ保険証〉で受診される方はマイナポータルの健康保険証画面にある、資格情報のスクリーンショットをお送りください。1画面に情報が収まらない場合は複数枚のスクリーンショットを撮ってお送りください。\n\n②次に、下記の〈問診票〉フォームに必要事項を入力の上、送信してください。\n\n【問診票フォーム】\nhttps://forms.office.com/r/Vsyy9hpA72\n\n③1，2が完了後、下記〈予約サイト〉のメニュー選択で「新患予約」でご予約ください。\n\n【予約サイト】\nhttps://airrsv.net/clinicbot/calendar";
          const msg3 = "⚠️ご注意\n当院での受診意思のある方は、当院LINE公式アカウントをブロックや削除しないでください。\n\n患者さんからのお問い合わせと同様に、当院から患者さんへのご連絡（※）も原則LINEのトークで行っております。\n\n（※）当院からのご連絡は、基本的に次の3種類です。\n・初診予約をされている方への事前リマインド\n・台風など災害でやむを得ず臨時休診とする場合の事前連絡\n・その他、当院が必要と判断した場合のご連絡\n\n当院LINE公式アカウントをブロックや削除されると、当院から患者さんへメッセージが送信できなくなります。\nその場合「当院での受診の意思なし」と判断せざるを得ず、予約自動キャンセル等の処理をさせていただくことになります。\n\n当院での受診意思のある方は、通院中は必ず当院LINE公式アカウントの〈お友だち〉状態を維持してください。\n誤って削除などされた場合は、〈お友だち〉の追加をし直してください。\n\nトーク一覧画面にて、当院LINE公式アカウントがある状態を隠したい場合は「非表示」でご対応ください。";

          messagesToSend = [
            { type: 'text', text: msg1 },
            { type: 'text', text: msg2 },
            { type: 'text', text: msg3 }
          ];
        } else if (userMessage === "再診予約") {
          // 「再診予約」に対する2通の回答（テキスト＋画像）
          const msg1 = "2回目以降の受診の方（なんらかの事情で再診を受診できなかった方を含む）が対象です。\n病状悪化防止のため原則的に毎日お薬を飲んだ計算でお薬が切れる前の日時に予約されることをお勧めします。\n\n下記〈予約サイト〉のメニュー選択で「再診予約」でご予約ください。\n\n【予約サイト】\nhttps://airrsv.net/clinicbot/calendar\n【重要】「再診予約」以外に入れないでください。\n※予約が無効になります。\n\n空き枠は随時更新されますが、直近では予約が取れないこともありますので、お早めにご予約ください。\n\n予約当日は、受付をする余裕（5分程度）をもってご来院ください。";

          messagesToSend = [
            { type: 'text', text: msg1 },
            { type: 'image', originalContentUrl: imageUrl, previewImageUrl: previewUrl }
          ];
        } else if (userMessage === "応答メッセージの使い方") {
          // 「応答メッセージの使い方」に対する2通の回答
          const msg1 = "使い方についてご説明します。\n\n対応人員の都合上個別の回答に限界がありますので、原則的に自動応答での回答のみとさせていただきます。\n\n簡単なメッセージには自動でお答えすることができますが、その範囲を超えるものに関してはご予約の上で受診時に直接お問い合わせください。";
          const msg2 = "【問い合わせ可能な回答内容】\n・予約\n・予約確認\n・キャンセル\n・遅刻\n・診療時間\n・支払い方法\n・ウェブサイト\n\n上記の文言を入力頂くと自動応答で回答が返信されます｡";

          messagesToSend = [
            { type: 'text', text: msg1 },
            { type: 'text', text: msg2 }
          ];
        } else if (userMessage === "予約") {
          const msg1 = `【はじめての方】
トーク画面下の「メニュー」を開き、左上の「新患予約」タブを選択していただき、返信内容をご理解・同意いただいた上で予約をお取りください。

【2回目以降の方】
トーク画面下の「メニュー」を開き、上の段真ん中の「再診予約」タブを選択していただき、返信内容をご理解・同意いただいた上で予約をお取りください。
なお、主治医との相談なく自己判断で通院を中断された場合については、同じ病名、同じ症状であっても、前回最終受診から3ヶ月以上経過していれば「初診扱い」となってしまう場合がありますのでご注意ください。`;

          messagesToSend = [
            { type: 'text', text: msg1 }
          ];
        } else if (userMessage === "予約確認") {
          const msg1 = `ご自分の入れられた診察予約日時のご確認は、予約時に当診療所から送られてきたメールに記載されていますので、ご自身でご確認ください。

※メールが無いというお問い合わせをよく頂きます｡
予約を完了されていますと「【こころのクリニック】 予約内容のご確認」という件名のメールが送信されています｡
ご自身のメールソフトの設定などによっては迷惑メールとして認識されてしまう可能性があります｡`;

          messagesToSend = [
            { type: 'text', text: msg1 }
          ];
        } else if (userMessage === "キャンセル") {
          const msg1 = `予約のキャンセルは、予約時に届いた確認メールの予約番号と認証キーを用いて、予約サイトにてご自身で行っていただけます。その後、次回予約を予約サイトにてお取りください。
予約当日にキャンセルされる場合は、診察時間より前に必ずLINEでご連絡ください。

※無断キャンセルについて
予約当日、なんらご連絡なく予約時間から15分以上経過した際は自動的にキャンセルになり、今後当院の予約を取ることは出来なくなります。
当日ご都合が悪くなり、キャンセルされる場合は予約された診察時間より前に、LINEで何かしらご連絡をください。（その場合は無断キャンセル扱いにはなりません）
多くの方が新患枠を希望されており、無断キャンセルは受診を希望してお待ち頂いている他の方にも迷惑となる行為です｡
ご理解ご協力のほどよろしくお願いいたします。

【予約サイト】
https://airrsv.net/clinicbot/calendar

具体的なキャンセル方法については、下記サイトをご参照ください。
https://faq.airreserve.net/hc/ja/articles/204379305-%E3%81%8A%E5%AE%A2%E6%A7%98%E3%81%8C%E5%88%A9%E7%94%A8%E3%81%99%E3%82%8B%E3%83%8D%E3%83%83%E3%83%88%E4%BA%88%E7%B4%84%E5%8F%97%E4%BB%98%E3%83%9A%E3%83%BC%E3%82%B8%E3%81%8B%E3%82%89%E3%81%AE%E4%BA%88%E7%B4%84%E6%89%8B%E9%A0%86#%E3%83%8D%E3%83%83%E3%83%88%E4%BA%88%E7%B4%84%E5%8F%97%E4%BB%98%E3%83%9A%E3%83%BC%E3%82%B8%E3%81%8B%E3%82%89%E3%81%AE%E4%BA%88%E7%B4%84%E6%96%B9%E6%B3%95`;

          messagesToSend = [
            { type: 'text', text: msg1 }
          ];
        } else if (userMessage === "遅刻") {
          const msg1 = `当院は完全予約制のため、当日遅れられそうな場合は予約された診察時間より前に、必ずLINEにてご連絡をお願いいたします。 

予約時間より遅れられた場合、急な病状の悪化や公共交通機関の遅延等のやむを得ない場合を除いて、原則的に他の予約患者さんがおられた場合はそちらが優先となりますので、長時間お待たせしたり診察時間が短時間となってしまったりする可能性がありますことを、予めご了承下さい｡`;

          messagesToSend = [
            { type: 'text', text: msg1 }
          ];
        } else if (userMessage === "診療時間") {
          const msg1 = `診療時間および対応時間・休診日は次の通りです。

月曜日：14:30 - 20:30
火曜日：14:30 - 20:30
水曜日：休診日
木曜日：休診日
金曜日：14:30 - 20:30
土曜日：11:00 - 13:00  14:00 - 20:00
日曜日：11:00 - 17:00

※臨時休診日についてはウェブサイトをご確認ください。`;

          messagesToSend = [
            { type: 'text', text: msg1 }
          ];
        } else if (userMessage === "支払方法" || userMessage === "支払い方法") {
          const msg1 = `現在、次の方法でお支払いが可能です。

・現金
・クレジットカード（VISA／Master／JCB／AMEX／DINERS）
・QR決済（auPay／d払い／PayPay）
・電子マネー（交通系IC／iD／楽天Edy／WAON／nanaco）

また、当院は「お金を払うときに相手を待たせていると思うと緊張してしまう」と過去におっしゃった患者さまのお悩みをヒントにし、自動精算機を採用しております。
疲弊したこころへの負担や不安を極力軽減した院内環境を今後も整えていく予定です。

※自動精算機のご使用方法がわからない方はご遠慮なく受付にお申し付けください。`;

          messagesToSend = [
            { type: 'text', text: msg1 }
          ];
        } else if (userMessage === "ウェブサイト") {
          const msg1 = `こちらをご覧ください。

【当院ウェブサイト】
https://kokoroclinic-an4cdluq.manus.space/`;

          messagesToSend = [
            { type: 'text', text: msg1 }
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
