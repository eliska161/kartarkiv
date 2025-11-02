import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Personvernpolicy - Kartarkiv
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              Sist oppdatert: {new Date().toLocaleDateString('nb-NO')}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Innledning</h2>
              <p className="text-gray-700 mb-4">
                Denne personvernpolicyen beskriver hvordan Kartarkiv (kartarkiv.co) samler inn, 
                bruker og beskytter dine personopplysninger. Vi tar personvernet ditt på alvor 
                og følger gjeldende personvernregelverk, inkludert GDPR.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Personopplysninger vi samler inn</h2>
              <p className="text-gray-700 mb-4">
                Vi samler inn følgende typer personopplysninger:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li><strong>Kontoinformasjon:</strong> E-postadresse, navn (via Clerk autentisering)</li>
                <li><strong>Bruksdata:</strong> Hvilke kart du laster opp, deler og besøker</li>
                <li><strong>Tekniske data:</strong> IP-adresse, nettlesertype, operativsystem</li>
                <li><strong>Kommunikasjon:</strong> Meldinger du sender til oss</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Hvorfor vi samler inn personopplysninger</h2>
              <p className="text-gray-700 mb-4">
                Vi bruker dine personopplysninger til å:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>Gi deg tilgang til tjenesten og administrere din konto</li>
                <li>Levere og forbedre tjenestens funksjonalitet</li>
                <li>Kommunisere med deg om tjenesten</li>
                <li>Følge opp lovpålagte krav</li>
                <li>Beskytte tjenesten mot misbruk</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Deling av personopplysninger</h2>
              <p className="text-gray-700 mb-4">
                Vi deler ikke dine personopplysninger med tredjeparter, unntatt:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>Når det er nødvendig for å levere tjenesten (f.eks. Clerk for autentisering)</li>
                <li>Når vi er pålagt av loven</li>
                <li>Når du eksplisitt har gitt samtykke</li>
                <li>For å beskytte våre rettigheter eller sikkerhet</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Datasikkerhet</h2>
              <p className="text-gray-700 mb-4">
                Vi implementerer passende tekniske og organisatoriske tiltak for å beskytte 
                dine personopplysninger mot uautorisert tilgang, endring, utlevering eller 
                ødeleggelse. Dette inkluderer:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>Kryptering av data under overføring og lagring</li>
                <li>Regelmessige sikkerhetsoppdateringer</li>
                <li>Tilgangskontroll og overvåkning</li>
                <li>Regelmessige sikkerhetsvurderinger</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Dine rettigheter</h2>
              <p className="text-gray-700 mb-4">
                Du har følgende rettigheter når det gjelder dine personopplysninger:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li><strong>Rett til innsyn:</strong> Du kan be om å få vite hvilke personopplysninger vi har om deg</li>
                <li><strong>Rett til retting:</strong> Du kan be om å få rettet feilaktige opplysninger</li>
                <li><strong>Rett til sletting:</strong> Du kan be om å få slettet dine personopplysninger</li>
                <li><strong>Rett til begrensning:</strong> Du kan be om å begrense behandlingen</li>
                <li><strong>Rett til dataportabilitet:</strong> Du kan be om å få utlevert dine data</li>
                <li><strong>Rett til å protestere:</strong> Du kan protestere mot behandlingen</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Informasjonskapsler (cookies)</h2>
              <p className="text-gray-700 mb-4">
                Vi bruker informasjonskapsler for å forbedre din opplevelse på tjenesten. 
                Du kan kontrollere informasjonskapsler gjennom nettleserinnstillingene dine.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Lagring av personopplysninger</h2>
              <p className="text-gray-700 mb-4">
                Vi lagrer dine personopplysninger så lenge det er nødvendig for å oppfylle 
                formålene de ble samlet inn for, eller så lenge det kreves av loven. 
                Når vi ikke lenger trenger opplysningene, slettes de på en sikker måte.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Endringer i personvernpolicyen</h2>
              <p className="text-gray-700 mb-4">
                Vi kan oppdatere denne personvernpolicyen fra tid til annen. Endringer vil 
                bli publisert på denne siden, og vi vil varsle deg om vesentlige endringer.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Kontakt oss</h2>
              <p className="text-gray-700 mb-4">
                Hvis du har spørsmål om denne personvernpolicyen eller ønsker å utøve dine 
                rettigheter, kan du kontakte oss på:
              </p>
              <p className="text-gray-700 mb-4">
                E-post: <a href="mailto:hei@kartarkiv.co" className="text-blue-600 hover:underline">hei@kartarkiv.co</a>
              </p>
              <p className="text-gray-700">
                Du kan også klage til Datatilsynet hvis du mener vi behandler dine 
                personopplysninger i strid med personvernregelverket.
              </p>
            </section>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Denne personvernpolicyen er utarbeidet i henhold til GDPR og norsk 
                personvernregelverk.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
