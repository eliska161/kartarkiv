import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Map, ShieldCheck, Users, Cloud, ArrowRight, MessageCircle } from 'lucide-react';
import KartarkivLogo from '../components/KartarkivLogo';

const LandingPage: React.FC = () => {
  const handleScrollToContact = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      event.preventDefault();
      const contactSection = document.getElementById('kontakt');
      contactSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    []
  );

  const handleContactSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const club = String(formData.get('club') || '').trim();
    const message = String(formData.get('message') || '').trim();

    const emailBody = `Navn: ${name}\nE-post: ${email}\nKlubb: ${club}\n\nMelding:\n${message}`;
    const mailtoLink = `mailto:hei@kartarkiv.co?subject=${encodeURIComponent(
      'Kartarkiv – kontaktforespørsel'
    )}&body=${encodeURIComponent(emailBody)}`;

    window.location.href = mailtoLink;
    form.reset();
  }, []);

  return (
    <div className="bg-gradient-to-b from-sky-50 via-white to-white min-h-screen text-gray-900">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(23,131,76,0.12),_transparent_60%)] pointer-events-none" />
        <nav className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <KartarkivLogo size="md" />
            <span className="text-sm sm:text-base text-gray-600">Klubbens kart, samlet på ett sted</span>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center px-4 py-2 border border-brand-600 text-brand-600 rounded-full text-sm font-medium hover:bg-brand-50 transition"
            >
              Logg inn
            </Link>
            <a
              href="#kontakt"
              onClick={handleScrollToContact}
              className="inline-flex items-center px-4 py-2 bg-brand-600 text-white rounded-full text-sm font-medium hover:bg-brand-700 transition"
            >
              Kontakt oss
            </a>
          </div>
        </nav>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-brand-100 text-brand-700 text-sm font-medium mb-6">
              100% skybasert løsning
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-6">
              Samle alle klubbens kart på ett trygt og oversiktlig sted
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              Kartarkiv gjør det enkelt for orienteringsklubber å lagre, organisere og dele kart digitalt. Kom raskt i gang med et brukervennlig system som gir full oversikt – bygget spesielt for klubber som vil jobbe smartere og ha alt samlet på ett sted.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <a
                href="#kontakt"
                onClick={handleScrollToContact}
                className="inline-flex items-center justify-center px-6 py-3 bg-brand-600 text-white rounded-full font-semibold shadow-lg shadow-brand-600/30 hover:bg-brand-700 transition"
              >
                Kom i gang nå
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-6 py-3 border border-brand-200 text-brand-600 rounded-full font-semibold hover:border-brand-400 hover:text-brand-700 transition"
              >
                Logg inn
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-gray-600">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <p className="font-semibold text-gray-900">Støtte for orienteringskart</p>
                <p>Vår plattform er spesialbygget for orienteringskart.</p>
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
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-brand-100 rounded-full opacity-70 blur-2xl" />
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-sky-100 rounded-full opacity-70 blur-3xl" />
            <div className="relative bg-white border border-gray-100 rounded-3xl shadow-xl overflow-hidden">
              <div className="aspect-[4/3] bg-gradient-to-br from-brand-50 via-white to-sky-50 flex flex-col items-center justify-center text-center p-8">
                <img
                  src="https://i.ibb.co/Kz5SwXN6/google-pixelbook-mockup-2.png"
                  alt="Forhåndsvisning av Kartarkiv på laptop"
                  className="object-cover w-full h-full"
                />
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
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-brand-100 text-brand-600 mb-6">
                <Map className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Bygget for kart</h3>
              <p className="text-gray-600">
                Oversiktlige kartbibliotek med støtte for PDF og OCAD filer. Perfekt for klubber som ønsker oversikt.
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-brand-100 text-brand-600 mb-6">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Del kart sikkert</h3>
              <p className="text-gray-600">
                Del kart sikkert mellom medlemmer.
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-brand-100 text-brand-600 mb-6">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Tilgang for hele klubben</h3>
              <p className="text-gray-600">
                Gi medlemmer rollestyrt tilgang. Alle ser samme oppdatert versjon – ingen flere e-poster med gamle filer.
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
                  'Del kart til medlemmer på sekunder',
                  'Full kontroll over kart'
                ].map((benefit) => (
                  <li key={benefit} className="flex items-start">
                    <span className="mt-1 mr-3 h-6 w-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-sm font-semibold">✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-brand-600 to-sky-600 rounded-3xl p-10 text-white shadow-xl space-y-6">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 rounded-full p-3">
                  <Cloud className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wide text-white/80">Driftet for dere</p>
                  <p className="text-2xl font-semibold">Ferdig skybasert løsning</p>
                </div>
              </div>
              <p className="text-white/90 text-lg leading-relaxed">
                Vi tar oss av drift, oppdateringer og sikkerhet. Klubben deres får en pålitelig plattform som vokser sammen med behovene deres – fra få til mange kart.
              </p>
              <div className="bg-white/15 rounded-2xl p-6 space-y-3">
                <p className="font-semibold text-white">Tilpasset for klubber</p>
                <p className="text-white/80 text-sm">
                  Sett opp tilgang, roller og lagring slik klubben ønsker det. Vi hjelper dere i gang og følger opp underveis.
                </p>
              </div>
              <a
                href="#kontakt"
                onClick={handleScrollToContact}
                className="inline-flex items-center px-5 py-2.5 bg-white text-brand-600 font-semibold rounded-full hover:bg-slate-100 transition"
              >
                Opprett konto for klubben
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </div>
          </div>
        </section>

        <section id="kontakt" className="py-16 border-t border-gray-100">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10">
            <div className="grid lg:grid-cols-2 gap-10">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Klar for å ta kontroll på kartene?</h2>
                <p className="text-lg text-gray-600 mb-6">
                  Fyll ut skjemaet så tar vi kontakt, eller send oss en e-post direkte hvis klubben allerede er kunde.
                </p>
                <div className="space-y-4 text-gray-600">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mr-3">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">E-post</p>
                      <a href="mailto:hei@kartarkiv.co" className="text-brand-600 hover:text-brand-700">
                        hei@kartarkiv.co
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mr-3">
                      <Cloud className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Kartarkiv support</p>
                      <p className="text-sm text-gray-600">Vi svarer innen én arbeidsdag.</p>
                    </div>
                  </div>
                </div>
              </div>
              <form className="space-y-6" onSubmit={handleContactSubmit}>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Navn
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="Ditt navn"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-post
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="navn@klubb.no"
                  />
                </div>
                <div>
                  <label htmlFor="club" className="block text-sm font-medium text-gray-700 mb-1">
                    Klubb
                  </label>
                  <input
                    id="club"
                    name="club"
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="Navnet på klubben din"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Melding
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="Fortell oss kort om behovene deres"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center px-6 py-3 bg-brand-600 text-white rounded-full font-semibold hover:bg-brand-700 transition"
                >
                  Send forespørsel
                </button>
                <p className="text-sm text-gray-500">
                  Skjemaet åpner e-postklienten din med ferdig utfylt melding.
                </p>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="text-center sm:text-left space-y-2">
            <KartarkivLogo className="mx-auto sm:mx-0" size="sm" />
            <p className="text-white font-semibold">Utviklet av Elias Skaug-Danielsen</p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/privacy-policy" className="hover:text-white transition">
              Personvern
            </Link>
            <Link to="/terms-of-service" className="hover:text-white transition">
              Vilkår
            </Link>
            <a href="mailto:hei@kartarkiv.co" className="hover:text-white transition">
              hei@kartarkiv.co
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
