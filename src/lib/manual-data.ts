// マニュアルコンテンツデータ（静的定義）

export interface ManualStep {
  title: string;
  description: string;
  tips?: string;
}

export interface ManualArticle {
  slug: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
  role: "admin" | "franchise";
  sections: {
    heading: string;
    steps: ManualStep[];
  }[];
}

export interface ManualCategory {
  role: "admin" | "franchise";
  label: string;
  description: string;
  articles: ManualArticle[];
}

// --- 管理者向けマニュアル ---

const adminDashboard: ManualArticle = {
  slug: "admin-dashboard",
  title: "ダッシュボード",
  description: "システム全体の概要と統計情報の見方",
  icon: "LayoutDashboard",
  role: "admin",
  sections: [
    {
      heading: "ダッシュボードの概要",
      steps: [
        {
          title: "ダッシュボードにアクセスする",
          description: "ログイン後、サイドバーの「ダッシュボード」をクリックします。管理者としてログインすると、自動的にこの画面が表示されます。",
        },
        {
          title: "統計カードを確認する",
          description: "画面上部に4つの統計カードが表示されます。「総売上」は全期間の受注合計（税込）、「未処理オーダー」は新規受付の注文数、「登録加盟店」はアクティブな加盟店数、「取り扱い商品」はマスタ登録済みの商品SKU数です。",
        },
        {
          title: "売上推移グラフを確認する",
          description: "直近6ヶ月の売上推移が折れ線グラフで表示されます。月ごとの売上トレンドを把握できます。",
        },
        {
          title: "カテゴリ別比率を確認する",
          description: "円グラフでカテゴリ別の売上構成比を確認できます。どのカテゴリが売れているか一目で分かります。",
        },
        {
          title: "直近の注文を確認する",
          description: "最新の注文が一覧表示されます。「すべて見る」をクリックすると発注一覧ページに遷移します。",
        },
      ],
    },
  ],
};

const adminProducts: ManualArticle = {
  slug: "admin-products",
  title: "商品管理",
  description: "商品の追加・編集・削除、属性・バリアント設定、価格設定",
  icon: "ShoppingBag",
  role: "admin",
  sections: [
    {
      heading: "商品を追加する",
      steps: [
        {
          title: "商品管理ページを開く",
          description: "サイドバーの「商品管理」をクリックします。カテゴリ別にグループ化された商品一覧が表示されます。",
        },
        {
          title: "「商品を追加」ボタンをクリック",
          description: "画面右上の紫色の「+ 商品を追加」ボタンをクリックします。商品追加フォームが開きます。",
        },
        {
          title: "基本情報を入力する",
          description: "商品名（必須）、カテゴリ（必須）、商品タイプ（アパレル/アクセサリー/非アパレル）、参考定価（任意）、表示順序を入力します。商品画像はドラッグ&ドロップまたはクリックでアップロードできます。",
          tips: "商品名は加盟店のカタログに表示されるので、分かりやすい名前を付けましょう。",
        },
        {
          title: "「保存」をクリック",
          description: "入力が完了したら「保存」ボタンをクリックします。基本情報が保存され、次の属性設定に進めるようになります。",
        },
      ],
    },
    {
      heading: "属性とバリアントを設定する",
      steps: [
        {
          title: "属性を追加する",
          description: "「+ サイズ」「+ カラー」などのボタンをクリックして属性グループを追加します。属性名（例: サイズ、カラー、ロゴタイプ）を入力してください。",
        },
        {
          title: "属性値（オプション）を追加する",
          description: "各属性グループの入力欄にオプション値（例: S, M, L, XL）を入力し、「追加」ボタンまたはEnterキーで追加します。追加されたオプションはバッジとして表示され、×ボタンで削除できます。",
          tips: "追加後は入力欄が自動的にクリアされるので、連続して入力できます。",
        },
        {
          title: "バリアントを生成する",
          description: "属性の設定が完了したら「バリアントを生成」ボタンをクリックします。すべての属性の組み合わせからバリアント（例: S/白/大ロゴ）が自動生成されます。",
          tips: "バリアント生成後もSKUコードの編集、有効/無効の切り替え、削除が可能です。",
        },
      ],
    },
    {
      heading: "価格を設定する",
      steps: [
        {
          title: "ステージ別価格を入力する",
          description: "バリアント生成後、各バリアント×各ステージのマトリクス表が表示されます。FC卸（加盟店への卸売価格）を入力してください。",
        },
        {
          title: "「価格を保存」をクリック",
          description: "すべての価格入力が完了したら「価格を保存」ボタンをクリックします。入力した価格が一括保存されます。",
          tips: "価格は後からいつでも変更できます。0のままにしておくと、加盟店のカタログには表示されません。",
        },
      ],
    },
    {
      heading: "バリアントを編集・管理する",
      steps: [
        {
          title: "SKUコードを変更する",
          description: "バリアント一覧のSKUコード欄をクリックして直接編集できます。入力欄の外をクリック（フォーカスを外す）すると自動保存されます。",
        },
        {
          title: "バリアントの有効/無効を切り替える",
          description: "目のアイコンをクリックすると、そのバリアントの有効/無効を切り替えられます。無効にしたバリアントは加盟店のカタログに表示されなくなります。",
        },
        {
          title: "バリアントを削除する",
          description: "ゴミ箱アイコンをクリックすると、確認ダイアログが表示されます。「OK」をクリックすると、バリアントと関連する価格データが完全に削除されます。",
          tips: "削除は取り消しできません。一時的に非表示にしたい場合は、有効/無効切替を使いましょう。",
        },
      ],
    },
    {
      heading: "商品の並べ替えと管理",
      steps: [
        {
          title: "商品を並べ替える",
          description: "各商品カードの左端にあるドラッグハンドル（⠿）をつかんで、上下にドラッグすることで表示順序を変更できます。並べ替えは自動保存されます。",
          tips: "並べ替えはカテゴリグループ内でのみ可能です。カテゴリ自体の並べ替えは「カテゴリ管理」で行います。",
        },
        {
          title: "商品を編集する",
          description: "商品カードの鉛筆アイコンをクリックすると、商品編集画面が開きます。基本情報、属性、バリアント、価格をすべて編集できます。",
        },
        {
          title: "商品を削除する",
          description: "商品カードのゴミ箱アイコンをクリックすると、確認ダイアログが表示されます。削除すると関連するバリアント・価格データもすべて削除されます。",
        },
        {
          title: "CSVインポートで一括登録する",
          description: "「CSVインポート」ボタンから、商品データをCSVファイルで一括登録・更新できます。商品名が一致するデータは更新、新しい商品名は新規登録されます。",
        },
      ],
    },
  ],
};

