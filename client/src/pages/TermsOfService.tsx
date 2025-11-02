import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Vilkår for bruk - Kartarkiv
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              Sist oppdatert: {new Date().toLocaleDateString('nb-NO')}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Generelt</h2>
              <p className="text-gray-700 mb-4">
                Disse vilkårene gjelder for bruk av Kartarkiv (kartarkiv.co), en tjeneste som tilbyr 
                kartarkivering og -deling. Ved å bruke tjenesten godtar du disse vilkårene.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Tjenestebeskrivelse</h2>
              <p className="text-gray-700 mb-4">
                Kartarkiv er en plattform for å arkivere, organisere og dele kartdata. Tjenesten 
                inkluderer:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>Opplasting og lagring av kartfiler</li>
                <li>Organisering av kart i prosjekter</li>
                <li>Deling av kart via engangs-lenker</li>
                <li>Administrasjon av brukere og tilganger</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Brukeransvar</h2>
              <p className="text-gray-700 mb-4">
                Som bruker av tjenesten forplikter du deg til å:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>Bruke tjenesten i henhold til gjeldende lovgivning</li>
                <li>Ikke laste opp ulovlig, skadelig eller krenkende innhold</li>
                <li>Respektere andres opphavsrett og personvern</li>
                <li>Ikke misbruke tjenesten eller prøve å omgå sikkerhetstiltak</li>
                <li>Holde dine påloggingsdetaljer konfidensielle</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Opphavsrett og eierskap</h2>
              <p className="text-gray-700 mb-4">
                Du beholder eierskapet til innholdet du laster opp til tjenesten. Ved å laste opp 
                innhold gir du oss en begrenset lisens til å lagre, vise og dele innholdet i 
                henhold til tjenestens funksjonalitet.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Personvern</h2>
              <p className="text-gray-700 mb-4">
                Vi respekterer ditt personvern og behandler personopplysninger i henhold til 
                vår personvernpolicy. Se vår <Link to="/privacy-policy" className="text-blue-600 hover:underline">personvernpolicy</Link> for mer informasjon.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Tjenestens tilgjengelighet</h2>
              <p className="text-gray-700 mb-4">
                Vi striver etter å holde tjenesten tilgjengelig, men kan ikke garantere 
                uavbrutt tilgang. Vi forbeholder oss retten til å vedlikeholde, oppdatere 
                eller midlertidig stenge tjenesten når det er nødvendig.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Ansvarsbegrensning</h2>
              <p className="text-gray-700 mb-4">
                Tjenesten leveres "som den er" uten garantier. Vi påtar oss ikke ansvar for 
                tap av data, inntekter eller andre skader som følge av bruk av tjenesten.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Endringer i vilkårene</h2>
              <p className="text-gray-700 mb-4">
                Vi kan endre disse vilkårene fra tid til annen. Endringer vil bli publisert 
                på denne siden, og fortsatt bruk av tjenesten etter endringer anses som 
                godkjenning av de nye vilkårene.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Kontakt</h2>
              <p className="text-gray-700 mb-4">
                Hvis du har spørsmål om disse vilkårene, kan du kontakte oss på:
              </p>
              <p className="text-gray-700">
                E-post: <a href="mailto:hei@kartarkiv.co" className="text-blue-600 hover:underline">hei@kartarkiv.co</a>
              </p>
            </section>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Dette dokumentet er utarbeidet i henhold til norsk lov og gjeldende 
                personvernregelverk.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
