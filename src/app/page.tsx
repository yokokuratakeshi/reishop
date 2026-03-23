// ルートページ: 認証状態に応じてリダイレクト
// クライアントコンポーネントでuseAuthフックを使いリダイレクト先を決定する
export default function RootPage() {
  // middlewareでログインにリダイレクトされるため実質到達しない
  return null;
}