const adminCategories: ManualArticle = {
  slug: "admin-categories",
  title: "カテゴリ管理",
  description: "カテゴリの追加・編集・ドラッグ&ドロップ並べ替え",
  icon: "Tags",
  role: "admin",
  sections: [
    {
      heading: "カテゴリの基本操作",
      steps: [
        {
          title: "カテゴリ管理ページを開く",
          description: "サイドバーの「カテゴリ管理」をクリックします。登録済みのカテゴリが一覧表示されます。",
        },
        {
          title: "新しいカテゴリを追加する",
          description: "「+ カテゴリを追加」ボタンをクリックし、ダイアログでカテゴリ名と表示順序を入力して「保存」をクリックします。",
          tips: "カテゴリ名は商品管理ページのグループ見出しや、加盟店のカタログフィルターに表示されます。",
        },
        {
          title: "カテゴリを編集する",
          description: "カテゴリの行にある鉛筆アイコンをクリックすると、編集ダイアログが開きます。名前や表示順序を変更して「保存」をクリックします。",
        },
        {
          title: "カテゴリを削除する",
          description: "ゴミ箱アイコンをクリックすると確認ダイアログが表示されます。削除すると、そのカテゴリに紐付いている商品がカタログに表示されなくなるので注意してください。",
        },
      ],
    },
    {
      heading: "カテゴリの並べ替え",
      steps: [
        {
          title: "ドラッグで並べ替える",
          description: "各カテゴリの左端にあるドラッグハンドル（⠿）をつかんで、上下にドラッグします。ドロップすると新しい並び順が自動保存されます。",
          tips: "カテゴリの並び順は、商品管理ページのグループ表示順序と、加盟店カタログのフィルター順序に反映されます。",
        },
      ],
    },
  ],
};

const adminStages: ManualArticle = {
  slug: "admin-stages",
  title: "ステージ管理",
  description: "ステージ（期）の追加と設定",
  icon: "Layers",
  role: "admin",
  sections: [
    {
      heading: "ステージとは",
      steps: [
        {
          title: "ステージの役割を理解する",
          description: "ステージとは「期」のことで、加盟店の卸価格を期別に管理するための仕組みです。例えば「0期」「0.5期」「1期」のように設定し、各ステージごとに異なる卸価格を設定できます。",
        },
        {
          title: "ステージ管理ページを開く",
          description: "サイドバーの「ステージ管理」をクリックします。",
        },
      ],
    },
    {
      heading: "ステージの追加・編集",
      steps: [
        {
          title: "新しいステージを追加する",
          description: "「+ ステージを追加」ボタンをクリックし、ステージ名（例: 1期）と表示順序を入力して保存します。",
        },
        {
          title: "ステージを編集する",
          description: "鉛筆アイコンから名前や表示順序を変更できます。",
          tips: "ステージを変更すると、そのステージに紐付く加盟店の卸価格にも影響します。",
        },
      ],
    },
  ],
};

