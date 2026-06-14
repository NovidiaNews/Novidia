export default function Home() {
  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <h1 className="text-2xl font-semibold">Polityka prywatności serwisu Novidia</h1>
        <p className="text-sm text-zinc-600">
          Data ostatniej aktualizacji: 14 czerwca 2026 r.
        </p>

        <div className="space-y-4 text-sm leading-7 text-zinc-700">
          <p>
            Szanujemy Twoją prywatność. Niniejsza polityka prywatności określa,
            w jaki sposób zbieramy, przetwarzamy i chronimy Twoje dane osobowe
            w ramach platformy Novidia.
          </p>

          <h2 className="text-base font-semibold text-zinc-900">1. Wstęp</h2>
          <p>
            Korzystając z Serwisu, wyrażasz zgodę na zasady opisane w tym dokumencie.
          </p>

          <h2 className="text-base font-semibold text-zinc-900">2. Administrator danych</h2>
          <p>
            Administratorem Twoich danych osobowych jest Dominik Mażul - Guty / Novidia News,
            z siedzibą w Szczecinie, kontakt: info@novidia.eu.
          </p>

          <h2 className="text-base font-semibold text-zinc-900">3. Jakie dane zbieramy?</h2>
          <p>
            Zbieramy tylko te dane, które są niezbędne do działania platformy:
            dane rejestracyjne, dane aktywności, dane techniczne oraz dane płatności
            w przypadku subskrypcji Novidia+.
          </p>

          <h2 className="text-base font-semibold text-zinc-900">4. Wykorzystanie sztucznej inteligencji</h2>
          <p>
            W ramach Serwisu korzystamy z narzędzi AI, takich jak modele
            przetwarzania języka naturalnego dostarczane przez Google Gemini
            oraz DeepSeek. Twoje zapytania i treści mogą być przesyłane do
            dostawców tych usług w celu przetworzenia.
          </p>

          <h2 className="text-base font-semibold text-zinc-900">5. Cel przetwarzania danych</h2>
          <p>
            Twoje dane przetwarzamy w celu świadczenia usług, zapewnienia
            bezpieczeństwa i moderacji, obsługi rozliczeń oraz analizy statystyk.
          </p>

          <h2 className="text-base font-semibold text-zinc-900">6. Podmioty trzecie</h2>
          <p>
            Twoje dane przekazujemy wyłącznie podmiotom niezbędnym do działania
            Serwisu, takim jak dostawcy usług IT, operatorzy płatności oraz
            władze szkolne w przypadku poważnych naruszeń Regulaminu.
          </p>

          <h2 className="text-base font-semibold text-zinc-900">7. Twoje prawa</h2>
          <p>
            Zgodnie z RODO masz prawo dostępu do swoich danych, ich sprostowania,
            usunięcia, przenoszenia oraz wniesienia sprzeciwu wobec przetwarzania.
            Aby skorzystać z tych praw, napisz na adres: gdpr@novidia.eu.
          </p>

          <h2 className="text-base font-semibold text-zinc-900">8. Pliki cookies</h2>
          <p>
            Serwis wykorzystuje pliki cookies w celach utrzymania sesji,
            personalizacji ustawień oraz analizy statystycznej.
          </p>

          <h2 className="text-base font-semibold text-zinc-900">9. Zmiany w polityce prywatności</h2>
          <p>
            O wszelkich zmianach w niniejszej polityce będziemy informować
            z wyprzedzeniem poprzez komunikat w Serwisie.
          </p>
        </div>
      </div>
    </main>
  );
}
