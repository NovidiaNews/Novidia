export default function Home() {
  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <h1 className="text-2xl font-semibold">Warunki korzystania z usługi Novidia</h1>
        <p className="text-sm text-zinc-600">
          Ostatnia aktualizacja: 14 czerwca 2026 r.
        </p>

        <div className="space-y-4 text-sm leading-7 text-zinc-700">
          <p>
            Niniejszy Regulamin określa zasady korzystania z platformy internetowej
            Novidia oraz obowiązki użytkowników korzystających z Serwisu.
          </p>

          <h2 className="text-base font-semibold text-zinc-900">1. Postanowienia ogólne</h2>
          <p>
            Serwis jest platformą edukacyjną i neutralną światopoglądowo,
            przeznaczoną dla uczniów oraz członków społeczności szkolnej.
            Korzystanie z Serwisu oznacza akceptację niniejszego Regulaminu oraz
            Polityki Prywatności.
          </p>

          <h2 className="text-base font-semibold text-zinc-900">2. Dołączanie do organizacji szkolnej</h2>
          <p>
            Dostęp do Serwisu uzyskuje się poprzez dołączenie do organizacji szkolnej zarejestrowanej w ramach platformy Novidia. W celu uzyskania dostępu użytkownik zobowiązany jest użyć jednorazowego kodu dostępu lub Klucza Novidia, otrzymanego od nauczyciela lub administratora danej placówki.
          </p>

          <h2 className="text-base font-semibold text-zinc-900">3. Zasady publikacji i moderacja</h2>
          <p>
            Użytkownicy zobowiązują się do publikowania treści zgodnych z zasadami
            bezpieczeństwa, kultury i rzetelnej informacji. Zabronione są treści
            polityczne, propagandowe, rasistowskie, ksenofobiczne, nawołujące do
            nienawiści oraz wulgaryzmy i hejt.
          </p>
          <p>
            Serwis stosuje system moderacji z wykorzystaniem algorytmów AI.
            Naruszenie zasad może skutkować ostrzeżeniami: żółta kartka, ostateczne
            ostrzeżenie oraz permanentne usunięcie konta.
          </p>

          <h2 className="text-base font-semibold text-zinc-900">4. Wsparcie AI</h2>
          <p>
            Korzystanie z narzędzi AI, takich jak Novii, wymaga weryfikacji
            wygenerowanych treści pod kątem merytorycznym. Administrator nie ponosi
            odpowiedzialności za błędy lub halucynacje systemu AI.
          </p>

          <h2 className="text-base font-semibold text-zinc-900">5. Subskrypcje Novidia+</h2>
          <p>
            Plan Novidia+ umożliwia dostęp do zaawansowanych modeli AI oraz
            funkcji premium. W przypadku blokady konta subskrypcja jest
            zawieszana na czas trwania blokady.
          </p>

          <h2 className="text-base font-semibold text-zinc-900">6. Ochrona danych osobowych</h2>
          <p>
            Administrator przetwarza dane użytkowników wyłącznie w celu świadczenia
            usług, zapewnienia bezpieczeństwa oraz realizacji celów statystycznych.
            Użytkownik ma prawo dostępu do swoich danych, ich poprawiania, usuwania
            oraz przenoszenia.
          </p>

          <h2 className="text-base font-semibold text-zinc-900">7. Postanowienia końcowe</h2>
          <p>
            Administrator zastrzega sobie prawo do zmiany Regulaminu. W sprawach
            nieuregulowanych mają zastosowanie przepisy prawa polskiego oraz
            odpowiednie regulacje dotyczące ochrony danych osobowych.
          </p>
        </div>
      </div>
    </main>
  );
}