const adminFranchises: ManualArticle = {
  slug: "admin-franchises",
  title: "加盟店管理",
  description: "加盟店の追加・編集とログインアカウントの設定",
  icon: "Store",
  role: "admin",
  sections: [
    {
      heading: "加盟店を追加する",
      steps: [
        {
          title: "加盟店管理ページを開く",
          description: "サイドバーの「加盟店管理」をクリックします。登録済みの加盟店がカード形式で一覧表示されます。緑のドットが付いている加盟店はアカウント作成済みです。",
        },
        {
          title: "「加盟店を追加」をクリック",
          description: "右上の「+ 加盟店を追加」ボタンをクリックするとダイアログが開きます。",
        },
        {
          title: "基本情報を入力する",
          description: "店舗コード（必須）、加盟店名（必須）、ステージ（必須）、エリア（任意）を入力します。",
        },
        {
          title: "ログインアカウントを設定する",
          description: "ダイアログ下部の「ログインアカウント設定」でメールアドレスとパスワードを入力すると、その場でアカウントが作成されます。登録後、加盟店担当者にメールアドレスとパスワードをお伝えください。",
          tips: "パスワードは6文字以上で設定してください。加盟店担当者がログイン後にパスワードを変更することはできないため、安全な方法で伝達してください。",
        },
        {
          title: "「保存」をクリック",
          description: "入力が完了したら「保存」をクリックして加盟店を登録します。",
        },
      ],
    },
    {
      heading: "管理者アカウントを追加する",
      steps: [
        {
          title: "「管理者を追加」ボタンをクリック",
          description: "加盟店管理ページ右上の「管理者を追加」ボタン（盾アイコン）をクリックします。管理者アカウント作成ダイアログが開きます。",
        },
        {
          title: "管理者情報を入力する",
          description: "表示名（例: 田中 太郎）、メールアドレス、パスワード（6文字以上）を入力します。",
        },
        {
          title: "「作成」をクリック",
          description: "ボタンをクリックすると管理者アカウントが作成されます。作成したアカウントでは、管理者画面にログインしてすべての管理機能を利用できます。",
          tips: "管理者アカウントは複数作成できます。担当者ごとに個別のアカウントを作成することをお勧めします。",
        },
      ],
    },
    {
      heading: "CSVインポート",
      steps: [
        {
          title: "CSVインポートで一括登録する",
          description: "「CSVインポート」ボタンから、加盟店情報をCSVファイルで一括登録・更新できます。IDが一致するデータは更新、IDがないデータは新規登録されます。",
        },
      ],
    },
  ],
};

const adminOrders: ManualArticle = {
  slug: "admin-orders",
  title: "発注管理",
  description: "発注一覧の確認とステータス変更",
  icon: "ClipboardList",
  role: "admin",
  sections: [
    {
      heading: "発注の確認と管理",
      steps: [
        {
          title: "発注一覧ページを開く",
          description: "サイドバーの「発注一覧」をクリックします。すべての加盟店からの発注が一覧表示されます。",
        },
        {
          title: "発注の詳細を確認する",
          description: "発注行をクリックすると、注文番号、加盟店名、注文日時、ステータス、注文明細（商品・数量・金額）が表示されます。",
        },
        {
          title: "ステータスを変更する",
          description: "発注詳細画面でステータスドロップダウンから「受付」→「処理中」→「出荷済」→「完了」の順に変更できます。「キャンセル」も選択可能です。",
          tips: "ステータスの変更は加盟店側の発注履歴にも反映されます。",
        },
      ],
    },
  ],
};

const adminInvoices: ManualArticle = {
  slug: "admin-invoices",
  title: "請求書管理",
  description: "請求書の生成と管理",
  icon: "Receipt",
  role: "admin",
  sections: [
    {
      heading: "請求書の生成と管理",
      steps: [
        {
          title: "請求書管理ページを開く",
          description: "サイドバーの「請求書管理」をクリックします。",
        },
        {
          title: "請求書を生成する",
          description: "「請求書を生成」ボタンから、対象年月と加盟店を選択して請求書を自動生成します。対象期間の発注データから金額が自動計算されます。",
        },
        {
          title: "請求書の詳細を確認する",
          description: "請求書をクリックすると、請求書番号、加盟店名、対象期間、小計、消費税、合計金額、含まれる発注一覧が表示されます。",
        },
        {
          title: "ステータスを更新する",
          description: "「下書き」→「発行済」→「支払済」の順にステータスを更新できます。",
        },
      ],
    },
  ],
};

// --- 加盟店向けマニュアル ---

