import React from 'react';
import { Link } from 'react-router-dom';
import { Map, ShieldCheck, Users, Cloud, ArrowRight, MessageCircle } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="bg-gradient-to-b from-sky-50 via-white to-white min-h-screen text-gray-900">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.18),_transparent_55%)] pointer-events-none" />
        <nav className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-eokDark-500 text-white font-semibold text-lg px-3 py-1 rounded-lg shadow-sm">
              Kartarkiv
            </div>
            <span className="text-sm sm:text-base text-gray-600">For orienteringsklubber i hele Norge</span>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center px-4 py-2 border border-eok-600 text-eok-600 rounded-full text-sm font-medium hover:bg-eok-50 transition"
            >
              Logg inn
            </Link>
            <a
              href="mailto:post@elverumok.no"
              className="inline-flex items-center px-4 py-2 bg-eok-600 text-white rounded-full text-sm font-medium hover:bg-eok-700 transition"
            >
              Kontakt oss
            </a>
          </div>
        </nav>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-eok-100 text-eok-700 text-sm font-medium mb-6">
              Norsk løsning laget av orienteringsfolk
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-6">
              Samle alle klubbens kart på ett trygt og oversiktlig sted
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              Kartarkiv hjelper klubben din med å organisere, dele og holde oversikt over digitale kart. Enkelt å bruke, raskt å komme i gang, og bygget for orienteringsklubber som vil jobbe smartere.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-6 py-3 bg-eok-600 text-white rounded-full font-semibold shadow-lg shadow-eok-600/30 hover:bg-eok-700 transition"
              >
                Kom i gang nå
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <a
                href="mailto:post@elverumok.no"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-eok-600 border border-eok-200 rounded-full font-semibold hover:border-eok-400 hover:text-eok-700 transition"
              >
                Book en demo
              </a>
            </div>

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-gray-600">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <p className="font-semibold text-gray-900">100% norsk språk</p>
                <p>Tilpasset terminologi og arbeidsflyt for norske klubber.</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <p className="font-semibold text-gray-900">Del trygt med andre</p>
                <p>Gi tilgang til medlemmer eller send sikre nedlastingslenker.</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <p className="font-semibold text-gray-900">Alt i skyen</p>
                <p>Oppdater kartene én gang – alle ser siste versjon.</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-eok-100 rounded-full opacity-70 blur-2xl" />
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-sky-100 rounded-full opacity-70 blur-3xl" />
            <div className="relative bg-white border border-gray-100 rounded-3xl shadow-xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Fremhevet kart</p>
                  <p className="text-xl font-semibold text-gray-900">Nylige oppdateringer</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                  Sanntid
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { title: 'Sprintkart sentrum', club: 'Elverum OK', status: 'Oppdatert 2 dager siden' },
                  { title: 'Treningsløp 15. mai', club: 'Vang OL', status: 'Nye filer lastet opp' },
                  { title: 'Nattrening høst', club: 'Hamar OK', status: 'Deling aktiv' }
                ].map((item) => (
                  <div key={item.title} className="p-4 rounded-2xl border border-gray-100 bg-gradient-to-r from-white to-sky-50">
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-500">{item.club}</p>
                    <p className="text-xs text-eok-600 font-medium mt-1">{item.status}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
                <span>Full tilgang for klubben</span>
                <span>Ubegrenset lagring*</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        <section className="py-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Hvorfor velge Kartarkiv?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-eok-100 text-eok-600 mb-6">
                <Map className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Bygget for kart</h3>
              <p className="text-gray-600">
                Oversiktlige kartbibliotek med støtte for filer, forhåndsvisning og versjonshistorikk. Perfekt for trenere, løpere og karttegnere.
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-eok-100 text-eok-600 mb-6">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Sikker deling</h3>
              <p className="text-gray-600">
                Kontroller tilgang for medlemmer, gjesteløpere og samarbeidspartnere. Del nedlastingslenker med utløp og sporbarhet.
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-eok-100 text-eok-600 mb-6">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Samarbeid i klubben</h3>
              <p className="text-gray-600">
                Gi styret, trenere og løpere rollestyrt tilgang. Alle ser samme oppdatert versjon – ingen flere e-poster med gamle filer.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 border-t border-gray-100">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">Spar tid og hold kontroll</h2>
              <p className="text-lg text-gray-600">
                Kartarkiv automatiserer opplastning, versjonskontroll og deling. Du slipper lokal filkaos, samtidig som du får et profesjonelt verktøy for klubben.
              </p>
              <ul className="space-y-4 text-gray-600">
                {[
                  'Automatisk lagring i skyen med sikker backup',
                  'Del kart til løpere og trenerteam på sekunder',
                  'Full historikk på hvem som har lastet ned hva'
                ].map((benefit) => (
                  <li key={benefit} className="flex items-start">
                    <span className="mt-1 mr-3 h-6 w-6 rounded-full bg-eok-100 text-eok-600 flex items-center justify-center text-sm font-semibold">✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-eok-600 to-sky-600 rounded-3xl p-10 text-white shadow-xl space-y-6">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 rounded-full p-3">
                  <Cloud className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wide text-white/80">Driftet for dere</p>
                  <p className="text-2xl font-semibold">Ferdig SaaS-løsning</p>
                </div>
              </div>
              <p className="text-white/90 text-lg leading-relaxed">
                Vi tar oss av drift, oppdateringer og sikkerhet. Klubben deres får en pålitelig plattform som vokser sammen med behovene deres – fra lokal trening til nasjonale arrangement.
              </p>
              <div className="bg-white/15 rounded-2xl p-6 space-y-3">
                <p className="font-semibold">Dette sier brukerne våre</p>
                <p className="text-white/80 italic">
                  «Kartarkiv har gitt oss full oversikt over kartene våre. Endelig kan vi dele filer med hele klubben uten at noe forsvinner.»
                </p>
                <p className="text-sm text-white/70">– Leder, Elverum OK</p>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center px-5 py-2.5 bg-white text-eok-600 font-semibold rounded-full hover:bg-slate-100 transition"
              >
                Opprett konto for klubben
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 border-t border-gray-100">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Klar for å ta kontroll på kartene?</h2>
                <p className="text-lg text-gray-600">
                  Fyll ut skjemaet så tar vi kontakt, eller logg inn direkte hvis klubben allerede er kunde.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="mailto:post@elverumok.no?subject=Kartarkiv"
                  className="inline-flex items-center justify-center px-6 py-3 bg-eok-600 text-white rounded-full font-semibold hover:bg-eok-700 transition"
                >
                  Send oss en e-post
                  <MessageCircle className="ml-2 h-5 w-5" />
                </a>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-6 py-3 border border-eok-200 text-eok-600 rounded-full font-semibold hover:border-eok-400"
                >
                  Logg inn
                </Link>
              </div>
            </div>
            <p className="mt-6 text-sm text-gray-500">
              *Kontakt oss for avtale om lagringskapasitet tilpasset klubbens behov.
            </p>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="text-center sm:text-left">
            <p className="text-white font-semibold">Kartarkiv</p>
            <p>Utviklet av Elverum Orienteringsklubb</p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/privacy-policy" className="hover:text-white transition">
              Personvern
            </Link>
            <Link to="/terms-of-service" className="hover:text-white transition">
              Vilkår
            </Link>
            <a href="mailto:post@elverumok.no" className="hover:text-white transition">
              post@elverumok.no
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