const franchiseSetup: ManualArticle = {
  slug: "franchise-setup",
  title: "ログイン方法",
  description: "ログインページへのアクセスと初回ログインの手順",
  icon: "UserPlus",
  role: "franchise",
  sections: [
    {
      heading: "初めてログインする",
      steps: [
        {
          title: "ログイン情報を受け取る",
          description: "フランチャイズ本部の担当者から、ログイン用のメールアドレスとパスワードが通知されます。",
          tips: "ログイン情報が届いていない場合は、本部の担当者にお問い合わせください。",
        },
        {
          title: "ログインページを開く",
          description: "本部から案内されたURLにアクセスするか、ブラウザでシステムのアドレスを入力します。ログイン画面が表示されます。",
        },
        {
          title: "メールアドレスとパスワードを入力する",
          description: "本部から通知されたメールアドレスとパスワードを入力し、「ログイン」ボタンをクリックします。",
        },
        {
          title: "カタログページが表示されれば完了",
          description: "ログインに成功すると、自動的にカタログページに移動します。次回からは同じメールアドレスとパスワードでログインできます。",
          tips: "パスワードはブラウザのパスワード保存機能を使うと便利です。",
        },
      ],
    },
  ],
};

const franchiseCatalog: ManualArticle = {
  slug: "franchise-catalog",
  title: "カタログ・発注",
  description: "商品の閲覧、カートへの追加、発注の確定方法",
  icon: "Package",
  role: "franchise",
  sections: [
    {
      heading: "商品を閲覧する",
      steps: [
        {
          title: "カタログページを確認する",
          description: "ログイン後、自動的にカタログページが表示されます。画面上部のパッケージアイコンからいつでもアクセスできます。お店のステージに応じた卸価格で商品が表示されます。",
        },
        {
          title: "商品を検索・絞り込む",
          description: "検索欄に商品名を入力して検索したり、カテゴリドロップダウンで絞り込みができます。",
        },
      ],
    },
    {
      heading: "カートに追加して発注する",
      steps: [
        {
          title: "商品をカートに追加する",
          description: "発注したい商品の「カート追加」ボタンをクリックします。バリアントがある商品は、サイズ・カラーなどを選択してから追加します。",
        },
        {
          title: "カートを確認する",
          description: "画面上部のカートアイコンをクリックしてカートページを開きます。追加した商品の一覧、数量、合計金額が表示されます。",
        },
        {
          title: "数量を調整する",
          description: "各商品の「+」「-」ボタンで数量を調整できます。ゴミ箱アイコンで商品を削除できます。",
        },
        {
          title: "発注を確定する",
          description: "内容を確認したら「発注を確定する」ボタンをクリックします。確定すると注文が送信され、完了画面が表示されます。",
          tips: "発注確定後のキャンセルは管理者にご連絡ください。",
        },
      ],
    },
  ],
};

const franchiseOrders: ManualArticle = {
  slug: "franchise-orders",
  title: "発注履歴",
  description: "過去の発注内容の確認方法",
  icon: "ClipboardList",
  role: "franchise",
  sections: [
    {
      heading: "発注履歴を確認する",
      steps: [
        {
          title: "発注履歴ページを開く",
          description: "画面上部のクリップボードアイコンをクリックして発注履歴ページを開きます。",
        },
        {
          title: "発注一覧を確認する",
          description: "過去の発注が新しい順に一覧表示されます。注文番号、日時、ステータス（受付/処理中/出荷済/完了）、合計金額が確認できます。",
        },
        {
          title: "発注詳細を確認する",
          description: "発注をクリックすると、注文した商品の明細（商品名、SKU、数量、単価、小計）が表示されます。",
          tips: "注文のステータスは管理者が更新します。出荷済になったら商品が発送されたことを意味します。",
        },
      ],
    },
  ],
};

// --- カテゴリまとめ ---

export const manualCategories: ManualCategory[] = [
  {
    role: "admin",
    label: "管理者向けマニュアル",
    description: "システム管理者（フランチャイズオーナー）向けの操作マニュアル",
    articles: [
      adminDashboard,
      adminProducts,
      adminCategories,
      adminStages,
      adminFranchises,
      adminOrders,
      adminInvoices,
    ],
  },
  {
    role: "franchise",
    label: "加盟店向けマニュアル",
    description: "加盟店スタッフ向けの操作マニュアル",
    articles: [
      franchiseSetup,
      franchiseCatalog,
      franchiseOrders,
    ],
  },
];

// slugからマニュアル記事を取得
export function getManualArticle(slug: string): ManualArticle | undefined {
  for (const category of manualCategories) {
    const article = category.articles.find((a) => a.slug === slug);
    if (article) return article;
  }
  return undefined;
}
